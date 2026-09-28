import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CurrencyStats, ProductStats } from '../hooks/useCollectionsFilter';

interface Props {
    statsByCurrency: Record<string, CurrencyStats>;
    salesByProduct: Record<string, ProductStats[]>;
}

export const CollectionStatsPanel: React.FC<Props> = ({ statsByCurrency, salesByProduct }) => {
    const currencies = Object.keys(statsByCurrency);
    const [expandedCurrencies, setExpandedCurrencies] = useState<Record<string, boolean>>({});

    const toggleCurrency = (curr: string) => {
        setExpandedCurrencies(prev => ({ ...prev, [curr]: !prev[curr] }));
    };

    return (
        <div className="space-y-8 animate-fade-in pb-8">
            
            {/* Sección de Estadísticas por Moneda */}
            <div>
                <h3 className="text-lg font-bold mb-4 px-1">📊 Estadísticas Financieras por Moneda</h3>
                {currencies.length === 0 ? (
                    <div className="glass-panel p-8 rounded-2xl text-center text-ios-subtext font-bold">
                        No hay movimientos registrados en este periodo.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {currencies.map(currency => {
                            const stats = statsByCurrency[currency];
                            return (
                                <div key={currency} className="glass-panel p-5 rounded-2xl">
                                    <h4 className="text-sm font-bold text-ios-text uppercase tracking-wider mb-4 pb-2 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-ios-blue"></span>
                                        Moneda: {currency}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border-l-4 border-l-ios-blue">
                                            <p className="text-ios-subtext text-[10px] font-bold uppercase tracking-wider mb-1">Recaudado (Aprobado)</p>
                                            <h3 className="text-lg font-bold text-ios-text">{stats.totalCollected.toFixed(2)}</h3>
                                        </div>
                                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border-l-4 border-l-orange-500">
                                            <p className="text-ios-subtext text-[10px] font-bold uppercase tracking-wider mb-1">Por Aprobar (Pendiente)</p>
                                            <h3 className="text-lg font-bold text-ios-text">{stats.totalPending.toFixed(2)}</h3>
                                        </div>
                                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border-l-4 border-l-amber-500">
                                            <p className="text-ios-subtext text-[10px] font-bold uppercase tracking-wider mb-1">Saldo a Favor Vendedor</p>
                                            <h3 className="text-lg font-bold text-amber-500">{stats.totalCredits.toFixed(2)}</h3>
                                        </div>
                                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border-l-4 border-l-blue-500">
                                            <p className="text-ios-subtext text-[10px] font-bold uppercase tracking-wider mb-1">Pagos Emitidos (Retiros)</p>
                                            <h3 className="text-lg font-bold text-blue-500">{stats.totalPayouts.toFixed(2)}</h3>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sección de Totales por Producto */}
            <div>
                <h3 className="text-lg font-bold mb-4 px-1">📈 Resumen de Ventas por Producto</h3>
                {Object.keys(salesByProduct).length === 0 ? (
                    <div className="glass-panel p-8 rounded-2xl text-center text-ios-subtext font-bold">
                        No hay ventas en este periodo.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(salesByProduct).map(([currency, products]) => {
                            const isExpanded = expandedCurrencies[currency] !== false; // Abierto por defecto
                            return (
                                <div key={currency} className="glass-panel rounded-2xl overflow-hidden">
                                    <div 
                                        className="bg-black/5 dark:bg-white/5 px-5 py-4 cursor-pointer flex justify-between items-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                        onClick={() => toggleCurrency(currency)}
                                    >
                                        <h4 className="font-bold text-ios-text uppercase tracking-wider flex items-center gap-2 text-sm">
                                            <span className="w-2 h-2 rounded-full bg-ios-blue"></span>
                                            Moneda: {currency}
                                        </h4>
                                        {isExpanded ? <ChevronDown size={20} className="text-ios-subtext" /> : <ChevronRight size={20} className="text-ios-subtext" />}
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-black/[0.02] dark:bg-white/[0.02] text-ios-subtext text-xs uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-5 py-3 text-left font-semibold">Producto</th>
                                                        <th className="px-5 py-3 text-right font-semibold">Venta Total</th>
                                                        <th className="px-5 py-3 text-right font-semibold">Premios Generados</th>
                                                        <th className="px-5 py-3 text-right font-semibold">Neto para Banca</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                    {products.map((prod, idx) => (
                                                        <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                                            <td className="px-5 py-4 font-bold flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-xs">🎲</div>
                                                                {prod.productName}
                                                            </td>
                                                            <td className="px-5 py-4 text-right font-semibold text-ios-text">{prod.totalSales.toFixed(2)}</td>
                                                            <td className="px-5 py-4 text-right font-semibold text-red-500">-{prod.totalPrize.toFixed(2)}</td>
                                                            <td className={`px-5 py-4 text-right font-black ${prod.totalBank > 0 ? 'text-ios-green' : prod.totalBank < 0 ? 'text-red-500' : 'text-ios-text'}`}>
                                                                {prod.totalBank.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
};
