-- ============================================================================
-- GBC GAMING / LYBERATE - SCRIPT DE LIMPIEZA / REINICIO DE DATOS
-- ============================================================================
-- Este script vacía las tablas de ventas, tickets semanales, pagos, posturas,
-- productos y sus configuraciones de comisiones, reiniciando los contadores (ID = 1).
--
-- INSTRUCCIONES:
-- 1. Ejecutar en phpMyAdmin o consola MySQL seleccionando la base de datos `lyberate_db`.
-- 2. No afecta a la tabla `users` (usuarios/administradores se mantienen intactos).
-- ============================================================================

USE lyberate_db;

-- Desactivar temporalmente la verificación de llaves foráneas para permitir TRUNCATE
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. VENTAS Y CIERRES SEMANALES
-- ----------------------------------------------------------------------------
TRUNCATE TABLE `sales`;           -- Todas las ventas importadas/registradas
TRUNCATE TABLE `weekly_tickets`;  -- Todos los cierres y saldos semanales calculados

-- ----------------------------------------------------------------------------
-- 2. PAGOS, ADELANTOS Y POSTURAS
-- ----------------------------------------------------------------------------
TRUNCATE TABLE `payments`;        -- Pagos y abonos reportados por vendedores
TRUNCATE TABLE `posturas`;        -- Adelantos de premios en efectivo de caja

-- ----------------------------------------------------------------------------
-- 3. PRODUCTOS Y COMISIONES DE VENDEDORES
-- ----------------------------------------------------------------------------
TRUNCATE TABLE `currency_configs`;-- Porcentajes de comisión y participación por moneda
TRUNCATE TABLE `products`;        -- Productos asignados a los vendedores

-- ----------------------------------------------------------------------------
-- 4. ALIAS DE IMPORTACIÓN
-- ----------------------------------------------------------------------------
TRUNCATE TABLE `seller_aliases`;  -- Mapeos y alias aprendidos en importaciones Excel

-- ----------------------------------------------------------------------------
-- 5. GASTOS (OPCIONAL: descomentar si también deseas vaciar gastos operativos)
-- ----------------------------------------------------------------------------
-- TRUNCATE TABLE `expenses`;

-- ----------------------------------------------------------------------------
-- 6. CATÁLOGO GLOBAL DE PRODUCTOS (Reiniciar a los 4 por defecto)
-- ----------------------------------------------------------------------------
TRUNCATE TABLE `global_products`;
INSERT INTO `global_products` (`name`) VALUES 
('PARLEY INH'), 
('ANIMALITOS'), 
('LOTERIAS'), 
('AMERICANAS');

-- ----------------------------------------------------------------------------
-- 7. VENDEDORES Y AGENCIAS (OPCIONAL - SOLO SI DESEAS EMPEZAR SELLERS DE CERO)
-- ⚠️ Si descomentas esto, se borrarán todos los vendedores y agencias creados.
-- ----------------------------------------------------------------------------
-- UPDATE `users` SET `seller_id` = NULL WHERE `seller_id` IS NOT NULL;
-- TRUNCATE TABLE `agencies`;
-- TRUNCATE TABLE `sellers`;

-- Reactivar verificación de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- FIN DEL SCRIPT - LISTO PARA RECARGAR DATOS DESDE CERO
-- ============================================================================
