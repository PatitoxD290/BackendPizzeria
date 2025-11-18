const { sql, getConnection } = require("../config/Connection");
const bdModel = require("../models/bd.models");

// ==============================
// 🔄 Mapper: adapta una fila SQL al modelo Insumo
// ==============================
function mapToInsumo(row = {}) {
  const template = bdModel?.Insumo || {
    ID_Insumo: 0,
    Nombre: "",
    Descripcion: "",
    Unidad_Med: "",
    ID_Categoria_I: 0,
    Stock_Min: 0,
    Stock_Max: 0,
    Estado: "D",
    Fecha_Registro: ""
  };

  return {
    ...template,
    ID_Insumo: row.ID_Insumo ?? template.ID_Insumo,
    Nombre: row.Nombre ?? template.Nombre,
    Descripcion: row.Descripcion ?? template.Descripcion,
    Unidad_Med: row.Unidad_Med ?? template.Unidad_Med,
    ID_Categoria_I: row.ID_Categoria_I ?? template.ID_Categoria_I,
    Stock_Min: row.Stock_Min ?? template.Stock_Min,
    Stock_Max: row.Stock_Max ?? template.Stock_Max,
    Estado: row.Estado ?? template.Estado,
    Fecha_Registro: row.Fecha_Registro ?? template.Fecha_Registro
  };
}

// ==============================
// 🔧 Función auxiliar: Crear registro de stock automáticamente
// ==============================
async function crearStockAutomatico(ID_Insumo, pool, transaction = null) {
  try {
    const request = transaction ? new sql.Request(transaction) : pool.request();
    
    await request
      .input("ID_Insumo", sql.Int, ID_Insumo)
      .input("ID_Proveedor", sql.Int, null)
      .input("Cantidad_Recibida", sql.Int, 0)
      .input("Costo_Unitario", sql.Decimal(10, 2), 0.0)
      .input("Costo_Total", sql.Decimal(10, 2), 0.0)
      .input("Fecha_Entrada", sql.Date, new Date())
      .input("Fecha_Vencimiento", sql.Date, null)
      .input("Estado", sql.Char(1), "A")
      .query(`
        INSERT INTO Stock (
          ID_Insumo, ID_Proveedor, Cantidad_Recibida,
          Costo_Unitario, Costo_Total, Fecha_Entrada, Fecha_Vencimiento, Estado
        ) VALUES (
          @ID_Insumo, @ID_Proveedor, @Cantidad_Recibida,
          @Costo_Unitario, @Costo_Total, @Fecha_Entrada, @Fecha_Vencimiento, @Estado
        )
      `);
    
    console.log(`✅ Stock creado automáticamente para insumo ID: ${ID_Insumo}`);
    return true;
  } catch (error) {
    console.error(`❌ Error al crear stock automático para insumo ${ID_Insumo}:`, error);
    throw error;
  }
}

// ==============================
// 📘 Obtener todos los insumos
// ==============================
exports.getInsumos = async (_req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM Insumos ORDER BY Nombre ASC");
    const insumos = (result.recordset || []).map(mapToInsumo);
    return res.status(200).json(insumos);
  } catch (err) {
    console.error("getInsumos error:", err);
    return res.status(500).json({ error: "Error al obtener los insumos" });
  }
};

// ==============================
// 📘 Obtener un insumo por ID
// ==============================
exports.getInsumoById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Insumos WHERE ID_Insumo = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    return res.status(200).json(mapToInsumo(result.recordset[0]));
  } catch (err) {
    console.error("getInsumoById error:", err);
    return res.status(500).json({ error: "Error al obtener el insumo" });
  }
};

