-- ============================================================================
-- Migration: Create Seller Aliases Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS seller_aliases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    alias_name VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB;
