/**
 * Utilidades de normalización canónica para el importador de ventas.
 * Estandariza nombres de productos, monedas y vendedores para evitar discrepancias
 * de formato (mayúsculas/minúsculas, tildes, sufijos, espacios y variantes).
 */

export const CANONICAL_CURRENCIES = {
    DOLAR: 'DOLAR',
    BOLIVARES: 'BOLIVARES VENEZOLANOS',
    PESO: 'PESO COLOMBIANA',
} as const;

export type CanonicalCurrency = typeof CANONICAL_CURRENCIES[keyof typeof CANONICAL_CURRENCIES];

/**
 * Normaliza cualquier variante de moneda al formato canónico oficial del sistema.
 */
export function normalizeCurrency(raw?: string | null): CanonicalCurrency {
    if (!raw) return CANONICAL_CURRENCIES.DOLAR;
    const clean = raw.trim().toUpperCase();

    if (
        clean.includes('BOLIVAR') ||
        clean.includes('VES') ||
        clean === 'BS' ||
        clean.startsWith('BS.') ||
        clean.startsWith('BS ') ||
        /[\s_\-]BS(\.[A-Z0-9]+)?$/i.test(clean) ||
        clean.includes('REPORT BS')
    ) {
        return CANONICAL_CURRENCIES.BOLIVARES;
    }

    if (
        clean.includes('COP') ||
        clean.includes('PESO') ||
        clean.includes('PESOS') ||
        clean.includes('COLOMB')
    ) {
        return CANONICAL_CURRENCIES.PESO;
    }

    return CANONICAL_CURRENCIES.DOLAR;
}

/**
 * Normaliza nombres de productos y modalidades de juego.
 * Identifica con precisión las distintas modalidades de Parley:
 *   - PARLEY 2  (2 logros: "Parley 2l", "Parley 2", "Parley 2 logros")
 *   - PARLEY 3  (3 logros: "Parley 3l", "Parley 3", "Parley 3 logros")
 *   - PARLEY 4+ (4 o más logros: "Parley 4+", "Parley 4", "Parley 4l")
 *   - PARLEY PD (Premio Directo / Derecho: "Parley PD", "Derecho", "Ventas por Derecho")
 */
export function normalizeProductName(raw?: string | null): string {
    if (!raw) return 'PARLEY';
    let s = raw.trim().toUpperCase().replace(/\s+/g, ' ');

    // 1. Detección y normalización de modalidades de Parley
    if (s.includes('PARLEY') || s.includes('DERECHO') || s.startsWith('PD') || s.includes('INH')) {
        // Parley INH (Instituto Nacional de Hipódromos)
        if (s.includes('INH')) {
            return 'PARLEY INH';
        }
        // Parley 4 o más
        if (s.includes('4+') || s.includes('4 +') || /\b4\s*L\b/i.test(s) || /\b4\s*LOGROS?\b/i.test(s)) {
            return 'PARLEY 4+';
        }
        // Parley 3
        if (/\b3\s*L\b/i.test(s) || /\b3\s*LOGROS?\b/i.test(s) || s === 'PARLEY 3' || s === 'PARLEY 3L') {
            return 'PARLEY 3';
        }
        // Parley 2
        if (/\b2\s*L\b/i.test(s) || /\b2\s*LOGROS?\b/i.test(s) || s === 'PARLEY 2' || s === 'PARLEY 2L') {
            return 'PARLEY 2';
        }
        // Parley Premio Directo / Derecho
        if (
            s.includes('PD') ||
            s.includes('DERECHO') ||
            s.includes('DIRECTO') ||
            s === 'PARLEY PD' ||
            s === 'VENTAS POR DERECHO'
        ) {
            return 'PARLEY PD';
        }
        // Parley genérico
        return 'PARLEY';
    }

    // 2. Otros productos conocidos
    if (s.includes('BETM3')) return 'PARLEY BETM3';
    if (s.includes('LOTOREY') || s.includes('LOTERIAS') || s.includes('BANKLOT')) return 'LOTERIAS';
    if (s.includes('ANIMALITO')) return 'ANIMALITOS';
    if (s.includes('MAXPLAY')) return 'MAXPLAY';
    if (s.includes('GALILEO')) return 'GALILEO';
    if (s.includes('POSNET')) return 'POSNET';
    if (s.includes('GATO')) return 'GATO';
    if (s.includes('NACIONAL')) return 'NACIONALES';
    if (s.includes('AMERICAN')) return 'AMERICANAS';
    if (s.includes('WORLDDEPORTE') || s.includes('MASTERGREEN') || s.includes('ADMINWD')) return 'WORLDDEPORTES';

    // Eliminar tildes y caracteres extraños
    return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Normaliza nombres de vendedores y agencias (espacios colapsados, mayúsculas, sin tildes residuales).
 */
export function normalizeSellerName(raw?: string | null): string {
    if (!raw) return '';
    return raw
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ');
}

/**
 * Construye una llave única y determinística para combinaciones de Vendedor + Producto + Moneda.
 */
export function buildConfigKey(seller: string, product: string, currency: string): string {
    return `${normalizeSellerName(seller)}|${normalizeProductName(product)}|${normalizeCurrency(currency)}`;
}

/**
 * Plantillas de porcentajes por defecto sugeridos según el tipo de producto/modalidad.
 * Evita que productos no configurados previamente aparezcan en 0% obligando a reescribirlos.
 */
export const DEFAULT_PRODUCT_PERCENTAGES: Record<string, { commissionPct: number; partPct: number }> = {
    'PARLEY 2':   { commissionPct: 12, partPct: 10 },
    'PARLEY 3':   { commissionPct: 14, partPct: 10 },
    'PARLEY 4+':  { commissionPct: 10, partPct: 10 },
    'PARLEY PD':  { commissionPct: 15, partPct: 10 },
    'PARLEY':     { commissionPct: 12, partPct: 10 },
    'PARLEY INH': { commissionPct: 12, partPct: 10 },
    'PARLEY BETM3':{ commissionPct: 12, partPct: 10 },
    'LOTERIAS':   { commissionPct: 10, partPct: 0  },
    'ANIMALITOS': { commissionPct: 10, partPct: 0  },
    'AMERICANAS': { commissionPct: 10, partPct: 10 },
    'MAXPLAY':    { commissionPct: 12, partPct: 10 },
    'GALILEO':    { commissionPct: 10, partPct: 0  },
    'POSNET':     { commissionPct: 10, partPct: 0  },
    'GATO':       { commissionPct: 10, partPct: 0  },
    'NACIONALES': { commissionPct: 10, partPct: 10 },
    'WORLDDEPORTES': { commissionPct: 12, partPct: 10 },
};

/**
 * Obtiene la configuración por defecto para un producto dado, o un fallback seguro.
 */
export function findProductDefaults(productName: string): { commissionPct: number; partPct: number } {
    const norm = normalizeProductName(productName);
    return DEFAULT_PRODUCT_PERCENTAGES[norm] || { commissionPct: 10, partPct: 10 };
}
