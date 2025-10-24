const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper Pedido
// ==============================
function mapToPedido(row = {}) {
  const template = bdModel?.Pedido || {
    pedido_id: 0,
    cliente_id: 0,
    usuario_id: null,
    fecha_pedido: "",
    hora_pedido: "",
    estado_pedido: "PENDIENTE",
    subtotal: 0.0,
    monto_descuento: 0.0,
    total: 0.0,
    notas_generales: "",
    fecha_registro: ""
  };

  return {
    ...template,
    pedido_id: row.pedido_id ?? template.pedido_id,
    cliente_id: row.cliente_id ?? template.cliente_id,
    usuario_id: row.usuario_id ?? template.usuario_id,
    fecha_pedido: row.fecha_pedido ?? template.fecha_pedido,
    hora_pedido: row.hora_pedido ?? template.hora_pedido,
    estado_pedido: row.estado_pedido ?? template.estado_pedido,
    subtotal: row.subtotal ?? template.subtotal,
    monto_descuento: row.monto_descuento ?? template.monto_descuento,
    total: row.total ?? template.total,
    notas_generales: row.notas_generales ?? template.notas_generales,
    fecha_registro: row.fecha_registro ?? template.fecha_registro
  };
}

// ==============================
// 🔄 Mapper Detalle Pedido
// ==============================
function mapToDetallePedido(row = {}) {
  const template = bdModel?.DetallePedido || {
    detalle_pedido_id: 0,
    pedido_id: 0,
    producto_id: 0,
    tamano_id: null,
    cantidad: 0,
    precio_unitario: 0.0,
    subtotal: 0.0,
    notas_producto: ""
  };

  return {
    ...template,
    detalle_pedido_id: row.detalle_pedido_id ?? template.detalle_pedido_id,
    pedido_id: row.pedido_id ?? template.pedido_id,
    producto_id: row.producto_id ?? template.producto_id,
    tamano_id: row.tamano_id ?? template.tamano_id,
    cantidad: row.cantidad ?? template.cantidad,
    precio_unitario: row.precio_unitario ?? template.precio_unitario,
    subtotal: row.subtotal ?? template.subtotal,
    notas_producto: row.notas_producto ?? template.notas_producto
  };
}

