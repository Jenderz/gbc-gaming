import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { Collections } from './pages/Collections';
import { Sales } from './pages/Sales';
import { Transactions } from './pages/Transactions';

import { Sellers } from './pages/Sellers';
import { Agencies } from './pages/Agencies';
import { Expenses } from './pages/Expenses';
import { Posturas } from './pages/Posturas';
import { Login } from './pages/Login';
import { VendorPortal } from './pages/VendorPortal';
import { WeeklyClosing } from './pages/WeeklyClosing';
import { Settings } from './pages/Settings';
import { AgencyPortal } from './pages/AgencyPortal/AgencyPortal';

// Preloader Corporativo "GBC GAMING"
const GenericPreloader = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-50 dark:bg-[#060F0A] transition-colors duration-500">
            <div className="flex flex-col items-center gap-6 animate-fade-in p-6">

                {/* Animación de Carga Central con Anillo Dorado y Verde */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Anillo exterior sutil */}
                    <div className="absolute inset-0 border-2 border-black/5 dark:border-white/10 rounded-full"></div>
                    {/* Anillo de carga dorado */}
                    <div className="absolute inset-0 border-2 border-[#EBBB03] border-t-transparent rounded-full animate-spin"></div>
                    {/* Anillo de carga verde invertido */}
                    <div className="absolute inset-2 border border-[#00361F] dark:border-[#004D2C] border-b-transparent rounded-full animate-spin [animation-duration:1.5s] [animation-direction:reverse]"></div>
                    {/* Logo Central Oficial */}
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <img
                            src="/logo.png"
                            alt="GBC GAMING"
                            className="w-14 h-14 object-contain drop-shadow"
                        />
                    </div>
                </div>

                {/* Texto de Marca Oficial */}
                <div className="text-center space-y-2">
                    <div className="text-lg font-black tracking-tight text-ios-text dark:text-white">
                        GBC <span className="text-[#EBBB03]">GAMING</span>
                    </div>
                    <div className="text-[11px] text-ios-subtext uppercase tracking-widest font-semibold">
                        GBC GAMING, C.A. • J-500291221
                    </div>
                    {/* Puntos de carga sutiles dorados */}
                    <div className="flex justify-center gap-1.5 opacity-60 pt-1">
                        <span className="w-1.5 h-1.5 bg-[#EBBB03] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-[#00361F] dark:bg-[#004D2C] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-[#EBBB03] rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente Placeholder para rutas en construcción
const UnderConstruction = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] animate-fade-in p-6 text-center">
        <div className="bg-[#00361F]/10 dark:bg-[#00361F]/20 p-6 rounded-3xl mb-6 border border-[#EBBB03]/20 shadow-glass">
            <img src="/logo.png" alt="GBC GAMING" className="w-20 h-20 object-contain drop-shadow-md" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-ios-text dark:text-white">Módulo: {title}</h2>
        <p className="text-ios-subtext text-center max-w-md text-sm">
            Este módulo forma parte de la arquitectura Financiera y Operativa de <strong className="text-ios-text dark:text-white">GBC GAMING</strong> y está en proceso de optimización.
        </p>
    </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        if (user.role === 'Vendedor') {
            return <Navigate to="/portal" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

// Redirige al usuario a la ruta correcta según su rol
const RoleBasedFallback = () => {
    const { user, isAuthenticated, loading } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role === 'Vendedor') {
        return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
};

const AppContent = () => {
    const { loading } = useAuth();

    if (loading) {
        return <GenericPreloader />;
    }

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                {/* Rutas Protegidas con el Dashboard Layout */}
                {/* Rutas del Panel Admin — bloqueadas para Vendedor */}
                <Route path="/" element={
                    <ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Banca']}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardHome />} />

                    {/* Rutas Restringidas por Rol (Ejemplo Admin/Supervisor) */}
                    <Route path="sales" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Sales /></ProtectedRoute>} />
                    <Route path="collections" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Banca']}><Collections /></ProtectedRoute>} />
                    <Route path="transactions" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Banca']}><Transactions /></ProtectedRoute>} />
                    <Route path="expenses" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Expenses /></ProtectedRoute>} />
                    <Route path="posturas" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Posturas /></ProtectedRoute>} />

                    <Route path="sellers" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><Sellers /></ProtectedRoute>} />
                    <Route path="agencies" element={<ProtectedRoute allowedRoles={['Admin']}><Agencies /></ProtectedRoute>} />
                    <Route path="weekly-closing" element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']}><WeeklyClosing /></ProtectedRoute>} />
                    <Route path="settings" element={<ProtectedRoute allowedRoles={['Admin']}><Settings /></ProtectedRoute>} />
                    <Route path="reports" element={<UnderConstruction title="Reportes" />} />
                    <Route path="audits" element={<UnderConstruction title="Auditorías" />} />
                </Route>

                {/* Vendor Portal — vendedor normal */}
                <Route path="/portal" element={
                    <ProtectedRoute allowedRoles={['Vendedor']}>
                        <VendorPortal />
                    </ProtectedRoute>
                } />

                {/* Agency Portal — vendedor con Modo Agencia activo */}
                <Route path="/agency" element={
                    <ProtectedRoute allowedRoles={['Vendedor']}>
                        <AgencyPortal />
                    </ProtectedRoute>
                } />

                {/* Fallback — redirigir según rol */}
                <Route path="*" element={<RoleBasedFallback />} />
            </Routes>
        </Router>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
