// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'Admin' | 'Supervisor' | 'Vendedor' | 'Banca';

export interface AppUser {
    id: string;
    name: string;
    email: string;
    password: string; // plain text for local mode; replace with hash before going to production
    role: Role;
    sellerId?: string; // links to Seller.id
    agencyName?: string;
}

export interface SystemPrefs {
    companyName: string;
    ticketFooterMessage: string;
    riskLimitAlert: number;
    baseCurrency: string;
}

export interface CurrencyConfig {
    id: string;
    name: string;
    commissionPct: number;
    partPct: number;
}

export interface Product {
    id: string;
    name: string;
    currencies: CurrencyConfig[];
}

export interface Seller {
    id: string;
    name: string;
    idNumber?: string;
    phone?: string;
    products: Product[];
    createdAt: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'Transferencia' | 'Zelle' | 'Pago Móvil' | 'Efectivo' | 'Otro';
export type PaymentType = 'payment' | 'credit'; // 'payment': vendedor paga a banca; 'credit': banca debe al vendedor

export interface Payment {
    id: string;
    vendorId: string;       // AppUser.id
    vendorName: string;
    agencyName?: string;    // Deprecated / Optional
    sellerId: string;       // links to Seller.id
    week: string;           // label e.g. "Lun 17 Feb - Lun 24 Feb"
    weekId: string;         // identifier e.g. "week-0"
    amount: number;         // Siempre positivo (absoluto)
    currency: string;
    bank: string;
    method: PaymentMethod;
    reference: string;
    date: string;
    status: PaymentStatus;
    type?: PaymentType;     // 'payment' (default) o 'credit'
    proofImageBase64?: string; // base64 encoded image
    proofMimeType?: string;
    adminNote?: string;
    createdAt: string;      // ISO timestamp
    updatedAt: string;
}

// ─── Utility Imports ──────────────────────────────────────────────────────────
import { roundFinance } from '../utils/finance';

export interface Sale {
    id: string;
    sellerId: string;
    sellerName: string;
    agencyId?: string;    // Opcional: ID de agencia específica
    agencyName?: string;  // Opcional: nombre de agencia (null = consolidado)
    productId: string;
    productName: string;
    currencyId: string;
    currencyName: string;
    amount: number;       // Venta
    prize: number;        // Premio
    commission: number;   // Comisión calculada
    total: number;        // Venta - Premio - Comisión
    participation: number;// Participación calculada
    totalVendor: number;  // Comision + Participacion
    totalBank: number;    // Total - Participacion
    date: string;         // ISO date or simple YYYY-MM-DD
    weekId: string;       // Identifier for the week exactly
    registeredAt: string; // Exact ISO timestamp when form submitted
    createdAt: string;
}

// Agencia: directorio de sucursales de un vendedor
export interface Agency {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    sellerId: string;    // Seller al que pertenece
    sellerName: string;
    createdAt: string;
}

// Ticket de cierre semanal por vendedor y moneda
export interface WeeklyTicket {
    id: string;
    sellerId: string;
    sellerName: string;
    weekId: string;
    weekLabel: string;
    totalSales: number;       // Suma de amount
    totalPrize: number;       // Suma de prize
    totalCommission: number;  // Suma de commission
    totalNet: number;         // Suma de total
    totalParticipation: number;
    totalVendor: number;      // Lo que se queda el vendedor
    totalBank: number;        // Lo que le corresponde a la banca
    totalPaid: number;        // Pagos aprobados en la semana
    balance: number;          // totalBank - totalPaid (+ = vendedor debe; - = banca debe)
    currency: string;
    status: 'open' | 'settled' | 'pending';
    createdAt: string;
    updatedAt: string;
}

// Gasto operativo o fijo
export type ExpenseType = 'Operativo' | 'Nomina' | 'Servicios' | 'Otros';
export interface Expense {
    id: string;
    date: string;           // YYYY-MM-DD
    type: ExpenseType;
    concept: string;
    method: PaymentMethod;
    bank: string;
    amount: number;
    currency: string;       // 'USD' | 'Bs.' | 'COP'
    createdAt: string;
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
    USERS: 'lyberate_users',
    PAYMENTS: 'lyberate_payments',
    SELLERS: 'lyberate_sellers',
    SESSION: 'lyberate_session',
    CURRENCIES: 'lyberate_currencies',
    GLOBAL_PRODUCTS: 'lyberate_global_products',
    SALES: 'lyberate_sales',
    AGENCIES: 'lyberate_agencies',
    WEEKLY_TICKETS: 'lyberate_weekly_tickets',
    EXPENSES: 'lyberate_expenses',
    SYSTEM_PREFS: 'lyberate_system_prefs',
    SEEDED_V2: 'lyberate_seeded_v2',
} as const;

// ─── Weekly Period Utils (Central) ────────────────────────────────────────────

/** Convierte cualquier fecha (YYYY-MM-DD o Date) al weekId del lunes de esa semana.
 *  Formato: week-YYYY-MM-DD  e.g. "week-2026-02-23"
 */
export const dateToWeekId = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `week-${y}-${m}-${dd}`;
};

