import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CreditCard, LogOut, CalendarDays, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Hooks & Utils
import { useVendorStats } from './VendorPortal/hooks/useVendorStats';

// Subcomponents
import { VendorDashboard } from './VendorPortal/components/VendorDashboard';
import { VendorPayments } from './VendorPortal/components/VendorPayments';
import { VendorWeeks } from './VendorPortal/components/VendorWeeks';
import { PaymentModal } from './VendorPortal/components/PaymentModal';

export const VendorPortal = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState<'dashboard' | 'payments' | 'weeks'>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'payment' | 'credit'>('payment');

    const sellerId = user?.sellerId ? String(user.sellerId) : '';

    // Utilizando el custom hook centralizado
    const {
        payments,
        sales,
        statsByCurrency,
        pendingWeeks,
        totalPendingGlobal,
        refreshData
    } = useVendorStats(user?.id ? String(user.id) : undefined, sellerId);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const handleOpenModal = (type: 'payment' | 'credit') => {
        setModalAction(type);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-ios-bg dark:bg-black font-sans pb-20">
            {/* Top Nav (Glassmorphism) */}
            <header className="sticky top-0 z-40 bg-white/70 dark:bg-[#111]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="GBC GAMING" className="w-9 h-9 object-contain drop-shadow-sm" />
                    <div>
                        <p className="text-[10px] text-[#00361F] dark:text-[#EBBB03] font-bold uppercase tracking-wider leading-none mb-0.5">GBC GAMING • Portal</p>
                        <p className="text-sm font-bold leading-tight text-ios-text dark:text-white">{user?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ios-subtext bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
                        {user?.agencyName}
                    </span>
                    <button onClick={handleLogout} className="p-2.5 rounded-xl text-ios-subtext hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div className="max-w-2xl mx-auto p-4 space-y-6 mt-2">
                {/* Tab Toggle Premium */}
                <div className="flex bg-black/5 dark:bg-white/5 rounded-2xl p-1.5 gap-1 shadow-inner border border-black/5 dark:border-white/5">
                    <button onClick={() => setTab('dashboard')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${tab === 'dashboard' ? 'bg-white dark:bg-black shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-ios-text scale-[1.02]' : 'text-ios-subtext hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        <LayoutDashboard size={16} /> Mi Resumen
                    </button>
                    <button onClick={() => setTab('payments')} className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${tab === 'payments' ? 'bg-white dark:bg-black shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-ios-text scale-[1.02]' : 'text-ios-subtext hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        <CreditCard size={16} /> Mis Pagos
                        {totalPendingGlobal > 0 && (
                            <span className="absolute top-1 right-2 bg-orange-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-lg transform -translate-y-1/2">
                                {payments.filter(p => p.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setTab('weeks')} className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${tab === 'weeks' ? 'bg-white dark:bg-black shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-ios-text scale-[1.02]' : 'text-ios-subtext hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        <CalendarDays size={16} /> Semanas
                        {pendingWeeks.length > 0 && (
                            <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-lg transform -translate-y-1/2">
                                {pendingWeeks.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Banner Modo Agencia */}
                {user?.isAgency && (
                    <button
                        onClick={() => navigate('/agency')}
                        className="w-full group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98] transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
                                <Building2 size={24} />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold">Gestionar Mi Agencia</p>
                                <p className="text-[11px] text-white/70 mt-0.5">Administra tus sub-vendedores, ventas y recaudaciones</p>
                            </div>
                            <svg className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>
                )}

                {/* Contenido Dinámico */}
                <div className="relative">
                    {tab === 'dashboard' && (
                        <VendorDashboard
                            statsByCurrency={statsByCurrency}
                            totalPendingGlobal={totalPendingGlobal}
                            onAction={handleOpenModal}
                        />
                    )}

                    {tab === 'payments' && (
                        <VendorPayments
                            payments={payments}
                            onOpenModal={() => handleOpenModal('payment')}
                        />
                    )}

                    {tab === 'weeks' && (
                        <VendorWeeks
                            sales={sales}
                        />
                    )}
                </div>
            </div>

            {/* Modal de Recaudación */}
            <PaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={user!}
                sellerId={sellerId}
                refreshData={refreshData}
                actionType={modalAction}
            />
        </div>
    );
};
