/**
 * Reloj centralizado de la app, sincronizado con la hora del servidor
 * (America/Caracas, UTC-4). Así, aunque el reloj o la zona horaria de la PC
 * estén mal configurados, los valores por defecto ("hoy", semanas, filtros)
 * se calculan con la hora oficial del servidor.
 *
 * `now()` devuelve un Date cuyos campos LOCALES representan la hora de
 * Caracas, de modo que todo el código existente basado en getDay(),
 * setHours(), toISODate(), etc. sigue funcionando igual pero en hora Caracas.
 */

const CARACAS_UTC_OFFSET_MS = -4 * 60 * 60 * 1000;

// Diferencia entre la "hora de pared" de Caracas y la hora local de la PC.
// null = aún no sincronizado (se usa el respaldo por zona horaria).
let wallOffsetMs: number | null = null;

/** Indica si el reloj ya fue sincronizado con el servidor */
export function isClockSynced(): boolean {
    return wallOffsetMs !== null;
}

/** Formatea un Date a "YYYY-MM-DD" usando sus campos locales */
export const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

/**
 * Sincroniza el reloj con la hora del servidor.
 * Acepta el ISO devuelto por GET /time (ej. "2026-10-15T09:23:17-04:00").
 */
export function setServerWallClock(datetimeISO: string): void {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(datetimeISO || '');
    if (!m) return;
    // Se interpreta como hora local: los campos locales del Date quedan en hora Caracas
    const serverWall = new Date(`${m[1]}T${m[2]}`);
    if (isNaN(serverWall.getTime())) return;
    wallOffsetMs = serverWall.getTime() - Date.now();
}

/**
 * Respaldo sin sincronización: asume que el reloj de la PC es correcto pero
 * puede tener otra zona horaria; aun así convierte a hora Caracas (UTC-4).
 */
function fallbackOffsetMs(): number {
    return new Date().getTimezoneOffset() * 60_000 + CARACAS_UTC_OFFSET_MS;
}

/** Fecha/hora actual en hora del servidor (Caracas). */
export function now(): Date {
    return new Date(Date.now() + (wallOffsetMs ?? fallbackOffsetMs()));
}

/** "YYYY-MM-DD" de hoy en hora del servidor (Caracas). */
export function todayISO(): string {
    return toISODate(now());
}