export interface WeekPeriod {
    id: string;       // "week-YYYY-MM-DD"
    label: string;    // "Lun 23 feb — Dom 01 mar"
    startDate: Date;  // Monday 00:00:00
    endDate: Date;    // Sunday 23:59:59.999
}

/** Genera períodos semanales Lun→Dom.
 *  - Incluye las últimas `defaultCount` semanas desde hoy.
 *  - También incluye cualquier semana adicional derivada de `extraDates`.
 *  - Ordenadas de más reciente a más antigua.
 */
export const getWeeklyPeriods = (extraDates: string[] = [], defaultCount = 8): WeekPeriod[] => {
    const weekIds = new Set<string>();

    // Generar últimas N semanas desde hoy
    const today = new Date();
    for (let i = 0; i < defaultCount; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i * 7);
        weekIds.add(dateToWeekId(d));
    }

    // Añadir semanas de fechas externas (ventas, pagos, etc.)
    for (const dateStr of extraDates) {
        if (dateStr) weekIds.add(dateToWeekId(dateStr));
    }

    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

    const periods: WeekPeriod[] = Array.from(weekIds).map(id => {
        // Parse date from id: "week-2026-02-23" → 2026-02-23
        const datePart = id.replace('week-', '');
        const start = new Date(datePart + 'T00:00:00');
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return {
            id,
            label: `Lun ${fmt(start)} — Dom ${fmt(end)}`,
            startDate: start,
            endDate: end,
        };
    });

    // Sort descending (most recent first)
    periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    return periods;
};


// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_SELLERS: Seller[] = [];

const SEED_USERS: AppUser[] = [
    {
        id: 'u-001',
        name: 'Admin Central',
        email: 'admin@lyberate.com',
        password: 'admin123',
        role: 'Admin',
    }
];

const SEED_PAYMENTS: Payment[] = [];

const SEED_SALES: Sale[] = [];

// ─── Functions ────────────────────────────────────────────────────────────────

