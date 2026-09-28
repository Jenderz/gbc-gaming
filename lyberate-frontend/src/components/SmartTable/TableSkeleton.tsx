interface TableSkeletonProps {
    /** Número de columnas a simular */
    cols?: number;
    /** Número de filas skeleton a mostrar */
    rows?: number;
}

/**
 * Skeleton de carga para tablas.
 * Renderiza filas pulsantes mientras los datos están cargando.
 * Usar dentro de un <tbody>.
 *
 * @example
 * <tbody>
 *   {isLoading ? (
 *     <TableSkeleton cols={7} rows={8} />
 *   ) : (
 *     paginatedData.map(row => ...)
 *   )}
 * </tbody>
 */
export const TableSkeleton = ({ cols = 7, rows = 8 }: TableSkeletonProps) => {
    // Anchos variables para que parezcan datos reales
    const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-1/3', 'w-3/5', 'w-2/5'];

    return (
        <>
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <tr key={rowIdx} className="animate-pulse">
                    {Array.from({ length: cols }).map((_, colIdx) => (
                        <td key={colIdx} className="px-4 py-3">
                            <div
                                className={`h-3.5 bg-black/5 dark:bg-white/5 rounded-lg ${widths[(rowIdx + colIdx) % widths.length]}`}
                                style={{ animationDelay: `${rowIdx * 40}ms` }}
                            />
                            {/* Primera columna tiene línea secundaria (simula nombre + subtítulo) */}
                            {colIdx === 0 && (
                                <div
                                    className="h-2.5 bg-black/5 dark:bg-white/5 rounded-lg w-1/2 mt-1.5"
                                    style={{ animationDelay: `${rowIdx * 40 + 20}ms` }}
                                />
                            )}
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
};
