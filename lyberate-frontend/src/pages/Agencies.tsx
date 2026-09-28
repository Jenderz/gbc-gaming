import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, X, Plus, Building2, Phone, Mail, MapPin, User } from 'lucide-react';
import {
    getAgencies, addAgency, updateAgency, deleteAgency,
    getSellers, Agency, Seller
} from '../services/apiService';

// ─── Form vacío ───────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', address: '', phone: '', email: '', sellerId: '', sellerName: '' };

export const Agencies = () => {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Agency | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // ── Carga inicial ──────────────────────────────────────────────────────────
    const refresh = async () => {
        const [ag, sel] = await Promise.all([getAgencies(), getSellers()]);
        setAgencies(ag);
        setSellers(sel);
    };
    useEffect(() => { refresh(); }, []);

    // ── Filtrado ───────────────────────────────────────────────────────────────
    const filtered = agencies.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.sellerName.toLowerCase().includes(search.toLowerCase()) ||
        (a.phone || '').includes(search)
    );

    // ── Apertura de modal ──────────────────────────────────────────────────────
    const openNew = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setIsModalOpen(true);
    };

    const openEdit = (agency: Agency) => {
        setEditTarget(agency);
        setForm({ name: agency.name, address: agency.address || '', phone: agency.phone || '', email: agency.email || '', sellerId: String(agency.sellerId), sellerName: agency.sellerName });
        setIsModalOpen(true);
    };

    // ── Selección de vendedor en form ──────────────────────────────────────────
    const handleSellerSelect = (id: string) => {
        const seller = sellers.find(s => String(s.id) === id);
        setForm(f => ({ ...f, sellerId: id, sellerName: seller?.name || '' }));
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.sellerId) return;
        if (editTarget) {
            updateAgency({ ...editTarget, ...form });
        } else {
            addAgency(form);
        }
        refresh();
        setIsModalOpen(false);
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = (id: string) => {
        deleteAgency(id);
        setConfirmDelete(null);
        refresh();
    };

    return (
        <div className="space-y-6 animate-fade-in pb-safe">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Agencias</h1>
                    <p className="text-sm text-ios-subtext mt-1">
                        Directorio de sucursales y puntos de venta por vendedor
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2.5 bg-ios-blue text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 transition-all"
                >
                    <Plus size={16} /> Nueva Agencia
                </button>
            </div>

            {/* Stats rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-ios-blue">
                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider mb-1">Total Agencias</p>
                    <p className="text-2xl font-bold">{agencies.length}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-ios-green">
                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider mb-1">Vendedores con Agencias</p>
                    <p className="text-2xl font-bold">{new Set(agencies.map(a => a.sellerId)).size}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-purple-500 col-span-2 md:col-span-1">
                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider mb-1">Sin Agencias Asignadas</p>
                    <p className="text-2xl font-bold">{sellers.filter(s => !agencies.some(a => a.sellerId === s.id)).length}</p>
                </div>
            </div>

            {/* Modal Nueva/Editar Agencia */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-ios-bg dark:bg-black w-full max-w-lg rounded-[2rem] p-6 relative shadow-2xl glass-panel border border-white/20">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-ios-subtext hover:text-ios-text z-10 bg-black/5 dark:bg-white/5 rounded-full">
                            <X size={20} />
                        </button>
                        <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                            <Building2 size={20} className="text-ios-blue" />
                            {editTarget ? 'Editar Agencia' : 'Nueva Agencia'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Nombre */}
                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Nombre de la Agencia *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all"
                                    placeholder="Ej: Agencia Centro Caracas"
                                />
                            </div>

                            {/* Dirección */}
                            <div>
                                <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Dirección</label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all"
                                    placeholder="Av. Principal, Edificio A"
                                />
                            </div>

                            {/* Teléfono y Email */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Teléfono</label>
                                    <input
                                        type="text"
                                        value={form.phone}
                                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all"
                                        placeholder="0212-0000000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-ios-subtext mb-1 uppercase tracking-wider">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-ios-blue outline-none transition-all"
                                        placeholder="agencia@mail.com"
                                    />
                                </div>
                            </div>

                            {/* Vendedor */}
                            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5">
                                <label className="block text-xs font-semibold text-ios-subtext mb-2 uppercase tracking-wider">Vendedor Asignado *</label>
                                <select
                                    required
                                    value={form.sellerId}
                                    onChange={e => handleSellerSelect(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black border border-transparent focus:border-ios-blue outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Seleccione un vendedor...</option>
                                    {sellers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                {form.sellerId && (
                                    <p className="text-xs text-ios-subtext mt-2 flex items-center gap-1">
                                        <User size={11} /> {form.sellerName}
                                    </p>
                                )}
                            </div>

                            {/* Acciones */}
                            <div className="pt-4 flex gap-3 border-t border-black/5 dark:border-white/5">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 text-ios-text font-bold hover:bg-black/10 transition-all text-sm">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-ios-blue text-white font-bold hover:bg-blue-600 transition-all shadow-md text-sm">
                                    {editTarget ? 'Guardar Cambios' : 'Registrar Agencia'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tabla */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col">
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, vendedor o teléfono..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none focus:ring-2 focus:ring-ios-blue/50 outline-none transition-all text-sm"
                        />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="py-16 text-center text-ios-subtext">
                        <Building2 size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">{search ? 'Sin resultados para tu búsqueda' : 'No hay agencias registradas'}</p>
                        <p className="text-xs mt-1">{!search && 'Presiona "Nueva Agencia" para agregar la primera.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50">
                        <table className="w-full text-left border-collapse min-w-[550px]">
                            <thead>
                                <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                                    <th className="px-5 py-3 text-xs font-bold text-ios-subtext uppercase tracking-wider">Agencia</th>
                                    <th className="px-5 py-3 text-xs font-bold text-ios-subtext uppercase tracking-wider">Contacto</th>
                                    <th className="px-5 py-3 text-xs font-bold text-ios-subtext uppercase tracking-wider">Vendedor</th>
                                    <th className="px-5 py-3 text-xs font-bold text-ios-subtext uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                                {filtered.map(agency => (
                                    <tr key={agency.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <p className="font-bold">{agency.name}</p>
                                            {agency.address && (
                                                <p className="text-xs text-ios-subtext flex items-center gap-1 mt-0.5">
                                                    <MapPin size={10} /> {agency.address}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-ios-subtext">
                                            {agency.phone && <p className="flex items-center gap-1 text-xs"><Phone size={10} /> {agency.phone}</p>}
                                            {agency.email && <p className="flex items-center gap-1 text-xs mt-0.5"><Mail size={10} /> {agency.email}</p>}
                                            {!agency.phone && !agency.email && <span className="text-xs opacity-40">—</span>}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="flex items-center gap-1.5 text-sm font-semibold">
                                                <User size={13} className="text-ios-blue" /> {agency.sellerName}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            {confirmDelete === agency.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs text-red-500 font-medium">¿Eliminar?</span>
                                                    <button onClick={() => handleDelete(String(agency.id))} className="px-2.5 py-1 text-xs bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors">Sí</button>
                                                    <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1 text-xs bg-black/5 dark:bg-white/5 rounded-lg font-bold hover:bg-black/10 transition-colors">No</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(agency)} className="p-1.5 text-ios-blue hover:bg-ios-blue/10 rounded-lg transition-colors">
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button onClick={() => setConfirmDelete(String(agency.id))} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
