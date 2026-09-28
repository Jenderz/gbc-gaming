import React from 'react';
import { Wallet } from 'lucide-react';

interface TransactionsStatsProps {
    stats: Record<string, { total: number, byMethod: Record<string, number>, byBank: Record<string, number> }>;
}

export const TransactionsStats: React.FC<TransactionsStatsProps> = ({ stats }) => {
    const currencies = Object.keys(stats);

    if (currencies.length === 0) {
        return (
            <div className="glass-panel p-6 rounded-2xl flex items-center justify-center text-ios-subtext">
                No hay estadísticas para los filtros seleccionados
            </div>
        );
    }

    return (
        <div className="flex gap-4 flex-wrap">
            {currencies.map(currency => {
                const data = stats[currency];

                return (
                    <div key={currency} className="space-y-4 animate-fade-in">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-ios-blue/10 flex items-center justify-center text-ios-blue">
                                {currency === 'USD' ? '$' : 'Bs'}
                            </div>
                            Resumen en {currency}
                        </h3>
                            {/* Total Card */}
                            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-ios-blue relative overflow-hidden group min-w-[280px]">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <Wallet size={48} />
                                </div>
                                <p className="text-ios-subtext text-sm font-medium mb-1">Total Recaudado</p>
                                <p className="text-3xl font-bold text-ios-text">
                                    {data.total.toLocaleString('es-VE', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-ios-subtext">{currency}</span>
                                </p>
                            </div>
                    </div>
                );
            })}
        </div>
    );
};
