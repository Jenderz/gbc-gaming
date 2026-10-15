import { useState, useMemo, useCallback } from 'react';
import { now, toISODate } from '../utils/serverTime';

export { toISODate };

// ── Types ──────────────────────────────────────────────────────────
export type FilterPreset = 'today' | 'week' | 'month' | 'all' | 'range';

// ── Week snap helper (Lun–Dom) ─────────────────────────────────────
/** Dado un Date, retorna { start: lunes 00:00, end: domingo 23:59 } */
export const getWeekBounds = (d: Date): { start: Date; end: Date } => {
    const day = d.getDay(); // 0=Sun
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(mon.getDate() + diffToMon);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return { start: mon, end: sun };
};

// ── Hook ───────────────────────────────────────────────────────────
export const useWeeklyFilter = () => {
    const [filterPreset, setFilterPreset] = useState<FilterPreset>('week');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    /**
     * Snap to week: recibe un date-string ("YYYY-MM-DD"),
     * calcula el Lunes y Domingo de esa semana,
     * y setea rangeStart / rangeEnd automáticamente.
     * También cambia el preset a 'range'.
     */
    const snapToWeek = useCallback((dateStr: string) => {
        if (!dateStr) return;
        const d = new Date(dateStr + 'T12:00:00');
        const { start, end } = getWeekBounds(d);
        setRangeStart(toISODate(start));
        setRangeEnd(toISODate(end));
        setFilterPreset('range');
    }, []);

    // ── Computed range ──────────────────────────────────────────────
    const filterRange = useMemo((): { start: Date; end: Date } | null => {
        // now() = hora del servidor (Caracas), inmune a reloj/zona de la PC
        const today = now(); today.setHours(23, 59, 59, 999);
        const todayStart = now(); todayStart.setHours(0, 0, 0, 0);

        if (filterPreset === 'today') return { start: todayStart, end: today };
        if (filterPreset === 'week') return getWeekBounds(todayStart);
        if (filterPreset === 'month') {
            const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
            const end = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }
        if (filterPreset === 'range' && rangeStart && rangeEnd) {
            return {
                start: new Date(rangeStart + 'T00:00:00'),
                end: new Date(rangeEnd + 'T23:59:59')
            };
        }
        return null; // 'all'
    }, [filterPreset, rangeStart, rangeEnd]);

    // ── Human-readable label ────────────────────────────────────────
    const filterLabel = useMemo(() => {
        if (filterPreset === 'today') return 'Hoy';
        if (filterPreset === 'week' && filterRange) {
            return `${filterRange.start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} — ${filterRange.end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
        }
        if (filterPreset === 'month') return now().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        if (filterPreset === 'range' && rangeStart && rangeEnd) return `${rangeStart} al ${rangeEnd}`;
        return 'Todos los registros';
    }, [filterPreset, filterRange, rangeStart, rangeEnd]);

    return {
        filterPreset, setFilterPreset,
        rangeStart, setRangeStart,
        rangeEnd, setRangeEnd,
        searchQuery, setSearchQuery,
        filterRange,
        filterLabel,
        snapToWeek,
    };
};
