const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// Mapper Combo
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

// Mapper ComboDetalle (internal use)
function mapToComboDetalle(row = {}) {
  return {
    Producto_Nombre: row.Producto_Nombre || null,
    Tamano_Nombre: row.Tamano_Nombre || null,
    Cantidad: row.Cantidad ?? 1
  };
}

// ==================================================
// GET /combos
// Devuelve lista de combos, cada uno con su array
// de detalles: { Producto_Nombre, Tamano_Nombre, Cantidad }
// ==================================================
exports.getCombos = async (_req, res) => {
  try {
    const pool = await getConnection();

    // 1) Obtener todos los combos
    const combosRes = await pool.request().query("SELECT * FROM Combos ORDER BY ID_Combo DESC");
    const combos = combosRes.recordset || [];

    if (combos.length === 0) {
      return res.status(200).json([]);
    }

    // 2) Obtener todos los detalles para los combos obtenidos (optimizado)
    const comboIds = combos.map(c => c.ID_Combo).join(",");
    const detallesQuery = `
      SELECT cd.ID_Combo, cd.Cantidad,
             p.Nombre AS Producto_Nombre,
             t.Tamano AS Tamano_Nombre
      FROM Combos_Detalle cd
      LEFT JOIN Producto p ON cd.ID_Producto = p.ID_Producto
      LEFT JOIN Tamano t ON cd.ID_Tamano = t.ID_Tamano
      WHERE cd.ID_Combo IN (${comboIds})
      ORDER BY cd.ID_Combo, cd.ID_Combo_D
    `;

    const detallesRes = await pool.request().query(detallesQuery);
    const detallesRows = detallesRes.recordset || [];

    // 3) Agrupar detalles por ID_Combo
    const detallesPorCombo = detallesRows.reduce((acc, r) => {
      const id = r.ID_Combo;
      if (!acc[id]) acc[id] = [];
      acc[id].push(mapToComboDetalle(r));
      return acc;
    }, {});

    // 4) Construir lista final: combo + detalles (sin ids)
    const resultado = combos.map(c => {
      const combo = mapToCombo(c);
      return {
        ...combo,
        detalles: detallesPorCombo[c.ID_Combo] || []
      };
    });

    return res.status(200).json(resultado);
  } catch (err) {
    console.error("getCombos error:", err);
    return res.status(500).json({ error: "Error al obtener los combos" });
  }
};

