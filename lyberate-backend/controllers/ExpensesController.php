<?php
/**
 * Expenses Controller
 */
require_once __DIR__ . '/../models/Expense.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleExpenses(string $method, ?string $id = null) {
    requireRole(['Admin', 'Supervisor']);

    switch ($method) {
        case 'GET':
            $filters = [];
            if (!empty($_GET['date_from'])) $filters['date_from'] = $_GET['date_from'];
            if (!empty($_GET['date_to'])) $filters['date_to'] = $_GET['date_to'];
            jsonSuccess(Expense::getAll($filters));
            break;

        case 'POST':
            $data = getJsonBody();
            $err = validateRequired($data, ['expense_date', 'type', 'concept', 'method', 'bank', 'amount', 'currency']);
            if ($err) jsonError($err);
            $newId = Expense::create($data);
            $expense = Expense::findById($newId);
            jsonSuccess($expense, 'Gasto registrado', 201);
            break;

        case 'DELETE':
            if (!$id) jsonError('ID requerido');
            requireRole(['Admin']);
            Expense::delete((int)$id);
            jsonSuccess(null, 'Gasto eliminado');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
