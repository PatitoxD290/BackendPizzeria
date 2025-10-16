const { sql, getConnection } = require("../config/Connection");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// 🔹 LOGIN
exports.login = async (req, res) => {
  try {
    const { dni, password } = req.body;

    if (!dni || !password) {
      return res.status(400).json({ error: "Los campos DNI y contraseña son obligatorios." });
    }

    const pool = await getConnection();

    // Buscar usuario en la tabla 'usuarios'
    const result = await pool.request()
      .input("dni", sql.VarChar, dni)
      .query("SELECT * FROM usuarios WHERE dni = @dni");

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado." });
    }

    const user = result.recordset[0];

    // Verificar si el usuario está activo
    if (user.estado !== "A") {
      return res.status(403).json({ error: "Usuario inactivo. Contacte con el administrador." });
    }

    // Verificar contraseña con bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        usuario_id: user.usuario_id,
        dni: user.dni,
        nombre_completo: user.nombre_completo,
        rol: user.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // Expira en 1 día
    );

    // Respuesta al cliente
    res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso.",
      token,
      user: {
        id: user.usuario_id,
        nombre: user.nombre_completo,
        dni: user.dni,
        rol: user.rol,
      },
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// 🔹 LOGOUT
exports.logout = (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Sesión cerrada correctamente. El token debe eliminarse en el cliente.",
  });
};
