const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔹 Mapper actualizado con nuevos campos
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
    Monto_Recibido: 0.0,
    Vuelto: 0.0,
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
    Monto_Recibido: row.Monto_Recibido ?? template.Monto_Recibido,
    Vuelto: row.Vuelto ?? template.Vuelto,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro
  };
}

// ==============================
// 🔹 Función helper: calcular descuentos, IGV y total (IGV = 0)
// ==============================
async function calcularMontos(pool, ID_Pedido, IGV_Porcentaje = 0) { // Cambiar default a 0
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
  
  // 🔹 CAMBIO PRINCIPAL: IGV siempre será 0
  const igvMonto = 0; // IGV fijo en 0
  
  // 🔹 Total será igual al subtotal con cupón (sin agregar IGV)
  const totalFinal = Number(subtotalConCupon.toFixed(2));

  return { pedidoSubTotal, descuentoMonto, subtotalConCupon, igvMonto, totalFinal, cuponAplicado };
}

// ==============================
// 🔹 Listar ventas enriquecido - ACTUALIZADO con nuevos campos
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
        v.Monto_Recibido,
        v.Vuelto,
        STRING_AGG(CONCAT(pr.Nombre, ' (', t.Tamano, ') x ', pd.Cantidad), ', ') WITHIN GROUP (ORDER BY pd.ID_Pedido_D) AS Detalles_Pedido
      FROM Ventas v
      INNER JOIN Pedido p ON v.ID_Pedido = p.ID_Pedido
      LEFT JOIN Cliente c ON p.ID_Cliente = c.ID_Cliente
      LEFT JOIN Pedido_Detalle pd ON p.ID_Pedido = pd.ID_Pedido
      LEFT JOIN Producto_Tamano pt ON pd.ID_Producto_T = pt.ID_Producto_T
      LEFT JOIN Producto pr ON pt.ID_Producto = pr.ID_Producto
      LEFT JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
      GROUP BY 
        v.ID_Venta, v.ID_Pedido, v.Tipo_Venta, v.Fecha_Registro,
        c.Nombre, p.Estado_P, v.Metodo_Pago, v.Lugar_Emision, 
        v.IGV, v.Total, v.Monto_Recibido, v.Vuelto
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
      Monto_Recibido: r.Monto_Recibido,
      Vuelto: r.Vuelto,
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
// 🔹 Crear venta (sin IGV) - ACTUALIZADO con nuevos campos
// ==============================
exports.createVenta = async (req, res) => {
  const { ID_Pedido, Tipo_Venta, Metodo_Pago, Lugar_Emision, Monto_Recibido } = req.body;
  if (!ID_Pedido || !Tipo_Venta || !Metodo_Pago) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Calcular montos (IGV será 0 automáticamente)
    const montos = await calcularMontos(transaction, ID_Pedido);

    // Calcular vuelto si se proporcionó Monto_Recibido
    const montoRecibidoNum = Monto_Recibido ? Number(Monto_Recibido) : 0;
    const vuelto = montoRecibidoNum > 0 ? Math.max(0, montoRecibidoNum - montos.totalFinal) : 0;

    // Insertar venta con nuevos campos
    const insertRes = await new sql.Request(transaction)
      .input("ID_Pedido", sql.Int, ID_Pedido)
      .input("Tipo_Venta", sql.VarChar(1), Tipo_Venta)
      .input("Metodo_Pago", sql.Char(1), Metodo_Pago)
      .input("Lugar_Emision", sql.Char(1), Lugar_Emision || "B")
      .input("IGV", sql.Decimal(10,2), montos.igvMonto) // Esto será 0
      .input("Total", sql.Decimal(10,2), montos.totalFinal) // Esto será igual al subtotal con cupón
      .input("Monto_Recibido", sql.Decimal(10,2), montoRecibidoNum)
      .input("Vuelto", sql.Decimal(10,2), vuelto)
      .query(`
        INSERT INTO Ventas (ID_Pedido, Tipo_Venta, Metodo_Pago, Lugar_Emision, IGV, Total, Monto_Recibido, Vuelto)
        OUTPUT INSERTED.ID_Venta
        VALUES (@ID_Pedido, @Tipo_Venta, @Metodo_Pago, @Lugar_Emision, @IGV, @Total, @Monto_Recibido, @Vuelto)
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
      IGV: montos.igvMonto, // Esto será 0
      Total: montos.totalFinal, // Esto será igual al subtotal con cupón
      Monto_Recibido: montoRecibidoNum,
      Vuelto: vuelto,
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
// 🔹 Actualizar venta (para montos recibidos y vuelto)
// ==============================
exports.updateVenta = async (req, res) => {
  const { id } = req.params;
  const { Monto_Recibido, Vuelto } = req.body;

  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input("ID_Venta", sql.Int, id)
      .input("Monto_Recibido", sql.Decimal(10,2), Monto_Recibido || 0)
      .input("Vuelto", sql.Decimal(10,2), Vuelto || 0)
      .query(`
        UPDATE Ventas 
        SET Monto_Recibido = @Monto_Recibido, Vuelto = @Vuelto
        WHERE ID_Venta = @ID_Venta
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    res.status(200).json({ 
      message: "Venta actualizada correctamente",
      Monto_Recibido: Monto_Recibido || 0,
      Vuelto: Vuelto || 0
    });

  } catch (err) {
    console.error("updateVenta error:", err);
    res.status(500).json({ error: "Error al actualizar la venta" });
  }
};

