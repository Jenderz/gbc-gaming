import { useState, useEffect, useCallback } from 'react';
import { getPayments, getSellers, Payment, Seller } from '../../../services/apiService';

export const useTransactionsData = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [p, sl] = await Promise.all([getPayments(), getSellers()]);

            const enrichedPayments = p.map(payment => {
                const mappedSeller = sl.find(seller => String(seller.id) === String(payment.sellerId));
                return {
                    ...payment,
                    vendorName: mappedSeller ? mappedSeller.name : payment.vendorName
                };
            });

            setPayments(enrichedPayments);
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
        isLoading,
        refreshData,
    };
};
