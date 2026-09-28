import React from 'react';
import { Payment } from '../../../services/apiService';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../../utils/exportUtils';
import { useSmartTable } from '../../../hooks/useSmartTable';
import { TablePaginator } from '../../../components/SmartTable/TablePaginator';
import { TableSkeleton } from '../../../components/SmartTable/TableSkeleton';

interface TransactionsTableProps {
    data: Payment[];
    isLoading: boolean;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ data, isLoading }) => {

    const handleExport = () => {
        if (data.length === 0) return;
        const csvData = data.map(p => ({
            Fecha: new Date(p.date).toLocaleDateString('es-ES'),
            Vendedor: p.vendorName || 'Desconocido',
            Metodo: p.method,
            Banco: p.bank || '',
            Referencia: p.reference || '',
            Monto: p.amount,
            Moneda: p.currency,
            Estatus: p.status
        }));
        exportToCSV(csvData, 'transacciones_export.csv');
    };

    const {
        paginatedData,
        page, setPage,
        pageSize, setPageSize,
        totalPages, totalCount,
        rangeFrom, rangeTo,
    } = useSmartTable(data, { defaultPageSize: 10 });

    return (
        <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in flex flex-col">
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-black/5 dark:bg-white/5">
                <h3 className="font-bold text-ios-text">Detalle de Transacciones</h3>
                <button
                    onClick={handleExport}
                    disabled={data.length === 0}
                    className="btn-primary py-1.5 px-3 text-sm flex items-center gap-2"
                >
                    <Download size={14} />
                    Exportar CSV
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">FECHA</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">VENDEDOR</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">MÉTODO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">BANCO/DESTINO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">REFERENCIA</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">MONTO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext text-center">ESTATUS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {isLoading ? (
                            <TableSkeleton cols={7} rows={5} />
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-ios-subtext italic">
                                    No se encontraron transacciones para los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row) => (
                                <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">{new Date(row.date).toLocaleDateString('es-ES')}</td>
                                    <td className="px-6 py-4 font-semibold">{row.vendorName || 'Desconocido'}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-black/5 dark:bg-white/5">{row.method}</span>
                                    </td>
                                    <td className="px-6 py-4">{row.bank || '-'}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{row.reference || '-'}</td>
                                    <td className="px-6 py-4 font-bold text-ios-green">
                                        {row.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} <span className="text-[10px] text-ios-subtext uppercase ml-1 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{row.currency}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            row.status === 'approved'
                                                ? 'bg-ios-green/10 text-ios-green'
                                                : row.status === 'rejected'
                                                    ? 'bg-ios-red/10 text-ios-red'
                                                    : 'bg-orange-500/10 text-orange-500'
                                        }`}>
                                            {row.status === 'approved' ? 'Aprobado' : row.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginador */}
            {!isLoading && totalCount > 0 && (
                <TablePaginator
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    rangeFrom={rangeFrom}
                    rangeTo={rangeTo}
                    setPage={setPage}
                    setPageSize={setPageSize}
                />
            )}
        </div>
    );
};