// ==============================
// 🔹 Datos de boleta/factura - ACTUALIZADO con nuevos campos
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

    // Usar la función calcularMontos actualizada (IGV será 0)
    const montos = await calcularMontos(pool, venta.ID_Pedido);

    const detallesRes = await pool.request()
      .input("ID_Pedido", sql.Int, venta.ID_Pedido)
      .query(`
        SELECT 
          pd.ID_Pedido_D, 
          pd.ID_Producto_T, 
          pd.Cantidad, 
          pd.PrecioTotal,
          pr.Nombre AS Producto_Nombre,
          t.Tamano AS Tamano_Nombre
        FROM Pedido_Detalle pd
        LEFT JOIN Producto_Tamano pt ON pd.ID_Producto_T = pt.ID_Producto_T
        LEFT JOIN Producto pr ON pt.ID_Producto = pr.ID_Producto
        LEFT JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
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
        Monto_Recibido: venta.Monto_Recibido,
        Vuelto: venta.Vuelto,
        Fecha_Registro: venta.Fecha_Registro
      },
      pedido: {
        SubTotal_Original: montos.pedidoSubTotal,
        Descuento_Aplicado: montos.descuentoMonto,
        SubTotal_Con_Cupon: montos.subtotalConCupon,
        IGV: montos.igvMonto, // Esto será 0
        Total: montos.totalFinal, // Esto será igual al subtotal con cupón
        Notas: venta.Notas || ""
      },
      cupon: montos.cuponAplicado ? {
        ID_Cupon: montos.cuponAplicado.ID_Cupon,
        Tipo_Desc: montos.cuponAplicado.Tipo_Desc,
        Valor_Desc: montos.cuponAplicado.Valor_Desc
      } : null,
      detalles: detallesRes.recordset.map(d => ({
        ID_Pedido_D: d.ID_Pedido_D,
        ID_Producto_T: d.ID_Producto_T,
        Producto_Nombre: d.Producto_Nombre,
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

// ==============================
// 🔹 Detalles de Venta - ACTUALIZADO con nuevos campos
// ==============================
exports.detallesVenta = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Se requiere ID de Venta" });

    const pool = await getConnection();

    const sqlQuery = `
      SELECT
          v.ID_Venta, v.ID_Pedido, v.Tipo_Venta, v.Metodo_Pago, v.Lugar_Emision, 
          v.IGV, v.Total, v.Monto_Recibido, v.Vuelto, v.Fecha_Registro,
          p.ID_Cliente, p.ID_Usuario, p.SubTotal, p.Notas,
          
          pd.ID_Pedido_D, pd.ID_Producto_T, pd.Cantidad, pd.PrecioTotal,
          
          c.Nombre AS Nombre_Cliente,
          CASE WHEN LEN(c.DNI) > 8 THEN NULL ELSE c.Apellido END AS Apellido_Cliente,
          c.DNI,
          
          u.Perfil AS Perfil_Usuario,
          pr.Nombre AS Nombre_Producto,
          t.Tamano AS Tamano_Nombre
      FROM
          ventas v
      JOIN
          Pedido p ON v.ID_Pedido = p.ID_Pedido
      JOIN
          Pedido_Detalle pd ON p.ID_Pedido = pd.ID_Pedido
      JOIN
          Cliente c ON p.ID_Cliente = c.ID_Cliente
      JOIN
          Usuario u ON p.ID_Usuario = u.ID_Usuario
      LEFT JOIN
          Producto_Tamano pt ON pd.ID_Producto_T = pt.ID_Producto_T
      LEFT JOIN
          Producto pr ON pt.ID_Producto = pr.ID_Producto
      LEFT JOIN
          Tamano t ON pt.ID_Tamano = t.ID_Tamano
      WHERE
          v.ID_Venta = @id
      ORDER BY
          pd.ID_Pedido_D;
    `;

    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(sqlQuery);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    // Procesamos los resultados
    const firstRow = result.recordset[0];

    const ventaInfo = {
      ID_Venta: firstRow.ID_Venta,
      ID_Pedido: firstRow.ID_Pedido,
      Tipo_Venta: firstRow.Tipo_Venta,
      Metodo_Pago: firstRow.Metodo_Pago,
      Lugar_Emision: firstRow.Lugar_Emision,
      IGV: firstRow.IGV,
      Total: firstRow.Total,
      Monto_Recibido: firstRow.Monto_Recibido,
      Vuelto: firstRow.Vuelto,
      Fecha_Registro: firstRow.Fecha_Registro,
      Notas_Pedido: firstRow.Notas || ""
    };

    const clienteInfo = {
      ID_Cliente: firstRow.ID_Cliente,
      Nombre: firstRow.Nombre_Cliente,
      Apellido: firstRow.Apellido_Cliente,
      DNI: firstRow.DNI
    };

    const usuarioInfo = {
      ID_Usuario: firstRow.ID_Usuario,
      Perfil: firstRow.Perfil_Usuario
    };

    // Mapeamos TODAS las filas para crear el array de detalles
    const detallesPedido = result.recordset.map(row => ({
      ID_Pedido_D: row.ID_Pedido_D,
      ID_Producto_T: row.ID_Producto_T,
      Producto_Nombre: row.Nombre_Producto,
      Tamano_Nombre: row.Tamano_Nombre || "Único",
      Cantidad: row.Cantidad,
      PrecioTotal: row.PrecioTotal
    }));

    // Enviamos la respuesta estructurada
    res.status(200).json({
      exito: true,
      venta: ventaInfo,
      cliente: clienteInfo,
      usuario: usuarioInfo,
      detalles: detallesPedido
    });

  } catch (err) {
    console.error("detallesVenta error:", err);
    res.status(500).json({ error: "Error al obtener los detalles de la venta" });
  }
};

// ==============================
// 🔹 Ventas del día de hoy
// ==============================
exports.getVentasHoy = async (_req, res) => {
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
        v.Monto_Recibido,
        v.Vuelto,
        STRING_AGG(CONCAT(pr.Nombre, ' (', t.Tamano, ') x ', pd.Cantidad), ', ') WITHIN GROUP (ORDER BY pd.ID_Pedido_D) AS Detalles_Pedido
      FROM Ventas v
      INNER JOIN Pedido p ON v.ID_Pedido = p.ID_Pedido
      LEFT JOIN Cliente c ON p.ID_Cliente = c.ID_Cliente
      LEFT JOIN Pedido_Detalle pd ON p.ID_Pedido = pd.ID_Pedido
      LEFT JOIN Producto_Tamano pt ON pd.ID_Producto_T = pt.ID_Producto_T
      LEFT JOIN Producto pr ON pt.ID_Producto = pr.ID_Producto
      LEFT JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
      WHERE CAST(v.Fecha_Registro AS DATE) = CAST(GETDATE() AS DATE)
      GROUP BY 
        v.ID_Venta, v.ID_Pedido, v.Tipo_Venta, v.Fecha_Registro,
        c.Nombre, p.Estado_P, v.Metodo_Pago, v.Lugar_Emision, 
        v.IGV, v.Total, v.Monto_Recibido, v.Vuelto
      ORDER BY v.Fecha_Registro DESC
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
      Monto_Recibido: r.Monto_Recibido,
      Vuelto: r.Vuelto,
      Detalles_Pedido: r.Detalles_Pedido || ""
    }));

    // Calcular estadísticas del día
    const estadisticas = {
      totalVentas: ventas.length,
      totalIngresos: ventas.reduce((sum, venta) => sum + (Number(venta.Total) || 0), 0),
      promedioVenta: ventas.length > 0 ? 
        ventas.reduce((sum, venta) => sum + (Number(venta.Total) || 0), 0) / ventas.length : 0,
      fecha: new Date().toISOString().split('T')[0]
    };

    res.status(200).json({
      ventas,
      estadisticas
    });

  } catch (err) {
    console.error("getVentasHoy error:", err);
    res.status(500).json({ error: "Error al obtener las ventas del día" });
  }
};

// ==============================
// 🔹 Ventas por período (día, semana, mes, año)
// ==============================
exports.getVentasPorPeriodo = async (req, res) => {
  try {
    const { periodo, fecha } = req.query; // periodo: 'dia', 'semana', 'mes', 'año'
    
    if (!periodo) {
      return res.status(400).json({ 
        error: "Se requiere el parámetro 'periodo' (dia, semana, mes, año)" 
      });
    }

    const pool = await getConnection();
    let whereClause = "";
    let fechaInicio, fechaFin;

    // Determinar el rango de fechas según el período
    switch (periodo.toLowerCase()) {
      case 'dia':
        const fechaConsulta = fecha ? new Date(fecha) : new Date();
        fechaInicio = new Date(fechaConsulta);
        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin = new Date(fechaConsulta);
        fechaFin.setHours(23, 59, 59, 999);
        
        whereClause = `WHERE v.Fecha_Registro BETWEEN @fechaInicio AND @fechaFin`;
        break;

      case 'semana':
        const hoy = fecha ? new Date(fecha) : new Date();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo de esta semana
        inicioSemana.setHours(0, 0, 0, 0);
        
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6); // Sábado de esta semana
        finSemana.setHours(23, 59, 59, 999);
        
        fechaInicio = inicioSemana;
        fechaFin = finSemana;
        whereClause = `WHERE v.Fecha_Registro BETWEEN @fechaInicio AND @fechaFin`;
        break;

      case 'mes':
        const añoMes = fecha ? new Date(fecha) : new Date();
        const año = añoMes.getFullYear();
        const mes = añoMes.getMonth();
        
        fechaInicio = new Date(año, mes, 1);
        fechaFin = new Date(año, mes + 1, 0, 23, 59, 59, 999);
        
        whereClause = `WHERE v.Fecha_Registro BETWEEN @fechaInicio AND @fechaFin`;
        break;

      case 'año':
        const añoConsulta = fecha ? new Date(fecha).getFullYear() : new Date().getFullYear();
        
        fechaInicio = new Date(añoConsulta, 0, 1); // 1 de Enero
        fechaFin = new Date(añoConsulta, 11, 31, 23, 59, 59, 999); // 31 de Diciembre
        
        whereClause = `WHERE v.Fecha_Registro BETWEEN @fechaInicio AND @fechaFin`;
        break;

      default:
        return res.status(400).json({ 
          error: "Período no válido. Use: dia, semana, mes, año" 
        });
    }

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
        v.Monto_Recibido,
        v.Vuelto,
        STRING_AGG(CONCAT(pr.Nombre, ' (', t.Tamano, ') x ', pd.Cantidad), ', ') WITHIN GROUP (ORDER BY pd.ID_Pedido_D) AS Detalles_Pedido
      FROM Ventas v
      INNER JOIN Pedido p ON v.ID_Pedido = p.ID_Pedido
      LEFT JOIN Cliente c ON p.ID_Cliente = c.ID_Cliente
      LEFT JOIN Pedido_Detalle pd ON p.ID_Pedido = pd.ID_Pedido
      LEFT JOIN Producto_Tamano pt ON pd.ID_Producto_T = pt.ID_Producto_T
      LEFT JOIN Producto pr ON pt.ID_Producto = pr.ID_Producto
      LEFT JOIN Tamano t ON pt.ID_Tamano = t.ID_Tamano
      ${whereClause}
      GROUP BY 
        v.ID_Venta, v.ID_Pedido, v.Tipo_Venta, v.Fecha_Registro,
        c.Nombre, p.Estado_P, v.Metodo_Pago, v.Lugar_Emision, 
        v.IGV, v.Total, v.Monto_Recibido, v.Vuelto
      ORDER BY v.Fecha_Registro DESC
    `;

    const request = pool.request();
    
    if (whereClause) {
      request.input("fechaInicio", sql.DateTime, fechaInicio);
      request.input("fechaFin", sql.DateTime, fechaFin);
    }

    const result = await request.query(sqlQuery);

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
      Monto_Recibido: r.Monto_Recibido,
      Vuelto: r.Vuelto,
      Detalles_Pedido: r.Detalles_Pedido || ""
    }));

    // Calcular estadísticas del período
    const estadisticas = {
      periodo: periodo.toLowerCase(),
      fechaConsulta: fecha || 'actual',
      totalVentas: ventas.length,
      totalIngresos: ventas.reduce((sum, venta) => sum + (Number(venta.Total) || 0), 0),
      promedioVenta: ventas.length > 0 ? 
        ventas.reduce((sum, venta) => sum + (Number(venta.Total) || 0), 0) / ventas.length : 0,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString()
    };

    res.status(200).json({
      ventas,
      estadisticas
    });

  } catch (err) {
    console.error("getVentasPorPeriodo error:", err);
    res.status(500).json({ error: "Error al obtener las ventas por período" });
  }
};

