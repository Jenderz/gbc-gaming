<?php
/**
 * Seller Aliases Controller
 */
require_once __DIR__ . '/../models/SellerAlias.php';
require_once __DIR__ . '/../models/Seller.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleSellerAliases(string $method, ?string $aliasParam = null) {
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
            
            $aliasUpper = strtoupper(trim($data['alias_name']));

            // Validar propiedad del vendedor si es un vendedor de agencia
            $ownerId = ($auth['role'] === 'Vendedor') ? (int)$auth['userId'] : null;
            if ($ownerId !== null) {
                $seller = Seller::findById((int)$data['seller_id']);
                if (!$seller || (int)($seller['owner_user_id'] ?? 0) !== $ownerId) {
                    jsonError('Vendedor no encontrado o no pertenece a tu agencia', 403);
                }
            }

            $existingSeller = Seller::findByName($aliasUpper, $ownerId);
            if ($existingSeller && (int)$existingSeller['id'] !== (int)$data['seller_id']) {
                jsonError('Ya existe un vendedor principal con este nombre exacto, no puedes usarlo como alias: ' . $aliasUpper, 400);
            }
            
            $newId = SellerAlias::upsert((int)$data['seller_id'], $aliasUpper);
            jsonSuccess(['id' => $newId, 'seller_id' => $data['seller_id'], 'alias_name' => $aliasUpper], 'Alias guardado', 201);
            break;

        case 'DELETE':
            $aliasName = $aliasParam ?? ($_GET['alias'] ?? null);
            if (!$aliasName) {
                $data = getJsonBody();
                $aliasName = $data['alias_name'] ?? null;
            }
            if (!$aliasName) jsonError('Nombre de alias requerido', 400);
            SellerAlias::deleteByAlias($aliasName);
            jsonSuccess(null, 'Alias eliminado');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
