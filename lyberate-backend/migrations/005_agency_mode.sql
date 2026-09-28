-- ============================================================================
-- MODO AGENCIA — Script SQL para phpMyAdmin
-- Base de datos: lyberate_db
--
-- Estrategia: Columna `owner_user_id` en tablas clave.
--   - NULL  → registro del ámbito GLOBAL del Administrador
--   - valor → registro pertenece a esa agencia (ID del usuario-vendedor)
--
-- SEGURO: Todas las columnas son NULLable. Los datos existentes NO se afectan.
-- ============================================================================

USE lyberate_db;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS — Marcar usuarios como agencia
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN is_agency TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '1 = Este vendedor tiene Modo Agencia activado';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SELLERS — Sub-vendedores de agencia
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE sellers
    ADD COLUMN owner_user_id INT NULL
        COMMENT 'NULL = vendedor global del Admin | valor = sub-vendedor de esta agencia';

ALTER TABLE sellers
    ADD INDEX idx_sellers_owner (owner_user_id);

ALTER TABLE sellers
    ADD CONSTRAINT fk_sellers_owner
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SALES — Ventas aisladas por agencia
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE sales
    ADD COLUMN owner_user_id INT NULL
        COMMENT 'NULL = venta global | valor = venta de esta agencia';

ALTER TABLE sales
    ADD INDEX idx_sales_owner (owner_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PAYMENTS — Recaudaciones aisladas por agencia
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payments
    ADD COLUMN owner_user_id INT NULL
        COMMENT 'NULL = pago global | valor = pago de esta agencia';

ALTER TABLE payments
    ADD INDEX idx_payments_owner (owner_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. WEEKLY_TICKETS — Cierres semanales aislados
--    IMPORTANTE: La UNIQUE KEY `uk_seller_week_currency` es usada por MySQL
--    como índice para la FK de seller_id. Para poder eliminarla debemos:
--      a) Eliminar la FK que depende de ella
--      b) Eliminar la UNIQUE KEY
--      c) Crear la nueva UNIQUE KEY con owner_user_id
--      d) Recrear la FK
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. Agregar la columna owner_user_id
ALTER TABLE weekly_tickets
    ADD COLUMN owner_user_id INT NULL
        COMMENT 'NULL = ticket global | valor = ticket de esta agencia';

ALTER TABLE weekly_tickets
    ADD INDEX idx_wt_owner (owner_user_id);

-- 5b. Eliminar la FK que depende del índice uk_seller_week_currency
--     ⚠️ El nombre real de la FK puede variar. Ejecuta esto primero para verlo:
--     SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
--     WHERE TABLE_SCHEMA = 'lyberate_db'
--       AND TABLE_NAME = 'weekly_tickets'
--       AND REFERENCED_TABLE_NAME = 'sellers';
--
--     Si el nombre es diferente, reemplaza 'weekly_tickets_ibfk_1' abajo.
ALTER TABLE weekly_tickets
    DROP FOREIGN KEY weekly_tickets_ibfk_1;

-- 5c. Ahora sí podemos eliminar la UNIQUE KEY anterior
ALTER TABLE weekly_tickets
    DROP INDEX uk_seller_week_currency;

-- 5d. Recrear la UNIQUE KEY incluyendo owner_user_id para permitir
--     que Admin y agencias tengan tickets independientes
ALTER TABLE weekly_tickets
    ADD UNIQUE KEY uk_seller_week_currency_owner (seller_id, week_id, currency, owner_user_id);

-- 5e. Recrear la FK de seller_id
ALTER TABLE weekly_tickets
    ADD CONSTRAINT fk_wt_seller
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (opcional, ejecutar para confirmar)
-- ─────────────────────────────────────────────────────────────────────────────
-- DESCRIBE users;
-- DESCRIBE sellers;
-- DESCRIBE sales;
-- DESCRIBE payments;
-- DESCRIBE weekly_tickets;
-- SHOW INDEX FROM weekly_tickets;
