const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta fila SQL al modelo
// ==============================
function mapToTamano(row = {}) {
  const template = bdModel?.Tamano || {
    ID_Tamano: 0,
    Tamano: ""
  };

  return {
    ...template,
    ID_Tamano: row.ID_Tamano ?? template.ID_Tamano,
    Tamano: row.Tamano ?? template.Tamano
  };
}

// ==============================
// 📘 Obtener todos los tamaños
// ==============================
exports.getTamanos = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT ID_Tamano, Tamano
      FROM Tamano
      ORDER BY Tamano ASC
    `);

    return res.status(200).json((result.recordset || []).map(mapToTamano));
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
      .query(`
        SELECT ID_Tamano, Tamano
        FROM Tamano
        WHERE ID_Tamano = @id
      `);

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
  const { Tamano } = req.body;

  try {
    if (!Tamano) {
      return res.status(400).json({ error: "El campo 'Tamano' es obligatorio" });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input("Tamano", sql.VarChar(50), Tamano)
      .query(`
        INSERT INTO Tamano (Tamano)
        OUTPUT INSERTED.ID_Tamano
        VALUES (@Tamano)
      `);

    return res.status(201).json({
      message: "Tamaño registrado correctamente",
      ID_Tamano: result.recordset[0].ID_Tamano
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
  const { Tamano } = req.body;

  try {
    if (Tamano === undefined) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("Tamano", sql.VarChar(50), Tamano)
      .query(`
        UPDATE Tamano
        SET Tamano = @Tamano
        WHERE ID_Tamano = @id
      `);

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
// 📕 Eliminar un tamaño (Versión Mejorada)
// ==============================
exports.deleteTamano = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();

    // Verificar si hay productos asociados en Producto_Tamano
    const productosResult = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT COUNT(*) as count FROM Producto_Tamano WHERE ID_Tamano = @id");
    
    if (productosResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar el tamaño porque tiene productos asociados. Elimine o reassigne los productos primero." 
      });
    }

    // Si no hay productos asociados, proceder con la eliminación
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Tamano WHERE ID_Tamano = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Tamaño no encontrado" });
    }

    return res.status(200).json({ message: "Tamaño eliminado correctamente" });
  } catch (err) {
    console.error("deleteTamano error:", err);
    
    // Manejar otros errores de base de datos
    if (err.number === 547) {
      return res.status(400).json({ 
        error: "No se puede eliminar el tamaño porque está siendo utilizado por productos en el sistema." 
      });
    }
    
    return res.status(500).json({ error: "Error al eliminar el tamaño" });
  }
};
