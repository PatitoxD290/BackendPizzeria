const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// Mapper: adapta una fila SQL al modelo Categoria definido en bd.models.js
function mapToCategoria(row = {}) {
  const template = (bdModel && bdModel.Categoria) ? bdModel.Categoria : {
    categoria_id: 0,
    nombre_categoria: "",
    descripcion_categoria: ""
  };

  return {
    ...template,
    categoria_id: row.categoria_id ?? template.categoria_id,
    nombre_categoria: row.nombre_categoria ?? template.nombre_categoria,
    descripcion_categoria: row.descripcion_categoria ?? template.descripcion_categoria
  };
}

// ==============================
// 📘 Obtener todas las categorías
// ==============================
exports.getCategorias = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM categorias");
    const categorias = (result.recordset || []).map(mapToCategoria);
    return res.status(200).json(categorias);
  } catch (err) {
    console.error("getCategorias error:", err);
    return res.status(500).json({ error: "Error al obtener las categorías" });
  }
};

// ==============================
// 📘 Obtener una categoría por ID
// ==============================
exports.getCategoriaById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM categorias WHERE categoria_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    return res.status(200).json(mapToCategoria(result.recordset[0]));
  } catch (err) {
    console.error("getCategoriaById error:", err);
    return res.status(500).json({ error: "Error al obtener la categoría" });
  }
};

// ==============================
// 📗 Crear una nueva categoría
// ==============================
exports.createCategoria = async (req, res) => {
  const { nombre_categoria, descripcion_categoria } = req.body;

  try {
    if (!nombre_categoria) {
      return res.status(400).json({ error: "El campo 'nombre_categoria' es obligatorio" });
    }

    const pool = await getConnection();
    await pool.request()
      .input("nombre_categoria", sql.VarChar(100), nombre_categoria)
      .input("descripcion_categoria", sql.VarChar(255), descripcion_categoria || "")
      .query(`
        INSERT INTO categorias (nombre_categoria, descripcion_categoria)
        VALUES (@nombre_categoria, @descripcion_categoria)
      `);

    return res.status(201).json({ message: "Categoría creada exitosamente" });
  } catch (err) {
    console.error("createCategoria error:", err);
    return res.status(500).json({ error: "Error al crear la categoría" });
  }
};

// ==============================
// 📙 Actualizar una categoría
// ==============================
exports.updateCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre_categoria, descripcion_categoria } = req.body;

  try {
    const pool = await getConnection();
    await pool.request()
      .input("id", sql.Int, id)
      .input("nombre_categoria", sql.VarChar(100), nombre_categoria)
      .input("descripcion_categoria", sql.VarChar(255), descripcion_categoria)
      .query(`
        UPDATE categorias
        SET 
          nombre_categoria = @nombre_categoria,
          descripcion_categoria = @descripcion_categoria
        WHERE categoria_id = @id
      `);

    return res.status(200).json({ message: "Categoría actualizada exitosamente" });
  } catch (err) {
    console.error("updateCategoria error:", err);
    return res.status(500).json({ error: "Error al actualizar la categoría" });
  }
};

// ==============================
// 📕 Eliminar una categoría
// ==============================
exports.deleteCategoria = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM categorias WHERE categoria_id = @id");

    return res.status(200).json({ message: "Categoría eliminada exitosamente" });
  } catch (err) {
    console.error("deleteCategoria error:", err);
    return res.status(500).json({ error: "Error al eliminar la categoría" });
  }
};
