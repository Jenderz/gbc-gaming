<?php
/**
 * Agency Portal Controller
 *
 * Handles ALL operations for the "Modo Agencia" portal.
 * Every endpoint requires a valid JWT with is_agency = true.
 * All data is automatically scoped to owner_user_id = auth['userId'].
 *
 * Routes (prefixed /agency/):
 *   sellers          → CRUD sub-sellers
 *   sales            → CRUD sales + batch import
 *   payments         → CRUD payments (self-approved)
 *   weekly-tickets   → upsert weekly closing
 *   products         → read-only global products catalog
 *   currencies       → read-only global currencies catalog
 */

require_once __DIR__ . '/../models/Seller.php';
require_once __DIR__ . '/../models/Sale.php';
require_once __DIR__ . '/../models/Payment.php';
require_once __DIR__ . '/../models/WeeklyTicket.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

/**
 * Middleware: require authenticated user with is_agency = true.
 * Returns the JWT payload.
 */
function requireAgency(): array {
    $auth = requireAuth();
    if ($auth['role'] !== 'Vendedor' || empty($auth['is_agency'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado. Se requiere Modo Agencia activo.']);
        exit;
    }
    return $auth;
}

function handleAgencyPortal(string $method, string $resource, ?string $action = null, ?string $id = null): void {
    switch ($resource) {

        // ── Sub-Sellers ────────────────────────────────────────────────────
        case 'sellers':
            $auth = requireAgency();
            $ownerId = (int)$auth['userId'];

            switch ($method) {
                case 'GET':
                    jsonSuccess(Seller::getAllByOwner($ownerId));
                    break;

                case 'POST':
                    $data = getJsonBody();
                    $err = validateRequired($data, ['name']);
                    if ($err) jsonError($err);
                    // Check duplicate name within this agency scope
                    if (Seller::findByName($data['name'], $ownerId)) {
                        jsonError('Ya existe un vendedor con este nombre en tu agencia', 400);
                    }
                    $data['owner_user_id'] = $ownerId;
                    $newId = Seller::create($data);
                    jsonSuccess(Seller::findById($newId), 'Vendedor creado', 201);
                    break;

                case 'PUT':
                    if (!$id) jsonError('ID requerido');
                    $data = getJsonBody();
                    // Verify ownership
                    $existing = Seller::findById((int)$id);
                    if (!$existing || (int)($existing['owner_user_id'] ?? 0) !== $ownerId) {
                        jsonError('Vendedor no encontrado', 404);
                    }
                    if (isset($data['name'])) {
                        $dup = Seller::findByName($data['name'], $ownerId);
                        if ($dup && $dup['id'] != $id) jsonError('Ya existe un vendedor con ese nombre', 400);
                    }
                    Seller::update((int)$id, $data);
                    jsonSuccess(Seller::findById((int)$id), 'Vendedor actualizado');
                    break;

                case 'DELETE':
                    if (!$id) jsonError('ID requerido');
                    $existing = Seller::findById((int)$id);
                    if (!$existing || (int)($existing['owner_user_id'] ?? 0) !== $ownerId) {
                        jsonError('Vendedor no encontrado', 404);
                    }
                    Seller::delete((int)$id);
                    jsonSuccess(null, 'Vendedor eliminado');
                    break;

                default:
                    jsonError('Método no permitido', 405);
            }
            break;

        // ── Sales ──────────────────────────────────────────────────────────
        case 'sales':
            $auth = requireAgency();
            $ownerId = (int)$auth['userId'];

            switch ($method) {
                case 'GET':
                    $filters = ['owner_user_id' => $ownerId];
                    if (!empty($_GET['week_id']))   $filters['week_id']   = $_GET['week_id'];
                    if (!empty($_GET['seller_id'])) $filters['seller_id'] = $_GET['seller_id'];
                    jsonSuccess(Sale::getAll($filters));
                    break;

                case 'POST':
                    if ($action === 'batch') {
                        $data = getJsonBody();
                        if (empty($data['sales']) || !is_array($data['sales'])) {
                            jsonError('Se requiere un array de ventas en "sales"');
                        }
                        // Inject owner_user_id into every sale
                        foreach ($data['sales'] as &$sale) {
                            $sale['owner_user_id'] = $ownerId;
                        }
                        $count = Sale::createBatch($data['sales']);
                        jsonSuccess(['imported' => $count], "$count ventas importadas");
                        break;
                    }
                    $data = getJsonBody();
                    $err = validateRequired($data, ['seller_id', 'product_name', 'currency_name', 'amount', 'sale_date', 'week_id']);
                    if ($err) jsonError($err);
                    $data['owner_user_id'] = $ownerId;
                    $newId = Sale::create($data);
                    jsonSuccess(Sale::findById($newId), 'Venta registrada', 201);
                    break;

                case 'PUT':
                    if (!$id) jsonError('ID requerido');
                    $existing = Sale::findById((int)$id);
                    if (!$existing || (int)($existing['owner_user_id'] ?? 0) !== $ownerId) {
                        jsonError('Venta no encontrada', 404);
                    }
                    $data = getJsonBody();
                    $result = Sale::update((int)$id, $data);
                    if (!$result) jsonError('Error al actualizar', 500);
                    jsonSuccess(Sale::findById((int)$id), 'Venta actualizada');
                    break;

                case 'DELETE':
                    if (!$id) jsonError('ID requerido');
                    $existing = Sale::findById((int)$id);
                    if (!$existing || (int)($existing['owner_user_id'] ?? 0) !== $ownerId) {
                        jsonError('Venta no encontrada', 404);
                    }
                    Sale::delete((int)$id);
                    jsonSuccess(null, 'Venta eliminada');
                    break;

                default:
                    jsonError('Método no permitido', 405);
            }
            break;

        // ── Payments ───────────────────────────────────────────────────────
        case 'payments':
            $auth = requireAgency();
            $ownerId = (int)$auth['userId'];

            switch ($method) {
                case 'GET':
                    $filters = ['owner_user_id' => $ownerId];
                    if (!empty($_GET['week_id']))   $filters['week_id']   = $_GET['week_id'];
                    if (!empty($_GET['seller_id'])) $filters['seller_id'] = $_GET['seller_id'];
                    if (!empty($_GET['status']))    $filters['status']    = $_GET['status'];
                    jsonSuccess(Payment::getAll($filters));
                    break;

                case 'POST':
                    $data = getJsonBody();

                    // Handle base64 proof image
                    if (!empty($data['proof_base64'])) {
                        $uploadDir = __DIR__ . '/../uploads/proofs/';
                        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
                        $filename = 'proof_' . time() . '_' . bin2hex(random_bytes(4)) . '.jpg';
                        file_put_contents($uploadDir . $filename, base64_decode($data['proof_base64']));
                        $data['proof_image_path'] = 'uploads/proofs/' . $filename;
                        unset($data['proof_base64']);
                    }

                    $err = validateRequired($data, ['seller_id', 'week_label', 'week_id', 'amount', 'currency', 'bank', 'method', 'reference', 'payment_date']);
                    if ($err) jsonError($err);

                    $data['user_id']       = $ownerId;
                    $data['owner_user_id'] = $ownerId;
                    // Agency can self-approve
                    if (!isset($data['status'])) $data['status'] = 'approved';

                    $newId = Payment::create($data);
                    jsonSuccess(Payment::findById($newId), 'Pago registrado', 201);
                    break;

                case 'PUT':
                    if (!$id) jsonError('ID requerido');
                    $existing = Payment::findById((int)$id);
                    if (!$existing || (int)($existing['owner_user_id'] ?? 0) !== $ownerId) {
                        jsonError('Pago no encontrado', 404);
                    }
                    $data = getJsonBody();

                    if ($action === 'edit') {
                        $result = Payment::update((int)$id, $data);
                        if (!$result) jsonError('Error al actualizar', 500);
                        jsonSuccess(Payment::findById((int)$id), 'Pago actualizado');
                    } else {
                        // Status update (approve/reject)
                        $err = validateRequired($data, ['status']);
                        if ($err) jsonError($err);
                        Payment::updateStatus((int)$id, $data['status'], $data['admin_note'] ?? null);
                        jsonSuccess(Payment::findById((int)$id), 'Estado actualizado');
                    }
                    break;

                default:
                    jsonError('Método no permitido', 405);
            }
            break;

        // ── Weekly Tickets ─────────────────────────────────────────────────
        case 'weekly-tickets':
            $auth = requireAgency();
            $ownerId = (int)$auth['userId'];

            switch ($method) {
                case 'GET':
                    $filters = ['owner_user_id' => $ownerId];
                    if (!empty($_GET['week_id']))   $filters['week_id']   = $_GET['week_id'];
                    if (!empty($_GET['seller_id'])) $filters['seller_id'] = $_GET['seller_id'];
                    jsonSuccess(WeeklyTicket::getAll($filters));
                    break;

                case 'POST':
                    $data = getJsonBody();
                    $err = validateRequired($data, ['seller_id', 'week_id', 'currency']);
                    if ($err) jsonError($err);
                    $data['owner_user_id'] = $ownerId;
                    $ticket = WeeklyTicket::upsert($data);
                    jsonSuccess($ticket, 'Ticket actualizado');
                    break;

                default:
                    jsonError('Método no permitido', 405);
            }
            break;

        // ── Products catalog (read-only, global) ───────────────────────────
        case 'products':
            requireAgency();
            if ($method !== 'GET') jsonError('Método no permitido', 405);
            $db = getDB();
            $products = $db->query("SELECT name FROM global_products ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
            jsonSuccess($products);
            break;

        // ── Currencies catalog (read-only, global) ─────────────────────────
        case 'currencies':
            requireAgency();
            if ($method !== 'GET') jsonError('Método no permitido', 405);
            $db = getDB();
            $currencies = $db->query("SELECT name FROM currencies ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
            jsonSuccess($currencies);
            break;

        default:
            jsonError('Recurso de agencia no encontrado', 404);
    }
}
