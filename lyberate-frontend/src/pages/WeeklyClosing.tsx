import { useState, useMemo, useEffect, useRef } from 'react';
import { renderElementToDataUrl } from '../utils/ticketRenderer';
import {
    CalendarCheck, ChevronDown, ChevronUp, Receipt,
    CheckCircle2, Clock, AlertCircle, Building2, Package, X, Download, Share2,
    Search
} from 'lucide-react';
import {
    getSales, getPayments, getSellers, getWeeklyPeriods,
    upsertWeeklyTicket, getWeeklyTickets,
    Seller, WeeklyTicket
} from '../services/apiService';
import { roundFinance, getSymbol } from '../utils/finance';
import { WeekSelector } from '../components/WeekSelector';


// ─── Badge de status ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: WeeklyTicket['status'] }) => {
    const map = {
        open: { label: 'Abierta', icon: Clock, cls: 'bg-orange-500/10 text-orange-500' },
        pending: { label: 'Pendiente', icon: AlertCircle, cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
        settled: { label: 'Liquidada', icon: CheckCircle2, cls: 'bg-ios-green/10 text-ios-green' },
    };
    const { label, icon: Icon, cls } = map[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>
            <Icon size={11} /> {label}
        </span>
    );
};

// ─── Tipo fila del reporte ────────────────────────────────────────────────────
type SellerRow = {
    sellerId: string;
    sellerName: string;
    currency: string;
    totalSales: number;
    totalPrize: number;
    totalCommission: number;
    totalNet: number;
    totalParticipation: number;
    totalVendor: number;
    totalBank: number;
    totalPaid: number;
    balance: number;
    agencyBreakdown: { agencyName: string; amount: number; totalBank: number }[];
    productBreakdown: { productName: string; amount: number; totalBank: number; count: number }[];
};

