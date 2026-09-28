-- 004_add_payout_type_to_payments.sql
-- Amplia el ENUM del campo type para registrar pagos realizados desde la banca hacia los vendedores (Retiros o Liquidaciones de Premios)

ALTER TABLE payments MODIFY COLUMN type ENUM('payment', 'credit', 'payout') NOT NULL DEFAULT 'payment';
