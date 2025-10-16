const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo TamañoPizza
// ==============================
function mapToTamanoPizza(row = {}) {
  const template = bdModel?.TamanoPizza || {
    tamano_id: 0,
    nombre_tamano: "",
    porciones: "",
    descripcion: ""
  };

  return {
    ...template,
    tamano_id: row.tamano_id ?? template.tamano_id,
    nombre_tamano: row.nombre_tamano ?? template.nombre_tamano,
    porciones: row.porciones ?? template.porciones,
    descripcion: row.descripcion ?? template.descripcion
  };
}

// ==============================
// 📘 Obtener todos los tamaños de pizza
// ==============================
exports.getTamanosPizza = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM tamanos_pizza ORDER BY tamano_id DESC");
    const tamanos = (result.recordset || []).map(mapToTamanoPizza);
    return res.status(200).json(tamanos);
  } catch (err) {
    console.error("getTamanosPizza error:", err);
    return res.status(500).json({ error: "Error al obtener los tamaños de pizza" });
  }
};

// ==============================
// 📘 Obtener un tamaño de pizza por ID
// ==============================
exports.getTamanoPizzaById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM tamanos_pizza WHERE tamano_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Tamaño de pizza no encontrado" });
    }

    return res.status(200).json(mapToTamanoPizza(result.recordset[0]));
  } catch (err) {
    console.error("getTamanoPizzaById error:", err);
    return res.status(500).json({ error: "Error al obtener el tamaño de pizza" });
  }
};

// ==============================
// 📗 Crear un nuevo tamaño de pizza
// ==============================
exports.createTamanoPizza = async (req, res) => {
  const { nombre_tamano, porciones, descripcion } = req.body;

  try {
    if (!nombre_tamano || !porciones) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: nombre_tamano y porciones"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("nombre_tamano", sql.VarChar(100), nombre_tamano)
      .input("porciones", sql.VarChar(50), porciones)
      .input("descripcion", sql.VarChar(255), descripcion || "")
      .query(`
        INSERT INTO tamanos_pizza (nombre_tamano, porciones, descripcion)
        VALUES (@nombre_tamano, @porciones, @descripcion)
      `);

    return res.status(201).json({ message: "Tamaño de pizza registrado correctamente" });
  } catch (err) {
    console.error("createTamanoPizza error:", err);
    return res.status(500).json({ error: "Error al registrar el tamaño de pizza" });
  }
};

// ==============================
// 📙 Actualizar un tamaño de pizza
// ==============================
exports.updateTamanoPizza = async (req, res) => {
  const { id } = req.params;
  const { nombre_tamano, porciones, descripcion } = req.body;

  try {
    const pool = await getConnection();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("nombre_tamano", sql.VarChar(100), nombre_tamano)
      .input("porciones", sql.VarChar(50), porciones)
      .input("descripcion", sql.VarChar(255), descripcion)
      .query(`
        UPDATE tamanos_pizza
        SET
          nombre_tamano = @nombre_tamano,
          porciones = @porciones,
          descripcion = @descripcion
        WHERE tamano_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Tamaño de pizza no encontrado" });
    }

    return res.status(200).json({ message: "Tamaño de pizza actualizado correctamente" });
  } catch (err) {
    console.error("updateTamanoPizza error:", err);
    return res.status(500).json({ error: "Error al actualizar el tamaño de pizza" });
  }
};

// ==============================
// 📕 Eliminar un tamaño de pizza
// ==============================
exports.deleteTamanoPizza = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM tamanos_pizza WHERE tamano_id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Tamaño de pizza no encontrado" });
    }

    return res.status(200).json({ message: "Tamaño de pizza eliminado correctamente" });
  } catch (err) {
    console.error("deleteTamanoPizza error:", err);
    return res.status(500).json({ error: "Error al eliminar el tamaño de pizza" });
  }
};
