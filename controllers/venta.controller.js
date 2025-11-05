const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔹 Mapper simple (respetando bd.models.js)
// ==============================
function mapToVenta(row = {}) {
  const template = bdModel?.Venta || {
    ID_Venta: 0,
    ID_Pedido: 0,
    Tipo_Venta: "",
    Metodo_Pago: "",
    Lugar_Emision: "",
    IGV: 0.0,
    Total: 0.0,
    Fecha_Registro: ""
  };
  return {
    ...template,
    ID_Venta: row.ID_Venta ?? template.ID_Venta,
    ID_Pedido: row.ID_Pedido ?? template.ID_Pedido,
    Tipo_Venta: row.Tipo_Venta ?? template.Tipo_Venta,
    Metodo_Pago: row.Metodo_Pago ?? template.Metodo_Pago,
    Lugar_Emision: row.Lugar_Emision ?? template.Lugar_Emision,
    IGV: row.IGV ?? template.IGV,
    Total: row.Total ?? template.Total,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro
  };
}

// ==============================
// 🔹 Función helper: calcular descuentos, IGV y total
// ==============================
async function calcularMontos(pool, ID_Pedido, IGV_Porcentaje = 18) {
  // 1) Obtener subtotal del pedido
  const pedidoRes = await pool.request()
    .input("ID_Pedido", sql.Int, ID_Pedido)
    .query("SELECT SubTotal FROM Pedido WHERE ID_Pedido = @ID_Pedido");

  if (!pedidoRes.recordset.length) throw new Error("Pedido no encontrado");
  const pedidoSubTotal = Number(pedidoRes.recordset[0].SubTotal ?? 0);

  // 2) Verificar uso de cupón
  const usoRes = await pool.request()
    .input("ID_Pedido", sql.Int, ID_Pedido)
    .query(`
      SELECT uc.*, c.Tipo_Desc, c.Valor_Desc, c.Monto_Max
      FROM Uso_Cupon uc
      LEFT JOIN Cupones c ON uc.ID_Cupon = c.ID_Cupon
      WHERE uc.ID_Pedido = @ID_Pedido
      ORDER BY uc.Fecha_Uso DESC
    `);

  let descuentoMonto = 0;
  let cuponAplicado = null;

  if (usoRes.recordset.length) {
    const uso = usoRes.recordset[0];
    cuponAplicado = {
      ID_Uso_C: uso.ID_Uso_C,
      ID_Cupon: uso.ID_Cupon,
      Tipo_Desc: uso.Tipo_Desc,
      Valor_Desc: Number(uso.Valor_Desc ?? 0),
      Monto_Max: Number(uso.Monto_Max ?? 0),
      Descuento_Aplic: Number(uso.Descuento_Aplic ?? 0)
    };

    if (cuponAplicado.Descuento_Aplic > 0) {
      descuentoMonto = cuponAplicado.Descuento_Aplic;
    } else {
      if (String(cuponAplicado.Tipo_Desc).toLowerCase() === "porcentaje") {
        descuentoMonto = +(pedidoSubTotal * (cuponAplicado.Valor_Desc / 100));
      } else {
        descuentoMonto = cuponAplicado.Valor_Desc || 0;
      }
      if (cuponAplicado.Monto_Max && cuponAplicado.Monto_Max > 0 && descuentoMonto > cuponAplicado.Monto_Max) {
        descuentoMonto = cuponAplicado.Monto_Max;
      }
      descuentoMonto = Number(descuentoMonto.toFixed(2));
    }
  }

  const subtotalConCupon = Math.max(0, pedidoSubTotal - descuentoMonto);
  const igvMonto = Number((subtotalConCupon * (IGV_Porcentaje / 100)).toFixed(2));
  const totalFinal = Number((subtotalConCupon + igvMonto).toFixed(2));

  return { pedidoSubTotal, descuentoMonto, subtotalConCupon, igvMonto, totalFinal, cuponAplicado };
}