// ==============================
// 📗 Crear pedido con detalle
// ==============================
exports.createPedidoConDetalle = async (req, res) => {
  const {
    cliente_id,
    usuario_id,
    fecha_pedido,
    hora_pedido,
    estado_pedido,
    subtotal,
    monto_descuento,
    total,
    notas_generales,
    detalles // Array de objetos con datos de detalle
  } = req.body;

  try {
    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ error: "Debe enviar al menos un detalle de pedido" });
    }

    if (subtotal == null || total == null) {
      return res.status(400).json({ error: "Debe especificar subtotal y total" });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ==============================
      // 🧩 Lógica especial cliente / usuario
      // ==============================
      const clienteFinal = cliente_id && cliente_id !== "" ? cliente_id : 1; // Si no se envía, se usa id=1 ("Clientes Varios")
      const usuarioFinal = usuario_id && usuario_id !== "" ? usuario_id : null; // Si no está logueado, null

      // ==============================
      // 💾 Insertar Pedido
      // ==============================
      const requestPedido = new sql.Request(transaction);
      const resultPedido = await requestPedido
        .input("cliente_id", sql.Int, clienteFinal)
        .input("usuario_id", sql.Int, usuarioFinal)
        .input("fecha_pedido", sql.Date, new Date().toISOString().split('T')[0])
        .input("hora_pedido", sql.VarChar(20), new Date().toLocaleTimeString("es-PE", { hour12: false }))
        .input("estado_pedido", sql.VarChar(50), estado_pedido || "PENDIENTE")
        .input("subtotal", sql.Decimal(10, 2), subtotal)
        .input("monto_descuento", sql.Decimal(10, 2), monto_descuento || 0.0)
        .input("total", sql.Decimal(10, 2), total)
        .input("notas_generales", sql.VarChar(255), notas_generales || "")
        .input("fecha_registro", sql.DateTime, new Date())
        .query(`
          INSERT INTO pedidos (
            cliente_id, usuario_id, fecha_pedido, hora_pedido,
            estado_pedido, subtotal, monto_descuento, total,
            notas_generales, fecha_registro
          )
          VALUES (
            @cliente_id, @usuario_id, @fecha_pedido, @hora_pedido,
            @estado_pedido, @subtotal, @monto_descuento, @total,
            @notas_generales, @fecha_registro
          );
          SELECT SCOPE_IDENTITY() AS pedido_id;
        `);

      const pedido_id = resultPedido.recordset[0]?.pedido_id;

      if (!pedido_id) {
        await transaction.rollback();
        return res.status(500).json({ error: "Error al crear el pedido (no se obtuvo ID)" });
      }

      // ==============================
      // 💾 Insertar Detalles
      // ==============================
      for (const detalle of detalles) {
        const {
          producto_id,
          tamano_id,
          cantidad,
          precio_unitario,
          subtotal: subtotalDetalle,
          notas_producto
        } = detalle;

        if (!producto_id || cantidad == null || precio_unitario == null) {
          await transaction.rollback();
          return res.status(400).json({
            error: "Cada detalle debe tener producto_id, cantidad y precio_unitario"
          });
        }

        const requestDetalle = new sql.Request(transaction);
        await requestDetalle
          .input("pedido_id", sql.Int, pedido_id)
          .input("producto_id", sql.Int, producto_id)
          .input("tamano_id", sql.Int, tamano_id || null)
          .input("cantidad", sql.Int, cantidad)
          .input("precio_unitario", sql.Decimal(10, 2), precio_unitario)
          .input("subtotal", sql.Decimal(10, 2), subtotalDetalle || cantidad * precio_unitario)
          .input("notas_producto", sql.VarChar(255), notas_producto || "")
          .query(`
            INSERT INTO detalle_pedidos (
              pedido_id, producto_id, tamano_id,
              cantidad, precio_unitario, subtotal, notas_producto
            )
            VALUES (
              @pedido_id, @producto_id, @tamano_id,
              @cantidad, @precio_unitario, @subtotal, @notas_producto
            );
          `);
      }

      await transaction.commit();

      return res.status(201).json({
        message: "✅ Pedido y detalles registrados correctamente",
        pedido_id
      });

    } catch (err) {
      await transaction.rollback();
      console.error("❌ Error en transacción createPedidoConDetalle:", err);
      return res.status(500).json({ error: "Error al registrar el pedido con detalles" });
    }

  } catch (err) {
    console.error("❌ Error general createPedidoConDetalle:", err);
    return res.status(500).json({ error: "Error interno al registrar el pedido" });
  }
};


// Listar pedidos FIFO (por fecha_pedido ASC)
exports.getPedidos = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query("SELECT * FROM pedidos ORDER BY fecha_pedido ASC, hora_pedido ASC");
    const pedidos = (result.recordset || []).map(mapToPedido);
    return res.status(200).json(pedidos);
  } catch (err) {
    console.error("getPedidos error:", err);
    return res.status(500).json({ error: "Error al obtener los pedidos" });
  }
};

