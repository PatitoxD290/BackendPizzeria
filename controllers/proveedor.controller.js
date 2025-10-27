const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Proveedor
// ==============================
function mapToProveedor(row = {}) {
  const template = bdModel?.Proveedor || {
    ID_Proveedor: 0,
    Nombre: "",
    Ruc: "",
    Direccion: "",
    Telefono: "",
    Email: "",
    Persona_Contacto: "",
    Estado: "A",
    Fecha_Registro: ""
  };

  return {
    ...template,
    ID_Proveedor: row.ID_Proveedor ?? template.ID_Proveedor,
    Nombre: row.Nombre ?? template.Nombre,
    Ruc: row.Ruc ?? template.Ruc,
    Direccion: row.Direccion ?? template.Direccion,
    Telefono: row.Telefono ?? template.Telefono,
    Email: row.Email ?? template.Email,
    Persona_Contacto: row.Persona_Contacto ?? template.Persona_Contacto,
    Estado: row.Estado ?? template.Estado,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro
  };
}

// ==============================
// 📘 Obtener todos los proveedores
// ==============================
exports.getProveedores = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Proveedor ORDER BY Fecha_Registro DESC");
    const proveedores = (result.recordset || []).map(mapToProveedor);
    return res.status(200).json(proveedores);
  } catch (err) {
    console.error("getProveedores error:", err);
    return res.status(500).json({ error: "Error al obtener los proveedores" });
  }
};

// ==============================
// 📘 Obtener un proveedor por ID
// ==============================
exports.getProveedorById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Proveedor WHERE ID_Proveedor = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    return res.status(200).json(mapToProveedor(result.recordset[0]));
  } catch (err) {
    console.error("getProveedorById error:", err);
    return res.status(500).json({ error: "Error al obtener el proveedor" });
  }
};

// ==============================
// 📗 Crear un nuevo proveedor
// ==============================
exports.createProveedor = async (req, res) => {
  const {
    Nombre,
    Ruc,
    Direccion,
    Telefono,
    Email,
    Persona_Contacto,
    Estado
  } = req.body;

  try {
    if (!Nombre || !Ruc) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: Nombre y Ruc"
      });
    }

    const pool = await getConnection();

    const request = pool.request()
      .input("Nombre", sql.VarChar(150), Nombre)
      .input("Ruc", sql.VarChar(20), Ruc)
      .input("Direccion", sql.VarChar(200), Direccion || null)
      .input("Telefono", sql.VarChar(20), Telefono || null)
      .input("Email", sql.VarChar(100), Email || null)
      .input("Persona_Contacto", sql.VarChar(100), Persona_Contacto || null)
      .input("Estado", sql.Char(1), (Estado || "A"))
      .input("Fecha_Registro", sql.DateTime, new Date());

    const result = await request.query(`
      INSERT INTO Proveedor (
        Nombre, Ruc, Direccion, Telefono,
        Email, Persona_Contacto, Estado, Fecha_Registro
      )
      OUTPUT INSERTED.ID_Proveedor
      VALUES (
        @Nombre, @Ruc, @Direccion, @Telefono,
        @Email, @Persona_Contacto, @Estado, @Fecha_Registro
      )
    `);

    const nuevoId = result.recordset && result.recordset[0] ? result.recordset[0].ID_Proveedor : null;

    return res.status(201).json({
      message: "Proveedor registrado correctamente",
      ID_Proveedor: nuevoId
    });
  } catch (err) {
    console.error("createProveedor error:", err);
    return res.status(500).json({ error: "Error al registrar el proveedor" });
  }
};

// ==============================
// 📙 Actualizar un proveedor
// ==============================
exports.updateProveedor = async (req, res) => {
  const { id } = req.params;
  const {
    Nombre,
    Ruc,
    Direccion,
    Telefono,
    Email,
    Persona_Contacto,
    Estado
  } = req.body;

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    let query = "UPDATE Proveedor SET";
    let hasUpdates = false;

    if (Nombre !== undefined) {
      query += " Nombre = @Nombre,";
      request.input("Nombre", sql.VarChar(150), Nombre);
      hasUpdates = true;
    }

    if (Ruc !== undefined) {
      query += " Ruc = @Ruc,";
      request.input("Ruc", sql.VarChar(20), Ruc);
      hasUpdates = true;
    }

    if (Direccion !== undefined) {
      query += " Direccion = @Direccion,";
      request.input("Direccion", sql.VarChar(200), Direccion);
      hasUpdates = true;
    }

    if (Telefono !== undefined) {
      query += " Telefono = @Telefono,";
      request.input("Telefono", sql.VarChar(20), Telefono);
      hasUpdates = true;
    }

    if (Email !== undefined) {
      query += " Email = @Email,";
      request.input("Email", sql.VarChar(100), Email);
      hasUpdates = true;
    }

    if (Persona_Contacto !== undefined) {
      query += " Persona_Contacto = @Persona_Contacto,";
      request.input("Persona_Contacto", sql.VarChar(100), Persona_Contacto);
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

    // Eliminar la última coma
    query = query.slice(0, -1);
    query += " WHERE ID_Proveedor = @id";

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    return res.status(200).json({ message: "Proveedor actualizado correctamente" });

  } catch (err) {
    console.error("updateProveedor error:", err);
    return res.status(500).json({ error: "Error al actualizar el proveedor" });
  }
};

// ==============================
// 📕 Eliminar un proveedor
// ==============================
exports.deleteProveedor = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Proveedor WHERE ID_Proveedor = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    return res.status(200).json({ message: "Proveedor eliminado correctamente" });
  } catch (err) {
    console.error("deleteProveedor error:", err);
    return res.status(500).json({ error: "Error al eliminar el proveedor" });
  }
};