// ==============================
// 🔹 Estadísticas de ventas (resumen general)
// ==============================
exports.getEstadisticasVentas = async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Estadísticas del día
    const hoy = await pool.request().query(`
      SELECT 
        COUNT(*) as totalVentasHoy,
        COALESCE(SUM(Total), 0) as ingresosHoy
      FROM Ventas 
      WHERE CAST(Fecha_Registro AS DATE) = CAST(GETDATE() AS DATE)
    `);

    // Estadísticas de la semana
    const semana = await pool.request().query(`
      SELECT 
        COUNT(*) as totalVentasSemana,
        COALESCE(SUM(Total), 0) as ingresosSemana
      FROM Ventas 
      WHERE Fecha_Registro >= DATEADD(day, 1-DATEPART(weekday, GETDATE()), CAST(GETDATE() AS DATE))
        AND Fecha_Registro < DATEADD(day, 8-DATEPART(weekday, GETDATE()), CAST(GETDATE() AS DATE))
    `);

    // Estadísticas del mes
    const mes = await pool.request().query(`
      SELECT 
        COUNT(*) as totalVentasMes,
        COALESCE(SUM(Total), 0) as ingresosMes
      FROM Ventas 
      WHERE MONTH(Fecha_Registro) = MONTH(GETDATE()) 
        AND YEAR(Fecha_Registro) = YEAR(GETDATE())
    `);

    // Métodos de pago más usados
    const metodosPago = await pool.request().query(`
      SELECT 
        Metodo_Pago,
        COUNT(*) as cantidad,
        SUM(Total) as total
      FROM Ventas
      WHERE CAST(Fecha_Registro AS DATE) = CAST(GETDATE() AS DATE)
      GROUP BY Metodo_Pago
      ORDER BY cantidad DESC
    `);

    res.status(200).json({
      estadisticas: {
        hoy: {
          totalVentas: hoy.recordset[0]?.totalVentasHoy || 0,
          ingresos: Number(hoy.recordset[0]?.ingresosHoy || 0)
        },
        semana: {
          totalVentas: semana.recordset[0]?.totalVentasSemana || 0,
          ingresos: Number(semana.recordset[0]?.ingresosSemana || 0)
        },
        mes: {
          totalVentas: mes.recordset[0]?.totalVentasMes || 0,
          ingresos: Number(mes.recordset[0]?.ingresosMes || 0)
        }
      },
      metodosPago: metodosPago.recordset.map(mp => ({
        metodo: mp.Metodo_Pago,
        cantidad: mp.cantidad,
        total: Number(mp.total || 0)
      }))
    });

  } catch (err) {
    console.error("getEstadisticasVentas error:", err);
    res.status(500).json({ error: "Error al obtener las estadísticas de ventas" });
  }
};