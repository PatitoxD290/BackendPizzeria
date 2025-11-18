-------------------------------------------------------------
-- 1. CATEGORIA PRODUCTO
-- (Usamos tus categorías reales)
-------------------------------------------------------------
INSERT INTO Categoria_Producto (Nombre) VALUES
('Pizzas Clásicas'),   -- ID = 1
('Combos Kids'),       -- ID = 2
('Bebidas'),           -- ID = 3
('Combos'),            -- ID = 4
('Pizzas Especiales'); -- ID = 5

-------------------------------------------------------------
-- 2. CATEGORIA INSUMOS
-- Solo lo necesario para tu carta
-------------------------------------------------------------
INSERT INTO Categoria_Insumos (Nombre) VALUES
('Bases'),                    -- 1
('Salsas'),                   -- 2
('Quesos'),                   -- 3
('Carnes'),                   -- 4
('Embutidos'),                -- 5
('Frutas'),                   -- 6
('Verduras'),                 -- 7
('Hongos'),                   -- 8
('Regional'),                 -- 9
('Endulzantes y Aderezos'),   -- 10
('Bebidas');                  -- 11

-------------------------------------------------------------
-- 3. PROVEEDORES
-------------------------------------------------------------
INSERT INTO Proveedor (Nombre, Ruc, Direccion, Telefono, Email, Persona_Contacto) VALUES
('Proveedor Andino', '20451236589', 'Av. Los Ángeles 123', '987654321', 'ventas@andino.com', 'Mario Torres'),
('Distribuidora Pucallpa', '10985632145', 'Jr. Ucayali 450', '912345678', 'contacto@dp.com', 'Rosa Díaz'),
('Lácteos del Sur', '20698541236', 'Av. Central 500', '945678123', 'info@lacteos.com', 'Luis Herrera');

-------------------------------------------------------------
-- 4. INSUMOS
-- Ésta es la lista oficial de insumos de Aita Pizza
-- Cantidades luego se manejan en gramos en la receta
-------------------------------------------------------------
INSERT INTO Insumos (Nombre, Descripcion, Unidad_Med, ID_Categoria_I, Stock_Min, Stock_Max, Estado) VALUES
-- 1  Tomate (Salsas)
('Tomate', 'Tomate para salsa de pizza', 'g', 2, 5000, 50000, 'A'),
-- 2  Harina (Bases)
('Harina', 'Harina para masa de pizza', 'g', 1, 10000, 100000, 'A'),
-- 3  Levadura
('Levadura', 'Levadura seca para masa', 'g', 1, 500, 5000, 'A'),
-- 4  Aceite
('Aceite', 'Aceite vegetal para masa y preparación', 'ml', 1, 2000, 20000, 'A'),
-- 5  Azúcar
('Azúcar', 'Azúcar para salsa y masas', 'g', 10, 1000, 10000, 'A'),
-- 6  Orégano
('Orégano', 'Orégano seco para condimentar salsa', 'g', 2, 500, 5000, 'A'),
-- 7  Sal
('Sal', 'Sal para masa y salsa', 'g', 1, 1000, 10000, 'A'),
-- 8  Albahaca
('Albahaca', 'Albahaca fresca o seca para salsa', 'g', 2, 300, 3000, 'A'),
-- 9  Queso Mozzarella
('Queso Mozzarella', 'Queso mozzarella para pizzas', 'g', 3, 5000, 50000, 'A'),
-- 10 Jamón
('Jamón', 'Jamón en láminas para pizzas', 'g', 5, 3000, 30000, 'A'),
-- 11 Pepperoni
('Pepperoni', 'Rodajas de pepperoni', 'g', 5, 3000, 30000, 'A'),
-- 12 Chorizo parrillero
('Chorizo', 'Chorizo parrillero para pizzas', 'g', 5, 2000, 20000, 'A'),
-- 13 Carne molida
('Carne Molida', 'Carne molida para pizza especial', 'g', 4, 3000, 30000, 'A'),
-- 14 Piña
('Piña', 'Piña en trozos para pizza hawaiana', 'g', 6, 2000, 20000, 'A'),
-- 15 Champiñones
('Champiñones', 'Champiñones frescos', 'g', 8, 2000, 20000, 'A'),
-- 16 Aceitunas Verdes
('Aceitunas Verdes', 'Aceitunas verdes en rodajas', 'g', 7, 1000, 10000, 'A'),
-- 17 Aceitunas Negras
('Aceitunas Negras', 'Aceitunas negras en rodajas', 'g', 7, 1000, 10000, 'A'),
-- 18 Ají
('Ají', 'Ají picado para pizzas regionales', 'g', 7, 500, 5000, 'A'),
-- 19 Leche Condensada
('Leche Condensada', 'Para pizza tropical', 'g', 10, 1000, 10000, 'A'),
-- 20 Cecina
('Cecina', 'Cecina regional', 'g', 9, 1000, 10000, 'A'),
-- 21 Maduro Frito
('Maduro Frito', 'Plátano maduro frito en rodajas', 'g', 9, 1000, 10000, 'A'),
-- 22 Cebolla
('Cebolla', 'Cebolla blanca en pluma o dados', 'g', 7, 1000, 10000, 'A'),
-- 23 Pimentón
('Pimentón', 'Pimentón / pimiento en tiras', 'g', 7, 1000, 10000, 'A'),
-- 24 Pepino
('Pepino', 'Rodajas de pepino para pizza vegetariana', 'g', 7, 500, 5000, 'A'),
-- 25 Espinaca
('Espinaca', 'Espinaca fresca para pizza vegetariana', 'g', 7, 500, 5000, 'A'),
-- 26 Durazno
('Durazno en Almíbar', 'Durazno en almíbar para pizza tropical', 'g', 6, 1000, 10000, 'A'),
-- 27 Chorizo Regional
('Chorizo Regional', 'Chorizo regional para pizza amazónica', 'g', 9, 1000, 10000, 'A'),
-- 28 Hotdog Especial
('Hotdog Especial', 'Hotdog especial para pizza de carne', 'g', 5, 1000, 10000, 'A'),

