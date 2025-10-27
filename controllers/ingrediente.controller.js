const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Insumo
// ==============================
function mapToInsumo(row = {}) {
  const template = bdModel?.Insumo || {
    ID_Insumo: 0,
    Nombre: "",
    Descripcion: "",
    Unidad_Med: "",
    ID_Categoria_I: 0,
    Stock_Min: 0,
    Stock_Max: 0,
    Estado: "D",
    Fecha_Registro: ""
  };

  return {
    ...template,
    ID_Insumo: row.ID_Insumo ?? template.ID_Insumo,
    Nombre: row.Nombre ?? template.Nombre,
    Descripcion: row.Descripcion ?? template.Descripcion,
    Unidad_Med: row.Unidad_Med ?? template.Unidad_Med,
    ID_Categoria_I: row.ID_Categoria_I ?? template.ID_Categoria_I,
    Stock_Min: row.Stock_Min ?? template.Stock_Min,
    Stock_Max: row.Stock_Max ?? template.Stock_Max,
    Estado: row.Estado ?? template.Estado,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro
  };
}

// ==============================
// 📘 Obtener todos los insumos
// ==============================
exports.getInsumos = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Insumos ORDER BY Nombre ASC");
    const insumos = (result.recordset || []).map(mapToInsumo);
    return res.status(200).json(insumos);
  } catch (err) {
    console.error("getInsumos error:", err);
    return res.status(500).json({ error: "Error al obtener los insumos" });
  }
};

// ==============================
// 📘 Obtener un insumo por ID
// ==============================
exports.getInsumoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Insumos WHERE ID_Insumo = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    return res.status(200).json(mapToInsumo(result.recordset[0]));
  } catch (err) {
    console.error("getInsumoById error:", err);
    return res.status(500).json({ error: "Error al obtener el insumo" });
  }
};

// ==============================
// 📗 Crear un nuevo insumo
// ==============================
exports.createInsumo = async (req, res) => {
  const {
    Nombre,
    Descripcion,
    Unidad_Med,
    ID_Categoria_I,
    Stock_Min,
    Stock_Max,
    Estado
  } = req.body;

  try {
    // validar campos obligatorios según tu DDL
    if (!Nombre || !Unidad_Med || ID_Categoria_I == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: Nombre, Unidad_Med o ID_Categoria_I"
      });
    }

    const pool = await getConnection();

    const request = pool.request()
      .input("Nombre", sql.VarChar(100), Nombre)
      .input("Descripcion", sql.VarChar(255), Descripcion || "")
      .input("Unidad_Med", sql.VarChar(50), Unidad_Med)
      .input("ID_Categoria_I", sql.Int, ID_Categoria_I)
      .input("Stock_Min", sql.Int, (Stock_Min ?? 0))
      .input("Stock_Max", sql.Int, (Stock_Max ?? 0))
      .input("Estado", sql.Char(1), (Estado || "D"))
      .input("Fecha_Registro", sql.DateTime, new Date());

    await request.query(`
      INSERT INTO Insumos (
        Nombre, Descripcion, Unidad_Med,
        ID_Categoria_I, Stock_Min, Stock_Max, Estado, Fecha_Registro
      ) VALUES (
        @Nombre, @Descripcion, @Unidad_Med,
        @ID_Categoria_I, @Stock_Min, @Stock_Max, @Estado, @Fecha_Registro
      )
    `);

    return res.status(201).json({ message: "Insumo registrado correctamente" });
  } catch (err) {
    console.error("createInsumo error:", err);
    return res.status(500).json({ error: "Error al registrar el insumo" });
  }
};

// ==============================
// 📙 Actualizar un insumo
// ==============================
exports.updateInsumo = async (req, res) => {
  const { id } = req.params;
  const {
    Nombre,
    Descripcion,
    Unidad_Med,
    ID_Categoria_I,
    Stock_Min,
    Stock_Max,
    Estado
  } = req.body;

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    let query = "UPDATE Insumos SET";
    let hasUpdates = false;

    if (Nombre !== undefined) {
      query += " Nombre = @Nombre,";
      request.input("Nombre", sql.VarChar(100), Nombre);
      hasUpdates = true;
    }

    if (Descripcion !== undefined) {
      query += " Descripcion = @Descripcion,";
      request.input("Descripcion", sql.VarChar(255), Descripcion);
      hasUpdates = true;
    }

    if (Unidad_Med !== undefined) {
      query += " Unidad_Med = @Unidad_Med,";
      request.input("Unidad_Med", sql.VarChar(50), Unidad_Med);
      hasUpdates = true;
    }

    if (ID_Categoria_I !== undefined) {
      query += " ID_Categoria_I = @ID_Categoria_I,";
      request.input("ID_Categoria_I", sql.Int, ID_Categoria_I);
      hasUpdates = true;
    }

    if (Stock_Min !== undefined) {
      query += " Stock_Min = @Stock_Min,";
      request.input("Stock_Min", sql.Int, Stock_Min);
      hasUpdates = true;
    }

    if (Stock_Max !== undefined) {
      query += " Stock_Max = @Stock_Max,";
      request.input("Stock_Max", sql.Int, Stock_Max);
      hasUpdates = true;
    }

    if (Estado !== undefined) {
      query += " Estado = @Estado,";
      request.input("Estado", sql.Char(1), Estado);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    // quitar coma final y agregar WHERE
    query = query.slice(0, -1);
    query += " WHERE ID_Insumo = @id";

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    return res.status(200).json({ message: "Insumo actualizado correctamente" });
  } catch (err) {
    console.error("updateInsumo error:", err);
    return res.status(500).json({ error: "Error al actualizar el insumo" });
  }
};

// ==============================
// 📕 Eliminar un insumo
// ==============================
exports.deleteInsumo = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Insumos WHERE ID_Insumo = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    return res.status(200).json({ message: "Insumo eliminado correctamente" });
  } catch (err) {
    console.error("deleteInsumo error:", err);
    return res.status(500).json({ error: "Error al eliminar el insumo" });
  }
};
