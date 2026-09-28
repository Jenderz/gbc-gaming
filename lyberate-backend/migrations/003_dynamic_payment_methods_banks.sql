-- ============================================================================
-- Migración: Métodos de Pago y Bancos Dinámicos
-- Ejecutar en PHPMyAdmin o en su cliente MySQL
-- ============================================================================

-- 1. Crear catálogos para Métodos de Pago y Bancos
CREATE TABLE IF NOT EXISTS payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS banks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2. Insertar valores iniciales (Los existentes)
INSERT IGNORE INTO payment_methods (name) VALUES 
('Transferencia'), 
('Zelle'), 
('Pago Móvil'), 
('Efectivo'), 
('Otro');

INSERT IGNORE INTO banks (name) VALUES 
('Banesco'), 
('Provincial (BBVA)'), 
('Mercantil'), 
('BNC');

-- 3. Modificar la tabla 'payments'
-- Transforma el campo method de ENUM a VARCHAR y el campo bank de VARCHAR(100)
-- Aunque bank ya es VARCHAR(100), method debe actualizarse.
ALTER TABLE payments MODIFY COLUMN method VARCHAR(50) NOT NULL;

-- 4. Modificar la tabla 'expenses'
-- Transforma el campo method de ENUM a VARCHAR
ALTER TABLE expenses MODIFY COLUMN method VARCHAR(50) NOT NULL;
