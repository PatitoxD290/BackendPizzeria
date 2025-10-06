const { getConnection, sql } = require("../config/Connection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const pool = await getConnection();

    // Preparar la consulta parametrizada
    const result = await pool.request()
      .input("email", sql.VarChar, email)
      .query("SELECT * FROM usuario WHERE email = @email");

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const user = result.recordset[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const { id_usuario, id_cliente } = user;

    const token = jwt.sign(
      { id_usuario, id_cliente: id_cliente || null, user: user.user },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    delete user.password;

    res.status(200).json({
      message: "Login exitoso",
      token,
      id_usuario,
      id_cliente: id_cliente || null,
      user,
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

exports.logout = (_req, res) => {
  res.status(200).json({ message: "Logout exitoso. Token eliminado del cliente." });
};
