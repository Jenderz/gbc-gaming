import { useState } from 'react';
import { CheckCircle2, FileText, Image, XCircle } from 'lucide-react';
import { Payment } from '../../../services/apiService';

interface Props {
    pendingPayments: Payment[];
    onApprove: (id: string) => void;
    onReject: (id: string, note: string) => void;
    onOpenProof: (src: string) => void;
}

export const ApprovalsPanel = ({ pendingPayments, onApprove, onReject, onOpenProof }: Props) => {
    const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (pendingPayments.length === 0) {
        return (
            <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-ios-green opacity-60" />
                <p className="font-semibold">Sin comprobantes pendientes</p>
                <p className="text-xs mt-1">Todos los pagos de esta semana están al día o no hay registros.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 animate-fade-in">
            {pendingPayments.map(p => (
                <div key={p.id} className="glass-panel p-4 rounded-2xl space-y-3 border border-orange-500/20">
                    <div className="flex items-start gap-4">
                        <div
                            className="w-20 h-20 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 flex-shrink-0 flex items-center justify-center cursor-pointer border-2 border-ios-blue/20 hover:border-ios-blue/50 transition-colors"
                            onClick={() => setExpandedId(expandedId === String(p.id) ? null : String(p.id))}
                        >
                            <div className="flex flex-col items-center justify-center w-full h-full text-ios-blue bg-blue-500/10">
                                <FileText size={24} />
                                <span className="text-[10px] mt-1 font-bold text-center leading-tight">Ver<br />Baucher</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-ios-blue">{p.vendorName}</p>
                            <p className="text-xs text-ios-subtext">{p.date}</p>
                            <p className="text-xl font-bold mt-1 text-green-500">{p.currency} {p.amount.toFixed(2)}</p>
                            <p className="text-xs text-ios-subtext bg-black/5 dark:bg-white/5 p-2 rounded-lg mt-2 inline-block font-mono">{p.bank} — {p.method} | Ref: {p.reference}</p>
                        </div>
                    </div>

                    {expandedId === String(p.id) && (
                        <div className="rounded-xl overflow-hidden animate-fade-in bg-black/5 dark:bg-white/5 p-4 text-center border border-black/10 dark:border-white/10">
                            {p.proofImageUrl ? (
                                <img
                                    src={p.proofImageUrl}
                                    alt="Comprobante"
                                    className="max-h-60 mx-auto rounded-lg object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                                    onClick={() => onOpenProof(p.proofImageUrl!)}
                                />
                            ) : (
                                <div className="w-full h-32 bg-black/10 dark:bg-white/10 rounded-lg flex flex-col items-center justify-center gap-2">
                                    <Image size={32} className="text-ios-subtext/50" />
                                    <p className="text-xs text-ios-subtext">No se adjuntó imagen de comprobante</p>
                                </div>
                            )}
                        </div>
                    )}

                    <input
                        type="text"
                        placeholder="Nota de rechazo (opcional)..."
                        value={rejectNote[String(p.id)] ?? ''}
                        onChange={e => setRejectNote(prev => ({ ...prev, [String(p.id)]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent focus:border-red-500/50 outline-none text-sm transition-all"
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={() => onApprove(String(p.id))}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white shadow-md hover:bg-green-600 font-bold text-sm transition-all"
                        >
                            <CheckCircle2 size={16} /> Aprobar Ingreso
                        </button>
                        <button
                            onClick={() => {
                                onReject(String(p.id), rejectNote[String(p.id)] || '');
                                setRejectNote(prev => ({ ...prev, [String(p.id)]: '' }));
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 font-bold text-sm transition-all"
                        >
                            <XCircle size={16} /> Rechazar
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
