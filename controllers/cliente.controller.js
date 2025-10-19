const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila de BD al modelo Cliente
// ==============================
function mapToCliente(row = {}) {
  const template = bdModel?.Cliente || {
    cliente_id: 0,
    nombre_completo: "",
    dni: "",
    fecha_registro: ""
  };

  return {
    ...template,
    cliente_id: row.cliente_id ?? template.cliente_id,
    nombre_completo: row.nombre_completo ?? template.nombre_completo,
    dni: row.dni ?? template.dni,
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
  const { nombre_completo, dni } = req.body;

  try {
    if (!nombre_completo || !dni) {
      return res.status(400).json({ error: "Los campos 'nombre_completo' y 'dni' son obligatorios" });
    }

    const pool = await getConnection();

    // Verificar si ya existe un cliente con ese DNI
    const existe = await pool.request()
      .input("dni", sql.VarChar(20), dni)
      .query("SELECT cliente_id FROM clientes WHERE dni = @dni");

    if (existe.recordset.length > 0) {
      return res.status(400).json({ error: "Ya existe un cliente con ese DNI" });
    }

    await pool.request()
      .input("nombre_completo", sql.VarChar(255), nombre_completo)
      .input("dni", sql.VarChar(20), dni)
      .input("fecha_registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO clientes (nombre_completo, dni, fecha_registro)
        VALUES (@nombre_completo, @dni, @fecha_registro)
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
  const { nombre_completo, dni } = req.body;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("nombre_completo", sql.VarChar(255), nombre_completo)
      .input("dni", sql.VarChar(20), dni)
      .query(`
        UPDATE clientes
        SET nombre_completo = @nombre_completo, dni = @dni
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
        SELECT cliente_id, nombre_completo, dni, fecha_registro
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
