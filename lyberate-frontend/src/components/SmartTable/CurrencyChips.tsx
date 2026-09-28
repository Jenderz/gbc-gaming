/**
 * CurrencyChips — Filtro de moneda reutilizable.
 * Renderiza chips seleccionables para filtrar por moneda.
 * El chip "Todas" siempre aparece primero y representa sin filtro.
 *
 * @example
 * <CurrencyChips
 *   currencies={['USD', 'Bs.', 'COP']}
 *   selected={currencyFilter}
 *   onSelect={setCurrencyFilter}
 * />
 */
interface CurrencyChipsProps {
    currencies: string[];
    selected: string;
    onSelect: (currency: string) => void;
    /** Label para la opción "sin filtro". Default: "Todas" */
    allLabel?: string;
}

const CURRENCY_COLORS: Record<string, { active: string; idle: string }> = {
    USD:             { active: 'bg-green-500 text-white border-green-500 shadow-green-500/20', idle: 'text-green-600 dark:text-green-400 border-green-500/20 bg-green-500/8 hover:bg-green-500/15' },
    DOLAR:           { active: 'bg-green-500 text-white border-green-500 shadow-green-500/20', idle: 'text-green-600 dark:text-green-400 border-green-500/20 bg-green-500/8 hover:bg-green-500/15' },
    'Bs.':           { active: 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20', idle: 'text-orange-600 dark:text-orange-400 border-orange-500/20 bg-orange-500/8 hover:bg-orange-500/15' },
    'BOLIVARES VENEZOLANOS': { active: 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20', idle: 'text-orange-600 dark:text-orange-400 border-orange-500/20 bg-orange-500/8 hover:bg-orange-500/15' },
    'BOLIVAR':       { active: 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20', idle: 'text-orange-600 dark:text-orange-400 border-orange-500/20 bg-orange-500/8 hover:bg-orange-500/15' },
    COP:             { active: 'bg-yellow-500 text-white border-yellow-500 shadow-yellow-500/20', idle: 'text-yellow-600 dark:text-yellow-400 border-yellow-500/20 bg-yellow-500/8 hover:bg-yellow-500/15' },
    'PESO COLOMBIANA': { active: 'bg-yellow-500 text-white border-yellow-500 shadow-yellow-500/20', idle: 'text-yellow-600 dark:text-yellow-400 border-yellow-500/20 bg-yellow-500/8 hover:bg-yellow-500/15' },
};

const DEFAULT_COLORS = {
    active: 'bg-ios-blue text-white border-ios-blue shadow-ios-blue/20',
    idle: 'text-ios-subtext border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10',
};

export const CurrencyChips = ({
    currencies,
    selected,
    onSelect,
    allLabel = 'Todas',
}: CurrencyChipsProps) => {
    if (currencies.length === 0) return null;

    const chipBase = 'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm select-none cursor-pointer';

    const handleClick = (cur: string) => {
        // Clic en el mismo chip activo → deseleccionar (volver a "ALL")
        onSelect(cur === selected ? 'ALL' : cur);
    };

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {/* Chip "Todas" */}
            <button
                onClick={() => onSelect('ALL')}
                className={`${chipBase} ${selected === 'ALL'
                    ? 'bg-ios-blue text-white border-ios-blue shadow-ios-blue/20'
                    : 'text-ios-subtext border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
            >
                {allLabel}
            </button>

            {/* Chips de moneda */}
            {currencies.map(cur => {
                const colors = CURRENCY_COLORS[cur] ?? DEFAULT_COLORS;
                const isActive = selected === cur;
                return (
                    <button
                        key={cur}
                        onClick={() => handleClick(cur)}
                        className={`${chipBase} ${isActive ? colors.active : colors.idle}`}
                    >
                        {cur}
                    </button>
                );
            })}
        </div>
    );
};
