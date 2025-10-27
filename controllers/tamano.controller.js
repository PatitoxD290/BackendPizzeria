const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Tamano
// ==============================
function mapToTamano(row = {}) {
  const template = bdModel?.Tamano || {
    ID_Tamano: 0,
    Tamano: "",
    Variacion_Precio: 0.0
  };

  return {
    ...template,
    ID_Tamano: row.ID_Tamano ?? template.ID_Tamano,
    Tamano: row.Tamano ?? template.Tamano,
    Variacion_Precio: row.Variacion_Precio ?? template.Variacion_Precio
  };
}

// ==============================
// 📘 Obtener todos los tamaños
// ==============================
exports.getTamanos = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Tamano ORDER BY Tamano ASC");
    const tamanos = (result.recordset || []).map(mapToTamano);
    return res.status(200).json(tamanos);
  } catch (err) {
    console.error("getTamanos error:", err);
    return res.status(500).json({ error: "Error al obtener los tamaños" });
  }
};

// ==============================
// 📘 Obtener un tamaño por ID
// ==============================
exports.getTamanoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Tamano WHERE ID_Tamano = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Tamaño no encontrado" });
    }

    return res.status(200).json(mapToTamano(result.recordset[0]));
  } catch (err) {
    console.error("getTamanoById error:", err);
    return res.status(500).json({ error: "Error al obtener el tamaño" });
  }
};

// ==============================
// 📗 Crear un nuevo tamaño
// ==============================
exports.createTamano = async (req, res) => {
  const { Tamano, Variacion_Precio } = req.body;

  try {
    if (!Tamano) {
      return res.status(400).json({ error: "El campo 'Tamano' es obligatorio" });
    }

    const pool = await getConnection();
    const request = pool.request()
      .input("Tamano", sql.VarChar(50), Tamano)
      .input("Variacion_Precio", sql.Decimal(10, 2), (Variacion_Precio ?? 0.0))
      .input("Fecha_Registro", sql.DateTime, new Date()); // no hay columna Fecha_Registro en tu DDL para Tamano, pero si la añades se puede usar

    // Insertar y devolver ID
    const result = await request.query(`
      INSERT INTO Tamano (Tamano, Variacion_Precio)
      VALUES (@Tamano, @Variacion_Precio);
      SELECT SCOPE_IDENTITY() AS ID_Tamano;
    `);

    const id = result.recordset && result.recordset[0] ? result.recordset[0].ID_Tamano : null;

    return res.status(201).json({
      message: "Tamaño registrado correctamente",
      ID_Tamano: id
    });
  } catch (err) {
    console.error("createTamano error:", err);
    return res.status(500).json({ error: "Error al registrar el tamaño" });
  }
};

// ==============================
// 📙 Actualizar un tamaño
// ==============================
exports.updateTamano = async (req, res) => {
  const { id } = req.params;
  const { Tamano, Variacion_Precio } = req.body;

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    let updateParts = [];
    if (Tamano !== undefined) {
      updateParts.push("Tamano = @Tamano");
      request.input("Tamano", sql.VarChar(50), Tamano);
    }
    if (Variacion_Precio !== undefined) {
      updateParts.push("Variacion_Precio = @Variacion_Precio");
      request.input("Variacion_Precio", sql.Decimal(10, 2), Variacion_Precio);
    }

    if (updateParts.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    const query = `UPDATE Tamano SET ${updateParts.join(", ")} WHERE ID_Tamano = @id`;
    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Tamaño no encontrado" });
    }

    return res.status(200).json({ message: "Tamaño actualizado correctamente" });
  } catch (err) {
    console.error("updateTamano error:", err);
    return res.status(500).json({ error: "Error al actualizar el tamaño" });
  }
};

// ==============================
// 📕 Eliminar un tamaño
// ==============================
exports.deleteTamano = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Tamano WHERE ID_Tamano = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Tamaño no encontrado" });
    }

    return res.status(200).json({ message: "Tamaño eliminado correctamente" });
  } catch (err) {
    console.error("deleteTamano error:", err);
    return res.status(500).json({ error: "Error al eliminar el tamaño" });
  }
};
