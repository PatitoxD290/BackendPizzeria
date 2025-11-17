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
    Stock_Max,
    Estado,
    // Nuevos campos para stock/proveedor
    ID_Proveedor,
    Costo_Unitario,
    Fecha_Vencimiento
  } = req.body;

  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    // validar campos obligatorios según tu DDL
    if (!Nombre || !Unidad_Med || ID_Categoria_I == null) {
      return res.status(400).json({
        error: "Faltan campos obligatorios: Nombre, Unidad_Med o ID_Categoria_I"
      });
    }

    await transaction.begin();

    // 1. Insertar el insumo
    const requestInsumo = new sql.Request(transaction);
    const resultInsumo = await requestInsumo
      .input("Nombre", sql.VarChar(100), Nombre)
      .input("Descripcion", sql.VarChar(255), Descripcion || "")
      .input("Unidad_Med", sql.VarChar(50), Unidad_Med)
      .input("ID_Categoria_I", sql.Int, ID_Categoria_I)
      .input("Stock_Min", sql.Int, (Stock_Min ?? 0))
      .input("Stock_Max", sql.Int, (Stock_Max ?? 0))
      .input("Estado", sql.Char(1), (Estado || "D")) // Por defecto 'D' (Disponible)
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
// 📙 Actualizar un insumo (CON VERIFICACIÓN DE STOCK)
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
    Estado
  } = req.body;

  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

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

    if (Estado !== undefined) {
      query += " Estado = @Estado,";
      request.input("Estado", sql.Char(1), Estado);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      await transaction.rollback();
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    // quitar coma final y agregar WHERE
    query = query.slice(0, -1);
    query += " WHERE ID_Insumo = @id";

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    // 2. Verificar si existe stock para este insumo, si no existe, crearlo
    const checkStock = await new sql.Request(transaction)
      .input("ID_Insumo", sql.Int, id)
      .query("SELECT ID_Stock FROM Stock WHERE ID_Insumo = @ID_Insumo AND Estado = 'A'");

    if (!checkStock.recordset.length) {
      console.log(`🔄 No existe stock para insumo ${id}, creando automáticamente...`);
      await crearStockAutomatico(id, pool, transaction);
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
// 📕 Eliminar un insumo (CON ELIMINACIÓN DE STOCK RELACIONADO)
// ==============================
exports.deleteInsumo = async (req, res) => {
  const { id } = req.params;
  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Primero eliminamos o desactivamos el stock relacionado
    const deleteStockResult = await new sql.Request(transaction)
      .input("id", sql.Int, id)
      .query(`
        UPDATE Stock SET Estado = 'I' 
        WHERE ID_Insumo = @id AND Estado = 'A'
      `);

    console.log(`📦 Stock desactivado para insumo ID: ${id}`);

    // 2. Luego eliminamos el insumo
    const result = await new sql.Request(transaction)
      .input("id", sql.Int, id)
      .query("DELETE FROM Insumos WHERE ID_Insumo = @id");

    if (result.rowsAffected[0] === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    await transaction.commit();
    return res.status(200).json({ 
      message: "Insumo eliminado correctamente junto con su stock relacionado" 
    });

  } catch (err) {
    await transaction.rollback();
    console.error("deleteInsumo error:", err);
    return res.status(500).json({ error: "Error al eliminar el insumo" });
  }
};