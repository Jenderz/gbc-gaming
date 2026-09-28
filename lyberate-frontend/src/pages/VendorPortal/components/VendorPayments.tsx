import React from 'react';
import { CreditCard, Image, Clock, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { Payment } from '../../../services/apiService';

interface VendorPaymentsProps {
    payments: Payment[];
    onOpenModal: () => void;
}

const StatusBadge = ({ status }: { status: Payment['status'] }) => {
    const map = {
        pending: { label: 'Pendiente', icon: Clock, className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
        approved: { label: 'Aprobado', icon: CheckCircle2, className: 'bg-ios-green/10 text-ios-green border-ios-green/20' },
        rejected: { label: 'Rechazado', icon: XCircle, className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    };
    const { label, icon: Icon, className } = map[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${className}`}>
            <Icon size={11} /> {label}
        </span>
    );
};

export const VendorPayments: React.FC<VendorPaymentsProps> = ({ payments, onOpenModal }) => {
    return (
        <div className="space-y-4 animate-fade-in pb-8">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Mis Recaudaciones</h2>
                <button
                    onClick={onOpenModal}
                    className="flex items-center gap-2 px-4 py-2 bg-ios-blue/10 text-ios-blue dark:bg-ios-blue dark:text-white rounded-xl text-sm font-bold shadow-sm hover:scale-105 transition-all active:scale-95"
                >
                    <Plus size={16} /> Registrar Pago
                </button>
            </div>

            {payments.length === 0 ? (
                <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
                        <CreditCard size={32} className="opacity-50" />
                    </div>
                    <p className="font-bold text-ios-text">No has registrado pagos aún</p>
                    <p className="text-xs mt-1 max-w-[200px] mx-auto text-balance">Presiona "Registrar Pago" para enviar un comprobante a la administración.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {payments.map(p => (
                        <div key={p.id} className="glass-panel p-4 rounded-2xl flex gap-4 items-start hover:bg-white/10 dark:hover:bg-black/10 transition-colors cursor-default">
                            {/* Comprobante thumbnail */}
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 flex-shrink-0 flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm">
                                {p.proofImageUrl
                                    ? <img src={p.proofImageUrl} alt="Comprobante" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                                    : <Image size={20} className="text-ios-subtext opacity-40" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-sm text-ios-text">{p.bank} — {p.method}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${p.type === 'payout' ? 'text-blue-500' : p.type === 'credit' ? 'text-ios-green' : 'text-red-500'}`}>
                                            {p.type === 'payout' ? 'Liquidación de Banca' : p.type === 'credit' ? 'Saldo a Favor' : 'Pago a Banca'}
                                        </p>
                                        <p className="text-xs text-ios-subtext">Ref: {p.reference} · {p.date}</p>
                                    </div>
                                    <StatusBadge status={p.status} />
                                </div>
                                <p className={`text-xl font-bold mt-1 tracking-tight ${p.type === 'payout' ? 'text-blue-500' : p.type === 'credit' ? 'text-ios-green' : 'text-ios-text'}`}>
                                    {p.type === 'payout' || p.type === 'credit' ? '+' : '-'}{p.currency} {p.amount.toFixed(2)}
                                </p>
                                {p.status === 'rejected' && p.adminNote && (
                                    <p className="text-xs text-red-500 mt-1 font-medium bg-red-500/10 px-2 py-1 rounded-lg inline-block border border-red-500/10">
                                        Motivo: {p.adminNote}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
