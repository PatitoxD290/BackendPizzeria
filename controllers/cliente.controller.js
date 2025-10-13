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
exports.updateCliente = async (req, res) => {
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

// Crear cliente y vincular con usuario
exports.createOrUpdateCliente = async (req, res) => {
  const { id_usuario, nombres, apellidos, telefono, direccion, dni } = req.body;

  try {
    const pool = await getConnection();

    // verificar usuario
    const usuarioResult = await pool.request()
      .input("id_usuario", sql.Int, id_usuario)
      .query("SELECT id_usuario FROM usuario WHERE id_usuario = @id_usuario");

    if (!usuarioResult.recordset || usuarioResult.recordset.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // insertar cliente y obtener id
    const insertQuery = `
      INSERT INTO cliente (nombres, apellidos, telefono, direccion, dni)
      OUTPUT INSERTED.id_cliente
      VALUES (@nombres, @apellidos, @telefono, @direccion, @dni)
    `;

    const insertResult = await pool.request()
      .input("nombres", sql.VarChar(200), nombres)
      .input("apellidos", sql.VarChar(200), apellidos)
      .input("telefono", sql.VarChar(50), telefono)
      .input("direccion", sql.VarChar(300), direccion)
      .input("dni", sql.VarChar(30), dni)
      .query(insertQuery);

    const clienteId = insertResult.recordset && insertResult.recordset[0] && (insertResult.recordset[0].id_cliente ?? insertResult.recordset[0].ID_Cliente);
    if (!clienteId) {
      return res.status(500).json({ error: "No se pudo obtener el id del cliente insertado" });
    }

    // vincular usuario
    await pool.request()
      .input("clienteId", sql.Int, clienteId)
      .input("id_usuario", sql.Int, id_usuario)
      .query("UPDATE usuario SET id_cliente = @clienteId WHERE id_usuario = @id_usuario");

    // recuperar cliente creado
    const clienteRows = await pool.request()
      .input("clienteId", sql.Int, clienteId)
      .query("SELECT * FROM cliente WHERE id_cliente = @clienteId");

    if (!clienteRows.recordset || clienteRows.recordset.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado después de guardar" });
    }

    return res.status(200).json(mapToCliente(clienteRows.recordset[0]));
  } catch (error) {
    console.error("createOrUpdateCliente error:", error);
    return res.status(500).json({ error: "Error al guardar datos del cliente en la base de datos" });
  }
};

// Listar todos los contratos
exports.listarTodosContratos = async (_req, res) => {
  const sqlQuery = `SELECT 
    c.id_contrato,
    CONCAT(cl.nombres, ' ', cl.apellidos) AS Nombre_Completo,
    c.descripcion,
    c.id_usuario,
    c.referencia_diseño,
    c.estado,
    c.fecha_inicio
  FROM 
    contrato c
  INNER JOIN 
    usuario u ON c.ID_Usuario = u.id_usuario
  INNER JOIN 
    cliente cl ON u.id_cliente = cl.id_cliente;`;

  try {
    const pool = await getConnection();
    const result = await pool.request().query(sqlQuery);
    return res.status(200).json({ exito: true, datos: result.recordset });
  } catch (err) {
    console.error("listarTodosContratos error:", err);
    return res.status(500).json({ error: "Error al listar contratos" });
  }
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
