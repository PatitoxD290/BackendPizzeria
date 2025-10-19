// 1. Categoría
const Categoria = {
  categoria_id: 0,
  nombre_categoria: "",
  descripcion_categoria: ""
};

// 2. Tamaño de Pizza
const TamanoPizza = {
  tamano_id: 0,
  nombre_tamano: "",
  porciones: "",
  descripcion: ""
};

// 3. Proveedor
const Proveedor = {
  proveedor_id: 0,
  nombre_proveedor: "",
  ruc: "",
  direccion: "",
  telefono: "",
  email: "",
  persona_contacto: "",
  estado: "A",
  fecha_registro: ""
};

// 4. Ingrediente / Insumo
const Ingrediente = {
  ingrediente_id: 0,
  nombre_ingrediente: "",
  descripcion_ingrediente: "",
  unidad_medida: "",
  categoria_ingrediente: "",
  stock_minimo: 0,
  stock_maximo: 0,
  estado: "A",
  fecha_registro: ""
};

// 5. Receta (cabecera)
const Receta = {
  receta_id: 0,
  nombre_receta: "",
  descripcion_receta: "",
  tiempo_estimado_minutos: 0
};

// 6. Detalle de Receta
const DetalleReceta = {
  detalle_receta_id: 0,
  receta_id: 0,
  ingrediente_id: 0,
  cantidad_requerida: 0.0,
  unidad_medida: "",
  descripcion_uso: ""
};

// 7. Producto
const Producto = {
  producto_id: 0,
  nombre_producto: "",
  descripcion_producto: "",
  categoria_id: 0,
  receta_id: null,
  precio_venta: 0.0,
  estado: "A",
  fecha_registro: ""
};

// 7.1. Precios por tamaño
const PrecioProducto = {
  precio_id: 0,
  producto_id: 0,
  tamano_id: null,
  precio: 0.0,
  activo: true,
  fecha_registro: ""
};

// 8. Stock (entrada de inventario)
const Stock = {
  stock_id: 0,
  ingrediente_id: 0,
  proveedor_id: 0,
  numero_lote: "",
  cantidad_recibida: 0,
  costo_unitario: 0.0,
  costo_total: 0.0,
  fecha_entrada: "",
  fecha_vencimiento: "",
  estado: "A"
};

// 9. Movimiento de Stock
const MovimientoStock = {
  movimiento_id: 0,
  ingrediente_id: 0,
  stock_id: 0,
  tipo_movimiento: "", // ENTRADA, SALIDA, AJUSTE
  cantidad: 0,
  stock_actual: 0,
  fecha_movimiento: "",
  motivo: "",
  registrado_por: "",
  usuario_id: null
};

// 10. Cliente
const Cliente = {
  cliente_id: 0,
  nombre_completo: "",
  dni: "",
  fecha_registro: ""
};

// 11. Cupón
const Cupon = {
  cupon_id: 0,
  codigo_cupon: "",
  descripcion: "",
  tipo_descuento: "", // PORCENTAJE o MONTO
  valor_descuento: 0.0,
  monto_minimo: 0.0,
  usos_maximos: 0,
  usos_actuales: 0,
  fecha_inicio: "",
  fecha_fin: "",
  estado: "A",
  fecha_registro: ""
};

// 12. Usuario
const Usuario = {
  usuario_id: 0,
  dni: "",
  password: "",
  nombre_completo: "",
  rol: "", // ADMIN o EMPLEADO
  estado: "A",
  fecha_registro: ""
};

// 13. Pedido (cabecera)
const Pedido = {
  pedido_id: 0,
  cliente_id: 0,
  usuario_id: null,
  fecha_pedido: "",
  hora_pedido: "",
  estado_pedido: "PENDIENTE",
  subtotal: 0.0,
  monto_descuento: 0.0,
  total: 0.0,
  notas_generales: "",
  fecha_registro: ""
};

// 14. Detalle de Pedido
const DetallePedido = {
  detalle_pedido_id: 0,
  pedido_id: 0,
  producto_id: 0,
  tamano_id: null,
  cantidad: 0,
  precio_unitario: 0.0,
  subtotal: 0.0,
  notas_producto: ""
};

// 15. Venta
const Venta = {
  venta_id: 0,
  pedido_id: 0,
  tipo_comprobante: "", // FACTURA o BOLETA
  fecha_venta: "",
  usuario_id: null,
  lugar_emision: "",
  metodo_pago: "",
  subtotal: 0.0,
  igv: 0.0,
  total: 0.0
};

// 16. Uso de Cupón
const UsoCupon = {
  uso_cupon_id: 0,
  cupon_id: 0,
  pedido_id: 0,
  cliente_id: 0,
  descuento_aplicado: 0.0,
  monto_venta: 0.0,
  fecha_uso: ""
};

// Exportar todos los modelos
module.exports = {
  Categoria,
  TamanoPizza,
  Proveedor,
  Ingrediente,
  Receta,
  DetalleReceta,
  Producto,
  PrecioProducto,
  Stock,
  MovimientoStock,
  Cliente,
  Cupon,
  Usuario,
  Pedido,
  DetallePedido,
  Venta,
  UsoCupon
};