// Listar detalles de pedido con concatenado y notas generales
exports.getDetallesConNotas = async (req, res) => {
  const { pedido_id } = req.params;

  try {
    const pool = await getConnection();

    // Obtener detalles
    const detallesResult = await pool.request()
      .input("pedido_id", sql.Int, pedido_id)
      .query("SELECT * FROM detalle_pedidos WHERE pedido_id = @pedido_id");

    if (!detallesResult.recordset.length) {
      return res.status(404).json({ error: "Detalles no encontrados para el pedido" });
    }

    // Obtener pedido para notas generales
    const pedidoResult = await pool.request()
      .input("pedido_id", sql.Int, pedido_id)
      .query("SELECT notas_generales FROM pedidos WHERE pedido_id = @pedido_id");

    const notasGenerales = pedidoResult.recordset.length ? pedidoResult.recordset[0].notas_generales : "";

    // Construir texto concatenado:
    // "Producto (nota) x cantidad" separados por coma
    // Asumiendo que hay una tabla productos para obtener el nombre, sino solo producto_id

    // Para optimizar, consulta productos por sus ids
    const productoIds = [...new Set(detallesResult.recordset.map(d => d.producto_id))];

    let productosMap = {};
    if (productoIds.length) {
      const productosResult = await pool.request()
  .query(`SELECT producto_id, nombre_producto AS nombre FROM productos WHERE producto_id IN (${productoIds.join(",")})`);

      productosMap = productosResult.recordset.reduce((acc, p) => {
        acc[p.producto_id] = p.nombre;
        return acc;
      }, {});
    }

    const textosDetalles = detallesResult.recordset.map(d => {
      const nombreProducto = productosMap[d.producto_id] || `Producto#${d.producto_id}`;
      const nota = d.notas_producto ? ` (${d.notas_producto})` : "";
      return `${nombreProducto}${nota} x ${d.cantidad}`;
    });

    const respuestaTexto = textosDetalles.join(", ") + (notasGenerales ? `\nNotas generales: ${notasGenerales}` : "");

    return res.status(200).json({ detalle: respuestaTexto });

  } catch (err) {
    console.error("getDetallesConNotas error:", err);
    return res.status(500).json({ error: "Error al obtener los detalles del pedido" });
  }
};

