const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Ingrediente
// ==============================
function mapToIngrediente(row = {}) {
  const template = bdModel?.Ingrediente || {
    ingrediente_id: 0,
    nombre_ingrediente: "",
    descripcion_ingrediente: "",
    unidad_medida: "",
    categoria_ingrediente: "",
    stock_minimo: 0,
    stock_maximo: 0,
    estado: "A",
    fecha_registro: ""
  };

  return {
    ...template,
    ingrediente_id: row.ingrediente_id ?? template.ingrediente_id,
    nombre_ingrediente: row.nombre_ingrediente ?? template.nombre_ingrediente,
    descripcion_ingrediente: row.descripcion_ingrediente ?? template.descripcion_ingrediente,
    unidad_medida: row.unidad_medida ?? template.unidad_medida,
    categoria_ingrediente: row.categoria_ingrediente ?? template.categoria_ingrediente,
    stock_minimo: row.stock_minimo ?? template.stock_minimo,
    stock_maximo: row.stock_maximo ?? template.stock_maximo,
    estado: row.estado ?? template.estado,
    fecha_registro: row.fecha_registro ?? template.fecha_registro
  };
}

// ==============================
// 📘 Obtener todos los ingredientes
// ==============================
exports.getIngredientes = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query("SELECT * FROM ingredientes ORDER BY nombre_ingrediente ASC");

    const ingredientes = (result.recordset || []).map(mapToIngrediente);
    return res.status(200).json(ingredientes);
  } catch (err) {
    console.error("getIngredientes error:", err);
    return res.status(500).json({ error: "Error al obtener los ingredientes" });
  }
};

// ==============================
// 📘 Obtener un ingrediente por ID
// ==============================
exports.getIngredienteById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM ingredientes WHERE ingrediente_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Ingrediente no encontrado" });
    }

    return res.status(200).json(mapToIngrediente(result.recordset[0]));
  } catch (err) {
    console.error("getIngredienteById error:", err);
    return res.status(500).json({ error: "Error al obtener el ingrediente" });
  }
};

// ==============================
// 📗 Crear un nuevo ingrediente
// ==============================
exports.createIngrediente = async (req, res) => {
  const {
    nombre_ingrediente,
    descripcion_ingrediente,
    unidad_medida,
    categoria_ingrediente,
    stock_minimo,
    stock_maximo,
    estado
  } = req.body;

  try {
    if (!nombre_ingrediente || !unidad_medida || !categoria_ingrediente) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: nombre_ingrediente, unidad_medida o categoria_ingrediente"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("nombre_ingrediente", sql.VarChar(100), nombre_ingrediente)
      .input("descripcion_ingrediente", sql.VarChar(255), descripcion_ingrediente || "")
      .input("unidad_medida", sql.VarChar(50), unidad_medida)
      .input("categoria_ingrediente", sql.VarChar(100), categoria_ingrediente)
      .input("stock_minimo", sql.Int, stock_minimo ?? 0)
      .input("stock_maximo", sql.Int, stock_maximo ?? 0)
      .input("estado", sql.Char(1), estado || "A")
      .input("fecha_registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO ingredientes (
          nombre_ingrediente, descripcion_ingrediente, unidad_medida,
          categoria_ingrediente, stock_minimo, stock_maximo, estado, fecha_registro
        )
        VALUES (
          @nombre_ingrediente, @descripcion_ingrediente, @unidad_medida,
          @categoria_ingrediente, @stock_minimo, @stock_maximo, @estado, @fecha_registro
        )
      `);

    return res.status(201).json({ message: "Ingrediente registrado correctamente" });
  } catch (err) {
    console.error("createIngrediente error:", err);
    return res.status(500).json({ error: "Error al registrar el ingrediente" });
  }
};

// ==============================
// 📙 Actualizar un ingrediente
// ==============================
exports.updateIngrediente = async (req, res) => {
  const { id } = req.params;
  const {
    nombre_ingrediente,
    descripcion_ingrediente,
    unidad_medida,
    categoria_ingrediente,
    stock_minimo,
    stock_maximo,
    estado
  } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("nombre_ingrediente", sql.VarChar(100), nombre_ingrediente)
      .input("descripcion_ingrediente", sql.VarChar(255), descripcion_ingrediente)
      .input("unidad_medida", sql.VarChar(50), unidad_medida)
      .input("categoria_ingrediente", sql.VarChar(100), categoria_ingrediente)
      .input("stock_minimo", sql.Int, stock_minimo)
      .input("stock_maximo", sql.Int, stock_maximo)
      .input("estado", sql.Char(1), estado)
      .query(`
        UPDATE ingredientes
        SET 
          nombre_ingrediente = @nombre_ingrediente,
          descripcion_ingrediente = @descripcion_ingrediente,
          unidad_medida = @unidad_medida,
          categoria_ingrediente = @categoria_ingrediente,
          stock_minimo = @stock_minimo,
          stock_maximo = @stock_maximo,
          estado = @estado
        WHERE ingrediente_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Ingrediente no encontrado" });
    }

    return res.status(200).json({ message: "Ingrediente actualizado correctamente" });
  } catch (err) {
    console.error("updateIngrediente error:", err);
    return res.status(500).json({ error: "Error al actualizar el ingrediente" });
  }
};

// ==============================
// 📕 Eliminar un ingrediente
// ==============================
exports.deleteIngrediente = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM ingredientes WHERE ingrediente_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Ingrediente no encontrado" });
    }

    return res.status(200).json({ message: "Ingrediente eliminado correctamente" });
  } catch (err) {
    console.error("deleteIngrediente error:", err);
    return res.status(500).json({ error: "Error al eliminar el ingrediente" });
  }
};
