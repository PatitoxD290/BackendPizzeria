const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo DetalleReceta
// ==============================
function mapToDetalleReceta(row = {}) {
  const template = bdModel?.DetalleReceta || {
    detalle_receta_id: 0,
    receta_id: 0,
    ingrediente_id: 0,
    cantidad_requerida: 0.0,
    unidad_medida: "",
    descripcion_uso: ""
  };

  return {
    ...template,
    detalle_receta_id: row.detalle_receta_id ?? template.detalle_receta_id,
    receta_id: row.receta_id ?? template.receta_id,
    ingrediente_id: row.ingrediente_id ?? template.ingrediente_id,
    cantidad_requerida: row.cantidad_requerida ?? template.cantidad_requerida,
    unidad_medida: row.unidad_medida ?? template.unidad_medida,
    descripcion_uso: row.descripcion_uso ?? template.descripcion_uso
  };
}

// ==============================
// 📘 Obtener todos los detalles de recetas
// ==============================
exports.getDetallesRecetas = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM detalle_recetas ORDER BY detalle_receta_id DESC");
    const detalles = (result.recordset || []).map(mapToDetalleReceta);
    return res.status(200).json(detalles);
  } catch (err) {
    console.error("getDetallesRecetas error:", err);
    return res.status(500).json({ error: "Error al obtener los detalles de recetas" });
  }
};

// ==============================
// 📘 Obtener detalle de receta por ID
// ==============================
exports.getDetalleRecetaById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM detalle_recetas WHERE detalle_receta_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Detalle de receta no encontrado" });
    }

    return res.status(200).json(mapToDetalleReceta(result.recordset[0]));
  } catch (err) {
    console.error("getDetalleRecetaById error:", err);
    return res.status(500).json({ error: "Error al obtener el detalle de receta" });
  }
};

// ==============================
// 📗 Crear nuevo detalle de receta
// ==============================
exports.createDetalleReceta = async (req, res) => {
  const { receta_id, ingrediente_id, cantidad_requerida, unidad_medida, descripcion_uso } = req.body;

  try {
    if (!receta_id || !ingrediente_id || !cantidad_requerida || !unidad_medida) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: receta_id, ingrediente_id, cantidad_requerida o unidad_medida"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("receta_id", sql.Int, receta_id)
      .input("ingrediente_id", sql.Int, ingrediente_id)
      .input("cantidad_requerida", sql.Decimal(10, 2), cantidad_requerida)
      .input("unidad_medida", sql.VarChar(50), unidad_medida)
      .input("descripcion_uso", sql.VarChar(255), descripcion_uso || "")
      .query(`
        INSERT INTO detalle_recetas (
          receta_id, ingrediente_id, cantidad_requerida, unidad_medida, descripcion_uso
        )
        VALUES (
          @receta_id, @ingrediente_id, @cantidad_requerida, @unidad_medida, @descripcion_uso
        )
      `);

    return res.status(201).json({ message: "Detalle de receta registrado correctamente" });
  } catch (err) {
    console.error("createDetalleReceta error:", err);
    return res.status(500).json({ error: "Error al registrar el detalle de receta" });
  }
};

// ==============================
// 📙 Actualizar un detalle de receta
// ==============================
exports.updateDetalleReceta = async (req, res) => {
  const { id } = req.params;
  const { receta_id, ingrediente_id, cantidad_requerida, unidad_medida, descripcion_uso } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("receta_id", sql.Int, receta_id)
      .input("ingrediente_id", sql.Int, ingrediente_id)
      .input("cantidad_requerida", sql.Decimal(10, 2), cantidad_requerida)
      .input("unidad_medida", sql.VarChar(50), unidad_medida)
      .input("descripcion_uso", sql.VarChar(255), descripcion_uso)
      .query(`
        UPDATE detalle_recetas
        SET 
          receta_id = @receta_id,
          ingrediente_id = @ingrediente_id,
          cantidad_requerida = @cantidad_requerida,
          unidad_medida = @unidad_medida,
          descripcion_uso = @descripcion_uso
        WHERE detalle_receta_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Detalle de receta no encontrado" });
    }

    return res.status(200).json({ message: "Detalle de receta actualizado correctamente" });
  } catch (err) {
    console.error("updateDetalleReceta error:", err);
    return res.status(500).json({ error: "Error al actualizar el detalle de receta" });
  }
};

// ==============================
// 📕 Eliminar un detalle de receta
// ==============================
exports.deleteDetalleReceta = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM detalle_recetas WHERE detalle_receta_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Detalle de receta no encontrado" });
    }

    return res.status(200).json({ message: "Detalle de receta eliminado correctamente" });
  } catch (err) {
    console.error("deleteDetalleReceta error:", err);
    return res.status(500).json({ error: "Error al eliminar el detalle de receta" });
  }
};
