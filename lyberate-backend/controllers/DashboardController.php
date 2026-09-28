<?php
/**
 * Dashboard Controller - KPIs and statistics
 *
 * Retorna métricas financieras agrupadas por moneda, incluyendo:
 *  - Ventas, premios, comisiones, utilidad banca (desde `sales`)
 *  - Recaudado y pendiente (desde `payments`)
 *  - Gastos operativos por moneda (desde `expenses`)
 *  - Posturas pendientes por moneda (desde `posturas`)
 *  - Utilidad Neta Real = Utilidad Banca - Gastos - Posturas Pendientes
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleDashboard(string $method, ?string $action = null) {
    $auth = requireRole(['Admin', 'Supervisor']);
    $db = getDB();

    if ($method !== 'GET') jsonError('Método no permitido', 405);

    $weekId = $_GET['week_id'] ?? null;

    // ── Sales stats ───────────────────────────────────────────────────────
    $salesWhere = $weekId ? "WHERE week_id = ?" : "";
    $salesParams = $weekId ? [$weekId] : [];

    $stmt = $db->prepare("SELECT 
        COALESCE(SUM(amount), 0) as total_sales,
        COALESCE(SUM(prize), 0) as total_prizes,
        COALESCE(SUM(commission), 0) as total_commissions,
        COALESCE(SUM(total), 0) as total_net,
        COALESCE(SUM(participation), 0) as total_participation,
        COALESCE(SUM(total_vendor), 0) as total_vendor,
        COALESCE(SUM(total_bank), 0) as total_bank,
        COUNT(*) as sale_count
        FROM sales $salesWhere");
    $stmt->execute($salesParams);
    $salesStats = $stmt->fetch();

    // ── Payments stats ────────────────────────────────────────────────────
    $payWhere = $weekId ? "WHERE week_id = ?" : "";
    $payParams = $weekId ? [$weekId] : [];

    $stmt = $db->prepare("SELECT 
        COALESCE(SUM(CASE WHEN status = 'approved' AND type = 'payment' THEN amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'approved' AND type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
        FROM payments $payWhere");
    $stmt->execute($payParams);
    $payStats = $stmt->fetch();

    // ── Expenses stats — agrupadas POR MONEDA (últimos 30 días) ──────────
    $stmt = $db->prepare(
        "SELECT 
            currency,
            COALESCE(SUM(amount), 0) as total,
            COUNT(*) as count
         FROM expenses 
         WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY currency"
    );
    $stmt->execute();
    $expenseRows = $stmt->fetchAll();

    // Normalizar a { usd, bs, cop }
    $expensesByCurrency = ['usd' => 0.0, 'bs' => 0.0, 'cop' => 0.0];
    foreach ($expenseRows as $row) {
        $key = _currencyKey($row['currency']);
        if ($key) $expensesByCurrency[$key] += (float)$row['total'];
    }

    // Totales globales de gastos (para la tarjeta de resumen general)
    $expStats = [
        'total_expenses' => array_sum($expensesByCurrency),
        'expense_count'  => array_sum(array_column($expenseRows, 'count')),
        'by_currency'    => $expensesByCurrency,
    ];

    // ── Posturas stats — pendientes POR MONEDA ────────────────────────────
    $stmt = $db->prepare(
        "SELECT 
            currency,
            status,
            COALESCE(SUM(amount), 0) as total,
            COUNT(*) as count
         FROM posturas 
         GROUP BY currency, status"
    );
    $stmt->execute();
    $posturaRows = $stmt->fetchAll();

    $posturasByCurrency = [
        'usd' => ['pendiente' => 0.0, 'devuelta' => 0.0, 'cancelada' => 0.0, 'count_pending' => 0],
        'bs'  => ['pendiente' => 0.0, 'devuelta' => 0.0, 'cancelada' => 0.0, 'count_pending' => 0],
        'cop' => ['pendiente' => 0.0, 'devuelta' => 0.0, 'cancelada' => 0.0, 'count_pending' => 0],
    ];
    foreach ($posturaRows as $row) {
        $key = _currencyKey($row['currency']);
        if ($key && isset($posturasByCurrency[$key][$row['status']])) {
            $posturasByCurrency[$key][$row['status']] += (float)$row['total'];
            if ($row['status'] === 'pendiente') {
                $posturasByCurrency[$key]['count_pending'] += (int)$row['count'];
            }
        }
    }

    // ── Active sellers count ───────────────────────────────────────────────
    $sellerCount = $db->query("SELECT COUNT(*) FROM sellers")->fetchColumn();

    jsonSuccess([
        'sales'              => $salesStats,
        'payments'           => $payStats,
        'expenses'           => $expStats,
        'posturas'           => $posturasByCurrency,
        'sellerCount'        => (int)$sellerCount,
    ]);
}

/**
 * Normaliza un string de moneda al key interno (usd / bs / cop).
 */
function _currencyKey(string $currency): ?string {
    $lower = strtolower(trim($currency));
    if (str_contains($lower, 'dolar') || str_contains($lower, 'usd') || $lower === 'usd' || $lower === '$') return 'usd';
    if (str_contains($lower, 'peso') || str_contains($lower, 'cop') || $lower === 'cop') return 'cop';
    if (str_contains($lower, 'bolivar') || str_contains($lower, 'bs') || str_contains($lower, 'ves')) return 'bs';
    return null;
}