// Initialize data if not present or seed updated required
export const initLocalStore = () => {
    const isSeeded = localStorage.getItem(KEYS.SEEDED_V2) === 'true';
    if (!isSeeded) {
        localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
        localStorage.setItem(KEYS.SELLERS, JSON.stringify(SEED_SELLERS));
        localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(SEED_PAYMENTS));
        localStorage.setItem(KEYS.CURRENCIES, JSON.stringify(['DOLAR', 'PESO COLOMBIANA', 'BOLIVARES VENEZOLANOS']));
        localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(['PARLEY INH', 'ANIMALITOS', 'LOTERIAS', 'AMERICANAS']));
        localStorage.setItem(KEYS.SALES, JSON.stringify(SEED_SALES));
        localStorage.setItem(KEYS.AGENCIES, JSON.stringify([]));
        localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify([]));
        localStorage.setItem(KEYS.EXPENSES, JSON.stringify([]));
        localStorage.setItem(KEYS.SYSTEM_PREFS, JSON.stringify({
            companyName: 'GBC GAMING',
            ticketFooterMessage: '¡Gracias por su jugada! El ticket caduca a los 3 días.',
            riskLimitAlert: 500,
            baseCurrency: 'DOLAR',
        }));
        localStorage.setItem(KEYS.SEEDED_V2, 'true');
    } else {
        // Ensure properties exist for older seeded data
        if (!localStorage.getItem(KEYS.USERS) || JSON.parse(localStorage.getItem(KEYS.USERS) || '[]').length === 0) {
            localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
        }
        if (!localStorage.getItem(KEYS.CURRENCIES)) {
            localStorage.setItem(KEYS.CURRENCIES, JSON.stringify(['DOLAR', 'PESO COLOMBIANA', 'BOLIVARES VENEZOLANOS']));
        }
        if (!localStorage.getItem(KEYS.GLOBAL_PRODUCTS)) {
            localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(['PARLEY INH', 'ANIMALITOS', 'LOTERIAS', 'AMERICANAS']));
        }
        // Migración automática de PARLEY BETM3 -> PARLEY INH en localStorage
        try {
            const rawProds = localStorage.getItem(KEYS.GLOBAL_PRODUCTS);
            if (rawProds && rawProds.includes('PARLEY BETM3')) {
                const list = JSON.parse(rawProds).map((p: string) => p === 'PARLEY BETM3' ? 'PARLEY INH' : p);
                localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(Array.from(new Set(list))));
            }
            const rawSellers = localStorage.getItem(KEYS.SELLERS);
            if (rawSellers && rawSellers.includes('PARLEY BETM3')) {
                const sList = JSON.parse(rawSellers);
                sList.forEach((s: any) => {
                    (s.products || []).forEach((p: any) => {
                        if (p.name === 'PARLEY BETM3') p.name = 'PARLEY INH';
                    });
                });
                localStorage.setItem(KEYS.SELLERS, JSON.stringify(sList));
            }
            const rawSales = localStorage.getItem(KEYS.SALES);
            if (rawSales && rawSales.includes('PARLEY BETM3')) {
                const slList = JSON.parse(rawSales);
                slList.forEach((sl: any) => {
                    if (sl.productName === 'PARLEY BETM3') sl.productName = 'PARLEY INH';
                });
                localStorage.setItem(KEYS.SALES, JSON.stringify(slList));
            }
        } catch (e) {
            console.warn('Error migrando PARLEY BETM3 en localStore:', e);
        }
        if (!localStorage.getItem(KEYS.SYSTEM_PREFS)) {
            localStorage.setItem(KEYS.SYSTEM_PREFS, JSON.stringify({
                companyName: 'GBC GAMING',
                ticketFooterMessage: '¡Gracias por su jugada! El ticket caduca a los 3 días.',
                riskLimitAlert: 500,
                baseCurrency: 'DOLAR',
            }));
        }
        if (!localStorage.getItem(KEYS.SALES)) {
            localStorage.setItem(KEYS.SALES, JSON.stringify([]));
        }
        if (!localStorage.getItem(KEYS.AGENCIES)) {
            localStorage.setItem(KEYS.AGENCIES, JSON.stringify([]));
        }
        if (!localStorage.getItem(KEYS.WEEKLY_TICKETS)) {
            localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify([]));
        }
        if (!localStorage.getItem(KEYS.EXPENSES)) {
            localStorage.setItem(KEYS.EXPENSES, JSON.stringify([]));
        }
    }
};

// ─── User Helpers ─────────────────────────────────────────────────────────────

export function getUsers(): AppUser[] {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
}

export function findUserByCredentials(email: string, password: string): AppUser | null {
    const users = getUsers();
    return users.find(u => u.email === email && u.password === password) ?? null;
}

export function addUser(user: Omit<AppUser, 'id'>): AppUser {
    const users = getUsers();
    const newUser = { ...user, id: `u-${Date.now()}` };
    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return newUser;
}

