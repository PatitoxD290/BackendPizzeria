const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// Mapper Delivery (respeta bd.models.js)
function mapToDelivery(row = {}) {
  const template = bdModel?.Delivery || {
    ID_Delivery: 0,
    ID_Pedido: 0,
    Direccion: "",
    Estado_D: "P" // P=Pendiente, E=Entregado, C=Cancelado
  };

  return {
    ...template,
    ID_Delivery: row.ID_Delivery ?? template.ID_Delivery,
    ID_Pedido: row.ID_Pedido ?? template.ID_Pedido,
    Direccion: row.Direccion ?? template.Direccion,
    Estado_D: row.Estado_D ?? template.Estado_D
  };
}

// Obtener todos los registros de delivery
exports.getDeliveries = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query("SELECT * FROM Delivery ORDER BY ID_Delivery DESC");

    const items = (result.recordset || []).map(mapToDelivery);
    return res.status(200).json(items);
  } catch (err) {
    console.error("getDeliveries error:", err);
    return res.status(500).json({ error: "Error al obtener los deliveries" });
  }
};

// Obtener un delivery por ID
exports.getDeliveryById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Delivery WHERE ID_Delivery = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Delivery no encontrado" });
    }

    return res.status(200).json(mapToDelivery(result.recordset[0]));
  } catch (err) {
    console.error("getDeliveryById error:", err);
    return res.status(500).json({ error: "Error al obtener el delivery" });
  }
};

// Crear un nuevo delivery
exports.createDelivery = async (req, res) => {
  const { ID_Pedido, Direccion, Estado_D } = req.body;

  try {
    if (!ID_Pedido || !Direccion) {
      return res.status(400).json({ error: "Faltan campos obligatorios: ID_Pedido o Direccion" });
    }

    const pool = await getConnection();

    await pool.request()
      .input("ID_Pedido", sql.Int, ID_Pedido)
      .input("Direccion", sql.VarChar(sql.MAX,  -1) /* fallback: large text */, Direccion)
      .input("Estado_D", sql.Char(1), Estado_D || "P")
      .query(`
        INSERT INTO Delivery (ID_Pedido, Direccion, Estado_D)
        VALUES (@ID_Pedido, @Direccion, @Estado_D)
      `);

    return res.status(201).json({ message: "Delivery registrado correctamente" });
  } catch (err) {
    console.error("createDelivery error:", err);
    return res.status(500).json({ error: "Error al registrar el delivery" });
  }
};

// Actualizar delivery (solo Direccion y/o Estado_D)
exports.updateDelivery = async (req, res) => {
  const { id } = req.params;
  const { Direccion, Estado_D } = req.body;

  try {
    // Validación: al menos uno de los dos campos debe venir
    if (Direccion === undefined && Estado_D === undefined) {
      return res.status(400).json({ error: "Debe enviar Direccion y/o Estado_D para actualizar" });
    }

    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    const updates = [];
    if (Direccion !== undefined) {
      // usar VarChar grande para Direccion (tu DDL es TEXT)
      request.input("Direccion", sql.VarChar(sql.MAX,  -1), Direccion);
      updates.push("Direccion = @Direccion");
    }
    if (Estado_D !== undefined) {
      request.input("Estado_D", sql.Char(1), Estado_D);
      updates.push("Estado_D = @Estado_D");
    }

    const query = `UPDATE Delivery SET ${updates.join(", ")} WHERE ID_Delivery = @id`;
    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Delivery no encontrado" });
    }

    return res.status(200).json({ message: "Delivery actualizado correctamente" });
  } catch (err) {
    console.error("updateDelivery error:", err);
    return res.status(500).json({ error: "Error al actualizar el delivery" });
  }
};
