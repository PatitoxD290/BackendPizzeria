const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");
const bcrypt = require("bcryptjs");

// 🧩 Función para mapear filas de la BD al modelo Usuario
function mapToUsuario(row = {}) {
  const template = bdModel.Usuario || {
    usuario_id: 0,
    dni: "",
    password: "",
    nombre_completo: "",
    rol: "",
    telefono: "",
    estado: "A",
    fecha_registro: ""
  };

  return {
    ...template,
    usuario_id: row.usuario_id ?? template.usuario_id,
    dni: row.dni ?? template.dni,
    password: row.password ?? template.password,
    nombre_completo: row.nombre_completo ?? template.nombre_completo,
    rol: row.rol ?? template.rol,
    estado: row.estado ?? template.estado,
    fecha_registro: row.fecha_registro ?? template.fecha_registro
  };
}

// ==============================
// 📘 Obtener todos los usuarios
// ==============================
exports.getUsuarios = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM usuarios");
    const usuarios = (result.recordset || []).map(mapToUsuario);
    res.status(200).json(usuarios);
  } catch (err) {
    console.error("getUsuarios error:", err);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
};

// ==============================
// 📘 Obtener un usuario por ID
// ==============================
exports.getUsuarioById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM usuarios WHERE usuario_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.status(200).json(mapToUsuario(result.recordset[0]));
  } catch (err) {
    console.error("getUsuarioById error:", err);
    res.status(500).json({ error: "Error al obtener el usuario" });
  }
};

// ==============================
// 📗 Crear un nuevo usuario (con teléfono)
// ==============================
exports.createUsuario = async (req, res) => {
  const { dni, password, nombre_completo, rol, estado, telefono } = req.body;

  try {
    if (!dni || !password || !nombre_completo || !rol) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: dni, password, nombre_completo o rol"
      });
    }

    const pool = await getConnection();

    // Verificar si el DNI ya existe
    const existe = await pool.request()
      .input("dni", sql.VarChar(30), dni)
      .query("SELECT usuario_id FROM usuarios WHERE dni = @dni");

    if (existe.recordset.length > 0) {
      return res.status(400).json({ error: "Ya existe un usuario con ese DNI" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.request()
      .input("dni", sql.VarChar(30), dni)
      .input("password", sql.VarChar(255), hashedPassword)
      .input("nombre_completo", sql.VarChar(200), nombre_completo)
      .input("rol", sql.VarChar(50), rol)
      .input("telefono", sql.VarChar(20), telefono || null) // agregado telefono
      .input("estado", sql.VarChar(1), estado || "A")
      .query(`
        INSERT INTO usuarios (dni, password, nombre_completo, rol, telefono, estado, fecha_registro)
        VALUES (@dni, @password, @nombre_completo, @rol, @telefono, @estado, GETDATE())
      `);

    res.status(201).json({ message: "Usuario creado exitosamente" });
  } catch (err) {
    console.error("createUsuario error:", err);
    res.status(500).json({ error: "Error al crear el usuario" });
  }
};

// ==============================
// 📙 Actualizar un usuario (solo campos permitidos, y flexible)
// ==============================
exports.updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, rol, estado, telefono, password } = req.body;

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    let query = "UPDATE usuarios SET";
    let hasUpdates = false;

    if (nombre_completo !== undefined) {
      query += " nombre_completo = @nombre_completo,";
      request.input("nombre_completo", sql.VarChar(200), nombre_completo);
      hasUpdates = true;
    }
    if (rol !== undefined) {
      query += " rol = @rol,";
      request.input("rol", sql.VarChar(50), rol);
      hasUpdates = true;
    }
    if (estado !== undefined) {
      query += " estado = @estado,";
      request.input("estado", sql.VarChar(1), estado);
      hasUpdates = true;
    }
    if (telefono !== undefined) {
      query += " telefono = @telefono,";
      request.input("telefono", sql.VarChar(20), telefono);
      hasUpdates = true;
    }
    if (password !== undefined) {
      // Encriptar password si se envía
      const hashedPassword = await bcrypt.hash(password, 10);
      query += " password = @password,";
      request.input("password", sql.VarChar(255), hashedPassword);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    // Quitar última coma y agregar WHERE
    query = query.slice(0, -1);
    query += " WHERE usuario_id = @id";

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.status(200).json({ message: "Usuario actualizado exitosamente" });
  } catch (err) {
    console.error("updateUsuario error:", err);
    res.status(500).json({ error: "Error al actualizar el usuario" });
  }
};

// ==============================
// 📕 Eliminar un usuario
// ==============================
exports.deleteUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM usuarios WHERE usuario_id = @id");

    res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (err) {
    console.error("deleteUsuario error:", err);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
};

// ==============================
// 🔐 Cambiar contraseña
// ==============================
exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    if (!password) {
      return res.status(400).json({ error: "Debe ingresar una nueva contraseña" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await getConnection();

    await pool.request()
      .input("password", sql.VarChar(255), hashedPassword)
      .input("id", sql.Int, id)
      .query(`
        UPDATE usuarios
        SET password = @password
        WHERE usuario_id = @id
      `);

    res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ error: "Error al cambiar la contraseña" });
  }
};