// ==============================
// 🔹 Listar ventas enriquecido
// ==============================
exports.getVentas = async (_req, res) => {
  try {
    const pool = await getConnection();
    const sqlQuery = `
      SELECT 
        v.ID_Venta,
        v.ID_Pedido,
        v.Tipo_Venta,
        v.Fecha_Registro,
        c.Nombre AS Cliente_Nombre,
        p.Estado_P,
        v.Metodo_Pago,
        v.Lugar_Emision,
        v.IGV,
        v.Total,
        STRING_AGG(CONCAT(pr.Nombre, ' x ', pd.Cantidad), ', ') WITHIN GROUP (ORDER BY pd.ID_Pedido_D) AS Detalles_Pedido
      FROM Ventas v
      INNER JOIN Pedido p ON v.ID_Pedido = p.ID_Pedido
      LEFT JOIN Cliente c ON p.ID_Cliente = c.ID_Cliente
      LEFT JOIN Pedido_Detalle pd ON p.ID_Pedido = pd.ID_Pedido
      LEFT JOIN Producto pr ON pd.ID_Producto = pr.ID_Producto
      GROUP BY 
        v.ID_Venta, v.ID_Pedido, v.Tipo_Venta, v.Fecha_Registro,
        c.Nombre, p.Estado_P, v.Metodo_Pago, v.Lugar_Emision, v.IGV, v.Total
      ORDER BY v.ID_Venta DESC
    `;

    const result = await pool.request().query(sqlQuery);

    const ventas = (result.recordset || []).map(r => ({
      ID_Venta: r.ID_Venta,
      ID_Pedido: r.ID_Pedido,
      Tipo_Venta: r.Tipo_Venta,
      Fecha_Registro: r.Fecha_Registro,
      Cliente_Nombre: r.Cliente_Nombre,
      Estado_Pedido: r.Estado_P,
      Metodo_Pago: r.Metodo_Pago,
      Lugar_Emision: r.Lugar_Emision,
      IGV: r.IGV,
      Total: r.Total,
      Detalles_Pedido: r.Detalles_Pedido || ""
    }));

    res.status(200).json(ventas);

  } catch (err) {
    console.error("getVentas error:", err);
    res.status(500).json({ error: "Error al obtener las ventas" });
  }
};


// ==============================
// 🔹 Obtener venta por ID
// ==============================
exports.getVentaById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Ventas WHERE ID_Venta = @id");

    if (!result.recordset.length) return res.status(404).json({ error: "Venta no encontrada" });
    res.status(200).json(mapToVenta(result.recordset[0]));
  } catch (err) {
    console.error("getVentaById error:", err);
    res.status(500).json({ error: "Error al obtener la venta" });
  }
};

// ==============================
// 🔹 Crear venta
// ==============================
exports.createVenta = async (req, res) => {
  const { ID_Pedido, Tipo_Venta, Metodo_Pago, Lugar_Emision, IGV_Porcentaje } = req.body;
  if (!ID_Pedido || !Tipo_Venta || !Metodo_Pago) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Calcular montos
    const montos = await calcularMontos(transaction, ID_Pedido, IGV_Porcentaje);

    // Insertar venta
    const insertRes = await new sql.Request(transaction)
      .input("ID_Pedido", sql.Int, ID_Pedido)
      .input("Tipo_Venta", sql.VarChar(1), Tipo_Venta)
      .input("Metodo_Pago", sql.Char(1), Metodo_Pago)
      .input("Lugar_Emision", sql.Char(1), Lugar_Emision || "B")
      .input("IGV", sql.Decimal(10,2), montos.igvMonto)
      .input("Total", sql.Decimal(10,2), montos.totalFinal)
      .query(`
        INSERT INTO Ventas (ID_Pedido, Tipo_Venta, Metodo_Pago, Lugar_Emision, IGV, Total)
        OUTPUT INSERTED.ID_Venta
        VALUES (@ID_Pedido, @Tipo_Venta, @Metodo_Pago, @Lugar_Emision, @IGV, @Total)
      `);

    const nuevoID_Venta = insertRes.recordset[0].ID_Venta;

    // Actualizar uso de cupón si aplica
    if (montos.cuponAplicado && montos.cuponAplicado.Descuento_Aplic === 0) {
      await new sql.Request(transaction)
        .input("ID_Uso_C", sql.Int, montos.cuponAplicado.ID_Uso_C)
        .input("Descuento_Aplic", sql.Decimal(10,2), montos.descuentoMonto)
        .query("UPDATE Uso_Cupon SET Descuento_Aplic=@Descuento_Aplic WHERE ID_Uso_C=@ID_Uso_C");
    }

    await transaction.commit();

    res.status(201).json({
      message: "Venta registrada correctamente",
      ID_Venta: nuevoID_Venta,
      ID_Pedido,
      SubTotal_Pedido: montos.pedidoSubTotal,
      Descuento_Aplicado: montos.descuentoMonto,
      SubTotal_Con_Cupon: montos.subtotalConCupon,
      IGV_Porcentaje: IGV_Porcentaje || 18,
      IGV: montos.igvMonto,
      Total: montos.totalFinal,
      Cupon_Aplicado: montos.cuponAplicado ? {
        ID_Cupon: montos.cuponAplicado.ID_Cupon,
        Tipo_Desc: montos.cuponAplicado.Tipo_Desc,
        Valor_Desc: montos.cuponAplicado.Valor_Desc
      } : null
    });

  } catch (err) {
    await transaction.rollback();
    console.error("createVenta error:", err);
    res.status(500).json({ error: "Error al registrar la venta" });
  }
};

