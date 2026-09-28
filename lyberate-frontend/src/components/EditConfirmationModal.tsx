import { AlertTriangle, Check, X, ArrowRight } from 'lucide-react';

export interface ChangeItem {
    label: string;
    oldValue: string | number;
    newValue: string | number;
}

interface Props {
    isOpen: boolean;
    title: string;
    changes: ChangeItem[];
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

export const EditConfirmationModal = ({ isOpen, title, changes, onConfirm, onCancel, loading }: Props) => {
    if (!isOpen || changes.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-lg animate-fade-in">
            <div
                className="bg-white/10 dark:bg-black/50 w-full max-w-lg rounded-3xl p-6 relative shadow-[0_8px_32px_0_rgba(31,38,135,0.4)] backdrop-blur-xl border border-white/20 animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
                        <p className="text-xs text-white/60">Revisa los cambios antes de confirmar</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="ml-auto p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Changes List */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar mb-6">
                    {changes.map((change, i) => (
                        <div
                            key={i}
                            className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 group hover:bg-white/[0.08] transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">{change.label}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-red-400/80 line-through truncate max-w-[180px]">
                                        {String(change.oldValue) || '—'}
                                    </span>
                                    <ArrowRight size={14} className="text-white/30 shrink-0" />
                                    <span className="text-sm font-bold text-emerald-400 truncate max-w-[180px]">
                                        {String(change.newValue) || '—'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end border-t border-white/10 pt-4">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Check size={16} />
                        )}
                        {loading ? 'Guardando...' : 'Aplicar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};
