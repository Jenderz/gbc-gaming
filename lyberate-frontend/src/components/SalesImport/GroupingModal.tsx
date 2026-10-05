import React from 'react';
import { Users, X, UserMinus } from 'lucide-react';
import { Seller } from '../../services/apiService';

interface GroupingModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceAgent: string;
    setSourceAgent: (agent: string) => void;
    allAgents: string[];
    allSellers: Seller[];
    targetSeller: string;
    setTargetSeller: (seller: string) => void;
    customTarget: string;
    setCustomTarget: (target: string) => void;
    saveAlias: boolean;
    setSaveAlias: (save: boolean) => void;
    onConfirm: () => void;
    onMakeStandalone?: (name: string) => void;
}

export const GroupingModal: React.FC<GroupingModalProps> = ({
    isOpen,
    onClose,
    sourceAgent,
    setSourceAgent,
    allAgents,
    allSellers,
    targetSeller,
    setTargetSeller,
    customTarget,
    setCustomTarget,
    saveAlias,
    setSaveAlias,
    onConfirm,
    onMakeStandalone
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-ios-blue/10 text-ios-blue">
                            <Users size={18} />
                        </div>
                        <h3 className="text-base font-bold">Agrupar o Independizar Vendedor</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-ios-subtext transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {onMakeStandalone && sourceAgent && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                        <div className="flex items-start gap-2">
                            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
                                <UserMinus size={15} />
                            </div>
                            <div className="space-y-0.5 flex-1 text-left">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                    ¿Dejar independiente sin grupo?
                                </span>
                                <p className="text-[11px] text-ios-subtext leading-snug">
                                    Convierte a <strong>{sourceAgent}</strong> en su propio vendedor directo e independiente, desvinculando cualquier alias previo.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onMakeStandalone(sourceAgent)}
                            className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                            <UserMinus size={14} />
                            Convertir en Vendedor Independiente (Sin Grupo)
                        </button>
                    </div>
                )}

                <div className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                        <label className="font-bold text-ios-subtext uppercase text-[10px]">Agente del archivo</label>
                        <select
                            value={sourceAgent}
                            onChange={e => setSourceAgent(e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2 font-bold outline-none border border-black/5 dark:border-white/5"
                        >
                            {allAgents.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-bold text-ios-subtext uppercase text-[10px]">Asignar / Agrupar a</label>
                        <div className="space-y-2">
                            <select
                                value={targetSeller}
                                onChange={e => {
                                    setTargetSeller(e.target.value);
                                    if (e.target.value) setCustomTarget('');
                                }}
                                className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2 font-bold outline-none border border-black/5 dark:border-white/5"
                            >
                                <option value="">-- Seleccionar vendedor existente --</option>
                                {allSellers.map(s => (
                                    <option key={String(s.id)} value={s.name}>{s.name}</option>
                                ))}
                            </select>

                            <div className="flex items-center gap-2">
                                <div className="h-px bg-black/10 dark:bg-white/10 flex-1"></div>
                                <span className="text-[10px] text-ios-subtext uppercase font-bold">o nuevo</span>
                                <div className="h-px bg-black/10 dark:bg-white/10 flex-1"></div>
                            </div>

                            <input
                                type="text"
                                placeholder="Escribir nombre de nuevo vendedor..."
                                value={customTarget}
                                onChange={e => {
                                    setCustomTarget(e.target.value.toUpperCase());
                                    if (e.target.value) setTargetSeller('');
                                }}
                                className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2 font-bold outline-none border border-black/5 dark:border-white/5 placeholder:font-normal"
                            />
                        </div>
                    </div>

                    <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={saveAlias}
                            onChange={e => setSaveAlias(e.target.checked)}
                            className="rounded accent-ios-blue mt-0.5 cursor-pointer"
                        />
                        <span className="text-[11px] text-ios-subtext leading-snug">
                            <strong>Guardar regla permanente:</strong> asociar siempre automáticamente <em>"{sourceAgent}"</em> a este vendedor en futuras importaciones.
                        </span>
                    </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-ios-subtext hover:bg-black/5"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!targetSeller && !customTarget.trim()}
                        onClick={onConfirm}
                        className="px-5 py-2 bg-ios-blue text-white rounded-xl text-xs font-bold shadow-md shadow-ios-blue/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Confirmar Agrupación
                    </button>
                </div>
            </div>
        </div>
    );
};