// ==============================
// 🔧 Función auxiliar: Crear stock con proveedor
// ==============================
async function crearStockConProveedor(ID_Insumo, ID_Proveedor, Costo_Unitario, Fecha_Vencimiento, pool, transaction = null) {
  try {
    const request = transaction ? new sql.Request(transaction) : pool.request();
    
    // Manejar valores null/undefined
    const proveedorValue = (ID_Proveedor === "" || ID_Proveedor === null || ID_Proveedor === undefined) ? null : ID_Proveedor;
    const costoValue = Costo_Unitario != null ? Costo_Unitario : 0.0;
    const fechaVencValue = (Fecha_Vencimiento === "" || Fecha_Vencimiento === null || Fecha_Vencimiento === undefined) ? null : Fecha_Vencimiento;
    
    await request
      .input("ID_Insumo", sql.Int, ID_Insumo)
      .input("ID_Proveedor", sql.Int, proveedorValue)
      .input("Cantidad_Recibida", sql.Int, 0)
      .input("Costo_Unitario", sql.Decimal(10, 2), costoValue)
      .input("Costo_Total", sql.Decimal(10, 2), 0.0)
      .input("Fecha_Entrada", sql.Date, new Date())
      .input("Fecha_Vencimiento", sql.Date, fechaVencValue)
      .input("Estado", sql.Char(1), "A")
      .query(`
        INSERT INTO Stock (
          ID_Insumo, ID_Proveedor, Cantidad_Recibida,
          Costo_Unitario, Costo_Total, Fecha_Entrada, Fecha_Vencimiento, Estado
        ) VALUES (
          @ID_Insumo, @ID_Proveedor, @Cantidad_Recibida,
          @Costo_Unitario, @Costo_Total, @Fecha_Entrada, @Fecha_Vencimiento, @Estado
        )
      `);
    
    console.log(`✅ Stock creado con proveedor para insumo ID: ${ID_Insumo}`);
    return true;
  } catch (error) {
    console.error(`❌ Error al crear stock con proveedor para insumo ${ID_Insumo}:`, error);
    throw error;
  }
}

// ==============================
// 📗 Crear un nuevo insumo (CON STOCK Y PROVEEDOR)
// ==============================
exports.createInsumo = async (req, res) => {
  const {
    Nombre,
    Descripcion,
    Unidad_Med,
    ID_Categoria_I,
    Stock_Min,
    // Stock_Max removido - se establecerá automáticamente
    Estado,
    // Nuevos campos para stock/proveedor
    ID_Proveedor,
    Costo_Unitario,
    Fecha_Vencimiento
  } = req.body;

  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    // validar campos obligatorios (Descripción es opcional ahora)
    if (!Nombre || !Unidad_Med || ID_Categoria_I == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: Nombre, Unidad_Med o ID_Categoria_I"
      });
    }

    await transaction.begin();

    // 1. Insertar el insumo con Stock_Max automático = 1000
    const requestInsumo = new sql.Request(transaction);
    const resultInsumo = await requestInsumo
      .input("Nombre", sql.VarChar(100), Nombre)
      .input("Descripcion", sql.VarChar(255), Descripcion || "") // Descripción opcional
      .input("Unidad_Med", sql.VarChar(50), Unidad_Med)
      .input("ID_Categoria_I", sql.Int, ID_Categoria_I)
      .input("Stock_Min", sql.Int, (Stock_Min ?? 0))
      .input("Stock_Max", sql.Int, 1000) // 🔥 VALOR AUTOMÁTICO 1000
      .input("Estado", sql.Char(1), "D") // Siempre crear como "Disponible" inicialmente
      .input("Fecha_Registro", sql.DateTime, new Date())
      .query(`
        INSERT INTO Insumos (
          Nombre, Descripcion, Unidad_Med,
          ID_Categoria_I, Stock_Min, Stock_Max, Estado, Fecha_Registro
        ) OUTPUT INSERTED.ID_Insumo
        VALUES (
          @Nombre, @Descripcion, @Unidad_Med,
          @ID_Categoria_I, @Stock_Min, @Stock_Max, @Estado, @Fecha_Registro
        )
      `);

    if (!resultInsumo.recordset.length) {
      await transaction.rollback();
      return res.status(500).json({ error: "Error al obtener el ID del insumo creado" });
    }

    const ID_Insumo = resultInsumo.recordset[0].ID_Insumo;

    // 2. Crear registro de stock con datos del proveedor
    await crearStockConProveedor(
      ID_Insumo, 
      ID_Proveedor, 
      Costo_Unitario, 
      Fecha_Vencimiento, 
      pool, 
      transaction
    );

    await transaction.commit();
    return res.status(201).json({ 
      message: "Insumo registrado correctamente con stock inicial",
      ID_Insumo: ID_Insumo
    });

  } catch (err) {
    await transaction.rollback();
    console.error("createInsumo error:", err);
    return res.status(500).json({ error: "Error al registrar el insumo" });
  }
};

