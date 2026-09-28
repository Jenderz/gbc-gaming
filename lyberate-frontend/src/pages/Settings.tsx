import React, { useState, useEffect } from 'react';
import {
    Search, Edit2, Trash2, X, Plus, Shield, UserCog, Building2, TrendingUp, BookOpen, Globe, Package, Landmark, Wallet
} from 'lucide-react';
import {
    getUsers, addUser, updateUser, deleteUser, AppUser, Role,
    getSystemPrefs, updateSystemPrefs, SystemPrefs,
    getAvailableCurrencies, addAvailableCurrency, updateAvailableCurrency, deleteAvailableCurrency,
    getGlobalProducts, addGlobalProduct, updateGlobalProduct, deleteGlobalProduct,
    getPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod,
    getBanks, addBank, updateBank, deleteBank
} from '../services/apiService';

export const Settings = () => {
    const [activeTab, setActiveTab] = useState<'personal' | 'empresa' | 'riesgos' | 'catalogos'>('personal');

    return (
        <div className="flex flex-col md:flex-row gap-6 animate-fade-in pb-safe min-h-[80vh]">
            {/* Sidebar / Tabs nav */}
            <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight mb-4 px-2">Configuración</h1>

                <button
                    onClick={() => setActiveTab('personal')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-semibold ${activeTab === 'personal' ? 'bg-ios-blue text-white shadow-md' : 'text-ios-subtext hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                >
                    <UserCog size={20} /> Personal (Admins)
                </button>

                <button
                    onClick={() => setActiveTab('empresa')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-semibold ${activeTab === 'empresa' ? 'bg-ios-blue text-white shadow-md' : 'text-ios-subtext hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                >
                    <Building2 size={20} /> Perfil de Empresa
                </button>

                <button
                    onClick={() => setActiveTab('riesgos')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-semibold ${activeTab === 'riesgos' ? 'bg-ios-blue text-white shadow-md' : 'text-ios-subtext hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                >
                    <TrendingUp size={20} /> Finanzas y Riesgos
                </button>

                <button
                    onClick={() => setActiveTab('catalogos')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-semibold ${activeTab === 'catalogos' ? 'bg-ios-blue text-white shadow-md' : 'text-ios-subtext hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                >
                    <BookOpen size={20} /> Catálogos Seguros
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 glass-panel rounded-3xl p-6 relative flex flex-col border border-black/5 dark:border-white/5 shadow-glass">
                {activeTab === 'personal' && <SettingsPersonal />}
                {activeTab === 'empresa' && <SettingsCompany />}
                {activeTab === 'riesgos' && <SettingsRisks />}
                {activeTab === 'catalogos' && <SettingsCatalogs />}
            </div>
        </div>
    );
};

// ─── Subcomponents ─────────────────────────────────────────────────────────────

const SettingsPersonal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'Supervisor' as Role
    });

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        const allUsers = await getUsers();
        setUsers(allUsers.filter(u => u.role !== 'Vendedor' && u.role !== 'Banca'));
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'Supervisor' });
    };

    const handleEdit = (user: AppUser) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, password: user.password || '', role: user.role });
        setIsModalOpen(true);
    };

    const handleDelete = async (user: AppUser) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar al usuario ${user.name}? Al eliminarlo perderá el acceso al sistema inmediatamente.`)) {
            const success = await deleteUser(String(user.id));
            if (success) await loadUsers();
            else alert("No se puede eliminar a este usuario porque es el único Administrador restante.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            await updateUser({ ...editingUser, name: formData.name, email: formData.email, password: formData.password, role: formData.role });
        } else {
            await addUser({ name: formData.name, email: formData.email, password: formData.password, role: formData.role });
        }
        await loadUsers();
        closeModal();
    };

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in flex-1 flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold">Gestión de Personal</h2>
                    <p className="text-sm text-ios-subtext max-w-md">Administra accesos para Supervisores y Administradores. Los vendedores se controlan en su propio módulo.</p>
                </div>
                <button onClick={() => { closeModal(); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-ios-blue text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 transition-all">
                    <Plus size={16} /> Nuevo Personal
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-[#1c1c1e] w-full max-w-md rounded-[2rem] p-6 relative shadow-2xl">
                        <button onClick={closeModal} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-ios-text z-10 bg-black/5 dark:bg-white/5 rounded-full"><X size={20} /></button>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <UserCog className="text-ios-blue" size={24} /> {editingUser ? 'Editar Usuario' : 'Nuevo Personal'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Nombre Completo</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" placeholder="Ej: Carlos Pérez" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Correo Electrónico (Login)</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" placeholder="usuario@email.com" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Contraseña</label>
                                <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Nivel de Acceso (Rol)</label>
                                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as Role })} className="w-full px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all cursor-pointer">
                                    <option value="Supervisor">Supervisor</option>
                                    <option value="Admin">Administrador (Total)</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-xl bg-black/5 dark:bg-white/5 font-bold hover:bg-black/10 transition-all text-sm">Cancelar</button>
                                <button type="submit" className="flex-[2] py-3 rounded-xl bg-ios-blue text-white font-bold hover:bg-blue-600 active:scale-95 transition-all shadow-lg text-sm">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" size={20} />
                <input type="text" placeholder="Buscar por nombre o correo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-ios-blue/50 outline-none transition-all" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50 flex-1">
                <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                        <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                            <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Usuario</th>
                            <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider">Nivel de Acceso</th>
                            <th className="px-6 py-4 text-xs font-bold text-ios-subtext uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-ios-text">{u.name}</p>
                                    <p className="text-[10px] text-ios-subtext">{u.email}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 w-fit bg-black/5 dark:bg-white/10 px-2 py-1 rounded-lg">
                                        <Shield size={12} className={u.role === 'Admin' ? 'text-ios-red' : 'text-ios-blue'} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{u.role}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(u)} title="Editar" className="p-1.5 text-ios-blue hover:bg-ios-blue/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(u)} title="Eliminar" className="p-1.5 text-ios-red hover:bg-ios-red/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SettingsCompany = () => {
    const [prefs, setPrefs] = useState<SystemPrefs | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const load = async () => setPrefs(await getSystemPrefs());
        load();
    }, []);

    if (!prefs) return null;

    const handleSave = async () => {
        if (!prefs) return;
        await updateSystemPrefs(prefs);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-xl">
            <div>
                <h2 className="text-xl font-bold">Perfil de Empresa</h2>
                <p className="text-sm text-ios-subtext mt-1">Personaliza cómo se muestra el sistema en tickets y cabeceras.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Nombre del Sistema / Empresa</label>
                    <input type="text" value={prefs.companyName} onChange={e => setPrefs({ ...prefs, companyName: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none font-bold transition-all" />
                    <p className="text-[10px] text-ios-subtext mt-1 ml-1">Visible en los recibos impresos generados por el sistema.</p>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Mensaje Pie de Página (Tickets)</label>
                    <textarea value={prefs.ticketFooterMessage} onChange={e => setPrefs({ ...prefs, ticketFooterMessage: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none text-sm transition-all resize-none h-24" />
                </div>
            </div>

            <button onClick={handleSave} className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-ios-blue text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 transition-all active:scale-95">
                {saved ? 'Guardado Exitosamente' : 'Guardar Cambios'}
            </button>
        </div>
    );
};

const SettingsRisks = () => {
    const [prefs, setPrefs] = useState<SystemPrefs | null>(null);
    const [saved, setSaved] = useState(false);
    const [currencies, setCurrencies] = useState<string[]>([]);

    useEffect(() => {
        const load = async () => {
            const [p, c] = await Promise.all([getSystemPrefs(), getAvailableCurrencies()]);
            setPrefs(p);
            setCurrencies(c);
        };
        load();
    }, []);

    if (!prefs) return null;

    const handleSave = async () => {
        if (!prefs) return;
        await updateSystemPrefs(prefs);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-xl">
            <div>
                <h2 className="text-xl font-bold">Finanzas y Riesgos</h2>
                <p className="text-sm text-ios-subtext mt-1">Configura alertas de endeudamiento y la moneda base del cálculo general.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Alerta Límite Deuda por Vendedor</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-ios-subtext">$</span>
                        <input type="number" value={prefs.riskLimitAlert} onChange={e => setPrefs({ ...prefs, riskLimitAlert: Number(e.target.value) })} className="w-full pl-8 pr-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none font-bold transition-all text-ios-red" />
                    </div>
                    <p className="text-[10px] text-ios-subtext mt-1 ml-1">Monto a partir del cual el estatus del vendedor cambia de color advirtiendo riesgo de impago.</p>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-ios-subtext mb-1 uppercase tracking-wider">Moneda Base Global (Visual)</label>
                    <select value={prefs.baseCurrency} onChange={e => setPrefs({ ...prefs, baseCurrency: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none font-bold transition-all appearance-none cursor-pointer">
                        {currencies.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            <button onClick={handleSave} className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-ios-blue text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-600 transition-all active:scale-95">
                {saved ? 'Cambios Guardados' : 'Guardar Finanzas'}
            </button>
        </div>
    );
};

const SettingsCatalogs = () => {
    const [currencies, setCurrencies] = useState<string[]>([]);
    const [products, setProducts] = useState<string[]>([]);
    const [methods, setMethods] = useState<string[]>([]);
    const [banks, setBanks] = useState<string[]>([]);

    const [newCurrency, setNewCurrency] = useState('');
    const [newProduct, setNewProduct] = useState('');
    const [newMethod, setNewMethod] = useState('');
    const [newBank, setNewBank] = useState('');

    const refresh = async () => {
        const [c, p, m, b] = await Promise.all([
            getAvailableCurrencies(), 
            getGlobalProducts(),
            getPaymentMethods(),
            getBanks()
        ]);
        setCurrencies(c);
        setProducts(p);
        setMethods(m);
        setBanks(b);
    };

    useEffect(() => { refresh(); }, []);

    const handleAddCurrency = async () => {
        if (!newCurrency) return;
        const ok = await addAvailableCurrency(newCurrency);
        if (ok) {
            setNewCurrency('');
            await refresh();
        } else {
            alert('La moneda ya existe o hubo un error.');
        }
    };

    const handleAddProduct = async () => {
        if (!newProduct) return;
        const ok = await addGlobalProduct(newProduct);
        if (ok) {
            setNewProduct('');
            await refresh();
        } else {
            alert('El producto ya existe o hubo un error.');
        }
    };

    const handleEditCurrency = async (oldName: string) => {
        const newName = window.prompt('Nuevo nombre para la moneda:', oldName);
        if (newName && newName.trim() !== '' && newName !== oldName) {
            const ok = await updateAvailableCurrency(oldName, newName.trim());
            if (ok) await refresh();
            else alert('Error al actualizar o la moneda ya existe.');
        }
    };

    const handleDeleteCurrency = async (name: string) => {
        if (window.confirm(`¿Estás seguro de eliminar la moneda "${name}"?`)) {
            await deleteAvailableCurrency(name);
            await refresh();
        }
    };

    const handleEditProduct = async (oldName: string) => {
        const newName = window.prompt('Nuevo nombre para el producto:', oldName);
        if (newName && newName.trim() !== '' && newName !== oldName) {
            const ok = await updateGlobalProduct(oldName, newName.trim());
            if (ok) await refresh();
            else alert('Error al actualizar o el producto ya existe.');
        }
    };

    const handleDeleteProduct = async (name: string) => {
        if (window.confirm(`¿Estás seguro de eliminar el producto "${name}"?`)) {
            await deleteGlobalProduct(name);
            await refresh();
        }
    };

    const handleAddMethod = async () => {
        if (!newMethod) return;
        const ok = await addPaymentMethod(newMethod);
        if (ok) {
            setNewMethod('');
            await refresh();
        } else {
            alert('El método ya existe o hubo un error.');
        }
    };

    const handleEditMethod = async (oldName: string) => {
        const newName = window.prompt('Nuevo nombre para el método de pago:', oldName);
        if (newName && newName.trim() !== '' && newName !== oldName) {
            const ok = await updatePaymentMethod(oldName, newName.trim());
            if (ok) await refresh();
            else alert('Error al actualizar o el método ya existe.');
        }
    };

    const handleDeleteMethod = async (name: string) => {
        if (window.confirm(`¿Estás seguro de eliminar el método de pago "${name}"?`)) {
            await deletePaymentMethod(name);
            await refresh();
        }
    };

    const handleAddBank = async () => {
        if (!newBank) return;
        const ok = await addBank(newBank);
        if (ok) {
            setNewBank('');
            await refresh();
        } else {
            alert('El banco ya existe o hubo un error.');
        }
    };

    const handleEditBank = async (oldName: string) => {
        const newName = window.prompt('Nuevo nombre para el banco:', oldName);
        if (newName && newName.trim() !== '' && newName !== oldName) {
            const ok = await updateBank(oldName, newName.trim());
            if (ok) await refresh();
            else alert('Error al actualizar o el banco ya existe.');
        }
    };

    const handleDeleteBank = async (name: string) => {
        if (window.confirm(`¿Estás seguro de eliminar el banco "${name}"?`)) {
            await deleteBank(name);
            await refresh();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in flex-1">
            <div className="max-w-2xl">
                <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="text-ios-blue" /> Catálogos Seguros</h2>
                <p className="text-sm text-ios-subtext mt-1 mb-4">
                    Administra las monedas y productos disponibles en todo el sistema. Los cambios aquí centralizarán las configuraciones para todos los vendedores.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Monedas */}
                    <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-4 flex flex-col">
                        <h3 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2 text-ios-subtext"><Globe size={16} /> Tipos de Moneda</h3>
                        <div className="flex gap-2">
                            <input type="text" value={newCurrency} onChange={e => setNewCurrency(e.target.value)} placeholder="Ej: EUROS" className="flex-1 px-3 py-2 rounded-xl bg-white/50 dark:bg-black/50 border-none outline-none text-xs font-bold" />
                            <button onClick={handleAddCurrency} className="bg-ios-blue p-2 rounded-xl text-white hover:bg-blue-600 transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-48 space-y-1 pr-2 no-scrollbar">
                            {currencies.map(c => (
                                <div key={c} className="flex items-center justify-between px-3 py-2 bg-white/30 dark:bg-black/30 rounded-lg text-xs font-bold tracking-tight border border-black/5 dark:border-white/5 opacity-80 group">
                                    <span>{c}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditCurrency(c)} className="p-1 text-ios-blue hover:bg-ios-blue/10 rounded-md"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDeleteCurrency(c)} className="p-1 text-ios-red hover:bg-ios-red/10 rounded-md"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Productos */}
                    <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-4 flex flex-col">
                        <h3 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2 text-ios-subtext"><Package size={16} /> Productos / Juegos Base</h3>
                        <div className="flex gap-2">
                            <input type="text" value={newProduct} onChange={e => setNewProduct(e.target.value)} placeholder="Ej: APUESTAS DEPORTIVAS" className="flex-1 px-3 py-2 rounded-xl bg-white/50 dark:bg-black/50 border-none outline-none text-xs font-bold" />
                            <button onClick={handleAddProduct} className="bg-ios-blue p-2 rounded-xl text-white hover:bg-blue-600 transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-48 space-y-1 pr-2 no-scrollbar">
                            {products.map(p => (
                                <div key={p} className="flex items-center justify-between px-3 py-2 bg-white/30 dark:bg-black/30 rounded-lg text-xs font-bold tracking-tight border border-black/5 dark:border-white/5 opacity-80 group">
                                    <span>{p}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditProduct(p)} className="p-1 text-ios-blue hover:bg-ios-blue/10 rounded-md"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDeleteProduct(p)} className="p-1 text-ios-red hover:bg-ios-red/10 rounded-md"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Métodos de Pago */}
                    <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-4 flex flex-col">
                        <h3 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2 text-ios-subtext"><Wallet size={16} /> Métodos de Pago</h3>
                        <div className="flex gap-2">
                            <input type="text" value={newMethod} onChange={e => setNewMethod(e.target.value)} placeholder="Ej: Zelle" className="flex-1 px-3 py-2 rounded-xl bg-white/50 dark:bg-black/50 border-none outline-none text-xs font-bold" />
                            <button onClick={handleAddMethod} className="bg-ios-blue p-2 rounded-xl text-white hover:bg-blue-600 transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-48 space-y-1 pr-2 no-scrollbar">
                            {methods.map(m => (
                                <div key={m} className="flex items-center justify-between px-3 py-2 bg-white/30 dark:bg-black/30 rounded-lg text-xs font-bold tracking-tight border border-black/5 dark:border-white/5 opacity-80 group">
                                    <span>{m}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditMethod(m)} className="p-1 text-ios-blue hover:bg-ios-blue/10 rounded-md"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDeleteMethod(m)} className="p-1 text-ios-red hover:bg-ios-red/10 rounded-md"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bancos */}
                    <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-4 flex flex-col">
                        <h3 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2 text-ios-subtext"><Landmark size={16} /> Bancos / Destinos</h3>
                        <div className="flex gap-2">
                            <input type="text" value={newBank} onChange={e => setNewBank(e.target.value)} placeholder="Ej: Banesco" className="flex-1 px-3 py-2 rounded-xl bg-white/50 dark:bg-black/50 border-none outline-none text-xs font-bold" />
                            <button onClick={handleAddBank} className="bg-ios-blue p-2 rounded-xl text-white hover:bg-blue-600 transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-48 space-y-1 pr-2 no-scrollbar">
                            {banks.map(b => (
                                <div key={b} className="flex items-center justify-between px-3 py-2 bg-white/30 dark:bg-black/30 rounded-lg text-xs font-bold tracking-tight border border-black/5 dark:border-white/5 opacity-80 group">
                                    <span>{b}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditBank(b)} className="p-1 text-ios-blue hover:bg-ios-blue/10 rounded-md"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDeleteBank(b)} className="p-1 text-ios-red hover:bg-ios-red/10 rounded-md"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
