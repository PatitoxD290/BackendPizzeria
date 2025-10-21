const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila de BD al modelo Venta
// ==============================
function mapToVenta(row = {}) {
  const template = bdModel?.Venta || {
    venta_id: 0,
    pedido_id: 0,
    tipo_comprobante: "",
    fecha_venta: "",
    usuario_id: null,
    lugar_emision: "",
    metodo_pago: "",
    subtotal: 0.0,
    igv: 0.0,
    total: 0.0
  };

  return {
    ...template,
    venta_id: row.venta_id ?? template.venta_id,
    pedido_id: row.pedido_id ?? template.pedido_id,
    tipo_comprobante: row.tipo_comprobante ?? template.tipo_comprobante,
    fecha_venta: row.fecha_venta ?? template.fecha_venta,
    usuario_id: row.usuario_id ?? template.usuario_id,
    lugar_emision: row.lugar_emision ?? template.lugar_emision,
    metodo_pago: row.metodo_pago ?? template.metodo_pago,
    subtotal: row.subtotal ?? template.subtotal,
    igv: row.igv ?? template.igv,
    total: row.total ?? template.total
  };
}

// ==============================
// 📘 Obtener todas las ventas con datos adicionales
// ==============================
exports.getVentas = async (_req, res) => {
  try {
    const pool = await getConnection();

    // Consulta para obtener ventas con la información adicional
    const result = await pool.request().query(`
      SELECT 
        v.venta_id, 
        c.nombre AS nombre_cliente,
        v.pedido_id, 
        p.estado_pedido, 
        u.nombre AS usuario_nombre,
        -- Concatenamos los detalles del pedido
        STRING_AGG(CONCAT(dp.producto_id, ' x ', dp.cantidad), ', ') AS detalles_pedido
      FROM ventas v
      INNER JOIN pedidos p ON v.pedido_id = p.pedido_id
      INNER JOIN clientes c ON p.cliente_id = c.cliente_id
      INNER JOIN usuarios u ON v.usuario_id = u.usuario_id
      LEFT JOIN detalle_pedidos dp ON p.pedido_id = dp.pedido_id
      GROUP BY v.venta_id, c.nombre, v.pedido_id, p.estado_pedido, u.nombre
      ORDER BY v.venta_id DESC
    `);

    const ventas = result.recordset.map(row => {
      return {
        venta_id: row.venta_id,
        nombre_cliente: row.nombre_cliente,
        pedido_id: row.pedido_id,
        detalles_pedido: row.detalles_pedido || "",
        estado_pedido: row.estado_pedido,
        usuario_nombre: row.usuario_nombre
      };
    });

    return res.status(200).json(ventas);
  } catch (err) {
    console.error("getVentas error:", err);
    return res.status(500).json({ error: "Error al obtener las ventas" });
  }
};

// ==============================
// 📘 Obtener una venta por ID
// ==============================
exports.getVentaById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM ventas WHERE venta_id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    return res.status(200).json(mapToVenta(result.recordset[0]));
  } catch (err) {
    console.error("getVentaById error:", err);
    return res.status(500).json({ error: "Error al obtener la venta" });
  }
};

// ==============================
// 📗 Registrar una nueva venta
// ==============================
exports.createVenta = async (req, res) => {
  const {
    pedido_id,
    tipo_comprobante,
    fecha_venta,
    lugar_emision,
    metodo_pago,
    subtotal,
    igv,
    total,
    usuario_id
  } = req.body;

  try {
    if (!pedido_id || !tipo_comprobante || !fecha_venta || !metodo_pago) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: pedido_id, tipo_comprobante, fecha_venta o metodo_pago"
      });
    }

    const pool = await getConnection();

    await pool.request()
      .input("pedido_id", sql.Int, pedido_id)
      .input("tipo_comprobante", sql.VarChar(50), tipo_comprobante)
      .input("fecha_venta", sql.DateTime, fecha_venta)
      .input("usuario_id", sql.Int, usuario_id)
      .input("lugar_emision", sql.VarChar(100), lugar_emision || "")
      .input("metodo_pago", sql.VarChar(50), metodo_pago)
      .input("subtotal", sql.Decimal(10, 2), subtotal || 0.0)
      .input("igv", sql.Decimal(10, 2), igv || 0.0)
      .input("total", sql.Decimal(10, 2), total || 0.0)
      .query(`
        INSERT INTO ventas (
          pedido_id, tipo_comprobante, fecha_venta,
          usuario_id, lugar_emision, metodo_pago,
          subtotal, igv, total
        )
        VALUES (
          @pedido_id, @tipo_comprobante, @fecha_venta,
          @usuario_id, @lugar_emision, @metodo_pago,
          @subtotal, @igv, @total
        )
      `);

    return res.status(201).json({ message: "Venta registrada correctamente" });
  } catch (err) {
    console.error("createVenta error:", err);
    return res.status(500).json({ error: "Error al registrar la venta" });
  }
};

// ==============================
// 🧾 Obtener resumen de venta (para boleta o factura)
// ==============================
exports.datosBoletaVenta = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT venta_id, tipo_comprobante, fecha_venta, metodo_pago,
               subtotal, igv, total, lugar_emision
        FROM ventas
        WHERE venta_id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    return res.status(200).json({
      exito: true,
      datos: mapToVenta(result.recordset[0])
    });
  } catch (err) {
    console.error("datosBoletaVenta error:", err);
    return res.status(500).json({ error: "Error al obtener los datos de la venta" });
  }
};

// Obtener ventas por mes (para gráficos)
exports.obtenerVentasPorMes = async (_req, res) => {
  const sql = `
    SELECT 
      MONTH(v.fecha_venta) AS mes, 
      SUM(v.total) AS total
    FROM 
      ventas v
    GROUP BY 
      MONTH(v.fecha_venta)
    ORDER BY 
      MONTH(v.fecha_venta)`;

  try {
    const pool = await getConnection();
    const result = await pool.request().query(sql);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error al obtener ventas por mes:", err);
    res.status(500).json({ error: "Error al obtener ventas por mes" });
  }
};

// Obtener productos más vendidos (para gráficos)
exports.obtenerProductosMasVendidos = async (_req, res) => {
  const sql = `
    SELECT 
      p.producto, 
      SUM(dp.cantidad) AS cantidad_total
    FROM 
      detalle_pedidos dp
    JOIN 
      pedidos ped ON dp.pedido_id = ped.pedido_id
    JOIN 
      productos p ON dp.producto_id = p.producto_id
    JOIN 
      ventas v ON ped.pedido_id = v.pedido_id
    GROUP BY 
      p.producto
    ORDER BY 
      cantidad_total DESC
    LIMIT 10`;

  try {
    const pool = await getConnection();
    const result = await pool.request().query(sql);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error al obtener productos más vendidos:", err);
    res.status(500).json({ error: "Error al obtener productos más vendidos" });
  }
};
