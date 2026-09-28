import { useMemo } from 'react';
import { Payment, Sale, Seller } from '../../../services/apiService';
import { useWeeklyFilter } from '../../../hooks/useWeeklyFilter';

// Re-export para compatibilidad con componentes que importan FilterPreset de aquí
export type { FilterPreset } from '../../../hooks/useWeeklyFilter';

export interface CurrencyStats {
    totalCollected: number;
    totalPending: number;
    totalCredits: number;
    totalPayouts: number;
}

export interface ProductStats {
    productName: string;
    totalSales: number;
    totalPrize: number;
    totalBank: number;
}

export const useCollectionsFilter = (payments: Payment[], sales: Sale[] = [], sellers: Seller[] = []) => {
    const weeklyFilter = useWeeklyFilter();
    const { filterRange, searchQuery } = weeklyFilter;

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            if (filterRange) {
                const d = new Date(p.date + 'T12:00:00');
                if (d < filterRange.start || d > filterRange.end) return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!p.vendorName.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [payments, filterRange, searchQuery]);

    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            if (filterRange) {
                const d = new Date(s.date + 'T12:00:00');
                if (d < filterRange.start || d > filterRange.end) return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!s.sellerName.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [sales, filterRange, searchQuery]);

    const pendingPayments = useMemo(() => filteredPayments.filter(p => p.status === 'pending'), [filteredPayments]);

    const statsByCurrency = useMemo(() => {
        const stats: Record<string, CurrencyStats> = {};
        
        const initCurrency = (currency: string) => {
            if (!stats[currency]) {
                stats[currency] = { totalCollected: 0, totalPending: 0, totalCredits: 0, totalPayouts: 0 };
            }
        };

        // Inicializar con las listadas en ventas del periodo (por si acaso)
        filteredSales.forEach(s => initCurrency(s.currencyName || 'USD'));

        // Y también con todas las monedas de todos los vendedores 
        // para que aparezcan aunque estén en 0 esta semana
        sellers.forEach(seller => {
            seller.products.forEach(p => {
                p.currencies.forEach(c => initCurrency(c.name));
            });
        });
        
        filteredPayments.forEach(p => {
            const currency = p.currency;
            initCurrency(currency);
            
            if (p.status === 'pending') {
                if (p.type !== 'credit') stats[currency].totalPending += p.amount;
            } else if (p.status === 'approved') {
                if (p.type === 'credit') stats[currency].totalCredits += p.amount;
                else if (p.type === 'payout') stats[currency].totalPayouts += p.amount;
                else stats[currency].totalCollected += p.amount;
            }
        });
        
        // Retornar ordenado alfabéticamente para mantener consistencia
        const sortedStats: Record<string, CurrencyStats> = {};
        Object.keys(stats).sort().forEach(k => {
            sortedStats[k] = stats[k];
        });
        
        return sortedStats;
    }, [filteredPayments, filteredSales, sellers]);

    const salesByProduct = useMemo(() => {
        const stats: Record<string, Record<string, ProductStats>> = {};
        
        filteredSales.forEach(s => {
            const prod = s.productName || 'Banca';
            const curr = s.currencyName || 'USD';
            if (!stats[curr]) {
                stats[curr] = {};
            }
            if (!stats[curr][prod]) {
                stats[curr][prod] = { productName: prod, totalSales: 0, totalPrize: 0, totalBank: 0 };
            }
            stats[curr][prod].totalSales += s.amount || 0; // Usando amount temporalemente si es la venta bruta
            stats[curr][prod].totalPrize += s.prize || 0;
            stats[curr][prod].totalBank += s.totalBank || 0;
        });
        
        const finalStats: Record<string, ProductStats[]> = {};
        Object.keys(stats).sort().forEach(curr => finalStats[curr] = Object.values(stats[curr]));
        return finalStats;
    }, [filteredSales]);

    return {
        ...weeklyFilter,
        filteredPayments,
        pendingPayments,
        statsByCurrency,
        salesByProduct
    };
};
