const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");
const bcrypt = require("bcryptjs");

// Mapear fila DB al modelo (respetando bd.models.js)
function mapToUsuario(row = {}) {
  const template = bdModel?.Usuario || {
    ID_Usuario: 0,
    Perfil: "",
    Correo: "",
    Password: "",
    Roll: "E",
    Estado: "A",
    Fecha_Registro: null
  };

  return {
    ...template,
    ID_Usuario: row.ID_Usuario ?? template.ID_Usuario,
    Perfil: row.Perfil ?? template.Perfil,
    Correo: row.Correo ?? template.Correo,
    Password: row.Password ?? template.Password,
    Roll: row.Roll ?? template.Roll,
    Estado: row.Estado ?? template.Estado,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro
  };
}

// Obtener todos los usuarios
exports.getUsuarios = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT ID_Usuario, Perfil, Correo, Roll, Estado, Fecha_Registro FROM Usuario ORDER BY ID_Usuario DESC");
    const usuarios = (result.recordset || []).map(mapToUsuario);
    return res.status(200).json(usuarios);
  } catch (err) {
    console.error("getUsuarios error:", err);
    return res.status(500).json({ error: "Error al obtener los usuarios" });
  }
};

// Obtener usuario por ID
exports.getUsuarioById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT ID_Usuario, Perfil, Correo, Roll, Estado, Fecha_Registro FROM Usuario WHERE ID_Usuario = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json(mapToUsuario(result.recordset[0]));
  } catch (err) {
    console.error("getUsuarioById error:", err);
    return res.status(500).json({ error: "Error al obtener el usuario" });
  }
};

// Crear usuario (se encripta password)
// Nota: aqui se requiere Correo y Password y Perfil; ajusta si quieres permitir registro público
exports.createUsuario = async (req, res) => {
  const { Perfil, Correo, Password, Roll, Estado } = req.body;

  try {
    if (!Perfil || !Correo || !Password) {
      return res.status(400).json({ error: "Faltan campos obligatorios: Perfil, Correo o Password" });
    }

    const pool = await getConnection();

    // Verificar si el correo ya existe
    const exists = await pool.request()
      .input("Correo", sql.VarChar(100), Correo)
      .query("SELECT ID_Usuario FROM Usuario WHERE Correo = @Correo");

    if (exists.recordset.length > 0) {
      return res.status(400).json({ error: "Ya existe un usuario con ese correo" });
    }

    const hashed = await bcrypt.hash(Password, 10);

    await pool.request()
      .input("Perfil", sql.VarChar(50), Perfil)
      .input("Correo", sql.VarChar(100), Correo)
      .input("Password", sql.VarChar(255), hashed)
      .input("Roll", sql.Char(1), Roll || "E")
      .input("Estado", sql.Char(1), Estado || "A")
      .query(`
        INSERT INTO Usuario (Perfil, Correo, Password, Roll, Estado, Fecha_Registro)
        VALUES (@Perfil, @Correo, @Password, @Roll, @Estado, GETDATE())
      `);

    return res.status(201).json({ message: "Usuario creado exitosamente" });
  } catch (err) {
    console.error("createUsuario error:", err);
    return res.status(500).json({ error: "Error al crear el usuario" });
  }
};

// Actualizar usuario (parcial, encripta password si llega)
exports.updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { Perfil, Roll, Estado, Password } = req.body;

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    let updateParts = [];
    if (Perfil !== undefined) { updateParts.push("Perfil = @Perfil"); request.input("Perfil", sql.VarChar(50), Perfil); }
    if (Roll !== undefined) { updateParts.push("Roll = @Roll"); request.input("Roll", sql.Char(1), Roll); }
    if (Estado !== undefined) { updateParts.push("Estado = @Estado"); request.input("Estado", sql.Char(1), Estado); }

    if (Password !== undefined) {
      const hashed = await bcrypt.hash(Password, 10);
      updateParts.push("Password = @Password");
      request.input("Password", sql.VarChar(255), hashed);
    }

    if (updateParts.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    const query = `UPDATE Usuario SET ${updateParts.join(", ")} WHERE ID_Usuario = @id`;
    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json({ message: "Usuario actualizado exitosamente" });
  } catch (err) {
    console.error("updateUsuario error:", err);
    return res.status(500).json({ error: "Error al actualizar el usuario" });
  }
};

// Eliminar usuario (DELETE físico) — si prefieres soft-delete, lo cambio
exports.deleteUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM Usuario WHERE ID_Usuario = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (err) {
    console.error("deleteUsuario error:", err);
    return res.status(500).json({ error: "Error al eliminar el usuario" });
  }
};

// Cambiar contraseña
exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    if (!password) return res.status(400).json({ error: "Debe ingresar una nueva contraseña" });

    const hashed = await bcrypt.hash(password, 10);
    const pool = await getConnection();

    const result = await pool.request()
      .input("Password", sql.VarChar(255), hashed)
      .input("id", sql.Int, id)
      .query("UPDATE Usuario SET Password = @Password WHERE ID_Usuario = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ error: "Error al cambiar la contraseña" });
  }
};
