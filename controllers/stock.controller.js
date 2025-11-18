const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mappers (respetando bd.models.js y DDL)
// ==============================
function mapToStock(row = {}) {
  const template = bdModel?.Stock || {
    ID_Stock: 0,
    ID_Insumo: 0,
    ID_Proveedor: null,
    Cantidad_Recibida: 0,
    Costo_Unitario: 0.0,
    Costo_Total: 0.0,
    Fecha_Entrada: "",
    Fecha_Vencimiento: null,
    Estado: "A"
  };

  return {
    ...template,
    ID_Stock: row.ID_Stock ?? template.ID_Stock,
    ID_Insumo: row.ID_Insumo ?? template.ID_Insumo,
    ID_Proveedor: row.ID_Proveedor ?? template.ID_Proveedor,
    Cantidad_Recibida: row.Cantidad_Recibida ?? template.Cantidad_Recibida,
    Costo_Unitario: row.Costo_Unitario ?? template.Costo_Unitario,
    Costo_Total: row.Costo_Total ?? template.Costo_Total,
    Fecha_Entrada: row.Fecha_Entrada ?? template.Fecha_Entrada,
    Fecha_Vencimiento: row.Fecha_Vencimiento ?? template.Fecha_Vencimiento,
    Estado: row.Estado ?? template.Estado
  };
}

function mapToMovimientoStock(row = {}) {
  const template = bdModel?.StockMovimiento || {
    ID_Stock_M: 0,
    ID_Stock: 0,
    Tipo_Mov: "Entrada",
    Motivo: null,
    Cantidad: 0,
    Stock_ACT: 0,
    Usuario_ID: null,
    Fecha_Mov: "",
    Estado: "A"
  };

  return {
    ...template,
    ID_Stock_M: row.ID_Stock_M ?? template.ID_Stock_M,
    ID_Stock: row.ID_Stock ?? template.ID_Stock,
    Tipo_Mov: row.Tipo_Mov ?? template.Tipo_Mov,
    Motivo: row.Motivo ?? template.Motivo,
    Cantidad: row.Cantidad ?? template.Cantidad,
    Stock_ACT: row.Stock_ACT ?? template.Stock_ACT,
    Usuario_ID: row.Usuario_ID ?? template.Usuario_ID,
    Fecha_Mov: row.Fecha_Mov ?? template.Fecha_Mov,
    Estado: row.Estado ?? template.Estado
  };
}

