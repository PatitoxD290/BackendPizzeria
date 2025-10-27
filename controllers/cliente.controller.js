const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila de BD al modelo Cliente
// ==============================
function mapToCliente(row = {}) {
  const template = bdModel?.Cliente || {
    ID_Cliente: 0,
    Nombre: "",
    Apellido: "",
    DNI: "",
    Telefono: "",
    Fecha_Registro: ""
  };

  return {
    ...template,
    ID_Cliente: row.ID_Cliente ?? template.ID_Cliente,
    Nombre: row.Nombre ?? template.Nombre,
    Apellido: row.Apellido ?? template.Apellido,
    DNI: row.DNI ?? template.DNI,
    Telefono: row.Telefono ?? template.Telefono,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro
  };
}

// ==============================
// 📘 Obtener todos los clientes
// ==============================
exports.getClientes = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Cliente ORDER BY ID_Cliente DESC");
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
      .query("SELECT * FROM Cliente WHERE ID_Cliente = @id");

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
  const { Nombre, Apellido, DNI, Telefono } = req.body;

  try {
    // Validar campos obligatorios
    if (!Nombre || !Apellido || !DNI) {
      return res.status(400).json({ error: "Los campos 'Nombre', 'Apellido' y 'DNI' son obligatorios" });
    }

    const pool = await getConnection();

    // Verificar si ya existe un cliente con ese DNI
    const existe = await pool.request()
      .input("DNI", sql.VarChar(20), DNI)
      .query("SELECT ID_Cliente FROM Cliente WHERE DNI = @DNI");

    if (existe.recordset.length > 0) {
      return res.status(400).json({ error: "Ya existe un cliente con ese DNI" });
    }

    // 📌 Si 'Telefono' no se envía, se inserta como NULL
    const request = pool.request()
      .input("Nombre", sql.VarChar(100), Nombre)
      .input("Apellido", sql.VarChar(100), Apellido)
      .input("DNI", sql.VarChar(20), DNI)
      .input("Fecha_Registro", sql.DateTime, new Date());

    if (Telefono && Telefono.trim() !== "") {
      request.input("Telefono", sql.VarChar(20), Telefono);
    } else {
      request.input("Telefono", sql.VarChar(20), null);
    }

    await request.query(`
      INSERT INTO Cliente (Nombre, Apellido, DNI, Telefono, Fecha_Registro)
      VALUES (@Nombre, @Apellido, @DNI, @Telefono, @Fecha_Registro)
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
  const { Nombre, Apellido, Telefono } = req.body;

  try {
    const pool = await getConnection();

    let query = `UPDATE Cliente SET`;
    const request = pool.request();
    request.input("id", sql.Int, id);

    let hasUpdates = false;

    if (Nombre) {
      query += ` Nombre = @Nombre,`;
      request.input("Nombre", sql.VarChar(100), Nombre);
      hasUpdates = true;
    }

    if (Apellido) {
      query += ` Apellido = @Apellido,`;
      request.input("Apellido", sql.VarChar(100), Apellido);
      hasUpdates = true;
    }

    if (Telefono !== undefined) {
      query += ` Telefono = @Telefono,`;
      request.input("Telefono", sql.VarChar(20), Telefono?.trim() || null);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    query = query.slice(0, -1); // quitar la coma final
    query += ` WHERE ID_Cliente = @id`;

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
      .query("DELETE FROM Cliente WHERE ID_Cliente = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.status(200).json({ message: "Cliente eliminado correctamente" });
  } catch (err) {
    console.error("deleteCliente error:", err);
    return res.status(500).json({ error: "Error al eliminar el cliente" });
  }
};
