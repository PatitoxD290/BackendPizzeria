const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");
const path = require("path");
const fs = require("fs");

// Carpeta de uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Producto
// ==============================
function mapToProducto(row = {}) {
  const template = bdModel?.Producto || {
    ID_Producto: 0,
    Nombre: "",
    Descripcion: "",
    Precio_Base: 0.0,
    ID_Categoria_P: 0,
    ID_Receta: null,
    Estado: "A",
    Fecha_Registro: ""
  };

  return {
    ...template,
    ID_Producto: row.ID_Producto ?? template.ID_Producto,
    Nombre: row.Nombre ?? template.Nombre,
    Descripcion: row.Descripcion ?? template.Descripcion,
    Precio_Base: row.Precio_Base ?? template.Precio_Base,
    ID_Categoria_P: row.ID_Categoria_P ?? template.ID_Categoria_P,
    ID_Receta: row.ID_Receta ?? template.ID_Receta,
    Estado: row.Estado ?? template.Estado,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro
  };
}

// ==============================
// 📘 Obtener todos los productos
// ==============================
exports.getProductos = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Producto ORDER BY ID_Producto DESC");
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
      .query("SELECT * FROM Producto WHERE ID_Producto = @id");

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
    Nombre,
    Descripcion,
    ID_Categoria_P,
    ID_Receta,
    Precio_Base,
    Estado
  } = req.body;

  // Validaciones: categoría obligatoria y precio obligatorio
  if (!Nombre || ID_Categoria_P == null || Precio_Base == null) {
    return res.status(400).json({
      error: "Faltan campos obligatorios: Nombre, ID_Categoria_P o Precio_Base"
    });
  }

  try {
    const pool = await getConnection();

    // Insertar Producto y obtener ID con SCOPE_IDENTITY()
    const result = await pool.request()
      .input("Nombre", sql.VarChar(100), Nombre)
      .input("Descripcion", sql.VarChar(8000), Descripcion || "") // TEXT en BD -> usar tamaño grande
      .input("ID_Categoria_P", sql.Int, Number(ID_Categoria_P))
      .input("ID_Receta", sql.Int, ID_Receta ? Number(ID_Receta) : null)
      .input("Precio_Base", sql.Decimal(10, 2), Precio_Base)
      .input("Estado", sql.Char(1), (Estado || "A"))
      .input("Fecha_Registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO Producto (
          Nombre, Descripcion, Precio_Base,
          ID_Categoria_P, ID_Receta, Estado, Fecha_Registro
        )
        VALUES (
          @Nombre, @Descripcion, @Precio_Base,
          @ID_Categoria_P, @ID_Receta, @Estado, @Fecha_Registro
        );
        SELECT SCOPE_IDENTITY() AS ID_Producto;
      `);

    const idProducto = result.recordset && result.recordset[0] ? result.recordset[0].ID_Producto : null;

    if (!idProducto) {
      return res.status(500).json({ error: "No se pudo obtener el ID del producto creado" });
    }

    // Manejo de archivos (si vienen)
    const archivosRenombrados = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const extension = path.extname(file.originalname);
        const nuevoNombre = `producto_${idProducto}_${i + 1}${extension}`;

        const oldPath = path.join(file.destination || "", file.filename || "");
        const newPath = path.join(file.destination || "", nuevoNombre);

        try {
          fs.renameSync(oldPath, newPath);
          archivosRenombrados.push(nuevoNombre);
        } catch (e) {
          // no detener todo por fallo en renombrado; solo loguear
          console.error("rename file error:", e);
        }
      }
    }

    return res.status(201).json({
      message: "Producto registrado correctamente",
      ID_Producto: idProducto,
      archivos_subidos: archivosRenombrados.length,
      nombres_archivos: archivosRenombrados
    });
  } catch (err) {
    console.error("createProducto error:", err);
    return res.status(500).json({ error: "Error al registrar el producto" });
  }
};

// ==============================
// 📙 Actualizar un producto (puede subir imágenes también)
// ==============================
exports.updateProducto = async (req, res) => {
  const { id } = req.params;
  const allowedFields = ["Nombre", "Descripcion", "Precio_Base", "ID_Categoria_P", "ID_Receta", "Estado"];

  try {
    const pool = await getConnection();

    // Filtrar solo los campos permitidos
    const fieldsToUpdate = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) fieldsToUpdate[field] = req.body[field];
    }

    if (fieldsToUpdate.ID_Categoria_P === null) {
      return res.status(400).json({ error: "ID_Categoria_P no puede ser null" });
    }

    if (Object.keys(fieldsToUpdate).length === 0 && !(req.files && req.files.length > 0)) {
      return res.status(400).json({ error: "No se enviaron campos para actualizar ni archivos" });
    }

    // Actualizar campos si hay
    if (Object.keys(fieldsToUpdate).length > 0) {
      let setClause = "";
      const request = pool.request();
      let i = 0;

      for (const [key, value] of Object.entries(fieldsToUpdate)) {
        const paramName = `param${i}`;
        if (key === "Precio_Base") request.input(paramName, sql.Decimal(10, 2), value);
        else if (key === "ID_Categoria_P" || key === "ID_Receta") request.input(paramName, sql.Int, value === null ? null : Number(value));
        else if (key === "Estado") request.input(paramName, sql.Char(1), value);
        else if (key === "Descripcion") request.input(paramName, sql.VarChar(8000), value || "");
        else request.input(paramName, sql.VarChar(100), value);

        setClause += `${key} = @${paramName}, `;
        i++;
      }

      setClause = setClause.slice(0, -2); // quitar última coma
      request.input("id", sql.Int, id);

      const query = `UPDATE Producto SET ${setClause} WHERE ID_Producto = @id`;
      const result = await request.query(query);

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
    }

    // Manejo de archivos si vienen
    const archivosRenombrados = [];
    if (req.files && req.files.length > 0) {
      // Eliminar archivos antiguos
      eliminarImagenesProducto(id);

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const extension = path.extname(file.originalname);
        const nuevoNombre = `producto_${id}_${i + 1}${extension}`;

        const oldPath = path.join(file.destination || "", file.filename || "");
        const newPath = path.join(file.destination || "", nuevoNombre);

        try {
          fs.renameSync(oldPath, newPath);
          archivosRenombrados.push(nuevoNombre);
        } catch (e) {
          console.error("rename file error:", e);
        }
      }
    }

    return res.status(200).json({
      message: "Producto actualizado correctamente",
      archivos_subidos: archivosRenombrados.length,
      nombres_archivos: archivosRenombrados
    });

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
      .query("DELETE FROM Producto WHERE ID_Producto = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.status(200).json({ message: "Producto eliminado correctamente" });
  } catch (err) {
    console.error("deleteProducto error:", err);
    return res.status(500).json({ error: "Error al eliminar el producto" });
  }
};
