// controllers/precio_producto.controller.js
const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo PrecioProducto
// ==============================
function mapToPrecioProducto(row = {}) {
  const template = bdModel?.PrecioProducto || {
    precio_id: 0,
    producto_id: 0,
    tamano_id: null,
    precio: 0.0,
    activo: true,
    fecha_registro: ""
  };

  return {
    ...template,
    precio_id: row.precio_id ?? template.precio_id,
    producto_id: row.producto_id ?? template.producto_id,
    tamano_id: row.tamano_id ?? template.tamano_id,
    precio: row.precio ?? template.precio,
    activo: row.activo ?? template.activo,
    fecha_registro: row.fecha_registro ?? template.fecha_registro
  };
}

// ==============================
// 📘 Obtener todos los precios de productos
// ==============================
exports.getPreciosProducto = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query("SELECT * FROM precios_producto ORDER BY fecha_registro DESC");

    const precios = (result.recordset || []).map(mapToPrecioProducto);
    return res.status(200).json(precios);
  } catch (err) {
    console.error("getPreciosProducto error:", err);
    return res.status(500).json({ error: "Error al obtener los precios" });
  }
};

// ==============================
// 📘 Obtener un precio por ID
// ==============================
exports.getPrecioProductoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM precios_producto WHERE precio_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Precio no encontrado" });
    }

    return res.status(200).json(mapToPrecioProducto(result.recordset[0]));
  } catch (err) {
    console.error("getPrecioProductoById error:", err);
    return res.status(500).json({ error: "Error al obtener el precio" });
  }
};

// ==============================
// 📗 Crear un nuevo precio de producto
// ==============================
exports.createPrecioProducto = async (req, res) => {
  const { producto_id, tamano_id, precio, activo } = req.body;

  try {
    if (!producto_id) {
      return res.status(400).json({
        error: "Falta el campo obligatorio: producto_id"
      });
    }

    const pool = await getConnection();

    let finalPrecio = precio;

    // Si no se proporcionó el precio, intentar calcularlo
    if (precio == null) {
      if (!tamano_id) {
        return res.status(400).json({
          error: "Se requiere tamano_id para calcular el precio automáticamente"
        });
      }

      // Obtener el precio_venta del producto
      const result = await pool.request()
        .input("producto_id", sql.Int, producto_id)
        .query(`
          SELECT precio_venta FROM productos WHERE producto_id = @producto_id
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const precioVenta = result.recordset[0].precio_venta;

      // Definir el incremento según el tamano_id
      const incrementos = {
        1: -10,
        2: 0,
        3: 10,
        4: 20,
        5: 30
      };

      const incremento = incrementos[tamano_id];

      if (incremento === undefined) {
        return res.status(400).json({ error: "tamano_id inválido (debe ser 1 a 5)" });
      }

      finalPrecio = precioVenta + incremento;
    }

    // Insertar en la tabla
    await pool.request()
      .input("producto_id", sql.Int, producto_id)
      .input("tamano_id", sql.Int, tamano_id || null)
      .input("precio", sql.Decimal(10, 2), finalPrecio)
      .input("activo", sql.Bit, activo != null ? activo : true)
      .input("fecha_registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO precios_producto (
          producto_id, tamano_id, precio, activo, fecha_registro
        )
        VALUES (
          @producto_id, @tamano_id, @precio, @activo, @fecha_registro
        )
      `);

    return res.status(201).json({ message: "Precio registrado correctamente" });

  } catch (err) {
    console.error("createPrecioProducto error:", err);
    return res.status(500).json({ error: "Error al registrar el precio" });
  }
};


// ==============================
// 📙 Actualizar un precio de producto
// ==============================
exports.updatePrecioProducto = async (req, res) => {
  const { id } = req.params;
  const { producto_id, tamano_id, precio, activo } = req.body;

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    let query = "UPDATE precios_producto SET";
    let hasUpdates = false;

    if (producto_id !== undefined) {
      query += " producto_id = @producto_id,";
      request.input("producto_id", sql.Int, producto_id);
      hasUpdates = true;
    }

    if (tamano_id !== undefined) {
      query += " tamano_id = @tamano_id,";
      request.input("tamano_id", sql.Int, tamano_id);
      hasUpdates = true;
    }

    if (precio !== undefined) {
      request.input("precio", sql.Decimal(10, 2), precio);
      query += " precio = @precio,";
      hasUpdates = true;
    }

    if (activo !== undefined) {
      request.input("activo", sql.Bit, activo);
      query += " activo = @activo,";
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    // Quitar coma final
    query = query.slice(0, -1);
    query += " WHERE precio_id = @id";

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Precio no encontrado" });
    }

    return res.status(200).json({ message: "Precio actualizado correctamente" });

  } catch (err) {
    console.error("updatePrecioProducto error:", err);
    return res.status(500).json({ error: "Error al actualizar el precio" });
  }
};


// ==============================
// 📕 Eliminar un precio de producto
// ==============================
exports.deletePrecioProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM precios_producto WHERE precio_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Precio no encontrado" });
    }

    return res.status(200).json({ message: "Precio eliminado correctamente" });
  } catch (err) {
    console.error("deletePrecioProducto error:", err);
    return res.status(500).json({ error: "Error al eliminar el precio" });
  }
};
