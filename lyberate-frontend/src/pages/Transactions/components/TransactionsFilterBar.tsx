import React from 'react';
import { Seller } from '../../../services/apiService';
import { TransactionsFilters } from '../hooks/useTransactionsFilters';
import { Calendar, Search, Filter, RefreshCcw } from 'lucide-react';

interface TransactionsFilterBarProps {
    filters: TransactionsFilters;
    sellers: Seller[];
    availableMethods: string[];
    availableBanks: string[];
    updateFilter: (key: keyof TransactionsFilters, value: string) => void;
    resetFilters: () => void;
}

export const TransactionsFilterBar: React.FC<TransactionsFilterBarProps> = ({
    filters,
    sellers,
    availableMethods,
    availableBanks,
    updateFilter,
    resetFilters
}) => {
    return (
        <div className="glass-panel p-4 rounded-2xl mb-6 flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2 text-ios-text">
                    <Filter size={16} className="text-ios-blue" />
                    Filtros Avanzados
                </h3>
                <button 
                    onClick={resetFilters}
                    className="text-xs text-ios-subtext hover:text-ios-blue flex items-center gap-1 transition-colors"
                >
                    <RefreshCcw size={12} /> Limpiar Filtros
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Fechas */}
                <div className="space-y-1">
                    <label className="text-xs text-ios-subtext ml-1">Desde</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" size={16} />
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => updateFilter('dateFrom', e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-ios-blue focus:border-transparent outline-none transition-all text-ios-text"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-ios-subtext ml-1">Hasta</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" size={16} />
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => updateFilter('dateTo', e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-ios-blue focus:border-transparent outline-none transition-all text-ios-text"
                        />
                    </div>
                </div>

                {/* Vendedor */}
                <div className="space-y-1">
                    <label className="text-xs text-ios-subtext ml-1">Vendedor</label>
                    <select
                        value={filters.sellerId}
                        onChange={(e) => updateFilter('sellerId', e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-ios-blue focus:border-transparent outline-none transition-all text-ios-text appearance-none"
                    >
                        <option value="">Todos los vendedores</option>
                        {sellers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Método */}
                <div className="space-y-1">
                    <label className="text-xs text-ios-subtext ml-1">Método</label>
                    <select
                        value={filters.method}
                        onChange={(e) => updateFilter('method', e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-ios-blue focus:border-transparent outline-none transition-all text-ios-text appearance-none"
                    >
                        <option value="">Todos los métodos</option>
                        {availableMethods.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {/* Banco */}
                <div className="space-y-1">
                    <label className="text-xs text-ios-subtext ml-1">Banco/Destino</label>
                    <select
                        value={filters.bank}
                        onChange={(e) => updateFilter('bank', e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-ios-blue focus:border-transparent outline-none transition-all text-ios-text appearance-none"
                    >
                        <option value="">Todos los bancos/destinos</option>
                        {availableBanks.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>

                {/* Referencia */}
                <div className="space-y-1">
                    <label className="text-xs text-ios-subtext ml-1">Referencia</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar ref..."
                            value={filters.reference}
                            onChange={(e) => updateFilter('reference', e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-ios-blue focus:border-transparent outline-none transition-all text-ios-text"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
