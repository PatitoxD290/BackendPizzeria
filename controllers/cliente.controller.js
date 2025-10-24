const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper
// ==============================
function mapToCliente(row = {}) {
  const template = bdModel?.Cliente || {
    cliente_id: 0,
    nombre_completo: "",
    dni: null,
    telefono: null,
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
// 📘 Obtener cliente por ID
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
// 📗 Crear nuevo cliente
// ==============================
exports.createCliente = async (req, res) => {
  const { nombre_completo, dni, telefono } = req.body;

  try {
    // 🔹 Validar nombre obligatorio
    if (!nombre_completo || !nombre_completo.trim()) {
      return res.status(400).json({ error: "El nombre completo es obligatorio" });
    }

    const pool = await getConnection();

    // 🚫 Evitar crear otro "Clientes Varios"
    if (nombre_completo.trim().toLowerCase() === "clientes varios") {
      return res.status(400).json({ error: "El cliente 'Clientes Varios' ya existe y no puede duplicarse" });
    }

    const request = pool.request()
      .input("nombre_completo", sql.VarChar(255), nombre_completo.trim())
      .input("fecha_registro", sql.DateTime, new Date());

    // 🔹 Manejar dni opcional y único
    if (dni && dni.trim() !== "") {
      const dniExistente = await pool.request()
        .input("dni", sql.VarChar(20), dni.trim())
        .query("SELECT cliente_id FROM clientes WHERE dni = @dni");

      if (dniExistente.recordset.length > 0) {
        return res.status(400).json({ error: "Ya existe un cliente con ese DNI" });
      }

      request.input("dni", sql.VarChar(20), dni.trim());
    } else {
      request.input("dni", sql.VarChar(20), null);
    }

    // 🔹 Teléfono opcional
    request.input("telefono", sql.VarChar(20), telefono?.trim() || null);

    await request.query(`
      INSERT INTO clientes (nombre_completo, dni, telefono, fecha_registro)
      VALUES (@nombre_completo, @dni, @telefono, @fecha_registro)
    `);

    return res.status(201).json({ message: "Cliente registrado correctamente" });
  } catch (err) {
    console.error("createCliente error:", err);
    return res.status(500).json({ error: err.message });
  }
};


// ==============================
// 📙 Actualizar cliente
// ==============================
exports.updateCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, telefono, dni } = req.body;

  try {
    if (parseInt(id) === 1) {
      return res.status(400).json({ error: "El cliente 'Clientes Varios' no puede modificarse" });
    }

    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    let query = `UPDATE clientes SET`;
    let hasUpdates = false;

    if (nombre_completo) {
      query += ` nombre_completo = @nombre_completo,`;
      request.input("nombre_completo", sql.VarChar(255), nombre_completo);
      hasUpdates = true;
    }

    if (dni !== undefined) {
      if (dni && dni.trim() !== "") {
        const existe = await pool.request()
          .input("dni", sql.VarChar(20), dni)
          .input("id", sql.Int, id)
          .query("SELECT cliente_id FROM clientes WHERE dni = @dni AND cliente_id <> @id");

        if (existe.recordset.length > 0) {
          return res.status(400).json({ error: "El DNI ingresado ya está registrado por otro cliente" });
        }

        query += ` dni = @dni,`;
        request.input("dni", sql.VarChar(20), dni);
      } else {
        query += ` dni = @dni,`;
        request.input("dni", sql.VarChar(20), null);
      }
      hasUpdates = true;
    }

    if (telefono !== undefined) {
      query += ` telefono = @telefono,`;
      request.input("telefono", sql.VarChar(20), telefono?.trim() || null);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    query = query.slice(0, -1);
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
    if (parseInt(id) === 1) {
      return res.status(400).json({ error: "El cliente 'Clientes Varios' no puede eliminarse" });
    }

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
