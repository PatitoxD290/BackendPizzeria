const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// =========================================
// 🧩 Función auxiliar: obtener configuración
// =========================================
function getCategoriaConfig(tipo) {
  const lower = tipo?.toLowerCase();
  if (lower === "producto" || lower === "productos") {
    return {
      table: "categorias_productos",
      id: "ID_Categoria_P",
      nombre: "Nombre",
      model: bdModel.CategoriaProducto
    };
  } else if (lower === "insumo" || lower === "insumos") {
    return {
      table: "categorias_insumos",
      id: "ID_Categoria_I",
      nombre: "Nombre",
      model: bdModel.CategoriaInsumos
    };
  } else {
    throw new Error("Tipo de categoría inválido. Use 'producto' o 'insumo'.");
  }
}

// =========================================
// 🧭 Mapper: adapta fila SQL al modelo base
// =========================================
function mapToCategoria(row = {}, model) {
  const template = model || { ID: 0, Nombre: "" };
  return { ...template, ...row };
}

// =========================================
// 📘 Obtener todas las categorías
// =========================================
exports.getCategorias = async (req, res) => {
  const { tipo } = req.params;
  try {
    const config = getCategoriaConfig(tipo);
    const pool = await getConnection();
    const result = await pool.request().query(`SELECT * FROM ${config.table}`);
    const categorias = (result.recordset || []).map(row =>
      mapToCategoria(row, config.model)
    );
    return res.status(200).json(categorias);
  } catch (err) {
    console.error("getCategorias error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// =========================================
// 📘 Obtener una categoría por ID
// =========================================
exports.getCategoriaById = async (req, res) => {
  const { tipo, id } = req.params;
  try {
    const config = getCategoriaConfig(tipo);
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`SELECT * FROM ${config.table} WHERE ${config.id} = @id`);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    return res.status(200).json(mapToCategoria(result.recordset[0], config.model));
  } catch (err) {
    console.error("getCategoriaById error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// =========================================
// 📗 Crear una nueva categoría
// =========================================
exports.createCategoria = async (req, res) => {
  const { tipo } = req.params;
  const { Nombre } = req.body;

  try {
    if (!Nombre) {
      return res.status(400).json({ error: "El campo 'Nombre' es obligatorio" });
    }

    const config = getCategoriaConfig(tipo);
    const pool = await getConnection();
    await pool.request()
      .input("Nombre", sql.VarChar(100), Nombre)
      .query(`INSERT INTO ${config.table} (${config.nombre}) VALUES (@Nombre)`);

    return res.status(201).json({ message: `Categoría de ${tipo} creada exitosamente` });
  } catch (err) {
    console.error("createCategoria error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// =========================================
// 📙 Actualizar una categoría
// =========================================
exports.updateCategoria = async (req, res) => {
  const { tipo, id } = req.params;
  const { Nombre } = req.body;

  try {
    const config = getCategoriaConfig(tipo);
    const pool = await getConnection();

    const request = pool.request();
    request.input("id", sql.Int, id);
    if (Nombre) request.input("Nombre", sql.VarChar(100), Nombre);

    await request.query(`
      UPDATE ${config.table}
      SET ${config.nombre} = @Nombre
      WHERE ${config.id} = @id
    `);

    return res.status(200).json({ message: `Categoría de ${tipo} actualizada exitosamente` });
  } catch (err) {
    console.error("updateCategoria error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// =========================================
// 📕 Eliminar una categoría
// =========================================
exports.deleteCategoria = async (req, res) => {
  const { tipo, id } = req.params;
  try {
    const config = getCategoriaConfig(tipo);
    const pool = await getConnection();
    await pool.request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM ${config.table} WHERE ${config.id} = @id`);

    return res.status(200).json({ message: `Categoría de ${tipo} eliminada exitosamente` });
  } catch (err) {
    console.error("deleteCategoria error:", err);
    return res.status(500).json({ error: err.message });
  }
};
