import { useState, useMemo, useEffect, useRef, useCallback } from 'react';

export interface UseSmartTableOptions {
    /** Tamaño de página por defecto. Default: 40 */
    defaultPageSize?: number;
    /** Delay del debounce en ms para la búsqueda interna. Default: 300 */
    debounceMs?: number;
}

export interface UseSmartTableReturn<T> {
    /** Slice de datos de la página actual — usar esto para renderizar filas */
    paginatedData: T[];
    /** Todos los datos ya filtrados por búsqueda (sin paginar) — usar para totales/KPIs */
    filteredData: T[];
    /** Query de búsqueda actual (input del usuario) */
    searchQuery: string;
    /** Setter del search — aplica debounce internamente */
    setSearchQuery: (q: string) => void;
    /** Página actual (1-indexed) */
    page: number;
    setPage: (p: number) => void;
    /** Registros por página */
    pageSize: number;
    setPageSize: (s: number) => void;
    /** Total de páginas disponibles */
    totalPages: number;
    /** Total de registros filtrados */
    totalCount: number;
    /** Número del primer registro en la página actual (1-indexed, para mostrar "X - Y de Z") */
    rangeFrom: number;
    /** Número del último registro en la página actual */
    rangeTo: number;
}

/**
 * Hook genérico de Tabla Inteligente.
 *
 * Provee paginación, búsqueda con debounce y memoización.
 * Funciona con cualquier array de objetos planos.
 *
 * @param data - Array completo de datos (ya pre-filtrados externamente si es necesario)
 * @param options - Opciones de configuración
 *
 * @example
 * const { paginatedData, filteredData, page, setPage, pageSize, setPageSize,
 *         totalPages, totalCount, rangeFrom, rangeTo, searchQuery, setSearchQuery }
 *       = useSmartTable(allExpenses, { defaultPageSize: 40 });
 */
export function useSmartTable<T extends object>(
    data: T[],
    options: UseSmartTableOptions = {}
): UseSmartTableReturn<T> {
    const { defaultPageSize = 40, debounceMs = 300 } = options;

    const [page, setPageRaw] = useState(1);
    const [pageSize, setPageSizeRaw] = useState(defaultPageSize);
    const [searchQuery, setSearchQueryRaw] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Setter con debounce — evita filter en cada keystroke
    const setSearchQuery = useCallback((q: string) => {
        setSearchQueryRaw(q);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedQuery(q);
            setPageRaw(1); // Reset a página 1 al buscar
        }, debounceMs);
    }, [debounceMs]);

    // Limpiar timer al desmontar
    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    // Filtrado memoizado — O(n) solo cuando data o debouncedQuery cambian
    const filteredData = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase();
        if (!q) return data;
        return data.filter(row =>
            Object.values(row).some(val =>
                String(val ?? '').toLowerCase().includes(q)
            )
        );
    }, [data, debouncedQuery]);

    // Número total de páginas
    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

    // Ajustar página si queda fuera de rango tras filtrar
    useEffect(() => {
        if (page > totalPages) {
            setPageRaw(totalPages);
        }
    }, [totalPages, page]);

    // Wrappers que también hacen reset de página
    const setPage = useCallback((p: number) => {
        setPageRaw(Math.min(Math.max(1, p), totalPages));
    }, [totalPages]);

    const setPageSize = useCallback((s: number) => {
        setPageSizeRaw(s);
        setPageRaw(1);
    }, []);

    // Slice de la página actual — O(pageSize)
    const paginatedData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, page, pageSize]);

    const totalCount = filteredData.length;
    const rangeFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeTo = Math.min(page * pageSize, totalCount);

    return {
        paginatedData,
        filteredData,
        searchQuery,
        setSearchQuery,
        page,
        setPage,
        pageSize,
        setPageSize,
        totalPages,
        totalCount,
        rangeFrom,
        rangeTo,
    };
}
