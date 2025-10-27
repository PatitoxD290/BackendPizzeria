const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// Mapper simple (respetando bd.models.js)
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
// 📘 Listar ventas (enriquecido)
// ==============================
exports.getVentas = async (_req, res) => {
  try {
    const pool = await getConnection();

    // Obtenemos ventas con cliente y detalles concatenados (SQL Server STRING_AGG)
    const sqlQuery = `
      SELECT 
        v.ID_Venta,
        v.ID_Pedido,
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
        v.ID_Venta, v.ID_Pedido, c.Nombre, p.Estado_P, v.Metodo_Pago, v.Lugar_Emision, v.IGV, v.Total
      ORDER BY v.ID_Venta DESC
    `;

    const result = await pool.request().query(sqlQuery);
    const ventas = (result.recordset || []).map(r => ({
      ID_Venta: r.ID_Venta,
      ID_Pedido: r.ID_Pedido,
      Cliente_Nombre: r.Cliente_Nombre,
      Estado_Pedido: r.Estado_P,
      Metodo_Pago: r.Metodo_Pago,
      Lugar_Emision: r.Lugar_Emision,
      IGV: r.IGV,
      Total: r.Total,
      Detalles_Pedido: r.Detalles_Pedido || ""
    }));

    return res.status(200).json(ventas);
  } catch (err) {
    console.error("getVentas error:", err);
    return res.status(500).json({ error: "Error al obtener las ventas" });
  }
};

