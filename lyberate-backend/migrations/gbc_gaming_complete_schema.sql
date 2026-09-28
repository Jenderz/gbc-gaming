-- ============================================================================
-- GBC GAMING — Esquema Completo Consolidado de Base de Datos
-- Versión: 2.0 (GBC GAMING, C.A. • RIF J-500291221)
-- Motor: MySQL / MariaDB (InnoDB, utf8mb4)
-- Compatible con cPanel / phpMyAdmin
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Catálogos Base
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `currencies` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `global_products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_methods` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `banks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Entidades Principales
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `sellers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `id_number` VARCHAR(50) NULL,
    `phone` VARCHAR(30) NULL,
    `owner_user_id` INT NULL COMMENT 'NULL = Vendedor Global Admin | ID = Sub-vendedor de Agencia',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_sellers_owner` (`owner_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('Admin','Supervisor','Vendedor','Banca') NOT NULL DEFAULT 'Vendedor',
    `seller_id` INT NULL,
    `agency_name` VARCHAR(100) NULL,
    `is_agency` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Modo Agencia activado',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enlazar la llave foránea de sellers hacia users después de crear users
ALTER TABLE `sellers`
    ADD CONSTRAINT `fk_sellers_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS `seller_aliases` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `seller_id` INT NOT NULL,
    `alias_name` VARCHAR(100) NOT NULL UNIQUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agencies` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `address` VARCHAR(255) NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(150) NULL,
    `seller_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `seller_id` INT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `currency_configs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `commission_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `part_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Transacciones y Operaciones Financieras
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `seller_id` INT NOT NULL,
    `agency_id` INT NULL,
    `owner_user_id` INT NULL COMMENT 'NULL = Venta Global | ID = Venta de Agencia',
    `product_name` VARCHAR(100) NOT NULL,
    `currency_name` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `prize` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `commission` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `participation` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_vendor` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_bank` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `sale_date` DATE NOT NULL,
    `week_id` VARCHAR(20) NOT NULL,
    `registered_at` DATETIME NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE SET NULL,
    INDEX `idx_sales_week` (`week_id`),
    INDEX `idx_sales_seller` (`seller_id`),
    INDEX `idx_sales_date` (`sale_date`),
    INDEX `idx_sales_owner` (`owner_user_id`),
    INDEX `idx_sales_owner_week` (`owner_user_id`, `week_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `seller_id` INT NOT NULL,
    `owner_user_id` INT NULL COMMENT 'NULL = Pago Global | ID = Pago de Agencia',
    `week_label` VARCHAR(100) NOT NULL,
    `week_id` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `currency` VARCHAR(50) NOT NULL,
    `bank` VARCHAR(100) NOT NULL,
    `method` VARCHAR(50) NOT NULL,
    `reference` VARCHAR(100) NOT NULL,
    `payment_date` DATE NOT NULL,
    `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    `type` ENUM('payment','credit','payout') NOT NULL DEFAULT 'payment',
    `proof_image_path` VARCHAR(500) NULL,
    `admin_note` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE,
    INDEX `idx_payments_week` (`week_id`),
    INDEX `idx_payments_seller` (`seller_id`),
    INDEX `idx_payments_status` (`status`),
    INDEX `idx_payments_owner` (`owner_user_id`),
    INDEX `idx_payments_seller_status` (`seller_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `weekly_tickets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `seller_id` INT NOT NULL,
    `owner_user_id` INT NULL COMMENT 'NULL = Ticket Global | ID = Ticket de Agencia',
    `week_id` VARCHAR(20) NOT NULL,
    `week_label` VARCHAR(100) NOT NULL,
    `total_sales` DECIMAL(12,2) DEFAULT 0.00,
    `total_prize` DECIMAL(12,2) DEFAULT 0.00,
    `total_commission` DECIMAL(12,2) DEFAULT 0.00,
    `total_net` DECIMAL(12,2) DEFAULT 0.00,
    `total_participation` DECIMAL(12,2) DEFAULT 0.00,
    `total_vendor` DECIMAL(12,2) DEFAULT 0.00,
    `total_bank` DECIMAL(12,2) DEFAULT 0.00,
    `total_paid` DECIMAL(12,2) DEFAULT 0.00,
    `balance` DECIMAL(12,2) DEFAULT 0.00,
    `currency` VARCHAR(50) NOT NULL,
    `status` ENUM('open','settled','pending') DEFAULT 'open',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_seller_week_currency_owner` (`seller_id`, `week_id`, `currency`, `owner_user_id`),
    INDEX `idx_wt_week` (`week_id`),
    INDEX `idx_wt_owner` (`owner_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `expense_date` DATE NOT NULL,
    `type` ENUM('Operativo','Nomina','Servicios','Otros') NOT NULL,
    `concept` VARCHAR(255) NOT NULL,
    `method` VARCHAR(50) NOT NULL,
    `bank` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `currency` VARCHAR(50) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_expenses_date` (`expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `posturas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `postura_date` DATE NOT NULL,
    `concept` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `currency` VARCHAR(50) NOT NULL,
    `method` ENUM('Efectivo','Transferencia','Zelle','Pago Móvil','Otro') NOT NULL DEFAULT 'Efectivo',
    `bank` VARCHAR(100) NOT NULL DEFAULT 'N/A',
    `responsible` VARCHAR(150) NULL,
    `status` ENUM('pendiente','devuelta','cancelada') NOT NULL DEFAULT 'pendiente',
    `returned_date` DATE NULL,
    `return_note` TEXT NULL,
    `week_id` VARCHAR(20) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_postura_date` (`postura_date`),
    INDEX `idx_postura_status` (`status`),
    INDEX `idx_postura_currency` (`currency`),
    INDEX `idx_postura_week` (`week_id`),
    INDEX `idx_posturas_curr_status` (`currency`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_prefs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `pref_key` VARCHAR(50) NOT NULL UNIQUE,
    `pref_value` TEXT NOT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Datos Iniciales / Semilla (Seed Data)
-- ─────────────────────────────────────────────────────────────────────────────

-- Usuario Administrador Principal (Contraseña por defecto: admin123)
INSERT INTO `users` (`name`, `email`, `password_hash`, `role`) VALUES 
('Admin GBC', 'admin@gbcgaming.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin'),
('Admin Central', 'admin@lyberate.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Catálogo de Monedas
INSERT IGNORE INTO `currencies` (`name`) VALUES 
('DOLAR'), 
('PESO COLOMBIANA'), 
('BOLIVARES VENEZOLANOS');

-- Catálogo de Productos Globales
INSERT IGNORE INTO `global_products` (`name`) VALUES 
('PARLEY BETM3'), 
('ANIMALITOS'), 
('LOTERIAS'), 
('AMERICANAS');

-- Catálogo de Métodos de Pago
INSERT IGNORE INTO `payment_methods` (`name`) VALUES 
('Transferencia'), 
('Zelle'), 
('Pago Móvil'), 
('Efectivo'), 
('Otro');

-- Catálogo de Bancos
INSERT IGNORE INTO `banks` (`name`) VALUES 
('Banesco'), 
('Provincial (BBVA)'), 
('Mercantil'), 
('BNC');

-- Preferencias del Sistema Corporativo GBC GAMING
INSERT INTO `system_prefs` (`pref_key`, `pref_value`) VALUES 
('companyName', 'GBC GAMING'),
('ticketFooterMessage', '¡Gracias por su confianza en GBC GAMING! El ticket caduca a los 3 días.'),
('riskLimitAlert', '500'),
('baseCurrency', 'DOLAR')
ON DUPLICATE KEY UPDATE `pref_value` = VALUES(`pref_value`);

SET FOREIGN_KEY_CHECKS = 1;
