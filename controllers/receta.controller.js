const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mappers
// ==============================
function mapToReceta(row = {}) {
  const template = bdModel?.Receta || {
    receta_id: 0,
    nombre_receta: "",
    descripcion_receta: "",
    tiempo_estimado_minutos: 0,
  };
  return {
    ...template,
    receta_id: row.receta_id ?? template.receta_id,
    nombre_receta: row.nombre_receta ?? template.nombre_receta,
    descripcion_receta: row.descripcion_receta ?? template.descripcion_receta,
    tiempo_estimado_minutos: row.tiempo_estimado_minutos ?? template.tiempo_estimado_minutos,
  };
}

function mapToDetalleReceta(row = {}) {
  const template = bdModel?.DetalleReceta || {
    detalle_receta_id: 0,
    receta_id: 0,
    ingrediente_id: 0,
    cantidad_requerida: 0.0,
    unidad_medida: "",
    descripcion_uso: "",
  };
  return {
    ...template,
    detalle_receta_id: row.detalle_receta_id ?? template.detalle_receta_id,
    receta_id: row.receta_id ?? template.receta_id,
    ingrediente_id: row.ingrediente_id ?? template.ingrediente_id,
    cantidad_requerida: row.cantidad_requerida ?? template.cantidad_requerida,
    unidad_medida: row.unidad_medida ?? template.unidad_medida,
    descripcion_uso: row.descripcion_uso ?? template.descripcion_uso,
  };
}

// ==============================
// 📗 Crear receta con detalles
// ==============================
exports.createRecetaConDetalle = async (req, res) => {
  const { nombre_receta, descripcion_receta, tiempo_estimado_minutos, detalles } = req.body;

  if (!nombre_receta || !descripcion_receta || !Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({
      error:
        "Faltan campos obligatorios: nombre_receta, descripcion_receta y al menos un detalle en detalles",
    });
  }

  try {
    const pool = await getConnection();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Insert receta
      const requestReceta = transaction.request();
      const resultReceta = await requestReceta
        .input("nombre_receta", sql.VarChar(100), nombre_receta)
        .input("descripcion_receta", sql.VarChar(255), descripcion_receta)
        .input("tiempo_estimado_minutos", sql.Int, tiempo_estimado_minutos || 0)
        .query(
          `INSERT INTO recetas (nombre_receta, descripcion_receta, tiempo_estimado_minutos)
           OUTPUT INSERTED.receta_id
           VALUES (@nombre_receta, @descripcion_receta, @tiempo_estimado_minutos)`
        );

      const receta_id = resultReceta.recordset[0].receta_id;

      // Insert detalles
      const requestDetalle = transaction.request();

      for (const det of detalles) {
        const {
          ingrediente_id,
          cantidad_requerida,
          unidad_medida,
          descripcion_uso = "",
        } = det;

        if (
          !ingrediente_id ||
          cantidad_requerida === undefined ||
          cantidad_requerida === null ||
          !unidad_medida
        ) {
          await transaction.rollback();
          return res.status(400).json({
            error:
              "Cada detalle debe tener ingrediente_id, cantidad_requerida y unidad_medida",
          });
        }

        await requestDetalle
          .input("receta_id", sql.Int, receta_id)
          .input("ingrediente_id", sql.Int, ingrediente_id)
          .input("cantidad_requerida", sql.Decimal(10, 2), cantidad_requerida)
          .input("unidad_medida", sql.VarChar(50), unidad_medida)
          .input("descripcion_uso", sql.VarChar(255), descripcion_uso)
          .query(
            `INSERT INTO detalle_recetas
            (receta_id, ingrediente_id, cantidad_requerida, unidad_medida, descripcion_uso)
            VALUES (@receta_id, @ingrediente_id, @cantidad_requerida, @unidad_medida, @descripcion_uso)`
          );
      }

      await transaction.commit();

      return res.status(201).json({
        message: "Receta con detalles registrada correctamente",
        receta_id,
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("createRecetaConDetalle error:", err);
    return res.status(500).json({ error: "Error al registrar la receta con detalles" });
  }
};

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
// 📘 Obtener detalle completo de una receta (receta + detalles concatenados)
// ==============================
exports.getRecetaDetalle = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    // Obtener receta
    const resultReceta = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM recetas WHERE receta_id = @id");
    
    if (!resultReceta.recordset.length) {
      return res.status(404).json({ error: "Receta no encontrada" });
    }
    const receta = mapToReceta(resultReceta.recordset[0]);

    // Obtener detalles con JOIN a ingredientes para obtener nombre_ingrediente
    const queryDetalles = `
      SELECT dr.*, i.nombre_ingrediente
      FROM detalle_recetas dr
      INNER JOIN ingredientes i ON dr.ingrediente_id = i.ingrediente_id
      WHERE dr.receta_id = @id
      ORDER BY dr.detalle_receta_id
    `;

    const resultDetalles = await pool.request()
      .input("id", sql.Int, id)
      .query(queryDetalles);

    const detalles = resultDetalles.recordset || [];

    // Concatenar detalles en string: "nombre_ingrediente + (cantidad_requerida + unidad_medida) + : descripcion_uso"
    const detallesConcatenados = detalles
      .map(d => {
        let cantidadUnidad = `${d.cantidad_requerida}${d.unidad_medida ? ' ' + d.unidad_medida : ''}`;
        let descripcion = d.descripcion_uso ? `: ${d.descripcion_uso}` : "";
        return `${d.nombre_ingrediente} (${cantidadUnidad})${descripcion}`;
      })
      .join(", ");

    return res.status(200).json({ receta, detalles: detallesConcatenados });
  } catch (err) {
    console.error("getRecetaDetalle error:", err);
    return res.status(500).json({ error: "Error al obtener detalle de receta" });
  }
};


