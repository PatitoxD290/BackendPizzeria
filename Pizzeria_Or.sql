SET NOCOUNT ON;
GO

-- ============================================
-- BASE DE DATOS: SISTEMA DE PIZZERÍA
-- Versión: 2.0 Corregida (modificado: clientes reducido + puntos_cliente agregado)
-- Idioma: Español
-- ============================================

-- ORIGEN: //1 Categorías
CREATE TABLE categorias (
    categoria_id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_categoria VARCHAR(100) NOT NULL,
    descripcion_categoria TEXT NULL
);
GO

-- ORIGEN: //2 Tamaños de pizza
CREATE TABLE tamanos_pizza (
    tamano_id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_tamano VARCHAR(50) NOT NULL,           
    porciones VARCHAR(20) NOT NULL,               
    descripcion TEXT NULL
);
GO

-- ORIGEN: //3 Proveedores
CREATE TABLE proveedores (
    proveedor_id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_proveedor VARCHAR(255) NOT NULL,
    ruc VARCHAR(20) NOT NULL UNIQUE,              
    direccion VARCHAR(255) NULL,
    telefono VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    persona_contacto VARCHAR(100) NULL,
    estado CHAR(1) NOT NULL DEFAULT 'A',          
    fecha_registro DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- ORIGEN: //4 Usuarios
CREATE TABLE usuarios (
    usuario_id INT IDENTITY(1,1) PRIMARY KEY,
    dni VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,               
    nombre_completo VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('ADMIN','EMPLEADO')),
    estado CHAR(1) NOT NULL DEFAULT 'A',          
    fecha_registro DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- ORIGEN: //5 Ingredientes 
CREATE TABLE ingredientes (
    ingrediente_id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_ingrediente VARCHAR(255) NOT NULL,
    descripcion_ingrediente TEXT NULL,
    unidad_medida VARCHAR(50) NOT NULL,           
    categoria_ingrediente VARCHAR(100) NULL,      
    stock_minimo INT NOT NULL DEFAULT 0,
    stock_maximo INT NOT NULL DEFAULT 1000,
    estado CHAR(1) NOT NULL DEFAULT 'A',
    fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT chk_ingredientes_stock CHECK (stock_maximo >= stock_minimo)
);
GO

-- ORIGEN: //6 Recetas (cabecera)
CREATE TABLE recetas (
    receta_id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_receta VARCHAR(255) NULL,
    descripcion_receta TEXT NULL,
    tiempo_estimado_minutos INT NULL
);
GO

-- ORIGEN: //7 Detalle de receta
CREATE TABLE detalle_recetas (
    detalle_receta_id INT IDENTITY(1,1) PRIMARY KEY,
    receta_id INT NOT NULL,
    ingrediente_id INT NOT NULL,
    cantidad_requerida DECIMAL(8,2) NOT NULL,
    unidad_medida VARCHAR(50) NOT NULL,
    descripcion_uso VARCHAR(255) NULL,
    CONSTRAINT fk_detallereceta_receta FOREIGN KEY (receta_id) 
        REFERENCES recetas(receta_id) ON DELETE CASCADE,
    CONSTRAINT fk_detallereceta_ingrediente FOREIGN KEY (ingrediente_id) 
        REFERENCES ingredientes(ingrediente_id),
    CONSTRAINT chk_detallereceta_cantidad CHECK (cantidad_requerida > 0)
);
GO

-- ORIGEN: //8 Productos
CREATE TABLE productos (
    producto_id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_producto VARCHAR(255) NOT NULL,
    descripcion_producto TEXT NULL,
    categoria_id INT NOT NULL,
    receta_id INT NULL,
    precio_venta DECIMAL(10,2) NOT NULL,          
    estado CHAR(1) NOT NULL DEFAULT 'A',          
    fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) 
        REFERENCES categorias(categoria_id),
    CONSTRAINT fk_productos_receta FOREIGN KEY (receta_id) 
        REFERENCES recetas(receta_id),
    CONSTRAINT chk_productos_precio CHECK (precio_venta > 0)
);
GO