// ==================================================
// GET /combos/:id  (queda igual que antes, retorna combo + detalles)
// ==================================================
exports.getComboById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();

    // Obtener combo
    const comboRes = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Combos WHERE ID_Combo = @id");

    if (!comboRes.recordset.length) {
      return res.status(404).json({ error: "Combo no encontrado" });
    }

    const combo = mapToCombo(comboRes.recordset[0]);

    // Obtener detalles con LEFT JOIN a producto y tamano para nombres
    const detallesRes = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT cd.*, p.Nombre AS Producto_Nombre, t.Tamano AS Tamano_Nombre
        FROM Combos_Detalle cd
        LEFT JOIN Producto p ON cd.ID_Producto = p.ID_Producto
        LEFT JOIN Tamano t ON cd.ID_Tamano = t.ID_Tamano
        WHERE cd.ID_Combo = @id
        ORDER BY cd.ID_Combo_D
      `);

    const detalles = (detallesRes.recordset || []).map(r => mapToComboDetalle(r));

    return res.status(200).json({ combo, detalles });
  } catch (err) {
    console.error("getComboById error:", err);
    return res.status(500).json({ error: "Error al obtener el combo" });
  }
};

// ==================================================
// POST /combos  (crea combo + detalles) - igual que antes
// ==================================================
exports.createComboConDetalle = async (req, res) => {
  const { Nombre, Descripcion, Precio, Estado, detalles } = req.body;
  try {
    if (!Nombre || Precio == null) {
      return res.status(400).json({ error: "Faltan campos obligatorios: Nombre o Precio" });
    }
    if (!Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ error: "Debe enviar al menos un detalle para el combo" });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const reqIns = new sql.Request(transaction);
      const insertRes = await reqIns
        .input("Nombre", sql.VarChar(100), Nombre)
        .input("Descripcion", sql.VarChar(255), Descripcion || "")
        .input("Precio", sql.Decimal(10, 2), Precio)
        .input("Estado", sql.Char(1), Estado || "A")
        .query(`
          INSERT INTO Combos (Nombre, Descripcion, Precio, Estado)
          OUTPUT INSERTED.ID_Combo
          VALUES (@Nombre, @Descripcion, @Precio, @Estado)
        `);

      const newComboId = insertRes.recordset && insertRes.recordset[0] ? insertRes.recordset[0].ID_Combo : null;
      if (!newComboId) {
        await transaction.rollback();
        return res.status(500).json({ error: "No se pudo obtener el ID del combo creado" });
      }

      for (const d of detalles) {
        const { ID_Producto, ID_Tamano, Cantidad } = d;
        if (!ID_Producto || Cantidad == null) {
          await transaction.rollback();
          return res.status(400).json({ error: "Cada detalle debe tener ID_Producto y Cantidad" });
        }

        const reqDet = new sql.Request(transaction);
        await reqDet
          .input("ID_Combo", sql.Int, newComboId)
          .input("ID_Producto", sql.Int, ID_Producto)
          .input("ID_Tamano", sql.Int, ID_Tamano || null)
          .input("Cantidad", sql.Int, Cantidad)
          .query(`
            INSERT INTO Combos_Detalle (ID_Combo, ID_Producto, ID_Tamano, Cantidad)
            VALUES (@ID_Combo, @ID_Producto, @ID_Tamano, @Cantidad)
          `);
      }

      await transaction.commit();
      return res.status(201).json({ message: "Combo y detalles registrados correctamente", ID_Combo: newComboId });
    } catch (err) {
      await transaction.rollback();
      console.error("createComboConDetalle transaction error:", err);
      return res.status(500).json({ error: "Error al crear combo con detalles" });
    }
  } catch (err) {
    console.error("createComboConDetalle error:", err);
    return res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};

// ==================================================
// PUT /combos/:id  (actualiza combo y opcionalmente reemplaza detalles)
// ==================================================
exports.updateCombo = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Descripcion, Precio, Estado, detalles } = req.body;

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const existRes = await transaction.request()
        .input("id", sql.Int, id)
        .query("SELECT ID_Combo FROM Combos WHERE ID_Combo = @id");

      if (!existRes.recordset.length) {
        await transaction.rollback();
        return res.status(404).json({ error: "Combo no encontrado" });
      }

      const updateParts = [];
      const reqUpd = transaction.request();
      reqUpd.input("id", sql.Int, id);

      if (Nombre !== undefined) { updateParts.push("Nombre = @Nombre"); reqUpd.input("Nombre", sql.VarChar(100), Nombre); }
      if (Descripcion !== undefined) { updateParts.push("Descripcion = @Descripcion"); reqUpd.input("Descripcion", sql.VarChar(255), Descripcion); }
      if (Precio !== undefined) { updateParts.push("Precio = @Precio"); reqUpd.input("Precio", sql.Decimal(10,2), Precio); }
      if (Estado !== undefined) { updateParts.push("Estado = @Estado"); reqUpd.input("Estado", sql.Char(1), Estado); }

      if (updateParts.length > 0) {
        const queryUpd = `UPDATE Combos SET ${updateParts.join(", ")} WHERE ID_Combo = @id`;
        await reqUpd.query(queryUpd);
      }

      if (Array.isArray(detalles)) {
        await transaction.request()
          .input("id", sql.Int, id)
          .query("DELETE FROM Combos_Detalle WHERE ID_Combo = @id");

        for (const d of detalles) {
          const { ID_Producto, ID_Tamano, Cantidad } = d;
          if (!ID_Producto || Cantidad == null) {
            await transaction.rollback();
            return res.status(400).json({ error: "Cada detalle debe tener ID_Producto y Cantidad" });
          }

          const reqDet = new sql.Request(transaction);
          await reqDet
            .input("ID_Combo", sql.Int, id)
            .input("ID_Producto", sql.Int, ID_Producto)
            .input("ID_Tamano", sql.Int, ID_Tamano || null)
            .input("Cantidad", sql.Int, Cantidad)
            .query(`
              INSERT INTO Combos_Detalle (ID_Combo, ID_Producto, ID_Tamano, Cantidad)
              VALUES (@ID_Combo, @ID_Producto, @ID_Tamano, @Cantidad)
            `);
        }
      }

      await transaction.commit();
      return res.status(200).json({ message: "Combo actualizado correctamente" });
    } catch (err) {
      await transaction.rollback();
      console.error("updateCombo transaction error:", err);
      return res.status(500).json({ error: "Error al actualizar el combo" });
    }
  } catch (err) {
    console.error("updateCombo error:", err);
    return res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};

// ==================================================
// DELETE /combos/:id  (elimina combo y detalles)
// ==================================================
exports.deleteCombo = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input("id", sql.Int, id)
        .query("DELETE FROM Combos_Detalle WHERE ID_Combo = @id");

      const delRes = await transaction.request()
        .input("id", sql.Int, id)
        .query("DELETE FROM Combos WHERE ID_Combo = @id");

      if (delRes.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: "Combo no encontrado" });
      }

      await transaction.commit();
      return res.status(200).json({ message: "Combo y detalles eliminados correctamente" });
    } catch (err) {
      await transaction.rollback();
      console.error("deleteCombo transaction error:", err);
      return res.status(500).json({ error: "Error al eliminar el combo" });
    }
  } catch (err) {
    console.error("deleteCombo error:", err);
    return res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};
