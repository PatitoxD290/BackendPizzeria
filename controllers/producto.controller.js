const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");
const path = require("path");
const fs = require("fs");
// Carpeta de uploads
const uploadDir = path.join(__dirname, "..", "uploads");

// Función para eliminar imágenes antiguas de un producto
function eliminarImagenesProducto(idProducto) {
  const files = fs.readdirSync(uploadDir);
  files.forEach((file) => {
    if (file.startsWith(`producto_${idProducto}_`)) {
      const filePath = path.join(uploadDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`Archivo eliminado: ${file}`);
      } catch (err) {
        console.error(`Error eliminando archivo ${file}:`, err);
      }
    }
  });
}
// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Producto
// ==============================
function mapToProducto(row = {}) {
  const template = bdModel?.Producto || {
    ID_Producto: 0,
    Nombre: "",
    Descripcion: "",
    ID_Categoria_P: 0,
    ID_Receta: null,
    Cantidad_Disponible: 0,
    Estado: "A",
    Fecha_Registro: "",
  };

  return {
    ...template,
    ID_Producto: row.ID_Producto ?? template.ID_Producto,
    Nombre: row.Nombre ?? template.Nombre,
    Descripcion: row.Descripcion ?? template.Descripcion,
    ID_Categoria_P: row.ID_Categoria_P ?? template.ID_Categoria_P,
    ID_Receta: row.ID_Receta ?? template.ID_Receta,
    Cantidad_Disponible:
      row.Cantidad_Disponible ?? template.Cantidad_Disponible,
    Estado: row.Estado ?? template.Estado,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro,
  };
}


// ============================== 
// 📘 Obtener todos los productos CON SUS TAMAÑOS
// ============================== 
exports.getProductos = async (_req, res) => {
  try {
    const pool = await getConnection();
    
    // Obtener todos los productos
    const resultProductos = await pool
      .request()
      .query("SELECT * FROM Producto ORDER BY ID_Producto DESC");

    const productos = resultProductos.recordset.map(mapToProducto);

    // Obtener todos los tamaños de todos los productos
    const resultTamanos = await pool
      .request()
      .query(`
        SELECT 
          pt.ID_Producto_T,
          pt.ID_Producto,
          pt.ID_Tamano,
          pt.Precio,
          pt.Estado,
          pt.Fecha_Registro,
          t.Tamano as nombre_tamano
        FROM Producto_Tamano pt
        INNER JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
        WHERE pt.Estado = 'A'  -- ← Agregar este filtro
        ORDER BY pt.ID_Producto, t.ID_Tamano
      `);

    // Agrupar tamaños por producto
    const tamanosPorProducto = {};
    resultTamanos.recordset.forEach(tamano => {
      if (!tamanosPorProducto[tamano.ID_Producto]) {
        tamanosPorProducto[tamano.ID_Producto] = [];
      }
      tamanosPorProducto[tamano.ID_Producto].push(tamano);
    });

    // Agregar tamaños a cada producto
    productos.forEach(producto => {
      producto.tamanos = tamanosPorProducto[producto.ID_Producto] || [];
    });

    return res.status(200).json(productos);
  } catch (err) {
    console.error("getProductos error:", err);
    return res.status(500).json({ error: "Error al obtener los productos" });
  }
};

