const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================================
// 🔄 Mapper: adapta una fila SQL al modelo DetallePedido
// ==============================================
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

// ==============================================
// 📘 Obtener todos los detalles de pedido
// ==============================================
exports.getDetallesPedido = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM detalle_pedidos ORDER BY detalle_pedido_id DESC");
    const detalles = (result.recordset || []).map(mapToDetallePedido);
    return res.status(200).json(detalles);
  } catch (err) {
    console.error("getDetallesPedido error:", err);
    return res.status(500).json({ error: "Error al obtener los detalles de pedido" });
  }
};

// ==============================================
// 📘 Obtener un detalle de pedido por ID
// ==============================================
exports.getDetallePedidoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM detalle_pedidos WHERE detalle_pedido_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Detalle de pedido no encontrado" });
    }

    return res.status(200).json(mapToDetallePedido(result.recordset[0]));
  } catch (err) {
    console.error("getDetallePedidoById error:", err);
    return res.status(500).json({ error: "Error al obtener el detalle de pedido" });
  }
};

// ==============================================
// 📗 Crear un nuevo detalle de pedido
// ==============================================
exports.createDetallePedido = async (req, res) => {
  const {
    pedido_id,
    producto_id,
    tamano_id,
    cantidad,
    precio_unitario,
    subtotal,
    notas_producto
  } = req.body;

  try {
    if (!pedido_id || !producto_id || cantidad == null || precio_unitario == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: pedido_id, producto_id, cantidad o precio_unitario"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("pedido_id", sql.Int, pedido_id)
      .input("producto_id", sql.Int, producto_id)
      .input("tamano_id", sql.Int, tamano_id || null)
      .input("cantidad", sql.Int, cantidad)
      .input("precio_unitario", sql.Decimal(10, 2), precio_unitario)
      .input("subtotal", sql.Decimal(10, 2), subtotal || (cantidad * precio_unitario))
      .input("notas_producto", sql.VarChar(255), notas_producto || "")
      .query(`
        INSERT INTO detalle_pedidos (
          pedido_id, producto_id, tamano_id,
          cantidad, precio_unitario, subtotal, notas_producto
        )
        VALUES (
          @pedido_id, @producto_id, @tamano_id,
          @cantidad, @precio_unitario, @subtotal, @notas_producto
        )
      `);

    return res.status(201).json({ message: "Detalle de pedido registrado correctamente" });
  } catch (err) {
    console.error("createDetallePedido error:", err);
    return res.status(500).json({ error: "Error al registrar el detalle de pedido" });
  }
};

// ==============================================
// 📙 Actualizar un detalle de pedido
// ==============================================
exports.updateDetallePedido = async (req, res) => {
  const { id } = req.params;
  const {
    pedido_id,
    producto_id,
    tamano_id,
    cantidad,
    precio_unitario,
    subtotal,
    notas_producto
  } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("pedido_id", sql.Int, pedido_id)
      .input("producto_id", sql.Int, producto_id)
      .input("tamano_id", sql.Int, tamano_id)
      .input("cantidad", sql.Int, cantidad)
      .input("precio_unitario", sql.Decimal(10, 2), precio_unitario)
      .input("subtotal", sql.Decimal(10, 2), subtotal)
      .input("notas_producto", sql.VarChar(255), notas_producto)
      .query(`
        UPDATE detalle_pedidos
        SET
          pedido_id = @pedido_id,
          producto_id = @producto_id,
          tamano_id = @tamano_id,
          cantidad = @cantidad,
          precio_unitario = @precio_unitario,
          subtotal = @subtotal,
          notas_producto = @notas_producto
        WHERE detalle_pedido_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Detalle de pedido no encontrado" });
    }

    return res.status(200).json({ message: "Detalle de pedido actualizado correctamente" });
  } catch (err) {
    console.error("updateDetallePedido error:", err);
    return res.status(500).json({ error: "Error al actualizar el detalle de pedido" });
  }
};

// ==============================================
// 📕 Eliminar un detalle de pedido
// ==============================================
exports.deleteDetallePedido = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM detalle_pedidos WHERE detalle_pedido_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Detalle de pedido no encontrado" });
    }

    return res.status(200).json({ message: "Detalle de pedido eliminado correctamente" });
  } catch (err) {
    console.error("deleteDetallePedido error:", err);
    return res.status(500).json({ error: "Error al eliminar el detalle de pedido" });
  }
};
