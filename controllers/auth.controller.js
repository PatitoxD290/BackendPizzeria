const { sql, getConnection } = require("../config/Connection");
const jwt = require("jsonwebtoken");

// Mapper: Adapta los datos del cliente a una estructura coherente
function mapToCliente(row = {}) {
  const template = {
    id_cliente: null,
    first_name: "",
    last_name: "",
    id_number: "",  
  };

  return {
    ...template,
    id_cliente: row.customer_id ?? template.customer_id,
    first_name: row.first_name ?? template.first_name,
    last_name: row.last_name ?? template.last_name,
    id_number: row.id_number ?? template.id_number,  
  };
}

exports.login = async (req, res) => {
  try {
    const { id_number } = req.body;  

    if (!id_number) {
      return res.status(400).json({ error: "El campo id_number es obligatorio" });
    }

    const pool = await getConnection();

    const result = await pool.request()
      .input("id_number", sql.VarChar, id_number)
      .query("SELECT * FROM customers WHERE id_number = @id_number");

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Cliente no encontrado" });
    }

    const client = result.recordset[0];

    const { customer_id, first_name, last_name, id_number: clientIdNumber } = client;

    const roll = (clientIdNumber === '72909750') ? 'admin' : 'cliente';

    const token = jwt.sign(
      { id_cliente: customer_id || null, first_name, last_name, roll },  
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Respuesta exitosa
    res.status(200).json({
      success: true,  
      token,
      nombre: first_name,
      apellido: last_name,
      id_cliente: customer_id || null,
      roll 
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

exports.logout = (_req, res) => {
  res.status(200).json({ message: "Logout exitoso. Token eliminado del cliente." });
};
