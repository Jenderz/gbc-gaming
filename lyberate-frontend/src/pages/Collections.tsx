import { useState } from 'react';
import { X } from 'lucide-react';
import { TicketGenerator } from '../components/TicketGenerator';
import { EditConfirmationModal } from '../components/EditConfirmationModal';
import { Payment } from '../services/apiService';
import { useApiScope } from '../hooks/useApiScope';

// Hooks
import { useCollectionsData } from './Collections/hooks/useCollectionsData';
import { useCollectionsFilter } from './Collections/hooks/useCollectionsFilter';
import { useCollectionForm } from './Collections/hooks/useCollectionForm';

// Components
import { CollectionHeader } from './Collections/components/CollectionHeader';
import { CollectionFilters } from './Collections/components/CollectionFilters';
import { CollectionStatsPanel } from './Collections/components/CollectionStatsPanel';
import { SellerBalanceTable } from './Collections/components/SellerBalanceTable';
import { ApprovalsPanel } from './Collections/components/ApprovalsPanel';
import { PaymentsTable } from './Collections/components/PaymentsTable';
import { PaymentRegistrationModal } from './Collections/components/PaymentRegistrationModal';

export const Collections = () => {
    const api = useApiScope();
    const { payments, sellers, sales, isLoading, error, refreshData } = useCollectionsData({
        getSellers: api.getSellers,
        getSales: api.getSales,
        getPayments: api.getPayments,
    });
    const [selectedTicket, setSelectedTicket] = useState<Payment | null>(null);
    const [activeTab, setActiveTab] = useState<'list' | 'balance' | 'approvals' | 'stats'>('list');
    const [proofLightbox, setProofLightbox] = useState<string | null>(null);

    // Filter Logic
    const filter = useCollectionsFilter(payments, sales, sellers);

    // Form Logic
    const form = useCollectionForm(sellers, sales, payments, refreshData, {
        addPayment: api.addPayment,
        updatePayment: api.updatePayment,
    });

    const handleApprove = async (id: string) => {
        const ok = await api.updatePaymentStatus(id, 'approved');
        if (!ok) {
            alert('No se pudo aprobar el pago. Verifica la conexión e intenta de nuevo.');
            return;
        }
        refreshData();
    };

    const handleReject = async (id: string, note: string) => {
        const ok = await api.updatePaymentStatus(id, 'rejected', note);
        if (!ok) {
            alert('No se pudo rechazar el pago. Verifica la conexión e intenta de nuevo.');
            return;
        }
        refreshData();
    };

    const handleDelete = async (payment: Payment) => {
        const label = `${payment.vendorName || 'Vendedor'} — ${payment.currency} ${payment.amount.toFixed(2)} (${payment.date})`;
        const confirmed = window.confirm(
            `⚠️ ¿Eliminar esta recaudación?\n\n${label}\n\nSi estaba aprobada, se revertirá del balance semanal. Esta acción no se puede deshacer.`
        );
        if (!confirmed) return;

        try {
            await api.deletePayment(payment.id);
            refreshData();
        } catch (err: any) {
            alert(`Error al eliminar el pago: ${err?.message || 'Error desconocido'}`);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-safe">
            <CollectionHeader onNewPayment={() => form.setIsModalOpen(true)} />

            {error && (
                <div className="glass-panel p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-500 text-sm font-semibold flex items-center gap-2">
                    ⚠️ {error}
                </div>
            )}

            <PaymentRegistrationModal
                sellers={sellers}
                {...form}
                currencies={form.currencies}
                banks={form.banks}
                paymentMethods={form.paymentMethods}
                formOperationType={form.formOperationType}
                setFormOperationType={form.setFormOperationType}
                editingPayment={form.editingPayment}
            />

            <CollectionFilters
                activeTab={activeTab} setActiveTab={setActiveTab}
                pendingCount={filter.pendingPayments.length}
                filterPreset={filter.filterPreset} setFilterPreset={filter.setFilterPreset}
                rangeStart={filter.rangeStart}
                rangeEnd={filter.rangeEnd}
                snapToWeek={filter.snapToWeek}
                searchQuery={filter.searchQuery} setSearchQuery={filter.setSearchQuery}
            />

            {activeTab === 'stats' && (
                <CollectionStatsPanel
                    statsByCurrency={filter.statsByCurrency}
                    salesByProduct={filter.salesByProduct}
                />
            )}

            {activeTab === 'list' && (
                <PaymentsTable
                    filteredPayments={filter.filteredPayments}
                    isLoading={isLoading}
                    onOpenProof={(src) => setProofLightbox(src)}
                    onSelectTicket={setSelectedTicket}
                    onEditPayment={(payment) => form.startEditPayment(payment)}
                    onDeletePayment={handleDelete}
                />
            )}

            {activeTab === 'balance' && (
                <SellerBalanceTable
                    sales={sales}
                    payments={payments}
                    filterRange={filter.filterRange}
                    filterPreset={filter.filterPreset}
                    rangeStart={filter.rangeStart}
                    rangeEnd={filter.rangeEnd}
                    searchQuery={filter.searchQuery}
                />
            )}

            {activeTab === 'approvals' && (
                <ApprovalsPanel
                    pendingPayments={filter.pendingPayments}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onOpenProof={(src) => setProofLightbox(src)}
                />
            )}

            {/* Modal de Confirmación de Edición de Pagos */}
            <EditConfirmationModal
                isOpen={form.showEditConfirm}
                title="Confirmar Edición de Pago"
                changes={form.editChanges}
                onConfirm={form.handleConfirmEdit}
                onCancel={() => form.setShowEditConfirm(false)}
                loading={form.editConfirmLoading}
            />

            {/* Modal de Ticket Generator */}
            {selectedTicket && (
                <TicketGenerator
                    id={String(selectedTicket.id)}
                    type="Cobro"
                    amountUsd={selectedTicket.currency === 'DOLAR' ? selectedTicket.amount : 0}
                    amountVes={selectedTicket.currency === 'BOLIVARES VENEZOLANOS' ? selectedTicket.amount : 0}
                    clientName={selectedTicket.vendorName}
                    agencyName={''}
                    date={selectedTicket.date}
                    onClose={() => setSelectedTicket(null)}
                />
            )}

            {/* Lightbox de Comprobante */}
            {proofLightbox && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
                    onClick={() => setProofLightbox(null)}
                >
                    <button onClick={() => setProofLightbox(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                        <X size={20} />
                    </button>
                    <img
                        src={proofLightbox}
                        alt="Comprobante"
                        className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
