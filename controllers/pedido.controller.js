const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// Mapper Pedido (usa los nombres exactos de bd.models.js)
function mapToPedido(row = {}) {
  const template = bdModel?.Pedido || {
    ID_Pedido: 0,
    ID_Cliente: 0,
    ID_Usuario: null,
    Hora_Pedido: "",
    Estado_P: "P",
    SubTotal: 0.0,
    Notas: "",
    Fecha_Registro: ""
  };

  return {
    ...template,
    ID_Pedido: row.ID_Pedido ?? template.ID_Pedido,
    ID_Cliente: row.ID_Cliente ?? template.ID_Cliente,
    ID_Usuario: row.ID_Usuario ?? template.ID_Usuario,
    Hora_Pedido: row.Hora_Pedido ?? template.Hora_Pedido,
    Estado_P: row.Estado_P ?? template.Estado_P,
    SubTotal: row.SubTotal ?? template.SubTotal,
    Notas: row.Notas ?? template.Notas,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro
  };
}

// Mapper DetallePedido
function mapToDetallePedido(row = {}) {
  const template = bdModel?.PedidoDetalle || {
    ID_Pedido_D: 0,
    ID_Pedido: 0,
    ID_Producto_T: 0,
    Cantidad: 1,
    PrecioTotal: 0.0
  };

  return {
    ...template,
    ID_Pedido_D: row.ID_Pedido_D ?? template.ID_Pedido_D,
    ID_Pedido: row.ID_Pedido ?? template.ID_Pedido,
    ID_Producto_T: row.ID_Producto_T ?? template.ID_Producto_T,
    Cantidad: row.Cantidad ?? template.Cantidad,
    PrecioTotal: row.PrecioTotal ?? template.PrecioTotal
  };
}


// ---------------------------------
// Helper: obtener precio unitario (precio_base + variacion)
// ---------------------------------
async function calcularPrecioUnitario(transaction, ID_Producto_T) {
  const req = new sql.Request(transaction);
  const result = await req
    .input("ID_Producto_T", sql.Int, ID_Producto_T)
    .query(`
      SELECT Precio
      FROM Producto_Tamano
      WHERE ID_Producto_T = @ID_Producto_T
        AND Estado = 'A'
    `);

  if (result.recordset.length === 0) {
    throw new Error("No existe el producto/tamaño seleccionado o está inactivo.");
  }

  return Number(result.recordset[0].Precio);
}