-- 29 Pack Pepsi Personal
('Pack Pepsi', 'Pack de gaseosa Pepsi personal', 'Pack', 11, 10, 100, 'A'),
-- 30 Pack Coca Cola Personal
('Pack Coca Cola', 'Pack de gaseosa Coca Cola personal', 'Pack', 11, 10, 100, 'A'),
-- 31 Pack Inka Cola Personal
('Pack Inka Cola', 'Pack de gaseosa Inka Cola personal', 'Pack', 11, 10, 100, 'A'),
-- 32 Pack Agua Cielo Personal
('Pack Agua Cielo', 'Pack de agua cielo personal', 'Pack', 11, 10, 100, 'A'),
-- 33 Coca Cola 1L
('Coca Cola 1L', 'Botella de Coca Cola de un litro', 'Und', 11, 10, 100, 'A'),
-- 34 Inka Cola 1L
('Inka Cola 1L', 'Botella de Inka Cola de un litro', 'Und', 11, 10, 100, 'A');
-------------------------------------------------------------
-- 5. RECETAS (todas las pizzas clásicas, especiales y kids)
-------------------------------------------------------------
INSERT INTO Receta (Nombre, Descripcion, Tiempo_Preparacion) VALUES
-- Pizzas Clásicas
('Pizza Americana', 'Salsa, queso mozzarella y jamón', '00:15:00'),
('Pizza Pepperoni', 'Salsa, queso mozzarella y pepperoni', '00:14:00'),
('Pizza Hawaiana', 'Salsa, queso, jamón y piña', '00:16:00'),
('Pizza Tropical', 'Salsa, queso, jamón, durazno y leche condensada', '00:17:00'),
('Pizza Suprema', 'Salsa, queso, pepperoni, aceitunas, champiñones, cebolla, pimentón', '00:18:00'),
('Pizza Continental', 'Salsa, queso, jamón, chorizo, aceituna verde', '00:17:00'),

-- Pizzas Especiales
('Americana Especial', 'Jamón pizzero, champiñones, aceitunas', '00:17:00'),
('Especial de Carne', 'Carne aderezada, jamón, hotdog especial', '00:19:00'),
('Amazónica Regional', 'Chorizo regional, cecina, maduro frito', '00:20:00'),
('Americana Selvática', 'Jamón, cecina, maduro frito', '00:18:00'),
('Vegetariana Especial', 'Pepino, cebolla, aceitunas, champiñones, espinaca', '00:17:00');
-------------------------------------------------------------
-- 6. RECETA DETALLE (gramos base = pizza personal)
-------------------------------------------------------------

-- ====================
-- 1. Pizza Americana
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(1, 2, 180, 'Harina para masa'),
(1, 1, 110, 'Salsa de tomate'),
(1, 9, 130, 'Queso mozzarella'),
(1, 10, 60, 'Jamón');

