-- ============================================================================
-- Lyberate Database - Full Schema
-- Run this script on MySQL to create all tables
-- ============================================================================

CREATE DATABASE IF NOT EXISTS lyberate_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lyberate_db;

-- ── Sellers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sellers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    id_number VARCHAR(50) NULL,
    phone VARCHAR(30) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin','Supervisor','Vendedor','Banca') NOT NULL DEFAULT 'Vendedor',
    seller_id INT NULL,
    agency_name VARCHAR(100) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Products (per seller) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Currency Configs (per product) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS currency_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    commission_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    part_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Agencies ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    seller_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Sales ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    agency_id INT NULL,
    product_name VARCHAR(100) NOT NULL,
    currency_name VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    prize DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    commission DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    participation DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_vendor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_bank DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    sale_date DATE NOT NULL,
    week_id VARCHAR(20) NOT NULL,
    registered_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL,
    INDEX idx_sales_week (week_id),
    INDEX idx_sales_seller (seller_id),
    INDEX idx_sales_date (sale_date)
) ENGINE=InnoDB;

-- ── Payments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    seller_id INT NOT NULL,
    week_label VARCHAR(100) NOT NULL,
    week_id VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(50) NOT NULL,
    bank VARCHAR(100) NOT NULL,
    method ENUM('Transferencia','Zelle','Pago Móvil','Efectivo','Otro') NOT NULL,
    reference VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    type ENUM('payment','credit') NOT NULL DEFAULT 'payment',
    proof_image_path VARCHAR(500) NULL,
    admin_note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    INDEX idx_payments_week (week_id),
    INDEX idx_payments_seller (seller_id),
    INDEX idx_payments_status (status)
) ENGINE=InnoDB;

-- ── Weekly Tickets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    week_id VARCHAR(20) NOT NULL,
    week_label VARCHAR(100) NOT NULL,
    total_sales DECIMAL(12,2) DEFAULT 0.00,
    total_prize DECIMAL(12,2) DEFAULT 0.00,
    total_commission DECIMAL(12,2) DEFAULT 0.00,
    total_net DECIMAL(12,2) DEFAULT 0.00,
    total_participation DECIMAL(12,2) DEFAULT 0.00,
    total_vendor DECIMAL(12,2) DEFAULT 0.00,
    total_bank DECIMAL(12,2) DEFAULT 0.00,
    total_paid DECIMAL(12,2) DEFAULT 0.00,
    balance DECIMAL(12,2) DEFAULT 0.00,
    currency VARCHAR(50) NOT NULL,
    status ENUM('open','settled','pending') DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    UNIQUE KEY uk_seller_week_currency (seller_id, week_id, currency),
    INDEX idx_wt_week (week_id)
) ENGINE=InnoDB;

-- ── Expenses ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_date DATE NOT NULL,
    type ENUM('Operativo','Nomina','Servicios','Otros') NOT NULL,
    concept VARCHAR(255) NOT NULL,
    method ENUM('Transferencia','Zelle','Pago Móvil','Efectivo','Otro') NOT NULL,
    bank VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expenses_date (expense_date)
) ENGINE=InnoDB;

-- ── System Preferences (key-value) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_prefs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pref_key VARCHAR(50) NOT NULL UNIQUE,
    pref_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Currencies Catalog ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS currencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ── Global Products Catalog ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Default admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin Central', 'admin@lyberate.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin');

-- Default currencies
INSERT INTO currencies (name) VALUES ('DOLAR'), ('PESO COLOMBIANA'), ('BOLIVARES VENEZOLANOS');

-- Default global products
INSERT INTO global_products (name) VALUES ('PARLEY INH'), ('ANIMALITOS'), ('LOTERIAS'), ('AMERICANAS');

-- Default system preferences
INSERT INTO system_prefs (pref_key, pref_value) VALUES 
('companyName', 'GBC GAMING'),
('ticketFooterMessage', '¡Gracias por su jugada! El ticket caduca a los 3 días.'),
('riskLimitAlert', '500'),
('baseCurrency', 'DOLAR');
