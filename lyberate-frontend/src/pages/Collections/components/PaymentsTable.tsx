import { useState, useMemo } from 'react';
import { Eye, FileText, Pencil } from 'lucide-react';
import { Payment } from '../../../services/apiService';
import { useSmartTable } from '../../../hooks/useSmartTable';
import { TablePaginator } from '../../../components/SmartTable/TablePaginator';
import { TableSkeleton } from '../../../components/SmartTable/TableSkeleton';
import { CurrencyChips } from '../../../components/SmartTable/CurrencyChips';

interface Props {
    filteredPayments: Payment[];
    isLoading?: boolean;
    onOpenProof: (src: string) => void;
    onSelectTicket: (payment: Payment) => void;
    onEditPayment?: (payment: Payment) => void;
}

export const PaymentsTable = ({ filteredPayments, isLoading = false, onOpenProof, onSelectTicket, onEditPayment }: Props) => {

    const [currencyFilter, setCurrencyFilter] = useState('ALL');

    // Monedas disponibles — derivadas dinámicamente de los pagos actuales
    const availableCurrencies = useMemo(() =>
        Array.from(new Set(filteredPayments.map(p => p.currency))).sort()
    , [filteredPayments]);

    // Aplicar filtro de moneda antes de pasar a useSmartTable
    const currencyFiltered = useMemo(() =>
        currencyFilter === 'ALL'
            ? filteredPayments
            : filteredPayments.filter(p => p.currency === currencyFilter)
    , [filteredPayments, currencyFilter]);

    const {
        paginatedData,
        page, setPage,
        pageSize, setPageSize,
        totalPages, totalCount,
        rangeFrom, rangeTo,
    } = useSmartTable(currencyFiltered, { defaultPageSize: 40 });

    return (
        <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">

            {/* Toolbar — filtro por moneda */}
            {!isLoading && availableCurrencies.length > 1 && (
                <div className="px-5 py-3 border-b border-black/5 dark:border-white/5 flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-ios-subtext uppercase tracking-wider">Moneda:</span>
                    <CurrencyChips
                        currencies={availableCurrencies}
                        selected={currencyFilter}
                        onSelect={setCurrencyFilter}
                    />
                    {totalCount > 0 && (
                        <span className="ml-auto text-xs font-semibold text-ios-subtext">
                            {totalCount} pago(s)
                        </span>
                    )}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">ID RECIBO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">VENDEDOR</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">TIPO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">MONTO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext text-center">ESTADO</th>
                            <th className="px-6 py-4 font-semibold text-ios-subtext">FECHA</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {isLoading ? (
                            <TableSkeleton cols={7} rows={8} />
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-ios-subtext italic">
                                    {filteredPayments.length === 0
                                        ? 'No hay pagos registrados en este período.'
                                        : currencyFilter !== 'ALL'
                                            ? `Sin pagos en ${currencyFilter} para este período.`
                                            : 'Sin resultados para tu búsqueda.'}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row) => {
                                const isCredit = row.type === 'credit';
                                return (
                                    <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium font-mono text-xs text-ios-subtext">{row.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold">{row.vendorName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {isCredit ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    💳 Crédito
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ios-green/10 text-ios-green border border-ios-green/20">
                                                    💰 Pago
                                                </span>
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 font-bold ${isCredit ? 'text-amber-500' : 'text-ios-green'}`}>
                                            {row.amount.toFixed(2)}{' '}
                                            <span className="text-[10px] text-ios-subtext uppercase ml-1 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">
                                                {row.currency}
                                            </span>
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
                                        <td className="px-6 py-4 text-ios-subtext">{row.date}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {onEditPayment && (
                                                    <button
                                                        onClick={() => onEditPayment(row)}
                                                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Editar Pago"
                                                    >
                                                        <Pencil size={17} />
                                                    </button>
                                                )}
                                                {row.proofImageUrl && (
                                                    <button
                                                        onClick={() => onOpenProof(row.proofImageUrl!)}
                                                        className="text-ios-blue hover:text-blue-600 hover:bg-blue-500/10 p-1.5 rounded-lg transition-all"
                                                        title="Ver Comprobante"
                                                    >
                                                        <Eye size={17} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onSelectTicket(row)}
                                                    className="text-ios-subtext hover:text-ios-blue hover:bg-blue-500/10 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Generar Ticket"
                                                >
                                                    <FileText size={17} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
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
