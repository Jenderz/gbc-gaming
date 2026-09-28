import React, { useMemo } from 'react';
import { useTransactionsData } from './hooks/useTransactionsData';
import { useTransactionsFilters } from './hooks/useTransactionsFilters';
import { TransactionsStats } from './components/TransactionsStats';
import { TransactionsFilterBar } from './components/TransactionsFilterBar';
import { TransactionsTable } from './components/TransactionsTable';
import { Activity } from 'lucide-react';

export const Transactions: React.FC = () => {
    const { payments, sellers, isLoading } = useTransactionsData();
    const { filters, filteredPayments, stats, updateFilter, resetFilters } = useTransactionsFilters(payments);

    const availableMethods = useMemo(() => {
        return Array.from(new Set(payments.map(p => p.method))).filter(Boolean).sort();
    }, [payments]);

    const availableBanks = useMemo(() => {
        return Array.from(new Set(payments.map(p => p.bank))).filter(Boolean).sort();
    }, [payments]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-ios-text tracking-tight">
                        <Activity className="text-ios-blue" size={28} />
                        Transacciones y Recaudaciones
                    </h2>
                    <p className="text-ios-subtext">Analiza el flujo de dinero, filtra por banco, método y vendedor.</p>
                </div>
            </div>

            {/* Filtros */}
            <TransactionsFilterBar 
                filters={filters} 
                sellers={sellers} 
                availableMethods={availableMethods}
                availableBanks={availableBanks}
                updateFilter={updateFilter} 
                resetFilters={resetFilters} 
            />

            {/* Estadísticas */}
            <TransactionsStats stats={stats} />

            {/* Tabla */}
            <TransactionsTable data={filteredPayments} isLoading={isLoading} />
        </div>
    );
};
