const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Receta
// ==============================
function mapToReceta(row = {}) {
  const template = bdModel?.Receta || {
    receta_id: 0,
    nombre_receta: "",
    descripcion_receta: "",
    tiempo_estimado_minutos: 0
  };

  return {
    ...template,
    receta_id: row.receta_id ?? template.receta_id,
    nombre_receta: row.nombre_receta ?? template.nombre_receta,
    descripcion_receta: row.descripcion_receta ?? template.descripcion_receta,
    tiempo_estimado_minutos: row.tiempo_estimado_minutos ?? template.tiempo_estimado_minutos
  };
}

// ==============================
// 📘 Obtener todas las recetas
// ==============================
exports.getRecetas = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM recetas ORDER BY receta_id DESC");
    const recetas = (result.recordset || []).map(mapToReceta);
    return res.status(200).json(recetas);
  } catch (err) {
    console.error("getRecetas error:", err);
    return res.status(500).json({ error: "Error al obtener las recetas" });
  }
};

// ==============================
// 📘 Obtener una receta por ID
// ==============================
exports.getRecetaById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM recetas WHERE receta_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Receta no encontrada" });
    }

    return res.status(200).json(mapToReceta(result.recordset[0]));
  } catch (err) {
    console.error("getRecetaById error:", err);
    return res.status(500).json({ error: "Error al obtener la receta" });
  }
};

// ==============================
// 📗 Crear una nueva receta
// ==============================
exports.createReceta = async (req, res) => {
  const { nombre_receta, descripcion_receta, tiempo_estimado_minutos } = req.body;

  try {
    if (!nombre_receta || !descripcion_receta) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: nombre_receta y descripcion_receta"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("nombre_receta", sql.VarChar(100), nombre_receta)
      .input("descripcion_receta", sql.VarChar(255), descripcion_receta)
      .input("tiempo_estimado_minutos", sql.Int, tiempo_estimado_minutos || 0)
      .query(`
        INSERT INTO recetas (nombre_receta, descripcion_receta, tiempo_estimado_minutos)
        VALUES (@nombre_receta, @descripcion_receta, @tiempo_estimado_minutos)
      `);

    return res.status(201).json({ message: "Receta registrada correctamente" });
  } catch (err) {
    console.error("createReceta error:", err);
    return res.status(500).json({ error: "Error al registrar la receta" });
  }
};

// ==============================
// 📙 Actualizar una receta
// ==============================
exports.updateReceta = async (req, res) => {
  const { id } = req.params;
  const { nombre_receta, descripcion_receta, tiempo_estimado_minutos } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("nombre_receta", sql.VarChar(100), nombre_receta)
      .input("descripcion_receta", sql.VarChar(255), descripcion_receta)
      .input("tiempo_estimado_minutos", sql.Int, tiempo_estimado_minutos)
      .query(`
        UPDATE recetas
        SET 
          nombre_receta = @nombre_receta,
          descripcion_receta = @descripcion_receta,
          tiempo_estimado_minutos = @tiempo_estimado_minutos
        WHERE receta_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Receta no encontrada" });
    }

    return res.status(200).json({ message: "Receta actualizada correctamente" });
  } catch (err) {
    console.error("updateReceta error:", err);
    return res.status(500).json({ error: "Error al actualizar la receta" });
  }
};

// ==============================
// 📕 Eliminar una receta
// ==============================
exports.deleteReceta = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM recetas WHERE receta_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Receta no encontrada" });
    }

    return res.status(200).json({ message: "Receta eliminada correctamente" });
  } catch (err) {
    console.error("deleteReceta error:", err);
    return res.status(500).json({ error: "Error al eliminar la receta" });
  }
};
