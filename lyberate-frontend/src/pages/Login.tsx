import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const loggedUser = await login(email, password);
            if (loggedUser) {
                navigate(loggedUser.role === 'Vendedor' ? '/portal' : '/dashboard', { replace: true });
            }
        } catch (err: any) {
            setError(err.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-ios-bg dark:bg-[#060F0A] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#00361F]/30 dark:bg-[#00361F]/40 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#EBBB03]/15 dark:bg-[#EBBB03]/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="glass-panel w-full max-w-md p-8 md:p-10 rounded-3xl animate-slide-up relative z-10 shadow-2xl border border-black/5 dark:border-[#EBBB03]/20">

                <div className="text-center mb-8">
                    <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-[#00361F]/20 dark:bg-[#EBBB03]/20 rounded-2xl blur-lg"></div>
                        <img
                            src="/logo.png"
                            alt="GBC GAMING Logo"
                            className="w-24 h-24 mx-auto object-contain relative z-10 drop-shadow-md"
                        />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-ios-text dark:text-white">
                        GBC <span className="text-[#EBBB03]">GAMING</span>
                    </h1>
                    <p className="text-xs font-semibold text-[#00361F] dark:text-[#EBBB03] uppercase tracking-wider mt-1">
                        GBC GAMING, C.A. • J-500291221
                    </p>
                    <p className="text-sm text-ios-subtext mt-1.5 font-medium">
                        Sistema Central Financiero y Operativo
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Correo electrónico"
                            className="w-full px-4 py-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-[#00361F] dark:focus:border-[#EBBB03] focus:ring-2 focus:ring-[#00361F]/20 dark:focus:ring-[#EBBB03]/20 focus:bg-white dark:focus:bg-[#0C1C13] text-ios-text dark:text-white outline-none transition-all placeholder:text-ios-subtext/60"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            className="w-full px-4 py-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-[#00361F] dark:focus:border-[#EBBB03] focus:ring-2 focus:ring-[#00361F]/20 dark:focus:ring-[#EBBB03]/20 focus:bg-white dark:focus:bg-[#0C1C13] text-ios-text dark:text-white outline-none transition-all placeholder:text-ios-subtext/60"
                        />
                    </div>

                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#00361F] hover:bg-[#004D2C] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-[#00361F]/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 border border-[#EBBB03]/30"
                    >
                        {loading ? 'Conectando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-ios-subtext dark:text-gray-400 space-y-1">
                    <p className="font-semibold text-ios-text dark:text-gray-300">GBC GAMING, C.A. © 2026</p>
                    <p className="text-[11px] opacity-75">Todos los derechos reservados</p>
                </div>
            </div>
        </div>
    );
};
