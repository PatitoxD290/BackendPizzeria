// controllers/producto.controller.js
const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Producto
// ==============================
function mapToProducto(row = {}) {
  const template = bdModel?.Producto || {
    producto_id: 0,
    nombre_producto: "",
    descripcion_producto: "",
    categoria_id: 0,
    receta_id: null,
    precio_venta: 0.0,
    estado: "A",
    fecha_registro: ""
  };

  return {
    ...template,
    producto_id: row.producto_id ?? template.producto_id,
    nombre_producto: row.nombre_producto ?? template.nombre_producto,
    descripcion_producto: row.descripcion_producto ?? template.descripcion_producto,
    categoria_id: row.categoria_id ?? template.categoria_id,
    receta_id: row.receta_id ?? template.receta_id,
    precio_venta: row.precio_venta ?? template.precio_venta,
    estado: row.estado ?? template.estado,
    fecha_registro: row.fecha_registro ?? template.fecha_registro
  };
}

// ==============================
// 📘 Obtener todos los productos
// ==============================
exports.getProductos = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query("SELECT * FROM productos ORDER BY producto_id DESC");

    const productos = (result.recordset || []).map(mapToProducto);
    return res.status(200).json(productos);
  } catch (err) {
    console.error("getProductos error:", err);
    return res.status(500).json({ error: "Error al obtener los productos" });
  }
};

// ==============================
// 📘 Obtener un producto por ID
// ==============================
exports.getProductoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM productos WHERE producto_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.status(200).json(mapToProducto(result.recordset[0]));
  } catch (err) {
    console.error("getProductoById error:", err);
    return res.status(500).json({ error: "Error al obtener el producto" });
  }
};

// ==============================
// 📗 Crear un nuevo producto
// ==============================
exports.createProducto = async (req, res) => {
  const {
    nombre_producto,
    descripcion_producto,
    categoria_id,
    receta_id,
    precio_venta,
    estado
  } = req.body;

  try {
    if (!nombre_producto || !categoria_id || precio_venta == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: nombre_producto, categoria_id o precio_venta"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("nombre_producto", sql.VarChar(100), nombre_producto)
      .input("descripcion_producto", sql.VarChar(255), descripcion_producto || "")
      .input("categoria_id", sql.Int, categoria_id)
      .input("receta_id", sql.Int, receta_id || null)
      .input("precio_venta", sql.Decimal(10, 2), precio_venta)
      .input("estado", sql.VarChar(1), estado || "A")
      .input("fecha_registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO productos (
          nombre_producto, descripcion_producto, categoria_id,
          receta_id, precio_venta, estado, fecha_registro
        )
        VALUES (
          @nombre_producto, @descripcion_producto, @categoria_id,
          @receta_id, @precio_venta, @estado, @fecha_registro
        )
      `);

    return res.status(201).json({ message: "Producto registrado correctamente" });
  } catch (err) {
    console.error("createProducto error:", err);
    return res.status(500).json({ error: "Error al registrar el producto" });
  }
};

// ==============================
// 📙 Actualizar un producto
// ==============================
exports.updateProducto = async (req, res) => {
  const { id } = req.params;
  const {
    nombre_producto,
    descripcion_producto,
    categoria_id,
    receta_id,
    precio_venta,
    estado
  } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("nombre_producto", sql.VarChar(100), nombre_producto)
      .input("descripcion_producto", sql.VarChar(255), descripcion_producto)
      .input("categoria_id", sql.Int, categoria_id)
      .input("receta_id", sql.Int, receta_id)
      .input("precio_venta", sql.Decimal(10, 2), precio_venta)
      .input("estado", sql.VarChar(1), estado)
      .query(`
        UPDATE productos
        SET 
          nombre_producto = @nombre_producto,
          descripcion_producto = @descripcion_producto,
          categoria_id = @categoria_id,
          receta_id = @receta_id,
          precio_venta = @precio_venta,
          estado = @estado
        WHERE producto_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.status(200).json({ message: "Producto actualizado correctamente" });
  } catch (err) {
    console.error("updateProducto error:", err);
    return res.status(500).json({ error: "Error al actualizar el producto" });
  }
};

// ==============================
// 📕 Eliminar un producto
// ==============================
exports.deleteProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM productos WHERE producto_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.status(200).json({ message: "Producto eliminado correctamente" });
  } catch (err) {
    console.error("deleteProducto error:", err);
    return res.status(500).json({ error: "Error al eliminar el producto" });
  }
};
