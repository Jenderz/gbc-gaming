import { Users, Store, Receipt, Wallet, Banknote, LayoutDashboard, Settings, Activity, ArrowDownCircle } from 'lucide-react';

export const ADMIN_MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'sales', label: 'Ventas', icon: Receipt, path: '/sales' },
    { id: 'collections', label: 'Recaudaciones', icon: Wallet, path: '/collections' },
    { id: 'transactions', label: 'Transacciones', icon: Activity, path: '/transactions' },
    { id: 'expenses', label: 'Gastos', icon: Banknote, path: '/expenses' },
    { id: 'posturas', label: 'Posturas', icon: ArrowDownCircle, path: '/posturas' },


    { id: 'sellers', label: 'Vendedores', icon: Users, path: '/sellers' },
    { id: 'agencies', label: 'Agencias', icon: Store, path: '/agencies' },
    { id: 'separator', isSeparator: true },
    { id: 'separator-staff', isSeparator: true },
    { id: 'settings', label: 'Config. Central', icon: Settings, path: '/settings' },
];
