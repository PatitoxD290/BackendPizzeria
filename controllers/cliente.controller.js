const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");
const axios = require("axios");

// ==============================
// 🔧 FUNCIÓN: Asegurar que Clientes Varios tenga ID 1
// ==============================
async function asegurarClienteVarios() {
  try {
    const pool = await getConnection();
    
    // Verificar si ya existe un cliente llamado "Clientes Varios"
    const checkCliente = await pool.request()
      .input("Nombre", sql.VarChar(100), "Clientes Varios")
      .query("SELECT ID_Cliente, Nombre FROM Cliente WHERE Nombre = @Nombre");

    if (checkCliente.recordset.length > 0) {
      console.log(`✅ Cliente 'Clientes Varios' ya existe con ID: ${checkCliente.recordset[0].ID_Cliente}`);
      return checkCliente.recordset[0].ID_Cliente;
    }

    // Si no existe, crear el cliente (sin forzar ID)
    const result = await pool.request()
      .input("Nombre", sql.VarChar(100), "Clientes Varios")
      .input("DNI", sql.VarChar(20), "")
      .input("Apellido", sql.VarChar(100), "")
      .input("Telefono", sql.VarChar(20), "")
      .input("Fecha_Registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO Cliente (DNI, Nombre, Apellido, Telefono, Fecha_Registro)
        VALUES (@DNI, @Nombre, @Apellido, @Telefono, @Fecha_Registro);
        SELECT SCOPE_IDENTITY() AS ID_Cliente;
      `);
    
    const clienteId = result.recordset[0].ID_Cliente;
    console.log(`✅ Cliente 'Clientes Varios' creado con ID: ${clienteId}`);
    return clienteId;
    
  } catch (error) {
    console.error("❌ Error asegurando cliente varios:", error.message);
    return 1; // Retornar 1 como fallback
  }
}

// ==============================
// 🔄 Mapper: adapta una fila de BD al modelo Cliente
// ==============================
function mapToCliente(row = {}) {
  const template = bdModel?.Cliente || {
    ID_Cliente: 0,
    DNI: "",
    Nombre: "",
    Apellido: "",
    Telefono: "",
    Fecha_Registro: ""
  };

  return {
    ...template,
    ID_Cliente: row.ID_Cliente ?? template.ID_Cliente,
    DNI: row.DNI ?? template.DNI,
    Nombre: row.Nombre ?? template.Nombre,
    Apellido: row.Apellido ?? template.Apellido,
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
    const pool = await getConnection();

    // 📌 Validar que el DNI no se repita (si fue proporcionado)
    if (DNI && DNI.trim() !== "") {
      const existe = await pool.request()
        .input("DNI", sql.VarChar(20), DNI.trim())
        .query("SELECT ID_Cliente FROM Cliente WHERE DNI = @DNI");

      if (existe.recordset.length > 0) {
        return res.status(400).json({ error: "Ya existe un cliente con ese DNI" });
      }
    }

    // 📌 Insertar datos (los que falten se irán como NULL)
    const request = pool.request()
      .input("Nombre", sql.VarChar(100), Nombre?.trim() || null)
      .input("Apellido", sql.VarChar(100), Apellido?.trim() || null)
      .input("DNI", sql.VarChar(20), DNI?.trim() || null)
      .input("Telefono", sql.VarChar(20), Telefono?.trim() || null)
      .input("Fecha_Registro", sql.DateTime, new Date());

    await request.query(`
      INSERT INTO Cliente (Nombre, Apellido, DNI, Telefono, Fecha_Registro)
      VALUES (@Nombre, @Apellido, @DNI, @Telefono, @Fecha_Registro);
      SELECT SCOPE_IDENTITY() AS ID_Cliente;
    `);

    const clienteCreado = await pool.request().query("SELECT TOP 1 * FROM Cliente ORDER BY ID_Cliente DESC");
    return res.status(201).json(mapToCliente(clienteCreado.recordset[0]));

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
  const { Nombre, Apellido, DNI, Telefono } = req.body;

  try {
    // Prevenir la modificación del cliente "Clientes Varios" (ID 1)
    if (parseInt(id) === 1) {
      return res.status(400).json({ 
        error: "No se puede modificar el cliente 'Clientes Varios' (ID 1)" 
      });
    }

    const pool = await getConnection();

    // 📌 Validar que el DNI no se repita (si fue proporcionado)
    if (DNI && DNI.trim() !== "") {
      const existe = await pool.request()
        .input("DNI", sql.VarChar(20), DNI.trim())
        .input("id", sql.Int, id)
        .query("SELECT ID_Cliente FROM Cliente WHERE DNI = @DNI AND ID_Cliente <> @id");

      if (existe.recordset.length > 0) {
        return res.status(400).json({ error: "El DNI ingresado ya pertenece a otro cliente" });
      }
    }

    let query = `UPDATE Cliente SET`;
    const request = pool.request();
    request.input("id", sql.Int, id);

    let hasUpdates = false;

    if (Nombre !== undefined) {
      query += ` Nombre = @Nombre,`;
      request.input("Nombre", sql.VarChar(100), Nombre?.trim() || null);
      hasUpdates = true;
    }

    if (Apellido !== undefined) {
      query += ` Apellido = @Apellido,`;
      request.input("Apellido", sql.VarChar(100), Apellido?.trim() || null);
      hasUpdates = true;
    }

    if (DNI !== undefined) {
      query += ` DNI = @DNI,`;
      request.input("DNI", sql.VarChar(20), DNI?.trim() || null);
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
    // Prevenir la eliminación del cliente "Clientes Varios" (ID 1)
    if (parseInt(id) === 1) {
      return res.status(400).json({ 
        error: "No se puede eliminar el cliente 'Clientes Varios' (ID 1)" 
      });
    }

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

// ==============================
// 🔍 Buscar y guardar cliente por DNI o RUC
// ==============================
exports.buscarClientePorDocumento = async (req, res) => {
  const { doc } = req.params;
  const token = process.env.TOKEN;

  try {
    if (!doc || (doc.length !== 8 && doc.length !== 11)) {
      return res.status(400).json({ error: "Documento inválido" });
    }

    const pool = await getConnection();

    // 🔎 1. Verificar si ya existe en BD
    const existe = await pool.request()
      .input("DNI", sql.VarChar(20), doc.trim())
      .query("SELECT * FROM Cliente WHERE DNI = @DNI");

    if (existe.recordset.length > 0) {
      return res.status(200).json({
        message: "Cliente ya registrado",
        cliente: existe.recordset[0],
      });
    }

    // ⚡ 2. Consultar la API externa
    const headers = { Authorization: `Bearer ${token}` };
    let nombre = "";
    let apellido = "";
    let tipo = "";
    let info = {};

    if (doc.length === 8) {
      // 🧍 Caso DNI
      tipo = "DNI";
      const { data } = await axios.get(`https://apiperu.dev/api/dni/${doc}`, { headers });

      if (!data.success) {
        return res.status(404).json({ error: "DNI no encontrado" });
      }

      info = data.data;
      nombre = info.nombres?.trim() || "";
      apellido = `${info.apellido_paterno || ""} ${info.apellido_materno || ""}`.trim();

    } else {
      // 🏢 Caso RUC
      tipo = "RUC";
      const { data } = await axios.get(`https://apiperu.dev/api/ruc/${doc}`, { headers });

      if (!data.success) {
        return res.status(404).json({ error: "RUC no encontrado" });
      }

      info = data.data;

      nombre = info.nombre_o_razon_social?.trim() || "";

      // 🧾 Concatenamos datos importantes en Apellido
      const estado = info.estado || "DESCONOCIDO";
      const condicion = info.condicion || "DESCONOCIDO";
      const agenteRetencion = info.es_agente_de_retencion || "NO";
      const agentePercepcion = info.es_agente_de_percepcion || "NO";

      apellido = `${estado} | ${condicion} | Retención: ${agenteRetencion} | Percepción: ${agentePercepcion}`;
    }

    // 🧩 3. Insertar nuevo cliente en la BD
    const insert = pool.request()
      .input("DNI", sql.VarChar(20), doc.trim())
      .input("Nombre", sql.VarChar(100), nombre || null)
      .input("Apellido", sql.VarChar(200), apellido || null)
      .input("Telefono", sql.VarChar(20), null)
      .input("Fecha_Registro", sql.DateTime, new Date());

    await insert.query(`
      INSERT INTO Cliente (DNI, Nombre, Apellido, Telefono, Fecha_Registro)
      VALUES (@DNI, @Nombre, @Apellido, @Telefono, @Fecha_Registro);
    `);

    // 🔁 4. Consultar y devolver cliente recién creado
    const nuevo = await pool.request()
      .input("DNI", sql.VarChar(20), doc.trim())
      .query("SELECT TOP 1 * FROM Cliente WHERE DNI = @DNI ORDER BY ID_Cliente DESC");

    return res.status(201).json({
      message: "Cliente creado correctamente",
      tipo,
      cliente: nuevo.recordset[0],
    });

  } catch (error) {
    console.error("Error en buscarClientePorDocumento:", error?.response?.data || error.message);
    return res.status(500).json({ error: "Error al buscar o guardar el cliente" });
  }
};

// Exportar la función de aseguración
exports.asegurarClienteVarios = asegurarClienteVarios;