const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// ⏱️ Conversión de minutos a formato TIME SQL
// ==============================
function minutosToTimeString(minutos) {
  if (minutos == null || isNaN(minutos)) return null;
  const horas = Math.floor(minutos / 60);
  const mins = Math.floor(minutos % 60);
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
}

// ==============================
// 🔁 Conversión de TIME (Date o string ISO) a "HH:mm:ss"
// ==============================
function timeToString(value) {
  if (!value) return null;

  // Si viene como string tipo "1970-01-01T00:50:00.000Z"
  if (typeof value === "string" && value.includes("T")) {
    const date = new Date(value);
    const h = String(date.getUTCHours()).padStart(2, "0");
    const m = String(date.getUTCMinutes()).padStart(2, "0");
    const s = String(date.getUTCSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  // Si viene como objeto Date
  if (value instanceof Date) {
    const h = String(value.getUTCHours()).padStart(2, "0");
    const m = String(value.getUTCMinutes()).padStart(2, "0");
    const s = String(value.getUTCSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  // Si ya viene como string tipo "00:50:00"
  return value;
}
// ==============================
// 🔄 Mappers (usando nombres exactos)
// ==============================
function mapToReceta(row = {}) {
  const template = bdModel?.Receta || {
    ID_Receta: 0,
    Nombre: "",
    Descripcion: "",
    Tiempo_Preparacion: null 
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
  const { Nombre, Descripcion, Tiempo_Preparacion, Detalles } = req.body;
  if (!Nombre || !Array.isArray(Detalles) || Detalles.length === 0) {
    return res.status(400).json({
      error: "Faltan campos obligatorios: Nombre y al menos un detalle en 'detalles'"
    });
  }

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Convertir minutos a formato TIME string
      const tiempoPreparacionSQL = minutosToTimeString(Tiempo_Preparacion);

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
        .input("Tiempo_Preparacion", sql.VarChar(8), tiempoPreparacionSQL)
        .query(insertRecQuery);

      const recetaId = recRes.recordset?.[0]?.ID_Receta ?? null;
      if (!recetaId) {
        await transaction.rollback();
        return res.status(500).json({ error: "No se pudo obtener ID de la receta creada" });
      }

      // Insertar detalles
      for (const det of Detalles) {
        const { ID_Insumo, Cantidad, Uso } = det;
        if (!ID_Insumo || Cantidad == null) {
          await transaction.rollback();
          return res.status(400).json({ error: "Cada detalle requiere ID_Insumo y Cantidad" });
        }

        // Validar existencia de insumo
        const validarInsumo = await new sql.Request(transaction)
          .input("ID_Insumo", sql.Int, ID_Insumo)
          .query("SELECT ID_Insumo FROM Insumos WHERE ID_Insumo = @ID_Insumo");

        if (!validarInsumo.recordset.length) {
          await transaction.rollback();
          return res.status(400).json({ error: `Insumo no encontrado: ${ID_Insumo}` });
        }

        await new sql.Request(transaction)
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
      return res.status(201).json({
        message: "Receta con detalles registrada correctamente",
        ID_Receta: recetaId
      });
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
    const recetas = (result.recordset || []).map((row) => ({
      ...mapToReceta(row),
      Tiempo_Preparacion: timeToString(row.Tiempo_Preparacion),
    }));
    return res.status(200).json(recetas);
  } catch (err) {
    console.error("getRecetas error:", err);
    return res.status(500).json({ error: "Error al obtener las recetas" });
  }
};


// ==============================
// 📘 Obtener receta con detalles
// ==============================
exports.getRecetaDetalle = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    const recRes = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Receta WHERE ID_Receta = @id");

    if (!recRes.recordset.length) {
      return res.status(404).json({ error: "Receta no encontrada" });
    }
    const receta = mapToReceta(recRes.recordset[0]);

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
// 📘 Obtener receta por ID
// ==============================
exports.getRecetaById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Receta WHERE ID_Receta = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Receta no encontrada" });
    }

    const receta = mapToReceta(result.recordset[0]);
    receta.Tiempo_Preparacion = timeToString(result.recordset[0].Tiempo_Preparacion);

    return res.status(200).json(receta);
  } catch (err) {
    console.error("getRecetaById error:", err);
    return res.status(500).json({ error: "Error al obtener la receta" });
  }
};

// ==============================
// 📙 Actualizar receta y/o detalles
// ==============================
exports.updateReceta = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Descripcion, Tiempo_Preparacion, detalles } = req.body;

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const exist = await transaction.request()
        .input("id", sql.Int, id)
        .query("SELECT ID_Receta FROM Receta WHERE ID_Receta = @id");
      if (!exist.recordset.length) {
        await transaction.rollback();
        return res.status(404).json({ error: "Receta no encontrada" });
      }

      const updateParts = [];
      const reqUpd = transaction.request();
      reqUpd.input("id", sql.Int, id);

      if (Nombre !== undefined) {
        updateParts.push("Nombre = @Nombre");
        reqUpd.input("Nombre", sql.VarChar(100), Nombre);
      }
      if (Descripcion !== undefined) {
        updateParts.push("Descripcion = @Descripcion");
        reqUpd.input("Descripcion", sql.Text, Descripcion);
      }
      if (Tiempo_Preparacion !== undefined) {
        const tiempoPreparacionSQL = minutosToTimeString(Tiempo_Preparacion);
        updateParts.push("Tiempo_Preparacion = @Tiempo_Preparacion");
        reqUpd.input("Tiempo_Preparacion", sql.VarChar(8), tiempoPreparacionSQL);
      }

      if (updateParts.length > 0) {
        const q = `UPDATE Receta SET ${updateParts.join(", ")} WHERE ID_Receta = @id`;
        await reqUpd.query(q);
      }

     if (Array.isArray(detalles)) {
  const req = transaction.request();
  req.input("id", sql.Int, id);
  await req.query("DELETE FROM Receta_Detalle WHERE ID_Receta = @id");

  for (const det of detalles) {
    const { ID_Insumo, Cantidad, Uso } = det;
    if (!ID_Insumo || Cantidad == null) {
      await transaction.rollback();
      return res.status(400).json({ error: "Cada detalle requiere ID_Insumo y Cantidad" });
    }

    const validar = await req
      .input("ID_Insumo", sql.Int, ID_Insumo)
      .query("SELECT ID_Insumo FROM Insumos WHERE ID_Insumo = @ID_Insumo");
    if (!validar.recordset.length) {
      await transaction.rollback();
      return res.status(400).json({ error: `Insumo no encontrado: ${ID_Insumo}` });
    }

    await req
      .input("ID_Receta", sql.Int, id)
      .input("ID_Insumo", sql.Int, ID_Insumo)
      .input("Cantidad", sql.Decimal(10, 2), Cantidad)
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
// 📘 Obtener detalles por ID_Receta
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
      await transaction.request().input("id", sql.Int, id)
        .query("DELETE FROM Receta_Detalle WHERE ID_Receta = @id");

      const delRes = await transaction.request().input("id", sql.Int, id)
        .query("DELETE FROM Receta WHERE ID_Receta = @id");

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
