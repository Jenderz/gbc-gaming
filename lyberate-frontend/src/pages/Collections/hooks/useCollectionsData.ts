import { useState, useEffect, useCallback } from 'react';
import { getPayments, getSellers, getSales, Payment, Seller, Sale } from '../../../services/apiService';

interface ApiOverrides {
    getSellers?: () => Promise<Seller[]>;
    getSales?: () => Promise<Sale[]>;
    getPayments?: () => Promise<Payment[]>;
}

export const useCollectionsData = (apiOverrides?: ApiOverrides) => {
    const _getSellers = apiOverrides?.getSellers || getSellers;
    const _getSales = apiOverrides?.getSales || getSales;
    const _getPayments = apiOverrides?.getPayments || getPayments;

    const [payments, setPayments] = useState<Payment[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [p, s, sl] = await Promise.all([_getPayments(), _getSales(), _getSellers()]);

            const enrichedPayments = p.map(payment => {
                const mappedSeller = sl.find(seller => String(seller.id) === String(payment.sellerId));
                return {
                    ...payment,
                    vendorName: mappedSeller ? mappedSeller.name : payment.vendorName
                };
            });

            setPayments(enrichedPayments);
            setSales(s);
            setSellers(sl);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return {
        payments,
        sellers,
        sales,
        isLoading,
        refreshData,
    };
};