// Modificar pedido y detalles (parcial o total)
// ==============================
// 📘 Actualizar pedido con detalles
// ==============================
exports.updatePedidoConDetalle = async (req, res) => {
  const { id } = req.params;
  const {
    cliente_id,
    usuario_id,
    estado_pedido,
    subtotal,
    monto_descuento,
    total,
    notas_generales,
    detalles // Array con detalles a modificar
  } = req.body;

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ==============================
      // 🧩 Ajuste de lógica cliente/usuario
      // ==============================
      const clienteFinal = cliente_id && cliente_id !== "" ? cliente_id : 1; // si no hay cliente, asigna id=1 ("Clientes Varios")
      const usuarioFinal = usuario_id && usuario_id !== "" ? usuario_id : null; // si no hay usuario logueado, null

      // ==============================
      // 💾 Actualizar Pedido (solo campos enviados)
      // ==============================
      const requestPedido = new sql.Request(transaction);

      let updateFields = [];

      // Inputs y campos dinámicos
      requestPedido.input("id", sql.Int, id);

      if (cliente_id !== undefined) {
        updateFields.push("cliente_id = @cliente_id");
        requestPedido.input("cliente_id", sql.Int, clienteFinal);
      }

      if (usuario_id !== undefined) {
        updateFields.push("usuario_id = @usuario_id");
        requestPedido.input("usuario_id", sql.Int, usuarioFinal);
      }

      if (estado_pedido !== undefined) {
        updateFields.push("estado_pedido = @estado_pedido");
        requestPedido.input("estado_pedido", sql.VarChar(50), estado_pedido);
      }

      if (subtotal !== undefined) {
        updateFields.push("subtotal = @subtotal");
        requestPedido.input("subtotal", sql.Decimal(10, 2), subtotal);
      }

      if (monto_descuento !== undefined) {
        updateFields.push("monto_descuento = @monto_descuento");
        requestPedido.input("monto_descuento", sql.Decimal(10, 2), monto_descuento);
      }

      if (total !== undefined) {
        updateFields.push("total = @total");
        requestPedido.input("total", sql.Decimal(10, 2), total);
      }

      if (notas_generales !== undefined) {
        updateFields.push("notas_generales = @notas_generales");
        requestPedido.input("notas_generales", sql.VarChar(255), notas_generales);
      }

      // Ejecutar actualización si hay campos
      if (updateFields.length > 0) {
        const queryUpdate = `UPDATE pedidos SET ${updateFields.join(", ")} WHERE pedido_id = @id`;
        const result = await requestPedido.query(queryUpdate);

        if (result.rowsAffected[0] === 0) {
          await transaction.rollback();
          return res.status(404).json({ error: "Pedido no encontrado" });
        }
      }

      // ==============================
      // 💾 Actualizar Detalles (si vienen)
      // ==============================
      if (detalles && Array.isArray(detalles)) {
        for (const detalle of detalles) {
          const {
            detalle_pedido_id,
            producto_id,
            tamano_id,
            cantidad,
            precio_unitario,
            subtotal: subtotalDetalle,
            notas_producto
          } = detalle;

          if (!detalle_pedido_id) {
            await transaction.rollback();
            return res.status(400).json({ error: "Cada detalle debe tener detalle_pedido_id" });
          }

          const requestDetalle = new sql.Request(transaction);
          requestDetalle.input("detalle_pedido_id", sql.Int, detalle_pedido_id);

          let updateFieldsDetalle = [];

          if (producto_id !== undefined) {
            updateFieldsDetalle.push("producto_id = @producto_id");
            requestDetalle.input("producto_id", sql.Int, producto_id);
          }

          if (tamano_id !== undefined) {
            updateFieldsDetalle.push("tamano_id = @tamano_id");
            requestDetalle.input("tamano_id", sql.Int, tamano_id);
          }

          if (cantidad !== undefined) {
            updateFieldsDetalle.push("cantidad = @cantidad");
            requestDetalle.input("cantidad", sql.Int, cantidad);
          }

          if (precio_unitario !== undefined) {
            updateFieldsDetalle.push("precio_unitario = @precio_unitario");
            requestDetalle.input("precio_unitario", sql.Decimal(10, 2), precio_unitario);
          }

          if (subtotalDetalle !== undefined) {
            updateFieldsDetalle.push("subtotal = @subtotal");
            requestDetalle.input("subtotal", sql.Decimal(10, 2), subtotalDetalle);
          }

          if (notas_producto !== undefined) {
            updateFieldsDetalle.push("notas_producto = @notas_producto");
            requestDetalle.input("notas_producto", sql.VarChar(255), notas_producto);
          }

          // Ejecutar si hay cambios
          if (updateFieldsDetalle.length > 0) {
            const queryDetalle = `
              UPDATE detalle_pedidos 
              SET ${updateFieldsDetalle.join(", ")} 
              WHERE detalle_pedido_id = @detalle_pedido_id
            `;

            const resultDetalle = await requestDetalle.query(queryDetalle);
            if (resultDetalle.rowsAffected[0] === 0) {
              await transaction.rollback();
              return res.status(404).json({ error: `Detalle no encontrado (ID ${detalle_pedido_id})` });
            }
          }
        }
      }

      await transaction.commit();
      return res.status(200).json({ message: "✅ Pedido y detalles actualizados correctamente" });

    } catch (err) {
      await transaction.rollback();
      console.error("❌ Error en transacción updatePedidoConDetalle:", err);
      return res.status(500).json({ error: "Error al actualizar el pedido con detalles" });
    }

  } catch (err) {
    console.error("❌ Error general updatePedidoConDetalle:", err);
    return res.status(500).json({ error: "Error interno al actualizar el pedido" });
  }
};


// Eliminar pedido y sus detalles (gracias al ON DELETE CASCADE)
exports.deletePedidoConDetalles = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();

    // Verificar si el pedido existe
    const check = await pool.request()
      .input("pedido_id", sql.Int, id)
      .query("SELECT pedido_id FROM pedidos WHERE pedido_id = @pedido_id");

    if (check.recordset.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // Eliminar pedido (los detalles se eliminan automáticamente)
    const result = await pool.request()
      .input("pedido_id", sql.Int, id)
      .query("DELETE FROM pedidos WHERE pedido_id = @pedido_id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "No se eliminó el pedido" });
    }

    return res.status(200).json({ message: "Pedido y detalles eliminados correctamente" });

  } catch (err) {
    console.error("deletePedidoConDetalles error:", err);
    return res.status(500).json({ error: "Error al eliminar el pedido con sus detalles" });
  }
};

