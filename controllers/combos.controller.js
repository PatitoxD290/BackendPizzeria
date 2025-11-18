const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");
const path = require("path");
const fs = require("fs");

// Carpeta de uploads
const uploadDir = path.join(__dirname, "..", "uploads");

// ==============================
// 🔄 Función para eliminar imágenes antiguas de un combo
// ==============================
function eliminarImagenesCombo(idCombo) {
  const files = fs.readdirSync(uploadDir);
  files.forEach((file) => {
    if (file.startsWith(`combo_${idCombo}_`)) {
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
// 🔄 Mapper: adapta una fila SQL al modelo Combo
// ==============================
function mapToCombo(row = {}) {
  const template = bdModel?.Combo || {
    ID_Combo: 0,
    Nombre: "",
    Descripcion: "",
    Precio: 0.0,
    Estado: "A"
  };

  return {
    ...template,
    ID_Combo: row.ID_Combo ?? template.ID_Combo,
    Nombre: row.Nombre ?? template.Nombre,
    Descripcion: row.Descripcion ?? template.Descripcion,
    Precio: row.Precio ?? template.Precio,
    Estado: row.Estado ?? template.Estado
  };
}

// ==============================
// 🔄 Mapper ComboDetalle para mostrar
// ==============================
function mapToComboDetalle(row = {}) {
  return {
    ID_Combo_D: row.ID_Combo_D || 0,
    ID_Combo: row.ID_Combo || 0,
    ID_Producto_T: row.ID_Producto_T || 0,
    Cantidad: row.Cantidad ?? 1,
    Producto_Nombre: row.Producto_Nombre || null,
    Tamano_Nombre: row.Tamano_Nombre || null
  };
}

// ==================================================
// 📘 GET /combos - Obtener todos los combos con detalles
// ==================================================
exports.getCombos = async (_req, res) => {
  try {
    const pool = await getConnection();

    const combosRes = await pool.request().query("SELECT * FROM Combos ORDER BY ID_Combo DESC");
    const combos = combosRes.recordset || [];

    if (combos.length === 0) return res.status(200).json([]);

    const comboIds = combos.map(c => c.ID_Combo).join(",");

    const detallesQuery = `
      SELECT cd.ID_Combo_D, cd.ID_Combo, cd.ID_Producto_T, cd.Cantidad,
             p.Nombre AS Producto_Nombre,
             t.Tamano AS Tamano_Nombre
      FROM Combos_Detalle cd
      INNER JOIN Producto_Tamano pt ON cd.ID_Producto_T = pt.ID_Producto_T
      INNER JOIN Producto p ON pt.ID_Producto = p.ID_Producto
      INNER JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
      WHERE cd.ID_Combo IN (${comboIds})
      ORDER BY cd.ID_Combo, cd.ID_Combo_D
    `;

    const detallesRes = await pool.request().query(detallesQuery);
    const detallesRows = detallesRes.recordset || [];

    const detallesPorCombo = detallesRows.reduce((acc, r) => {
      const id = r.ID_Combo;
      if (!acc[id]) acc[id] = [];
      acc[id].push(mapToComboDetalle(r));
      return acc;
    }, {});

    const resultado = combos.map(c => ({
      ...mapToCombo(c),
      detalles: detallesPorCombo[c.ID_Combo] || []
    }));

    return res.status(200).json(resultado);
  } catch (err) {
    console.error("getCombos error:", err);
    return res.status(500).json({ error: "Error al obtener los combos" });
  }
};

// ==================================================
// 📘 GET /combos/:id - Obtener un combo por ID con detalles
// ==================================================
exports.getComboById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    const comboRes = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Combos WHERE ID_Combo = @id");

    if (!comboRes.recordset.length)
      return res.status(404).json({ error: "Combo no encontrado" });

    const combo = mapToCombo(comboRes.recordset[0]);

    const detallesRes = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT cd.ID_Combo_D, cd.ID_Combo, cd.ID_Producto_T, cd.Cantidad,
               p.Nombre AS Producto_Nombre,
               t.Tamano AS Tamano_Nombre
        FROM Combos_Detalle cd
        INNER JOIN Producto_Tamano pt ON cd.ID_Producto_T = pt.ID_Producto_T
        INNER JOIN Producto p ON pt.ID_Producto = p.ID_Producto
        INNER JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
        WHERE cd.ID_Combo = @id
        ORDER BY cd.ID_Combo_D
      `);

    const detalles = detallesRes.recordset.map(mapToComboDetalle);

    return res.status(200).json({ ...combo, detalles });

  } catch (err) {
    console.error("getComboById error:", err);
    return res.status(500).json({ error: "Error al obtener el combo" });
  }
};

// ==================================================
// 📗 POST /combos - CREAR COMBO CON DETALLES Y MANEJO DE IMÁGENES (CORREGIDO)
// ==================================================
exports.createCombo = async (req, res) => {
  let { ID_Combo, Nombre, Descripcion, Precio, Estado, detalles } = req.body;

  // ✅ CORREGIDO: Parsear detalles si viene como string (desde FormData)
  if (detalles && typeof detalles === 'string') {
    try {
      detalles = JSON.parse(detalles);
      console.log('✅ Detalles parseados desde string:', detalles);
    } catch (parseError) {
      console.error('❌ Error parseando detalles:', parseError);
      return res.status(400).json({ 
        error: "Formato inválido en los detalles del combo" 
      });
    }
  }

  // Validaciones básicas
  if (!Nombre || !Precio) {
    return res.status(400).json({ 
      error: "Faltan campos obligatorios: Nombre y Precio" 
    });
  }

  if (!Array.isArray(detalles) || detalles.length === 0) {
    console.log('❌ Detalles no es array o está vacío:', detalles);
    return res.status(400).json({ 
      error: "Debe incluir al menos un detalle de combo" 
    });
  }

  // Validar cada detalle
  for (const detalle of detalles) {
    if (!detalle.ID_Producto_T || !detalle.Cantidad) {
      console.log('❌ Detalle inválido:', detalle);
      return res.status(400).json({ 
        error: "Cada detalle debe tener ID_Producto_T y Cantidad" 
      });
    }
  }

  console.log('✅ Datos recibidos para crear combo:');
  console.log('- Nombre:', Nombre);
  console.log('- Precio:', Precio);
  console.log('- Estado:', Estado);
  console.log('- Número de detalles:', detalles.length);
  console.log('- Detalles:', detalles);

  let transaction;
  try {
    const pool = await getConnection();
    transaction = new sql.Transaction(pool);
    
    await transaction.begin();

    try {
      // 1. CREAR EL COMBO PRINCIPAL
      const comboResult = await new sql.Request(transaction)
        .input("Nombre", sql.VarChar, Nombre)
        .input("Descripcion", sql.VarChar, Descripcion || "")
        .input("Precio", sql.Decimal(10, 2), Precio)
        .input("Estado", sql.Char(1), Estado || "A")
        .query(`
          INSERT INTO Combos (Nombre, Descripcion, Precio, Estado)
          OUTPUT INSERTED.ID_Combo, INSERTED.Nombre, INSERTED.Descripcion, 
                 INSERTED.Precio, INSERTED.Estado
          VALUES (@Nombre, @Descripcion, @Precio, @Estado)
        `);

      const nuevoCombo = mapToCombo(comboResult.recordset[0]);
      const ID_Combo = nuevoCombo.ID_Combo;

      console.log('✅ Combo creado con ID:', ID_Combo);

      // 2. CREAR LOS DETALLES DEL COMBO
      for (const detalle of detalles) {
        console.log('✅ Insertando detalle:', detalle);
        await new sql.Request(transaction)
          .input("ID_Combo", sql.Int, ID_Combo)
          .input("ID_Producto_T", sql.Int, detalle.ID_Producto_T)
          .input("Cantidad", sql.Int, detalle.Cantidad)
          .query(`
            INSERT INTO Combos_Detalle (ID_Combo, ID_Producto_T, Cantidad)
            VALUES (@ID_Combo, @ID_Producto_T, @Cantidad)
          `);
      }

      console.log('✅ Todos los detalles insertados');

      // 3. MANEJO DE IMÁGENES
      const archivosRenombrados = [];
      if (req.files && req.files.length > 0) {
        console.log('✅ Procesando archivos:', req.files.length);
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const extension = path.extname(file.originalname);
          const nuevoNombre = `combo_${ID_Combo}_${i + 1}${extension}`;
          console.log('✅ Renombrando archivo a:', nuevoNombre);
          fs.renameSync(
            path.join(file.destination, file.filename),
            path.join(file.destination, nuevoNombre)
          );
          archivosRenombrados.push(nuevoNombre);
        }
      }

      // 4. CONFIRMAR LA TRANSACCIÓN
      await transaction.commit();
      console.log('✅ Transacción completada');

      // 5. OBTENER INFORMACIÓN COMPLETA DE LOS DETALLES
      const detallesCompletos = await obtenerDetallesCompletos(ID_Combo, pool);

      // 6. RESPONDER CON EL COMBO COMPLETO CREADO
      return res.status(201).json({
        message: "Combo creado correctamente con sus detalles",
        combo: {
          ...nuevoCombo,
          detalles: detallesCompletos
        },
        archivos_subidos: archivosRenombrados.length,
        nombres_archivos: archivosRenombrados
      });

    } catch (error) {
      // Si algo falla, revertir la transacción
      console.error('❌ Error en transacción:', error);
      if (transaction) {
        await transaction.rollback();
        console.log('✅ Transacción revertida');
      }
      throw error;
    }

  } catch (err) {
    console.error("createCombo error:", err);
    return res.status(500).json({ 
      error: "Error al crear el combo con sus detalles",
      details: err.message 
    });
  }
};

// ==================================================
// 📙 PUT /combos/:id - ACTUALIZAR COMBO, DETALLES E IMÁGENES (CORREGIDO)
// ==================================================
exports.updateCombo = async (req, res) => {
  const { id } = req.params;
  let { Nombre, Descripcion, Precio, Estado, detalles } = req.body;

  // ✅ CORREGIDO: Parsear detalles si viene como string (desde FormData)
  if (detalles && typeof detalles === 'string') {
    try {
      detalles = JSON.parse(detalles);
      console.log('✅ Detalles parseados desde string:', detalles);
    } catch (parseError) {
      console.error('❌ Error parseando detalles:', parseError);
      return res.status(400).json({ 
        error: "Formato inválido en los detalles del combo" 
      });
    }
  }

  let transaction;
  try {
    const pool = await getConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. VERIFICAR QUE EL COMBO EXISTE
      const comboExistente = await transaction.request()
        .input("id", sql.Int, id)
        .query("SELECT ID_Combo FROM Combos WHERE ID_Combo = @id");

      if (!comboExistente.recordset.length) {
        await transaction.rollback();
        return res.status(404).json({ error: "Combo no encontrado" });
      }

      // 2. ACTUALIZAR EL COMBO
      const updateParts = [];
      const requestUpdate = transaction.request().input("id", sql.Int, id);

      if (Nombre !== undefined) {
        updateParts.push("Nombre = @Nombre");
        requestUpdate.input("Nombre", sql.VarChar, Nombre);
      }
      if (Descripcion !== undefined) {
        updateParts.push("Descripcion = @Descripcion");
        requestUpdate.input("Descripcion", sql.VarChar, Descripcion);
      }
      if (Precio !== undefined) {
        updateParts.push("Precio = @Precio");
        requestUpdate.input("Precio", sql.Decimal(10, 2), Precio);
      }
      if (Estado !== undefined) {
        updateParts.push("Estado = @Estado");
        requestUpdate.input("Estado", sql.Char(1), Estado);
      }

      if (updateParts.length > 0) {
        await requestUpdate.query(`
          UPDATE Combos 
          SET ${updateParts.join(", ")} 
          WHERE ID_Combo = @id
        `);
      }

      // 3. ACTUALIZAR DETALLES (si se proporcionan)
      if (Array.isArray(detalles)) {
        // Validar detalles
        for (const detalle of detalles) {
          if (!detalle.ID_Producto_T || detalle.Cantidad == null) {
            await transaction.rollback();
            return res.status(400).json({ 
              error: "Cada detalle debe tener ID_Producto_T y Cantidad" 
            });
          }
        }

        // Eliminar detalles existentes
        await transaction.request()
          .input("id", sql.Int, id)
          .query("DELETE FROM Combos_Detalle WHERE ID_Combo = @id");

        // Insertar nuevos detalles
        for (const detalle of detalles) {
          await transaction.request()
            .input("ID_Combo", sql.Int, id)
            .input("ID_Producto_T", sql.Int, detalle.ID_Producto_T)
            .input("Cantidad", sql.Int, detalle.Cantidad)
            .query(`
              INSERT INTO Combos_Detalle (ID_Combo, ID_Producto_T, Cantidad)
              VALUES (@ID_Combo, @ID_Producto_T, @Cantidad)
            `);
        }
      }

      // 4. MANEJO DE IMÁGENES
      const archivosRenombrados = [];
      if (req.files && req.files.length > 0) {
        // Eliminar imágenes antiguas antes de subir nuevas
        eliminarImagenesCombo(id);
        
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const extension = path.extname(file.originalname);
          const nuevoNombre = `combo_${id}_${i + 1}${extension}`;
          fs.renameSync(
            path.join(file.destination, file.filename),
            path.join(file.destination, nuevoNombre)
          );
          archivosRenombrados.push(nuevoNombre);
        }
      }

      await transaction.commit();

      // 5. OBTENER EL COMBO ACTUALIZADO
      const comboActualizadoRes = await pool.request()
        .input("id", sql.Int, id)
        .query("SELECT * FROM Combos WHERE ID_Combo = @id");

      const detallesActualizados = await obtenerDetallesCompletos(id, pool);

      const comboActualizado = {
        ...mapToCombo(comboActualizadoRes.recordset[0]),
        detalles: detallesActualizados
      };

      return res.status(200).json({
        message: "Combo actualizado correctamente",
        combo: comboActualizado,
        archivos_subidos: archivosRenombrados.length,
        nombres_archivos: archivosRenombrados
      });

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }

  } catch (err) {
    console.error("updateCombo error:", err);
    return res.status(500).json({ 
      error: "Error al actualizar el combo",
      details: err.message 
    });
  }
};

// ==================================================
// 📕 DELETE /combos/:id - ELIMINAR COMBO E IMÁGENES
// ==================================================
exports.deleteCombo = async (req, res) => {
  const { id } = req.params;
  let transaction;
  
  try {
    const pool = await getConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. ELIMINAR IMÁGENES ASOCIADAS
      eliminarImagenesCombo(id);

      // 2. ELIMINAR DETALLES PRIMERO (por las claves foráneas)
      await transaction.request()
        .input("id", sql.Int, id)
        .query("DELETE FROM Combos_Detalle WHERE ID_Combo = @id");

      // 3. ELIMINAR EL COMBO
      const result = await transaction.request()
        .input("id", sql.Int, id)
        .query("DELETE FROM Combos WHERE ID_Combo = @id");

      if (result.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: "Combo no encontrado" });
      }

      await transaction.commit();
      
      return res.status(200).json({ 
        message: "Combo, sus detalles e imágenes eliminados correctamente",
        ID_Combo: parseInt(id)
      });

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }

  } catch (err) {
    console.error("deleteCombo error:", err);
    return res.status(500).json({ 
      error: "Error al eliminar el combo",
      details: err.message 
    });
  }
};

// ==================================================
// 🔧 FUNCIÓN AUXILIAR - Obtener detalles completos
// ==================================================
async function obtenerDetallesCompletos(ID_Combo, pool) {
  const detallesRes = await pool.request()
    .input("ID_Combo", sql.Int, ID_Combo)
    .query(`
      SELECT cd.ID_Combo_D, cd.ID_Combo, cd.ID_Producto_T, cd.Cantidad,
             p.Nombre AS Producto_Nombre,
             t.Tamano AS Tamano_Nombre
      FROM Combos_Detalle cd
      INNER JOIN Producto_Tamano pt ON cd.ID_Producto_T = pt.ID_Producto_T
      INNER JOIN Producto p ON pt.ID_Producto = p.ID_Producto
      INNER JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
      WHERE cd.ID_Combo = @ID_Combo
      ORDER BY cd.ID_Combo_D
    `);

  return detallesRes.recordset.map(mapToComboDetalle);
}

// ==================================================
// 🔄 PATCH /combos/:id/status - CAMBIAR ESTADO DEL COMBO (A/I)
// ==================================================
exports.statusCombo = async (req, res) => {
  const { id } = req.params;
  const { Estado } = req.body;

  // Validar que el estado sea válido
  if (!Estado || (Estado !== 'A' && Estado !== 'I')) {
    return res.status(400).json({ 
      error: "Estado inválido. Debe ser 'A' (Activo) o 'I' (Inactivo)" 
    });
  }

  try {
    const pool = await getConnection();

    // Verificar que el combo existe
    const comboExistente = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT ID_Combo, Estado FROM Combos WHERE ID_Combo = @id");

    if (!comboExistente.recordset.length) {
      return res.status(404).json({ error: "Combo no encontrado" });
    }

    // Actualizar solo el estado
    await pool.request()
      .input("id", sql.Int, id)
      .input("Estado", sql.Char(1), Estado)
      .query("UPDATE Combos SET Estado = @Estado WHERE ID_Combo = @id");

    const estadoTexto = Estado === 'A' ? 'activado' : 'desactivado';
    
    return res.status(200).json({ 
      message: `Combo ${estadoTexto} correctamente`,
      ID_Combo: parseInt(id),
      Estado: Estado,
      Estado_Texto: Estado === 'A' ? 'Activo' : 'Inactivo'
    });

  } catch (err) {
    console.error("statusCombo error:", err);
    return res.status(500).json({ 
      error: "Error al cambiar el estado del combo",
      details: err.message 
    });
  }
};