// Crear pedido con detalle (transaccional)
// ahora recalculamos todos los subtotales en servidor
exports.createPedidoConDetalle = async (req, res) => {
  const {
    ID_Cliente,
    ID_Usuario,
    Hora_Pedido,
    Estado_P,
    Notas,
    detalles // array de { ID_Producto_T, Cantidad }
  } = req.body;

  try {
    // Validaciones mínimas
    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ error: "Debe enviar al menos un detalle de pedido" });
    }

    // Cliente por defecto = 1
    const clienteIdFinal = ID_Cliente && ID_Cliente !== "" ? ID_Cliente : 1;

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1) Insertar pedido (solo los campos del modelo)
      const requestPedido = new sql.Request(transaction);
      const insertPedidoQuery = `
        INSERT INTO Pedido (
          ID_Cliente, ID_Usuario, Hora_Pedido,
          Estado_P, SubTotal, Notas, Fecha_Registro
        ) VALUES (
          @ID_Cliente, @ID_Usuario, @Hora_Pedido,
          @Estado_P, @SubTotal, @Notas, @Fecha_Registro
        );
        SELECT SCOPE_IDENTITY() AS ID_Pedido;
      `;

      const resultInsertPedido = await requestPedido
        .input("ID_Cliente", sql.Int, clienteIdFinal)
        .input("ID_Usuario", sql.Int, ID_Usuario || null)
        .input("Hora_Pedido", sql.VarChar(20), Hora_Pedido || new Date().toLocaleTimeString())
        .input("Estado_P", sql.Char(1), Estado_P || "P")
        .input("SubTotal", sql.Decimal(10, 2), 0.0)
        .input("Notas", sql.VarChar(255), Notas || "")
        .input("Fecha_Registro", sql.DateTime, new Date())
        .query(insertPedidoQuery);

      const pedido_id = resultInsertPedido.recordset?.[0]?.ID_Pedido;
      if (!pedido_id) {
        await transaction.rollback();
        return res.status(500).json({ error: "No se pudo obtener el ID del pedido creado" });
      }

      // 2) Insertar detalles y calcular subtotal
      let subTotalAcumulado = 0.0;

      for (const d of detalles) {
        const { ID_Producto_T, Cantidad } = d;

       if (!ID_Producto_T || Cantidad == null) {
        await transaction.rollback();
        return res.status(400).json({
          error: "Faltan campos obligatorios en detalle: ID_Producto_T o Cantidad"
        });
      }


        // calcular precio unitario
        let precioUnitario;
        try {
          precioUnitario = await calcularPrecioUnitario(transaction, ID_Producto_T);
        } catch (err) {
          await transaction.rollback();
          return res.status(400).json({ error: err.message });
        }

        const subtotalLinea = Number((precioUnitario * Number(Cantidad)).toFixed(2));
        subTotalAcumulado = Number((subTotalAcumulado + subtotalLinea).toFixed(2));

        const reqDet = new sql.Request(transaction);
        await reqDet
          .input("ID_Pedido", sql.Int, pedido_id)
          .input("ID_Producto_T", sql.Int, ID_Producto_T)
          .input("Cantidad", sql.Int, Cantidad)
          .input("PrecioTotal", sql.Decimal(10, 2), subtotalLinea)
          .query(`
            INSERT INTO Pedido_Detalle (
              ID_Pedido, ID_Producto_T,
              Cantidad, PrecioTotal
            ) VALUES (
              @ID_Pedido, @ID_Producto_T,
              @Cantidad, @PrecioTotal
            )
         `);
      }

      // 3) Actualizar SubTotal en el pedido
      const reqUpdatePedido = new sql.Request(transaction);
      await reqUpdatePedido
        .input("SubTotal", sql.Decimal(10, 2), subTotalAcumulado)
        .input("ID_Pedido", sql.Int, pedido_id)
        .query(`UPDATE Pedido SET SubTotal = @SubTotal WHERE ID_Pedido = @ID_Pedido`);

      await transaction.commit();
      return res.status(201).json({
        message: "Pedido y detalles registrados correctamente",
        ID_Pedido: pedido_id,
        SubTotal: subTotalAcumulado
      });
    } catch (err) {
      await transaction.rollback();
      console.error("createPedidoConDetalle transaction error:", err);
      return res.status(500).json({ error: "Error al registrar el pedido con detalles" });
    }
  } catch (err) {
    console.error("createPedidoConDetalle error:", err);
    return res.status(500).json({ error: "Error al registrar el pedido" });
  }
};


// Listar pedidos FIFO (por Fecha_Registro ASC, Hora_Pedido ASC)
exports.getPedidos = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Pedido ORDER BY Fecha_Registro ASC, Hora_Pedido ASC");
    const pedidos = (result.recordset || []).map(mapToPedido);
    return res.status(200).json(pedidos);
  } catch (err) {
    console.error("getPedidos error:", err);
    return res.status(500).json({ error: "Error al obtener los pedidos" });
  }
};

