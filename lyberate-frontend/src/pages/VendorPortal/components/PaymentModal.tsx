import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, CheckCircle2, ChevronDown } from 'lucide-react';
import { addPayment, PaymentMethod, getWeeklyPeriods, getAvailableCurrencies } from '../../../services/apiService';

const BANKS = ['Banesco', 'Provincial (BBVA)', 'Mercantil', 'BNC', 'Banplus', 'Bicentenario', 'Otro'];
const METHODS: PaymentMethod[] = ['Transferencia', 'Zelle', 'Pago Móvil', 'Efectivo', 'Otro'];

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    sellerId: string;
    refreshData: () => void;
    actionType: 'payment' | 'credit';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, user, sellerId, refreshData, actionType }) => {
    const [amount, setAmount] = useState<number | ''>('');
    const [currency, setCurrency] = useState('DOLAR');
    const [currencies, setCurrencies] = useState<string[]>([]);
    const [bank, setBank] = useState('');
    const [method, setMethod] = useState<PaymentMethod>('Transferencia');
    const [reference, setReference] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [proofImage, setProofImage] = useState<string | null>(null);

    const [proofName, setProofName] = useState('');
    const [formError, setFormError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const load = async () => {
            const avail = await getAvailableCurrencies();
            setCurrencies(avail);
            if (avail.length > 0) setCurrency(avail[0]);
        };
        load();
    }, []);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setFormError('La imagen no puede superar 5 MB.'); return; }
        setProofName(file.name);

        const reader = new FileReader();
        reader.onload = (ev) => setProofImage(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const resetForm = () => {
        setAmount(''); setCurrency('USD'); setBank(''); setMethod('Transferencia');
        setReference(''); setDate(new Date().toISOString().split('T')[0]);
        setProofImage(null); setProofName(''); setFormError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !bank || !reference) { setFormError('Por favor completa todos los campos requeridos.'); return; }
        if (!user || !sellerId) return;
        const weeklyPeriods = getWeeklyPeriods();
        const currentWeek = weeklyPeriods[0];

        try {
            await addPayment({
                vendorId: user.id,
                vendorName: user.name,
                agencyName: user.agencyName ?? '',
                sellerId,
                week: currentWeek?.label || 'Semana actual',
                weekId: currentWeek?.id || 'week-0',
                amount: Number(amount),
                currency,
                bank,
                method,
                reference,
                date,
                status: 'pending',
                type: actionType,
                proofBase64: proofImage ? proofImage.replace(/^data:[^;]+;base64,/, '') : undefined,
            });

            handleClose();
            await refreshData();
        } catch (err: any) {
            setFormError(err?.message || 'Error al registrar el pago. Intenta de nuevo.');
        }
    };

    const isCredit = actionType === 'credit';

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in transition-all duration-300">
            <div className="bg-ios-bg dark:bg-[#111] w-full max-w-lg rounded-[2rem] p-6 relative shadow-[0_8px_32px_0_rgba(31,38,135,0.3)] max-h-[90vh] overflow-y-auto no-scrollbar transform scale-100 opacity-100 transition-all">
                <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/5 text-ios-subtext hover:text-red-500 hover:bg-red-500/10 transition-colors">
                    <X size={20} />
                </button>
                <h2 className={`text-lg font-bold mb-5 ${isCredit ? 'text-ios-green' : 'text-ios-text'}`}>
                    {isCredit ? 'Solicitar Cobro de Saldo' : 'Registrar Recaudación (Pago)'}
                </h2>

                <form onSubmit={handleSubmitPayment} className="space-y-4">
                    {/* Amount + Currency */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Monto *</label>
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} required className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none font-semibold text-lg transition-all" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Moneda</label>
                            <div className="relative hover:opacity-80 transition-opacity">
                                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none appearance-none pr-7 font-semibold cursor-pointer">
                                    {currencies.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ios-subtext pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Bank + Method */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Banco *</label>
                            <div className="relative hover:opacity-80 transition-opacity">
                                <select value={bank} onChange={e => setBank(e.target.value)} required className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none appearance-none pr-7 cursor-pointer text-sm">
                                    <option value="">Selecciona...</option>
                                    {BANKS.map(b => <option key={b}>{b}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ios-subtext pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Método</label>
                            <div className="relative hover:opacity-80 transition-opacity">
                                <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none appearance-none pr-7 cursor-pointer text-sm">
                                    {METHODS.map(m => <option key={m}>{m}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ios-subtext pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Reference + Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">N° Referencia *</label>
                            <input type="text" value={reference} onChange={e => setReference(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none font-mono text-sm transition-all" placeholder="REF-XXXXXX" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Fecha</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none text-sm transition-all cursor-pointer" />
                        </div>
                    </div>

                    {/* Comprobante Upload */}
                    <div>
                        <label className="block text-[10px] font-bold text-ios-subtext mb-2 uppercase tracking-wider">Comprobante (opcional)</label>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        {proofImage ? (
                            <div className="relative rounded-xl overflow-hidden border border-ios-blue/30 group">
                                <img src={proofImage} alt="Comprobante" className="w-full max-h-48 object-contain bg-black/5 dark:bg-white/5 transition-transform duration-300 group-hover:scale-105" />
                                <button type="button" onClick={() => { setProofImage(null); setProofName(''); }} className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-red-500 transition-colors shadow-lg">
                                    <X size={14} />
                                </button>
                                <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-black/60 backdrop-blur-md text-xs text-white truncate">{proofName}</div>
                            </div>
                        ) : (
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-ios-blue/30 hover:border-ios-blue hover:bg-ios-blue/5 rounded-xl p-6 flex flex-col items-center gap-2 text-ios-subtext hover:text-ios-blue transition-all group">
                                <div className="p-3 rounded-full bg-ios-blue/10 group-hover:scale-110 transition-transform">
                                    <Upload size={20} className="text-ios-blue" />
                                </div>
                                <span className="text-sm font-bold mt-1 text-ios-text">Toca para subir imagen</span>
                                <span className="text-[10px] uppercase font-bold text-ios-subtext">JPG, PNG, WEBP max 5MB</span>
                            </button>
                        )}
                    </div>

                    {/* Error */}
                    {formError && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-shake">{formError}</div>
                    )}

                    {/* Submit */}
                    <button type="submit" className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2 mt-4 ${isCredit ? 'bg-ios-green hover:shadow-ios-green/30 hover:bg-green-600' : 'bg-ios-blue hover:shadow-ios-blue/30 hover:bg-blue-600'}`}>
                        <CheckCircle2 size={18} /> {isCredit ? 'Enviar Solicitud de Cobro' : 'Enviar Recaudación'}
                    </button>
                </form>
            </div>
        </div>
    );
};
