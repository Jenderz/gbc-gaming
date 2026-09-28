import { FileText, X, CheckCircle2, Pencil } from 'lucide-react';
import { Seller, getWeeklyPeriods } from '../../../services/apiService';
import { WeekPickerInput } from '../../../components/WeekPickerInput';
import { SearchableSelect } from '../../../components/SearchableSelect';

interface Props {
    isModalOpen: boolean;
    setIsModalOpen: (val: boolean) => void;
    sellers: Seller[];
    currencies?: string[];
    banks?: string[];
    paymentMethods?: string[];
    formOperationType: 'income' | 'payout';
    setFormOperationType: (val: 'income' | 'payout') => void;
    formDate: string;
    setFormDate: (val: string) => void;
    formSellerId: string;
    setFormSellerId: (val: string) => void;
    formCurrency: string;
    setFormCurrency: (val: string) => void;
    formAmount: number | '';
    setFormAmount: (val: number | '') => void;
    formBank: string;
    setFormBank: (val: string) => void;
    formMethod: string;
    setFormMethod: (val: any) => void;
    formReference: string;
    setFormReference: (val: string) => void;
    totalBank: number;
    balance: number;
    difference: number;
    handleRegisterPayment: (e: React.FormEvent) => void;
    resetForm: () => void;
    editingPayment?: any;
}

