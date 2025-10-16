const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Proveedor
// ==============================
function mapToProveedor(row = {}) {
  const template = bdModel?.Proveedor || {
    proveedor_id: 0,
    nombre_proveedor: "",
    ruc: "",
    direccion: "",
    telefono: "",
    email: "",
    persona_contacto: "",
    estado: "A",
    fecha_registro: ""
  };

  return {
    ...template,
    proveedor_id: row.proveedor_id ?? template.proveedor_id,
    nombre_proveedor: row.nombre_proveedor ?? template.nombre_proveedor,
    ruc: row.ruc ?? template.ruc,
    direccion: row.direccion ?? template.direccion,
    telefono: row.telefono ?? template.telefono,
    email: row.email ?? template.email,
    persona_contacto: row.persona_contacto ?? template.persona_contacto,
    estado: row.estado ?? template.estado,
    fecha_registro: row.fecha_registro ?? template.fecha_registro
  };
}

// ==============================
// 📘 Obtener todos los proveedores
// ==============================
exports.getProveedores = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM proveedores ORDER BY fecha_registro DESC");
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
      .query("SELECT * FROM proveedores WHERE proveedor_id = @id");

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
    nombre_proveedor,
    ruc,
    direccion,
    telefono,
    email,
    persona_contacto,
    estado
  } = req.body;

  try {
    if (!nombre_proveedor || !ruc) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: nombre_proveedor y ruc"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("nombre_proveedor", sql.VarChar(100), nombre_proveedor)
      .input("ruc", sql.VarChar(20), ruc)
      .input("direccion", sql.VarChar(255), direccion || "")
      .input("telefono", sql.VarChar(20), telefono || "")
      .input("email", sql.VarChar(100), email || "")
      .input("persona_contacto", sql.VarChar(100), persona_contacto || "")
      .input("estado", sql.Char(1), estado || "A")
      .input("fecha_registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO proveedores (
          nombre_proveedor, ruc, direccion, telefono,
          email, persona_contacto, estado, fecha_registro
        )
        VALUES (
          @nombre_proveedor, @ruc, @direccion, @telefono,
          @email, @persona_contacto, @estado, @fecha_registro
        )
      `);

    return res.status(201).json({ message: "Proveedor registrado correctamente" });
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
    nombre_proveedor,
    ruc,
    direccion,
    telefono,
    email,
    persona_contacto,
    estado
  } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("nombre_proveedor", sql.VarChar(100), nombre_proveedor)
      .input("ruc", sql.VarChar(20), ruc)
      .input("direccion", sql.VarChar(255), direccion)
      .input("telefono", sql.VarChar(20), telefono)
      .input("email", sql.VarChar(100), email)
      .input("persona_contacto", sql.VarChar(100), persona_contacto)
      .input("estado", sql.Char(1), estado)
      .query(`
        UPDATE proveedores
        SET
          nombre_proveedor = @nombre_proveedor,
          ruc = @ruc,
          direccion = @direccion,
          telefono = @telefono,
          email = @email,
          persona_contacto = @persona_contacto,
          estado = @estado
        WHERE proveedor_id = @id
      `);

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
      .query("DELETE FROM proveedores WHERE proveedor_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    return res.status(200).json({ message: "Proveedor eliminado correctamente" });
  } catch (err) {
    console.error("deleteProveedor error:", err);
    return res.status(500).json({ error: "Error al eliminar el proveedor" });
  }
};
