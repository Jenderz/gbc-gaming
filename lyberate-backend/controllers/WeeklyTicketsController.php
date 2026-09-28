<?php
/**
 * Weekly Tickets Controller
 */
require_once __DIR__ . '/../models/WeeklyTicket.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleWeeklyTickets(string $method, ?string $action = null, ?string $id = null) {
    $auth = requireRole(['Admin', 'Supervisor', 'Vendedor']);

    switch ($method) {
        case 'GET':
            $filters = [];
            if ($auth['role'] === 'Vendedor') {
                // Forzar seller_id desde el JWT
                $filters['seller_id']     = $auth['seller_id'] ?? '';
                $filters['owner_user_id'] = 'global';
            } else {
                // Admin/Supervisor: solo tickets globales
                $filters['owner_user_id'] = 'global';
                if (!empty($_GET['week_id']))   $filters['week_id']   = $_GET['week_id'];
                if (!empty($_GET['seller_id'])) $filters['seller_id'] = $_GET['seller_id'];
            }
            jsonSuccess(WeeklyTicket::getAll($filters));
            break;

        case 'POST':
            $data = getJsonBody();
            $err = validateRequired($data, ['seller_id', 'week_id', 'currency']);
            if ($err) jsonError($err);
            $ticket = WeeklyTicket::upsert($data);
            jsonSuccess($ticket, 'Ticket actualizado');
            break;

        case 'PUT':
            if (!$id) jsonError('ID requerido');
            if ($action === 'status') {
                $data = getJsonBody();
                $err = validateRequired($data, ['status']);
                if ($err) jsonError($err);
                WeeklyTicket::updateStatus((int)$id, $data['status']);
                $ticket = WeeklyTicket::findById((int)$id);
                jsonSuccess($ticket, 'Estado del ticket actualizado');
            } else {
                jsonError('Acción no válida', 400);
            }
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
