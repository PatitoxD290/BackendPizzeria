// controllers/cliente.controller.js
const { sql, getConnection } = require("../config/Connection"); // tu Connection.js
const bdModel = require("../models/bd.models");

// Mapper: adapta una fila de BD al shape del modelo Cliente definido en bd.model.js
function mapToCliente(row = {}) {
  const template = (bdModel && bdModel.Cliente) ? bdModel.Cliente : {
    customer_id: 0,
    first_name: "",
    last_name: "",
    id_number: ""
  };

  return {
    ...template,
    customer_id: row.id_cliente ?? row.customer_id ?? template.customer_id,
    first_name: row.nombres ?? row.first_name ?? template.first_name,
    last_name: row.apellidos ?? row.last_name ?? template.last_name,
    id_number: row.dni ?? row.id_number ?? template.id_number
  };
}

// Obtener todos los clientes
exports.getClientes = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM customers");
    const clientes = (result.recordset || []).map(mapToCliente);
    return res.status(200).json(clientes);
  } catch (err) {
    console.error("getClientes error:", err);
    return res.status(500).json({ error: "Error en la base de datos" });
  }
};

// Actualizar cliente
exports.updateClientePuntos = async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, telefono, direccion, dni } = req.body;

  try {
    const pool = await getConnection();
    await pool.request()
      .input("nombres", sql.VarChar(200), nombres)
      .input("apellidos", sql.VarChar(200), apellidos)
      .input("telefono", sql.VarChar(50), telefono)
      .input("direccion", sql.VarChar(300), direccion)
      .input("dni", sql.VarChar(30), dni)
      .input("id", sql.Int, id)
      .query(`
        UPDATE cliente
        SET nombres = @nombres,
            apellidos = @apellidos,
            telefono = @telefono,
            direccion = @direccion,
            dni = @dni
        WHERE id_cliente = @id
      `);

    return res.status(200).json({ message: "Cliente actualizado" });
  } catch (err) {
    console.error("updateCliente error:", err);
    return res.status(500).json({ error: "Error al actualizar" });
  }
};

//crear cliente
exports.createCliente = async (req, res) => { 

};
// Obtener datos para boleta
exports.datosBoletaCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          cl.nombres,
          cl.apellidos,
          cl.telefono,
          cl.direccion,
          cl.dni
        FROM cliente cl
        WHERE cl.id_cliente = @id
      `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.status(200).json({ exito: true, datos: mapToCliente(result.recordset[0]) });
  } catch (err) {
    console.error("datosBoletaCliente error:", err);
    return res.status(500).json({ error: "Error al obtener datos para boleta" });
  }
};