export function updateUser(updated: AppUser) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === updated.id);
    if (idx !== -1) {
        users[idx] = updated;
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
}

export function getUserBySellerId(sellerId: string): AppUser | undefined {
    return getUsers().find(u => u.sellerId === sellerId);
}

export function deleteUserBySellerId(sellerId: string) {
    let users = getUsers();
    users = users.filter(u => u.sellerId !== sellerId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function deleteUser(userId: string) {
    let users = getUsers();
    // Prevent deleting the very last admin for safety
    if (users.find(u => u.id === userId)?.role === 'Admin') {
        const adminCount = users.filter(u => u.role === 'Admin').length;
        if (adminCount <= 1) return false; // Prevent deletion
    }

    users = users.filter(u => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return true;
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

export function saveSession(user: AppUser) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
}

export function loadSession(): AppUser | null {
    const raw = localStorage.getItem(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
    localStorage.removeItem(KEYS.SESSION);
}

// ─── Seller Helpers ───────────────────────────────────────────────────────────

export function getSellers(): Seller[] {
    const raw: Seller[] = JSON.parse(localStorage.getItem(KEYS.SELLERS) || '[]');
    // Normalizar porcentajes a número (protección contra datos guardados como string)
    return raw.map(s => ({
        ...s,
        products: (s.products || []).map(p => ({
            ...p,
            currencies: (p.currencies || []).map(c => ({
                ...c,
                commissionPct: Number(c.commissionPct ?? 0),
                partPct: Number(c.partPct ?? 0),
            })),
        })),
    }));
}

export function addSeller(seller: Omit<Seller, 'id' | 'createdAt'>): Seller {
    const sellers = getSellers();
    const newSeller: Seller = {
        ...seller,
        id: `v-${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    sellers.push(newSeller);
    localStorage.setItem(KEYS.SELLERS, JSON.stringify(sellers));
    return newSeller;
}

export function updateSeller(updated: Seller) {
    const sellers = getSellers();
    const idx = sellers.findIndex(s => s.id === updated.id);
    if (idx === -1) return;
    sellers[idx] = updated;
    localStorage.setItem(KEYS.SELLERS, JSON.stringify(sellers));
}

export function deleteSeller(sellerId: string) {
    let sellers = getSellers();
    sellers = sellers.filter(s => s.id !== sellerId);
    localStorage.setItem(KEYS.SELLERS, JSON.stringify(sellers));
}

// ─── Payment Helpers ──────────────────────────────────────────────────────────

export const getPayments = (): Payment[] => {
    return JSON.parse(localStorage.getItem(KEYS.PAYMENTS) || '[]');
};

export function getPaymentsByVendor(vendorId: string): Payment[] {
    return getPayments().filter(p => p.vendorId === vendorId);
}

export const addPayment = (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const payments = getPayments();
    const newPayment: Payment = {
        ...payment,
        type: payment.type ?? 'payment',    // Default: pago normal
        amount: Math.abs(payment.amount),   // Siempre positivo
        id: `pay-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    payments.push(newPayment);
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));

    // Solo los pagos tipo 'payment' afectan el totalPaid del WeeklyTicket
    if (newPayment.status === 'approved' && newPayment.type !== 'credit') {
        applyPaymentToWeeklyTicket(newPayment);
    }

    return newPayment;
};

export const updatePaymentStatus = (paymentId: string, status: PaymentStatus, adminNote?: string) => {
    const payments = getPayments();
    const index = payments.findIndex(p => p.id === paymentId);
    if (index !== -1) {
        const payment = payments[index];
        const oldStatus = payment.status;

        payment.status = status;
        if (adminNote) payment.adminNote = adminNote;
        payment.updatedAt = new Date().toISOString();
        localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));

        // Solo los pagos tipo 'payment' afectan el WeeklyTicket
        if (payment.type !== 'credit') {
            if (oldStatus !== 'approved' && status === 'approved') {
                applyPaymentToWeeklyTicket(payment);
            } else if (oldStatus === 'approved' && status !== 'approved') {
                applyPaymentToWeeklyTicket(payment, true); // Reverse
            }
        }

        return true;
    }
    return false;
};

// Intentionally not exported, used internally
function applyPaymentToWeeklyTicket(payment: Payment, reverse = false) {
    const tickets: WeeklyTicket[] = JSON.parse(localStorage.getItem(KEYS.WEEKLY_TICKETS) || '[]');
    const idx = tickets.findIndex(
        t => t.sellerId === payment.sellerId && t.weekId === payment.weekId && t.currency === payment.currency
    );

    const amount = reverse ? -payment.amount : payment.amount;

    if (idx !== -1) {
        tickets[idx].totalPaid = roundFinance(tickets[idx].totalPaid + amount);
        tickets[idx].balance = roundFinance(tickets[idx].totalBank - tickets[idx].totalPaid);
        tickets[idx].updatedAt = new Date().toISOString();
        localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify(tickets));
    } else if (!reverse) {
        const newTicket: WeeklyTicket = {
            id: `wt-${Date.now()}`,
            sellerId: payment.sellerId,
            sellerName: payment.vendorName,
            weekId: payment.weekId,
            weekLabel: payment.week,
            totalSales: 0,
            totalPrize: 0,
            totalCommission: 0,
            totalNet: 0,
            totalParticipation: 0,
            totalVendor: 0,
            totalBank: 0,
            totalPaid: roundFinance(amount),
            balance: roundFinance(-amount),
            currency: payment.currency,
            status: 'open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        tickets.push(newTicket);
        localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify(tickets));
    }
}