// ─── Formateador ──────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Normalizador para búsqueda insensible a mayúsculas y acentos ─────────────
const normalizeText = (text: string) =>
    (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// ─── Main Component ───────────────────────────────────────────────────────────
export const WeeklyClosing = () => {
    const [allSalesData, setAllSalesData] = useState<any[]>([]);
    const [allPaymentsData, setAllPaymentsData] = useState<any[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [tickets, setTickets] = useState<WeeklyTicket[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Receptor de impresión HTML2Canvas
    const [printingRow, setPrintingRow] = useState<SellerRow | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
    const [generatedImage, setGeneratedImage] = useState<{ url: string, sellerName: string, currency: string } | null>(null);

    const refreshAll = async () => {
        const [sales, payments, sel, tix] = await Promise.all([getSales(), getPayments(), getSellers(), getWeeklyTickets()]);
        setAllSalesData(sales);
        setAllPaymentsData(payments);
        setSellers(sel);
        setTickets(tix);
    };

    useEffect(() => { refreshAll(); }, []);

    // Derive weekly periods from loaded data
    const weeklyPeriods = useMemo(() => {
        const dates = [
            ...allSalesData.map(s => s.date),
            ...allPaymentsData.map(p => p.date)
        ].filter(Boolean);
        return getWeeklyPeriods(dates, 8);
    }, [allSalesData, allPaymentsData]);

    const [selectedPeriodId, setSelectedPeriodId] = useState('');

    // Auto-select first period when periods load
    useEffect(() => {
        if (weeklyPeriods.length > 0 && !selectedPeriodId) {
            setSelectedPeriodId(weeklyPeriods[0].id);
        }
    }, [weeklyPeriods]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // ── Construcción del reporte ───────────────────────────────────────────────
    const report = useMemo(() => {
        const allSales = allSalesData.filter(s => s.weekId === selectedPeriodId);
        const allPayments = allPaymentsData.filter(p => p.weekId === selectedPeriodId && p.status === 'approved');
        const selectedPeriod = weeklyPeriods.find(p => p.id === selectedPeriodId);

        const map = new Map<string, SellerRow>();

        allSales.forEach(sale => {
            const key = `${sale.sellerId}|${sale.currencyName}`;
            if (!map.has(key)) {
                map.set(key, {
                    sellerId: sale.sellerId,
                    sellerName: sale.sellerName,
                    currency: sale.currencyName,
                    totalSales: 0, totalPrize: 0, totalCommission: 0, totalNet: 0,
                    totalParticipation: 0, totalVendor: 0, totalBank: 0,
                    totalPaid: 0, balance: 0,
                    agencyBreakdown: [],
                    productBreakdown: [],
                });
            }
            const row = map.get(key)!;
            row.totalSales = roundFinance(row.totalSales + sale.amount);
            row.totalPrize = roundFinance(row.totalPrize + sale.prize);
            row.totalCommission = roundFinance(row.totalCommission + sale.commission);
            row.totalNet = roundFinance(row.totalNet + sale.total);
            row.totalParticipation = roundFinance(row.totalParticipation + sale.participation);
            row.totalVendor = roundFinance(row.totalVendor + sale.totalVendor);
            row.totalBank = roundFinance(row.totalBank + sale.totalBank);

            // Desglose por agencia (si está especificada)
            if (sale.agencyName) {
                const existing = row.agencyBreakdown.find(a => a.agencyName === sale.agencyName);
                if (existing) {
                    existing.amount = roundFinance(existing.amount + sale.amount);
                    existing.totalBank = roundFinance(existing.totalBank + sale.totalBank);
                } else {
                    row.agencyBreakdown.push({ agencyName: sale.agencyName, amount: sale.amount, totalBank: sale.totalBank });
                }
            }

            // Desglose por producto
            if (sale.productName) {
                const existingProd = row.productBreakdown.find(p => p.productName === sale.productName);
                if (existingProd) {
                    existingProd.amount = roundFinance(existingProd.amount + sale.amount);
                    existingProd.totalBank = roundFinance(existingProd.totalBank + sale.totalBank);
                    existingProd.count += 1;
                } else {
                    row.productBreakdown.push({ productName: sale.productName, amount: sale.amount, totalBank: sale.totalBank, count: 1 });
                }
            }
        });

        // Sumar pagos aprobados
        allPayments.forEach(pay => {
            map.forEach((row) => {
                if (row.sellerId === pay.sellerId && row.currency === pay.currency) {
                    row.totalPaid = roundFinance(row.totalPaid + pay.amount);
                }
            });
        });

        // Calcular balance
        map.forEach(row => {
            row.balance = roundFinance(row.totalBank - row.totalPaid);
        });

        return { rows: Array.from(map.values()), period: selectedPeriod };
    }, [selectedPeriodId, sellers, allSalesData, allPaymentsData]);

    // ── Filtrado de vendedores por buscador ────────────────────────────────────
    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return report.rows;
        const term = normalizeText(searchTerm);
        return report.rows.filter(row => {
            const matchName = normalizeText(row.sellerName).includes(term);
            const matchCurrency = normalizeText(row.currency).includes(term);
            const matchProduct = row.productBreakdown?.some(p => normalizeText(p.productName).includes(term));
            const matchAgency = row.agencyBreakdown?.some(a => normalizeText(a.agencyName).includes(term));
            return matchName || matchCurrency || matchProduct || matchAgency;
        });
    }, [report.rows, searchTerm]);

    // ── Filtrado de tickets generados por buscador ─────────────────────────────
    const filteredTickets = useMemo(() => {
        const periodTickets = tickets.filter(t => t.weekId === selectedPeriodId && t.status !== 'open');
        if (!searchTerm.trim()) return periodTickets;
        const term = normalizeText(searchTerm);
        return periodTickets.filter(t => normalizeText(t.sellerName).includes(term) || normalizeText(t.currency).includes(term));
    }, [tickets, selectedPeriodId, searchTerm]);

    // ── Previsualizar ticket (sin guardar) ────────────────────────────────────
    const handlePreviewTicket = (row: SellerRow) => {
        setGeneratingFor(row.sellerId + row.currency);
        setPrintingRow(row);
        // La captura se dispara desde el useEffect de abajo cuando el DOM esté listo
    };

    // Disparar renderizador justo después de que React pinte printingRow en el DOM
    useEffect(() => {
        if (!printingRow) return;

        let isMounted = true;
        // 120ms permite a React pintar completamente el DOM escondido de printingRow
        const timer = setTimeout(async () => {
            if (!receiptRef.current) {
                if (isMounted) {
                    setPrintingRow(null);
                    setGeneratingFor(null);
                }
                return;
            }
            try {
                const image = await renderElementToDataUrl(receiptRef.current, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                });
                if (isMounted) {
                    setGeneratedImage({ url: image, sellerName: printingRow.sellerName, currency: printingRow.currency });
                }
            } catch (e) {
                console.error('Error generating receipt image', e);
            } finally {
                if (isMounted) {
                    setPrintingRow(null);
                    setGeneratingFor(null);
                }
            }
        }, 120);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [printingRow]);

    // ── Generar ticket para un vendedor e invocar preview ─────────────────────
    const handleGenerateTicket = async (row: SellerRow) => {
        const selectedPeriod = weeklyPeriods.find(p => p.id === selectedPeriodId);

        // 1. Guardar Snapshot + Refrescar datos EN PARALELO con la generación del recibo
        //    (no bloqueamos la UI esperando el refresh completo)
        upsertWeeklyTicket({
            sellerId: row.sellerId,
            sellerName: row.sellerName,
            weekId: selectedPeriodId,
            weekLabel: selectedPeriod?.label || '',
            totalSales: row.totalSales,
            totalPrize: row.totalPrize,
            totalCommission: row.totalCommission,
            totalNet: row.totalNet,
            totalParticipation: row.totalParticipation,
            totalVendor: row.totalVendor,
            totalBank: row.totalBank,
            totalPaid: row.totalPaid,
            balance: row.balance,
            currency: row.currency,
            status: 'settled',
        }).then(() => {
            // Actualizar datos en segundo plano sin bloquear la pantalla
            refreshAll();
            showToast(`✅ Recibo guardado: ${row.sellerName}`);
        }).catch(err => console.error('Error guardando snapshot:', err));

        // 2. Iniciar generación visual del ticket inmediatamente
        handlePreviewTicket(row);
    };

    // ── Funciones de Compartir/Descargar ──────────────────────────────────────
    const handleDownloadImage = () => {
        if (!generatedImage) return;
        const link = document.createElement("a");
        link.href = generatedImage.url;
        const safeName = generatedImage.sellerName.replace(/\s+/g, '_');
        link.download = `WORLD_DEPORTES_Liquidacion_${safeName}_${generatedImage.currency}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShareImage = async () => {
        if (!generatedImage) return;
        try {
            // Convert data url to blob
            const res = await fetch(generatedImage.url);
            const blob = await res.blob();
            const safeName = generatedImage.sellerName.replace(/\s+/g, '_');
            const file = new File([blob], `Liquidacion_${safeName}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'GBC GAMING Liquidación',
                    text: `Liquidación semanal para ${generatedImage.sellerName}`,
                    files: [file],
                });
            } else {
                alert('Tu dispositivo/navegador no soporta compartir imágenes de esta forma. Usa el botón Descargar.');
            }
        } catch (error) {
            console.error('Error sharing image', error);
        }
    };

    // ── Ticket existente para esta semana ─────────────────────────────────────
    const getExistingTicket = (sellerId: string, currency: string) =>
        tickets.find(t => t.sellerId === sellerId && t.weekId === selectedPeriodId && t.currency === currency);

    return (
        <div className="space-y-6 animate-fade-in pb-safe">

            {/* Toast */}
            {toast && (
                <div className="fixed top-5 right-5 z-50 bg-ios-green text-white px-4 py-3 rounded-2xl shadow-xl font-semibold text-sm animate-fade-in flex items-center gap-2">
                    <CheckCircle2 size={16} /> {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarCheck size={22} className="text-ios-blue" /> Cierre Semanal
                    </h1>
                    <p className="text-ios-subtext text-sm mt-1">
                        Estado financiero por vendedor · Vista consolidada (sin desglose de agencias)
                    </p>
                </div>
                {/* Selector de semana */}
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                    <span className="text-sm font-bold text-ios-subtext pl-3 hidden md:inline">Semana:</span>
                    <WeekSelector
                        periods={weeklyPeriods}
                        selectedId={selectedPeriodId}
                        onSelect={setSelectedPeriodId}
                        variant="simple"
                    />
                </div>
            </div>

            {/* Tabla principal */}
            <div className="glass-panel p-6 rounded-3xl">
                {report.rows.length === 0 ? (
                    <div className="py-16 text-center text-ios-subtext">
                        <Receipt size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">No hay ventas registradas en esta semana</p>
                        <p className="text-xs mt-1">Ve al módulo de Ventas para registrar movimientos.</p>
                    </div>
                ) : (
                    <>
                        {/* Barra superior con buscador y contador */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-ios-subtext">
                                    {searchTerm.trim() ? (
                                        <>
                                            Resultados: <span className="text-ios-text font-black">{filteredRows.length}</span> de {report.rows.length} {report.rows.length === 1 ? 'vendedor' : 'vendedores'}
                                        </>
                                    ) : (
                                        <>
                                            Vendedores ({report.rows.length})
                                        </>
                                    )}
                                </span>
                            </div>

                            {/* Buscador de vendedores */}
                            <div className="relative w-full sm:w-72 md:w-80">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ios-subtext pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') setSearchTerm('');
                                    }}
                                    placeholder="Buscar vendedor o moneda..."
                                    className="w-full pl-9 pr-9 py-2 text-sm rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-ios-blue/50 focus:bg-white dark:focus:bg-[#1c1c1e] outline-none transition-all placeholder:text-ios-subtext/60"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ios-subtext hover:text-ios-text rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                        title="Limpiar búsqueda"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {filteredRows.length === 0 ? (
                            <div className="py-12 text-center text-ios-subtext bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-dashed border-black/10 dark:border-white/10">
                                <Search size={28} className="mx-auto mb-2 opacity-30 text-ios-subtext" />
                                <p className="font-semibold text-sm">No se encontraron vendedores que coincidan con "{searchTerm}"</p>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-3 text-xs font-bold text-ios-blue hover:underline cursor-pointer"
                                >
                                    Limpiar búsqueda
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredRows.map(row => {
                                    const existingTicket = getExistingTicket(row.sellerId, row.currency);
                                    const rowKey = row.sellerId + row.currency;
                                    const isExpanded = expanded === rowKey;
                                    const isGenerating = generatingFor === rowKey;

                                    return (
                                        <div key={rowKey} className="rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
                                            {/* Fila principal */}
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white/50 dark:bg-white/[0.03]">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-sm">{row.sellerName}</p>
                                                        <span className="text-xs bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-lg font-mono">{row.currency}</span>
                                                        {existingTicket && <StatusBadge status={existingTicket.status} />}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-ios-subtext">
                                                        <span>Venta: <strong className="text-ios-text">{getSymbol(row.currency)}{fmt(row.totalSales)}</strong></span>
                                                        <span>Banco: <strong className="text-ios-green">{getSymbol(row.currency)}{fmt(row.totalBank)}</strong></span>
                                                        <span>Pagado: <strong className="text-ios-blue">{getSymbol(row.currency)}{fmt(row.totalPaid)}</strong></span>
                                                        <span className={`font-bold ${row.balance > 0 ? 'text-red-500' : 'text-ios-green'}`}>
                                                            Balance: {row.balance > 0 ? `Debe ${getSymbol(row.currency)}${fmt(row.balance)}` : `A favor ${getSymbol(row.currency)}${fmt(Math.abs(row.balance))}`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {/* Desglose por items (si hay) */}
                                                    {(row.agencyBreakdown.length > 0 || row.productBreakdown.length > 0) && (
                                                        <button
                                                            onClick={() => setExpanded(isExpanded ? null : rowKey)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${isExpanded ? 'bg-ios-blue text-white shadow-sm' : 'text-ios-subtext bg-black/5 dark:bg-white/5 hover:bg-black/10'}`}
                                                        >
                                                            <Package size={13} />
                                                            Desglose ({row.productBreakdown.length} Prod)
                                                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                        </button>
                                                    )}
                                                    {/* Acción de generar/actualizar ticket */}
                                                    <button
                                                        onClick={() => handleGenerateTicket(row)}
                                                        disabled={isGenerating}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${existingTicket ? 'bg-black/5 dark:bg-white/5 text-ios-subtext hover:bg-black/10' : 'bg-ios-blue text-white hover:bg-blue-600 shadow-sm'} disabled:opacity-50`}
                                                    >
                                                        {isGenerating ? (
                                                            <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                        ) : (
                                                            <CalendarCheck size={13} />
                                                        )}
                                                        {existingTicket ? 'Actualizar Snapshot' : 'Guardar Snapshot'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Desglose de agencias y productos (expandible) */}
                                            {isExpanded && (row.agencyBreakdown.length > 0 || row.productBreakdown.length > 0) && (
                                                <div className="border-t border-black/5 dark:border-white/5 px-4 py-3 bg-black/[0.02] dark:bg-white/[0.02] animate-fade-in space-y-4">

                                                    {/* Productos */}
                                                    {row.productBreakdown.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-bold text-ios-subtext uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                <Package size={12} /> Desglose por Producto
                                                            </p>
                                                            <div className="space-y-1.5">
                                                                {row.productBreakdown.map(prod => (
                                                                    <div key={prod.productName} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-3 py-2 bg-white/60 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                                                                        <span className="font-semibold text-ios-text flex items-center gap-2 mb-1 sm:mb-0">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-ios-blue"></span> {prod.productName}
                                                                            <span className="text-[10px] text-ios-subtext font-normal px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded-md">{prod.count} reg.</span>
                                                                        </span>
                                                                        <div className="flex gap-4 text-ios-subtext">
                                                                            <span>Venta: <strong className="text-ios-text">{getSymbol(row.currency)}{fmt(prod.amount)}</strong></span>
                                                                            <span>Banca: <strong className="text-ios-green">{getSymbol(row.currency)}{fmt(prod.totalBank)}</strong></span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Agencias */}
                                                    {row.agencyBreakdown.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-bold text-ios-subtext uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                <Building2 size={12} /> Desglose por Agencia
                                                            </p>
                                                            <div className="space-y-1.5">
                                                                {row.agencyBreakdown.map(ag => (
                                                                    <div key={ag.agencyName} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-3 py-2 bg-white/60 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                                                                        <span className="flex items-center gap-1.5 font-semibold">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> {ag.agencyName}
                                                                        </span>
                                                                        <div className="flex gap-4 text-ios-subtext">
                                                                            <span>Venta: <strong className="text-ios-text">{getSymbol(row.currency)}{fmt(ag.amount)}</strong></span>
                                                                            <span>Banca: <strong className="text-ios-green">{getSymbol(row.currency)}{fmt(ag.totalBank)}</strong></span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Desglose completo de liquidación */}
                                            <div className="border-t border-black/5 dark:border-white/5 px-4 py-3 grid grid-cols-4 sm:grid-cols-7 gap-2 text-xs text-center">
                                                {[
                                                    { label: 'Venta', value: row.totalSales, color: '' },
                                                    { label: 'Premio', value: row.totalPrize, color: 'text-red-500' },
                                                    { label: 'Comisión', value: row.totalCommission, color: 'text-red-500' },
                                                    { label: 'Total Neto', value: row.totalNet, color: 'font-bold' },
                                                    { label: 'Part.', value: row.totalParticipation, color: 'text-orange-500' },
                                                    { label: 'Total Vendedor', value: row.totalVendor, color: 'text-ios-blue font-bold' },
                                                    { label: 'Total Banca', value: row.totalBank, color: 'text-ios-green font-bold' },
                                                ].map(({ label, value, color }) => (
                                                    <div key={label} className="flex flex-col gap-0.5">
                                                        <span className="text-ios-subtext text-[10px] font-bold uppercase">{label}</span>
                                                        <span className={`font-semibold ${color}`}>{getSymbol(row.currency)}{fmt(value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Panel de Tickets Generados */}
            {filteredTickets.length > 0 && (
                <div className="glass-panel p-6 rounded-3xl">
                    <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                        <Receipt size={18} className="text-ios-blue" /> Tickets Generados Esta Semana
                        {searchTerm.trim() && (
                            <span className="text-xs font-normal text-ios-subtext ml-1">
                                ({filteredTickets.length})
                            </span>
                        )}
                    </h2>
                    <div className="space-y-2">
                        {filteredTickets.map(ticket => (
                            <div key={ticket.id} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 text-sm">
                                <div>
                                    <span className="font-bold">{ticket.sellerName}</span>
                                    <span className="text-ios-subtext ml-2 text-xs">{ticket.currency}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold text-xs ${ticket.balance > 0 ? 'text-red-500' : 'text-ios-green'}`}>
                                        {ticket.balance > 0 ? `Debe ${getSymbol(ticket.currency)}${fmt(ticket.balance)}` : `A favor ${getSymbol(ticket.currency)}${fmt(Math.abs(ticket.balance))}`}
                                    </span>
                                    <StatusBadge status={ticket.status} />

                                    <button
                                        onClick={() => {
                                            const row = report.rows.find(r => r.sellerId === ticket.sellerId && r.currency === ticket.currency);
                                            if (row) handlePreviewTicket(row);
                                        }}
                                        className="p-1.5 ml-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-ios-text transition-colors flex items-center justify-center"
                                        title="Previsualizar Recibo"
                                    >
                                        <Receipt size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Nota informativa */}
            <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-ios-blue">
                <p className="text-sm font-bold">💡 Opciones de Generación</p>
                <p className="text-xs text-ios-subtext mt-1">
                    Al generar un Snapshot, se registrará el historial administrativo y se abrirá una vista previa del ticket formal (imagen) que podrás descargar o compartir por WhatsApp con tu vendedor.
                </p>
            </div>

            {/* PRE-RENDER DOM PARA CAPTURA (ESCONDIDO PERO EN VIEWPORT PARA MEDIR CORRECTAMENTE) */}
            <div style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -9999 }}>
                <div
                    ref={receiptRef}
                    className="w-[420px] bg-white p-8 relative"
                    style={{ fontFamily: "'Inter', sans-serif", color: '#000' }}
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>

                    {printingRow && (
                        <div className="relative z-10 flex flex-col">
                            {/* Header */}
                            <div className="flex flex-col items-center mb-6">
                                <img src="/logo.png" alt="GBC GAMING Logo" className="w-16 h-16 object-contain mb-2 drop-shadow-sm" />
                                <h2 className="text-xl font-black text-black tracking-tight uppercase">Liquidación Semanal GBC GAMING</h2>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{printingRow.currency}</p>
                            </div>

                            {/* Details */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs text-gray-500 font-bold uppercase">Vendedor:</span>
                                    <span className="text-xs font-black text-black">{printingRow.sellerName}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs text-gray-500 font-bold uppercase">Período:</span>
                                    <span className="text-xs font-black text-[#00361F]">{weeklyPeriods.find(p => p.id === selectedPeriodId)?.label}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500 font-bold uppercase">Emisión:</span>
                                    <span className="text-xs font-bold text-black">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>

                            {/* Breakdown */}
                            <div className="mb-6">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Desglose Consolidado (Banca)</p>
                                <div className="space-y-3 mt-3">
                                    {printingRow.productBreakdown.map(prod => (
                                        <div key={prod.productName} className="flex justify-between text-xs">
                                            <span className="font-semibold text-gray-700 flex flex-col">
                                                <span>{prod.productName}</span>
                                                <span className="text-[9px] text-gray-400">Venta Bruta: {getSymbol(printingRow.currency)}{fmt(prod.amount)}</span>
                                            </span>
                                            <span className="font-bold text-black border-b border-gray-100">{getSymbol(printingRow.currency)}{fmt(prod.totalBank)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between text-xs mt-4 pt-3 border-t-2 border-dashed border-gray-200">
                                    <span className="font-black text-gray-800 uppercase tracking-wider">Subtotal Banca</span>
                                    <span className="font-black text-black">{getSymbol(printingRow.currency)}{fmt(printingRow.totalBank)}</span>
                                </div>
                                {printingRow.totalPaid > 0 && (
                                    <div className="flex justify-between text-xs mt-2 text-[#00361F]">
                                        <span className="font-bold">Abonos Previos Realizados</span>
                                        <span className="font-black">-{getSymbol(printingRow.currency)}{fmt(printingRow.totalPaid)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Total Box */}
                            <div className={`rounded-2xl p-5 flex flex-col items-center justify-center text-center mt-2 ${printingRow.balance > 0 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${printingRow.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {printingRow.balance > 0 ? 'TOTAL A TRANSFERIR AL BANCO' : 'SALDO A FAVOR DEL VENDEDOR'}
                                </span>
                                <span className={`text-4xl font-black tracking-tight ${printingRow.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {getSymbol(printingRow.currency)}{fmt(Math.abs(printingRow.balance))}
                                </span>
                            </div>

                            {/* Footer */}
                            <div className="mt-8 text-center border-t border-gray-100 pt-4">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Software GBC GAMING • GBC GAMING, C.A.</p>
                                <p className="text-[9px] text-gray-400 mt-1">Este comprobante es un consolidado oficial emitido automáticamente.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Previsualización de Imagen Generada */}
            {generatedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#1c1c1e] rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl transform transition-all flex flex-col max-h-[90vh]">
                        {/* Header Modal */}
                        <div className="px-5 py-4 flex justify-between items-center border-b border-black/5 dark:border-white/5">
                            <h3 className="font-bold text-lg text-ios-text">Recibo Generado</h3>
                            <button
                                onClick={() => setGeneratedImage(null)}
                                className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-ios-subtext hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Preview (Scrollable) */}
                        <div className="p-6 overflow-y-auto bg-black/5 dark:bg-black/50 flex justify-center flex-1">
                            <img
                                src={generatedImage.url}
                                alt="Recibo Generado"
                                className="w-full h-auto object-contain drop-shadow-lg rounded-lg max-w-[300px]"
                            />
                        </div>

                        {/* Actions */}
                        <div className="p-5 flex gap-3 bg-white dark:bg-[#1c1c1e] border-t border-black/5 dark:border-white/5">
                            <button
                                onClick={handleDownloadImage}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold bg-black/5 dark:bg-white/5 text-ios-text hover:bg-black/10 dark:hover:bg-white/10 transition-colors active:scale-95"
                            >
                                <Download size={18} /> Descargar
                            </button>
                            <button
                                onClick={handleShareImage}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold bg-ios-blue text-white hover:bg-blue-600 transition-colors shadow-sm shadow-ios-blue/30 active:scale-95"
                            >
                                <Share2 size={18} /> Compartir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
