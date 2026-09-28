import { FileText, Clock, Scale } from 'lucide-react';
import { FilterPreset } from '../hooks/useCollectionsFilter';
import { WeeklyFilterBar } from '../../../components/WeeklyFilterBar';

interface Props {
    activeTab: 'list' | 'balance' | 'approvals' | 'stats';
    setActiveTab: (tab: 'list' | 'balance' | 'approvals' | 'stats') => void;
    pendingCount: number;
    filterPreset: FilterPreset;
    setFilterPreset: (preset: FilterPreset) => void;
    rangeStart: string;
    rangeEnd: string;
    snapToWeek: (dateStr: string) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
}

export const CollectionFilters = ({
    activeTab, setActiveTab, pendingCount,
    filterPreset, setFilterPreset,
    rangeStart, rangeEnd, snapToWeek,
    searchQuery, setSearchQuery
}: Props) => {
    return (
        <div className="glass-panel p-4 rounded-2xl space-y-3">
            {/* Fila 1: Tabs + Busqueda */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl overflow-x-auto no-scrollbar w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                    >
                        <FileText size={15} /> Lista de Cobros
                    </button>
                    <button
                        onClick={() => setActiveTab('balance')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'balance' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                    >
                        <Scale size={15} /> Balance
                    </button>
                    <button
                        onClick={() => setActiveTab('approvals')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                    >
                        <Clock size={15} /> Pendientes
                        {pendingCount > 0 && (
                            <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'stats' ? 'bg-white dark:bg-black/80 shadow-sm text-ios-text' : 'text-ios-subtext hover:text-ios-text'}`}
                    >
                        <span className="text-lg leading-none">📊</span> Estadísticas
                    </button>
                </div>

                {/* Search input inline with tabs on desktop */}
                <input
                    type="search"
                    placeholder="Buscar vendedor..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm border border-black/10 dark:border-white/10 outline-none focus:ring-1 focus:ring-ios-blue/50 w-full sm:w-48"
                />
            </div>

            {/* Fila 2: Filtros de tiempo */}
            <div className="flex flex-wrap items-center gap-2">
                <WeeklyFilterBar
                    filterPreset={filterPreset}
                    setFilterPreset={setFilterPreset}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    snapToWeek={snapToWeek}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    hideSearch
                />
            </div>
        </div>
    );
};
