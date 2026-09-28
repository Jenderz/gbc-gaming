<?php
/**
 * Database Configuration - PDO MySQL Connection
 */

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'qluilsmq_wd');
define('DB_USER', getenv('DB_USER') ?: 'qluilsmq_jen');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'Ai648.va');
define('DB_CHARSET', 'utf8mb4');

// JWT Secret Key - Carga desde variable de entorno o usa fallback en desarrollo
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'lyberate_jwt_secret_key_change_in_production_2026');
define('JWT_EXPIRY', 28800); // 8 hours in seconds

// Upload config
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    return $pdo;
}
