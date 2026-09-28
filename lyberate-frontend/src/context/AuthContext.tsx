import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    AppUser,
    loginUser,
    loadSession,
    clearSession,
    initLocalStore,
} from '../services/apiService';

// Re-export for convenience
export type { AppUser };
export type Role = AppUser['role'];

interface AuthContextType {
    user: AppUser | null;
    login: (email: string, password: string) => Promise<AppUser | null>;
    logout: () => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isVendedor: boolean;
    isAgency: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    // On mount: restore session from JWT
    useEffect(() => {
        initLocalStore(); // no-op for API mode
        const restoreSession = async () => {
            try {
                const session = await loadSession();
                if (session) setUser(session);
            } catch {
                // token invalid or expired
            } finally {
                setLoading(false);
            }
        };
        restoreSession();
    }, []);

    const login = async (email: string, password: string): Promise<AppUser> => {
        const found = await loginUser(email, password);
        setUser(found);
        return found;
    };

    const logout = () => {
        setUser(null);
        clearSession();
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'Admin' || user?.role === 'Supervisor',
            isVendedor: user?.role === 'Vendedor',
            isAgency: user?.role === 'Vendedor' && !!user?.isAgency,
            loading,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