// ============================== 
// 📘 Obtener un producto por ID CON SUS TAMAÑOS
// ============================== 
exports.getProductoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    
    // Obtener el producto
    const resultProducto = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Producto WHERE ID_Producto = @id");

    if (!resultProducto.recordset.length) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const producto = resultProducto.recordset[0];

    // Obtener los tamaños del producto con sus precios
    const resultTamanos = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          pt.ID_Producto_T,
          pt.ID_Producto,
          pt.ID_Tamano,
          pt.Precio,
          pt.Estado,
          pt.Fecha_Registro,
          t.Tamano as nombre_tamano
        FROM Producto_Tamano pt
        INNER JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
        WHERE pt.ID_Producto = @id AND pt.Estado = 'A'  -- ← Agregar este filtro
        ORDER BY t.ID_Tamano
      `);


    // Agregar los tamaños al producto
    producto.tamanos = resultTamanos.recordset || [];

    console.log('Producto con tamaños:', producto);

    return res.status(200).json(producto);
  } catch (err) {
    console.error("getProductoById error:", err);
    return res.status(500).json({ error: "Error al obtener el producto" });
  }
};

// ============================== 
// 📗 Crear un nuevo producto + Producto_Tamano
// ============================== 
exports.createProducto = async (req, res) => {
  const { 
    Nombre, 
    Descripcion, 
    ID_Categoria_P, 
    ID_Receta, 
    Cantidad_Disponible, 
    Estado
  } = req.body;

  // ⚠️ IMPORTANTE: Si viene Producto_Tamano como string, parsearlo
  let Producto_Tamano = [];
  if (req.body.Producto_Tamano) {
    try {
      Producto_Tamano = typeof req.body.Producto_Tamano === 'string' 
        ? JSON.parse(req.body.Producto_Tamano) 
        : req.body.Producto_Tamano;
    } catch (err) {
      console.error("Error parseando Producto_Tamano:", err);
    }
  }

  if (!Nombre || ID_Categoria_P == null) {
    return res.status(400).json({ error: "Faltan campos obligatorios: Nombre e ID_Categoria_P" });
  }

  try {
    const pool = await getConnection();
    
    // Insertar producto
    const result = await pool.request()
      .input("Nombre", sql.VarChar(100), Nombre)
      .input("Descripcion", sql.VarChar(8000), Descripcion || "")
      .input("ID_Categoria_P", sql.Int, Number(ID_Categoria_P))
      .input("ID_Receta", sql.Int, ID_Receta ? Number(ID_Receta) : null)
      .input("Cantidad_Disponible", sql.Int, Cantidad_Disponible || 0)
      .input("Estado", sql.Char(1), Estado || "A")
      .input("Fecha_Registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO Producto (
          Nombre, Descripcion, ID_Categoria_P, ID_Receta, 
          Cantidad_Disponible, Estado, Fecha_Registro
        )
        VALUES (
          @Nombre, @Descripcion, @ID_Categoria_P, @ID_Receta, 
          @Cantidad_Disponible, @Estado, @Fecha_Registro
        );
        SELECT SCOPE_IDENTITY() AS ID_Producto;
      `);

    const idProducto = result.recordset?.[0]?.ID_Producto;
    if (!idProducto) return res.status(500).json({ error: "No se generó ID del Producto" });

    // Insertar Producto_Tamano
    for (const t of Producto_Tamano) {
      await pool.request()
        .input("ID_Producto", sql.Int, idProducto)
        .input("ID_Tamano", sql.Int, t.ID_Tamano)
        .input("Precio", sql.Decimal(10, 2), t.Precio)
        .input("Estado", sql.Char(1), "A")
        .input("Fecha_Registro", sql.DateTime, new Date())
        .query(`
          INSERT INTO Producto_Tamano (ID_Producto, ID_Tamano, Precio, Estado, Fecha_Registro)
          VALUES (@ID_Producto, @ID_Tamano, @Precio, @Estado, @Fecha_Registro)
        `);
    }

    // Manejo de imágenes
    const archivosRenombrados = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const extension = path.extname(file.originalname);
        const nuevoNombre = `producto_${idProducto}_${i + 1}${extension}`;
        fs.renameSync(
          path.join(file.destination, file.filename),
          path.join(file.destination, nuevoNombre)
        );
        archivosRenombrados.push(nuevoNombre);
      }
    }

    return res.status(201).json({
      message: "Producto y tamaños registrados correctamente",
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
// 📙 Actualizar un producto + Producto_Tamano
// ============================== 
exports.updateProducto = async (req, res) => {
  const { id } = req.params;
  const { 
    Nombre, 
    Descripcion, 
    ID_Categoria_P, 
    ID_Receta, 
    Cantidad_Disponible, 
    Estado 
  } = req.body;

  // ⚠️ IMPORTANTE: Si viene Producto_Tamano como string, parsearlo
  let Producto_Tamano = [];
  if (req.body.Producto_Tamano) {
    try {
      Producto_Tamano = typeof req.body.Producto_Tamano === 'string' 
        ? JSON.parse(req.body.Producto_Tamano) 
        : req.body.Producto_Tamano;
    } catch (err) {
      console.error("Error parseando Producto_Tamano:", err);
    }
  }

  try {
    const pool = await getConnection();
    
    // Iniciar una transacción
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Actualizar producto
      await transaction.request()
        .input("ID_Producto", sql.Int, id)
        .input("Nombre", sql.VarChar(100), Nombre)
        .input("Descripcion", sql.VarChar(8000), Descripcion || "")
        .input("ID_Categoria_P", sql.Int, Number(ID_Categoria_P))
        .input("ID_Receta", sql.Int, ID_Receta ? Number(ID_Receta) : null)
        .input("Cantidad_Disponible", sql.Int, Cantidad_Disponible || 0)
        .input("Estado", sql.Char(1), Estado || "A")
        .query(`
          UPDATE Producto 
          SET Nombre=@Nombre, 
              Descripcion=@Descripcion, 
              ID_Categoria_P=@ID_Categoria_P, 
              ID_Receta=@ID_Receta, 
              Cantidad_Disponible=@Cantidad_Disponible, 
              Estado=@Estado 
          WHERE ID_Producto=@ID_Producto
        `);

      // 2. Obtener los tamaños actuales del producto
      const resultTamanosActuales = await transaction.request()
        .input("ID_Producto", sql.Int, id)
        .query("SELECT ID_Producto_T, ID_Tamano FROM Producto_Tamano WHERE ID_Producto = @ID_Producto");

      const tamanosActuales = resultTamanosActuales.recordset;
      const tamanosActualesMap = new Map(tamanosActuales.map(t => [t.ID_Tamano, t.ID_Producto_T]));

      // 3. Procesar los nuevos tamaños
      for (const t of Producto_Tamano) {
        const idTamano = t.ID_Tamano;
        const precio = t.Precio;

        // Verificar si el tamaño ya existe para este producto
        if (tamanosActualesMap.has(idTamano)) {
          // Actualizar el tamaño existente
          const idProductoT = tamanosActualesMap.get(idTamano);
          await transaction.request()
            .input("ID_Producto_T", sql.Int, idProductoT)
            .input("Precio", sql.Decimal(10, 2), precio)
            .query(`
              UPDATE Producto_Tamano 
              SET Precio = @Precio 
              WHERE ID_Producto_T = @ID_Producto_T
            `);
          
          // Remover de la lista de tamaños actuales
          tamanosActualesMap.delete(idTamano);
        } else {
          // Insertar nuevo tamaño
          await transaction.request()
            .input("ID_Producto", sql.Int, id)
            .input("ID_Tamano", sql.Int, idTamano)
            .input("Precio", sql.Decimal(10, 2), precio)
            .input("Estado", sql.Char(1), "A")
            .input("Fecha_Registro", sql.DateTime, new Date())
            .query(`
              INSERT INTO Producto_Tamano (ID_Producto, ID_Tamano, Precio, Estado, Fecha_Registro)
              VALUES (@ID_Producto, @ID_Tamano, @Precio, @Estado, @Fecha_Registro)
            `);
        }
      }

      // 4. Desactivar (no eliminar) los tamaños que ya no están en la lista
      // Esto evita el problema de la restricción de clave foránea
      for (const [idTamano, idProductoT] of tamanosActualesMap.entries()) {
        await transaction.request()
          .input("ID_Producto_T", sql.Int, idProductoT)
          .input("Estado", sql.Char(1), "I") // Cambiar estado a Inactivo en lugar de eliminar
          .query(`
            UPDATE Producto_Tamano 
            SET Estado = @Estado 
            WHERE ID_Producto_T = @ID_Producto_T
          `);
      }

      // 5. Manejo de imágenes
      const archivosRenombrados = [];
      if (req.files && req.files.length > 0) {
        eliminarImagenesProducto(id);
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const extension = path.extname(file.originalname);
          const nuevoNombre = `producto_${id}_${i + 1}${extension}`;
          fs.renameSync(
            path.join(file.destination, file.filename),
            path.join(file.destination, nuevoNombre)
          );
          archivosRenombrados.push(nuevoNombre);
        }
      }

      // Commit de la transacción
      await transaction.commit();

      return res.status(200).json({
        message: "Producto y tamaños actualizados correctamente",
        archivos_subidos: archivosRenombrados.length,
        nombres_archivos: archivosRenombrados
      });

    } catch (err) {
      // Rollback en caso de error
      await transaction.rollback();
      throw err;
    }

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

    // 1) Eliminar imágenes asociadas
    eliminarImagenesProducto(id);

    // 2) Eliminar registros en Producto_Tamano primero
    await pool.request()
      .input("ID_Producto", sql.Int, id)
      .query(`DELETE FROM Producto_Tamano WHERE ID_Producto = @ID_Producto`);

    // 3) Luego eliminar el producto
    const result = await pool
      .request()
      .input("ID_Producto", sql.Int, id)
      .query("DELETE FROM Producto WHERE ID_Producto = @ID_Producto");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.status(200).json({ message: "Producto eliminado correctamente" });

  } catch (err) {
    console.error("deleteProducto error:", err);
    return res.status(500).json({ error: "Error al eliminar el producto" });
  }
};
