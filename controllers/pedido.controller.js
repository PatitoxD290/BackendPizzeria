const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// Mapper Pedido
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

// Mapper DetallePedido
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

// Crear pedido con detalle
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
    detalles // Array con los detalles [{ producto_id, tamano_id, cantidad, precio_unitario, subtotal, notas_producto }]
  } = req.body;

  try {
    // Si cliente_id está vacío o no existe, se asigna 1
    const cliente = cliente_id && cliente_id !== "" ? cliente_id : 1;

    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ error: "Debe enviar al menos un detalle de pedido" });
    }

    if (subtotal == null || total == null) {
      return res.status(400).json({ error: "Faltan campos obligatorios: subtotal o total" });
    }

    const pool = await getConnection();

    // Inicio de transacción para garantizar atomicidad
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Insertar pedido
      const requestPedido = new sql.Request(transaction);
      await requestPedido
        .input("cliente_id", sql.Int, cliente)
        .input("usuario_id", sql.Int, usuario_id || null)
        .input("fecha_pedido", sql.Date, fecha_pedido || new Date())
        .input("hora_pedido", sql.VarChar(20), hora_pedido || new Date().toLocaleTimeString())
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
          ) VALUES (
            @cliente_id, @usuario_id, @fecha_pedido, @hora_pedido,
            @estado_pedido, @subtotal, @monto_descuento, @total,
            @notas_generales, @fecha_registro
          );
          SELECT SCOPE_IDENTITY() AS pedido_id;
        `);

      // Obtener el pedido_id insertado
      const pedido_id = requestPedido.parameters.pedido_id || (await requestPedido.query("SELECT SCOPE_IDENTITY() AS pedido_id")).recordset[0].pedido_id;

      if (!pedido_id) {
        await transaction.rollback();
        return res.status(500).json({ error: "No se pudo obtener el ID del pedido creado" });
      }

      // Insertar cada detalle
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
            error: "Faltan campos obligatorios en detalle: producto_id, cantidad o precio_unitario"
          });
        }

        const requestDetalle = new sql.Request(transaction);
        await requestDetalle
          .input("pedido_id", sql.Int, pedido_id)
          .input("producto_id", sql.Int, producto_id)
          .input("tamano_id", sql.Int, tamano_id || null)
          .input("cantidad", sql.Int, cantidad)
          .input("precio_unitario", sql.Decimal(10, 2), precio_unitario)
          .input("subtotal", sql.Decimal(10, 2), subtotalDetalle || (cantidad * precio_unitario))
          .input("notas_producto", sql.VarChar(255), notas_producto || "")
          .query(`
            INSERT INTO detalle_pedidos (
              pedido_id, producto_id, tamano_id,
              cantidad, precio_unitario, subtotal, notas_producto
            ) VALUES (
              @pedido_id, @producto_id, @tamano_id,
              @cantidad, @precio_unitario, @subtotal, @notas_producto
            )
          `);
      }

      await transaction.commit();

      return res.status(201).json({ message: "Pedido y detalles registrados correctamente", pedido_id });

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
        .query(`SELECT producto_id, nombre FROM productos WHERE producto_id IN (${productoIds.join(",")})`);
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
    detalles // Array con detalles a modificar [{ detalle_pedido_id, producto_id, tamano_id, cantidad, precio_unitario, subtotal, notas_producto }]
  } = req.body;

  try {
    const pool = await getConnection();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Actualizar pedido (solo campos que llegan)
      const requestPedido = new sql.Request(transaction);

      // Crear query dinámico para actualización parcial
      let updateFields = [];
      if (cliente_id !== undefined) updateFields.push("cliente_id = @cliente_id");
      if (usuario_id !== undefined) updateFields.push("usuario_id = @usuario_id");
      if (estado_pedido !== undefined) updateFields.push("estado_pedido = @estado_pedido");
      if (subtotal !== undefined) updateFields.push("subtotal = @subtotal");
      if (monto_descuento !== undefined) updateFields.push("monto_descuento = @monto_descuento");
      if (total !== undefined) updateFields.push("total = @total");
      if (notas_generales !== undefined) updateFields.push("notas_generales = @notas_generales");

      if (updateFields.length > 0) {
        requestPedido.input("id", sql.Int, id);

        if (cliente_id !== undefined) requestPedido.input("cliente_id", sql.Int, cliente_id);
        if (usuario_id !== undefined) requestPedido.input("usuario_id", sql.Int, usuario_id);
        if (estado_pedido !== undefined) requestPedido.input("estado_pedido", sql.VarChar(50), estado_pedido);
        if (subtotal !== undefined) requestPedido.input("subtotal", sql.Decimal(10, 2), subtotal);
        if (monto_descuento !== undefined) requestPedido.input("monto_descuento", sql.Decimal(10, 2), monto_descuento);
        if (total !== undefined) requestPedido.input("total", sql.Decimal(10, 2), total);
        if (notas_generales !== undefined) requestPedido.input("notas_generales", sql.VarChar(255), notas_generales);

        const queryUpdatePedido = `UPDATE pedidos SET ${updateFields.join(", ")} WHERE pedido_id = @id`;
        const resultPedido = await requestPedido.query(queryUpdatePedido);

        if (resultPedido.rowsAffected[0] === 0) {
          await transaction.rollback();
          return res.status(404).json({ error: "Pedido no encontrado" });
        }
      }

      // Actualizar detalles si vienen
      if (detalles && Array.isArray(detalles)) {
        for (const detalle of detalles) {
          const {
            detalle_pedido_id,
            producto_id,
            tamano_id,
            cantidad,
            precio_unitario,
            subtotal,
            notas_producto
          } = detalle;

          if (!detalle_pedido_id) {
            await transaction.rollback();
            return res.status(400).json({ error: "Falta detalle_pedido_id en detalles" });
          }

          // Campos a actualizar dinámicamente
          let updateFieldsDetalle = [];
          if (producto_id !== undefined) updateFieldsDetalle.push("producto_id = @producto_id");
          if (tamano_id !== undefined) updateFieldsDetalle.push("tamano_id = @tamano_id");
          if (cantidad !== undefined) updateFieldsDetalle.push("cantidad = @cantidad");
          if (precio_unitario !== undefined) updateFieldsDetalle.push("precio_unitario = @precio_unitario");
          if (subtotal !== undefined) updateFieldsDetalle.push("subtotal = @subtotal");
          if (notas_producto !== undefined) updateFieldsDetalle.push("notas_producto = @notas_producto");

          if (updateFieldsDetalle.length === 0) continue; // No hay campos para actualizar en este detalle

          const requestDetalle = new sql.Request(transaction);
          requestDetalle.input("id", sql.Int, detalle_pedido_id);

          if (producto_id !== undefined) requestDetalle.input("producto_id", sql.Int, producto_id);
          if (tamano_id !== undefined) requestDetalle.input("tamano_id", sql.Int, tamano_id);
          if (cantidad !== undefined) requestDetalle.input("cantidad", sql.Int, cantidad);
          if (precio_unitario !== undefined) requestDetalle.input("precio_unitario", sql.Decimal(10, 2), precio_unitario);
          if (subtotal !== undefined) requestDetalle.input("subtotal", sql.Decimal(10, 2), subtotal);
          if (notas_producto !== undefined) requestDetalle.input("notas_producto", sql.VarChar(255), notas_producto);

          const queryUpdateDetalle = `UPDATE detalle_pedidos SET ${updateFieldsDetalle.join(", ")} WHERE detalle_pedido_id = @id`;
          const resultDetalle = await requestDetalle.query(queryUpdateDetalle);

          if (resultDetalle.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: `Detalle de pedido no encontrado: ${detalle_pedido_id}` });
          }
        }
      }

      await transaction.commit();

      return res.status(200).json({ message: "Pedido y detalles actualizados correctamente" });

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
