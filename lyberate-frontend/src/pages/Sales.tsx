import React, { useState, useMemo, useEffect } from 'react';
import { Download, Plus, X, Receipt, CheckCircle2, Trash2, AlertTriangle, ChevronDown, Search, Pencil } from 'lucide-react';
import { TicketGenerator } from '../components/TicketGenerator';
import { SalesImportModal } from '../components/SalesImportModal';
import { WeeklyFilterBar } from '../components/WeeklyFilterBar';
import { WeekPickerInput } from '../components/WeekPickerInput';
import { SearchableSelect } from '../components/SearchableSelect';
import { EditConfirmationModal, ChangeItem } from '../components/EditConfirmationModal';
import { useWeeklyFilter } from '../hooks/useWeeklyFilter';
import { useApiScope } from '../hooks/useApiScope';
import { Seller, Sale, dateToWeekId } from '../services/apiService';
import { roundFinance, getSymbol } from '../utils/finance';
import { useSmartTable } from '../hooks/useSmartTable';
import { TablePaginator } from '../components/SmartTable/TablePaginator';
import { TableSkeleton } from '../components/SmartTable/TableSkeleton';
import { CurrencyChips } from '../components/SmartTable/CurrencyChips';



export const Sales = () => {
    const api = useApiScope();
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [showEditConfirm, setShowEditConfirm] = useState(false);
    const [editConfirmLoading, setEditConfirmLoading] = useState(false);
    const [isLoadingSales, setIsLoadingSales] = useState(true);

    // View state
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);

    // ─── Smart Filter (centralizado) ────────────────────────────────────
    const {
        filterPreset, setFilterPreset,
        rangeStart, rangeEnd,
        searchQuery, setSearchQuery,
        filterRange, filterLabel, snapToWeek,
    } = useWeeklyFilter();

    useEffect(() => {
        const load = async () => {
            setIsLoadingSales(true);
            try {
                const [sel, sal] = await Promise.all([api.getSellers(), api.getSales()]);
                setSellers(sel);
                setSales(sal);
            } finally {
                setIsLoadingSales(false);
            }
        };
        load();
    }, []);

    const refreshSales = async () => setSales(await api.getSales());

    const handleDeleteSale = async (saleId: string) => {
        if (confirm('¿Eliminar esta venta? Esta acción no se puede deshacer.')) {
            try {
                await api.deleteSale(saleId);
                await refreshSales();
            } catch (err: any) {
                alert(`Error al eliminar venta: ${err?.message || 'Error desconocido'}`);
            }
        }
    };

    // Form states — cascade: Seller → Product → Currency
    const [sellerId, setSellerId] = useState('');
    const [productId, setProductId] = useState('');
    const [currencyId, setCurrencyId] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [prize, setPrize] = useState<number | ''>('');
    // Date syncs with the active filter week — so switching weeks updates the form date
    const toLocalDateStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    const getDefaultDate = (range: typeof filterRange) => {
        if (range) return toLocalDateStr(range.start);
        return toLocalDateStr(new Date());
    };
    const [date, setDate] = useState(() => getDefaultDate(filterRange));

    // Keep form date in sync when the user changes the week filter
    useEffect(() => {
        setDate(getDefaultDate(filterRange));
    }, [filterRange]);

    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState('');

    // Derived selections
    const selectedSeller = sellers.find(s => String(s.id) === String(sellerId));

    const productOptions = useMemo(() => {
        if (!selectedSeller) return [];
        return selectedSeller.products.flatMap(p =>
            p.currencies.map(c => ({
                id: `${p.id}|${c.id}`,
                pid: p.id,
                cid: c.id,
                label: `${p.name} — ${c.name} (${c.commissionPct}% Com / ${c.partPct}% Part)`
            }))
        );
    }, [selectedSeller]);

    const filteredProductOptions = useMemo(() => {
        if (!productSearchQuery) return productOptions;
        const q = productSearchQuery.toLowerCase();
        return productOptions.filter(o => o.label.toLowerCase().includes(q));
    }, [productOptions, productSearchQuery]);

    const selectedProduct = selectedSeller?.products.find(p => String(p.id) === String(productId));
    const selectedCurrency = selectedProduct?.currencies.find(c => String(c.id) === String(currencyId));


    // Reset downward when a parent changes
    const handleSellerChange = (id: string) => {
        setSellerId(id);
        setProductId('');
        setCurrencyId('');
        setProductSearchQuery('');
        setIsProductSelectOpen(false);
    };

    // Liquidation calculations
    const calcVenta = Number(amount) || 0;
    const calcPremio = Number(prize) || 0;
    // Usar Number() para garantizar que los porcentajes sean siempre números válidos,
    // incluso si los datos en localStorage fueron guardados como strings o undefined.
    const comisionPct = Number(selectedCurrency?.commissionPct ?? 0);
    const partPct = Number(selectedCurrency?.partPct ?? 0);

    const calcComision = roundFinance(calcVenta * (comisionPct / 100));
    const calcTotal = roundFinance(calcVenta - calcPremio - calcComision);
    const calcPart = roundFinance(calcTotal * (partPct / 100));
    const calcTotalVendedor = roundFinance(calcComision + calcPart);
    const calcTotalBanca = roundFinance(calcTotal - calcPart);

    // ─── Edit functionality ──────────────────────────────────────────────
    const handleStartEdit = (sale: Sale) => {
        setEditingSale(sale);
        // Pre-populate form fields
        setSellerId(String(sale.sellerId));
        setDate(sale.date);
        setAmount(sale.amount);
        setPrize(sale.prize);
        // We need to find the right product+currency combo
        const seller = sellers.find(s => String(s.id) === String(sale.sellerId));
        if (seller) {
            const product = seller.products.find(p => p.name === sale.productName);
            if (product) {
                setProductId(String(product.id));
                const curr = product.currencies.find(c => c.name === sale.currencyName);
                if (curr) setCurrencyId(String(curr.id));
            }
        }
        setIsModalOpen(true);
    };

    // Build the list of changes for the confirmation modal
    const editChanges = useMemo((): ChangeItem[] => {
        if (!editingSale) return [];
        const changes: ChangeItem[] = [];
        if (editingSale.sellerName !== (selectedSeller?.name || '')) changes.push({ label: 'Vendedor', oldValue: editingSale.sellerName, newValue: selectedSeller?.name || '' });
        if (editingSale.productName !== (selectedProduct?.name || '')) changes.push({ label: 'Producto', oldValue: editingSale.productName, newValue: selectedProduct?.name || '' });
        if (editingSale.currencyName !== (selectedCurrency?.name || '')) changes.push({ label: 'Moneda', oldValue: editingSale.currencyName, newValue: selectedCurrency?.name || '' });
        if (editingSale.amount !== calcVenta) changes.push({ label: 'Venta Bruta', oldValue: editingSale.amount.toFixed(2), newValue: calcVenta.toFixed(2) });
        if (editingSale.prize !== calcPremio) changes.push({ label: 'Premios', oldValue: editingSale.prize.toFixed(2), newValue: calcPremio.toFixed(2) });
        if (editingSale.date !== date) changes.push({ label: 'Fecha', oldValue: editingSale.date, newValue: date });
        if (editingSale.totalBank !== calcTotalBanca) changes.push({ label: 'Total Banca', oldValue: editingSale.totalBank.toFixed(2), newValue: calcTotalBanca.toFixed(2) });
        if (editingSale.totalVendor !== calcTotalVendedor) changes.push({ label: 'Total Vendedor', oldValue: editingSale.totalVendor.toFixed(2), newValue: calcTotalVendedor.toFixed(2) });
        return changes;
    }, [editingSale, selectedSeller, selectedProduct, selectedCurrency, calcVenta, calcPremio, date, calcTotalBanca, calcTotalVendedor]);

    const handleConfirmEdit = async () => {
        if (!editingSale) return;
        setEditConfirmLoading(true);
        try {
            await api.updateSale(editingSale.id, {
                sellerId: String(sellerId),
                productName: selectedProduct?.name || '',
                currencyName: selectedCurrency?.name || '',
                amount: calcVenta,
                prize: calcPremio,
                commission: calcComision,
                total: calcTotal,
                participation: calcPart,
                totalVendor: calcTotalVendedor,
                totalBank: calcTotalBanca,
                date: date,
                weekId: dateToWeekId(date),
            });
            await refreshSales();
            setShowEditConfirm(false);
            setEditingSale(null);
            setIsModalOpen(false);
            setAmount('');
            setPrize('');
            setSellerId('');
            setProductId('');
            setCurrencyId('');
        } catch (err: any) {
            alert(`Error al editar venta: ${err?.message || 'Error desconocido'}`);
        } finally {
            setEditConfirmLoading(false);
        }
    };

    const sym = selectedCurrency ? getSymbol(selectedCurrency.name) : '$';

    // Group sales for report
    const weeklyReportData = useMemo(() => {
        // Filter by active preset/range + search
        const filteredSales = sales.filter(s => {
            if (filterRange) {
                const d = new Date(s.date + 'T12:00:00');
                if (d < filterRange.start || d > filterRange.end) return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return s.sellerName.toLowerCase().includes(q) ||
                    s.productName.toLowerCase().includes(q) ||
                    s.currencyName.toLowerCase().includes(q);
            }
            return true;
        });

        // Individual rows sorted by most recent
        const rows = [...filteredSales];
        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.registeredAt.localeCompare(a.registeredAt));

        // Calculate totals per currency
        const grandTotals: Record<string, { amount: number, prize: number, commission: number, total: number, participation: number, totalVendor: number, totalBank: number }> = {};
        rows.forEach(r => {
            if (!grandTotals[r.currencyName]) {
                grandTotals[r.currencyName] = { amount: 0, prize: 0, commission: 0, total: 0, participation: 0, totalVendor: 0, totalBank: 0 };
            }
            const t = grandTotals[r.currencyName];
            t.amount = roundFinance(t.amount + r.amount);
            t.prize = roundFinance(t.prize + r.prize);
            t.commission = roundFinance(t.commission + r.commission);
            t.total = roundFinance(t.total + r.total);
            t.participation = roundFinance(t.participation + r.participation);
            t.totalVendor = roundFinance(t.totalVendor + r.totalVendor);
            t.totalBank = roundFinance(t.totalBank + r.totalBank);
        });

        return { rows, grandTotals };
    }, [sales, filterRange, searchQuery]);

    // ─── Filtro por moneda ──────────────────────────────────────────
    const [salesCurrencyFilter, setSalesCurrencyFilter] = useState('ALL');

    // Monedas presentes en el período filtrado
    const salesCurrencies = useMemo(() =>
        Array.from(new Set(weeklyReportData.rows.map(r => r.currencyName))).sort()
    , [weeklyReportData.rows]);

    // Filas filtradas por moneda (antes de paginación)
    const salesRowsFiltered = useMemo(() =>
        salesCurrencyFilter === 'ALL'
            ? weeklyReportData.rows
            : weeklyReportData.rows.filter(r => r.currencyName === salesCurrencyFilter)
    , [weeklyReportData.rows, salesCurrencyFilter]);

    // ─── Paginación del listado de ventas ────────────────────────────────────
    // IMPORTANTE: Los Grand Totals se calculan sobre salesRowsFiltered COMPLETO
    // (todos los registros del período + moneda). La paginación solo afecta las filas visibles.
    const {
        paginatedData: paginatedSales,
        page: salesPage, setPage: setSalesPage,
        pageSize: salesPageSize, setPageSize: setSalesPageSize,
        totalPages: salesTotalPages, totalCount: salesTotalCount,
        rangeFrom: salesRangeFrom, rangeTo: salesRangeTo,
    } = useSmartTable(salesRowsFiltered, { defaultPageSize: 40 });

    const activeCurrencies = useMemo(() => {
        const currenciesMap = new Map<string, { name: string, sym: string, totalSales: number, totalUtility: number }>();

        // Inicializar todas las monedas presentes en la DB de vendedores con 0
        sellers.forEach(s => {
            s.products.forEach(p => {
                p.currencies.forEach(c => {
                    if (!currenciesMap.has(c.name)) {
                        currenciesMap.set(c.name, { name: c.name, sym: getSymbol(c.name), totalSales: 0, totalUtility: 0 });
                    }
                });
            });
        });

        // Sumar lo recaudado y la utilidad de las facturas de esta semana
        Object.entries(weeklyReportData.grandTotals).forEach(([currency, totals]) => {
            if (currenciesMap.has(currency)) {
                currenciesMap.get(currency)!.totalSales = roundFinance(currenciesMap.get(currency)!.totalSales + totals.amount);
                currenciesMap.get(currency)!.totalUtility = roundFinance(currenciesMap.get(currency)!.totalUtility + totals.totalBank);
            } else {
                currenciesMap.set(currency, { name: currency, sym: getSymbol(currency), totalSales: totals.amount, totalUtility: totals.totalBank });
            }
        });

        return Array.from(currenciesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [sellers, weeklyReportData]);

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Liquidación de Ventas</h1>
                    <p className="text-ios-subtext text-sm mt-1">
                        {weeklyReportData.rows.length} registro(s) — {filterLabel}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Smart Filter Bar (centralizado) */}
                    <WeeklyFilterBar
                        filterPreset={filterPreset}
                        setFilterPreset={setFilterPreset}
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        snapToWeek={snapToWeek}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                    />

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-black/5 dark:bg-white/5 text-ios-text rounded-xl font-bold hover:bg-black/10 transition-all text-sm"
                        >
                            <Download size={16} /> <span className="hidden sm:inline">Importar archivo</span>
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-ios-blue text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-md text-sm">
                            <Plus size={16} /> Nueva Venta
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Registro de Venta */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white/10 dark:bg-black/40 w-full max-w-3xl rounded-3xl p-6 relative shadow-[0_8px_32px_0_rgba(31,38,135,0.3)] backdrop-blur-xl border border-white/20">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all">
                            <X size={20} />
                        </button>

                        <div className="mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ios-blue to-purple-600 flex items-center justify-center shadow-lg">
                                <Receipt size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-wide">{editingSale ? 'Editar Venta' : 'Nueva Venta'}</h2>
                                <p className="text-xs text-white/60">{editingSale ? 'Modifica los datos de la factura' : 'Registrar factura y generar ticket'}</p>
                            </div>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!sellerId || !productId || !currencyId || amount === '') return;

                            // If editing, show confirmation first
                            if (editingSale) {
                                setShowEditConfirm(true);
                                return;
                            }

                            try {
                                const newSale = await api.addSale({
                                    sellerId: String(sellerId),
                                    sellerName: selectedSeller?.name || '',
                                    productId: String(productId),
                                    productName: selectedProduct?.name || '',
                                    currencyId: String(currencyId),
                                    currencyName: selectedCurrency?.name || '',
                                    amount: calcVenta,
                                    prize: calcPremio,
                                    commission: calcComision,
                                    total: calcTotal,
                                    participation: calcPart,
                                    totalVendor: calcTotalVendedor,
                                    totalBank: calcTotalBanca,
                                    date: date,
                                    weekId: dateToWeekId(date),
                                    registeredAt: new Date().toISOString()
                                });

                                // Add the new sale directly to state — no extra GET needed
                                setSales(prev => [newSale, ...prev]);

                                // Reset form and close
                                setAmount('');
                                setPrize('');
                                setDate(getDefaultDate(filterRange));
                                setCurrencyId('');
                                setProductId('');
                                setSellerId('');
                                setIsModalOpen(false);
                            } catch (err: any) {
                                alert(`Error al guardar la venta: ${err?.message || 'Error desconocido'}. Verifica la conexión al servidor.`);
                            }
                        }} className="space-y-5 max-h-[75vh] overflow-y-auto no-scrollbar pr-2 pb-4">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Columna Izquierda: Datos Principales */}
                                <div className="space-y-4">
                                    {/* Step 1: Vendedor */}
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative">
                                        <label className="block text-[11px] font-bold text-white/70 mb-2 tracking-widest uppercase flex items-center gap-1.5">
                                            <span className="text-ios-blue">1.</span> Vendedor
                                        </label>
                                        <SearchableSelect
                                            options={sellers.map(s => ({ value: String(s.id), label: s.name }))}
                                            value={sellerId}
                                            onChange={handleSellerChange}
                                            placeholder="Selecciona un vendedor..."
                                        />
                                    </div>

                                    {/* Step 2: Producto y Moneda */}
                                    <div className={`bg-white/5 border border-white/10 p-4 rounded-2xl relative transition-opacity ${sellerId ? 'opacity-100' : 'opacity-40'}`}>
                                        <label className="block text-[11px] font-bold text-white/70 mb-2 tracking-widest uppercase flex items-center gap-1.5">
                                            <span className="text-ios-blue">2.</span> Producto y Condiciones
                                        </label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                disabled={!sellerId}
                                                onClick={() => setIsProductSelectOpen(!isProductSelectOpen)}
                                                className="w-full px-4 py-3 rounded-xl bg-black/20 text-white border border-transparent focus:border-ios-blue/50 outline-none transition-all flex justify-between items-center text-sm font-medium"
                                            >
                                                <span className={productId && currencyId ? "text-white text-left truncate" : "text-white/50 text-left"}>
                                                    {productId && currencyId
                                                        ? productOptions.find(o => o.id === `${productId}|${currencyId}`)?.label || 'Seleccionado'
                                                        : 'Selecciona producto y moneda...'}
                                                </span>
                                                <ChevronDown size={16} className={`shrink-0 transition-transform ${isProductSelectOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isProductSelectOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setIsProductSelectOpen(false)} />
                                                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                                        <div className="p-2 border-b border-white/10">
                                                            <div className="relative">
                                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                                                                <input
                                                                    type="text"
                                                                    autoFocus
                                                                    placeholder="Buscar producto o cond..."
                                                                    value={productSearchQuery}
                                                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                                                    className="w-full pl-9 pr-3 py-2 bg-black/20 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-ios-blue/50"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto flex flex-col no-scrollbar pb-1">
                                                            {filteredProductOptions.map(option => (
                                                                <button
                                                                    key={option.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setProductId(String(option.pid));
                                                                        setCurrencyId(String(option.cid));
                                                                        setIsProductSelectOpen(false);
                                                                        setProductSearchQuery('');
                                                                    }}
                                                                    className="w-full text-left px-4 py-3 hover:bg-white/10 focus:bg-white/10 text-sm font-medium text-white transition-colors border-none outline-none"
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            ))}
                                                            {filteredProductOptions.length === 0 && (
                                                                <div className="px-4 py-3 text-sm text-white/50 text-center">
                                                                    No se encontraron resultados
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Montos */}
                                    <div className={`grid grid-cols-2 gap-3 transition-opacity ${currencyId ? 'opacity-100' : 'opacity-40'}`}>
                                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative">
                                            <label className="block text-[11px] font-bold text-white/70 mb-2 tracking-widest uppercase truncate">Venta Bruta</label>
                                            <div className="relative">
                                                {selectedCurrency && <span className="absolute left-3 top-2.5 text-white/50 font-bold text-lg pointer-events-none whitespace-nowrap">{sym}</span>}
                                                <input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} disabled={!currencyId} className={`w-full ${selectedCurrency ? (sym.length > 2 ? 'pl-12' : 'pl-8') : 'px-4'} pr-3 py-2.5 rounded-xl bg-black/20 text-white border border-transparent focus:border-ios-blue/50 outline-none transition-all font-bold text-lg`} placeholder="0.00" />
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative group">
                                            <label className="block text-[11px] font-bold text-red-300 mb-2 tracking-widest uppercase truncate">Premios</label>
                                            <div className="relative">
                                                {selectedCurrency && <span className="absolute left-3 top-2.5 text-red-400 font-bold text-lg pointer-events-none whitespace-nowrap">{sym}</span>}
                                                <input type="number" step="0.01" value={prize} onChange={e => setPrize(Number(e.target.value))} disabled={!currencyId} className={`w-full ${selectedCurrency ? (sym.length > 2 ? 'pl-12' : 'pl-8') : 'px-4'} pr-3 py-2.5 rounded-xl bg-black/20 text-red-400 border border-transparent focus:border-red-500/50 hover:bg-red-500/10 outline-none transition-all font-bold text-lg`} placeholder="0.00" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full">
                                        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                            <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Fecha Operación</label>
                                            <WeekPickerInput
                                                value={date}
                                                onChange={setDate}
                                                variant="modal"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Columna Derecha: Panel de Liquidación Visual */}
                                <div className="h-full">
                                    <div className={`h-full rounded-2xl border border-white/10 p-6 flex flex-col justify-between transition-all duration-500 shadow-inner ${selectedCurrency ? 'bg-gradient-to-b from-white/10 to-transparent' : 'bg-black/20 opacity-40 grayscale pointer-events-none'}`}>
                                        <div>
                                            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 tracking-wide uppercase">
                                                Recibo de Liquidación
                                            </h3>

                                            <div className="space-y-4 text-sm">
                                                <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                                                    <span className="text-white/70 font-medium">Venta Bruta</span>
                                                    <span className="font-bold text-white text-base">{sym}{calcVenta.toFixed(2)}</span>
                                                </div>

                                                <div className="flex justify-between items-center px-3">
                                                    <span className="text-white/70 font-medium">Premios</span>
                                                    <span className="font-bold text-red-400">-{sym}{Math.abs(calcPremio).toFixed(2)}</span>
                                                </div>

                                                <div className="flex justify-between items-center px-3">
                                                    <span className="text-white/70 font-medium">Comisión Ag. ({comisionPct}%)</span>
                                                    <span className="font-bold text-red-400">-{sym}{Math.abs(calcComision).toFixed(2)}</span>
                                                </div>

                                                <div className="h-px w-full bg-white/10 my-2"></div>

                                                <div className="flex justify-between items-center px-3">
                                                    <span className="text-white/90 font-bold">Total Neto</span>
                                                    <span className="font-bold text-white text-lg">{sym}{calcTotal.toFixed(2)}</span>
                                                </div>

                                                <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                                                    <span className="text-white/70 font-medium tracking-tight">Participación ({partPct}%)</span>
                                                    <span className="font-bold text-orange-400">{calcPart < 0 ? `-${sym}${Math.abs(calcPart).toFixed(2)}` : `${sym}${calcPart.toFixed(2)}`}</span>
                                                </div>
                                                {partPct === 0 && selectedCurrency && (
                                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                                                        ⚠️ Participación al 0%. Verifica la configuración del vendedor.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6 space-y-3">
                                            <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex justify-between items-center">
                                                <span className="text-xs font-bold text-white/50 uppercase">Ganancia Vendedor</span>
                                                <span className="font-bold text-green-400 text-lg">{sym}{calcTotalVendedor.toFixed(2)}</span>
                                            </div>

                                            {calcTotalBanca < 0 ? (
                                                <div className="p-4 rounded-xl bg-orange-500/20 border border-orange-500/40 flex justify-between items-center shadow-lg">
                                                    <div>
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400 uppercase mb-0.5">
                                                            <AlertTriangle size={12} /> Banca debe al Vendedor
                                                        </span>
                                                        <span className="text-xs text-white/60 font-medium">Premio excede la venta</span>
                                                    </div>
                                                    <span className="font-black text-orange-300 text-2xl">{sym}{Math.abs(calcTotalBanca).toFixed(2)}</span>
                                                </div>
                                            ) : (
                                                <div className="p-4 rounded-xl bg-ios-blue/20 border border-ios-blue/30 flex justify-between items-center shadow-lg">
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-ios-blue uppercase mb-0.5">A Recaudar</span>
                                                        <span className="text-xs text-white/70 font-medium">Bolsa del Admin</span>
                                                    </div>
                                                    <span className="font-black text-white text-2xl">{sym}{calcTotalBanca.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-white/10 mt-6 justify-end">
                                <button type="button" onClick={() => { setIsModalOpen(false); setEditingSale(null); }} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={!currencyId || amount === '' || amount === 0} className={`px-8 py-3 rounded-xl bg-gradient-to-r text-white font-bold text-sm shadow-[0_4px_15px_rgba(0,122,255,0.4)] disabled:opacity-50 disabled:shadow-none hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center gap-2 ${editingSale ? 'from-amber-500 to-orange-600 shadow-[0_4px_15px_rgba(245,158,11,0.4)]' : 'from-ios-blue to-blue-600'}`}>
                                    <CheckCircle2 size={18} /> {editingSale ? 'Guardar Cambios' : 'Confirmar Factura'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}

            {/* KPIs Dinámicos generados por Moneda */}
            <div className={`grid grid-cols-2 md:grid-cols-4 xl:grid-cols-${Math.max(4, activeCurrencies.length * 2)} gap-4`}>
                {activeCurrencies.length === 0 && (
                    <div className="col-span-full glass-panel p-5 text-center text-ios-subtext">
                        No hay monedas configuradas.
                    </div>
                )}
                {activeCurrencies.map((curr, idx) => {
                    const colorSales = idx % 2 === 0 ? 'border-l-ios-blue' : 'border-l-purple-500';
                    const colorUtility = idx % 2 === 0 ? 'border-l-ios-green' : 'border-l-orange-500';

                    return (
                        <React.Fragment key={curr.name}>
                            <div className={`glass-panel p-5 rounded-2xl border-l-4 ${colorSales}`}>
                                <p className="text-ios-subtext text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2 text-ellipsis overflow-hidden whitespace-nowrap">Ventas {curr.name}</p>
                                <h3 className="text-lg md:text-2xl font-bold text-ios-text">{curr.sym}{curr.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                            </div>
                            <div className={`glass-panel p-5 rounded-2xl border-l-4 ${colorUtility}`}>
                                <p className="text-ios-subtext text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2 text-ellipsis overflow-hidden whitespace-nowrap">Utilidad Banca {curr.name}</p>
                                <h3 className="text-lg md:text-2xl font-bold text-ios-text">{curr.sym}{curr.totalUtility.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Main Content Area: Liquidación Semanal */}
            <div className="glass-panel p-6 rounded-3xl animate-fade-in flex flex-col">

                {/* Toolbar de filtro por moneda */}
                {!isLoadingSales && salesCurrencies.length > 1 && (
                    <div className="flex items-center gap-3 flex-wrap mb-4 pb-4 border-b border-black/5 dark:border-white/5">
                        <span className="text-xs font-bold text-ios-subtext uppercase tracking-wider">Moneda:</span>
                        <CurrencyChips
                            currencies={salesCurrencies}
                            selected={salesCurrencyFilter}
                            onSelect={setSalesCurrencyFilter}
                        />
                        {salesTotalCount > 0 && (
                            <span className="ml-auto text-xs font-semibold text-ios-subtext">
                                {salesTotalCount} registro(s)
                            </span>
                        )}
                    </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-left text-ios-subtext">Vendedor</th>
                                <th className="px-4 py-3 font-semibold text-center text-ios-subtext">Fecha</th>
                                <th className="px-4 py-3 font-semibold text-ios-subtext">Venta</th>
                                <th className="px-4 py-3 font-semibold text-ios-subtext">Premio</th>
                                <th className="px-4 py-3 font-semibold text-ios-subtext">Comision</th>
                                <th className="px-4 py-3 font-semibold text-ios-text">Total</th>
                                <th className="px-4 py-3 font-semibold text-ios-subtext">Part</th>
                                <th className="px-4 py-3 font-semibold text-ios-blue">Total Vendedor</th>
                                <th className="px-4 py-3 font-semibold text-ios-green">Total Banca</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {isLoadingSales ? (
                                <TableSkeleton cols={10} rows={8} />
                            ) : weeklyReportData.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-ios-subtext">No hay ventas registradas en esta semana.</td>
                                </tr>
                            ) : salesTotalCount === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-ios-subtext">
                                        Sin ventas en {salesCurrencyFilter} para este período.
                                    </td>
                                </tr>
                            ) : (
                                paginatedSales.map((row) => (
                                    <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3 text-left">
                                            <div className="font-bold text-ios-text">{row.sellerName}</div>
                                            <div className="text-xs text-ios-subtext font-medium mt-0.5">{row.productName} · <span className="font-bold opacity-80">{row.currencyName}</span></div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-ios-subtext">
                                            {new Date(row.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-ios-subtext">{getSymbol(row.currencyName)}{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 font-medium text-red-500">-{getSymbol(row.currencyName)}{Math.abs(row.prize).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 font-medium text-red-500">-{getSymbol(row.currencyName)}{Math.abs(row.commission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 font-bold text-ios-text">{row.total < 0 ? `-${getSymbol(row.currencyName)}${Math.abs(row.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${getSymbol(row.currencyName)}${row.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className="px-4 py-3 font-medium text-orange-500">{row.participation < 0 ? `-${getSymbol(row.currencyName)}${Math.abs(row.participation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${getSymbol(row.currencyName)}${row.participation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                        <td className="px-4 py-3 font-bold text-ios-blue">{getSymbol(row.currencyName)}{row.totalVendor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className={`px-4 py-3 font-bold ${row.totalBank < 0 ? 'text-orange-400' : 'text-ios-green'}`}>
                                            {row.totalBank < 0 ? `⚠️ -${getSymbol(row.currencyName)}${Math.abs(row.totalBank).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${getSymbol(row.currencyName)}${row.totalBank.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleStartEdit(row)}
                                                    className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Editar venta"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedTicket({
                                                        id: String(row.id).split('-').pop() || Date.now().toString().slice(-4),
                                                        vendor: row.sellerName,
                                                        agency: 'Administración Global',
                                                        date: new Date(row.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                                                        amountUsd: Math.abs(row.totalBank),
                                                        saleBreakdown: {
                                                            currency: row.currencyName,
                                                            symbol: getSymbol(row.currencyName),
                                                            venta: row.amount,
                                                            premio: row.prize,
                                                            comision: row.commission,
                                                            comisionPct: row.amount > 0 ? Math.round((row.commission / row.amount) * 100) : 0,
                                                            total: row.total,
                                                            participacion: row.participation,
                                                            partPct: row.total > 0 ? Math.round((row.participation / row.total) * 100) : 0,
                                                            totalVendedor: row.totalVendor,
                                                            totalBanca: row.totalBank,
                                                            isBancaDebt: row.totalBank < 0,
                                                        }
                                                    })}
                                                    className="p-1.5 text-ios-blue hover:bg-ios-blue/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Ver comprobante"
                                                >
                                                    <Receipt size={15} />
                                                </button>
                                                <button onClick={() => handleDeleteSale(String(row.id))} className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="Eliminar venta">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}

                            {/* Grand Totals — filtrados por la moneda activa si hay selección */}
                            {!isLoadingSales && Object.entries(weeklyReportData.grandTotals)
                                .filter(([currency]) => salesCurrencyFilter === 'ALL' || currency === salesCurrencyFilter)
                                .map(([currency, totals]) => (
                                <tr key={currency} className="bg-black/5 dark:bg-white/5 font-bold text-sm border-t-2 border-black/10 dark:border-white/10">
                                    <td className="px-4 py-4 text-left text-ios-text">TOTALES {currency}</td>
                                    <td className="px-4 py-4"></td>
                                    <td className="px-4 py-4 text-ios-subtext">{getSymbol(currency)}{totals.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-4 text-red-500">-{getSymbol(currency)}{Math.abs(totals.prize).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-4 text-red-500">-{getSymbol(currency)}{Math.abs(totals.commission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-4 text-ios-text">{totals.total < 0 ? `-${getSymbol(currency)}${Math.abs(totals.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${getSymbol(currency)}${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                    <td className="px-4 py-4 text-orange-500">{totals.participation < 0 ? `-${getSymbol(currency)}${Math.abs(totals.participation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${getSymbol(currency)}${totals.participation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                    <td className="px-4 py-4 text-ios-blue">{getSymbol(currency)}{totals.totalVendor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-4 text-ios-green">{getSymbol(currency)}{totals.totalBank.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginador de ventas — solo si hay datos */}
                {!isLoadingSales && salesTotalCount > 0 && (
                    <TablePaginator
                        page={salesPage}
                        totalPages={salesTotalPages}
                        totalCount={salesTotalCount}
                        pageSize={salesPageSize}
                        rangeFrom={salesRangeFrom}
                        rangeTo={salesRangeTo}
                        setPage={setSalesPage}
                        setPageSize={setSalesPageSize}
                    />
                )}
            </div>

            {/* Modal de Ticket Generator */}
            {
                selectedTicket && (
                    <TicketGenerator
                        id={selectedTicket.id}
                        type="Venta"
                        amountUsd={selectedTicket.amountUsd}
                        amountVes={selectedTicket.amountUsd * 48.25} // Calculado para preview/compatibilidad
                        clientName={selectedTicket.vendor}
                        agencyName={selectedTicket.agency}
                        date={selectedTicket.date}
                        saleBreakdown={selectedTicket.saleBreakdown}
                        onClose={() => setSelectedTicket(null)}
                    />
                )
            }
            {
                isImportModalOpen && (
                    <SalesImportModal
                        onClose={() => setIsImportModalOpen(false)}
                        onImportSuccess={async () => {
                            const [sal, sel] = await Promise.all([api.getSales(), api.getSellers()]);
                            setSales(sal);
                            setSellers(sel);
                        }}
                    />
                )
            }

            {/* Modal de Confirmación de Edición */}
            <EditConfirmationModal
                isOpen={showEditConfirm}
                title="Confirmar Edición de Venta"
                changes={editChanges}
                onConfirm={handleConfirmEdit}
                onCancel={() => setShowEditConfirm(false)}
                loading={editConfirmLoading}
            />

        </div >
    );
};
