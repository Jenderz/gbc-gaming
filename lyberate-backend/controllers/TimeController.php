<?php
/**
 * Time Controller
 *
 * Exposes the authoritative server time for the app (America/Caracas, UTC-4).
 * The frontend uses this to keep date defaults, week calculations and filters
 * correct even when a client machine's clock/timezone is wrong.
 */

require_once __DIR__ . '/../utils/Response.php';

function handleTime(string $method): void {
    if ($method !== 'GET') {
        jsonError('Método no permitido', 405);
    }

    $tz = new DateTimeZone('America/Caracas');
    $now = new DateTime('now', $tz);

    jsonSuccess([
        'datetime' => $now->format(DateTimeInterface::ATOM), // 2026-10-15T09:23:17-04:00
        'date'     => $now->format('Y-m-d'),
        'weekday'  => (int) $now->format('N'), // 1=Lunes ... 7=Domingo
        'timezone' => 'America/Caracas',
        'utc_offset_minutes' => (int) ($now->getOffset() / 60), // -240
        'timestamp' => $now->getTimestamp(),
    ]);
}
