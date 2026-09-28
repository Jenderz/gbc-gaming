import { FilterPreset } from '../hooks/useWeeklyFilter';

interface WeeklyFilterBarProps {
    filterPreset: FilterPreset;
    setFilterPreset: (preset: FilterPreset) => void;
    rangeStart: string;
    rangeEnd: string;
    snapToWeek: (dateStr: string) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    filterLabel?: string;
    searchPlaceholder?: string;
    /** Ocultar el input de búsqueda (ej. si el módulo ya lo tiene aparte) */
    hideSearch?: boolean;
}

const PRESET_LABELS: Record<string, string> = {
    today: 'Hoy',
    week: 'Esta semana',
    month: 'Este mes',
    all: 'Todo',
};

export const WeeklyFilterBar = ({
    filterPreset, setFilterPreset,
    rangeStart, rangeEnd, snapToWeek,
    searchQuery, setSearchQuery,
    searchPlaceholder = 'Buscar vendedor...',
    hideSearch = false,
}: WeeklyFilterBarProps) => {
    return (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Preset buttons */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                {(['today', 'week', 'month', 'all'] as FilterPreset[]).map(fp => (
                    <button
                        key={fp}
                        onClick={() => setFilterPreset(fp)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterPreset === fp
                                ? 'bg-ios-blue text-white shadow-sm'
                                : 'text-ios-subtext hover:text-ios-text'
                            }`}
                    >
                        {PRESET_LABELS[fp]}
                    </button>
                ))}
                <button
                    onClick={() => setFilterPreset('range')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterPreset === 'range'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-ios-subtext hover:text-ios-text'
                        }`}
                >
                    📅 Rango
                </button>
            </div>

            {/* Week-snap date pickers */}
            {filterPreset === 'range' && (
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={rangeStart}
                        onChange={e => snapToWeek(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-medium border border-black/10 dark:border-white/10 outline-none focus:ring-1 focus:ring-ios-blue/50"
                    />
                    <span className="text-ios-subtext text-xs">al</span>
                    <input
                        type="date"
                        value={rangeEnd}
                        onChange={e => snapToWeek(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-medium border border-black/10 dark:border-white/10 outline-none focus:ring-1 focus:ring-ios-blue/50"
                    />
                </div>
            )}

            {/* Search input */}
            {!hideSearch && (
                <input
                    type="search"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-sm border border-black/10 dark:border-white/10 outline-none focus:ring-1 focus:ring-ios-blue/50 w-full sm:w-44"
                />
            )}
        </div>
    );
};
