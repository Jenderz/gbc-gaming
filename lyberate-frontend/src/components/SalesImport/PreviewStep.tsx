import React from 'react';
import {
    Package,
    Coins,
    Calendar,
    Users,
    UserCheck,
    Trash2,
    CheckCircle2,
    Loader2,
    UserMinus
} from 'lucide-react';
import { ImportSession } from './types';
import { Seller } from '../../services/apiService';
import { roundFinance } from '../../utils/finance';

interface PreviewStepProps {
    session: ImportSession;
    setSession: React.Dispatch<React.SetStateAction<ImportSession | null>>;
    products: string[];
    currencies: string[];
    allSellers: Seller[];
    selectedRowIndices: number[];
    setSelectedRowIndices: React.Dispatch<React.SetStateAction<number[]>>;
    bulkTargetSeller: string;
    setBulkTargetSeller: (target: string) => void;
    bulkSaveAlias: boolean;
    setBulkSaveAlias: (save: boolean) => void;
    onApplyManualGroup: (targetSellerName: string, indicesToUpdate: number[], saveAlias: boolean) => void;
    onBulkMakeStandalone?: (indices: number[]) => void;
    onOpenGroupingModal: (vendorName?: string) => void;
    onDeleteRow: (index: number) => void;
    onCancel: () => void;
    onValidateAndImport: () => void;
    loading: boolean;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
    session,
    setSession,
    products,
    currencies,
    allSellers,
    selectedRowIndices,
    setSelectedRowIndices,
    bulkTargetSeller,
    setBulkTargetSeller,
    bulkSaveAlias,
    setBulkSaveAlias,
    onApplyManualGroup,
    onBulkMakeStandalone,
    onOpenGroupingModal,
    onDeleteRow,
    onCancel,
    onValidateAndImport,
    loading
}) => {
    return (
        <div className="animate-fade-in space-y-6">
            {/* Cabecera de Configuración de Sesión */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5">
                        <Package size={12} /> Producto
                    </label>
                    <input
                        list="product-list"
                        placeholder="Escribe o selecciona..."
                        value={session.productName}
                        onChange={(e) => setSession({ ...session, productName: e.target.value.toUpperCase() })}
                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                    />
                    <datalist id="product-list">
                        {products.map(p => <option key={p} value={p} />)}
                    </datalist>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5">
                        <Coins size={12} /> Moneda
                    </label>
                    <input
                        list="currency-list"
                        placeholder="Escribe o selecciona..."
                        value={session.currency}
                        onChange={(e) => setSession({ ...session, currency: e.target.value.toUpperCase() })}
                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                    />
                    <datalist id="currency-list">
                        {currencies.map(c => <option key={c} value={c} />)}
                    </datalist>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5">
                        <Calendar size={12} /> Fecha de Semana
                    </label>
                    <input
                        type="date"
                        value={session.date}
                        onChange={(e) => setSession({ ...session, date: e.target.value })}
                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none"
                    />
                </div>
            </div>

            {/* Resumen de Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Total Filas</p>
                    <p className="text-xl font-black">{session.rows.length}</p>
                </div>
                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Grupos Únicos</p>
                    <p className="text-xl font-black text-ios-blue">
                        {new Set(session.rows.map(r => r.vendorName)).size}
                    </p>
                </div>
                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Ventas Totales</p>
                    <p className="text-xl font-black text-ios-green">
                        {roundFinance(session.rows.reduce((acc, r) => acc + r.sales, 0)).toLocaleString()}
                    </p>
                </div>
                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Premios Totales</p>
                    <p className="text-xl font-black text-ios-red">
                        {roundFinance(session.rows.reduce((acc, r) => acc + r.prizes, 0)).toLocaleString()}
                    </p>
                </div>
                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Importe Neto</p>
                    <p className="text-xl font-black">
                        {roundFinance(session.rows.reduce((acc, r) => acc + (r.sales - r.prizes), 0)).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Barra de Herramientas de Agrupación Manual cuando hay filas seleccionadas */}
            {selectedRowIndices.length > 0 && (
                <div className="glass-panel p-4 rounded-2xl border border-ios-blue/30 bg-ios-blue/5 flex flex-col md:flex-row items-center justify-between gap-3 animate-fade-in shadow-lg shadow-ios-blue/5">
                    <div className="flex items-center gap-2.5 text-ios-blue">
                        <div className="p-2 rounded-xl bg-ios-blue/10">
                            <Users size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-bold leading-tight">
                                {selectedRowIndices.length} {selectedRowIndices.length === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
                            </div>
                            <div className="text-[10px] text-ios-subtext">
                                Agrupar bajo un solo vendedor
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                        <div className="relative flex-1 md:w-56">
                            <input
                                list="grouping-sellers-list"
                                type="text"
                                placeholder="Vendedor destino..."
                                value={bulkTargetSeller}
                                onChange={e => setBulkTargetSeller(e.target.value.toUpperCase())}
                                className="w-full bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-ios-blue outline-none"
                            />
                            <datalist id="grouping-sellers-list">
                                {allSellers.map(s => <option key={String(s.id)} value={s.name} />)}
                            </datalist>
                        </div>

                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-ios-subtext cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={bulkSaveAlias}
                                onChange={e => setBulkSaveAlias(e.target.checked)}
                                className="rounded accent-ios-blue text-xs cursor-pointer"
                            />
                            Recordar alias
                        </label>

                        <button
                            type="button"
                            disabled={!bulkTargetSeller.trim()}
                            onClick={() => onApplyManualGroup(bulkTargetSeller, selectedRowIndices, bulkSaveAlias)}
                            className="px-4 py-1.5 bg-ios-blue text-white rounded-xl text-xs font-bold shadow-md shadow-ios-blue/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Agrupar Selección
                        </button>

                        {onBulkMakeStandalone && (
                            <button
                                type="button"
                                onClick={() => onBulkMakeStandalone(selectedRowIndices)}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                                title="Convertir las filas seleccionadas en vendedores independientes (sin grupo)"
                            >
                                <UserMinus size={13} />
                                Dejar Sin Grupo
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setSelectedRowIndices([])}
                            className="px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-ios-subtext transition-colors"
                        >
                            Deseleccionar
                        </button>
                    </div>
                </div>
            )}

            {/* Cabecera de la tabla con acción de Agrupar */}
            <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs font-bold text-ios-subtext uppercase tracking-wider">
                    Detalle de Filas ({session.rows.length})
                </span>
                <button
                    type="button"
                    onClick={() => {
                        const firstVendor = session.rows[0]?.vendorName || '';
                        onOpenGroupingModal(firstVendor);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-ios-blue/10 hover:text-ios-blue text-ios-subtext text-xs font-bold flex items-center gap-1.5 transition-colors border border-black/5 dark:border-white/5"
                >
                    <Users size={13} />
                    Agrupar Vendedor...
                </button>
            </div>

            {/* Tabla de Filas */}
            <div className="glass-panel rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                <div className="overflow-x-auto max-h-72 no-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-white dark:bg-[#1c1c1e] z-10 border-b border-black/5 dark:border-white/5">
                            <tr className="text-ios-subtext font-bold">
                                <th className="px-3 py-3 w-8 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedRowIndices.length === session.rows.length && session.rows.length > 0}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setSelectedRowIndices(session.rows.map((_, idx) => idx));
                                            } else {
                                                setSelectedRowIndices([]);
                                            }
                                        }}
                                        className="rounded accent-ios-blue cursor-pointer"
                                        title="Seleccionar todas"
                                    />
                                </th>
                                <th className="px-4 py-3">Vendedor / Grupo</th>
                                <th className="px-4 py-3">Producto</th>
                                {session.rows.some(r => r.agencyName) && (
                                    <th className="px-4 py-3">Agencia / Taquilla</th>
                                )}
                                <th className="px-4 py-3">Moneda</th>
                                <th className="px-4 py-3 text-right">Ventas</th>
                                <th className="px-4 py-3 text-right">Premios</th>
                                <th className="px-4 py-3 text-right">Importe Neto</th>
                                <th className="px-4 py-3 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {session.rows.map((row, i) => {
                                const rowCurr = row.sourceRow?._currency || session.currency;
                                const isBs = rowCurr === 'BOLIVARES VENEZOLANOS';
                                const isCop = rowCurr === 'PESO COLOMBIANA' || rowCurr === 'PESOS COLOMBIANOS';
                                const rowProd = row.productName || session.productName;
                                const isSelected = selectedRowIndices.includes(i);

                                return (
                                    <tr key={i} className={`transition-colors ${isSelected ? 'bg-ios-blue/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                        <td className="px-3 py-2.5 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setSelectedRowIndices(prev => [...prev, i]);
                                                    } else {
                                                        setSelectedRowIndices(prev => prev.filter(idx => idx !== i));
                                                    }
                                                }}
                                                className="rounded accent-ios-blue cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-ios-blue">{row.vendorName}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenGroupingModal(row.vendorName)}
                                                    className="p-1 rounded-lg text-ios-subtext/50 hover:text-ios-blue hover:bg-ios-blue/10 transition-colors"
                                                    title={`Reasignar o agrupar ${row.vendorName}`}
                                                >
                                                    <UserCheck size={13} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-ios-subtext">
                                                {rowProd}
                                            </span>
                                        </td>
                                        {session.rows.some(r => r.agencyName) && (
                                            <td className="px-4 py-2.5 font-medium text-ios-text">
                                                {row.agencyName || <span className="text-ios-subtext opacity-50">—</span>}
                                            </td>
                                        )}
                                        <td className="px-4 py-2.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                isBs
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    : isCop
                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                        : 'bg-ios-blue/10 text-ios-blue'
                                            }`}>
                                                {isBs ? 'Bs' : isCop ? 'COP' : 'USD'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{row.sales.toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-ios-red">{row.prizes.toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums font-black">{(row.sales - row.prizes).toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenGroupingModal(row.vendorName)}
                                                    className="p-1.5 text-ios-subtext hover:text-ios-blue hover:bg-ios-blue/10 rounded-xl transition-colors"
                                                    title="Agrupar a vendedor"
                                                >
                                                    <Users size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => onDeleteRow(i)} 
                                                    className="p-1.5 text-ios-red/70 hover:text-ios-red hover:bg-ios-red/10 rounded-xl transition-colors"
                                                    title="Eliminar fila"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer con acciones */}
            <div className="flex justify-end gap-3 pt-4">
                <button onClick={onCancel} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">
                    Cancelar
                </button>
                <button
                    onClick={onValidateAndImport}
                    disabled={loading}
                    className="px-8 py-3 bg-ios-blue text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> Validar e Importar</>}
                </button>
            </div>
        </div>
    );
};
