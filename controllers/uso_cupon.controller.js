const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================================
// 🔄 Mapper: adapta una fila SQL al modelo UsoCupon
// ==============================================
function mapToUsoCupon(row = {}) {
  const template = bdModel?.UsoCupon || {
    ID_Uso_C: 0,
    ID_Cupon: 0,
    ID_Pedido: 0,
    Descuento_Aplic: 0.0,
    Monto_Venta: 0.0,
    Fecha_Uso: null
  };

  return {
    ...template,
    ID_Uso_C: row.ID_Uso_C ?? template.ID_Uso_C,
    ID_Cupon: row.ID_Cupon ?? template.ID_Cupon,
    ID_Pedido: row.ID_Pedido ?? template.ID_Pedido,
    Descuento_Aplic: row.Descuento_Aplic ?? template.Descuento_Aplic,
    Monto_Venta: row.Monto_Venta ?? template.Monto_Venta,
    Fecha_Uso: row.Fecha_Uso ?? template.Fecha_Uso
  };
}

// ==============================================
// 📘 Obtener todos los usos de cupones
// ==============================================
exports.getUsosCupon = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query("SELECT * FROM Uso_Cupon ORDER BY Fecha_Uso DESC");

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
      .query("SELECT * FROM Uso_Cupon WHERE ID_Uso_C = @id");

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
    ID_Cupon,
    ID_Pedido,
    Descuento_Aplic,
    Monto_Venta,
    Fecha_Uso
  } = req.body;

  try {
    // Validaciones mínimas (usar los campos que están en tu DDL)
    if (!ID_Cupon || !ID_Pedido) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: ID_Cupon o ID_Pedido"
      });
    }

    const pool = await getConnection();
    const request = pool.request()
      .input("ID_Cupon", sql.Int, ID_Cupon)
      .input("ID_Pedido", sql.Int, ID_Pedido)
      .input("Descuento_Aplic", sql.Decimal(10, 2), Descuento_Aplic ?? 0.0)
      .input("Monto_Venta", sql.Decimal(10, 2), Monto_Venta ?? 0.0)
      .input("Fecha_Uso", sql.DateTime, Fecha_Uso ? new Date(Fecha_Uso) : new Date());

    const result = await request.query(`
      INSERT INTO Uso_Cupon (
        ID_Cupon, ID_Pedido, Descuento_Aplic, Monto_Venta, Fecha_Uso
      )
      OUTPUT INSERTED.ID_Uso_C
      VALUES (
        @ID_Cupon, @ID_Pedido, @Descuento_Aplic, @Monto_Venta, @Fecha_Uso
      )
    `);

    const nuevoId = result.recordset && result.recordset[0] ? result.recordset[0].ID_Uso_C : null;

    return res.status(201).json({
      message: "Uso de cupón registrado correctamente",
      ID_Uso_C: nuevoId
    });
  } catch (err) {
    console.error("createUsoCupon error:", err);
    return res.status(500).json({ error: "Error al registrar el uso de cupón" });
  }
};

// ==============================================
// 📙 Actualizar un uso de cupón (parcial)
// ==============================================
exports.updateUsoCupon = async (req, res) => {
  const { id } = req.params;
  const {
    ID_Cupon,
    ID_Pedido,
    Descuento_Aplic,
    Monto_Venta,
    Fecha_Uso
  } = req.body;

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    let updateParts = [];
    if (ID_Cupon !== undefined) { updateParts.push("ID_Cupon = @ID_Cupon"); request.input("ID_Cupon", sql.Int, ID_Cupon); }
    if (ID_Pedido !== undefined) { updateParts.push("ID_Pedido = @ID_Pedido"); request.input("ID_Pedido", sql.Int, ID_Pedido); }
    if (Descuento_Aplic !== undefined) { updateParts.push("Descuento_Aplic = @Descuento_Aplic"); request.input("Descuento_Aplic", sql.Decimal(10,2), Descuento_Aplic); }
    if (Monto_Venta !== undefined) { updateParts.push("Monto_Venta = @Monto_Venta"); request.input("Monto_Venta", sql.Decimal(10,2), Monto_Venta); }
    if (Fecha_Uso !== undefined) { updateParts.push("Fecha_Uso = @Fecha_Uso"); request.input("Fecha_Uso", sql.DateTime, Fecha_Uso ? new Date(Fecha_Uso) : null); }

    if (updateParts.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    const query = `UPDATE Uso_Cupon SET ${updateParts.join(", ")} WHERE ID_Uso_C = @id`;
    const result = await request.query(query);

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
      .query("DELETE FROM Uso_Cupon WHERE ID_Uso_C = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Uso de cupón no encontrado" });
    }

    return res.status(200).json({ message: "Uso de cupón eliminado correctamente" });
  } catch (err) {
    console.error("deleteUsoCupon error:", err);
    return res.status(500).json({ error: "Error al eliminar el uso de cupón" });
  }
};