-- ====================
-- 2. Pizza Pepperoni
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(2, 2, 180, 'Harina'),
(2, 1, 110, 'Salsa'),
(2, 9, 130, 'Mozzarella'),
(2, 11, 50, 'Pepperoni');

-- ====================
-- 3. Pizza Hawaiana
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(3, 2, 180, 'Harina'),
(3, 1, 110, 'Salsa'),
(3, 9, 130, 'Mozzarella'),
(3, 10, 60, 'Jamón'),
(3, 14, 50, 'Piña');

-- ====================
-- 4. Pizza Tropical
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(4, 2, 180, 'Harina'),
(4, 1, 110, 'Salsa'),
(4, 9, 130, 'Mozzarella'),
(4, 10, 60, 'Jamón'),
(4, 19, 20, 'Leche condensada'),
(4, 26, 60, 'Durazno en almíbar');

-- ====================
-- 5. Pizza Suprema
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(5, 2, 180, 'Harina'),
(5, 1, 110, 'Salsa'),
(5, 9, 130, 'Mozzarella'),
(5, 11, 40, 'Pepperoni'),
(5, 17, 30, 'Aceitunas negras'),
(5, 15, 40, 'Champiñones'),
(5, 22, 30, 'Cebolla'),
(5, 23, 30, 'Pimentón');

-- ====================
-- 6. Pizza Continental
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(6, 2, 180, 'Harina'),
(6, 1, 110, 'Salsa'),
(6, 9, 130, 'Mozzarella'),
(6, 10, 50, 'Jamón'),
(6, 12, 50, 'Chorizo'),
(6, 16, 30, 'Aceitunas verdes');

-- ====================
-- 7. Americana Especial
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(7, 2, 180, 'Harina'),
(7, 1, 110, 'Salsa'),
(7, 9, 130, 'Mozzarella'),
(7, 10, 60, 'Jamón pizzero'),
(7, 15, 40, 'Champiñones'),
(7, 17, 30, 'Aceitunas negras');

-- ====================
-- 8. Especial de Carne
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(8, 2, 180, 'Harina'),
(8, 1, 110, 'Salsa'),
(8, 9, 130, 'Mozzarella'),
(8, 13, 60, 'Carne molida'),
(8, 10, 40, 'Jamón'),
(8, 28, 40, 'Hotdog especial');

-- ====================
-- 9. Amazónica Regional
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(9, 2, 180, 'Harina'),
(9, 1, 110, 'Salsa'),
(9, 9, 130, 'Mozzarella'),
(9, 27, 60, 'Chorizo regional'),
(9, 20, 60, 'Cecina'),
(9, 21, 80, 'Maduro frito');

-- ====================
-- 10. Americana Selvática
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(10, 2, 180, 'Harina'),
(10, 1, 110, 'Salsa'),
(10, 9, 130, 'Mozzarella'),
(10, 10, 60, 'Jamón'),
(10, 20, 60, 'Cecina'),
(10, 21, 60, 'Maduro frito');

-- ====================
-- 11. Vegetariana Especial
-- ====================
INSERT INTO Receta_Detalle (ID_Receta, ID_Insumo, Cantidad, Uso) VALUES
(11, 2, 180, 'Harina'),
(11, 1, 110, 'Salsa'),
(11, 9, 130, 'Mozzarella'),
(11, 24, 40, 'Pepino'),
(11, 22, 40, 'Cebolla'),
(11, 16, 30, 'Aceituna verde'),
(11, 15, 40, 'Champiñones'),
(11, 25, 40, 'Espinaca');
-------------------------------------------------------------
-- 7. PRODUCTOS (Clásicas, Especiales, Kids, Bebidas, Combos)
-------------------------------------------------------------
INSERT INTO Producto (Nombre, Descripcion, ID_Categoria_P, ID_Receta, Cantidad_Disponible, Estado) VALUES
-- 🟦 PIZZAS CLÁSICAS
('Pizza Americana', 'Salsa de tomate, queso mozzarella y jamón', 1, 1, 50, 'A'),       -- ID 1
('Pizza Pepperoni', 'Queso mozzarella y pepperoni', 1, 2, 50, 'A'),                     -- ID 2
('Pizza Hawaiana', 'Jamón y piña', 1, 3, 50, 'A'),                                       -- ID 3
('Pizza Tropical', 'Jamón, durazno y leche condensada', 1, 4, 50, 'A'),                  -- ID 4
('Pizza Suprema', 'Pepperoni, aceitunas, champiñón, cebolla, pimiento', 1, 5, 50, 'A'),  -- ID 5
('Pizza Continental', 'Jamón, chorizo y aceituna verde', 1, 6, 50, 'A'),                 -- ID 6

