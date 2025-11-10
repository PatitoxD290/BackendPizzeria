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

// Mapper ComboDetalle (solo para mostrar)
function mapToComboDetalle(row = {}) {
  return {
    Producto_Nombre: row.Producto_Nombre || null,
    Tamano_Nombre: row.Tamano_Nombre || null,
    Cantidad: row.Cantidad ?? 1
  };
}

// ==================================================
// GET /combos
// ==================================================
exports.getCombos = async (_req, res) => {
  try {
    const pool = await getConnection();

    const combosRes = await pool.request().query("SELECT * FROM Combos ORDER BY ID_Combo DESC");
    const combos = combosRes.recordset || [];

    if (combos.length === 0) return res.status(200).json([]);

    const comboIds = combos.map(c => c.ID_Combo).join(",");

    const detallesQuery = `
      SELECT cd.ID_Combo, cd.Cantidad,
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
// GET /combos/:id
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
        SELECT cd.Cantidad,
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

    return res.status(200).json({ combo, detalles });
  } catch (err) {
    console.error("getComboById error:", err);
    return res.status(500).json({ error: "Error al obtener el combo" });
  }
};

// ==================================================
// POST /combos
// ==================================================
exports.createComboConDetalle = async (req, res) => {
  const { Nombre, Descripcion, Precio, Estado, detalles } = req.body;

  if (!Nombre || Precio == null)
    return res.status(400).json({ error: "Faltan campos obligatorios: Nombre o Precio" });

  if (!Array.isArray(detalles) || detalles.length === 0)
    return res.status(400).json({ error: "Debe enviar detalles de combo" });

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const insertRes = await new sql.Request(transaction)
      .input("Nombre", sql.VarChar, Nombre)
      .input("Descripcion", sql.VarChar, Descripcion || "")
      .input("Precio", sql.Decimal(10,2), Precio)
      .input("Estado", sql.Char(1), Estado || "A")
      .query(`
        INSERT INTO Combos (Nombre, Descripcion, Precio, Estado)
        OUTPUT INSERTED.ID_Combo
        VALUES (@Nombre, @Descripcion, @Precio, @Estado)
      `);

    const newID = insertRes.recordset[0].ID_Combo;

    for (const d of detalles) {
      if (!d.ID_Producto_T || d.Cantidad == null) {
        await transaction.rollback();
        return res.status(400).json({ error: "Cada detalle debe tener ID_Producto_T y Cantidad" });
      }

      await new sql.Request(transaction)
        .input("ID_Combo", sql.Int, newID)
        .input("ID_Producto_T", sql.Int, d.ID_Producto_T)
        .input("Cantidad", sql.Int, d.Cantidad)
        .query(`
          INSERT INTO Combos_Detalle (ID_Combo, ID_Producto_T, Cantidad)
          VALUES (@ID_Combo, @ID_Producto_T, @Cantidad)
        `);
    }

    await transaction.commit();
    return res.status(201).json({ message: "Combo creado correctamente", ID_Combo: newID });

  } catch (err) {
    console.error("createComboConDetalle error:", err);
    return res.status(500).json({ error: "Error al crear combo" });
  }
};

// ==================================================
// PUT /combos/:id
// ==================================================
exports.updateCombo = async (req, res) => {
  const { id } = req.params;
  const { Nombre, Descripcion, Precio, Estado, detalles } = req.body;

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const existRes = await transaction.request()
      .input("id", sql.Int, id)
      .query("SELECT ID_Combo FROM Combos WHERE ID_Combo = @id");

    if (!existRes.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({ error: "Combo no encontrado" });
    }

    const reqUpd = transaction.request().input("id", sql.Int, id);
    const updateParts = [];

    if (Nombre !== undefined) { updateParts.push("Nombre = @Nombre"); reqUpd.input("Nombre", sql.VarChar, Nombre); }
    if (Descripcion !== undefined) { updateParts.push("Descripcion = @Descripcion"); reqUpd.input("Descripcion", sql.VarChar, Descripcion); }
    if (Precio !== undefined) { updateParts.push("Precio = @Precio"); reqUpd.input("Precio", sql.Decimal(10,2), Precio); }
    if (Estado !== undefined) { updateParts.push("Estado = @Estado"); reqUpd.input("Estado", sql.Char(1), Estado); }

    if (updateParts.length > 0)
      await reqUpd.query(`UPDATE Combos SET ${updateParts.join(", ")} WHERE ID_Combo = @id`);

    if (Array.isArray(detalles)) {
      await transaction.request().input("id", sql.Int, id).query("DELETE FROM Combos_Detalle WHERE ID_Combo = @id");

      for (const d of detalles) {
        if (!d.ID_Producto_T || d.Cantidad == null) {
          await transaction.rollback();
          return res.status(400).json({ error: "Cada detalle debe tener ID_Producto_T y Cantidad" });
        }

        await transaction.request()
          .input("ID_Combo", sql.Int, id)
          .input("ID_Producto_T", sql.Int, d.ID_Producto_T)
          .input("Cantidad", sql.Int, d.Cantidad)
          .query(`
            INSERT INTO Combos_Detalle (ID_Combo, ID_Producto_T, Cantidad)
            VALUES (@ID_Combo, @ID_Producto_T, @Cantidad)
          `);
      }
    }

    await transaction.commit();
    return res.status(200).json({ message: "Combo actualizado correctamente" });

  } catch (err) {
    console.error("updateCombo error:", err);
    return res.status(500).json({ error: "Error al actualizar combo" });
  }
};

// ==================================================
// DELETE /combos/:id
// ==================================================
exports.deleteCombo = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    await transaction.request().input("id", sql.Int, id).query("DELETE FROM Combos_Detalle WHERE ID_Combo = @id");
    const delRes = await transaction.request().input("id", sql.Int, id).query("DELETE FROM Combos WHERE ID_Combo = @id");

    if (delRes.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: "Combo no encontrado" });
    }

    await transaction.commit();
    return res.status(200).json({ message: "Combo eliminado correctamente" });

  } catch (err) {
    console.error("deleteCombo error:", err);
    return res.status(500).json({ error: "Error al eliminar combo" });
  }
};