-- ORIGEN: //9 Precios por tamaño
CREATE TABLE precios_producto (
    precio_id INT IDENTITY(1,1) PRIMARY KEY,
    producto_id INT NOT NULL,
    tamano_id INT NULL,                           
    precio DECIMAL(10,2) NOT NULL,
    activo BIT NOT NULL DEFAULT 1,
    fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_precios_producto FOREIGN KEY (producto_id) 
        REFERENCES productos(producto_id) ON DELETE CASCADE,
    CONSTRAINT fk_precios_tamano FOREIGN KEY (tamano_id) 
        REFERENCES tamanos_pizza(tamano_id),
    CONSTRAINT uq_producto_tamano UNIQUE (producto_id, tamano_id),
    CONSTRAINT chk_precios_valor CHECK (precio > 0)
);
GO

-- ORIGEN: //10 Stock
CREATE TABLE stock (
    stock_id INT IDENTITY(1,1) PRIMARY KEY,
    ingrediente_id INT NOT NULL,
    proveedor_id INT NOT NULL,
    numero_lote VARCHAR(100) NOT NULL,
    cantidad_recibida INT NOT NULL,
    costo_unitario DECIMAL(10,2) NOT NULL,
    costo_total DECIMAL(12,2) NOT NULL,
    fecha_entrada DATETIME NOT NULL DEFAULT GETDATE(),
    fecha_vencimiento DATE NULL,
    estado CHAR(1) NOT NULL DEFAULT 'A',
    CONSTRAINT fk_stock_ingrediente FOREIGN KEY (ingrediente_id) 
        REFERENCES ingredientes(ingrediente_id),
    CONSTRAINT fk_stock_proveedor FOREIGN KEY (proveedor_id) 
        REFERENCES proveedores(proveedor_id),
    CONSTRAINT chk_stock_cantidad CHECK (cantidad_recibida > 0),
    CONSTRAINT chk_stock_costo CHECK (costo_unitario >= 0 AND costo_total >= 0)
);
GO

-- ORIGEN: //11 Movimientos de stock
CREATE TABLE movimientos_stock (
    movimiento_id INT IDENTITY(1,1) PRIMARY KEY,
    stock_id INT NOT NULL,
    tipo_movimiento VARCHAR(20) NOT NULL 
        CHECK (tipo_movimiento IN ('ENTRADA','SALIDA','AJUSTE')),
    cantidad INT NOT NULL,
    stock_actual INT NOT NULL,                    
    fecha_movimiento DATETIME NOT NULL DEFAULT GETDATE(),
    motivo VARCHAR(255) NULL,
    registrado_por VARCHAR(100) NULL,
    usuario_id INT NULL,                          
    CONSTRAINT fk_movstock_stock FOREIGN KEY (stock_id) 
        REFERENCES stock(stock_id),
    CONSTRAINT fk_movstock_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(usuario_id),
    CONSTRAINT chk_movstock_cantidad CHECK (cantidad <> 0),
    CONSTRAINT chk_movstock_actual CHECK (stock_actual >= 0)
);
GO

-- ORIGEN: //12 Clientes
CREATE TABLE clientes (
    cliente_id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    dni VARCHAR(20) NOT NULL UNIQUE,
    fecha_registro DATETIME DEFAULT GETDATE()
);
GO

-- ORIGEN: //13 Cupones
CREATE TABLE cupones (
    cupon_id INT IDENTITY(1,1) PRIMARY KEY,
    codigo_cupon VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT NULL,
    tipo_descuento VARCHAR(20) NOT NULL CHECK (tipo_descuento IN ('PORCENTAJE','MONTO')),
    valor_descuento DECIMAL(10,2) NOT NULL,
    monto_minimo DECIMAL(10,2) NOT NULL DEFAULT 0,
    usos_maximos INT NOT NULL DEFAULT 1,
    usos_actuales INT NOT NULL DEFAULT 0,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    estado CHAR(1) NOT NULL DEFAULT 'A',
    fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT chk_cupones_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT chk_cupones_usos CHECK (usos_maximos > 0),
    CONSTRAINT chk_cupones_valor CHECK (valor_descuento > 0)
);
GO