export const PaymentRegistrationModal = ({
    isModalOpen, setIsModalOpen, sellers,
    currencies = ['DOLAR', 'PESO COLOMBIANA', 'BOLIVARES VENEZOLANOS'],
    paymentMethods = [], banks = [],
    formOperationType, setFormOperationType,
    formDate, setFormDate,
    formSellerId, setFormSellerId,
    formCurrency, setFormCurrency,
    formAmount, setFormAmount,
    formBank, setFormBank,
    formMethod, setFormMethod,
    formReference, setFormReference,
    totalBank, balance, difference,
    handleRegisterPayment, resetForm,
    editingPayment
}: Props) => {
    if (!isModalOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white/10 dark:bg-black/40 w-full max-w-3xl rounded-3xl p-6 relative shadow-[0_8px_32px_0_rgba(31,38,135,0.3)] backdrop-blur-xl border border-white/20 max-h-[90vh] overflow-y-auto no-scrollbar">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all">
                    <X size={20} />
                </button>

                <div className="mb-8 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg ${editingPayment ? 'from-amber-500 to-orange-600' : formOperationType === 'income' ? 'from-green-500 to-emerald-600' : 'from-blue-500 to-indigo-600'}`}>
                        {editingPayment ? <Pencil size={20} className="text-white" /> : <FileText size={20} className="text-white" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide">
                            {editingPayment 
                                ? 'Editar Registro' 
                                : formOperationType === 'income' ? 'Registro de Recaudación' : 'Pago a Vendedor'}
                        </h2>
                        <p className="text-xs text-white/60">
                            {editingPayment
                                ? 'Modifica los datos del registro'
                                : formOperationType === 'income' 
                                    ? 'Reportar pago ingresado por un vendedor' 
                                    : 'Registrar retiro o liquidación de premios'}
                        </p>
                    </div>
                </div>

                <div className="flex bg-black/20 p-1 rounded-xl mb-6 border border-white/5">
                    <button 
                        onClick={() => setFormOperationType('income')} 
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formOperationType === 'income' ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        Ingreso (Nos Pagan)
                    </button>
                    <button 
                        onClick={() => setFormOperationType('payout')} 
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formOperationType === 'payout' ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        Egreso (Le Pagamos)
                    </button>
                </div>

                <form className="space-y-6" onSubmit={handleRegisterPayment}>
                    {/* Card: Información Básica */}
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                        <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-ios-blue"></span> Información General
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-white/70 mb-1.5 tracking-wider uppercase">Vendedor</label>
                                <SearchableSelect
                                    options={sellers.map(s => ({ value: String(s.id), label: s.name }))}
                                    value={formSellerId}
                                    onChange={setFormSellerId}
                                    placeholder="Seleccione Vendedor..."
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-white/70 mb-1.5 tracking-wider uppercase">Fecha Operación</label>
                                <WeekPickerInput
                                    value={formDate}
                                    onChange={setFormDate}
                                    variant="modal"
                                />
                                {formDate && <p className="text-[10px] text-white/40 mt-1 px-1">📅 {getWeeklyPeriods([formDate])[0]?.label}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Card: Estado de Cuenta */}
                    <div className={`bg-white/5 border border-white/10 p-5 rounded-2xl transition-opacity ${formSellerId ? 'opacity-100' : 'opacity-40'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Balance Actual
                            </h3>
                            <select value={formCurrency} onChange={e => setFormCurrency(e.target.value)} className="px-3 py-1.5 rounded-lg bg-black/30 text-white/90 border border-white/10 outline-none text-xs font-bold transition-all appearance-none cursor-pointer">
                                {currencies.map(c => (
                                    <option key={c} value={c} className="text-black">{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <label className="block text-[10px] font-bold text-white/50 mb-1 tracking-wider uppercase">Deuda Total Banca</label>
                                <span className="text-xl font-bold text-white">{totalBank.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="bg-ios-blue/10 p-4 rounded-xl border border-ios-blue/20">
                                <label className="block text-[10px] font-bold text-ios-blue mb-1 tracking-wider uppercase">Pendiente (Cobrar)</label>
                                <span className="text-2xl font-black text-white">{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card: Detalles del Pago */}
                    <div className={`bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 transition-opacity ${formSellerId ? 'opacity-100' : 'opacity-40'}`}>
                        <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-ios-green"></span> Datos del Pago
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div className="relative group">
                                <label className="block text-[11px] font-bold text-green-400 mb-1.5 tracking-wider uppercase">Monto Depositado</label>
                                <div className="relative">
                                    <input type="number" step="0.01" value={formAmount} onChange={e => setFormAmount(Number(e.target.value))} required placeholder="0.00" className={`w-full pl-4 pr-3 py-3 rounded-xl bg-black/20 ${difference < 0 ? 'text-red-400 border-red-500/50' : 'text-green-400 border-transparent focus:border-green-500/50'} border outline-none font-black text-2xl transition-all`} />
                                </div>
                            </div>
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5 h-[60px] flex flex-col justify-center">
                                <label className="block text-[10px] font-bold text-white/50 mb-0.5 tracking-wider uppercase">Restante tras pago</label>
                                <span className={`text-lg font-bold ${difference < 0 ? 'text-green-400' : 'text-white'}`}>
                                    {difference < 0
                                        ? `🟢 Saldo a favor: ${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                        : difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {difference < 0 && (
                            <div className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20 flex items-center gap-2">
                                🟢 El monto supera la deuda — se registrará un <strong>saldo a favor</strong> para el vendedor de {Math.abs(difference).toFixed(2)}.
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                            <div>
                                <label className="block text-[11px] font-bold text-white/70 mb-1.5 tracking-wider uppercase">Método</label>
                                <select value={formMethod} onChange={e => setFormMethod(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-black/20 text-white border border-transparent focus:border-ios-blue/50 outline-none text-sm font-medium transition-all appearance-none cursor-pointer">
                                    <option value="" className="text-black">Seleccione Método...</option>
                                    {paymentMethods.map(m => (
                                        <option key={m} value={m} className="text-black">{m}</option>
                                    ))}
                                    {paymentMethods.length === 0 && (
                                        <>
                                            <option value="Transferencia" className="text-black">Transferencia</option>
                                            <option value="Zelle" className="text-black">Zelle</option>
                                            <option value="Pago Móvil" className="text-black">Pago Móvil</option>
                                            <option value="Efectivo" className="text-black">Efectivo</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-white/70 mb-1.5 tracking-wider uppercase">Banco / Destino</label>
                                <select value={formBank} onChange={e => setFormBank(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-black/20 text-white border border-transparent focus:border-ios-blue/50 outline-none text-sm font-medium transition-all appearance-none cursor-pointer">
                                    <option value="" className="text-black">Seleccione Banco...</option>
                                    {banks.map(b => (
                                        <option key={b} value={b} className="text-black">{b}</option>
                                    ))}
                                    {banks.length === 0 && (
                                        <>
                                            <option value="Banesco" className="text-black">Banesco</option>
                                            <option value="Provincial (BBVA)" className="text-black">Provincial (BBVA)</option>
                                            <option value="Mercantil" className="text-black">Mercantil</option>
                                            <option value="BNC" className="text-black">BNC</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-white/70 mb-1.5 tracking-wider uppercase">Referencia</label>
                                <input type="text" value={formReference} onChange={e => setFormReference(e.target.value)} required placeholder="Nro. Referencia" className="w-full px-4 py-3 rounded-xl bg-black/20 text-white border border-transparent focus:border-ios-blue/50 outline-none text-sm font-medium transition-all" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 justify-end border-t border-white/10 mt-6">
                        <button type="button" onClick={() => { resetForm(); setIsModalOpen(false); }} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10">
                            {editingPayment ? 'Cancelar' : 'Limpiar Campos'}
                        </button>
                        <button type="submit" disabled={!formSellerId || !formAmount} className={`px-8 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 disabled:shadow-none hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center gap-2 bg-gradient-to-r shadow-[0_4px_15px_rgba(0,0,0,0.2)] ${editingPayment ? 'from-amber-500 to-orange-600 shadow-[0_4px_15px_rgba(245,158,11,0.4)]' : formOperationType === 'income' ? 'from-green-500 to-emerald-600 shadow-[0_4px_15px_rgba(16,185,129,0.4)]' : 'from-blue-500 to-indigo-600 shadow-[0_4px_15px_rgba(59,130,246,0.4)]'}`}>
                            <CheckCircle2 size={18} /> {editingPayment ? 'Guardar Cambios' : formOperationType === 'income' ? 'Confirmar Recaudo' : 'Confirmar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
