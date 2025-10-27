// ===============================
// 1. CATEGORÍA PRODUCTO
// ===============================
const CategoriaProducto = {
  ID_Categoria_P: 0,
  Nombre: ""
};

// ===============================
// 2. CATEGORÍA INSUMOS
// ===============================
const CategoriaInsumos = {
  ID_Categoria_I: 0,
  Nombre: ""
};

// ===============================
// 3. PROVEEDOR
// ===============================
const Proveedor = {
  ID_Proveedor: 0,
  Nombre: "",
  Ruc: "",
  Direccion: "",
  Telefono: "",
  Email: "",
  Persona_Contacto: "",
  Estado: "A", // A=Activo, I=Inactivo
  Fecha_Registro: ""
};

// ===============================
// 4. INSUMOS
// ===============================
const Insumo = {
  ID_Insumo: 0,
  Nombre: "",
  Descripcion: "",
  Unidad_Med: "",
  ID_Categoria_I: 0,
  Stock_Min: 0,
  Stock_Max: 0,
  Estado: "D", // D=Disponible, A=Agotado
  Fecha_Registro: ""
};

// ===============================
// 5. RECETA
// ===============================
const Receta = {
  ID_Receta: 0,
  Nombre: "",
  Descripcion: "",
  Tiempo_Preparacion: "" // formato HH:MM:SS
};

// ===============================
// 6. RECETA DETALLE
// ===============================
const RecetaDetalle = {
  ID_Receta_D: 0,
  ID_Receta: 0,
  ID_Insumo: 0,
  Cantidad: 0,
  Uso: ""
};

// ===============================
// 7. PRODUCTO
// ===============================
const Producto = {
  ID_Producto: 0,
  Nombre: "",
  Descripcion: "",
  Precio_Base: 0.0,
  ID_Categoria_P: 0,
  ID_Receta: null,
  Estado: "A", // A=Activo, I=Inactivo
  Fecha_Registro: ""
};

// ===============================
// 8. STOCK
// ===============================
const Stock = {
  ID_Stock: 0,
  ID_Insumo: 0,
  ID_Proveedor: 0,
  Cantidad_Recibida: 0,
  Costo_Unitario: 0.0,
  Costo_Total: 0.0,
  Fecha_Entrada: "",
  Fecha_Vencimiento: "",
  Estado: "A" // A=Activo, I=Inactivo, C=Caducado
};

// ===============================
// 9. STOCK MOVIMIENTO
// ===============================
const StockMovimiento = {
  ID_Stock_M: 0,
  ID_Stock: 0,
  Tipo_Mov: "Entrada", // Entrada | Salida | Ajuste
  Motivo: "",
  Cantidad: 0,
  Stock_ACT: 0,
  Usuario_ID: null,
  Fecha_Mov: ""
};

// ===============================
// 10. CUPONES
// ===============================
const Cupon = {
  ID_Cupon: 0,
  Cod_Cupon: "",
  Descripcion: "",
  Tipo_Desc: "Porcentaje", // Porcentaje | Monto
  Valor_Desc: 0.0,
  Monto_Max: 0.0,
  Usos_Max: 1,
  Usos_Act: 0,
  Fecha_INC: "",
  Fecha_FIN: "",
  Estado: "A", // A=Activo, I=Inactivo
  Fecha_Registro: ""
};

// ===============================
// 11. CLIENTE
// ===============================
const Cliente = {
  ID_Cliente: 0,
  DNI: "",
  Nombre: "",
  Apellido: "",
  Telefono: "",
  Fecha_Registro: ""
};

// ===============================
// 12. TAMAÑO
// ===============================
const Tamano = {
  ID_Tamano: 0,
  Tamano: "",
  Variacion_Precio: 0.0
};

// ===============================
// 13. USUARIO
// ===============================
const Usuario = {
  ID_Usuario: 0,
  Perfil: "",
  Correo: "",
  Password: "",
  Roll: "E", // A=Admin, E=Empleado
  Estado: "A", // A=Activo, I=Inactivo
  Fecha_Registro: ""
};

// ===============================
// 14. PEDIDO
// ===============================
const Pedido = {
  ID_Pedido: 0,
  ID_Cliente: 0,
  ID_Usuario: 0,
  Notas: "",
  SubTotal: 0.0,
  Estado_P: "P", // P=Pendiente, C=Cancelado, E=Entregado, D=En preparación
  Fecha_Registro: "",
  Hora_Pedido: ""
};

// ===============================
// 15. PEDIDO DETALLE
// ===============================
const PedidoDetalle = {
  ID_Pedido_D: 0,
  ID_Pedido: 0,
  ID_Producto: 0,
  ID_Tamano: 0,
  Cantidad: 1,
  PrecioTotal: 0.0
};

// ===============================
// 16. USO CUPÓN
// ===============================
const UsoCupon = {
  ID_Uso_C: 0,
  ID_Cupon: 0,
  ID_Pedido: 0,
  Descuento_Aplic: 0.0,
  Monto_Venta: 0.0,
  Fecha_Uso: ""
};

// ===============================
// 17. VENTAS
// ===============================
const Venta = {
  ID_Venta: 0,
  ID_Pedido: 0,
  Tipo_Venta: "N", // B=Boleta, F=Factura, N=Nota
  Metodo_Pago: "B", // E=Efectivo, T=Tarjeta, B=Billetera
  Lugar_Emision: "B", // A=Tupac, B=Yarina
  IGV: 0.0,
  Total: 0.0,
  Fecha_Registro: ""
};

// ===============================
// 18. DELIVERY
// ===============================
const Delivery = {
  ID_Delivery: 0,
  ID_Pedido: 0,
  Direccion: "",
  Estado_D: "P" // E=Entregado, P=Pendiente, C=Cancelado
};

// ===============================
// 19. COMBOS
// ===============================
const Combo = {
  ID_Combo: 0,
  Nombre: "",
  Descripcion: "",
  Precio: 0.0,
  Estado: "A"
};

// ===============================
// 20. COMBOS DETALLE
// ===============================
const ComboDetalle = {
  ID_Combo_D: 0,
  ID_Combo: 0,
  ID_Producto: 0,
  ID_Tamano: 0,
  Cantidad: 1
};

// ===============================
// EXPORTAR TODOS LOS MODELOS
// ===============================
module.exports = {
  CategoriaProducto,
  CategoriaInsumos,
  Proveedor,
  Insumo,
  Receta,
  RecetaDetalle,
  Producto,
  Stock,
  StockMovimiento,
  Cupon,
  Cliente,
  Tamano,
  Usuario,
  Pedido,
  PedidoDetalle,
  UsoCupon,
  Venta,
  Delivery,
  Combo,
  ComboDetalle
};