// ==============================
// 🔹 Datos de boleta/factura
// ==============================
exports.datosBoletaVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();

    const ventaRes = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT v.*, p.SubTotal AS Pedido_SubTotal, p.Notas
        FROM Ventas v
        INNER JOIN Pedido p ON v.ID_Pedido = p.ID_Pedido
        WHERE v.ID_Venta = @id
      `);

    if (!ventaRes.recordset.length) return res.status(404).json({ error: "Venta no encontrada" });
    const venta = ventaRes.recordset[0];

    const montos = await calcularMontos(pool, venta.ID_Pedido, null);

    const detallesRes = await pool.request()
      .input("ID_Pedido", sql.Int, venta.ID_Pedido)
      .query(`
        SELECT pd.ID_Pedido_D, pd.ID_Producto, pd.ID_Tamano, pd.Cantidad, pd.PrecioTotal,
               pr.Nombre AS Producto_Nombre,
               t.Tamano AS Tamano_Nombre
        FROM Pedido_Detalle pd
        LEFT JOIN Producto pr ON pd.ID_Producto = pr.ID_Producto
        LEFT JOIN Tamano t ON pd.ID_Tamano = t.ID_Tamano
        WHERE pd.ID_Pedido = @ID_Pedido
        ORDER BY pd.ID_Pedido_D
      `);

    res.status(200).json({
      exito: true,
      venta: {
        ID_Venta: venta.ID_Venta,
        ID_Pedido: venta.ID_Pedido,
        Tipo_Venta: venta.Tipo_Venta,
        Metodo_Pago: venta.Metodo_Pago,
        Lugar_Emision: venta.Lugar_Emision,
        Fecha_Registro: venta.Fecha_Registro
      },
      pedido: {
        SubTotal_Original: montos.pedidoSubTotal,
        Descuento_Aplicado: montos.descuentoMonto,
        SubTotal_Con_Cupon: montos.subtotalConCupon,
        IGV: montos.igvMonto,
        Total: montos.totalFinal,
        Notas: venta.Notas || ""
      },
      cupon: montos.cuponAplicado ? {
        ID_Cupon: montos.cuponAplicado.ID_Cupon,
        Tipo_Desc: montos.cuponAplicado.Tipo_Desc,
        Valor_Desc: montos.cuponAplicado.Valor_Desc
      } : null,
      detalles: detallesRes.recordset.map(d => ({
        ID_Pedido_D: d.ID_Pedido_D,
        ID_Producto: d.ID_Producto,
        Producto_Nombre: d.Producto_Nombre,
        ID_Tamano: d.ID_Tamano,
        Tamano_Nombre: d.Tamano_Nombre,
        Cantidad: d.Cantidad,
        PrecioTotal: d.PrecioTotal
      }))
    });

  } catch (err) {
    console.error("datosBoletaVenta error:", err);
    res.status(500).json({ error: "Error al obtener los datos de la venta" });
  }
};
