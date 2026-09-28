/**
 * useApiScope — returns the correct API functions depending on whether
 * the component is inside an <AgencyProvider> or not.
 *
 * Usage:
 *   const api = useApiScope();
 *   const sellers = await api.getSellers();
 */
import { useAgencyMode } from '../context/AgencyContext';

import {
    // ── Admin (global) endpoints ────────────────────────────
    getSellers, addSeller, updateSeller, deleteSeller,
    getSales, addSale, deleteSale, updateSale,
    getPayments, addPayment, updatePayment, updatePaymentStatus,
    // ── Agency-scoped endpoints ─────────────────────────────
    getAgencySellers, addAgencySeller, updateAgencySeller, deleteAgencySeller,
    getAgencySales, addAgencySale, deleteAgencySale, updateAgencySale,
    getAgencyPayments, addAgencyPayment, updateAgencyPayment, updateAgencyPaymentStatus,
} from '../services/apiService';

export function useApiScope() {
    const isAgency = useAgencyMode();

    return {
        // Sellers
        getSellers:   isAgency ? getAgencySellers   : getSellers,
        addSeller:    isAgency ? addAgencySeller     : addSeller,
        updateSeller: isAgency ? updateAgencySeller  : updateSeller,
        deleteSeller: isAgency ? deleteAgencySeller  : deleteSeller,

        // Sales
        getSales:       isAgency ? (() => getAgencySales())   : getSales,
        addSale:        isAgency ? addAgencySale              : addSale,
        deleteSale:     isAgency ? deleteAgencySale           : deleteSale,
        updateSale:     isAgency ? updateAgencySale           : updateSale,

        // Payments
        getPayments:         isAgency ? (() => getAgencyPayments())  : getPayments,
        addPayment:          isAgency ? addAgencyPayment             : addPayment,
        updatePayment:       isAgency ? updateAgencyPayment          : updatePayment,
        updatePaymentStatus: isAgency ? updateAgencyPaymentStatus    : updatePaymentStatus,

        // Flag
        isAgencyMode: isAgency,
    };
}