// ==============================
// 🔧 Función auxiliar: Actualizar estado del insumo basado en stock (VERSIÓN CORREGIDA)
// ==============================
async function actualizarEstadoInsumo(ID_Insumo, pool, transaction = null) {
  try {
    // Crear un NUEVO request para evitar conflictos de parámetros
    const newRequest = transaction ? new sql.Request(transaction) : new sql.Request(pool);
    
    // Obtener el stock actual y el stock mínimo del insumo
    const result = await newRequest
      .input("InsumoID", sql.Int, ID_Insumo) // Usar nombre diferente
      .query(`
        SELECT 
          s.Cantidad_Recibida,
          i.Stock_Min
        FROM Stock s
        INNER JOIN Insumos i ON s.ID_Insumo = i.ID_Insumo
        WHERE s.ID_Insumo = @InsumoID AND s.Estado = 'A'
      `);

    if (result.recordset.length > 0) {
      const stock = result.recordset[0];
      const cantidadRecibida = stock.Cantidad_Recibida || 0;
      const stockMin = stock.Stock_Min || 0;
      
      // Determinar el estado basado en la comparación
      const nuevoEstado = cantidadRecibida < stockMin ? 'A' : 'D';
      
      // Crear OTRO NUEVO request para la actualización
      const updateRequest = transaction ? new sql.Request(transaction) : new sql.Request(pool);
      
      // Actualizar el estado del insumo
      await updateRequest
        .input("EstadoParam", sql.Char(1), nuevoEstado)
        .input("InsumoIDUpdate", sql.Int, ID_Insumo) // Usar nombre diferente
        .query("UPDATE Insumos SET Estado = @EstadoParam WHERE ID_Insumo = @InsumoIDUpdate");
      
      console.log(`✅ Estado del insumo ${ID_Insumo} actualizado a: ${nuevoEstado} (Cantidad: ${cantidadRecibida}, Mínimo: ${stockMin})`);
      return nuevoEstado;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error al actualizar estado del insumo ${ID_Insumo}:`, error);
    throw error;
  }
}

// ==============================
// 📘 Obtener todos los registros de stock (activos)
// ==============================
exports.getStocks = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query("SELECT * FROM Stock WHERE Estado = 'A' ORDER BY Fecha_Entrada DESC");
    const stocks = (result.recordset || []).map(mapToStock);
    return res.status(200).json(stocks);
  } catch (err) {
    console.error("getStocks error:", err);
    return res.status(500).json({ error: "Error al obtener los registros de stock" });
  }
};

// ==============================
// 📘 Obtener un registro de stock por ID
// ==============================
exports.getStockById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Stock WHERE ID_Stock = @id AND Estado = 'A'");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Registro de stock no encontrado" });
    }

    return res.status(200).json(mapToStock(result.recordset[0]));
  } catch (err) {
    console.error("getStockById error:", err);
    return res.status(500).json({ error: "Error al obtener el registro de stock" });
  }
};

// ==============================
// 📗 Crear un nuevo registro de stock
// ==============================
exports.createStock = async (req, res) => {
  const {
    ID_Insumo,
    ID_Proveedor,
    Cantidad_Recibida,
    Costo_Unitario,
    Costo_Total, // Este campo será ignorado y calculado automáticamente
    Fecha_Entrada,
    Fecha_Vencimiento,
    Estado
  } = req.body;

  try {
    if (!ID_Insumo || Cantidad_Recibida == null || Costo_Unitario == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: ID_Insumo, Cantidad_Recibida o Costo_Unitario"
      });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);
      
      // 🔥 CALCULAR COSTO_TOTAL AUTOMÁTICAMENTE
      const costoTotalCalc = Number((Cantidad_Recibida * Costo_Unitario).toFixed(2));
      
      console.log(`💰 Cálculo automático de Costo_Total: ${Cantidad_Recibida} * ${Costo_Unitario} = ${costoTotalCalc}`);

      let proveedorValue = ID_Proveedor;
      if (ID_Proveedor === "" || ID_Proveedor === null || ID_Proveedor === undefined) {
        proveedorValue = null;
      }

      await request
        .input("ID_Insumo", sql.Int, ID_Insumo)
        .input("ID_Proveedor", sql.Int, proveedorValue)
        .input("Cantidad_Recibida", sql.Int, Cantidad_Recibida)
        .input("Costo_Unitario", sql.Decimal(10, 2), Costo_Unitario)
        .input("Costo_Total", sql.Decimal(10, 2), costoTotalCalc) // Usar el cálculo automático
        .input("Fecha_Entrada", sql.Date, Fecha_Entrada || new Date())
        .input("Fecha_Vencimiento", sql.Date, Fecha_Vencimiento || null)
        .input("Estado", sql.Char(1), Estado || "A")
        .query(`
          INSERT INTO Stock (
            ID_Insumo, ID_Proveedor, Cantidad_Recibida,
            Costo_Unitario, Costo_Total, Fecha_Entrada, Fecha_Vencimiento, Estado
          ) VALUES (
            @ID_Insumo, @ID_Proveedor, @Cantidad_Recibida,
            @Costo_Unitario, @Costo_Total, @Fecha_Entrada, @Fecha_Vencimiento, @Estado
          )
        `);

      // 🔄 ACTUALIZAR ESTADO DEL INSUMO AUTOMÁTICAMENTE
      await actualizarEstadoInsumo(ID_Insumo, pool, transaction);

      await transaction.commit();
      return res.status(201).json({ 
        message: "Registro de stock creado correctamente",
        costo_calculado: costoTotalCalc // Opcional: devolver el cálculo para verificación
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("createStock error:", err);
    return res.status(500).json({ error: "Error al registrar el stock" });
  }
};

// ==============================
// 📙 Actualizar un registro de stock (VERSIÓN CORREGIDA - SIN DUPLICACIÓN)
// ==============================
exports.updateStock = async (req, res) => {
  const { id } = req.params;
  const {
    ID_Insumo,
    ID_Proveedor,
    Cantidad_Recibida,
    Costo_Unitario,
    Costo_Total, // Este campo será ignorado y calculado automáticamente
    Fecha_Vencimiento,
    Estado
  } = req.body;

  try {
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);
      
      // 🔥 CALCULAR COSTO_TOTAL AUTOMÁTICAMENTE
      const costoTotalCalc = Number((Cantidad_Recibida * Costo_Unitario).toFixed(2));
      
      console.log(`💰 Actualización - Cálculo automático de Costo_Total: ${Cantidad_Recibida} * ${Costo_Unitario} = ${costoTotalCalc}`);

      // Manejar ID_Proveedor null o vacío
      let proveedorValue = ID_Proveedor;
      if (ID_Proveedor === "" || ID_Proveedor === null || ID_Proveedor === undefined) {
        proveedorValue = null;
      }

      request.input("id", sql.Int, id);
      request.input("ID_Insumo", sql.Int, ID_Insumo);
      request.input("ID_Proveedor", sql.Int, proveedorValue);
      request.input("Cantidad_Recibida", sql.Int, Cantidad_Recibida);
      request.input("Costo_Unitario", sql.Decimal(10, 2), Costo_Unitario);
      request.input("Costo_Total", sql.Decimal(10, 2), costoTotalCalc); // Usar el cálculo automático
      request.input("Fecha_Vencimiento", sql.Date, Fecha_Vencimiento);
      request.input("Estado", sql.Char(1), Estado);

      const result = await request.query(`
        UPDATE Stock
        SET
          ID_Insumo = @ID_Insumo,
          ID_Proveedor = @ID_Proveedor,
          Cantidad_Recibida = @Cantidad_Recibida,
          Costo_Unitario = @Costo_Unitario,
          Costo_Total = @Costo_Total,
          Fecha_Vencimiento = @Fecha_Vencimiento,
          Estado = @Estado
        WHERE ID_Stock = @id
      `);

      if (result.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: "Registro de stock no encontrado" });
      }

      // 🔄 ACTUALIZAR ESTADO DEL INSUMO AUTOMÁTICAMENTE
      await actualizarEstadoInsumo(ID_Insumo, pool, transaction);

      await transaction.commit();
      return res.status(200).json({ 
        message: "Registro de stock actualizado correctamente",
        costo_calculado: costoTotalCalc // Opcional: devolver el cálculo para verificación
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("updateStock error:", err);
    return res.status(500).json({ error: "Error al actualizar el stock" });
  }
};

// ==============================
// 📘 Obtener movimientos de stock (activos)
// ==============================
exports.getMovimientosStock = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query("SELECT * FROM Stock_Movimiento WHERE Tipo_Mov IS NOT NULL ORDER BY Fecha_Mov DESC");
    const movimientos = (result.recordset || []).map(mapToMovimientoStock);
    return res.status(200).json(movimientos);
  } catch (err) {
    console.error("getMovimientosStock error:", err);
    return res.status(500).json({ error: "Error al obtener los movimientos de stock" });
  }
};

// ==============================
// 📘 Obtener un movimiento de stock por ID
// ==============================
exports.getMovimientoStockById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Stock_Movimiento WHERE ID_Stock_M = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    return res.status(200).json(mapToMovimientoStock(result.recordset[0]));
  } catch (err) {
    console.error("getMovimientoStockById error:", err);
    return res.status(500).json({ error: "Error al obtener el movimiento de stock" });
  }
};

// ==============================
// 📗 Crear movimiento de stock y actualizar Stock (transaccional)
// ==============================
exports.createMovimientoStock = async (req, res) => {
  const {
    ID_Stock,
    Tipo_Mov,
    Motivo,
    Cantidad
  } = req.body;

  try {
    if (!ID_Stock || !Tipo_Mov || Cantidad == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: ID_Stock, Tipo_Mov o Cantidad"
      });
    }

    const Usuario_ID = req.user?.ID_Usuario || null;
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Obtener stock actual, ID_Insumo y Costo_Unitario
      const reqGetStock = new sql.Request(transaction);
      reqGetStock.input("ID_Stock", sql.Int, ID_Stock);
      const stockRes = await reqGetStock.query(`
        SELECT s.Cantidad_Recibida, s.ID_Insumo, s.Costo_Unitario 
        FROM Stock s 
        WHERE s.ID_Stock = @ID_Stock
      `);

      if (!stockRes.recordset.length) {
        await transaction.rollback();
        return res.status(400).json({ error: `Registro de stock no encontrado: ${ID_Stock}` });
      }

      const actual = Number(stockRes.recordset[0].Cantidad_Recibida ?? 0);
      const ID_Insumo = stockRes.recordset[0].ID_Insumo;
      const costoUnitario = Number(stockRes.recordset[0].Costo_Unitario ?? 0);
      const tipoNorm = String(Tipo_Mov).toLowerCase();

      let nuevoStock;
      if (tipoNorm === "entrada" || tipoNorm === "entradas") {
        nuevoStock = actual + Number(Cantidad);
      } else if (tipoNorm === "salida" || tipoNorm === "salidas") {
        nuevoStock = actual - Number(Cantidad);
        if (nuevoStock < 0) nuevoStock = 0;
      } else if (tipoNorm === "ajuste") {
        nuevoStock = actual + Number(Cantidad);
        if (nuevoStock < 0) nuevoStock = 0;
      } else {
        await transaction.rollback();
        return res.status(400).json({ error: "Tipo_Mov inválido. Use 'Entrada', 'Salida' o 'Ajuste'." });
      }

      // 🔥 CALCULAR NUEVO COSTO_TOTAL BASADO EN LA NUEVA CANTIDAD
      const nuevoCostoTotal = Number((nuevoStock * costoUnitario).toFixed(2));
      
      console.log(`💰 Movimiento - Nuevo Costo_Total: ${nuevoStock} * ${costoUnitario} = ${nuevoCostoTotal}`);

      // Insertar movimiento
      const reqInsMov = new sql.Request(transaction);
      await reqInsMov
        .input("ID_Stock", sql.Int, ID_Stock)
        .input("Tipo_Mov", sql.VarChar(50), Tipo_Mov)
        .input("Motivo", sql.VarChar(100), Motivo || null)
        .input("Cantidad", sql.Int, Cantidad)
        .input("Stock_ACT", sql.Int, nuevoStock)
        .input("Usuario_ID", sql.Int, Usuario_ID)
        .input("Fecha_Mov", sql.DateTime, new Date())
        .query(`
          INSERT INTO Stock_Movimiento (
            ID_Stock, Tipo_Mov, Motivo, Cantidad, Stock_ACT, Usuario_ID, Fecha_Mov
          ) VALUES (
            @ID_Stock, @Tipo_Mov, @Motivo, @Cantidad, @Stock_ACT, @Usuario_ID, @Fecha_Mov
          )
        `);

      // Actualizar Stock.cantidad_recibida Y Costo_Total
      await new sql.Request(transaction)
        .input("nuevoStock", sql.Int, nuevoStock)
        .input("nuevoCostoTotal", sql.Decimal(10, 2), nuevoCostoTotal)
        .input("ID_Stock", sql.Int, ID_Stock)
        .query(`
          UPDATE Stock 
          SET Cantidad_Recibida = @nuevoStock, 
              Costo_Total = @nuevoCostoTotal 
          WHERE ID_Stock = @ID_Stock
        `);

      // 🔄 ACTUALIZAR ESTADO DEL INSUMO AUTOMÁTICAMENTE
      await actualizarEstadoInsumo(ID_Insumo, pool, transaction);

      await transaction.commit();
      return res.status(201).json({ 
        message: "Movimiento registrado y stock actualizado correctamente", 
        Stock_ACT: nuevoStock,
        Costo_Total_Actualizado: nuevoCostoTotal,
        Usuario_ID: Usuario_ID
      });
    } catch (err) {
      await transaction.rollback();
      console.error("createMovimientoStock transaction error:", err);
      return res.status(500).json({ error: "Error al registrar movimiento de stock" });
    }
  } catch (err) {
    console.error("createMovimientoStock error:", err);
    return res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};

// ==============================
// 📙 Actualizar movimiento de stock
// ==============================
exports.updateMovimientoStock = async (req, res) => {
  const { id } = req.params;
  const {
    Tipo_Mov,
    Motivo,
    Cantidad
  } = req.body;

  try {
    const pool = await getConnection();
    
    // Verificar si existe el movimiento
    const check = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT ID_Stock_M FROM Stock_Movimiento WHERE ID_Stock_M = @id");
    
    if (!check.recordset.length) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    // Obtener el usuario del token
    const Usuario_ID = req.user?.ID_Usuario || null;

    // Construir la consulta UPDATE dinámicamente
    let updateFields = [];
    let request = pool.request();
    
    request.input("id", sql.Int, id);

    if (Tipo_Mov !== undefined) {
      updateFields.push("Tipo_Mov = @Tipo_Mov");
      request.input("Tipo_Mov", sql.VarChar(50), Tipo_Mov);
    }

    if (Motivo !== undefined) {
      updateFields.push("Motivo = @Motivo");
      request.input("Motivo", sql.VarChar(100), Motivo || null);
    }

    if (Cantidad !== undefined) {
      updateFields.push("Cantidad = @Cantidad");
      request.input("Cantidad", sql.Int, Cantidad);
    }

    // Siempre actualizar el Usuario_ID con el usuario del token
    updateFields.push("Usuario_ID = @Usuario_ID");
    request.input("Usuario_ID", sql.Int, Usuario_ID);

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    const updateQuery = `
      UPDATE Stock_Movimiento 
      SET ${updateFields.join(", ")}
      WHERE ID_Stock_M = @id
    `;

    const result = await request.query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    return res.status(200).json({ message: "Movimiento de stock actualizado correctamente" });
  } catch (err) {
    console.error("updateMovimientoStock error:", err);
    return res.status(500).json({ error: "Error al actualizar el movimiento de stock" });
  }
};

// ==============================
// 🔧 Función auxiliar: Obtener stock por ID_Insumo
// ==============================
exports.getStockByInsumoId = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Stock WHERE ID_Insumo = @id AND Estado = 'A'");

    const stocks = (result.recordset || []).map(mapToStock);
    return res.status(200).json(stocks);
  } catch (err) {
    console.error("getStockByInsumoId error:", err);
    return res.status(500).json({ error: "Error al obtener el stock del insumo" });
  }
};