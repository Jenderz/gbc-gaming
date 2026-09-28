import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useVendorStats } from '../pages/VendorPortal/hooks/useVendorStats';
import { VendorDashboard } from '../pages/VendorPortal/components/VendorDashboard';
import { getUserBySellerId } from '../services/apiService';

interface SellerHistoryModalProps {
    sellerId: string;
    sellerName: string;
    onClose: () => void;
}

export const SellerHistoryModal: React.FC<SellerHistoryModalProps> = ({ sellerId, sellerName, onClose }) => {
    const [userId, setUserId] = useState<string | undefined>(undefined);

    useEffect(() => {
        const load = async () => {
            const user = await getUserBySellerId(sellerId);
            setUserId(user?.id ? String(user.id) : undefined);
        };
        load();
    }, [sellerId]);

    const {
        statsByCurrency,
        totalPendingGlobal
    } = useVendorStats(userId, sellerId);

    // This action is just a placeholder since we are only viewing history in the admin panel
    const handleAction = (type: 'payment' | 'credit') => {
        // Here we could implement an admin payment flow, but for now it's just a view
        console.log(`Acción solicitada: ${type}`);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-ios-bg dark:bg-[#1c1c1e] w-full max-w-4xl rounded-[2rem] p-6 relative shadow-2xl flex flex-col max-h-[90vh] border border-white/20">

                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/10 dark:border-white/10 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">Historial Financiero</h2>
                        <p className="text-sm text-ios-subtext">Visualizando información de <span className="font-bold text-ios-text">{sellerName}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-ios-subtext hover:text-ios-text z-10 bg-black/5 dark:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
                    {userId ? (
                        <VendorDashboard
                            statsByCurrency={statsByCurrency}
                            totalPendingGlobal={totalPendingGlobal}
                            onAction={handleAction}
                        />
                    ) : (
                        <div className="text-center py-10 text-ios-subtext">
                            <p>No se encontró un usuario asociado para este vendedor.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
