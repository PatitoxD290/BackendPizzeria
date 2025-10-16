const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila de BD al modelo Venta
// ==============================
function mapToVenta(row = {}) {
  const template = bdModel?.Venta || {
    venta_id: 0,
    pedido_id: 0,
    tipo_comprobante: "",
    fecha_venta: "",
    usuario_id: null,
    lugar_emision: "",
    metodo_pago: "",
    subtotal: 0.0,
    igv: 0.0,
    total: 0.0
  };

  return {
    ...template,
    venta_id: row.venta_id ?? template.venta_id,
    pedido_id: row.pedido_id ?? template.pedido_id,
    tipo_comprobante: row.tipo_comprobante ?? template.tipo_comprobante,
    fecha_venta: row.fecha_venta ?? template.fecha_venta,
    usuario_id: row.usuario_id ?? template.usuario_id,
    lugar_emision: row.lugar_emision ?? template.lugar_emision,
    metodo_pago: row.metodo_pago ?? template.metodo_pago,
    subtotal: row.subtotal ?? template.subtotal,
    igv: row.igv ?? template.igv,
    total: row.total ?? template.total
  };
}

// ==============================
// 📘 Obtener todas las ventas
// ==============================
exports.getVentas = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM ventas ORDER BY venta_id DESC");
    const ventas = (result.recordset || []).map(mapToVenta);
    return res.status(200).json(ventas);
  } catch (err) {
    console.error("getVentas error:", err);
    return res.status(500).json({ error: "Error al obtener las ventas" });
  }
};

// ==============================
// 📘 Obtener una venta por ID
// ==============================
exports.getVentaById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM ventas WHERE venta_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    return res.status(200).json(mapToVenta(result.recordset[0]));
  } catch (err) {
    console.error("getVentaById error:", err);
    return res.status(500).json({ error: "Error al obtener la venta" });
  }
};

// ==============================
// 📗 Registrar una nueva venta
// ==============================
exports.createVenta = async (req, res) => {
  const {
    pedido_id,
    tipo_comprobante,
    fecha_venta,
    usuario_id,
    lugar_emision,
    metodo_pago,
    subtotal,
    igv,
    total
  } = req.body;

  try {
    if (!pedido_id || !tipo_comprobante || !fecha_venta || !metodo_pago) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: pedido_id, tipo_comprobante, fecha_venta o metodo_pago"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("pedido_id", sql.Int, pedido_id)
      .input("tipo_comprobante", sql.VarChar(50), tipo_comprobante)
      .input("fecha_venta", sql.DateTime, fecha_venta)
      .input("usuario_id", sql.Int, usuario_id)
      .input("lugar_emision", sql.VarChar(100), lugar_emision || "")
      .input("metodo_pago", sql.VarChar(50), metodo_pago)
      .input("subtotal", sql.Decimal(10, 2), subtotal || 0.0)
      .input("igv", sql.Decimal(10, 2), igv || 0.0)
      .input("total", sql.Decimal(10, 2), total || 0.0)
      .query(`
        INSERT INTO ventas (
          pedido_id, tipo_comprobante, fecha_venta,
          usuario_id, lugar_emision, metodo_pago,
          subtotal, igv, total
        )
        VALUES (
          @pedido_id, @tipo_comprobante, @fecha_venta,
          @usuario_id, @lugar_emision, @metodo_pago,
          @subtotal, @igv, @total
        )
      `);

    return res.status(201).json({ message: "Venta registrada correctamente" });
  } catch (err) {
    console.error("createVenta error:", err);
    return res.status(500).json({ error: "Error al registrar la venta" });
  }
};

// ==============================
// 📙 Actualizar una venta
// ==============================
exports.updateVenta = async (req, res) => {
  const { id } = req.params;
  const {
    pedido_id,
    tipo_comprobante,
    fecha_venta,
    usuario_id,
    lugar_emision,
    metodo_pago,
    subtotal,
    igv,
    total
  } = req.body;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("pedido_id", sql.Int, pedido_id)
      .input("tipo_comprobante", sql.VarChar(50), tipo_comprobante)
      .input("fecha_venta", sql.DateTime, fecha_venta)
      .input("usuario_id", sql.Int, usuario_id)
      .input("lugar_emision", sql.VarChar(100), lugar_emision)
      .input("metodo_pago", sql.VarChar(50), metodo_pago)
      .input("subtotal", sql.Decimal(10, 2), subtotal)
      .input("igv", sql.Decimal(10, 2), igv)
      .input("total", sql.Decimal(10, 2), total)
      .query(`
        UPDATE ventas
        SET 
          pedido_id = @pedido_id,
          tipo_comprobante = @tipo_comprobante,
          fecha_venta = @fecha_venta,
          usuario_id = @usuario_id,
          lugar_emision = @lugar_emision,
          metodo_pago = @metodo_pago,
          subtotal = @subtotal,
          igv = @igv,
          total = @total
        WHERE venta_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    return res.status(200).json({ message: "Venta actualizada correctamente" });
  } catch (err) {
    console.error("updateVenta error:", err);
    return res.status(500).json({ error: "Error al actualizar la venta" });
  }
};

// ==============================
// 📕 Eliminar una venta
// ==============================
exports.deleteVenta = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM ventas WHERE venta_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    return res.status(200).json({ message: "Venta eliminada correctamente" });
  } catch (err) {
    console.error("deleteVenta error:", err);
    return res.status(500).json({ error: "Error al eliminar la venta" });
  }
};

// ==============================
// 🧾 Obtener resumen de venta (para boleta o factura)
// ==============================
exports.datosBoletaVenta = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT venta_id, tipo_comprobante, fecha_venta, metodo_pago,
               subtotal, igv, total, lugar_emision
        FROM ventas
        WHERE venta_id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    return res.status(200).json({
      exito: true,
      datos: mapToVenta(result.recordset[0])
    });
  } catch (err) {
    console.error("datosBoletaVenta error:", err);
    return res.status(500).json({ error: "Error al obtener los datos de la venta" });
  }
};
