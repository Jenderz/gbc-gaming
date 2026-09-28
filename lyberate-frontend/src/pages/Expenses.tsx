import { useState, useEffect } from 'react';
import { Plus, X, Trash2, Receipt, RotateCcw } from 'lucide-react';
import { getExpenses, addExpense, deleteExpense, Expense, ExpenseType, PaymentMethod } from '../services/apiService';
import { useSmartTable } from '../hooks/useSmartTable';
import { TablePaginator } from '../components/SmartTable/TablePaginator';
import { TableSkeleton } from '../components/SmartTable/TableSkeleton';

const EXPENSE_TYPES: ExpenseType[] = ['Operativo', 'Nomina', 'Servicios', 'Otros'];
const PAYMENT_METHODS: PaymentMethod[] = ['Transferencia', 'Zelle', 'Pago Móvil', 'Efectivo', 'Otro'];
const BANKS = ['Banesco', 'Provincial', 'Bank of America', 'PayPal', 'N/A'];
const CURRENCIES = ['USD', 'Bs.', 'COP'];

const TYPE_COLORS: Record<ExpenseType, string> = {
    Operativo: 'bg-blue-500/10 text-blue-500',
    Nomina: 'bg-purple-500/10 text-purple-500',
    Servicios: 'bg-yellow-500/10 text-yellow-600',
    Otros: 'bg-gray-500/10 text-gray-500',
};

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const Expenses = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<ExpenseType>('Operativo');
    const [concept, setConcept] = useState('');
    const [method, setMethod] = useState<PaymentMethod>('Transferencia');
    const [bank, setBank] = useState('Banesco');
    const [amount, setAmount] = useState<number | ''>('');
    const [currency, setCurrency] = useState('USD');
    const [formError, setFormError] = useState('');

    const refreshExpenses = async () => {
        setIsLoadingExpenses(true);
        try {
            setExpenses(await getExpenses());
        } finally {
            setIsLoadingExpenses(false);
        }
    };

    useEffect(() => { refreshExpenses(); }, []);

    // ─── Tabla Inteligente ────────────────────────────────────────────
    // Los KPI totals (totalUsd, totalBs, totalCop) siguen calculados sobre `expenses`
    // completo, NO sobre los datos filtrados. La búsqueda y paginación son independientes.
    const {
        paginatedData: paginatedExpenses,
        searchQuery, setSearchQuery,
        page, setPage,
        pageSize, setPageSize,
        totalPages, totalCount,
        rangeFrom, rangeTo,
    } = useSmartTable(expenses, { defaultPageSize: 40 });

    const resetForm = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setType('Operativo');
        setConcept('');
        setMethod('Transferencia');
        setBank('Banesco');
        setAmount('');
        setCurrency('USD');
        setFormError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!concept.trim()) { setFormError('El concepto es requerido.'); return; }
        if (!amount || amount <= 0) { setFormError('Ingresa un monto válido.'); return; }

        await addExpense({ date, type, concept: concept.trim(), method, bank, amount: Number(amount), currency });
        await refreshExpenses();
        resetForm();
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este gasto?')) {
            await deleteExpense(id);
            await refreshExpenses();
        }
    };


    // KPI totals — siempre sobre el dataset completo (NO filtrado)
    const totalUsd = expenses.filter(e => e.currency === 'USD').reduce((s, e) => s + e.amount, 0);
    const totalBs = expenses.filter(e => e.currency === 'Bs.').reduce((s, e) => s + e.amount, 0);
    const totalCop = expenses.filter(e => e.currency === 'COP').reduce((s, e) => s + e.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in pb-safe">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Receipt size={22} className="text-ios-red" /> Gastos
                    </h1>
                    <p className="text-sm text-ios-subtext mt-1">Control de egresos operativos y gastos fijos</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-ios-red text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-600 transition-all"
                >
                    <Plus size={16} /> Nuevo Gasto
                </button>
            </div>

            {/* KPI Summary */}
            {(totalUsd > 0 || totalBs > 0 || totalCop > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {totalUsd > 0 && (
                        <div className="glass-panel p-4 rounded-2xl border-l-4 border-ios-red">
                            <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider mb-1">Total Gastos USD</p>
                            <p className="text-xl font-bold text-ios-red">-${fmt(totalUsd)}</p>
                        </div>
                    )}
                    {totalBs > 0 && (
                        <div className="glass-panel p-4 rounded-2xl border-l-4 border-orange-500">
                            <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider mb-1">Total Gastos Bs.</p>
                            <p className="text-xl font-bold text-orange-500">-Bs. {fmt(totalBs)}</p>
                        </div>
                    )}
                    {totalCop > 0 && (
                        <div className="glass-panel p-4 rounded-2xl border-l-4 border-yellow-500">
                            <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider mb-1">Total Gastos COP</p>
                            <p className="text-xl font-bold text-yellow-600">-COP {fmt(totalCop)}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,59,48,0.15) 0%, rgba(0,0,0,0.85) 100%)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,59,48,0.3)' }}>
                        <div className="p-6 md:p-8">
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                                <X size={18} />
                            </button>

                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Receipt size={20} className="text-ios-red" /> Registrar Gasto
                            </h2>

                            {formError && (
                                <div className="mb-4 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Fecha</label>
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-transparent text-white border-none outline-none font-medium text-sm text-center" />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Tipo</label>
                                        <select value={type} onChange={e => setType(e.target.value as ExpenseType)} className="w-full bg-transparent text-white border-none outline-none font-medium text-sm appearance-none cursor-pointer">
                                            {EXPENSE_TYPES.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Concepto</label>
                                    <input type="text" value={concept} onChange={e => setConcept(e.target.value)} placeholder="Ej. Pago de Internet" className="w-full bg-transparent text-white border-none outline-none font-medium text-sm" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Método</label>
                                        <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className="w-full bg-transparent text-white border-none outline-none font-medium text-sm appearance-none cursor-pointer">
                                            {PAYMENT_METHODS.map(m => <option key={m} value={m} className="text-black">{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Banco / Cuenta</label>
                                        <select value={bank} onChange={e => setBank(e.target.value)} className="w-full bg-transparent text-white border-none outline-none font-medium text-sm appearance-none cursor-pointer">
                                            {BANKS.map(b => <option key={b} value={b} className="text-black">{b}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-red-400 mb-1 uppercase tracking-wider">Monto</label>
                                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="0.00" className="w-full bg-transparent text-red-300 border-none outline-none font-bold text-xl" />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                        <label className="block text-[10px] font-bold text-white/50 mb-1 uppercase tracking-wider">Moneda</label>
                                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-transparent text-white border-none outline-none font-medium text-sm appearance-none cursor-pointer">
                                            {CURRENCIES.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-white/10">
                                    <button type="button" onClick={resetForm} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10">
                                        <RotateCcw size={16} /> Limpiar
                                    </button>
                                    <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ios-red text-white font-bold text-sm shadow-md hover:bg-red-600 transition-all">
                                        <Plus size={16} /> Registrar Gasto
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Historial */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col">
                <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
                    <div className="relative flex-1 w-full max-w-md">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar por concepto, tipo, banco..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-ios-red/50 outline-none transition-all text-sm"
                        />
                    </div>
                    <span className="text-xs font-bold text-ios-subtext">{totalCount} registro(s)</span>
                </div>

                {isLoadingExpenses ? (
                    <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                        <table className="w-full text-left text-sm min-w-[600px]">
                            <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Fecha</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Concepto</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Tipo</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Método / Banco</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase text-right">Monto</th>
                                    <th className="px-4 py-3 text-xs uppercase"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                <TableSkeleton cols={6} rows={6} />
                            </tbody>
                        </table>
                    </div>
                ) : totalCount === 0 ? (
                    <div className="py-16 text-center text-ios-subtext">
                        <Receipt size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">{expenses.length === 0 ? 'No hay gastos registrados.' : 'Sin resultados para tu búsqueda.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                        <table className="w-full text-left text-sm min-w-[600px]">
                            <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Fecha</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Concepto</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Tipo</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase">Método / Banco</th>
                                    <th className="px-4 py-3 font-semibold text-ios-subtext text-xs uppercase text-right">Monto</th>
                                    <th className="px-4 py-3 text-xs uppercase"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {paginatedExpenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3 text-ios-subtext font-mono text-xs">{exp.date}</td>
                                        <td className="px-4 py-3 font-semibold">{exp.concept}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TYPE_COLORS[exp.type]}`}>{exp.type}</span>
                                        </td>
                                        <td className="px-4 py-3 text-ios-subtext text-xs">{exp.method} · {exp.bank}</td>
                                        <td className="px-4 py-3 text-right font-bold text-ios-red">
                                            -{exp.currency === 'USD' ? '$' : exp.currency} {fmt(exp.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleDelete(String(exp.id))} className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalCount > 0 && (
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
                )}
            </div>
        </div>
    );
};
