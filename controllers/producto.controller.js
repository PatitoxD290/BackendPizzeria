const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");
const path = require("path");
const fs = require("fs");

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

  if (!nombre_producto || !categoria_id || precio_venta == null) {
    return res.status(400).json({
      error: "Faltan campos obligatorios: nombre_producto, categoria_id o precio_venta"
    });
  }

  try {
    const pool = await getConnection();

    // Insertar producto y obtener nuevo ID con OUTPUT INSERTED.producto_id
    const result = await pool.request()
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
        OUTPUT INSERTED.producto_id
        VALUES (
          @nombre_producto, @descripcion_producto, @categoria_id,
          @receta_id, @precio_venta, @estado, @fecha_registro
        )
      `);

    const idProducto = result.recordset[0].producto_id;

    if (req.files && req.files.length > 0) {
      const archivosRenombrados = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const extension = path.extname(file.originalname);
        const nuevoNombre = `producto_${idProducto}_${i + 1}${extension}`;

        const oldPath = path.join(file.destination, file.filename);
        const newPath = path.join(file.destination, nuevoNombre);

        fs.renameSync(oldPath, newPath);
        archivosRenombrados.push(nuevoNombre);
      }

      return res.status(201).json({
        message: "Producto registrado correctamente",
        producto_id: idProducto,
        archivos_subidos: archivosRenombrados.length,
        nombres_archivos: archivosRenombrados
      });
    }

    return res.status(201).json({
      message: "Producto registrado correctamente",
      producto_id: idProducto,
      archivos_subidos: 0
    });
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
  const allowedFields = [
    "nombre_producto",
    "descripcion_producto",
    "categoria_id",
    "receta_id",
    "precio_venta",
    "estado"
  ];

  try {
    const pool = await getConnection();

    // Filtrar solo los campos permitidos y que vienen en el body
    const fieldsToUpdate = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    }

    // Construir partes de la consulta y parámetros dinámicamente
    let setClause = "";
    const request = pool.request();

    let i = 0;
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      const paramName = `param${i}`;
      if (key === "precio_venta") {
        request.input(paramName, sql.Decimal(10, 2), value);
      } else if (key === "categoria_id" || key === "receta_id") {
        // Asegurar que si es null se envíe como null
        request.input(paramName, sql.Int, value === null ? null : Number(value));
      } else if (key === "estado") {
        request.input(paramName, sql.VarChar(1), value);
      } else {
        // Suponemos varchar para los otros textos
        // Podrías ajustar longitudes si quieres
        request.input(paramName, sql.VarChar(255), value);
      }

      setClause += `${key} = @${paramName}, `;
      i++;
    }

    // Quitar última coma y espacio
    setClause = setClause.slice(0, -2);

    // Agregar parámetro id
    request.input("id", sql.Int, id);

    // Ejecutar query dinámico
    const query = `UPDATE productos SET ${setClause} WHERE producto_id = @id`;

    const result = await request.query(query);

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