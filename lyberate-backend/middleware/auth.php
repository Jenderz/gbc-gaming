<?php
/**
 * JWT Authentication Middleware
 * Simple JWT implementation without external libraries.
 */

require_once __DIR__ . '/../config/database.php';

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Generate a JWT token
 */
function generateJWT(array $payload): string {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRY;
    $payloadJson = json_encode($payload);

    $base64Header = base64UrlEncode($header);
    $base64Payload = base64UrlEncode($payloadJson);

    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
    $base64Signature = base64UrlEncode($signature);

    return "$base64Header.$base64Payload.$base64Signature";
}

/**
 * Validate and decode a JWT token
 */
function validateJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$base64Header, $base64Payload, $base64Signature] = $parts;

    // Verify signature
    $expectedSignature = base64UrlEncode(
        hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true)
    );

    if (!hash_equals($expectedSignature, $base64Signature)) return null;

    $payload = json_decode(base64UrlDecode($base64Payload), true);
    if (!$payload) return null;

    // Check expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) return null;

    return $payload;
}

/**
 * Middleware: require authentication. Returns the JWT payload or sends 401.
 */
function requireAuth(): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (empty($header) || !preg_match('/Bearer\s+(.+)/', $header, $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Token de autenticación requerido']);
        exit;
    }

    $payload = validateJWT($matches[1]);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Token inválido o expirado']);
        exit;
    }

    return $payload;
}

/**
 * Middleware: require specific roles.
 */
function requireRole(array $allowedRoles): array {
    $auth = requireAuth();

    if (!in_array($auth['role'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado. Rol insuficiente.']);
        exit;
    }

    return $auth;
}
