-- ============================================================================
-- Migración 007: Índices Compuestos para Optimización Multitenant y Filtros Frecuentes
-- ============================================================================

USE lyberate_db;

-- Índice compuesto para ventas por propietario y semana (Modo Agencia)
ALTER TABLE sales ADD INDEX idx_sales_owner_week (owner_user_id, week_id);

-- Índice compuesto para pagos por vendedor y estado
ALTER TABLE payments ADD INDEX idx_payments_seller_status (seller_id, status);

-- Índice compuesto para posturas por moneda y estado
ALTER TABLE posturas ADD INDEX idx_posturas_curr_status (currency, status);
