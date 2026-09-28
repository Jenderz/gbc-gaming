import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Wallet, LogOut, Building2, Moon, Sun, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AgencyProvider } from '../../context/AgencyContext';
import { Sales } from '../Sales';
import { Sellers } from '../Sellers';
import { Collections } from '../Collections';
import { useState as useLocalState } from 'react';

type Tab = 'sellers' | 'sales' | 'collections';

const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [
    { id: 'sellers',     label: 'Vendedores',  icon: Users },
    { id: 'sales',       label: 'Ventas',      icon: TrendingUp },
    { id: 'collections', label: 'Recaudaciones', icon: Wallet },
];

export function AgencyPortal() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('sellers');
    const [darkMode, setDarkMode] = useLocalState(() => document.documentElement.classList.contains('dark'));

    const toggleDark = () => {
        document.documentElement.classList.toggle('dark');
        setDarkMode(d => !d);
    };

    return (
        <AgencyProvider>
        <div className="min-h-screen bg-ios-bg dark:bg-black text-ios-text dark:text-white transition-colors duration-300">
            {/* ── Sidebar (desktop) ─────────────────────────────────────────────── */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white/70 dark:bg-[#111]/80 backdrop-blur-xl border-r border-black/5 dark:border-white/5 hidden lg:flex flex-col z-30">

                {/* Brand */}
                <div className="p-6 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Building2 size={20} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Modo Agencia</p>
                            <p className="text-sm font-bold truncate">{user?.agencyName || user?.name}</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-4 space-y-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                                    active
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                                        : 'text-ios-subtext hover:bg-black/5 dark:hover:bg-white/5 hover:text-ios-text'
                                }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-black/5 dark:border-white/5 space-y-2">
                    <button onClick={() => navigate('/portal')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm text-ios-blue hover:bg-ios-blue/10 transition-all font-semibold">
                        <ArrowLeft size={16} />
                        Volver a Mi Portal
                    </button>
                    <button onClick={toggleDark}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm text-ios-subtext hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                        {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
                    </button>
                    <button onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm text-ios-red hover:bg-ios-red/10 transition-all font-semibold">
                        <LogOut size={16} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* ── Main Content ──────────────────────────────────────────────────── */}
            <main className="lg:ml-64 min-h-screen flex flex-col">

                {/* Top bar (mobile) */}
                <header className="sticky top-0 z-20 bg-white/70 dark:bg-[#111]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between lg:hidden">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/portal')} className="p-1.5 text-ios-blue hover:bg-ios-blue/10 rounded-xl transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Building2 size={15} className="text-white" />
                        </div>
                        <span className="text-sm font-bold truncate max-w-[140px]">{user?.agencyName || user?.name}</span>
                    </div>
                    <button onClick={logout} className="p-2 text-ios-red"><LogOut size={18} /></button>
                </header>

                {/* Page header */}
                <div className="px-6 py-6 pb-0">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-widest">
                        <Building2 size={10} /> Panel de Agencia
                    </span>
                </div>

                {/* Module content — reuses the exact same admin components */}
                <div className="flex-1 px-4 sm:px-6 py-6">
                    {activeTab === 'sellers'     && <Sellers />}
                    {activeTab === 'sales'       && <Sales />}
                    {activeTab === 'collections' && <Collections />}
                </div>
            </main>

            {/* ── Bottom Tab Bar (mobile) ───────────────────────────────────────── */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 dark:bg-[#111]/90 backdrop-blur-xl border-t border-black/5 dark:border-white/5 flex lg:hidden safe-area-pb">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-all ${
                                active ? 'text-purple-600 dark:text-purple-400' : 'text-ios-subtext'
                            }`}
                        >
                            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
        </AgencyProvider>
    );
}
