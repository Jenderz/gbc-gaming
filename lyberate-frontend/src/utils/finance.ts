/**
 * Utility functions for precise financial calculations and currency formatting.
 */

/**
 * Rounds a number to exactly 2 decimal places to avoid floating point precision issues.
 * E.g., 0.1 + 0.2 = 0.30000000000000004 -> roundFinance(0.1 + 0.2) = 0.3
 */
export const roundFinance = (value: number): number => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Returns the corresponding currency symbol given a currency name.
 */
export const getSymbol = (currencyName: string = ''): string => {
    const lower = currencyName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower.includes('bolivar') || lower.includes('bs') || lower.includes('ves')) return 'Bs. ';
    if (lower.includes('peso') || lower.includes('cop')) return 'COP ';
    return '$';
};