// ==============================
// 📘 Obtener receta por ID (solo receta)
// ==============================
exports.getRecetaById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request().input("id", sql.Int, id).query("SELECT * FROM recetas WHERE receta_id = @id");
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
// 📙 Actualizar receta y/o detalles (parcial, solo lo que llega)
// ==============================
exports.updateReceta = async (req, res) => {
  const { id } = req.params;
  const { nombre_receta, descripcion_receta, tiempo_estimado_minutos, detalles } = req.body;

  try {
    const pool = await getConnection();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Primero verificamos que la receta exista
      const recetaExistente = await transaction.request()
        .input("id", sql.Int, id)
        .query("SELECT receta_id FROM recetas WHERE receta_id = @id");

      if (!recetaExistente.recordset.length) {
        await transaction.rollback();
        return res.status(404).json({ error: "Receta no encontrada" });
      }

      // Actualizar receta solo los campos que llegan
      let updateFields = [];
      if (nombre_receta !== undefined) updateFields.push("nombre_receta = @nombre_receta");
      if (descripcion_receta !== undefined) updateFields.push("descripcion_receta = @descripcion_receta");
      if (tiempo_estimado_minutos !== undefined) updateFields.push("tiempo_estimado_minutos = @tiempo_estimado_minutos");

      if (updateFields.length > 0) {
        let queryUpdate = `UPDATE recetas SET ${updateFields.join(", ")} WHERE receta_id = @id`;
        let reqUpdate = transaction.request().input("id", sql.Int, id);
        if (nombre_receta !== undefined) reqUpdate.input("nombre_receta", sql.VarChar(100), nombre_receta);
        if (descripcion_receta !== undefined) reqUpdate.input("descripcion_receta", sql.VarChar(255), descripcion_receta);
        if (tiempo_estimado_minutos !== undefined) reqUpdate.input("tiempo_estimado_minutos", sql.Int, tiempo_estimado_minutos);

        await reqUpdate.query(queryUpdate);
      }

      // Si llegan detalles, reemplazamos todos
      if (Array.isArray(detalles)) {
        // Borrar detalles antiguos
        await transaction.request()
          .input("id", sql.Int, id)
          .query("DELETE FROM detalle_recetas WHERE receta_id = @id");

        // Insertar nuevos detalles
        const requestDetalle = transaction.request();
        for (const det of detalles) {
          const {
            ingrediente_id,
            cantidad_requerida,
            unidad_medida,
            descripcion_uso = "",
          } = det;

          if (
            !ingrediente_id ||
            cantidad_requerida === undefined ||
            cantidad_requerida === null ||
            !unidad_medida
          ) {
            await transaction.rollback();
            return res.status(400).json({
              error:
                "Cada detalle debe tener ingrediente_id, cantidad_requerida y unidad_medida",
            });
          }

          await requestDetalle
            .input("receta_id", sql.Int, id)
            .input("ingrediente_id", sql.Int, ingrediente_id)
            .input("cantidad_requerida", sql.Decimal(10, 2), cantidad_requerida)
            .input("unidad_medida", sql.VarChar(50), unidad_medida)
            .input("descripcion_uso", sql.VarChar(255), descripcion_uso)
            .query(
              `INSERT INTO detalle_recetas
              (receta_id, ingrediente_id, cantidad_requerida, unidad_medida, descripcion_uso)
              VALUES (@receta_id, @ingrediente_id, @cantidad_requerida, @unidad_medida, @descripcion_uso)`
            );
        }
      }

      await transaction.commit();
      return res.status(200).json({ message: "Receta actualizada correctamente" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("updateReceta error:", err);
    return res.status(500).json({ error: "Error al actualizar la receta" });
  }
};

// ==============================
// 📕 Eliminar receta y detalles
// ==============================
exports.deleteReceta = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Borrar detalles asociados
      await transaction.request().input("id", sql.Int, id).query("DELETE FROM detalle_recetas WHERE receta_id = @id");

      // Borrar receta
      const result = await transaction.request().input("id", sql.Int, id).query("DELETE FROM recetas WHERE receta_id = @id");

      if (result.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: "Receta no encontrada" });
      }

      await transaction.commit();
      return res.status(200).json({ message: "Receta y detalles eliminados correctamente" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("deleteReceta error:", err);
    return res.status(500).json({ error: "Error al eliminar la receta" });
  }
};
