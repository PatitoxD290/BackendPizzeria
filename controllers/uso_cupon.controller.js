const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================================
// 🔄 Mapper: adapta una fila SQL al modelo UsoCupon
// ==============================================
function mapToUsoCupon(row = {}) {
  const template = bdModel?.UsoCupon || {
    uso_cupon_id: 0,
    cupon_id: 0,
    pedido_id: 0,
    cliente_id: 0,
    descuento_aplicado: 0.0,
    monto_venta: 0.0,
    fecha_uso: ""
  };

  return {
    ...template,
    uso_cupon_id: row.uso_cupon_id ?? template.uso_cupon_id,
    cupon_id: row.cupon_id ?? template.cupon_id,
    pedido_id: row.pedido_id ?? template.pedido_id,
    cliente_id: row.cliente_id ?? template.cliente_id,
    descuento_aplicado: row.descuento_aplicado ?? template.descuento_aplicado,
    monto_venta: row.monto_venta ?? template.monto_venta,
    fecha_uso: row.fecha_uso ?? template.fecha_uso
  };
}

// ==============================================
// 📘 Obtener todos los usos de cupones
// ==============================================
exports.getUsosCupon = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query("SELECT * FROM uso_cupones ORDER BY fecha_uso DESC");

    const usos = (result.recordset || []).map(mapToUsoCupon);
    return res.status(200).json(usos);
  } catch (err) {
    console.error("getUsosCupon error:", err);
    return res.status(500).json({ error: "Error al obtener los usos de cupones" });
  }
};

// ==============================================
// 📘 Obtener un uso de cupón por ID
// ==============================================
exports.getUsoCuponById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM uso_cupones WHERE uso_cupon_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Uso de cupón no encontrado" });
    }

    return res.status(200).json(mapToUsoCupon(result.recordset[0]));
  } catch (err) {
    console.error("getUsoCuponById error:", err);
    return res.status(500).json({ error: "Error al obtener el uso de cupón" });
  }
};

// ==============================================
// 📗 Registrar un nuevo uso de cupón
// ==============================================
exports.createUsoCupon = async (req, res) => {
  const {
    cupon_id,
    pedido_id,
    cliente_id,
    descuento_aplicado,
    monto_venta,
    fecha_uso
  } = req.body;

  try {
    if (!cupon_id || !pedido_id || !cliente_id) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: cupon_id, pedido_id o cliente_id"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("cupon_id", sql.Int, cupon_id)
      .input("pedido_id", sql.Int, pedido_id)
      .input("cliente_id", sql.Int, cliente_id)
      .input("descuento_aplicado", sql.Decimal(10, 2), descuento_aplicado || 0.0)
      .input("monto_venta", sql.Decimal(10, 2), monto_venta || 0.0)
      .input("fecha_uso", sql.DateTime, fecha_uso || new Date())
      .query(`
        INSERT INTO uso_cupones (
          cupon_id, pedido_id, cliente_id,
          descuento_aplicado, monto_venta, fecha_uso
        )
        VALUES (
          @cupon_id, @pedido_id, @cliente_id,
          @descuento_aplicado, @monto_venta, @fecha_uso
        )
      `);

    return res.status(201).json({ message: "Uso de cupón registrado correctamente" });
  } catch (err) {
    console.error("createUsoCupon error:", err);
    return res.status(500).json({ error: "Error al registrar el uso de cupón" });
  }
};

// ==============================================
// 📙 Actualizar un uso de cupón
// ==============================================
exports.updateUsoCupon = async (req, res) => {
  const { id } = req.params;
  const {
    cupon_id,
    pedido_id,
    cliente_id,
    descuento_aplicado,
    monto_venta,
    fecha_uso
  } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("cupon_id", sql.Int, cupon_id)
      .input("pedido_id", sql.Int, pedido_id)
      .input("cliente_id", sql.Int, cliente_id)
      .input("descuento_aplicado", sql.Decimal(10, 2), descuento_aplicado)
      .input("monto_venta", sql.Decimal(10, 2), monto_venta)
      .input("fecha_uso", sql.DateTime, fecha_uso)
      .query(`
        UPDATE uso_cupones
        SET
          cupon_id = @cupon_id,
          pedido_id = @pedido_id,
          cliente_id = @cliente_id,
          descuento_aplicado = @descuento_aplicado,
          monto_venta = @monto_venta,
          fecha_uso = @fecha_uso
        WHERE uso_cupon_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Uso de cupón no encontrado" });
    }

    return res.status(200).json({ message: "Uso de cupón actualizado correctamente" });
  } catch (err) {
    console.error("updateUsoCupon error:", err);
    return res.status(500).json({ error: "Error al actualizar el uso de cupón" });
  }
};

// ==============================================
// 📕 Eliminar un uso de cupón
// ==============================================
exports.deleteUsoCupon = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM uso_cupones WHERE uso_cupon_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Uso de cupón no encontrado" });
    }

    return res.status(200).json({ message: "Uso de cupón eliminado correctamente" });
  } catch (err) {
    console.error("deleteUsoCupon error:", err);
    return res.status(500).json({ error: "Error al eliminar el uso de cupón" });
  }
};
