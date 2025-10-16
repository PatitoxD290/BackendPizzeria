const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila de BD al modelo Cliente
// ==============================
function mapToCliente(row = {}) {
  const template = bdModel?.Cliente || {
    cliente_id: 0,
    nombres: "",
    apellidos: "",
    numero_documento: "",
    telefono: "",
    email: "",
    direccion: "",
    fecha_registro: ""
  };

  return {
    ...template,
    cliente_id: row.cliente_id ?? template.cliente_id,
    nombres: row.nombres ?? template.nombres,
    apellidos: row.apellidos ?? template.apellidos,
    numero_documento: row.numero_documento ?? template.numero_documento,
    telefono: row.telefono ?? template.telefono,
    email: row.email ?? template.email,
    direccion: row.direccion ?? template.direccion,
    fecha_registro: row.fecha_registro ?? template.fecha_registro
  };
}

// ==============================
// 📘 Obtener todos los clientes
// ==============================
exports.getClientes = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM clientes");
    const clientes = (result.recordset || []).map(mapToCliente);
    return res.status(200).json(clientes);
  } catch (err) {
    console.error("getClientes error:", err);
    return res.status(500).json({ error: "Error al obtener los clientes" });
  }
};

// ==============================
// 📘 Obtener un cliente por ID
// ==============================
exports.getClienteById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM clientes WHERE cliente_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.status(200).json(mapToCliente(result.recordset[0]));
  } catch (err) {
    console.error("getClienteById error:", err);
    return res.status(500).json({ error: "Error al obtener el cliente" });
  }
};

// ==============================
// 📗 Crear un nuevo cliente
// ==============================
exports.createCliente = async (req, res) => {
  const {
    nombres,
    apellidos,
    numero_documento,
    telefono,
    email,
    direccion
  } = req.body;

  try {
    if (!nombres || !apellidos || !numero_documento) {
      return res.status(400).json({
        error: "Los campos 'nombres', 'apellidos' y 'numero_documento' son obligatorios"
      });
    }

    const pool = await getConnection();

    // Verificar si ya existe el cliente con ese número de documento
    const existe = await pool.request()
      .input("numero_documento", sql.VarChar(30), numero_documento)
      .query("SELECT cliente_id FROM clientes WHERE numero_documento = @numero_documento");

    if (existe.recordset.length > 0) {
      return res.status(400).json({ error: "Ya existe un cliente con ese número de documento" });
    }

    await pool.request()
      .input("nombres", sql.VarChar(200), nombres)
      .input("apellidos", sql.VarChar(200), apellidos)
      .input("numero_documento", sql.VarChar(30), numero_documento)
      .input("telefono", sql.VarChar(20), telefono || "")
      .input("email", sql.VarChar(150), email || "")
      .input("direccion", sql.VarChar(255), direccion || "")
      .input("fecha_registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO clientes (nombres, apellidos, numero_documento, telefono, email, direccion, fecha_registro)
        VALUES (@nombres, @apellidos, @numero_documento, @telefono, @email, @direccion, @fecha_registro)
      `);

    return res.status(201).json({ message: "Cliente registrado correctamente" });
  } catch (err) {
    console.error("createCliente error:", err);
    return res.status(500).json({ error: "Error al registrar el cliente" });
  }
};

// ==============================
// 📙 Actualizar cliente
// ==============================
exports.updateCliente = async (req, res) => {
  const { id } = req.params;
  const {
    nombres,
    apellidos,
    numero_documento,
    telefono,
    email,
    direccion
  } = req.body;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("nombres", sql.VarChar(200), nombres)
      .input("apellidos", sql.VarChar(200), apellidos)
      .input("numero_documento", sql.VarChar(30), numero_documento)
      .input("telefono", sql.VarChar(20), telefono)
      .input("email", sql.VarChar(150), email)
      .input("direccion", sql.VarChar(255), direccion)
      .query(`
        UPDATE clientes
        SET 
          nombres = @nombres,
          apellidos = @apellidos,
          numero_documento = @numero_documento,
          telefono = @telefono,
          email = @email,
          direccion = @direccion
        WHERE cliente_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.status(200).json({ message: "Cliente actualizado correctamente" });
  } catch (err) {
    console.error("updateCliente error:", err);
    return res.status(500).json({ error: "Error al actualizar el cliente" });
  }
};

// ==============================
// 📕 Eliminar cliente
// ==============================
exports.deleteCliente = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM clientes WHERE cliente_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.status(200).json({ message: "Cliente eliminado correctamente" });
  } catch (err) {
    console.error("deleteCliente error:", err);
    return res.status(500).json({ error: "Error al eliminar el cliente" });
  }
};

// ==============================
// 🧾 Obtener datos para boleta
// ==============================
exports.datosBoletaCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT nombres, apellidos, numero_documento, telefono, email, direccion
        FROM clientes
        WHERE cliente_id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.status(200).json({
      exito: true,
      datos: mapToCliente(result.recordset[0])
    });
  } catch (err) {
    console.error("datosBoletaCliente error:", err);
    return res.status(500).json({ error: "Error al obtener datos del cliente para boleta" });
  }
};