// Obtener detalles concatenados + notas generales
exports.getDetallesConNotas = async (req, res) => {
  const { pedido_id } = req.params;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("ID_Pedido", sql.Int, pedido_id)
      .query(`
        SELECT 
          d.Cantidad,
          p.Nombre AS nombre_producto,
          t.Tamano AS nombre_tamano
        FROM Pedido_Detalle d
        INNER JOIN Producto_Tamano pt ON d.ID_Producto_T = pt.ID_Producto_T
        INNER JOIN Producto p ON pt.ID_Producto = p.ID_Producto
        INNER JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
        WHERE d.ID_Pedido = @ID_Pedido
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "No hay detalles para este pedido" });
    }

    const detallesTexto = result.recordset
      .map(d => `${d.nombre_producto} (${d.nombre_tamano}) x ${d.Cantidad}`)
      .join(", ");

    return res.status(200).json({ detalle: detallesTexto });
  } catch (err) {
    console.error("getDetallesConNotas error:", err);
    return res.status(500).json({ error: "Error al obtener los detalles del pedido" });
  }
};


// Actualizar pedido y detalles (transaccional, parcial)
// Recalcula subtotales de detalles si se modifican ID_Producto_T, Cantidad
exports.updatePedidoConDetalle = async (req, res) => {
  const { id } = req.params; // ID_Pedido
  const {
    ID_Cliente,
    ID_Usuario,
    Estado_P,
    Monto_Descuento,
    Notas,
    detalles // array de { ID_Pedido_D, ID_Producto,  Cantidad }
  } = req.body;

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Actualizar Pedido (campos parciales excepto SubTotal/Total, que recalcularemos)
      const updateFields = [];
      const reqPedido = new sql.Request(transaction);
      reqPedido.input("ID_Pedido", sql.Int, id);

      if (ID_Cliente !== undefined) {
        updateFields.push("ID_Cliente = @ID_Cliente");
        reqPedido.input("ID_Cliente", sql.Int, ID_Cliente);
      }
      if (ID_Usuario !== undefined) {
        updateFields.push("ID_Usuario = @ID_Usuario");
        reqPedido.input("ID_Usuario", sql.Int, ID_Usuario);
      }
      if (Estado_P !== undefined) {
        updateFields.push("Estado_P = @Estado_P");
        reqPedido.input("Estado_P", sql.Char(1), Estado_P);
      }
      if (Notas !== undefined) {
        updateFields.push("Notas = @Notas");
        reqPedido.input("Notas", sql.VarChar(255), Notas);
      }
      // Si viene Monto_Descuento lo actualizamos en la columna correspondiente también
      if (Monto_Descuento !== undefined) {
        updateFields.push("Monto_Descuento = @Monto_Descuento");
        reqPedido.input("Monto_Descuento", sql.Decimal(10, 2), Monto_Descuento);
      }

      if (updateFields.length > 0) {
        const queryUpdatePedido = `UPDATE Pedido SET ${updateFields.join(", ")} WHERE ID_Pedido = @ID_Pedido`;
        const resUpdPedido = await reqPedido.query(queryUpdatePedido);
        if (resUpdPedido.rowsAffected[0] === 0) {
          await transaction.rollback();
          return res.status(404).json({ error: "Pedido no encontrado" });
        }
      }

      // Si se actualizan detalles, recalculamos sus subtotales en servidor
      if (detalles && Array.isArray(detalles)) {
        for (const det of detalles) {
        const { ID_Pedido_D, ID_Producto_T, Cantidad } = det;
          if (!ID_Pedido_D) {
            await transaction.rollback();
            return res.status(400).json({ error: "Falta ID_Pedido_D en detalles" });
          }

          // Recalcular campos dinámicos
          const fieldsDetalle = [];
          const reqDet = new sql.Request(transaction);
          reqDet.input("ID_Pedido_D", sql.Int, ID_Pedido_D);

          // Si cambian producto/tamano/cantidad recalculemos PrecioTotal
          let recalcularPrecio = false;
          let precioUnitario = null;
          if (ID_Producto_T !== undefined) {
            fieldsDetalle.push("ID_Producto_T = @ID_Producto_T");
            reqDet.input("ID_Producto_T", sql.Int, ID_Producto_T);
            recalcularPrecio = true;
          }
          if (Cantidad !== undefined) {
            fieldsDetalle.push("Cantidad = @Cantidad");
            reqDet.input("Cantidad", sql.Int, Cantidad);
            recalcularPrecio = true;
          }

          if (recalcularPrecio) {
            // Para recalcular necesitamos los valores finales: si un campo no fue enviado, obtener su valor actual en BD
            // Obtener estado actual del detalle
            const curDetRes = await new sql.Request(transaction)
            .input("ID_Pedido_D_TMP", sql.Int, ID_Pedido_D)
            .query("SELECT ID_Producto_T, Cantidad FROM Pedido_Detalle WHERE ID_Pedido_D = @ID_Pedido_D_TMP");


            if (!curDetRes.recordset.length) {
              await transaction.rollback();
              return res.status(404).json({ error: `Detalle no encontrado: ${ID_Pedido_D}` });
            }

            const cur = curDetRes.recordset[0];
            const finalProducto = (ID_Producto_T !== undefined) ? ID_Producto_T : cur.ID_Producto_T;
            const finalCantidad = (Cantidad !== undefined) ? Cantidad : cur.Cantidad;

            // calcular precio unitario con helper
            try {
            precioUnitario = await calcularPrecioUnitario(transaction, finalProducto);
            } catch (err) {
              await transaction.rollback();
              return res.status(400).json({ error: err.message });
            }
            const subtotalLinea = Number((precioUnitario * Number(finalCantidad)).toFixed(2));

            // Añadir PrecioTotal al update
            fieldsDetalle.push("PrecioTotal = @PrecioTotal");
            reqDet.input("PrecioTotal", sql.Decimal(10, 2), subtotalLinea);
          }

          if (fieldsDetalle.length === 0) continue;

          const queryUpdateDetalle = `UPDATE Pedido_Detalle SET ${fieldsDetalle.join(", ")} WHERE ID_Pedido_D = @ID_Pedido_D`;
          const resUpdDet = await reqDet.query(queryUpdateDetalle);
          if (resUpdDet.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: `Detalle no encontrado: ${ID_Pedido_D}` });
          }
        }
      }

      // Recalcular SubTotal sumando todos los detalles actuales del pedido
      const sumRes = await new sql.Request(transaction)
        .input("ID_Pedido_SUM", sql.Int, id)
        .query("SELECT ISNULL(SUM(PrecioTotal),0) AS SubTotalCalc FROM Pedido_Detalle WHERE ID_Pedido = @ID_Pedido_SUM");

      const nuevoSubTotal = Number(sumRes.recordset[0].SubTotalCalc ?? 0);
      // Obtener Monto_Descuento actual (si no se envió en body)
      let descuento = Monto_Descuento;
      if (descuento === undefined) {
        const montoRes = await new sql.Request(transaction)
          .input("ID_Pedido_M", sql.Int, id)
          .query("SELECT Monto_Descuento FROM Pedido WHERE ID_Pedido = @ID_Pedido_M");
        descuento = montoRes.recordset.length ? Number(montoRes.recordset[0].Monto_Descuento ?? 0) : 0;
      }

      const nuevoTotal = Number((nuevoSubTotal - (descuento ?? 0)).toFixed(2));

      // Actualizar SubTotal y Total
      await new sql.Request(transaction)
        .input("SubTotal", sql.Decimal(10, 2), nuevoSubTotal)
        .input("Total", sql.Decimal(10, 2), nuevoTotal)
        .input("ID_Pedido", sql.Int, id)
        .query("UPDATE Pedido SET SubTotal = @SubTotal, Total = @Total WHERE ID_Pedido = @ID_Pedido");

      await transaction.commit();
      return res.status(200).json({ message: "Pedido y detalles actualizados correctamente", SubTotal: nuevoSubTotal, Total: nuevoTotal });
    } catch (err) {
      await transaction.rollback();
      console.error("updatePedidoConDetalle transaction error:", err);
      return res.status(500).json({ error: "Error al actualizar el pedido con detalles" });
    }
  } catch (err) {
    console.error("updatePedidoConDetalle error:", err);
    return res.status(500).json({ error: "Error al actualizar el pedido" });
  }
};

// =============================
// 🔹 Obtener solo los detalles
// =============================
exports.getPedidoDetalles = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("ID_Pedido", sql.Int, id)
      .query(`
        SELECT 
          d.ID_Pedido_D, 
          d.ID_Producto_T, 
          d.Cantidad, 
          d.PrecioTotal,
          p.Nombre AS nombre_producto,
          t.Tamano AS nombre_tamano,
          cp.Nombre AS nombre_categoria
        FROM Pedido_Detalle d
        INNER JOIN Producto_Tamano pt ON d.ID_Producto_T = pt.ID_Producto_T
        INNER JOIN Producto p ON pt.ID_Producto = p.ID_Producto
        INNER JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
        LEFT JOIN Categoria_Producto cp ON p.ID_Categoria_P = cp.ID_Categoria_P
        WHERE d.ID_Pedido = @ID_Pedido
      `);

    if (!result.recordset.length)
      return res.status(404).json({ error: "No hay detalles para este pedido" });

    return res.status(200).json(result.recordset);
  } catch (err) {
    console.error("❌ getPedidoDetalles error:", err.message);
    return res.status(500).json({ error: "Error al obtener los detalles" });
  }
};

// =============================
// 🔹 Obtener Pedido por ID + Detalles
// =============================
exports.getPedidoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    const pedidoRes = await pool.request()
      .input("ID_Pedido", sql.Int, id)
      .query("SELECT * FROM Pedido WHERE ID_Pedido = @ID_Pedido");

    if (!pedidoRes.recordset.length)
      return res.status(404).json({ error: "Pedido no encontrado" });

    const pedido = pedidoRes.recordset[0];

    const detallesRes = await pool.request()
      .input("ID_Pedido", sql.Int, id)
      .query(`
        SELECT
          d.ID_Pedido_D, d.ID_Pedido, d.ID_Producto_T, d.Cantidad, d.PrecioTotal,
          p.Nombre AS nombre_producto,
          t.Tamano AS nombre_tamano
        FROM Pedido_Detalle d
        INNER JOIN Producto_Tamano pt ON d.ID_Producto_T = pt.ID_Producto_T
        INNER JOIN Producto p ON pt.ID_Producto = p.ID_Producto
        INNER JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
        WHERE d.ID_Pedido = @ID_Pedido
      `);


    return res.status(200).json({
      ...pedido,
      detalles: detallesRes.recordset || []
    });
  } catch (err) {
    console.error("❌ getPedidoById error:", err.message);
    return res.status(500).json({ error: "Error al obtener el pedido" });
  }
};


// =============================
// 🔹 ACTUALIZAR ESTADO DEL PEDIDO
// =============================
exports.statusPedido = async (req, res) => {
  const { id } = req.params; // ID_Pedido
  const { Estado_P } = req.body;

  try {
    // Validar que el estado sea válido (solo 2 estados permitidos para cambios)
    const estadosValidos = ['E', 'C']; // Solo permitir cambiar a Entregado o Cancelado
    if (!Estado_P || !estadosValidos.includes(Estado_P)) {
      return res.status(400).json({ 
        error: "Estado inválido", 
        estados_permitidos: estadosValidos,
        descripcion: {
          'E': 'Entregado',
          'C': 'Cancelado'
        }
      });
    }

    const pool = await getConnection();
    
    // Verificar que el pedido existe
    const pedidoCheck = await pool.request()
      .input("ID_Pedido", sql.Int, id)
      .query("SELECT ID_Pedido, Estado_P FROM Pedido WHERE ID_Pedido = @ID_Pedido");

    if (!pedidoCheck.recordset.length) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const pedidoActual = pedidoCheck.recordset[0];

    // Solo permitir cambiar estado de pedidos pendientes
    if (pedidoActual.Estado_P !== 'P') {
      return res.status(400).json({ 
        error: "Solo se puede modificar un pedido pendiente",
        estado_actual: pedidoActual.Estado_P
      });
    }

    // Actualizar el estado del pedido
    const result = await pool.request()
      .input("Estado_P", sql.Char(1), Estado_P)
      .input("ID_Pedido", sql.Int, id)
      .query("UPDATE Pedido SET Estado_P = @Estado_P WHERE ID_Pedido = @ID_Pedido");

    if (result.rowsAffected[0] === 0) {
      return res.status(500).json({ error: "No se pudo actualizar el estado del pedido" });
    }

    return res.status(200).json({
      message: "Estado del pedido actualizado correctamente",
      ID_Pedido: parseInt(id),
      estado_anterior: pedidoActual.Estado_P,
      estado_nuevo: Estado_P,
      descripcion_estado: {
        'E': 'Entregado',
        'C': 'Cancelado'
      }[Estado_P]
    });

  } catch (err) {
    console.error("❌ statusPedido error:", err.message);
    return res.status(500).json({ error: "Error al actualizar el estado del pedido" });
  }
};