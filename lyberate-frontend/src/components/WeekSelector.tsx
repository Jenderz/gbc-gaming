import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, TrendingUp } from 'lucide-react';
import { WeekPeriod } from '../services/apiService';

interface WeekSelectorProps {
    periods: WeekPeriod[];
    selectedId: string;
    onSelect: (id: string) => void;
    variant?: 'dashboard' | 'simple';
}

export const WeekSelector = ({ periods, selectedId, onSelect, variant = 'dashboard' }: WeekSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedPeriod = periods.find(p => p.id === selectedId);

    const filteredPeriods = useMemo(() => {
        if (!search.trim()) return periods;
        const q = search.toLowerCase();
        return periods.filter(p => p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }, [periods, search]);

    return (
        <div className="relative z-30" ref={dropdownRef}>
            {variant === 'dashboard' ? (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 bg-white dark:bg-[#1c1c1e] px-4 py-2.5 rounded-2xl border border-black/5 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-md transition-all active:scale-95 group w-full sm:w-auto min-w-[240px]"
                >
                    <div className="bg-ios-blue/10 flex items-center justify-center w-8 h-8 rounded-xl text-ios-blue shadow-sm">
                        <TrendingUp size={16} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-widest leading-none mb-1">Semana Fiscal</p>
                        <p className="text-sm font-bold text-ios-text leading-none truncate">
                            {selectedPeriod ? selectedPeriod.label : 'Seleccionar...'}
                        </p>
                    </div>
                    <ChevronDown size={14} className={`text-ios-subtext transition-transform duration-300 ml-1 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between gap-2 px-4 py-2 bg-white dark:bg-black/50 border border-black/5 dark:border-white/5 rounded-xl text-sm font-semibold hover:bg-black/5 transition-colors min-w-[220px]"
                >
                    <span className="truncate">
                        {selectedPeriod ? selectedPeriod.label : 'Seleccionar Semana...'}
                    </span>
                    <ChevronDown size={14} className={`text-ios-subtext transition-transform duration-300 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            )}

            {isOpen && (
                <div className={`absolute ${variant === 'dashboard' ? 'right-0' : 'right-0 sm:left-0'} top-[calc(100%+8px)] w-full sm:w-[320px] bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden animate-fade-in origin-top`}>
                    <div className="p-3 bg-ios-bg/50 dark:bg-black/20 border-b border-black/5 dark:border-white/5">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-subtext" />
                            <input
                                type="text"
                                placeholder="Buscar mes o día..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 bg-white dark:bg-[#1c1c1e] border border-black/10 dark:border-white/10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ios-blue/50"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2.5 no-scrollbar space-y-1">
                        {filteredPeriods.length === 0 ? (
                            <div className="text-center py-6 text-ios-subtext">
                                <p className="text-sm font-semibold">No se encontraron semanas</p>
                            </div>
                        ) : (
                            filteredPeriods.map((p) => {
                                const isSelected = p.id === selectedId;
                                const isCurrent = periods.findIndex(orig => orig.id === p.id) === 0;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            onSelect(p.id);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`w-full text-left flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm transition-all ${isSelected ? 'bg-ios-blue text-white font-bold shadow-md shadow-ios-blue/20' : 'hover:bg-ios-bg dark:hover:bg-white/5 text-ios-text font-medium'}`}
                                    >
                                        <span className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                                            <span>{p.label}</span>
                                            {isCurrent && <span className={`self-start text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-widest ${isSelected ? 'bg-white/20 text-white' : 'bg-ios-blue/10 text-ios-blue'}`}>Actual</span>}
                                        </span>
                                        {isSelected && <Check size={16} className={isSelected ? 'text-white' : 'text-ios-blue'} />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
