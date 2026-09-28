import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginatorProps {
    page: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    rangeFrom: number;
    rangeTo: number;
    setPage: (p: number) => void;
    setPageSize: (s: number) => void;
    /** Opciones de tamaño de página. Default: [20, 40, 100, 200] */
    pageSizeOptions?: number[];
}

const PAGE_SIZE_OPTIONS_DEFAULT = [20, 40, 100, 200];

/**
 * Barra de paginación reutilizable.
 * Muestra el rango "X – Y de Z", selector de filas/página y botones de navegación.
 */
export const TablePaginator = ({
    page,
    totalPages,
    totalCount,
    pageSize,
    rangeFrom,
    rangeTo,
    setPage,
    setPageSize,
    pageSizeOptions = PAGE_SIZE_OPTIONS_DEFAULT,
}: TablePaginatorProps) => {
    if (totalCount === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-black/5 dark:border-white/5">
            {/* Info de rango */}
            <span className="text-xs text-ios-subtext font-medium">
                Mostrando{' '}
                <strong className="text-ios-text">{rangeFrom}–{rangeTo}</strong>
                {' '}de{' '}
                <strong className="text-ios-text">{totalCount}</strong>
                {' '}registros
            </span>

            <div className="flex items-center gap-3">
                {/* Selector de filas por página */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-ios-subtext hidden sm:inline">Filas:</span>
                    <select
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                        className="text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-ios-text outline-none focus:border-ios-blue/50 transition-all cursor-pointer"
                    >
                        {pageSizeOptions.map(s => (
                            <option key={s} value={s} className="bg-white dark:bg-[#1c1c1e]">
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Botones de navegación */}
                <div className="flex items-center gap-1">
                    {/* Primera página */}
                    <button
                        onClick={() => setPage(1)}
                        disabled={page <= 1}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-ios-text"
                        title="Primera página"
                    >
                        «
                    </button>

                    {/* Anterior */}
                    <button
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                        className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Página anterior"
                    >
                        <ChevronLeft size={14} className="text-ios-text" />
                    </button>

                    {/* Indicador de página actual */}
                    <span className="px-3 py-1.5 rounded-lg bg-ios-blue/10 text-ios-blue text-xs font-bold border border-ios-blue/20 min-w-[60px] text-center">
                        {page} / {totalPages}
                    </span>

                    {/* Siguiente */}
                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages}
                        className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Página siguiente"
                    >
                        <ChevronRight size={14} className="text-ios-text" />
                    </button>

                    {/* Última página */}
                    <button
                        onClick={() => setPage(totalPages)}
                        disabled={page >= totalPages}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-ios-text"
                        title="Última página"
                    >
                        »
                    </button>
                </div>
            </div>
        </div>
    );
};
