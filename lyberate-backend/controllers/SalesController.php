<?php
/**
 * Sales Controller
 */
require_once __DIR__ . '/../models/Sale.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleSales(string $method, ?string $action = null, ?string $id = null) {
    // Vendedor puede leer sus propias ventas; Admin/Supervisor tienen acceso completo
    $auth = requireRole(['Admin', 'Supervisor', 'Vendedor']);

    switch ($method) {
        case 'GET':
            $filters = [];
            if ($auth['role'] === 'Vendedor') {
                // Forzar filtro por el seller_id del JWT — no se puede falsificar
                $filters['seller_id'] = $auth['seller_id'] ?? '';
                // El vendedor solo ve ventas del ámbito global (las suyas como seller)
                $filters['owner_user_id'] = 'global';
            } else {
                // Admin/Supervisor: solo ventas globales, nunca datos de agencias
                $filters['owner_user_id'] = 'global';
                if (!empty($_GET['week_id']))   $filters['week_id']   = $_GET['week_id'];
                if (!empty($_GET['seller_id'])) $filters['seller_id'] = $_GET['seller_id'];
            }
            jsonSuccess(Sale::getAll($filters));
            break;

        case 'POST':
            if ($action === 'batch') {
                // Batch import
                $data = getJsonBody();
                if (empty($data['sales']) || !is_array($data['sales'])) {
                    jsonError('Se requiere un array de ventas en "sales"');
                }
                $count = Sale::createBatch($data['sales']);
                jsonSuccess(['imported' => $count], "$count ventas importadas");
                break;
            }
            
            $data = getJsonBody();
            $err = validateRequired($data, ['seller_id', 'product_name', 'currency_name', 'amount', 'sale_date', 'week_id']);
            if ($err) jsonError($err);
            $newId = Sale::create($data);
            $sale = Sale::findById($newId);
            jsonSuccess($sale, 'Venta registrada', 201);
            break;

        case 'DELETE':
            if (!$id) jsonError('ID requerido');
            requireRole(['Admin', 'Supervisor']);
            Sale::delete((int)$id);
            jsonSuccess(null, 'Venta eliminada');
            break;

        case 'PUT':
            if (!$id) jsonError('ID requerido');
            requireRole(['Admin', 'Supervisor']);
            $data = getJsonBody();
            $result = Sale::update((int)$id, $data);
            if (!$result) jsonError('Venta no encontrada', 404);
            $sale = Sale::findById((int)$id);
            jsonSuccess($sale, 'Venta actualizada');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
