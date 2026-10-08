-- Migration 008: Rename PARLEY BETM3 to PARLEY INH across the system
-- This updates global_products catalog, vendor configured products, and historical sales.

-- 1. Si no existe PARLEY INH en global_products, renombrar PARLEY BETM3 a PARLEY INH
UPDATE `global_products`
SET `name` = 'PARLEY INH'
WHERE `name` = 'PARLEY BETM3'
  AND NOT EXISTS (SELECT 1 FROM (SELECT `id` FROM `global_products` WHERE `name` = 'PARLEY INH') AS tmp);

-- 2. Si ya existía PARLEY INH, remover el registro duplicado PARLEY BETM3
DELETE FROM `global_products` WHERE `name` = 'PARLEY BETM3';

-- 3. Asegurar que PARLEY INH existe en el catálogo global
INSERT IGNORE INTO `global_products` (`name`) VALUES ('PARLEY INH');

-- 4. Actualizar las asignaciones de productos en perfiles de vendedores
UPDATE `products` SET `name` = 'PARLEY INH' WHERE `name` = 'PARLEY BETM3';

-- 5. Actualizar los registros históricos de ventas
UPDATE `sales` SET `product_name` = 'PARLEY INH' WHERE `product_name` = 'PARLEY BETM3';
