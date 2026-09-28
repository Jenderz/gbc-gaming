-- ============================================================================
-- Migración 006: Tabla de Posturas
-- Una "postura" es un adelanto de efectivo que sale de caja para cubrir
-- premios anticipadamente. Puede ser devuelta (reversible) o cancelada
-- (se convierte en gasto definitivo).
-- ============================================================================

USE lyberate_db;

CREATE TABLE IF NOT EXISTS posturas (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Datos del adelanto
    postura_date DATE NOT NULL,                          -- Fecha en que salió el dinero
    concept VARCHAR(255) NOT NULL,                       -- Descripción (ej: "Premio Ag. Las Cruces")
    amount DECIMAL(12,2) NOT NULL,                       -- Monto adelantado
    currency VARCHAR(50) NOT NULL,                       -- USD / Bs. / COP
    method ENUM('Efectivo','Transferencia','Zelle','Pago Móvil','Otro') NOT NULL DEFAULT 'Efectivo',
    bank VARCHAR(100) NOT NULL DEFAULT 'N/A',
    responsible VARCHAR(150) NULL,                       -- Quién llevó el dinero (texto libre)

    -- Estado del ciclo de vida
    status ENUM('pendiente','devuelta','cancelada') NOT NULL DEFAULT 'pendiente',

    -- Devolución
    returned_date DATE NULL,                             -- Fecha en que fue devuelto
    return_note TEXT NULL,                               -- Nota de la devolución

    -- Referencia opcional a semana
    week_id VARCHAR(20) NULL,

    -- Metadatos
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Índices
    INDEX idx_postura_date (postura_date),
    INDEX idx_postura_status (status),
    INDEX idx_postura_currency (currency),
    INDEX idx_postura_week (week_id)
) ENGINE=InnoDB;
