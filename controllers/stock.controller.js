const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo MovimientoStock
// ==============================
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
    usuario_id: null,
    estado: "A" // Estado agregado (A: Activo, I: Inactivo)
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
    usuario_id: row.usuario_id ?? template.usuario_id,
    estado: row.estado ?? template.estado
  };
}

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Stock
// ==============================
function mapToStock(row = {}) {
  const template = bdModel?.Stock || {
    stock_id: 0,
    ingrediente_id: 0,
    proveedor_id: 0,
    numero_lote: "",
    cantidad_recibida: 0,
    costo_unitario: 0.0,
    costo_total: 0.0,
    fecha_entrada: "",
    fecha_vencimiento: "",
    estado: "A" // Estado agregado (A: Activo, I: Inactivo)
  };

  return {
    ...template,
    stock_id: row.stock_id ?? template.stock_id,
    ingrediente_id: row.ingrediente_id ?? template.ingrediente_id,
    proveedor_id: row.proveedor_id ?? template.proveedor_id,
    numero_lote: row.numero_lote ?? template.numero_lote,
    cantidad_recibida: row.cantidad_recibida ?? template.cantidad_recibida,
    costo_unitario: row.costo_unitario ?? template.costo_unitario,
    costo_total: row.costo_total ?? template.costo_total,
    fecha_entrada: row.fecha_entrada ?? template.fecha_entrada,
    fecha_vencimiento: row.fecha_vencimiento ?? template.fecha_vencimiento,
    estado: row.estado ?? template.estado
  };
}

// ==============================
// 📘 Obtener todos los movimientos de stock
// ==============================
exports.getMovimientosStock = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT * FROM movimientos_stock WHERE estado = 'A' ORDER BY fecha_movimiento DESC
    `);

    const movimientos = (result.recordset || []).map(mapToMovimientoStock);
    return res.status(200).json(movimientos);
  } catch (err) {
    console.error("getMovimientosStock error:", err);
    return res.status(500).json({ error: "Error al obtener los movimientos de stock" });
  }
};

// ==============================
// 📘 Obtener un movimiento de stock por ID
// ==============================
exports.getMovimientoStockById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM movimientos_stock WHERE movimiento_id = @id AND estado = 'A'");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    return res.status(200).json(mapToMovimientoStock(result.recordset[0]));
  } catch (err) {
    console.error("getMovimientoStockById error:", err);
    return res.status(500).json({ error: "Error al obtener el movimiento de stock" });
  }
};

// ==============================
// 📗 Crear un nuevo movimiento de stock
// ==============================
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
          stock_actual, fecha_movimiento, motivo, registrado_por, usuario_id, estado
        ) VALUES (
          @ingrediente_id, @stock_id, @tipo_movimiento, @cantidad,
          @stock_actual, @fecha_movimiento, @motivo, @registrado_por, @usuario_id, 'A'
        )
      `);

    // Actualizar stock si es un movimiento de entrada o salida
    if (tipo_movimiento === 'entrada') {
      await pool.request()
        .input("stock_id", sql.Int, stock_id)
        .input("cantidad", sql.Int, cantidad)
        .query(`
          UPDATE stock
          SET cantidad_recibida = cantidad_recibida + @cantidad
          WHERE stock_id = @stock_id
        `);
    } else if (tipo_movimiento === 'salida') {
      await pool.request()
        .input("stock_id", sql.Int, stock_id)
        .input("cantidad", sql.Int, cantidad)
        .query(`
          UPDATE stock
          SET cantidad_recibida = cantidad_recibida - @cantidad
          WHERE stock_id = @stock_id
        `);
    }

    return res.status(201).json({ message: "Movimiento de stock registrado correctamente" });
  } catch (err) {
    console.error("createMovimientoStock error:", err);
    return res.status(500).json({ error: "Error al registrar el movimiento de stock" });
  }
};

// ==============================
// 📙 Actualizar un movimiento de stock (solo marcarlo como anulado)
// ==============================
exports.updateMovimientoStock = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();

    // Marcar como "anulado" en lugar de eliminar
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE movimientos_stock
        SET estado = 'I'
        WHERE movimiento_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    return res.status(200).json({ message: "Movimiento de stock anulado correctamente" });
  } catch (err) {
    console.error("updateMovimientoStock error:", err);
    return res.status(500).json({ error: "Error al anular el movimiento de stock" });
  }
};