-- 🟪 PIZZAS ESPECIALES
('Pizza Americana Especial', 'Jamón pizzero, aceitunas y champiñones', 5, 7, 30, 'A'),   -- ID 7
('Pizza Especial de Carne', 'Carne molida, jamón, hotdog especial', 5, 8, 30, 'A'),      -- ID 8
('Pizza Amazónica Regional', 'Cecina, chorizo regional, maduro frito', 5, 9, 30, 'A'),   -- ID 9
('Pizza Americana Selvática', 'Jamón, cecina y maduro frito', 5, 10, 30, 'A'),           -- ID 10
('Pizza Vegetariana Especial', 'Pepino, cebolla, aceitunas, champiñón, espinaca', 5, 11, 30, 'A'), -- ID 11

-- 🟧 KIDS (no necesitan receta propia, usan las clásicas)
('Kid Americana', 'Pizza americana personal', 2, 1, 40, 'A'), -- ID 12
('Kid Pepperoni', 'Pizza pepperoni personal', 2, 2, 40, 'A'), -- ID 13
('Kid Hawaiana', 'Pizza hawaiana personal', 2, 3, 40, 'A'),   -- ID 14
('Kid Tropical', 'Pizza tropical personal', 2, 4, 40, 'A'),   -- ID 15

-- 🟨 BEBIDAS
('Pepsi Personal', 'Pepsi 350ml', 3, NULL, 200, 'A'),          -- ID 16
('Coca Cola Personal', 'Coca Cola personal', 3, NULL, 200, 'A'), -- ID 17
('Inka Cola Personal', 'Inka Cola personal', 3, NULL, 200, 'A'), -- ID 18
('Coca Cola 1L', 'Coca Cola de 1 litro', 3, NULL, 100, 'A'),     -- ID 19
('Inka Cola 1L', 'Inka Cola de 1 litro', 3, NULL, 100, 'A'),     -- ID 20

-- 🟥 COMBOS PRINCIPALES
('Combo Hawaiana Personal', 'Pizza hawaiana personal + bebida + snack', 4, NULL, 30, 'A'),                 -- ID 21
('Combo 2 Sabores', 'Pizza 2 sabores + bebida + snack', 4, NULL, 30, 'A'),                                -- ID 22
('Combo 4 Sabores', 'Pizza 4 sabores + 2 bebidas + snack', 4, NULL, 30, 'A'),                             -- ID 23
('Combo Familiar Selvática con Carne', 'Pizza familiar selvática + 2 bebidas + snack', 4, NULL, 30, 'A'); -- ID 24
-------------------------------------------------------------
-- 8. TAMAÑOS
-------------------------------------------------------------
INSERT INTO Tamano (Tamano) VALUES
('Personal'),   -- 1
('Mediana'),    -- 2
('Grande'),     -- 3
('Familiar');   -- 4
-------------------------------------------------------------
-- 9. PRODUCTO_TAMANO - PIZZAS CLÁSICAS
-------------------------------------------------------------
-- Pizza Americana (ID 1)
INSERT INTO Producto_Tamano VALUES (1, 1, 17.90);
INSERT INTO Producto_Tamano VALUES (1, 2, 27.90);
INSERT INTO Producto_Tamano VALUES (1, 3, 37.90);
INSERT INTO Producto_Tamano VALUES (1, 4, 47.90);

-- Pizza Pepperoni (ID 2)
INSERT INTO Producto_Tamano VALUES (2, 1, 17.90);
INSERT INTO Producto_Tamano VALUES (2, 2, 27.90);
INSERT INTO Producto_Tamano VALUES (2, 3, 37.90);
INSERT INTO Producto_Tamano VALUES (2, 4, 47.90);

-- Pizza Hawaiana (ID 3)
INSERT INTO Producto_Tamano VALUES (3, 1, 18.90);
INSERT INTO Producto_Tamano VALUES (3, 2, 27.90);
INSERT INTO Producto_Tamano VALUES (3, 3, 37.90);
INSERT INTO Producto_Tamano VALUES (3, 4, 48.90);