// ==============================
// 📙 Actualizar un insumo (CON VERIFICACIÓN DE STOCK - VERSIÓN CORREGIDA)
// ==============================
exports.updateInsumo = async (req, res) => {
  const { id } = req.params;
  const {
    Nombre,
    Descripcion,
    Unidad_Med,
    ID_Categoria_I,
    Stock_Min,
    Stock_Max,
    // Estado removido - el backend lo maneja automáticamente
    ID_Proveedor,
    Costo_Unitario,
    Fecha_Vencimiento
  } = req.body;

  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Primero actualizar el insumo
    const request = new sql.Request(transaction);
    request.input("id", sql.Int, id);

    let query = "UPDATE Insumos SET";
    let hasUpdates = false;

    if (Nombre !== undefined) {
      query += " Nombre = @Nombre,";
      request.input("Nombre", sql.VarChar(100), Nombre);
      hasUpdates = true;
    }

    if (Descripcion !== undefined) {
      query += " Descripcion = @Descripcion,";
      request.input("Descripcion", sql.VarChar(255), Descripcion);
      hasUpdates = true;
    }

    if (Unidad_Med !== undefined) {
      query += " Unidad_Med = @Unidad_Med,";
      request.input("Unidad_Med", sql.VarChar(50), Unidad_Med);
      hasUpdates = true;
    }

    if (ID_Categoria_I !== undefined) {
      query += " ID_Categoria_I = @ID_Categoria_I,";
      request.input("ID_Categoria_I", sql.Int, ID_Categoria_I);
      hasUpdates = true;
    }

    if (Stock_Min !== undefined) {
      query += " Stock_Min = @Stock_Min,";
      request.input("Stock_Min", sql.Int, Stock_Min);
      hasUpdates = true;
    }

    if (Stock_Max !== undefined) {
      query += " Stock_Max = @Stock_Max,";
      request.input("Stock_Max", sql.Int, Stock_Max);
      hasUpdates = true;
    }

    // 🔥 ELIMINADO: No permitir actualizar Estado manualmente
    // El backend lo maneja automáticamente basado en el stock

    if (!hasUpdates && !ID_Proveedor && !Costo_Unitario && !Fecha_Vencimiento) {
      await transaction.rollback();
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    if (hasUpdates) {
      // quitar coma final y agregar WHERE
      query = query.slice(0, -1);
      query += " WHERE ID_Insumo = @id";

      const result = await request.query(query);

      if (result.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: "Insumo no encontrado" });
      }
    }

    // 2. Actualizar datos de stock/proveedor si se proporcionaron
    if (ID_Proveedor !== undefined || Costo_Unitario !== undefined || Fecha_Vencimiento !== undefined) {
      await actualizarStockConProveedor(
        id, 
        ID_Proveedor, 
        Costo_Unitario, 
        Fecha_Vencimiento, 
        pool, 
        transaction
      );
    }

    // 3. ACTUALIZAR ESTADO DEL INSUMO BASADO EN EL STOCK ACTUAL
    // Usar un NUEVO request para evitar conflictos de parámetros
    const estadoRequest = new sql.Request(transaction);
    const stockResult = await estadoRequest
      .input("InsumoID", sql.Int, id)
      .query(`
        SELECT 
          s.Cantidad_Recibida,
          i.Stock_Min
        FROM Stock s
        INNER JOIN Insumos i ON s.ID_Insumo = i.ID_Insumo
        WHERE s.ID_Insumo = @InsumoID AND s.Estado = 'A'
      `);

    if (stockResult.recordset.length > 0) {
      const stock = stockResult.recordset[0];
      const cantidadRecibida = stock.Cantidad_Recibida || 0;
      const stockMin = stock.Stock_Min || 0;
      
      const nuevoEstado = cantidadRecibida < stockMin ? 'A' : 'D';
      
      const updateEstadoRequest = new sql.Request(transaction);
      await updateEstadoRequest
        .input("EstadoParam", sql.Char(1), nuevoEstado)
        .input("InsumoIDUpdate", sql.Int, id)
        .query("UPDATE Insumos SET Estado = @EstadoParam WHERE ID_Insumo = @InsumoIDUpdate");
      
      console.log(`✅ Estado del insumo ${id} actualizado a: ${nuevoEstado}`);
    }

    await transaction.commit();
    return res.status(200).json({ message: "Insumo actualizado correctamente" });

  } catch (err) {
    await transaction.rollback();
    console.error("updateInsumo error:", err);
    return res.status(500).json({ error: "Error al actualizar el insumo" });
  }
};

