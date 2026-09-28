<?php
/**
 * Standardized JSON Response Helper
 */

function jsonResponse($data, int $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $code = 400) {
    jsonResponse(['error' => $message], $code);
}

function jsonSuccess($data = null, string $message = 'OK', int $code = 200) {
    $response = ['message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    jsonResponse($response, $code);
}

/**
 * Get JSON body from request
 */
function getJsonBody(): array {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

/**
 * Validate required fields
 */
function validateRequired(array $data, array $fields): ?string {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            return "El campo '$field' es requerido";
        }
    }
    return null;
}

/**
 * Round to 2 decimal places for financial precision
 */
function roundFinance(float $value): float {
    return round($value, 2);
}