// ==============================
// 📘 Obtener todos los registros de stock
// ==============================
exports.getStocks = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM stock WHERE estado = 'A' ORDER BY fecha_entrada DESC");
    const stocks = (result.recordset || []).map(mapToStock);
    return res.status(200).json(stocks);
  } catch (err) {
    console.error("getStocks error:", err);
    return res.status(500).json({ error: "Error al obtener los registros de stock" });
  }
};

// ==============================
// 📘 Obtener un registro de stock por ID
// ==============================
exports.getStockById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM stock WHERE stock_id = @id AND estado = 'A'");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Registro de stock no encontrado" });
    }

    return res.status(200).json(mapToStock(result.recordset[0]));
  } catch (err) {
    console.error("getStockById error:", err);
    return res.status(500).json({ error: "Error al obtener el registro de stock" });
  }
};

// ==============================
// 📗 Crear un nuevo registro de stock
// ==============================
exports.createStock = async (req, res) => {
  const {
    ingrediente_id,
    proveedor_id,
    numero_lote,
    cantidad_recibida,
    costo_unitario,
    costo_total,
    fecha_entrada,
    fecha_vencimiento,
    estado
  } = req.body;

  try {
    if (!ingrediente_id || !proveedor_id || !cantidad_recibida || !costo_unitario) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: ingrediente_id, proveedor_id, cantidad_recibida o costo_unitario"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("ingrediente_id", sql.Int, ingrediente_id)
      .input("proveedor_id", sql.Int, proveedor_id)
      .input("numero_lote", sql.VarChar(100), numero_lote || "")
      .input("cantidad_recibida", sql.Int, cantidad_recibida)
      .input("costo_unitario", sql.Decimal(10, 2), costo_unitario)
      .input("costo_total", sql.Decimal(10, 2), costo_total || (cantidad_recibida * costo_unitario))
      .input("fecha_entrada", sql.Date, fecha_entrada || new Date())
      .input("fecha_vencimiento", sql.Date, fecha_vencimiento || null)
      .input("estado", sql.VarChar(5), estado || "A")
      .query(`
        INSERT INTO stock (
          ingrediente_id, proveedor_id, numero_lote, cantidad_recibida,
          costo_unitario, costo_total, fecha_entrada, fecha_vencimiento, estado
        )
        VALUES (
          @ingrediente_id, @proveedor_id, @numero_lote, @cantidad_recibida,
          @costo_unitario, @costo_total, @fecha_entrada, @fecha_vencimiento, @estado
        )
      `);

    return res.status(201).json({ message: "Registro de stock creado correctamente" });
  } catch (err) {
    console.error("createStock error:", err);
    return res.status(500).json({ error: "Error al registrar el stock" });
  }
};

// ==============================
// 📙 Actualizar un registro de stock
// ==============================
exports.updateStock = async (req, res) => {
  const { id } = req.params;
  const {
    ingrediente_id,
    proveedor_id,
    numero_lote,
    cantidad_recibida,
    costo_unitario,
    costo_total,
    fecha_vencimiento,
    estado
  } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("ingrediente_id", sql.Int, ingrediente_id)
      .input("proveedor_id", sql.Int, proveedor_id)
      .input("numero_lote", sql.VarChar(100), numero_lote)
      .input("cantidad_recibida", sql.Int, cantidad_recibida)
      .input("costo_unitario", sql.Decimal(10, 2), costo_unitario)
      .input("costo_total", sql.Decimal(10, 2), costo_total)
      .input("fecha_vencimiento", sql.Date, fecha_vencimiento)
      .input("estado", sql.VarChar(5), estado)
      .query(`
        UPDATE stock
        SET 
          ingrediente_id = @ingrediente_id,
          proveedor_id = @proveedor_id,
          numero_lote = @numero_lote,
          cantidad_recibida = @cantidad_recibida,
          costo_unitario = @costo_unitario,
          costo_total = @costo_total,
          fecha_vencimiento = @fecha_vencimiento,
          estado = @estado
        WHERE stock_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Registro de stock no encontrado" });
    }

    return res.status(200).json({ message: "Registro de stock actualizado correctamente" });
  } catch (err) {
    console.error("updateStock error:", err);
    return res.status(500).json({ error: "Error al actualizar el stock" });
  }
};

