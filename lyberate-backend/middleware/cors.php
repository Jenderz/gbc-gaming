<?php
/**
 * CORS Middleware
 */
function handleCors() {
    // Allow from GBC Gaming domains and local development
    $allowedOrigins = [
        'https://mi.gbc-gaming.com',
        'http://mi.gbc-gaming.com',
        'https://panel.gbc-gaming.com',
        'http://panel.gbc-gaming.com',
        'https://gbc-gaming.com',
        'https://www.gbc-gaming.com',
        'http://localhost:5173',
        'http://localhost:3000',
        'https://mi.worlddeportes.com',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowedOrigins) || preg_match('/^https?:\/\/(.*?\.)?gbc-gaming\.com$/i', $origin)) {
        header("Access-Control-Allow-Origin: $origin");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Expires");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400");

    // Handle preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
