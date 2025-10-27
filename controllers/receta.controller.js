const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mappers (usando nombres exactos)
 // ==============================
function mapToReceta(row = {}) {
  const template = bdModel?.Receta || {
    ID_Receta: 0,
    Nombre: "",
    Descripcion: "",
    Tiempo_Preparacion: null // TIME or string HH:MM:SS
  };
  return {
    ...template,
    ID_Receta: row.ID_Receta ?? template.ID_Receta,
    Nombre: row.Nombre ?? template.Nombre,
    Descripcion: row.Descripcion ?? template.Descripcion,
    Tiempo_Preparacion: row.Tiempo_Preparacion ?? template.Tiempo_Preparacion
  };
}

function mapToDetalleReceta(row = {}) {
  // ahora el mapper incluye Nombre_Insumo y Unidad_Med
  const template = bdModel?.RecetaDetalle || {
    ID_Receta_D: 0,
    ID_Receta: 0,
    ID_Insumo: 0,
    Nombre_Insumo: "",
    Unidad_Med: "",
    Cantidad: 0,
    Uso: ""
  };
  return {
    ...template,
    ID_Receta_D: row.ID_Receta_D ?? template.ID_Receta_D,
    ID_Receta: row.ID_Receta ?? template.ID_Receta,
    ID_Insumo: row.ID_Insumo ?? template.ID_Insumo,
    Nombre_Insumo: row.Nombre_Insumo ?? template.Nombre_Insumo,
    Unidad_Med: row.Unidad_Med ?? template.Unidad_Med,
    Cantidad: row.Cantidad ?? template.Cantidad,
    Uso: row.Uso ?? template.Uso
  };
}

// ==============================
// 📗 Crear receta con detalles (transaccional)
// ==============================
exports.createRecetaConDetalle = async (req, res) => {
  const { Nombre, Descripcion, Tiempo_Preparacion, detalles } = req.body;
  if (!Nombre || !Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({
      error: "Faltan campos obligatorios: Nombre y al menos un detalle en 'detalles'"
    });
  }

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Insertar receta y obtener ID
      const reqRec = new sql.Request(transaction);
      const insertRecQuery = `
        INSERT INTO Receta (Nombre, Descripcion, Tiempo_Preparacion)
        OUTPUT INSERTED.ID_Receta
        VALUES (@Nombre, @Descripcion, @Tiempo_Preparacion)
      `;
      const recRes = await reqRec
        .input("Nombre", sql.VarChar(100), Nombre)
        .input("Descripcion", sql.Text, Descripcion || "")
        .input("Tiempo_Preparacion", sql.Time, Tiempo_Preparacion || null)
        .query(insertRecQuery);

      const recetaId = recRes.recordset && recRes.recordset[0] ? recRes.recordset[0].ID_Receta : null;
      if (!recetaId) {
        await transaction.rollback();
        return res.status(500).json({ error: "No se pudo obtener ID de la receta creada" });
      }

      // Insertar detalles (una request por insert)
      for (const det of detalles) {
        const { ID_Insumo, Cantidad, Uso } = det;
        if (!ID_Insumo || Cantidad == null) {
          await transaction.rollback();
          return res.status(400).json({ error: "Cada detalle requiere ID_Insumo y Cantidad" });
        }

        // validar existencia de insumo
        const validarInsumo = await new sql.Request(transaction)
          .input("ID_Insumo", sql.Int, ID_Insumo)
          .query("SELECT ID_Insumo FROM Insumos WHERE ID_Insumo = @ID_Insumo");

        if (!validarInsumo.recordset.length) {
          await transaction.rollback();
          return res.status(400).json({ error: `Insumo no encontrado: ${ID_Insumo}` });
        }

        const reqDet = new sql.Request(transaction);
        await reqDet
          .input("ID_Receta", sql.Int, recetaId)
          .input("ID_Insumo", sql.Int, ID_Insumo)
          .input("Cantidad", sql.Decimal(10, 2), Cantidad)
          .input("Uso", sql.Text, Uso || null)
          .query(`
            INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso)
            VALUES (@ID_Receta, @ID_Insumo, @Cantidad, @Uso)
          `);
      }

      await transaction.commit();
      return res.status(201).json({ message: "Receta con detalles registrada correctamente", ID_Receta: recetaId });
    } catch (err) {
      await transaction.rollback();
      console.error("createRecetaConDetalle transaction error:", err);
      return res.status(500).json({ error: "Error al registrar la receta con detalles" });
    }
  } catch (err) {
    console.error("createRecetaConDetalle error:", err);
    return res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};

// ==============================
// 📘 Obtener todas las recetas
// ==============================
exports.getRecetas = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Receta ORDER BY ID_Receta DESC");
    const recetas = (result.recordset || []).map(mapToReceta);
    return res.status(200).json(recetas);
  } catch (err) {
    console.error("getRecetas error:", err);
    return res.status(500).json({ error: "Error al obtener las recetas" });
  }
};

