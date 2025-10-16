const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// =====================================================
// 🔄 Mapper: adapta una fila SQL al modelo MovimientoStock
// =====================================================
function mapToMovimientoStock(row = {}) {
  const template = bdModel?.MovimientoStock || {
    movimiento_id: 0,
    ingrediente_id: 0,
    stock_id: 0,
    tipo_movimiento: "",
    cantidad: 0,
    stock_actual: 0,
    fecha_movimiento: "",
    motivo: "",
    registrado_por: "",
    usuario_id: null
  };

  return {
    ...template,
    movimiento_id: row.movimiento_id ?? template.movimiento_id,
    ingrediente_id: row.ingrediente_id ?? template.ingrediente_id,
    stock_id: row.stock_id ?? template.stock_id,
    tipo_movimiento: row.tipo_movimiento ?? template.tipo_movimiento,
    cantidad: row.cantidad ?? template.cantidad,
    stock_actual: row.stock_actual ?? template.stock_actual,
    fecha_movimiento: row.fecha_movimiento ?? template.fecha_movimiento,
    motivo: row.motivo ?? template.motivo,
    registrado_por: row.registrado_por ?? template.registrado_por,
    usuario_id: row.usuario_id ?? template.usuario_id
  };
}

// =====================================================
// 📘 Obtener todos los movimientos de stock
// =====================================================
exports.getMovimientosStock = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT * FROM movimientos_stock ORDER BY fecha_movimiento DESC
    `);

    const movimientos = (result.recordset || []).map(mapToMovimientoStock);
    return res.status(200).json(movimientos);
  } catch (err) {
    console.error("getMovimientosStock error:", err);
    return res.status(500).json({ error: "Error al obtener los movimientos de stock" });
  }
};

// =====================================================
// 📘 Obtener un movimiento de stock por ID
// =====================================================
exports.getMovimientoStockById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM movimientos_stock WHERE movimiento_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    return res.status(200).json(mapToMovimientoStock(result.recordset[0]));
  } catch (err) {
    console.error("getMovimientoStockById error:", err);
    return res.status(500).json({ error: "Error al obtener el movimiento de stock" });
  }
};

// =====================================================
// 📗 Crear un nuevo movimiento de stock
// =====================================================
exports.createMovimientoStock = async (req, res) => {
  const {
    ingrediente_id,
    stock_id,
    tipo_movimiento,
    cantidad,
    stock_actual,
    fecha_movimiento,
    motivo,
    registrado_por,
    usuario_id
  } = req.body;

  try {
    if (!ingrediente_id || !stock_id || !tipo_movimiento || cantidad == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: ingrediente_id, stock_id, tipo_movimiento o cantidad"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("ingrediente_id", sql.Int, ingrediente_id)
      .input("stock_id", sql.Int, stock_id)
      .input("tipo_movimiento", sql.VarChar(50), tipo_movimiento)
      .input("cantidad", sql.Int, cantidad)
      .input("stock_actual", sql.Int, stock_actual || 0)
      .input("fecha_movimiento", sql.DateTime, fecha_movimiento || new Date())
      .input("motivo", sql.VarChar(255), motivo || "")
      .input("registrado_por", sql.VarChar(100), registrado_por || "")
      .input("usuario_id", sql.Int, usuario_id || null)
      .query(`
        INSERT INTO movimientos_stock (
          ingrediente_id, stock_id, tipo_movimiento, cantidad,
          stock_actual, fecha_movimiento, motivo, registrado_por, usuario_id
        ) VALUES (
          @ingrediente_id, @stock_id, @tipo_movimiento, @cantidad,
          @stock_actual, @fecha_movimiento, @motivo, @registrado_por, @usuario_id
        )
      `);

    return res.status(201).json({ message: "Movimiento de stock registrado correctamente" });
  } catch (err) {
    console.error("createMovimientoStock error:", err);
    return res.status(500).json({ error: "Error al registrar el movimiento de stock" });
  }
};

// =====================================================
// 📙 Actualizar un movimiento de stock
// =====================================================
exports.updateMovimientoStock = async (req, res) => {
  const { id } = req.params;
  const {
    ingrediente_id,
    stock_id,
    tipo_movimiento,
    cantidad,
    stock_actual,
    fecha_movimiento,
    motivo,
    registrado_por,
    usuario_id
  } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("ingrediente_id", sql.Int, ingrediente_id)
      .input("stock_id", sql.Int, stock_id)
      .input("tipo_movimiento", sql.VarChar(50), tipo_movimiento)
      .input("cantidad", sql.Int, cantidad)
      .input("stock_actual", sql.Int, stock_actual)
      .input("fecha_movimiento", sql.DateTime, fecha_movimiento)
      .input("motivo", sql.VarChar(255), motivo)
      .input("registrado_por", sql.VarChar(100), registrado_por)
      .input("usuario_id", sql.Int, usuario_id)
      .query(`
        UPDATE movimientos_stock
        SET
          ingrediente_id = @ingrediente_id,
          stock_id = @stock_id,
          tipo_movimiento = @tipo_movimiento,
          cantidad = @cantidad,
          stock_actual = @stock_actual,
          fecha_movimiento = @fecha_movimiento,
          motivo = @motivo,
          registrado_por = @registrado_por,
          usuario_id = @usuario_id
        WHERE movimiento_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    return res.status(200).json({ message: "Movimiento actualizado correctamente" });
  } catch (err) {
    console.error("updateMovimientoStock error:", err);
    return res.status(500).json({ error: "Error al actualizar el movimiento de stock" });
  }
};

// =====================================================
// 📕 Eliminar un movimiento de stock
// =====================================================
exports.deleteMovimientoStock = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM movimientos_stock WHERE movimiento_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    return res.status(200).json({ message: "Movimiento eliminado correctamente" });
  } catch (err) {
    console.error("deleteMovimientoStock error:", err);
    return res.status(500).json({ error: "Error al eliminar el movimiento de stock" });
  }
};
