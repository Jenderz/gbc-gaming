import React from 'react';
import { UserPlus, Percent, Building2, Trash2, Loader2 } from 'lucide-react';
import { VendorConfig, ImportSession } from './types';
import { Seller } from '../../services/apiService';

interface ResolutionStepProps {
    missingVendors: VendorConfig[];
    setMissingVendors: React.Dispatch<React.SetStateAction<VendorConfig[]>>;
    allSellers: Seller[];
    session: ImportSession | null;
    bulkCommission: number;
    setBulkCommission: (val: number) => void;
    bulkParticipation: number;
    setBulkParticipation: (val: number) => void;
    onApplyBulkPercentages: (comm: number, part: number) => void;
    onRemoveMissingVendor: (index: number) => void;
    onBack: () => void;
    onSubmit: () => void;
    loading: boolean;
}

export const ResolutionStep: React.FC<ResolutionStepProps> = ({
    missingVendors,
    setMissingVendors,
    allSellers,
    session,
    bulkCommission,
    setBulkCommission,
    bulkParticipation,
    setBulkParticipation,
    onApplyBulkPercentages,
    onRemoveMissingVendor,
    onBack,
    onSubmit,
    loading
}) => {
    return (
        <div className="animate-fade-in space-y-6">
            <div className="text-center space-y-2 mb-6">
                <div className="w-16 h-16 rounded-full bg-ios-blue/10 text-ios-blue flex items-center justify-center mx-auto">
                    <UserPlus size={32} />
                </div>
                <h3 className="text-xl font-bold">Configuración de Porcentajes por Vendedor / Grupo</h3>
                <p className="text-xs text-ios-subtext">
                    Configura los porcentajes para los {missingVendors.length} vendedores o grupos detectados en el archivo que no tienen este producto/moneda configurado.
                </p>
            </div>

            {/* Panel de Asignación Rápida Masiva */}
            <div className="glass-panel p-4 rounded-2xl border border-ios-blue/20 bg-ios-blue/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-ios-blue">
                    <div className="p-2 rounded-xl bg-ios-blue/10">
                        <Percent size={18} />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold leading-tight">Asignación Masiva de Porcentajes</h4>
                        <p className="text-[10px] text-ios-subtext">
                            Aplica comisión y participación a todos los {missingVendors.length} vendedores/grupos faltantes
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-1.5 border border-black/5 dark:border-white/5">
                        <span className="text-[10px] font-bold text-ios-subtext uppercase">Venta:</span>
                        <input
                            type="number"
                            value={bulkCommission}
                            onChange={e => setBulkCommission(Number(e.target.value))}
                            className="w-12 bg-transparent text-xs font-black text-right focus:outline-none"
                            placeholder="0"
                        />
                        <span className="text-xs font-bold text-ios-subtext">%</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-1.5 border border-black/5 dark:border-white/5">
                        <span className="text-[10px] font-bold text-ios-subtext uppercase">Part:</span>
                        <input
                            type="number"
                            value={bulkParticipation}
                            onChange={e => setBulkParticipation(Number(e.target.value))}
                            className="w-12 bg-transparent text-xs font-black text-right focus:outline-none"
                            placeholder="0"
                        />
                        <span className="text-xs font-bold text-ios-subtext">%</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => onApplyBulkPercentages(bulkCommission, bulkParticipation)}
                        className="px-4 py-2 bg-ios-blue text-white rounded-xl text-xs font-bold shadow-md shadow-ios-blue/20 hover:opacity-90 active:scale-95 transition-all whitespace-nowrap"
                    >
                        Aplicar a Todos
                    </button>
                </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar pr-1">
                {missingVendors.map((v, i) => {
                    const mappedSeller = v.mappedSellerId ? allSellers.find(s => Number(s.id) === v.mappedSellerId) : null;
                    const mappedProduct = mappedSeller && session
                        ? mappedSeller.products.find(p => String(p.id) === `p-${session.productName.toLowerCase().replace(/\s/g, '-')}` || p.name.toUpperCase() === session.productName.toUpperCase())
                        : null;
                    const mappedCurrency = mappedProduct && session
                        ? mappedProduct.currencies.find(c => String(c.id) === String(session.currency) || c.name.toUpperCase() === session.currency.toUpperCase())
                        : null;
                    const needsPercentages = !v.mappedSellerId || !mappedProduct || !mappedCurrency;
                    const associatedCount = session
                        ? session.rows.filter(r => r.vendorName.trim().toUpperCase() === v.name.trim().toUpperCase()).length
                        : 0;

                    return (
                        <div key={i} className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-ios-red animate-pulse"></div>
                                <span className="font-bold text-sm truncate flex-1">{v.name}</span>
                                {associatedCount > 0 && (
                                    <span className="text-[10px] text-ios-subtext font-semibold px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-md flex items-center gap-1">
                                        <Building2 size={11} /> {associatedCount} taquillas
                                    </span>
                                )}

                                {!v.isExisting ? (
                                    <select
                                        value={v.mappedSellerId || ''}
                                        onChange={e => {
                                            const copy = [...missingVendors];
                                            copy[i].mappedSellerId = e.target.value ? Number(e.target.value) : null;
                                            setMissingVendors(copy);
                                        }}
                                        className="bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-ios-blue outline-none max-w-[200px]"
                                    >
                                        <option value="">Crear como nuevo Grupo (Requiere %)</option>
                                        {allSellers.map(s => (
                                            <option key={String(s.id)} value={Number(s.id)}>
                                                Asignar al Grupo {s.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-[10px] text-ios-blue font-bold px-3 py-1 bg-ios-blue/10 rounded-full">
                                        Grupo existente (Requiere % para Moneda/Producto)
                                    </span>
                                )}
                                <button
                                    onClick={() => onRemoveMissingVendor(i)}
                                    className="p-1.5 text-ios-red/70 hover:text-ios-red hover:bg-ios-red/10 rounded-xl transition-colors shrink-0"
                                    title="Omitir este vendedor de la importación"
                                    type="button"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {needsPercentages && (
                                <>
                                    {v.products && v.products.length > 0 ? (
                                        <div className="space-y-2 mt-1">
                                            <span className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">
                                                Modalidades / Productos a configurar:
                                            </span>
                                            <div className="grid grid-cols-1 gap-2">
                                                {v.products.map((p, pIdx) => (
                                                    <div
                                                        key={pIdx}
                                                        className="bg-black/5 dark:bg-white/5 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-black/5 dark:border-white/5"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-ios-blue">{p.productName}</span>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-ios-blue/10 text-ios-blue font-semibold">
                                                                {p.currency}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] font-bold text-ios-subtext uppercase">Venta:</span>
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="number"
                                                                        value={p.commissionPct}
                                                                        onChange={e => {
                                                                            const copy = [...missingVendors];
                                                                            if (copy[i].products) {
                                                                                copy[i].products![pIdx].commissionPct = Number(e.target.value);
                                                                            }
                                                                            setMissingVendors(copy);
                                                                        }}
                                                                        className="w-16 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-black text-right focus:ring-1 focus:ring-ios-blue outline-none"
                                                                    />
                                                                    <span className="text-[10px] font-bold text-ios-subtext ml-1">%</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] font-bold text-ios-subtext uppercase">Part:</span>
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="number"
                                                                        value={p.partPct}
                                                                        onChange={e => {
                                                                            const copy = [...missingVendors];
                                                                            if (copy[i].products) {
                                                                                copy[i].products![pIdx].partPct = Number(e.target.value);
                                                                            }
                                                                            setMissingVendors(copy);
                                                                        }}
                                                                        className="w-16 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-black text-right focus:ring-1 focus:ring-ios-blue outline-none"
                                                                    />
                                                                    <span className="text-[10px] font-bold text-ios-subtext ml-1">%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-ios-subtext uppercase">Venta (%)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={v.commissionPct}
                                                        onChange={e => {
                                                            const copy = [...missingVendors];
                                                            copy[i].commissionPct = Number(e.target.value);
                                                            setMissingVendors(copy);
                                                        }}
                                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-black focus:ring-1 focus:ring-ios-blue outline-none"
                                                    />
                                                    <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" />
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-ios-subtext uppercase">Neto/Part (%)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={v.partPct}
                                                        onChange={e => {
                                                            const copy = [...missingVendors];
                                                            copy[i].partPct = Number(e.target.value);
                                                            setMissingVendors(copy);
                                                        }}
                                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-black focus:ring-1 focus:ring-ios-blue outline-none"
                                                    />
                                                    <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {v.mappedSellerId && !needsPercentages && (
                                <div className="text-[10px] text-ios-blue font-bold px-2">
                                    Se usará este vendedor y se guardará la regla de autocompletado para futuras importaciones. Usará sus porcentajes actuales.
                                </div>
                            )}
                            {v.mappedSellerId && needsPercentages && (
                                <div className="text-[10px] text-ios-blue font-bold px-2">
                                    Este vendedor no tiene los porcentajes para estos productos. Por favor configúralos arriba.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end gap-3 pt-6">
                <button onClick={onBack} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">
                    Atrás
                </button>
                <button
                    onClick={onSubmit}
                    disabled={loading}
                    className="px-10 py-3 bg-ios-blue text-white rounded-2xl font-bold shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                    {loading ? 'Importando...' : 'Crear y Finalizar Importación'}
                </button>
            </div>
        </div>
    );
};
