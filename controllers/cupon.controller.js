const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================================
// 🔄 Mapper: adapta una fila SQL al modelo Cupon
// ==============================================
function mapToCupon(row = {}) {
  const template = bdModel?.Cupon || {
    cupon_id: 0,
    codigo_cupon: "",
    descripcion: "",
    tipo_descuento: "",
    valor_descuento: 0.0,
    monto_minimo: 0.0,
    usos_maximos: 0,
    usos_actuales: 0,
    fecha_inicio: "",
    fecha_fin: "",
    estado: "A",
    fecha_registro: ""
  };

  return {
    ...template,
    cupon_id: row.cupon_id ?? template.cupon_id,
    codigo_cupon: row.codigo_cupon ?? template.codigo_cupon,
    descripcion: row.descripcion ?? template.descripcion,
    tipo_descuento: row.tipo_descuento ?? template.tipo_descuento,
    valor_descuento: row.valor_descuento ?? template.valor_descuento,
    monto_minimo: row.monto_minimo ?? template.monto_minimo,
    usos_maximos: row.usos_maximos ?? template.usos_maximos,
    usos_actuales: row.usos_actuales ?? template.usos_actuales,
    fecha_inicio: row.fecha_inicio ?? template.fecha_inicio,
    fecha_fin: row.fecha_fin ?? template.fecha_fin,
    estado: row.estado ?? template.estado,
    fecha_registro: row.fecha_registro ?? template.fecha_registro
  };
}

// ==============================================
// 📘 Obtener todos los cupones
// ==============================================
exports.getCupones = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM cupones ORDER BY fecha_registro DESC");
    const cupones = (result.recordset || []).map(mapToCupon);
    return res.status(200).json(cupones);
  } catch (err) {
    console.error("getCupones error:", err);
    return res.status(500).json({ error: "Error al obtener los cupones" });
  }
};

// ==============================================
// 📘 Obtener un cupón por ID
// ==============================================
exports.getCuponById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM cupones WHERE cupon_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Cupón no encontrado" });
    }

    return res.status(200).json(mapToCupon(result.recordset[0]));
  } catch (err) {
    console.error("getCuponById error:", err);
    return res.status(500).json({ error: "Error al obtener el cupón" });
  }
};

// ==============================================
// 📗 Crear un nuevo cupón
// ==============================================
exports.createCupon = async (req, res) => {
  const {
    codigo_cupon,
    descripcion,
    tipo_descuento,
    valor_descuento,
    monto_minimo,
    usos_maximos,
    usos_actuales,
    fecha_inicio,
    fecha_fin,
    estado
  } = req.body;

  try {
    if (!codigo_cupon || !tipo_descuento || valor_descuento == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: codigo_cupon, tipo_descuento o valor_descuento"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("codigo_cupon", sql.VarChar(50), codigo_cupon)
      .input("descripcion", sql.VarChar(255), descripcion || "")
      .input("tipo_descuento", sql.VarChar(20), tipo_descuento)
      .input("valor_descuento", sql.Decimal(10, 2), valor_descuento)
      .input("monto_minimo", sql.Decimal(10, 2), monto_minimo || 0.0)
      .input("usos_maximos", sql.Int, usos_maximos || 0)
      .input("usos_actuales", sql.Int, usos_actuales || 0)
      .input("fecha_inicio", sql.DateTime, fecha_inicio || new Date())
      .input("fecha_fin", sql.DateTime, fecha_fin || null)
      .input("estado", sql.Char(1), estado || "A")
      .input("fecha_registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO cupones (
          codigo_cupon, descripcion, tipo_descuento, valor_descuento,
          monto_minimo, usos_maximos, usos_actuales,
          fecha_inicio, fecha_fin, estado, fecha_registro
        )
        VALUES (
          @codigo_cupon, @descripcion, @tipo_descuento, @valor_descuento,
          @monto_minimo, @usos_maximos, @usos_actuales,
          @fecha_inicio, @fecha_fin, @estado, @fecha_registro
        )
      `);

    return res.status(201).json({ message: "Cupón registrado correctamente" });
  } catch (err) {
    console.error("createCupon error:", err);
    return res.status(500).json({ error: "Error al registrar el cupón" });
  }
};

// ==============================================
// 📙 Actualizar un cupón
// ==============================================
exports.updateCupon = async (req, res) => {
  const { id } = req.params;
  const {
    codigo_cupon,
    descripcion,
    tipo_descuento,
    valor_descuento,
    monto_minimo,
    usos_maximos,
    usos_actuales,
    fecha_inicio,
    fecha_fin,
    estado
  } = req.body;

  try {
    const pool = await getConnection();
    const request = pool.request();
    request.input("id", sql.Int, id);

    let query = "UPDATE cupones SET";
    let hasUpdates = false;

    if (codigo_cupon !== undefined) {
      query += " codigo_cupon = @codigo_cupon,";
      request.input("codigo_cupon", sql.VarChar(50), codigo_cupon);
      hasUpdates = true;
    }

    if (descripcion !== undefined) {
      query += " descripcion = @descripcion,";
      request.input("descripcion", sql.VarChar(255), descripcion);
      hasUpdates = true;
    }

    if (tipo_descuento !== undefined) {
      query += " tipo_descuento = @tipo_descuento,";
      request.input("tipo_descuento", sql.VarChar(20), tipo_descuento);
      hasUpdates = true;
    }

    if (valor_descuento !== undefined) {
      query += " valor_descuento = @valor_descuento,";
      request.input("valor_descuento", sql.Decimal(10, 2), valor_descuento);
      hasUpdates = true;
    }

    if (monto_minimo !== undefined) {
      query += " monto_minimo = @monto_minimo,";
      request.input("monto_minimo", sql.Decimal(10, 2), monto_minimo);
      hasUpdates = true;
    }

    if (usos_maximos !== undefined) {
      query += " usos_maximos = @usos_maximos,";
      request.input("usos_maximos", sql.Int, usos_maximos);
      hasUpdates = true;
    }

    if (usos_actuales !== undefined) {
      query += " usos_actuales = @usos_actuales,";
      request.input("usos_actuales", sql.Int, usos_actuales);
      hasUpdates = true;
    }

    if (fecha_inicio !== undefined) {
      query += " fecha_inicio = @fecha_inicio,";
      request.input("fecha_inicio", sql.DateTime, fecha_inicio);
      hasUpdates = true;
    }

    if (fecha_fin !== undefined) {
      query += " fecha_fin = @fecha_fin,";
      request.input("fecha_fin", sql.DateTime, fecha_fin);
      hasUpdates = true;
    }

    if (estado !== undefined) {
      query += " estado = @estado,";
      request.input("estado", sql.Char(1), estado);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    // Eliminar la coma final
    query = query.slice(0, -1);
    query += " WHERE cupon_id = @id";

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Cupón no encontrado" });
    }

    return res.status(200).json({ message: "Cupón actualizado correctamente" });

  } catch (err) {
    console.error("updateCupon error:", err);
    return res.status(500).json({ error: "Error al actualizar el cupón" });
  }
};

// ==============================================
// 📕 Eliminar un cupón
// ==============================================
exports.deleteCupon = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM cupones WHERE cupon_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Cupón no encontrado" });
    }

    return res.status(200).json({ message: "Cupón eliminado correctamente" });
  } catch (err) {
    console.error("deleteCupon error:", err);
    return res.status(500).json({ error: "Error al eliminar el cupón" });
  }
};
