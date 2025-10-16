const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Pedido
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
// 📘 Obtener todos los pedidos
// ==============================
exports.getPedidos = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM pedidos ORDER BY fecha_pedido DESC");
    const pedidos = (result.recordset || []).map(mapToPedido);
    return res.status(200).json(pedidos);
  } catch (err) {
    console.error("getPedidos error:", err);
    return res.status(500).json({ error: "Error al obtener los pedidos" });
  }
};

// ==============================
// 📘 Obtener un pedido por ID
// ==============================
exports.getPedidoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM pedidos WHERE pedido_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    return res.status(200).json(mapToPedido(result.recordset[0]));
  } catch (err) {
    console.error("getPedidoById error:", err);
    return res.status(500).json({ error: "Error al obtener el pedido" });
  }
};

// ==============================
// 📗 Crear un nuevo pedido
// ==============================
exports.createPedido = async (req, res) => {
  const {
    cliente_id,
    usuario_id,
    fecha_pedido,
    hora_pedido,
    estado_pedido,
    subtotal,
    monto_descuento,
    total,
    notas_generales
  } = req.body;

  try {
    if (!cliente_id || subtotal == null || total == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: cliente_id, subtotal o total"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("cliente_id", sql.Int, cliente_id)
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
        )
        VALUES (
          @cliente_id, @usuario_id, @fecha_pedido, @hora_pedido,
          @estado_pedido, @subtotal, @monto_descuento, @total,
          @notas_generales, @fecha_registro
        )
      `);

    return res.status(201).json({ message: "Pedido registrado correctamente" });
  } catch (err) {
    console.error("createPedido error:", err);
    return res.status(500).json({ error: "Error al registrar el pedido" });
  }
};

// ==============================
// 📙 Actualizar un pedido
// ==============================
exports.updatePedido = async (req, res) => {
  const { id } = req.params;
  const {
    cliente_id,
    usuario_id,
    estado_pedido,
    subtotal,
    monto_descuento,
    total,
    notas_generales
  } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("cliente_id", sql.Int, cliente_id)
      .input("usuario_id", sql.Int, usuario_id)
      .input("estado_pedido", sql.VarChar(50), estado_pedido)
      .input("subtotal", sql.Decimal(10, 2), subtotal)
      .input("monto_descuento", sql.Decimal(10, 2), monto_descuento)
      .input("total", sql.Decimal(10, 2), total)
      .input("notas_generales", sql.VarChar(255), notas_generales)
      .query(`
        UPDATE pedidos
        SET 
          cliente_id = @cliente_id,
          usuario_id = @usuario_id,
          estado_pedido = @estado_pedido,
          subtotal = @subtotal,
          monto_descuento = @monto_descuento,
          total = @total,
          notas_generales = @notas_generales
        WHERE pedido_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    return res.status(200).json({ message: "Pedido actualizado correctamente" });
  } catch (err) {
    console.error("updatePedido error:", err);
    return res.status(500).json({ error: "Error al actualizar el pedido" });
  }
};

// ==============================
// 📕 Eliminar un pedido
// ==============================
exports.deletePedido = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM pedidos WHERE pedido_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    return res.status(200).json({ message: "Pedido eliminado correctamente" });
  } catch (err) {
    console.error("deletePedido error:", err);
    return res.status(500).json({ error: "Error al eliminar el pedido" });
  }
};
