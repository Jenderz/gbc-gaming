<?php
/**
 * Lyberate Backend - Main Entry Point & Router
 * All requests are routed through this file via .htaccess
 */

// Error reporting for development (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Load core
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/utils/Response.php';

// Handle CORS
handleCors();

// CORS handles options and common headers.
// Specific JSON responses handle their own content-type and cache-control.

// Parse URL
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = '/api'; // Adjust if backend is in a subdirectory

// Remove query string
$path = parse_url($requestUri, PHP_URL_PATH);

// Remove base path prefix if present
if (strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}

// Clean path
$path = trim($path, '/');
$segments = $path ? explode('/', $path) : [];
$method = $_SERVER['REQUEST_METHOD'];

// Route
$resource = $segments[0] ?? '';
$action = $segments[1] ?? null;
$id = $segments[2] ?? $segments[1] ?? null;

try {
    switch ($resource) {
        case 'auth':
            require_once __DIR__ . '/controllers/AuthController.php';
            handleAuth($method, $action ?? '');
            break;

        case 'users':
            require_once __DIR__ . '/controllers/UsersController.php';
            // Support /users/{id}/{action} e.g. toggle-agency, purge-agency
            $userAction = $segments[2] ?? null;
            handleUsers($method, $action, $userAction);
            break;

        case 'sellers':
            require_once __DIR__ . '/controllers/SellersController.php';
            handleSellers($method, $action);
            break;

        case 'seller-aliases':
            require_once __DIR__ . '/controllers/SellerAliasesController.php';
            handleSellerAliases($method);
            break;

        case 'sales':
            require_once __DIR__ . '/controllers/SalesController.php';
            // Check for /sales/batch
            if ($action === 'batch') {
                handleSales($method, 'batch');
            } else {
                handleSales($method, null, $action); // $action is the ID for DELETE/PUT
            }
            break;

        case 'payments':
            require_once __DIR__ . '/controllers/PaymentsController.php';
            require_once __DIR__ . '/models/User.php';
            // /payments/vendor/{id} OR /payments/{id}/status OR /payments/{id}/edit
            if ($action === 'vendor') {
                handlePayments($method, 'vendor', $segments[2] ?? null);
            } elseif (isset($segments[2]) && $segments[2] === 'status') {
                handlePayments('PUT', 'status', $action);
            } elseif (isset($segments[2]) && $segments[2] === 'edit') {
                handlePayments('PUT', 'edit', $action);
            } else {
                handlePayments($method, $action, $action);
            }
            break;

        case 'agencies':
            require_once __DIR__ . '/controllers/AgenciesController.php';
            handleAgencies($method, $action);
            break;

        case 'agency':
            // Agency Portal — all sub-routes handled here
            // Routes: /agency/{resource}/{id?}/{action?}
            // e.g. /agency/sellers, /agency/sales/batch, /agency/payments/5/edit
            require_once __DIR__ . '/controllers/AgencyPortalController.php';
            $agencyResource = $action ?? '';  // segments[1]
            $agencyId       = $segments[2] ?? null; // segments[2] (numeric ID or 'batch')
            $agencyAction   = $segments[3] ?? null; // segments[3] (e.g. 'edit', 'status')

            // Handle /agency/sales/batch  (/agency/{resource}/{id})
            if ($agencyId === 'batch') {
                handleAgencyPortal($method, $agencyResource, 'batch', null);
            }
            // Handle /agency/payments/{id}/edit or /agency/payments/{id}/status
            elseif ($agencyAction !== null) {
                handleAgencyPortal($method, $agencyResource, $agencyAction, $agencyId);
            }
            // Handle /agency/{resource}/{id}
            else {
                handleAgencyPortal($method, $agencyResource, null, $agencyId);
            }
            break;

        case 'weekly-tickets':
            require_once __DIR__ . '/controllers/WeeklyTicketsController.php';
            // /weekly-tickets/{id}/status
            if (isset($segments[2]) && $segments[2] === 'status') {
                handleWeeklyTickets('PUT', 'status', $action);
            } else {
                handleWeeklyTickets($method, $action, $action);
            }
            break;

        case 'expenses':
            require_once __DIR__ . '/controllers/ExpensesController.php';
            handleExpenses($method, $action);
            break;

        case 'posturas':
            require_once __DIR__ . '/controllers/PosturasController.php';
            // /posturas                   → list / create
            // /posturas/summary           → resumen por moneda (GET)
            // /posturas/{id}/return       → marcar como devuelta (PUT)
            // /posturas/{id}/cancel       → cancelar postura (PUT)
            // /posturas/{id}              → eliminar (DELETE)
            if ($action === 'summary') {
                handlePosturas($method, null, 'summary');
            } elseif (isset($segments[2]) && in_array($segments[2], ['return', 'cancel'])) {
                // /posturas/{id}/{action}
                handlePosturas($method, $action, $segments[2]);
            } else {
                handlePosturas($method, $action, null);
            }
            break;

        case 'settings':
            require_once __DIR__ . '/controllers/SettingsController.php';
            // /settings/{resource}/{id}
            handleSettings($method, $action, $segments[2] ?? null);
            break;

        case 'dashboard':
            require_once __DIR__ . '/controllers/DashboardController.php';
            handleDashboard($method, $action);
            break;

        case '':
            jsonSuccess([
                'name' => 'Lyberate API',
                'version' => '1.0.0',
                'status' => 'running',
            ]);
            break;

        default:
            jsonError('Endpoint no encontrado', 404);
    }
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    jsonError('Error interno de base de datos', 500);
} catch (Exception $e) {
    error_log("Server error: " . $e->getMessage());
    jsonError('Error interno del servidor', 500);
}