// ==============================
// 📕 Eliminar un insumo (CON ELIMINACIÓN EN ORDEN CORRECTO - VERSIÓN CORREGIDA)
// ==============================
exports.deleteInsumo = async (req, res) => {
  const { id } = req.params;
  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    console.log(`🔍 Intentando eliminar insumo ID: ${id}`);

    // 1. PRIMERO: Verificar que el insumo existe
    const checkInsumo = await new sql.Request(transaction)
      .input("id", sql.Int, id)
      .query("SELECT ID_Insumo FROM Insumos WHERE ID_Insumo = @id");

    if (checkInsumo.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    // 2. SEGUNDO: Eliminar primero los movimientos de stock relacionados
    console.log(`🗑️ Eliminando movimientos de stock relacionados para insumo ID: ${id}`);
    const deleteMovimientosResult = await new sql.Request(transaction)
      .input("id", sql.Int, id)
      .query(`
        DELETE FROM Stock_Movimiento 
        WHERE ID_Stock IN (SELECT ID_Stock FROM Stock WHERE ID_Insumo = @id)
      `);
    
    console.log(`✅ Movimientos eliminados: ${deleteMovimientosResult.rowsAffected[0]} registros`);

    // 3. TERCERO: Ahora eliminar los registros de Stock
    console.log(`🗑️ Eliminando registros de Stock para insumo ID: ${id}`);
    const deleteStockResult = await new sql.Request(transaction)
      .input("id", sql.Int, id)
      .query("DELETE FROM Stock WHERE ID_Insumo = @id");

    console.log(`✅ Stock eliminado: ${deleteStockResult.rowsAffected[0]} registros`);

    // 4. CUARTO: Finalmente eliminar el insumo
    console.log(`🗑️ Eliminando insumo ID: ${id}`);
    const result = await new sql.Request(transaction)
      .input("id", sql.Int, id)
      .query("DELETE FROM Insumos WHERE ID_Insumo = @id");

    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: "Insumo no encontrado después de eliminar stock" });
    }

    // ✅ TRANSACCIÓN EXITOSA - Hacer commit
    await transaction.commit();
    
    console.log(`✅ Insumo ID: ${id} eliminado correctamente`);
    return res.status(200).json({ 
      message: "Insumo eliminado correctamente junto con su stock relacionado",
      ID_Insumo: parseInt(id),
      stock_eliminado: deleteStockResult.rowsAffected[0],
      movimientos_eliminados: deleteMovimientosResult.rowsAffected[0]
    });

  } catch (err) {
    // 🔴 MANEJO DE ERRORES - Verificar si la transacción está activa antes del rollback
    try {
      // Verificar si la transacción aún está activa
      if (transaction._aborted === false && transaction._setRollback === false) {
        await transaction.rollback();
        console.log("❌ Transacción revertida debido a error");
      } else {
        console.log("ℹ️ Transacción ya estaba cerrada, no se requiere rollback");
      }
    } catch (rollbackError) {
      console.error("❌ Error al intentar hacer rollback:", rollbackError.message);
    }
    
    console.error("❌ deleteInsumo error:", err);
    
    // Manejar errores específicos de constraint
    if (err.number === 547) {
      return res.status(409).json({ 
        error: "No se puede eliminar el insumo porque está siendo utilizado en otras tablas del sistema",
        details: "El insumo puede estar relacionado con recetas, productos u otros registros del sistema"
      });
    }
    
    return res.status(500).json({ 
      error: "Error al eliminar el insumo",
      details: err.message 
    });
  }
};
// 🔧 Función auxiliar: Actualizar stock con proveedor
async function actualizarStockConProveedor(ID_Insumo, ID_Proveedor, Costo_Unitario, Fecha_Vencimiento, pool, transaction = null) {
  try {
    const request = transaction ? new sql.Request(transaction) : pool.request();
    
    // Manejar valores null/undefined
    const proveedorValue = (ID_Proveedor === "" || ID_Proveedor === null || ID_Proveedor === undefined) ? null : ID_Proveedor;
    const costoValue = Costo_Unitario != null ? Costo_Unitario : 0.0;
    const fechaVencValue = (Fecha_Vencimiento === "" || Fecha_Vencimiento === null || Fecha_Vencimiento === undefined) ? null : Fecha_Vencimiento;
    
    // Verificar si ya existe un stock activo para este insumo
    const checkStock = await request
      .input("ID_Insumo", sql.Int, ID_Insumo)
      .query("SELECT ID_Stock FROM Stock WHERE ID_Insumo = @ID_Insumo AND Estado = 'A'");

    if (checkStock.recordset.length > 0) {
      // Actualizar stock existente
      await request
        .input("ID_Proveedor", sql.Int, proveedorValue)
        .input("Costo_Unitario", sql.Decimal(10, 2), costoValue)
        .input("Fecha_Vencimiento", sql.Date, fechaVencValue)
        .query(`
          UPDATE Stock SET 
            ID_Proveedor = @ID_Proveedor,
            Costo_Unitario = @Costo_Unitario,
            Fecha_Vencimiento = @Fecha_Vencimiento
          WHERE ID_Insumo = @ID_Insumo AND Estado = 'A'
        `);
      console.log(`✅ Stock actualizado para insumo ID: ${ID_Insumo}`);
    } else {
      // Crear nuevo stock si no existe
      await crearStockConProveedor(ID_Insumo, ID_Proveedor, Costo_Unitario, Fecha_Vencimiento, pool, transaction);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error al actualizar stock para insumo ${ID_Insumo}:`, error);
    throw error;
  }
}

// ==============================
// 🔧 Función auxiliar: Actualizar estado del insumo basado en stock
// ==============================
async function actualizarEstadoInsumo(ID_Insumo, pool, transaction = null) {
  try {
    const request = transaction ? new sql.Request(transaction) : pool.request();
    
    // Obtener el stock actual y el stock mínimo del insumo
    const result = await request
      .input("ID_Insumo", sql.Int, ID_Insumo)
      .query(`
        SELECT 
          s.Cantidad_Recibida,
          i.Stock_Min
        FROM Stock s
        INNER JOIN Insumos i ON s.ID_Insumo = i.ID_Insumo
        WHERE s.ID_Insumo = @ID_Insumo AND s.Estado = 'A'
      `);

    if (result.recordset.length > 0) {
      const stock = result.recordset[0];
      const cantidadRecibida = stock.Cantidad_Recibida || 0;
      const stockMin = stock.Stock_Min || 0;
      
      // Determinar el estado basado en la comparación
      const nuevoEstado = cantidadRecibida < stockMin ? 'A' : 'D';
      
      // Actualizar el estado del insumo
      await request
        .input("NuevoEstado", sql.Char(1), nuevoEstado)
        .input("ID_Insumo", sql.Int, ID_Insumo)
        .query("UPDATE Insumos SET Estado = @NuevoEstado WHERE ID_Insumo = @ID_Insumo");
      
      console.log(`✅ Estado del insumo ${ID_Insumo} actualizado a: ${nuevoEstado} (Cantidad: ${cantidadRecibida}, Mínimo: ${stockMin})`);
      return nuevoEstado;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error al actualizar estado del insumo ${ID_Insumo}:`, error);
    throw error;
  }
}