-- ORIGEN: //14 Pedidos 
CREATE TABLE pedidos (
    pedido_id INT IDENTITY(1,1) PRIMARY KEY,
    cliente_id INT NOT NULL,
    usuario_id INT NULL,                          -- NULL si es desde kiosko autoservicio
    fecha_pedido DATETIME NOT NULL DEFAULT GETDATE(),
    hora_pedido TIME NOT NULL DEFAULT CAST(GETDATE() AS TIME),
    estado_pedido VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' 
        CHECK (estado_pedido IN ('PENDIENTE','CONFIRMADO','PREPARACION','ENTREGADO','CANCELADO')),
    subtotal DECIMAL(12,2) NULL,
    monto_descuento DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NULL,
    notas_generales TEXT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) 
        REFERENCES clientes(cliente_id),
    CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(usuario_id),
    CONSTRAINT chk_pedidos_totales CHECK (subtotal >= 0 AND total >= 0)
);
GO

-- ORIGEN: //15 Detalle de pedidos
CREATE TABLE detalle_pedidos (
    detalle_pedido_id INT IDENTITY(1,1) PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    tamano_id INT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    notas_producto TEXT NULL,
    CONSTRAINT fk_detallepedido_pedido FOREIGN KEY (pedido_id) 
        REFERENCES pedidos(pedido_id) ON DELETE CASCADE,
    CONSTRAINT fk_detallepedido_producto FOREIGN KEY (producto_id) 
        REFERENCES productos(producto_id),
    CONSTRAINT fk_detallepedido_tamano FOREIGN KEY (tamano_id) 
        REFERENCES tamanos_pizza(tamano_id),
    CONSTRAINT chk_detallepedido_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detallepedido_precios CHECK (precio_unitario >= 0 AND subtotal >= 0)
);
GO

-- ORIGEN: //16 Ventas 
CREATE TABLE ventas (
    venta_id INT IDENTITY(1,1) PRIMARY KEY,
    pedido_id INT NOT NULL UNIQUE,
    tipo_comprobante VARCHAR(20) NOT NULL,
    fecha_venta DATETIME NOT NULL DEFAULT GETDATE(),
    usuario_id INT NULL,
    lugar_emision VARCHAR(255) NULL,
    metodo_pago VARCHAR(50) NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    igv DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_ventas_pedido FOREIGN KEY (pedido_id) 
        REFERENCES pedidos(pedido_id),
    CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(usuario_id),
    CONSTRAINT chk_ventas_montos CHECK (subtotal >= 0 AND igv >= 0 AND total >= 0)
);
GO

-- ORIGEN: //17 Uso de cupones
CREATE TABLE uso_cupones (
    uso_cupon_id INT IDENTITY(1,1) PRIMARY KEY,
    cupon_id INT NOT NULL,
    pedido_id INT NOT NULL,
    cliente_id INT NOT NULL,
    descuento_aplicado DECIMAL(10,2) NOT NULL,
    monto_venta DECIMAL(12,2) NOT NULL,
    fecha_uso DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_usocupon_cupon FOREIGN KEY (cupon_id) 
        REFERENCES cupones(cupon_id),
    CONSTRAINT fk_usocupon_pedido FOREIGN KEY (pedido_id) 
        REFERENCES pedidos(pedido_id),
    CONSTRAINT fk_usocupon_cliente FOREIGN KEY (cliente_id) 
        REFERENCES clientes(cliente_id),
    CONSTRAINT chk_usocupon_montos CHECK (descuento_aplicado >= 0 AND monto_venta >= 0)
);
GO

-- ============================================
-- FOREIGN KEYS ADICIONALES (ninguna pendiente)
-- ============================================

PRINT '✅ Estructura del sistema de pizzería creada correctamente (modificado).';
GO
