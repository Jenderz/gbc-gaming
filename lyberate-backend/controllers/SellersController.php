<?php
/**
 * Sellers Controller
 */
require_once __DIR__ . '/../models/Seller.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleSellers(string $method, ?string $id = null) {
    requireRole(['Admin', 'Supervisor']);

    switch ($method) {
        case 'GET':
            if ($id) {
                $seller = Seller::findById((int)$id);
                if (!$seller) jsonError('Vendedor no encontrado', 404);
                jsonSuccess($seller);
            }
            jsonSuccess(Seller::getAll());
            break;

        case 'POST':
            $data = getJsonBody();
            $err = validateRequired($data, ['name']);
            if ($err) jsonError($err);
            if (Seller::findByName($data['name'])) {
                jsonError('Ya existe un vendedor con este nombre', 400);
            }
            $newId = Seller::create($data);
            $seller = Seller::findById($newId);
            jsonSuccess($seller, 'Vendedor creado', 201);
            break;

        case 'PUT':
            if (!$id) jsonError('ID requerido');
            $data = getJsonBody();
            if (isset($data['name'])) {
                $existing = Seller::findByName($data['name']);
                if ($existing && $existing['id'] != $id) {
                    jsonError('Ya existe un vendedor con este nombre', 400);
                }
            }
            Seller::update((int)$id, $data);
            $seller = Seller::findById((int)$id);
            jsonSuccess($seller, 'Vendedor actualizado');
            break;

        case 'DELETE':
            if (!$id) jsonError('ID requerido');
            requireRole(['Admin']);
            Seller::delete((int)$id);
            jsonSuccess(null, 'Vendedor eliminado');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
