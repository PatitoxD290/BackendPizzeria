//1 Categoría
const Categoria = {
  category_id: 0,
  category_name: "",
  category_description: ""
};

//2 Tamaño de pizza
const TamanoPizza = {
  size_id: 0,
  size_name: "",
  slices: 0,
  description: ""
};

//3 Proveedor
const Proveedor = {
  supplier_id: 0,
  supplier_name: "",
  tax_id: "",
  address: "",
  phone: "",
  email: "",
  contact_person: "",
  status: "ACTIVE",
  registration_date: ""
};

//4 Ingrediente / Insumo
const Ingrediente = {
  ingredient_id: 0,
  ingredient_name: "",
  ingredient_description: "",
  unit_of_measure: "",
  ingredient_category: "",
  min_stock: 0,
  max_stock: 0,
  status: "ACTIVE",
  registration_date: ""
};

//5 Receta (cabecera)
const Receta = {
  recipe_id: 0,
  recipe_name: "",
  recipe_description: "",
  estimated_time_minutes: 0
};

//6 Detalle de Receta
const DetalleReceta = {
  recipe_detail_id: 0,
  recipe_id: 0,
  ingredient_id: 0,
  required_quantity: 0,
  unit_of_measure: "",
  usage_description: ""
};

//7 Producto
const Producto = {
  product_id: 0,
  product_name: "",
  product_description: "",
  category_id: 0,
  recipe_id: null,
  sale_price: 0.0
};

//8 Stock (entrada de inventario)
const Stock = {
  stock_id: 0,
  ingredient_id: 0,
  supplier_id: 0,
  batch_number: "",
  quantity_received: 0,
  unit_cost: 0.0,
  total_cost: 0.0,
  entry_date: "",
  expiration_date: "",
  status: "RECEIVED"
};

//9 Movimiento de Stock
const MovimientoStock = {
  movement_id: 0,
  ingredient_id: 0,
  stock_id: 0,
  movement_type: "INCOME",
  quantity: 0,
  current_stock: 0,
  movement_date: "",
  reason: "",
  registered_by: ""
};

//10 Cliente
const Cliente = {
  customer_id: 0,
  first_name: "",
  last_name: "",
  id_number: ""
};

//11 Cupón
const Cupon = {
  coupon_id: 0,
  coupon_code: "",
  description: "",
  discount_type: "PERCENTAGE",
  discount_value: 0.0,
  minimum_amount: 0.0,
  max_uses: 0,
  current_uses: 0,
  start_date: "",
  end_date: "",
  status: "ACTIVE",
  registration_date: ""
};

//12 Puntos del Cliente
const PuntosCliente = {
  points_id: 0,
  customer_id: 0,
  accumulated_points: 0,
  used_points: 0,
  available_points: 0,
  update_date: ""
};

//13 Pedido (cabecera)
const Pedido = {
  order_id: 0,
  customer_id: 0,
  order_date: "",
  order_time: "",
  order_status: "PENDING",
  registration_date: "",
  product_id: 0,
  size_id: null,
  quantity: 1,
  notes: "",
  subtotal: 0.0
};

//14 Venta
const Venta = {
  sale_id: 0,
  sale_type: "BOLETA",
  sale_date: "",
  order_id: null,
  place: "",
  payment_method: "EFECTIVO",
  subtotal: 0.0,
  igv: 0.0,
  total_amount: 0.0
};

//15 Venta_Detalle
const VentaDetalle = {
  sale_detail_id: 0,
  sale_id: 0,
  order_id: 0
};

//16 Uso de Cupón
const UsoCupon = {
  coupon_usage_id: 0,
  coupon_id: 0,
  order_id: 0,
  customer_id: 0,
  discount_applied: 0.0,
  sale_amount: 0.0,
  usage_date: ""
};
