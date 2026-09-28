import React, { useMemo, useState } from 'react';
import { CalendarDays, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Sale } from '../../../services/apiService';

interface VendorWeeksProps {
    sales: Sale[];
}

type ProductGroup = {
    productName: string;
    amount: number;
    count: number;
    totalVendor: number;
};

type CurrencyGroup = {
    currency: string;
    products: ProductGroup[];
    totalSales: number;
    totalVendor: number;
};

type WeekData = {
    weekId: string;
    weekLabel: string;
    startDate: Date;
    currencies: CurrencyGroup[];
};

/** Convierte un weekId tipo "week-2026-03-02" a una fecha de inicio */
function weekIdToDate(weekId: string): Date {
    const datePart = weekId.replace('week-', '');
    return new Date(datePart + 'T00:00:00');
}

/** Genera una etiqueta legible a partir del weekId */
function weekIdToLabel(weekId: string): string {
    const start = weekIdToDate(weekId);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    return `Lun ${fmt(start)} — Dom ${fmt(end)}`;
}

export const VendorWeeks: React.FC<VendorWeeksProps> = ({ sales }) => {
    const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

    const historyData = useMemo(() => {
        if (!sales.length) return [];

        // Agrupar directamente por weekId que viene del backend, sin recalcular períodos
        const weekMap = new Map<string, WeekData>();

        sales.forEach(s => {
            const weekId = s.weekId;
            if (!weekId) return;

            if (!weekMap.has(weekId)) {
                weekMap.set(weekId, {
                    weekId,
                    weekLabel: weekIdToLabel(weekId),
                    startDate: weekIdToDate(weekId),
                    currencies: [],
                });
            }

            const weekData = weekMap.get(weekId)!;

            // Agrupar por moneda
            let currGroup = weekData.currencies.find(c => c.currency === s.currencyName);
            if (!currGroup) {
                currGroup = { currency: s.currencyName, products: [], totalSales: 0, totalVendor: 0 };
                weekData.currencies.push(currGroup);
            }
            currGroup.totalSales += s.amount;
            currGroup.totalVendor += s.totalVendor;

            // Agrupar por producto dentro de la moneda
            const existingProd = currGroup.products.find(p => p.productName === s.productName);
            if (existingProd) {
                existingProd.amount += s.amount;
                existingProd.totalVendor += s.totalVendor;
                existingProd.count += 1;
            } else {
                currGroup.products.push({
                    productName: s.productName,
                    amount: s.amount,
                    totalVendor: s.totalVendor,
                    count: 1,
                });
            }
        });

        // Ordenar monedas alfabéticamente dentro de cada semana
        for (const week of weekMap.values()) {
            week.currencies.sort((a, b) => a.currency.localeCompare(b.currency));
        }

        // Ordenar semanas de más reciente a más antigua
        return Array.from(weekMap.values()).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    }, [sales]);


    return (
        <div className="space-y-4 animate-fade-in pb-8">
            <h2 className="text-lg font-bold">Rendimiento Histórico</h2>

            {historyData.length === 0 ? (
                <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
                        <CalendarDays size={32} className="opacity-50" />
                    </div>
                    <p className="font-bold text-ios-text">No hay historial registrado</p>
                    <p className="text-xs mt-1 max-w-[200px] mx-auto text-balance">Aquí aparecerán tus ventas y ganancias por semana.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {historyData.map(data => {
                        const isExpanded = expandedWeek === data.weekId;

                        return (
                            <div key={data.weekId} className="glass-panel p-0 rounded-2xl overflow-hidden shadow-sm">
                                {/* Week Header (Clickable) */}
                                <button
                                    onClick={() => setExpandedWeek(isExpanded ? null : data.weekId)}
                                    className="w-full text-left p-4 hover:bg-white/10 dark:hover:bg-black/10 transition-colors flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-bold text-sm">{data.weekLabel}</p>
                                        <p className="text-[10px] text-ios-subtext mt-0.5">{data.currencies.length} moneda(s) operada(s)</p>
                                    </div>
                                    <div className="text-ios-subtext">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </button>

                                {/* Week Content (Expanded) */}
                                {isExpanded && (
                                    <div className="p-4 pt-0 space-y-4 animate-fade-in border-t border-black/5 dark:border-white/5">
                                        {data.currencies.map(currGrp => (
                                            <div key={currGrp.currency} className="bg-black/5 dark:bg-white/5 p-3 rounded-xl">
                                                <h3 className="font-bold text-xs uppercase tracking-widest text-ios-blue mb-3">{currGrp.currency}</h3>

                                                {/* Global Currency KPI */}
                                                <div className="flex gap-4 mb-3 pb-3 border-b border-black/5 dark:border-white/5 text-sm">
                                                    <div>
                                                        <span className="text-[10px] text-ios-subtext uppercase font-bold">Venta Bruta</span>
                                                        <p className="font-semibold text-ios-text">{currGrp.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-ios-subtext uppercase font-bold">Mi Ganancia Neta</span>
                                                        <p className="font-semibold text-ios-green">{currGrp.totalVendor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    </div>
                                                </div>

                                                {/* Product Breakdown */}
                                                <div>
                                                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider mb-2 flex items-center gap-1">
                                                        <Package size={11} /> Desglose de Productos
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        {currGrp.products.map(prod => (
                                                            <div key={prod.productName} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-3 py-2 bg-white/60 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                                                                <span className="font-semibold text-ios-text flex items-center gap-2 mb-1 sm:mb-0">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-ios-blue"></span> {prod.productName}
                                                                    <span className="text-[10px] text-ios-subtext font-normal px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded-md">{prod.count} reg.</span>
                                                                </span>
                                                                <div className="flex gap-4 text-ios-subtext">
                                                                    <span>Venta: <strong className="text-ios-text">{prod.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
                                                                    <span>Ganancia: <strong className="text-ios-green">{prod.totalVendor.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