-- Pizza Tropical (ID 4)
INSERT INTO Producto_Tamano VALUES (4, 1, 19.90);
INSERT INTO Producto_Tamano VALUES (4, 2, 28.90);
INSERT INTO Producto_Tamano VALUES (4, 3, 39.90);
INSERT INTO Producto_Tamano VALUES (4, 4, 48.90);

-- Pizza Suprema (ID 5)
INSERT INTO Producto_Tamano VALUES (5, 1, 19.90);
INSERT INTO Producto_Tamano VALUES (5, 2, 28.90);
INSERT INTO Producto_Tamano VALUES (5, 3, 39.90);
INSERT INTO Producto_Tamano VALUES (5, 4, 49.90);

-- Pizza Continental (ID 6)
INSERT INTO Producto_Tamano VALUES (6, 1, 19.90);
INSERT INTO Producto_Tamano VALUES (6, 2, 28.90);
INSERT INTO Producto_Tamano VALUES (6, 3, 39.90);
INSERT INTO Producto_Tamano VALUES (6, 4, 49.90);
-------------------------------------------------------------
-- 9. PRODUCTO_TAMANO - PIZZAS ESPECIALES
-------------------------------------------------------------
-- Americana Especial (ID 7)
INSERT INTO Producto_Tamano VALUES (7, 1, 19.90);
INSERT INTO Producto_Tamano VALUES (7, 2, 28.90);
INSERT INTO Producto_Tamano VALUES (7, 3, 39.90);
INSERT INTO Producto_Tamano VALUES (7, 4, 49.90);

-- Especial de Carne (ID 8)
INSERT INTO Producto_Tamano VALUES (8, 1, 22.90);
INSERT INTO Producto_Tamano VALUES (8, 2, 32.90);
INSERT INTO Producto_Tamano VALUES (8, 3, 42.90);
INSERT INTO Producto_Tamano VALUES (8, 4, 52.90);

-- Amazónica Regional (ID 9)
INSERT INTO Producto_Tamano VALUES (9, 1, 22.90);
INSERT INTO Producto_Tamano VALUES (9, 2, 32.90);
INSERT INTO Producto_Tamano VALUES (9, 3, 42.90);
INSERT INTO Producto_Tamano VALUES (9, 4, 52.90);

-- Americana Selvática (ID 10)
INSERT INTO Producto_Tamano VALUES (10, 1, 22.90);
INSERT INTO Producto_Tamano VALUES (10, 2, 32.90);
INSERT INTO Producto_Tamano VALUES (10, 3, 42.90);
INSERT INTO Producto_Tamano VALUES (10, 4, 52.90);

-- Vegetariana Especial (ID 11)
INSERT INTO Producto_Tamano VALUES (11, 1, 22.90);
INSERT INTO Producto_Tamano VALUES (11, 2, 32.90);
INSERT INTO Producto_Tamano VALUES (11, 3, 42.90);
INSERT INTO Producto_Tamano VALUES (11, 4, 52.90);
-------------------------------------------------------------
-- 9. PRODUCTO_TAMANO - KIDS
-------------------------------------------------------------
INSERT INTO Producto_Tamano VALUES (12, 1, 10.90); -- Kid Americana
INSERT INTO Producto_Tamano VALUES (13, 1, 10.90); -- Kid Pepperoni
INSERT INTO Producto_Tamano VALUES (14, 1, 11.90); -- Kid Hawaiana
INSERT INTO Producto_Tamano VALUES (15, 1, 12.90); -- Kid Tropical
-------------------------------------------------------------
-- 9. PRODUCTO_TAMANO - BEBIDAS
-------------------------------------------------------------
INSERT INTO Producto_Tamano VALUES (16, 1, 2.00); -- Pepsi
INSERT INTO Producto_Tamano VALUES (17, 1, 4.00); -- Coca personal
INSERT INTO Producto_Tamano VALUES (18, 1, 4.00); -- Inka personal
INSERT INTO Producto_Tamano VALUES (19, 1, 8.00); -- Coca 1L
INSERT INTO Producto_Tamano VALUES (20, 1, 8.00); -- Inka 1L
-------------------------------------------------------------
-- 9. PRODUCTO_TAMANO - COMBOS
-------------------------------------------------------------
INSERT INTO Producto_Tamano VALUES (21, 1, 18.90); -- Combo Hawaiana Personal
INSERT INTO Producto_Tamano VALUES (22, 1, NULL);  -- Combo 2 Sabores (varía por tamaño)
INSERT INTO Producto_Tamano VALUES (23, 1, NULL);  -- Combo 4 Sabores (varía por tamaño)
INSERT INTO Producto_Tamano VALUES (24, 4, 52.90); -- Combo Familiar Selvática
-------------------------------------------------------------
-- 10. STOCK INICIAL
-------------------------------------------------------------
INSERT INTO Stock (ID_Insumo, ID_Proveedor, Cantidad_Recibida, Costo_Unitario, Costo_Total, Fecha_Vencimiento) VALUES
(1, 1, 50, 3.00, 150.00, '2025-12-30'),  -- Harina
(2, 1, 10, 20.00, 200.00, '2025-12-20'), -- Levadura
(3, 1, 20, 8.00, 160.00, '2025-12-10'),  -- Aceite
(4, 1, 10, 1.00, 10.00, '2026-01-01'),   -- Sal