// ==============================
// 📘 Obtener venta por ID simple
// ==============================
exports.getVentaById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Ventas WHERE ID_Venta = @id");

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
// 📗 Crear venta (calcula descuento por cupón, IGV y total)
// ==============================
exports.createVenta = async (req, res) => {
  const {
    ID_Pedido,
    Tipo_Venta,      // B | F | N
    Metodo_Pago,     // E | T | B
    Lugar_Emision,   // A | B (u otro)
    IGV_Porcentaje,  // opcional: porcentaje (ej. 18). Si no llega, 18% por defecto.
    Usuario_ID
  } = req.body;

  try {
    if (!ID_Pedido || !Tipo_Venta || !Metodo_Pago) {
      return res.status(400).json({ error: "Faltan campos obligatorios: ID_Pedido, Tipo_Venta o Metodo_Pago" });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1) Verificar que el pedido exista y obtener su SubTotal (original)
      const reqPedido = new sql.Request(transaction);
      const pedidoRes = await reqPedido
        .input("ID_Pedido", sql.Int, ID_Pedido)
        .query("SELECT SubTotal FROM Pedido WHERE ID_Pedido = @ID_Pedido");

      if (!pedidoRes.recordset.length) {
        await transaction.rollback();
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      const pedidoSubTotal = Number(pedidoRes.recordset[0].SubTotal ?? 0);

      // 2) Buscar si hay un Uso_Cupon para este pedido (tomamos el más reciente si hay varios)
      const reqCupon = new sql.Request(transaction);
      const usoRes = await reqCupon
        .input("ID_Pedido", sql.Int, ID_Pedido)
        .query(`
          SELECT uc.ID_Uso_C, uc.ID_Cupon, uc.Descuento_Aplic, uc.Monto_Venta,
                 c.Tipo_Desc, c.Valor_Desc, c.Monto_Max
          FROM Uso_Cupon uc
          LEFT JOIN Cupones c ON uc.ID_Cupon = c.ID_Cupon
          WHERE uc.ID_Pedido = @ID_Pedido
          ORDER BY uc.Fecha_Uso DESC
        `);

      // definir descuento aplicado en monto
      let descuentoMonto = 0.0;
      let cuponAplicado = null;

      if (usoRes.recordset.length) {
        const uso = usoRes.recordset[0];
        cuponAplicado = {
          ID_Uso_C: uso.ID_Uso_C,
          ID_Cupon: uso.ID_Cupon,
          Tipo_Desc: uso.Tipo_Desc,
          Valor_Desc: Number(uso.Valor_Desc ?? 0),
          Monto_Max: Number(uso.Monto_Max ?? 0),
          Descuento_Aplic: Number(uso.Descuento_Aplic ?? 0) // si ya se guardó el monto aplicado
        };

        // Si en Uso_Cupon ya hay Descuento_Aplic (registro del flujo anterior), lo usamos
        if (cuponAplicado.Descuento_Aplic && cuponAplicado.Descuento_Aplic > 0) {
          descuentoMonto = cuponAplicado.Descuento_Aplic;
        } else {
          // calcular según la definición del cupón (Tipo_Desc)
          if (String(cuponAplicado.Tipo_Desc).toLowerCase() === "porcentaje") {
            descuentoMonto = +(pedidoSubTotal * (cuponAplicado.Valor_Desc / 100));
            // aplicar tope si existe Monto_Max > 0
            if (cuponAplicado.Monto_Max && cuponAplicado.Monto_Max > 0 && descuentoMonto > cuponAplicado.Monto_Max) {
              descuentoMonto = cuponAplicado.Monto_Max;
            }
          } else { // Tipo_Desc = 'Monto' u otro: valor fijo
            descuentoMonto = cuponAplicado.Valor_Desc || 0;
            // igualmente respetar Monto_Max si está definido (por si aplica)
            if (cuponAplicado.Monto_Max && cuponAplicado.Monto_Max > 0 && descuentoMonto > cuponAplicado.Monto_Max) {
              descuentoMonto = cuponAplicado.Monto_Max;
            }
          }
          // redondear a 2 decimales
          descuentoMonto = Number(descuentoMonto.toFixed(2));
        }
      }

      // 3) Subtotal luego del descuento
      const subtotalConCupon = Math.max(0, +(pedidoSubTotal - descuentoMonto));

      // 4) Calcular IGV (usar IGV_Porcentaje si viene, sino 18%)
      const igvPercent = (IGV_Porcentaje != null && !isNaN(Number(IGV_Porcentaje))) ? Number(IGV_Porcentaje) : 18;
      const igvMonto = Number((subtotalConCupon * (igvPercent / 100)).toFixed(2));

      // 5) Total final
      const totalFinal = Number((subtotalConCupon + igvMonto).toFixed(2));

      // 6) Insertar en Ventas, guardando IGV (monto) y Total
      const reqIns = new sql.Request(transaction);
      const insertSql = `
        INSERT INTO Ventas (
          ID_Pedido, Tipo_Venta, Metodo_Pago, Lugar_Emision, IGV, Total
        ) OUTPUT INSERTED.ID_Venta
        VALUES (
          @ID_Pedido, @Tipo_Venta, @Metodo_Pago, @Lugar_Emision, @IGV, @Total
        )
      `;

      const insertRes = await reqIns
        .input("ID_Pedido", sql.Int, ID_Pedido)
        .input("Tipo_Venta", sql.VarChar(1), Tipo_Venta)
        .input("Metodo_Pago", sql.Char(1), Metodo_Pago)
        .input("Lugar_Emision", sql.Char(1), Lugar_Emision || "B")
        .input("IGV", sql.Decimal(10, 2), igvMonto)
        .input("Total", sql.Decimal(10, 2), totalFinal)
        .query(insertSql);

      const nuevoID_Venta = insertRes.recordset && insertRes.recordset[0] ? insertRes.recordset[0].ID_Venta : null;

      // 7) Si había cupon y no tenía Descuento_Aplic registrado, actualizar Uso_Cupon.Descuento_Aplic (opcional)
      if (cuponAplicado && (!cuponAplicado.Descuento_Aplic || cuponAplicado.Descuento_Aplic === 0)) {
        const reqUpdUso = new sql.Request(transaction);
        await reqUpdUso
          .input("ID_Uso_C", sql.Int, cuponAplicado.ID_Uso_C)
          .input("Descuento_Aplic", sql.Decimal(10,2), descuentoMonto)
          .query("UPDATE Uso_Cupon SET Descuento_Aplic = @Descuento_Aplic WHERE ID_Uso_C = @ID_Uso_C");
      }

      await transaction.commit();

      // Respuesta con desglose
      return res.status(201).json({
        message: "Venta registrada correctamente",
        ID_Venta: nuevoID_Venta,
        ID_Pedido,
        SubTotal_Pedido: pedidoSubTotal,
        Descuento_Aplicado: descuentoMonto,
        SubTotal_Con_Cupon: subtotalConCupon,
        IGV_Porcentaje: igvPercent,
        IGV: igvMonto,
        Total: totalFinal,
        Cupon_Aplicado: cuponAplicado ? { ID_Cupon: cuponAplicado.ID_Cupon, Tipo_Desc: cuponAplicado.Tipo_Desc, Valor_Desc: cuponAplicado.Valor_Desc } : null
      });

    } catch (err) {
      await transaction.rollback();
      console.error("createVenta transaction error:", err);
      return res.status(500).json({ error: "Error al registrar la venta" });
    }
  } catch (err) {
    console.error("createVenta error:", err);
    return res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};

// ==============================
// 🧾 Datos para boleta/factura (desglose detallado)
// ==============================
exports.datosBoletaVenta = async (req, res) => {
  const { id } = req.params; // ID_Venta
  try {
    const pool = await getConnection();

    // 1) Obtener venta y pedido
    const ventaRes = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT v.*, p.SubTotal AS Pedido_SubTotal, p.Notas
        FROM Ventas v
        INNER JOIN Pedido p ON v.ID_Pedido = p.ID_Pedido
        WHERE v.ID_Venta = @id
      `);

    if (!ventaRes.recordset.length) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    const venta = ventaRes.recordset[0];
    const pedidoSubTotal = Number(venta.Pedido_SubTotal ?? 0);

    // 2) Obtener uso de cupon (si existiera) para ese pedido
    const usoRes = await pool.request()
      .input("ID_Pedido", sql.Int, venta.ID_Pedido)
      .query(`
        SELECT uc.*, c.Tipo_Desc, c.Valor_Desc, c.Monto_Max
        FROM Uso_Cupon uc
        LEFT JOIN Cupones c ON uc.ID_Cupon = c.ID_Cupon
        WHERE uc.ID_Pedido = @ID_Pedido
        ORDER BY uc.Fecha_Uso DESC
      `);

    let descuentoMonto = 0;
    let cuponInfo = null;
    if (usoRes.recordset.length) {
      const uso = usoRes.recordset[0];
      cuponInfo = {
        ID_Uso_C: uso.ID_Uso_C,
        ID_Cupon: uso.ID_Cupon,
        Tipo_Desc: uso.Tipo_Desc,
        Valor_Desc: uso.Valor_Desc,
        Monto_Max: uso.Monto_Max
      };
      // preferimos Descuento_Aplic si ya guardado
      if (uso.Descuento_Aplic && Number(uso.Descuento_Aplic) > 0) {
        descuentoMonto = Number(uso.Descuento_Aplic);
      } else if (uso.Tipo_Desc) {
        if (String(uso.Tipo_Desc).toLowerCase() === "porcentaje") {
          descuentoMonto = +(pedidoSubTotal * (Number(uso.Valor_Desc) / 100));
          if (uso.Monto_Max && Number(uso.Monto_Max) > 0 && descuentoMonto > Number(uso.Monto_Max)) {
            descuentoMonto = Number(uso.Monto_Max);
          }
        } else {
          descuentoMonto = Number(uso.Valor_Desc || 0);
          if (uso.Monto_Max && Number(uso.Monto_Max) > 0 && descuentoMonto > Number(uso.Monto_Max)) {
            descuentoMonto = Number(uso.Monto_Max);
          }
        }
      }
      descuentoMonto = Number(descuentoMonto.toFixed(2));
    }

    // 3) subtotal con cupon y igv
    const subtotalConCupon = Math.max(0, +(pedidoSubTotal - descuentoMonto));
    const igvMonto = Number(venta.IGV ?? 0); // suponemos que en la tabla ya está el monto IGV guardado
    const totalVenta = Number(venta.Total ?? (subtotalConCupon + igvMonto));

    // 4) Detalles del pedido (productos y cantidades)
    const detallesRes = await pool.request()
      .input("ID_Pedido", sql.Int, venta.ID_Pedido)
      .query(`
        SELECT pd.ID_Pedido_D, pd.ID_Producto, pd.ID_Tamano, pd.Cantidad, pd.PrecioTotal,
               pr.Nombre AS Producto_Nombre,
               t.Tamano AS Tamano_Nombre, t.Variacion_Precio
        FROM Pedido_Detalle pd
        LEFT JOIN Producto pr ON pd.ID_Producto = pr.ID_Producto
        LEFT JOIN Tamano t ON pd.ID_Tamano = t.ID_Tamano
        WHERE pd.ID_Pedido = @ID_Pedido
        ORDER BY pd.ID_Pedido_D
      `);

    const detalles = (detallesRes.recordset || []).map(d => ({
      ID_Pedido_D: d.ID_Pedido_D,
      ID_Producto: d.ID_Producto,
      Producto_Nombre: d.Producto_Nombre,
      ID_Tamano: d.ID_Tamano,
      Tamano_Nombre: d.Tamano_Nombre,
      Cantidad: d.Cantidad,
      PrecioTotal: d.PrecioTotal
    }));

    return res.status(200).json({
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
        SubTotal_Original: pedidoSubTotal,
        Descuento_Aplicado: descuentoMonto,
        SubTotal_Con_Cupon: subtotalConCupon,
        IGV: igvMonto,
        Total: totalVenta,
        Notas: venta.Notas || ""
      },
      cupon: cuponInfo,
      detalles
    });

  } catch (err) {
    console.error("datosBoletaVenta error:", err);
    return res.status(500).json({ error: "Error al obtener los datos de la venta" });
  }
};