// ==============================
// 📘 Obtener receta con detalles (DETALLES CON NOMBRE Y UNIDAD)
// ==============================
exports.getRecetaDetalle = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    // Obtener receta
    const recRes = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Receta WHERE ID_Receta = @id");

    if (!recRes.recordset.length) {
      return res.status(404).json({ error: "Receta no encontrada" });
    }
    const receta = mapToReceta(recRes.recordset[0]);

    // Obtener detalles con JOIN a Insumos para nombre y unidad de medida
    const detallesQuery = `
      SELECT rd.ID_Receta_D, rd.ID_Receta, rd.ID_Insumo,
             i.Nombre AS Nombre_Insumo, i.Unidad_Med AS Unidad_Med,
             rd.Cantidad, rd.Uso
      FROM Receta_Detalle rd
      LEFT JOIN Insumos i ON rd.ID_Insumo = i.ID_Insumo
      WHERE rd.ID_Receta = @id
      ORDER BY rd.ID_Receta_D ASC
    `;
    const detRes = await pool.request().input("id", sql.Int, id).query(detallesQuery);
    const detalles = (detRes.recordset || []).map(mapToDetalleReceta);

    return res.status(200).json({ receta, detalles });
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
    const result = await pool.request().input("id", sql.Int, id).query("SELECT * FROM Receta WHERE ID_Receta = @id");
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
// 📙 Actualizar receta y/o detalles (si vienen reemplaza detalles)
// ==============================
exports.updateReceta = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Descripcion, Tiempo_Preparacion, detalles } = req.body;

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Validar existencia
      const exist = await transaction.request().input("id", sql.Int, id).query("SELECT ID_Receta FROM Receta WHERE ID_Receta = @id");
      if (!exist.recordset.length) {
        await transaction.rollback();
        return res.status(404).json({ error: "Receta no encontrada" });
      }

      // Actualizar campos si vienen
      const updateParts = [];
      const reqUpd = transaction.request();
      reqUpd.input("id", sql.Int, id);
      if (Nombre !== undefined) { updateParts.push("Nombre = @Nombre"); reqUpd.input("Nombre", sql.VarChar(100), Nombre); }
      if (Descripcion !== undefined) { updateParts.push("Descripcion = @Descripcion"); reqUpd.input("Descripcion", sql.Text, Descripcion); }
      if (Tiempo_Preparacion !== undefined) { updateParts.push("Tiempo_Preparacion = @Tiempo_Preparacion"); reqUpd.input("Tiempo_Preparacion", sql.Time, Tiempo_Preparacion); }

      if (updateParts.length > 0) {
        const q = `UPDATE Receta SET ${updateParts.join(", ")} WHERE ID_Receta = @id`;
        await reqUpd.query(q);
      }

      // Si vienen detalles: borrar existentes y crear los nuevos
      if (Array.isArray(detalles)) {
        // borrar antiguos
        await transaction.request().input("id", sql.Int, id).query("DELETE FROM Receta_Detalle WHERE ID_Receta = @id");

        // insertar nuevos
        for (const det of detalles) {
          const { ID_Insumo, Cantidad, Uso } = det;
          if (!ID_Insumo || Cantidad == null) {
            await transaction.rollback();
            return res.status(400).json({ error: "Cada detalle requiere ID_Insumo y Cantidad" });
          }

          // validar insumo
          const validar = await new sql.Request(transaction)
            .input("ID_Insumo", sql.Int, ID_Insumo)
            .query("SELECT ID_Insumo FROM Insumos WHERE ID_Insumo = @ID_Insumo");
          if (!validar.recordset.length) {
            await transaction.rollback();
            return res.status(400).json({ error: `Insumo no encontrado: ${ID_Insumo}` });
          }

          await new sql.Request(transaction)
            .input("ID_Receta", sql.Int, id)
            .input("ID_Insumo", sql.Int, ID_Insumo)
            .input("Cantidad", sql.Decimal(10,2), Cantidad)
            .input("Uso", sql.Text, Uso || null)
            .query(`
              INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso)
              VALUES (@ID_Receta, @ID_Insumo, @Cantidad, @Uso)
            `);
        }
      }

      await transaction.commit();
      return res.status(200).json({ message: "Receta actualizada correctamente" });
    } catch (err) {
      await transaction.rollback();
      console.error("updateReceta transaction error:", err);
      return res.status(500).json({ error: "Error al actualizar la receta" });
    }
  } catch (err) {
    console.error("updateReceta error:", err);
    return res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};

// ==============================
// 📘 Obtener detalles por ID_Receta (solo detalles, con nombre y unidad)
// ==============================
exports.getDetallesPorReceta = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const query = `
      SELECT rd.ID_Receta_D, rd.ID_Receta, rd.ID_Insumo,
             i.Nombre AS Nombre_Insumo, i.Unidad_Med AS Unidad_Med,
             rd.Cantidad, rd.Uso
      FROM Receta_Detalle rd
      LEFT JOIN Insumos i ON rd.ID_Insumo = i.ID_Insumo
      WHERE rd.ID_Receta = @id
      ORDER BY rd.ID_Receta_D ASC
    `;
    const result = await pool.request().input("id", sql.Int, id).query(query);
    if (!result.recordset.length) {
      return res.status(404).json({ message: "No se encontraron detalles para esta receta" });
    }
    const detalles = result.recordset.map(mapToDetalleReceta);
    return res.status(200).json(detalles);
  } catch (err) {
    console.error("getDetallesPorReceta error:", err);
    return res.status(500).json({ error: "Error al obtener los detalles de la receta" });
  }
};

// ==============================
// 📕 Eliminar receta y sus detalles
// ==============================
exports.deleteReceta = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // borrar detalles
      await transaction.request().input("id", sql.Int, id).query("DELETE FROM Receta_Detalle WHERE ID_Receta = @id");

      // borrar receta
      const delRes = await transaction.request().input("id", sql.Int, id).query("DELETE FROM Receta WHERE ID_Receta = @id");
      if (delRes.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: "Receta no encontrada" });
      }

      await transaction.commit();
      return res.status(200).json({ message: "Receta y detalles eliminados correctamente" });
    } catch (err) {
      await transaction.rollback();
      console.error("deleteReceta transaction error:", err);
      return res.status(500).json({ error: "Error al eliminar la receta" });
    }
  } catch (err) {
    console.error("deleteReceta error:", err);
    return res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};
