import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getWeekBounds } from '../hooks/useWeeklyFilter';

interface WeekPickerInputProps {
    value: string;               // "YYYY-MM-DD"
    onChange: (date: string) => void;
    label?: string;
    /** Variant for modal backgrounds (dark glass) */
    variant?: 'default' | 'modal';
}

const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const toISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

const formatWeekRange = (start: Date, end: Date): string => {
    const s = start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const e = end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${s} — ${e}`;
};

export const WeekPickerInput = ({
    value,
    onChange,
    variant = 'default',
}: WeekPickerInputProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => {
        const d = value ? new Date(value + 'T12:00:00') : new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // Selected week bounds
    const selectedWeek = useMemo(() => {
        if (!value) return null;
        return getWeekBounds(new Date(value + 'T12:00:00'));
    }, [value]);

    // Build calendar grid for the current viewMonth
    const calendarDays = useMemo(() => {
        const { year, month } = viewMonth;
        const firstOfMonth = new Date(year, month, 1);

        // Monday = 0, Sunday = 6  (shift JS getDay where 0=Sun)
        const startDow = (firstOfMonth.getDay() + 6) % 7;

        // We need to go back to the previous Monday
        const gridStart = new Date(firstOfMonth);
        gridStart.setDate(gridStart.getDate() - startDow);

        // Build 6 weeks (42 days) to always fill the grid
        const days: Date[] = [];
        const cursor = new Date(gridStart);
        for (let i = 0; i < 42; i++) {
            days.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }

        // Group into weeks of 7
        const weeks: Date[][] = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }

        // Only show weeks that have at least one day in the current month
        return weeks.filter(week =>
            week.some(d => d.getMonth() === month)
        );
    }, [viewMonth]);

    const handleDayClick = (day: Date) => {
        const { start } = getWeekBounds(day);
        onChange(toISO(start));
        setIsOpen(false);
    };

    const prevMonth = () => {
        setViewMonth(prev => {
            const m = prev.month - 1;
            return m < 0
                ? { year: prev.year - 1, month: 11 }
                : { year: prev.year, month: m };
        });
    };

    const nextMonth = () => {
        setViewMonth(prev => {
            const m = prev.month + 1;
            return m > 11
                ? { year: prev.year + 1, month: 0 }
                : { year: prev.year, month: m };
        });
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isModal = variant === 'modal';

    const displayText = selectedWeek
        ? formatWeekRange(selectedWeek.start, selectedWeek.end)
        : 'Seleccionar semana...';

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${isModal
                    ? 'bg-black/20 text-white border border-transparent hover:border-ios-blue/30'
                    : 'bg-black/5 dark:bg-white/5 text-ios-text border border-black/10 dark:border-white/10 hover:border-ios-blue/30'
                    }`}
            >
                <Calendar size={14} className={isModal ? 'text-white/50' : 'text-ios-subtext'} />
                <span className={`flex-1 truncate ${!selectedWeek ? (isModal ? 'text-white/40' : 'text-ios-subtext') : ''}`}>
                    {displayText}
                </span>
            </button>

            {/* Calendar dropdown */}
            {isOpen && (
                <div
                    className={`absolute z-[100] top-[calc(100%+6px)] left-0 w-[300px] rounded-2xl shadow-2xl border overflow-hidden animate-fade-in ${isModal
                        ? 'bg-[#1c1c1e] border-white/10'
                        : 'bg-white dark:bg-[#1c1c1e] border-black/5 dark:border-white/10'
                        }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <ChevronLeft size={16} className={isModal ? 'text-white/70' : 'text-ios-subtext'} />
                        </button>
                        <span className={`text-sm font-bold ${isModal ? 'text-white' : 'text-ios-text'}`}>
                            {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
                        </span>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <ChevronRight size={16} className={isModal ? 'text-white/70' : 'text-ios-subtext'} />
                        </button>
                    </div>

                    {/* Day names */}
                    <div className="grid grid-cols-7 px-2 pt-2">
                        {DAY_NAMES.map(d => (
                            <div key={d} className={`text-center text-[10px] font-bold uppercase tracking-wider py-1 ${isModal ? 'text-white/40' : 'text-ios-subtext'}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="px-2 pb-3 pt-1">
                        {calendarDays.map((week, wi) => {
                            // Determine if this whole week is the selected week
                            const weekMon = week[0]; // Monday
                            const isSelectedWeek = selectedWeek
                                ? toISO(weekMon) === toISO(selectedWeek.start)
                                : false;

                            return (
                                <div
                                    key={wi}
                                    onClick={() => handleDayClick(week[0])}
                                    className={`grid grid-cols-7 rounded-xl cursor-pointer transition-all duration-150 ${isSelectedWeek
                                        ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20'
                                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {week.map((day, di) => {
                                        const isCurrentMonth = day.getMonth() === viewMonth.month;
                                        const isToday = toISO(day) === toISO(today);

                                        return (
                                            <div
                                                key={di}
                                                className={`
                                                    text-center py-2 text-xs font-semibold transition-colors relative
                                                    ${isSelectedWeek
                                                        ? 'text-white'
                                                        : isCurrentMonth
                                                            ? (isModal ? 'text-white/90' : 'text-ios-text')
                                                            : (isModal ? 'text-white/20' : 'text-ios-subtext/40')
                                                    }
                                                `}
                                            >
                                                {isToday && !isSelectedWeek && (
                                                    <span className="absolute inset-0 flex items-center justify-center">
                                                        <span className="w-6 h-6 rounded-full bg-ios-blue/15 border border-ios-blue/30" />
                                                    </span>
                                                )}
                                                <span className="relative">{day.getDate()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer hint */}
                    <div className={`px-4 py-2 border-t text-[10px] font-medium ${isModal
                        ? 'border-white/5 text-white/30'
                        : 'border-black/5 dark:border-white/5 text-ios-subtext'
                        }`}>
                        Clic en cualquier día para seleccionar la semana completa (Lun–Dom)
                    </div>
                </div>
            )}
        </div>
    );
};
