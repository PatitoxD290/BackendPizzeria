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
    telefono: "",
    fecha_registro: ""
  };

  return {
    ...template,
    cliente_id: row.cliente_id ?? template.cliente_id,
    nombre_completo: row.nombre_completo ?? template.nombre_completo,
    dni: row.dni ?? template.dni,
    telefono: row.telefono ?? template.telefono,
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
  const { nombre_completo, dni, telefono } = req.body;

  try {
    // Validar campos obligatorios
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

    // 📌 Si 'telefono' no se envía, se inserta como NULL
    const request = pool.request()
      .input("nombre_completo", sql.VarChar(255), nombre_completo)
      .input("dni", sql.VarChar(20), dni)
      .input("fecha_registro", sql.DateTime, new Date());

    if (telefono && telefono.trim() !== "") {
      request.input("telefono", sql.VarChar(20), telefono);
    } else {
      request.input("telefono", sql.VarChar(20), null);
    }

    await request.query(`
      INSERT INTO clientes (nombre_completo, dni, telefono, fecha_registro)
      VALUES (@nombre_completo, @dni, @telefono, @fecha_registro)
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
  const { nombre_completo, telefono } = req.body;

  try {
    const pool = await getConnection();

    let query = `UPDATE clientes SET`;
    const request = pool.request();
    request.input("id", sql.Int, id);

    let hasUpdates = false;

    if (nombre_completo) {
      query += ` nombre_completo = @nombre_completo,`;
      request.input("nombre_completo", sql.VarChar(255), nombre_completo);
      hasUpdates = true;
    }

    // 📌 teléfono puede venir vacío o eliminarse
    if (telefono !== undefined) {
      query += ` telefono = @telefono,`;
      request.input("telefono", sql.VarChar(20), telefono?.trim() || null);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    query = query.slice(0, -1); // quitar la coma final
    query += ` WHERE cliente_id = @id`;

    const result = await request.query(query);

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
