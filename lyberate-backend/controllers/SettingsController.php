<?php
/**
 * Settings Controller - System prefs, currencies, global products
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleSettings(string $method, ?string $resource = null, ?string $id = null) {
    $db = getDB();

    switch ($resource) {
        case 'prefs':
            handlePrefs($method, $db);
            break;
        case 'currencies':
            handleCurrencies($method, $id, $db);
            break;
        case 'products':
            handleGlobalProducts($method, $id, $db);
            break;
        case 'payment-methods':
            handleCatalogs($method, $id, $db, 'payment_methods', 'Método de pago');
            break;
        case 'banks':
            handleCatalogs($method, $id, $db, 'banks', 'Banco');
            break;
        default:
            jsonError('Recurso no encontrado', 404);
    }
}

function handlePrefs(string $method, PDO $db) {
    requireRole(['Admin']);

    switch ($method) {
        case 'GET':
            $stmt = $db->query("SELECT pref_key, pref_value FROM system_prefs");
            $rows = $stmt->fetchAll();
            $prefs = [];
            foreach ($rows as $row) {
                $prefs[$row['pref_key']] = $row['pref_value'];
            }
            // Defaults
            $defaults = [
                'companyName' => 'GBC GAMING',
                'ticketFooterMessage' => '¡Gracias por su jugada! El ticket caduca a los 3 días.',
                'riskLimitAlert' => '500',
                'baseCurrency' => 'DOLAR',
            ];
            jsonSuccess(array_merge($defaults, $prefs));
            break;

        case 'PUT':
            $data = getJsonBody();
            foreach ($data as $key => $value) {
                $stmt = $db->prepare("INSERT INTO system_prefs (pref_key, pref_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE pref_value = ?, updated_at = NOW()");
                $stmt->execute([$key, (string)$value, (string)$value]);
            }
            jsonSuccess(null, 'Preferencias actualizadas');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}

function handleCurrencies(string $method, ?string $id, PDO $db) {
    switch ($method) {
        case 'GET':
            requireAuth();
            $stmt = $db->query("SELECT * FROM currencies ORDER BY name");
            jsonSuccess($stmt->fetchAll());
            break;

        case 'POST':
            requireRole(['Admin']);
            $data = getJsonBody();
            $name = strtoupper(trim($data['name'] ?? ''));
            if (empty($name)) jsonError('Nombre de moneda requerido');
            
            // Check duplicate
            $stmt = $db->prepare("SELECT id FROM currencies WHERE name = ?");
            $stmt->execute([$name]);
            if ($stmt->fetch()) jsonError('La moneda ya existe');

            $stmt = $db->prepare("INSERT INTO currencies (name) VALUES (?)");
            $stmt->execute([$name]);
            jsonSuccess(['id' => (int)$db->lastInsertId(), 'name' => $name], 'Moneda agregada', 201);
            break;

        case 'PUT':
            requireRole(['Admin']);
            if (!$id) jsonError('ID requerido');
            $data = getJsonBody();
            $name = strtoupper(trim($data['name'] ?? ''));
            if (empty($name)) jsonError('Nombre de moneda requerido');

            // Check duplicate
            $stmt = $db->prepare("SELECT id FROM currencies WHERE name = ? AND id != ?");
            $stmt->execute([$name, (int)$id]);
            if ($stmt->fetch()) jsonError('Esa moneda ya existe');

            $stmt = $db->prepare("UPDATE currencies SET name = ? WHERE id = ?");
            $stmt->execute([$name, (int)$id]);
            jsonSuccess(null, 'Moneda actualizada');
            break;

        case 'DELETE':
            requireRole(['Admin']);
            if (!$id) jsonError('ID requerido');
            $stmt = $db->prepare("DELETE FROM currencies WHERE id = ?");
            $stmt->execute([(int)$id]);
            jsonSuccess(null, 'Moneda eliminada');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}

function handleGlobalProducts(string $method, ?string $id, PDO $db) {
    switch ($method) {
        case 'GET':
            requireAuth();
            $stmt = $db->query("SELECT * FROM global_products ORDER BY name");
            jsonSuccess($stmt->fetchAll());
            break;

        case 'POST':
            requireRole(['Admin']);
            $data = getJsonBody();
            $name = strtoupper(trim($data['name'] ?? ''));
            if ($name === 'PARLEY BETM3') $name = 'PARLEY INH';
            if (empty($name)) jsonError('Nombre de producto requerido');

            $stmt = $db->prepare("SELECT id FROM global_products WHERE name = ?");
            $stmt->execute([$name]);
            if ($stmt->fetch()) jsonError('El producto ya existe');

            $stmt = $db->prepare("INSERT INTO global_products (name) VALUES (?)");
            $stmt->execute([$name]);
            jsonSuccess(['id' => (int)$db->lastInsertId(), 'name' => $name], 'Producto agregado', 201);
            break;

        case 'PUT':
            requireRole(['Admin']);
            if (!$id) jsonError('ID requerido');
            $data = getJsonBody();
            $name = strtoupper(trim($data['name'] ?? ''));
            if ($name === 'PARLEY BETM3') $name = 'PARLEY INH';
            if (empty($name)) jsonError('Nombre de producto requerido');

            $stmt = $db->prepare("SELECT id FROM global_products WHERE name = ? AND id != ?");
            $stmt->execute([$name, (int)$id]);
            if ($stmt->fetch()) jsonError('Ese producto ya existe');

            $stmt = $db->prepare("UPDATE global_products SET name = ? WHERE id = ?");
            $stmt->execute([$name, (int)$id]);
            jsonSuccess(null, 'Producto actualizado');
            break;

        case 'DELETE':
            requireRole(['Admin']);
            if (!$id) jsonError('ID requerido');
            $stmt = $db->prepare("DELETE FROM global_products WHERE id = ?");
            $stmt->execute([(int)$id]);
            jsonSuccess(null, 'Producto eliminado');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}

function handleCatalogs(string $method, ?string $id, PDO $db, string $table, string $resourceName) {
    switch ($method) {
        case 'GET':
            requireAuth();
            $allowedTables = ['payment_methods', 'banks'];
            if (!in_array($table, $allowedTables)) jsonError('Tabla no válida', 400);

            $stmt = $db->query("SELECT * FROM `$table` ORDER BY name");
            jsonSuccess($stmt->fetchAll());
            break;

        case 'POST':
            requireRole(['Admin', 'Supervisor']); // O permitir solo Admin si requieres
            $allowedTables = ['payment_methods', 'banks'];
            if (!in_array($table, $allowedTables)) jsonError('Tabla no válida', 400);

            $data = getJsonBody();
            $name = trim($data['name'] ?? '');
            if (empty($name)) jsonError("$resourceName requerido");

            $stmt = $db->prepare("SELECT id FROM `$table` WHERE name = ?");
            $stmt->execute([$name]);
            if ($stmt->fetch()) jsonError("El $resourceName ya existe");

            $stmt = $db->prepare("INSERT INTO `$table` (name) VALUES (?)");
            $stmt->execute([$name]);
            jsonSuccess(['id' => (int)$db->lastInsertId(), 'name' => $name], "$resourceName agregado", 201);
            break;

        case 'PUT':
            requireRole(['Admin', 'Supervisor']);
            if (!$id) jsonError('ID requerido');
            $allowedTables = ['payment_methods', 'banks'];
            if (!in_array($table, $allowedTables)) jsonError('Tabla no válida', 400);

            $data = getJsonBody();
            $name = trim($data['name'] ?? '');
            if (empty($name)) jsonError("$resourceName requerido");

            $stmt = $db->prepare("SELECT id FROM `$table` WHERE name = ? AND id != ?");
            $stmt->execute([$name, (int)$id]);
            if ($stmt->fetch()) jsonError("Ese $resourceName ya existe");

            $stmt = $db->prepare("UPDATE `$table` SET name = ? WHERE id = ?");
            $stmt->execute([$name, (int)$id]);
            jsonSuccess(null, "$resourceName actualizado");
            break;

        case 'DELETE':
            requireRole(['Admin']);
            if (!$id) jsonError('ID requerido');
            $allowedTables = ['payment_methods', 'banks'];
            if (!in_array($table, $allowedTables)) jsonError('Tabla no válida', 400);

            $stmt = $db->prepare("DELETE FROM `$table` WHERE id = ?");
            $stmt->execute([(int)$id]);
            jsonSuccess(null, "$resourceName eliminado");
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
