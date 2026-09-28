import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Trash2, ArrowDownCircle, RotateCcw, CheckCircle2, XCircle, Clock, Ban } from 'lucide-react';
import {
    getPosturas, addPostura, returnPostura, cancelPostura, deletePostura,
    Postura, PosturaStatus, PosturaMethod,
} from '../services/apiService';
import { useSmartTable } from '../hooks/useSmartTable';
import { TablePaginator } from '../components/SmartTable/TablePaginator';
import { TableSkeleton } from '../components/SmartTable/TableSkeleton';

// ─── Constants ───────────────────────────────────────────────────────────────

const POSTURA_METHODS: PosturaMethod[] = ['Efectivo', 'Transferencia', 'Zelle', 'Pago Móvil', 'Otro'];
const CURRENCIES = ['USD', 'Bs.', 'COP'];
const BANKS = ['N/A', 'Banesco', 'Provincial', 'Bank of America', 'PayPal'];

const STATUS_CONFIG: Record<PosturaStatus, { label: string; color: string; icon: React.ElementType }> = {
    pendiente: { label: 'Pendiente',  color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: Clock },
    devuelta:  { label: 'Devuelta',   color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
    cancelada: { label: 'Cancelada',  color: 'bg-red-500/10 text-red-500 border-red-500/30', icon: Ban },
};

const CURRENCY_SYM: Record<string, string> = { 'USD': '$', 'Bs.': 'Bs. ', 'COP': 'COP ' };

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const normalizeCurrency = (currency: string): string => {
    const lower = (currency || '').toLowerCase().trim();
    if (lower.includes('dolar') || lower.includes('usd') || lower === '$') return 'USD';
    if (lower.includes('bolivar') || lower.includes('bs') || lower.includes('ves')) return 'Bs.';
    if (lower.includes('peso') || lower.includes('cop')) return 'COP';
    return 'USD';
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: PosturaStatus }) => {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
            <Icon size={11} /> {cfg.label}
        </span>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

type ModalMode = 'none' | 'new' | 'return' | 'cancel';

export const Posturas = () => {
    const [posturas, setPosturas] = useState<Postura[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalMode, setModalMode] = useState<ModalMode>('none');
    const [selectedPostura, setSelectedPostura] = useState<Postura | null>(null);

    // ── Form: Nueva Postura ─────────────────────────────────────────────
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [concept, setConcept] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [currency, setCurrency] = useState('USD');
    const [method, setMethod] = useState<PosturaMethod>('Efectivo');
    const [bank, setBank] = useState('N/A');
    const [responsible, setResponsible] = useState('');
    const [formError, setFormError] = useState('');

    // ── Form: Devolución/Cancelación ────────────────────────────────────
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
    const [returnNote, setReturnNote] = useState('');

    const refresh = async () => {
        setLoading(true);
        try { setPosturas(await getPosturas()); }
        finally { setLoading(false); }
    };

    useEffect(() => { refresh(); }, []);

    // ─── Smart Table ─────────────────────────────────────────────────────
    const {
        paginatedData, searchQuery, setSearchQuery,
        page, setPage, pageSize, setPageSize,
        totalPages, totalCount, rangeFrom, rangeTo,
    } = useSmartTable(posturas, { defaultPageSize: 30 });

    // ─── KPI Totals (sobre dataset completo) ────────────────────────────
    const kpis = useMemo(() => {
        const empty = () => ({ pendiente: 0, devuelta: 0, cancelada: 0 });
        const totals: Record<string, ReturnType<typeof empty>> = {
            USD: empty(), 'Bs.': empty(), COP: empty(),
        };
        for (const p of posturas) {
            const cur = normalizeCurrency(p.currency);
            totals[cur][p.status] += p.amount;
        }
        return totals;
    }, [posturas]);

    // ─── Handlers ────────────────────────────────────────────────────────
    const resetNew = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setConcept(''); setAmount(''); setCurrency('USD');
        setMethod('Efectivo'); setBank('N/A'); setResponsible(''); setFormError('');
    };

    const handleSubmitNew = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!concept.trim()) { setFormError('El concepto es requerido.'); return; }
        if (!amount || (amount as number) <= 0) { setFormError('Ingresa un monto válido.'); return; }
        try {
            await addPostura({
                postura_date: date, concept: concept.trim(),
                amount: Number(amount), currency, method, bank, responsible: responsible.trim() || undefined,
            });
            await refresh(); resetNew(); setModalMode('none');
        } catch (err: any) { setFormError(err.message || 'Error al registrar.'); }
    };

    const openReturn = (p: Postura) => {
        setSelectedPostura(p);
        setReturnDate(new Date().toISOString().split('T')[0]);
        setReturnNote('');
        setModalMode('return');
    };

    const openCancel = (p: Postura) => {
        setSelectedPostura(p);
        setReturnNote('');
        setModalMode('cancel');
    };

    const handleReturn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPostura) return;
        try {
            await returnPostura(selectedPostura.id, returnDate, returnNote || undefined);
            await refresh(); setModalMode('none');
        } catch (err: any) { alert(err.message || 'Error'); }
    };

    const handleCancel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPostura) return;
        try {
            await cancelPostura(selectedPostura.id, returnNote || undefined);
            await refresh(); setModalMode('none');
        } catch (err: any) { alert(err.message || 'Error'); }
    };

    const handleDelete = async (id: string | number) => {
        if (!confirm('¿Eliminar esta postura? Esta acción no se puede deshacer.')) return;
        try { await deletePostura(id); await refresh(); }
        catch (err: any) { alert(err.message || 'Error al eliminar.'); }
    };

    const closeModal = () => { setModalMode('none'); setSelectedPostura(null); resetNew(); };

    // ─── Render ───────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in pb-safe">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <ArrowDownCircle size={22} className="text-amber-500" /> Posturas
                    </h1>
                    <p className="text-sm text-ios-subtext mt-1">Adelantos de caja para cubrir premios — control de reversiones</p>
                </div>
                <button
                    onClick={() => { resetNew(); setModalMode('new'); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-amber-600 transition-all"
                >
                    <Plus size={16} /> Nueva Postura
                </button>
            </div>

            {/* KPI Summary */}
            {posturas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['USD', 'Bs.', 'COP'] as const).map(cur => {
                        const data = kpis[cur];
                        const sym = CURRENCY_SYM[cur];
                        if (data.pendiente === 0 && data.devuelta === 0 && data.cancelada === 0) return null;
                        return (
                            <div key={cur} className="glass-panel p-4 rounded-2xl border-l-4 border-amber-500 space-y-3">
                                <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">{cur === 'USD' ? 'Dólar' : cur === 'Bs.' ? 'Bolívar' : 'Peso Colombiano'}</p>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-1 text-xs text-yellow-600 font-semibold"><Clock size={12}/> Pendiente</span>
                                    <span className="font-bold text-amber-500">{sym}{fmt(data.pendiente)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 size={12}/> Devuelto</span>
                                    <span className="font-semibold text-emerald-600">{sym}{fmt(data.devuelta)}</span>
                                </div>
                                {data.cancelada > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1 text-xs text-red-500 font-semibold"><Ban size={12}/> Cancelado</span>
                                        <span className="font-semibold text-red-500">{sym}{fmt(data.cancelada)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modal: Nueva Postura ──────────────────────────────────────────── */}
            {modalMode === 'new' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(0,0,0,0.88) 100%)', backdropFilter: 'blur(40px)', border: '1px solid rgba(245,158,11,0.35)' }}>
                        <div className="p-6 md:p-8">
                            <button onClick={closeModal} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"><X size={18} /></button>
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <ArrowDownCircle size={20} className="text-amber-400" /> Registrar Postura
                            </h2>
                            {formError && <div className="mb-4 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{formError}</div>}
                            <form onSubmit={handleSubmitNew} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Fecha</label>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-transparent text-white border-none outline-none font-medium text-sm text-center" />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Moneda</label>
                                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-transparent text-white border-none outline-none font-medium text-sm appearance-none cursor-pointer">
                                            {CURRENCIES.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Concepto / Descripción</label>
                                    <input type="text" value={concept} onChange={e => setConcept(e.target.value)} placeholder="Ej. Premio grande Ag. Las Cruces" className="w-full bg-transparent text-white border-none outline-none font-medium text-sm" />
                                </div>

                                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Responsable (quien lleva el dinero)</label>
                                    <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Ej. Ag. Las Cruces / Juan Pérez" className="w-full bg-transparent text-white border-none outline-none font-medium text-sm" />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl col-span-1">
                                        <label className="block text-[10px] font-bold text-amber-400 mb-1 uppercase tracking-wider">Monto</label>
                                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="0.00" className="w-full bg-transparent text-amber-300 border-none outline-none font-bold text-xl" />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Método</label>
                                        <select value={method} onChange={e => setMethod(e.target.value as PosturaMethod)} className="w-full bg-transparent text-white border-none outline-none font-medium text-xs appearance-none cursor-pointer">
                                            {POSTURA_METHODS.map(m => <option key={m} value={m} className="text-black">{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Banco</label>
                                        <select value={bank} onChange={e => setBank(e.target.value)} className="w-full bg-transparent text-white border-none outline-none font-medium text-xs appearance-none cursor-pointer">
                                            {BANKS.map(b => <option key={b} value={b} className="text-black">{b}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-white/10">
                                    <button type="button" onClick={resetNew} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10">
                                        <RotateCcw size={16} /> Limpiar
                                    </button>
                                    <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-md hover:bg-amber-600 transition-all">
                                        <Plus size={16} /> Registrar Postura
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Registrar Devolución ──────────────────────────────────── */}
            {modalMode === 'return' && selectedPostura && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0.88) 100%)', backdropFilter: 'blur(40px)', border: '1px solid rgba(16,185,129,0.35)' }}>
                        <div className="p-6">
                            <button onClick={closeModal} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"><X size={18} /></button>
                            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-emerald-400" /> Registrar Devolución
                            </h2>
                            <p className="text-sm text-white/60 mb-6">
                                <span className="font-semibold text-white">{selectedPostura.concept}</span> —{' '}
                                {CURRENCY_SYM[selectedPostura.currency] || selectedPostura.currency}{fmt(selectedPostura.amount)}
                            </p>
                            <form onSubmit={handleReturn} className="space-y-4">
                                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Fecha de Devolución</label>
                                    <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="w-full bg-transparent text-white border-none outline-none font-medium text-sm text-center" />
                                </div>
                                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Nota (opcional)</label>
                                    <textarea value={returnNote} onChange={e => setReturnNote(e.target.value)} rows={2} placeholder="Quién devolvió, referencia, etc." className="w-full bg-transparent text-white border-none outline-none font-medium text-sm resize-none" />
                                </div>
                                <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition-all">
                                    <CheckCircle2 size={16} /> Confirmar Devolución
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Cancelar Postura ──────────────────────────────────────── */}
            {modalMode === 'cancel' && selectedPostura && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(0,0,0,0.88) 100%)', backdropFilter: 'blur(40px)', border: '1px solid rgba(239,68,68,0.35)' }}>
                        <div className="p-6">
                            <button onClick={closeModal} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"><X size={18} /></button>
                            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <XCircle size={20} className="text-red-400" /> Cancelar Postura
                            </h2>
                            <p className="text-sm text-white/60 mb-1">
                                <span className="font-semibold text-white">{selectedPostura.concept}</span> —{' '}
                                {CURRENCY_SYM[selectedPostura.currency] || selectedPostura.currency}{fmt(selectedPostura.amount)}
                            </p>
                            <p className="text-xs text-red-300 mb-6">⚠️ Al cancelar, este monto quedará registrado como gasto definitivo y no se esperará devolución.</p>
                            <form onSubmit={handleCancel} className="space-y-4">
                                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Motivo (opcional)</label>
                                    <textarea value={returnNote} onChange={e => setReturnNote(e.target.value)} rows={2} placeholder="Motivo de cancelación..." className="w-full bg-transparent text-white border-none outline-none font-medium text-sm resize-none" />
                                </div>
                                <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm shadow-md hover:bg-red-700 transition-all">
                                    <Ban size={16} /> Confirmar Cancelación
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Historial de Posturas ─────────────────────────────────────────── */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col">
                <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
                    <div className="relative flex-1 w-full max-w-md">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        </span>
                        <input
                            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar por concepto, responsable, moneda..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-sm"
                        />
                    </div>
                    <span className="text-xs font-bold text-ios-subtext">{totalCount} registro(s)</span>
                </div>

                {loading ? (
                    <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                                <tr>
                                    {['Fecha', 'Concepto', 'Responsable', 'Moneda / Monto', 'Estado', ''].map(h => (
                                        <th key={h} className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                <TableSkeleton cols={6} rows={5} />
                            </tbody>
                        </table>
                    </div>
                ) : totalCount === 0 ? (
                    <div className="py-16 text-center text-ios-subtext">
                        <ArrowDownCircle size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">{posturas.length === 0 ? 'No hay posturas registradas.' : 'Sin resultados para tu búsqueda.'}</p>
                        <p className="text-sm mt-1">Registra una postura cuando saques efectivo de caja para cubrir premios.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Fecha</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Concepto</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Responsable</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase text-right">Monto</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Estado</th>
                                    <th className="px-4 py-3 text-xs uppercase"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {paginatedData.map(p => (
                                    <tr key={p.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <p className="font-mono text-xs text-ios-subtext">{p.date}</p>
                                            {p.returnedDate && (
                                                <p className="font-mono text-[10px] text-emerald-600 mt-0.5">↩ {p.returnedDate}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-sm">{p.concept}</p>
                                            {p.returnNote && <p className="text-xs text-ios-subtext mt-0.5 italic">"{p.returnNote}"</p>}
                                        </td>
                                        <td className="px-4 py-3 text-ios-subtext text-xs">{p.responsible || '—'}</td>
                                        <td className="px-4 py-3 text-right font-bold text-amber-600">
                                            {CURRENCY_SYM[p.currency] || p.currency}{fmt(p.amount)}
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                {p.status === 'pendiente' && (
                                                    <>
                                                        <button onClick={() => openReturn(p)} title="Registrar Devolución" className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                                            <CheckCircle2 size={15} />
                                                        </button>
                                                        <button onClick={() => openCancel(p)} title="Cancelar Postura" className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                            <XCircle size={15} />
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => handleDelete(p.id)} title="Eliminar" className="p-1.5 text-ios-subtext hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalCount > 0 && (
                            <TablePaginator
                                page={page} totalPages={totalPages} totalCount={totalCount}
                                pageSize={pageSize} rangeFrom={rangeFrom} rangeTo={rangeTo}
                                setPage={setPage} setPageSize={setPageSize}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
