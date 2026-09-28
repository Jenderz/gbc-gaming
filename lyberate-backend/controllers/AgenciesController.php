<?php
/**
 * Agencies Controller
 */
require_once __DIR__ . '/../models/Agency.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleAgencies(string $method, ?string $id = null) {
    requireRole(['Admin']);

    switch ($method) {
        case 'GET':
            if ($id) {
                $agency = Agency::findById((int)$id);
                if (!$agency) jsonError('Agencia no encontrada', 404);
                jsonSuccess($agency);
            }
            $filters = [];
            if (!empty($_GET['seller_id'])) $filters['seller_id'] = $_GET['seller_id'];
            jsonSuccess(Agency::getAll($filters));
            break;

        case 'POST':
            $data = getJsonBody();
            $err = validateRequired($data, ['name', 'seller_id']);
            if ($err) jsonError($err);
            $newId = Agency::create($data);
            $agency = Agency::findById($newId);
            jsonSuccess($agency, 'Agencia creada', 201);
            break;

        case 'PUT':
            if (!$id) jsonError('ID requerido');
            $data = getJsonBody();
            Agency::update((int)$id, $data);
            $agency = Agency::findById((int)$id);
            jsonSuccess($agency, 'Agencia actualizada');
            break;

        case 'DELETE':
            if (!$id) jsonError('ID requerido');
            Agency::delete((int)$id);
            jsonSuccess(null, 'Agencia eliminada');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