(5, 2, 40, 4.00, 160.00, '2025-11-30'),  -- Tomate
(6, 2, 5, 10.00, 50.00, '2026-01-15'),   -- Orégano
(7, 2, 5, 12.00, 60.00, '2026-01-15'),   -- Albahaca
(8, 2, 10, 3.00, 30.00, '2026-01-01'),   -- Azúcar

(9, 3, 20, 18.00, 360.00, '2025-12-10'), -- Queso mozzarella
(10, 1, 15, 25.00, 375.00, '2025-12-20'),-- Carne molida
(11, 1, 20, 22.00, 440.00, '2025-11-25'),-- Jamón
(12, 1, 20, 30.00, 600.00, '2025-11-25'),-- Pepperoni
(13, 1, 15, 18.00, 270.00, '2025-12-20'),-- Chorizo

(14, 2, 20, 12.00, 240.00, '2025-11-30'),-- Piña
(15, 2, 10, 8.00, 80.00, '2026-02-20'),  -- Leche condensada
(16, 2, 10, 5.00, 50.00, '2025-12-15'),  -- Ají
(17, 2, 10, 10.00, 100.00, '2025-12-10'),-- Champiñones

-- Bebidas
(18, 1, 100, 2.00, 200.00, '2026-06-10'), -- Pepsi personal
(19, 1, 100, 2.00, 200.00, '2026-06-10'), -- Coca personal
(20, 1, 100, 2.00, 200.00, '2026-06-10'), -- Inka personal
(21, 1, 80, 5.00, 400.00, '2026-06-10'),  -- Coca 1L
(22, 1, 80, 5.00, 400.00, '2026-06-10'); -- Inka 1L
-------------------------------------------------------------
-- 11. MOVIMIENTOS DE STOCK
-------------------------------------------------------------
INSERT INTO Stock_Movimiento (ID_Stock, Tipo_Mov, Motivo, Cantidad, Stock_ACT, Usuario_ID) VALUES
(1, 'Entrada', 'Ingreso inicial', 50, 50, 1),
(2, 'Entrada', 'Ingreso inicial', 10, 10, 1),
(3, 'Entrada', 'Ingreso inicial', 20, 20, 1),
(9, 'Entrada', 'Ingreso inicial', 20, 20, 1),
(18, 'Entrada', 'Ingreso inicial', 100, 100, 1);
-------------------------------------------------------------
-- 12. CUPONES
-------------------------------------------------------------
INSERT INTO Cupones (Cod_Cupon, Descripcion, Tipo_Desc, Valor_Desc, Monto_Max, Usos_Max, Fecha_FIN) VALUES
('PIZZA10', '10% de descuento en pizzas clásicas', 'Porcentaje', 10, 20, 100, '2025-12-31'),
('PACK15', '15 soles en combos familiares', 'Monto', 15, 15, 50, '2025-12-31'),
('BEBIDA2X1', '2x1 en bebidas personales', 'Monto', 4, 8, 200, '2025-11-30');
-------------------------------------------------------------
-- 13. CLIENTE VARIOS
-------------------------------------------------------------
INSERT INTO Cliente (DNI, Nombre, Apellido, Telefono)
VALUES ('00000000', 'CLIENTE', 'VARIOS', '000000000');
-------------------------------------------------------------
-- 14. USUARIO ADMIN
-------------------------------------------------------------
INSERT INTO Usuario (Perfil, Correo, Password, Roll, Estado)
VALUES ('Admin', 'admin@aitapizza.com', 'admin123', 'A', 'A');