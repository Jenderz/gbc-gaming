<?php
/**
 * Posturas Controller
 *
 * Endpoints:
 *  GET    /posturas                   – Lista posturas (con filtros opcionales)
 *  POST   /posturas                   – Crear nueva postura
 *  PUT    /posturas/{id}/return       – Marcar como devuelta
 *  PUT    /posturas/{id}/cancel       – Cancelar postura
 *  DELETE /posturas/{id}              – Eliminar (solo Admin)
 */
require_once __DIR__ . '/../models/Postura.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handlePosturas(string $method, ?string $id = null, ?string $action = null) {
    requireRole(['Admin', 'Supervisor']);

    switch ($method) {

        // ── GET: Listar posturas ─────────────────────────────────────────
        case 'GET':
            $filters = [];
            if (!empty($_GET['status']))    $filters['status']    = $_GET['status'];
            if (!empty($_GET['currency']))  $filters['currency']  = $_GET['currency'];
            if (!empty($_GET['date_from'])) $filters['date_from'] = $_GET['date_from'];
            if (!empty($_GET['date_to']))   $filters['date_to']   = $_GET['date_to'];
            if (!empty($_GET['week_id']))   $filters['week_id']   = $_GET['week_id'];

            if ($action === 'summary') {
                jsonSuccess(Postura::getSummaryByCurrency());
                break;
            }

            jsonSuccess(Postura::getAll($filters));
            break;

        // ── POST: Crear postura ──────────────────────────────────────────
        case 'POST':
            $data = getJsonBody();
            $err = validateRequired($data, ['postura_date', 'concept', 'amount', 'currency', 'method']);
            if ($err) jsonError($err);

            if ($data['amount'] <= 0) jsonError('El monto debe ser mayor a 0.');

            $newId = Postura::create($data);
            $postura = Postura::findById($newId);
            jsonSuccess($postura, 'Postura registrada', 201);
            break;

        // ── PUT: Acciones sobre postura existente ────────────────────────
        case 'PUT':
            if (!$id) jsonError('ID requerido.');
            $data = getJsonBody();

            if ($action === 'return') {
                // Marcar como devuelta
                $err = validateRequired($data, ['returned_date']);
                if ($err) jsonError($err);

                $ok = Postura::markReturned((int)$id, $data['returned_date'], $data['return_note'] ?? null);
                if (!$ok) jsonError('No se pudo marcar como devuelta. Verifica que esté en estado pendiente.', 400);

                jsonSuccess(Postura::findById((int)$id), 'Postura marcada como devuelta');
                break;
            }

            if ($action === 'cancel') {
                // Cancelar postura
                $ok = Postura::cancel((int)$id, $data['return_note'] ?? null);
                if (!$ok) jsonError('No se pudo cancelar. Verifica que esté en estado pendiente.', 400);

                jsonSuccess(Postura::findById((int)$id), 'Postura cancelada');
                break;
            }

            jsonError('Acción no reconocida. Usa /return o /cancel', 400);
            break;

        // ── DELETE: Eliminar postura ─────────────────────────────────────
        case 'DELETE':
            if (!$id) jsonError('ID requerido.');
            requireRole(['Admin']);
            Postura::delete((int)$id);
            jsonSuccess(null, 'Postura eliminada');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
