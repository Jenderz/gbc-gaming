import { useState, useMemo } from 'react';
import { Payment } from '../../../services/apiService';

export interface TransactionsFilters {
    dateFrom: string;
    dateTo: string;
    sellerId: string;
    method: string;
    bank: string;
    reference: string;
}

export const useTransactionsFilters = (payments: Payment[]) => {
    const [filters, setFilters] = useState<TransactionsFilters>({
        dateFrom: '',
        dateTo: '',
        sellerId: '',
        method: '',
        bank: '',
        reference: '',
    });

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            // Solo procesamos pagos aprobados o pendientes que son entradas (type: payment o credit, pero credit es salida de tickets. Mejor solo recaudaciones 'payment')
            if (p.type === 'payout') return false; // Excluimos retiros

            const matchSeller = !filters.sellerId || String(p.sellerId) === filters.sellerId;
            const matchMethod = !filters.method || p.method === filters.method;
            const matchBank = !filters.bank || p.bank === filters.bank;
            const matchRef = !filters.reference || (p.reference && p.reference.toLowerCase().includes(filters.reference.toLowerCase()));
            
            let matchDate = true;
            if (filters.dateFrom || filters.dateTo) {
                const pDate = new Date(p.date + 'T00:00:00');
                if (filters.dateFrom) {
                    const from = new Date(filters.dateFrom + 'T00:00:00');
                    if (pDate < from) matchDate = false;
                }
                if (filters.dateTo) {
                    const to = new Date(filters.dateTo + 'T23:59:59');
                    if (pDate > to) matchDate = false;
                }
            }

            return matchSeller && matchMethod && matchBank && matchRef && matchDate;
        });
    }, [payments, filters]);

    // Estadísticas agrupadas por Moneda
    const stats = useMemo(() => {
        // Estructura: { [moneda]: { total: 0, byMethod: { [metodo]: 0 }, byBank: { [banco]: 0 } } }
        const result: Record<string, { total: number, byMethod: Record<string, number>, byBank: Record<string, number> }> = {};

        filteredPayments.forEach(p => {
            // Solo sumamos los aprobados para las estadísticas reales de dinero ingresado
            if (p.status !== 'approved') return;

            const currency = p.currency || 'USD';
            if (!result[currency]) {
                result[currency] = { total: 0, byMethod: {}, byBank: {} };
            }

            result[currency].total += p.amount;

            const method = p.method || 'Otro';
            result[currency].byMethod[method] = (result[currency].byMethod[method] || 0) + p.amount;

            const bank = p.bank || 'No especificado';
            result[currency].byBank[bank] = (result[currency].byBank[bank] || 0) + p.amount;
        });

        return result;
    }, [filteredPayments]);

    const updateFilter = (key: keyof TransactionsFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            dateFrom: '',
            dateTo: '',
            sellerId: '',
            method: '',
            bank: '',
            reference: '',
        });
    };

    return {
        filters,
        filteredPayments,
        stats,
        updateFilter,
        resetFilters
    };
};
