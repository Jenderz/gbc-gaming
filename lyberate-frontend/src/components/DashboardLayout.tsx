import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Bell, LogOut, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ADMIN_MENU_ITEMS } from '../config/menu';
import { useAuth } from '../context/AuthContext';

export const DashboardLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDesktopMenuPinned, setIsDesktopMenuPinned] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuth();

    const isExpanded = isDesktopMenuPinned || isHovered;

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);
    const toggleDesktopMenu = () => setIsDesktopMenuPinned(!isDesktopMenuPinned);

    return (
        <div className="flex h-screen w-full bg-ios-bg dark:bg-black overflow-hidden relative">

            {/* --- SIDEBAR (Desktop) / DRAWER (Mobile) --- */}
            <aside
                onMouseEnter={() => !isDesktopMenuPinned && setIsHovered(true)}
                onMouseLeave={() => !isDesktopMenuPinned && setIsHovered(false)}
                className={`fixed md:relative inset-y-0 left-0 z-50 h-full transition-all duration-300 ease-in-out shrink-0
                    ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} 
                    md:translate-x-0
                    ${isExpanded ? 'md:w-72' : 'md:w-20'} 
                `}
            >
                {/* Glassmorphism Panel */}
                <div className="h-full w-full glass-panel dark:bg-black/80 flex flex-col md:border-r border-black/5 dark:border-white/10 shadow-glass overflow-hidden">

                    {/* Logo Area */}
                    <div className={`p-6 flex items-center ${isExpanded ? 'justify-between' : 'justify-center md:px-0'}`}>
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo.png"
                                alt="GBC GAMING Logo"
                                className="w-10 h-10 object-contain drop-shadow-md shrink-0"
                            />
                            <div className={`transition-all duration-300 flex flex-col ${isExpanded ? 'opacity-100 w-[140px]' : 'md:opacity-0 md:w-0 overflow-hidden'}`}>
                                <h1 className="font-black text-lg tracking-tight whitespace-nowrap text-ios-text dark:text-white">
                                    GBC <span className="text-[#EBBB03]">GAMING</span>
                                </h1>
                                <p className="text-[10px] text-ios-subtext dark:text-gray-400 uppercase tracking-widest font-bold whitespace-nowrap">Admin Portal</p>
                            </div>
                        </div>
                        {/* Close Button on Mobile */}
                        <button onClick={closeMobileMenu} className="md:hidden p-2 text-ios-subtext hover:text-ios-text">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation Menu */}
                    <div className={`flex-1 overflow-y-auto no-scrollbar py-2 space-y-1 transition-all duration-300 ${isExpanded ? 'px-4' : 'px-4 md:px-3'}`}>
                        {ADMIN_MENU_ITEMS.map((item, index) => {
                            if (item.isSeparator) {
                                return <div key={`sep-${index}`} className="my-4 border-t border-black/5 dark:border-white/5 mx-2"></div>;
                            }

                            const Icon = item.icon;
                            if (!Icon || !item.path) return null;

                            const isActive = location.pathname.startsWith(item.path);

                            return (
                                <NavLink
                                    key={item.id}
                                    to={item.path}
                                    onClick={closeMobileMenu}
                                    title={!isExpanded ? item.label : undefined}
                                    className={`flex items-center py-3 rounded-xl transition-all duration-200 ${isExpanded ? 'gap-3 px-4' : 'px-4 md:px-0 md:justify-center md:gap-0'} ${isActive
                                        ? 'bg-ios-blue text-white shadow-md font-semibold'
                                        : 'text-ios-text/80 hover:bg-black/5 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <Icon size={20} className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                                    <span className={`text-sm whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'md:opacity-0 md:w-0 overflow-hidden'}`}>{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>

                    {/* User Profile Mini */}
                    <div className={`mt-auto transition-all duration-300 ${isExpanded ? 'p-4' : 'p-4 md:p-3'}`}>
                        <div
                            onClick={logout}
                            title={!isExpanded ? "Cerrar sesión" : undefined}
                            className={`flex items-center rounded-xl bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-ios-red/10 group transition-all duration-300 ${isExpanded ? 'gap-3 p-3' : 'p-3 md:p-2 md:justify-center md:gap-0'}`}
                        >
                            <div className="w-10 h-10 rounded-full shrink-0 bg-ios-blue/10 group-hover:bg-ios-red/20 flex items-center justify-center text-ios-blue group-hover:text-ios-red transition-colors">
                                <LogOut size={20} />
                            </div>
                            <div className={`min-w-0 flex flex-col transition-all duration-300 ${isExpanded ? 'opacity-100 w-[120px]' : 'md:opacity-0 md:w-0 overflow-hidden'}`}>
                                <p className="text-sm font-bold truncate group-hover:text-ios-red transition-colors whitespace-nowrap">{user?.name || 'Usuario'}</p>
                                <p className="text-xs text-ios-subtext truncate group-hover:text-ios-red/70 whitespace-nowrap">{user?.role || 'Vendedor'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- OVERLAY FOR MOBILE --- */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden animate-fade-in"
                    onClick={closeMobileMenu}
                />
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 glass-panel md:bg-transparent md:backdrop-filter-none md:border-none z-30 sticky top-0 transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleMobileMenu}
                            className="md:hidden p-2 text-ios-text bg-white dark:bg-black/50 rounded-lg shadow-sm"
                        >
                            <Menu size={20} />
                        </button>

                        <button
                            onClick={toggleDesktopMenu}
                            className="hidden md:flex p-2 text-ios-subtext hover:text-ios-text hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                            title={isDesktopMenuPinned ? "Ocultar menú" : "Mostrar menú"}
                        >
                            {isDesktopMenuPinned ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
                        </button>

                        <h2 className="text-xl font-bold hidden md:block text-ios-text tracking-tight ml-1 w-full max-w-[200px] truncate">Panel de Control</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-ios-subtext hover:text-ios-text transition-colors">
                            <Bell size={22} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-ios-red rounded-full shadow-sm"></span>
                        </button>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto pb-safe">
                        {/* Animación base para las vistas hijas */}
                        <div className="animate-fade-in">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
};
