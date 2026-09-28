<?php
/**
 * Seller Aliases Controller
 */
require_once __DIR__ . '/../models/SellerAlias.php';
require_once __DIR__ . '/../models/Seller.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleSellerAliases(string $method) {
    $auth = requireAuth();
    if ($auth['role'] !== 'Admin' && $auth['role'] !== 'Supervisor') {
        if ($auth['role'] !== 'Vendedor' || empty($auth['is_agency'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Acceso denegado. Rol insuficiente.']);
            exit;
        }
    }

    switch ($method) {
        case 'GET':
            jsonSuccess(SellerAlias::getAllMap());
            break;

        case 'POST':
            $data = getJsonBody();
            $err = validateRequired($data, ['seller_id', 'alias_name']);
            if ($err) jsonError($err);
            
            $existing = SellerAlias::findByAlias($data['alias_name']);
            if ($existing) {
                jsonError('Este alias ya existe: ' . $data['alias_name'], 400);
            }
            
            // Validar propiedad del vendedor si es un vendedor de agencia
            $ownerId = ($auth['role'] === 'Vendedor') ? (int)$auth['userId'] : null;
            if ($ownerId !== null) {
                $seller = Seller::findById((int)$data['seller_id']);
                if (!$seller || (int)($seller['owner_user_id'] ?? 0) !== $ownerId) {
                    jsonError('Vendedor no encontrado o no pertenece a tu agencia', 403);
                }
            }

            $existingSeller = Seller::findByName($data['alias_name'], $ownerId);
            if ($existingSeller) {
                jsonError('Ya existe un vendedor principal con este nombre exacto, no puedes usarlo como alias: ' . $data['alias_name'], 400);
            }
            
            $newId = SellerAlias::create((int)$data['seller_id'], $data['alias_name']);
            jsonSuccess(['id' => $newId, 'seller_id' => $data['seller_id'], 'alias_name' => strtoupper(trim($data['alias_name']))], 'Alias creado', 201);
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