// ─── System Preferences ──────────────────────────────────────────────────────────

export const getSystemPrefs = (): SystemPrefs => {
    return JSON.parse(localStorage.getItem(KEYS.SYSTEM_PREFS) || JSON.stringify({
        companyName: 'GBC GAMING',
        ticketFooterMessage: '¡Gracias por su jugada! El ticket caduca a los 3 días.',
        riskLimitAlert: 500,
        baseCurrency: 'DOLAR',
    }));
};

export const updateSystemPrefs = (prefs: SystemPrefs) => {
    localStorage.setItem(KEYS.SYSTEM_PREFS, JSON.stringify(prefs));
};

// --- Currencies ---

export const getAvailableCurrencies = (): string[] => {
    return JSON.parse(localStorage.getItem(KEYS.CURRENCIES) || '["DOLAR", "PESO COLOMBIANA", "BOLIVARES VENEZOLANOS"]');
};

export const addAvailableCurrency = (name: string) => {
    const currencies = getAvailableCurrencies();
    const upperName = name.trim().toUpperCase();
    if (upperName && !currencies.includes(upperName)) {
        currencies.push(upperName);
        localStorage.setItem(KEYS.CURRENCIES, JSON.stringify(currencies));
        return true;
    }
    return false;
};

export const deleteAvailableCurrency = (name: string) => {
    let currencies = getAvailableCurrencies();
    currencies = currencies.filter(c => c !== name);
    localStorage.setItem(KEYS.CURRENCIES, JSON.stringify(currencies));
};

// --- Global Products ---

export const getGlobalProducts = (): string[] => {
    let prods: string[] = JSON.parse(localStorage.getItem(KEYS.GLOBAL_PRODUCTS) || '["PARLEY INH", "ANIMALITOS", "LOTERIAS", "AMERICANAS"]');
    let modified = false;
    prods = prods.map(p => {
        if (p === 'PARLEY BETM3') {
            modified = true;
            return 'PARLEY INH';
        }
        return p;
    });
    prods = Array.from(new Set(prods));
    if (modified) {
        localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(prods));
    }
    return prods;
};

export const addGlobalProduct = (name: string) => {
    const products = getGlobalProducts();
    let upperName = name.trim().toUpperCase();
    if (upperName === 'PARLEY BETM3') upperName = 'PARLEY INH';
    if (upperName && !products.includes(upperName)) {
        products.push(upperName);
        localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(products));
        return true;
    }
    return false;
};

