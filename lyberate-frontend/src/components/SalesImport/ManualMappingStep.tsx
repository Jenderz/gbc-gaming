import React from 'react';
import { FileUp, CheckCircle2 } from 'lucide-react';
import { ManualRawData } from './types';

interface ManualMappingStepProps {
    manualRawData: ManualRawData;
    manualVendorCol: number;
    setManualVendorCol: (col: number) => void;
    manualSalesCol: number;
    setManualSalesCol: (col: number) => void;
    manualPrizesCol: number;
    setManualPrizesCol: (col: number) => void;
    manualSelectMode: 'vendor' | 'sales' | 'prizes';
    setManualSelectMode: (mode: 'vendor' | 'sales' | 'prizes') => void;
    manualStartRow: number;
    setManualStartRow: (row: number) => void;
    onCancel: () => void;
    onConfirm: () => void;
}

export const ManualMappingStep: React.FC<ManualMappingStepProps> = ({
    manualRawData,
    manualVendorCol,
    setManualVendorCol,
    manualSalesCol,
    setManualSalesCol,
    manualPrizesCol,
    setManualPrizesCol,
    manualSelectMode,
    setManualSelectMode,
    manualStartRow,
    setManualStartRow,
    onCancel,
    onConfirm
}) => {
    const allRows = manualRawData.data;
    const maxCols = Math.min(
        Math.max(...allRows.slice(0, 20).map((r: any[]) => Array.isArray(r) ? r.length : 0), 1),
        15
    );

    const modeColors = {
        vendor: {
            active: 'bg-ios-blue text-white border-transparent shadow-sm',
            col: 'bg-ios-blue/10 text-ios-blue font-bold',
            hover: 'hover:bg-ios-blue/5 dark:hover:bg-ios-blue/10'
        },
        sales: {
            active: 'bg-emerald-500 text-white border-transparent shadow-sm',
            col: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold',
            hover: 'hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10'
        },
        prizes: {
            active: 'bg-ios-red text-white border-transparent shadow-sm',
            col: 'bg-ios-red/10 text-ios-red font-bold',
            hover: 'hover:bg-ios-red/5 dark:hover:bg-ios-red/10'
        }
    };

    const modeLabels: Record<'vendor' | 'sales' | 'prizes', string> = {
        vendor: '👤 Nombre',
        sales: '💰 Ventas',
        prizes: '🏆 Premios (opcional)'
    };

    const getColStyle = (ci: number) => {
        if (ci === manualVendorCol) return modeColors.vendor.col;
        if (ci === manualSalesCol) return modeColors.sales.col;
        if (ci === manualPrizesCol) return modeColors.prizes.col;
        return 'text-ios-subtext';
    };

    const handleColClick = (ci: number) => {
        if (manualSelectMode === 'vendor') setManualVendorCol(ci);
        else if (manualSelectMode === 'sales') setManualSalesCol(ci);
        else setManualPrizesCol(ci);
    };

    return (
        <div className="animate-fade-in space-y-5">
            {/* Cabecera informativa */}
            <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <FileUp size={28} />
                </div>
                <h3 className="text-lg font-bold">Mapeo Manual de Columnas</h3>
                <p className="text-xs text-ios-subtext max-w-sm mx-auto">
                    El formato no pudo detectarse automáticamente. Selecciona el modo y haz clic en una columna para asignarla.
                    <b> Nombre</b> y <b>Ventas</b> son obligatorias.
                </p>
            </div>

            {/* Botones de modo */}
            <div className="flex flex-wrap gap-2 justify-center">
                {(['vendor', 'sales', 'prizes'] as const).map(mode => {
                    const colIdx = mode === 'vendor' ? manualVendorCol : mode === 'sales' ? manualSalesCol : manualPrizesCol;
                    const isActive = manualSelectMode === mode;
                    return (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setManualSelectMode(mode)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                isActive
                                    ? modeColors[mode].active
                                    : 'border-black/10 dark:border-white/10 text-ios-subtext hover:bg-black/5'
                            }`}
                        >
                            {modeLabels[mode]}{colIdx !== -1 ? ` → Col ${colIdx + 1}` : ''}
                        </button>
                    );
                })}
            </div>

            {/* Control de fila de inicio */}
            <div className="flex items-center gap-3 justify-center">
                <span className="text-xs text-ios-subtext font-semibold">Primera fila de datos:</span>
                <input
                    type="number"
                    min={1}
                    max={allRows.length}
                    value={manualStartRow + 1}
                    onChange={e => setManualStartRow(Math.max(0, Number(e.target.value) - 1))}
                    className="w-20 bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-ios-blue outline-none text-center"
                />
                <span className="text-[10px] text-ios-subtext">(filas anteriores se atenúan)</span>
            </div>

            {/* Tabla de datos raw interactiva */}
            <div className="glass-panel rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                <div className="overflow-auto max-h-64 no-scrollbar">
                    <table className="w-full text-left text-xs min-w-max">
                        <thead className="sticky top-0 bg-white dark:bg-[#1c1c1e] z-10 border-b border-black/5 dark:border-white/5">
                            <tr>
                                {Array.from({ length: maxCols }, (_, ci) => (
                                    <th
                                        key={ci}
                                        onClick={() => handleColClick(ci)}
                                        title={`Clic para asignar a: ${modeLabels[manualSelectMode]}`}
                                        className={`px-3 py-2.5 cursor-pointer select-none whitespace-nowrap transition-colors border-r border-black/5 dark:border-white/5 last:border-r-0 ${getColStyle(ci)} ${
                                            ci !== manualVendorCol && ci !== manualSalesCol && ci !== manualPrizesCol
                                                ? modeColors[manualSelectMode].hover
                                                : ''
                                        }`}
                                    >
                                        {ci === manualVendorCol ? '👤 Nombre'
                                         : ci === manualSalesCol ? '💰 Ventas'
                                         : ci === manualPrizesCol ? '🏆 Premios'
                                         : `Col ${ci + 1}`}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {allRows.slice(0, 25).map((row: any[], ri) => (
                                <tr key={ri} className={`transition-colors ${ri < manualStartRow ? 'opacity-30' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    {Array.from({ length: maxCols }, (_, ci) => (
                                        <td
                                            key={ci}
                                            onClick={() => handleColClick(ci)}
                                            className={`px-3 py-1.5 cursor-pointer transition-colors whitespace-nowrap border-r border-black/5 dark:border-white/5 last:border-r-0 ${getColStyle(ci)}`}
                                        >
                                            {String(Array.isArray(row) ? (row[ci] ?? '') : '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-1">
                <button onClick={onCancel} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    disabled={manualVendorCol === -1 || manualSalesCol === -1}
                    className="px-8 py-3 bg-ios-blue text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <CheckCircle2 size={16} /> Confirmar y Previsualizar
                </button>
            </div>
        </div>
    );
};
