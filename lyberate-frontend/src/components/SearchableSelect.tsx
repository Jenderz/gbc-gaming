import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface Props {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const SearchableSelect = ({ options, value, onChange, placeholder = 'Seleccionar...', disabled = false }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(() => {
        if (!searchQuery) return options;
        const q = searchQuery.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, searchQuery]);

    const selectedOption = options.find(o => String(o.value) === String(value));

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-xl bg-black/20 text-white border border-transparent focus:border-ios-blue/50 outline-none transition-all flex justify-between items-center text-sm font-medium ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span className={value ? "text-white text-left truncate" : "text-white/50 text-left"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-[999] overflow-hidden">
                    <div className="p-2 border-b border-white/10">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-black/20 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-ios-blue/50"
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto flex flex-col no-scrollbar pb-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-white/10 focus:bg-white/10 text-sm font-medium transition-colors border-none outline-none ${String(value) === String(option.value) ? 'text-ios-blue bg-white/5 rounded-none' : 'text-white/90'}`}
                                >
                                    {option.label}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-white/50 text-center">
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