export const deleteGlobalProduct = (name: string) => {
    let products = getGlobalProducts();
    products = products.filter(p => p !== name);
    localStorage.setItem(KEYS.GLOBAL_PRODUCTS, JSON.stringify(products));
};

// --- Sales ---

export const getSales = (): Sale[] => {
    return JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
};

export const addSale = (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    const sales = getSales();
    const newSale: Sale = {
        ...sale,
        id: `sale-${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    sales.push(newSale);
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
    return newSale;
};

export const deleteSale = (saleId: string) => {
    const sales = getSales().filter(s => s.id !== saleId);
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
};

// ─── Agency Helpers ───────────────────────────────────────────────────────────

export const getAgencies = (): Agency[] => {
    return JSON.parse(localStorage.getItem(KEYS.AGENCIES) || '[]');
};

export const getAgenciesBySeller = (sellerId: string): Agency[] => {
    return getAgencies().filter(a => a.sellerId === sellerId);
};

export const addAgency = (agency: Omit<Agency, 'id' | 'createdAt'>): Agency => {
    const agencies = getAgencies();
    const newAgency: Agency = {
        ...agency,
        id: `agency-${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    agencies.push(newAgency);
    localStorage.setItem(KEYS.AGENCIES, JSON.stringify(agencies));
    return newAgency;
};

export const updateAgency = (updated: Agency) => {
    const agencies = getAgencies();
    const idx = agencies.findIndex(a => a.id === updated.id);
    if (idx !== -1) {
        agencies[idx] = updated;
        localStorage.setItem(KEYS.AGENCIES, JSON.stringify(agencies));
    }
};

export const deleteAgency = (agencyId: string) => {
    const agencies = getAgencies().filter(a => a.id !== agencyId);
    localStorage.setItem(KEYS.AGENCIES, JSON.stringify(agencies));
};

// ─── Weekly Ticket Helpers ────────────────────────────────────────────────────

export const getWeeklyTickets = (): WeeklyTicket[] => {
    return JSON.parse(localStorage.getItem(KEYS.WEEKLY_TICKETS) || '[]');
};

export const getWeeklyTicketsBySeller = (sellerId: string): WeeklyTicket[] => {
    return getWeeklyTickets().filter(t => t.sellerId === sellerId);
};

export const upsertWeeklyTicket = (ticket: Omit<WeeklyTicket, 'id' | 'createdAt' | 'updatedAt'>): WeeklyTicket => {
    const tickets = getWeeklyTickets();
    const existing = tickets.find(t => t.sellerId === ticket.sellerId && t.weekId === ticket.weekId && t.currency === ticket.currency);
    const now = new Date().toISOString();
    if (existing) {
        const updated = { ...existing, ...ticket, updatedAt: now };
        const idx = tickets.findIndex(t => t.id === existing.id);
        tickets[idx] = updated;
        localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify(tickets));
        return updated;
    }
    const newTicket: WeeklyTicket = {
        ...ticket,
        id: `wt-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
    };
    tickets.push(newTicket);
    localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify(tickets));
    return newTicket;
};

export const updateWeeklyTicketStatus = (ticketId: string, status: WeeklyTicket['status']) => {
    const tickets = getWeeklyTickets();
    const idx = tickets.findIndex(t => t.id === ticketId);
    if (idx !== -1) {
        tickets[idx].status = status;
        tickets[idx].updatedAt = new Date().toISOString();
        localStorage.setItem(KEYS.WEEKLY_TICKETS, JSON.stringify(tickets));
    }
};

// ─── Expense Helpers ──────────────────────────────────────────────────────────

export const getExpenses = (): Expense[] => {
    return JSON.parse(localStorage.getItem(KEYS.EXPENSES) || '[]');
};

export const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>): Expense => {
    const expenses = getExpenses();
    const newExpense: Expense = {
        ...expense,
        id: `exp-${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    expenses.push(newExpense);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    return newExpense;
};

export const deleteExpense = (expenseId: string) => {
    const expenses = getExpenses().filter(e => e.id !== expenseId);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
};

