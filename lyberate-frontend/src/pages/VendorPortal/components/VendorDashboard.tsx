import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Landmark, Receipt, ArrowUpCircle, ArrowDownCircle, BarChart2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { CurrencyStats } from '../hooks/useVendorStats';

interface VendorDashboardProps {
    statsByCurrency: CurrencyStats[];
    totalPendingGlobal: number;
    onAction: (type: 'payment' | 'credit') => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
    statsByCurrency, totalPendingGlobal, onAction
}) => {
    const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

    const toggleWeek = (key: string) => {
        setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (statsByCurrency.length === 0) {
        return (
            <div className="space-y-4 animate-fade-in pb-8">
                <div className="glass-panel p-10 rounded-2xl text-center text-ios-subtext">
                    <p className="font-semibold">No hay movimientos financieros aún.</p>
                    <p className="text-sm mt-1">Espera a que se registre tu primera venta o se genere tu primer ticket semanal.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in pb-8">

            {/* Ciclo por cada moneda que tenga movimientos */}
            {statsByCurrency.map((stats) => {
                const growth = stats.prevVenta > 0 ? ((stats.venta - stats.prevVenta) / stats.prevVenta) * 100 : null;
                const avgTicket = stats.count > 0 ? stats.venta / stats.count : 0;

                return (
                    <div key={stats.currency} className="space-y-4 pt-4 first:pt-0 first:border-0 border-t border-black/10 dark:border-white/10">

                        <div className="flex items-center gap-3 mb-4 pl-1 text-ios-text">
                            <div className="p-2 bg-ios-blue/10 rounded-xl">
                                <Wallet size={18} className="text-ios-blue" />
                            </div>
                            <h2 className="font-bold uppercase tracking-widest text-sm bg-clip-text text-transparent bg-gradient-to-r from-ios-blue to-purple-500">Resumen {stats.currency}</h2>
                        </div>

                        {/* Estado de Cuenta Específico */}
                        <div className={`p-6 rounded-[2rem] relative overflow-hidden flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${stats.netBalance > 0 ? 'bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/30' : stats.netBalance < 0 ? 'bg-gradient-to-br from-ios-green/20 to-emerald-500/10 border border-ios-green/30' : 'glass-panel border border-white/20'}`}>
                            {/* Decorative background blur */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-50 ${stats.netBalance > 0 ? 'bg-red-500' : stats.netBalance < 0 ? 'bg-ios-green' : 'bg-ios-blue'}`}></div>

                            <div className="flex items-center gap-4 relative z-10">
                                {stats.netBalance > 0
                                    ? <div className="p-3 bg-red-500/20 rounded-2xl animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"><ArrowUpCircle size={28} className="text-red-500" /></div>
                                    : <div className={`p-3 rounded-2xl ${stats.netBalance < 0 ? 'bg-ios-green/20' : 'bg-black/10 dark:bg-white/10'}`}><ArrowDownCircle size={28} className={stats.netBalance < 0 ? 'text-ios-green' : 'text-ios-subtext'} /></div>}
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-ios-subtext mb-1">Resumen General de tu Cuenta</p>
                                    {stats.netBalance > 0
                                        ? <div className="flex items-end justify-between mt-1">
                                            <div>
                                                <p className="font-semibold text-red-500/80 text-xs mb-0.5">Total a Pagar a la Agencia:</p>
                                                <p className="font-black text-red-500 text-3xl tracking-tight drop-shadow-sm">{stats.sym} {stats.debt.toFixed(2)}</p>
                                            </div>
                                            <button onClick={() => onAction('payment')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl text-sm shadow-[0_4px_15px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.6)] transition-all active:scale-95 group">
                                                <Wallet size={16} className="group-hover:animate-bounce-short" /> Pagar Ahora
                                            </button>
                                        </div>
                                        : stats.netBalance < 0
                                            ? <div>
                                                <p className="font-semibold text-ios-green/80 text-xs mb-0.5">Saldo a favor:</p>
                                                <p className="font-black text-ios-green text-3xl tracking-tight drop-shadow-sm">{stats.sym} {stats.positiveBalance.toFixed(2)}</p>
                                            </div>
                                            : <p className="font-bold text-ios-text text-lg mt-2">Sin deuda pendiente en {stats.currency}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Estadísticas rápidas específicas */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="glass-panel p-4 rounded-2xl text-center hover:bg-white/20 dark:hover:bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-ios-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <p className="text-[9px] font-bold text-ios-subtext uppercase tracking-widest relative z-10">Ventas Sem.</p>
                                <p className="text-xl font-black mt-1 tracking-tight relative z-10">{stats.sym}{stats.venta.toFixed(0)}</p>
                                {growth !== null && (
                                    <p className={`text-[10px] font-bold mt-1 inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md relative z-10 ${growth >= 0 ? 'bg-ios-green/10 text-ios-green' : 'bg-red-500/10 text-red-500'}`}>
                                        {growth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        {Math.abs(growth).toFixed(1)}%
                                    </p>
                                )}
                            </div>
                            <div className="glass-panel p-4 rounded-2xl text-center hover:bg-white/20 dark:hover:bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <p className="text-[9px] font-bold text-ios-subtext uppercase tracking-widest relative z-10">Promedio x Venta</p>
                                <p className="text-xl font-black mt-1 tracking-tight relative z-10">{stats.sym}{avgTicket.toFixed(0)}</p>
                                <p className="text-[10px] text-ios-subtext mt-1 font-medium bg-black/5 dark:bg-white/5 inline-block px-2 py-0.5 rounded-md relative z-10">{stats.count} clientes</p>
                            </div>
                            <div className="glass-panel p-4 rounded-2xl text-center hover:bg-white/20 dark:hover:bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden group border border-transparent hover:border-orange-500/20">
                                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <BarChart2 size={16} className={`${stats.PendingTicketsCount > 0 ? "text-orange-500" : "text-ios-green"} mx-auto mb-1 relative z-10`} />
                                <p className="text-[9px] font-bold text-ios-subtext uppercase tracking-widest relative z-10">Estatus</p>
                                <p className={`text-sm font-black mt-2 tracking-tight relative z-10 ${stats.PendingTicketsCount > 0 ? "text-orange-500" : "text-ios-green"}`}>{stats.PendingTicketsCount > 0 ? 'Con Deuda' : 'Al Día'}</p>
                            </div>
                        </div>

                        {/* KPI Mis Abonos Global */}
                        <div className="mt-6 mb-2">
                            <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group transition-all duration-300 shadow-sm border border-ios-green/20 dark:border-ios-green/10">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-ios-green to-emerald-400"></div>
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet size={40} /></div>
                                <div className="flex items-center gap-1.5 text-ios-subtext text-[10px] font-bold uppercase tracking-widest mb-2 relative z-10">
                                    <Wallet size={12} className="text-ios-green" /> Total Abonos Registrados
                                </div>
                                <p className="text-2xl font-black text-ios-text tracking-tight relative z-10">{stats.sym}{stats.totalPaidVendor.toFixed(2)}</p>
                                <p className="text-[10px] text-ios-subtext mt-1 relative z-10">Suma total de abonos aprobados por la agencia</p>
                            </div>
                        </div>

                        <div className="mt-8 mb-3 flex items-center justify-between pl-1">
                            <h2 className="text-sm font-bold text-ios-text uppercase tracking-widest">Desglose por Semanas</h2>
                        </div>

                        <div className="space-y-3">
                            {stats.weeks.map((week, index) => {
                                const isFirstWeek = index === 0;
                                const weekKey = `${stats.currency}-${week.weekId}`;
                                const isExpanded = expandedWeeks[weekKey] !== undefined ? expandedWeeks[weekKey] : isFirstWeek;
                                const isDebt = week.totalBanca >= 0;

                                return (
                                    <div key={week.weekId} className="glass-panel p-0 rounded-[1.5rem] overflow-hidden shadow-sm border border-black/5 dark:border-white/5 transition-all bg-white dark:bg-[#1C1C1E]">
                                        {/* Toggle Header */}
                                        <button 
                                            onClick={() => toggleWeek(weekKey)}
                                            className={`w-full text-left p-5 transition-all flex items-center justify-between ${isExpanded ? 'bg-ios-blue/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                        >
                                            <div>
                                                <p className={`font-black tracking-tight ${isExpanded ? 'text-ios-blue text-lg' : 'text-ios-text text-base'}`}>{week.weekLabel}</p>
                                                <p className="text-[10px] text-ios-subtext mt-1 uppercase tracking-widest font-bold">
                                                    {isDebt ? 'Deuda generada:' : 'Saldo a tu favor:'} <span className={`font-black ${isDebt ? 'text-red-500' : 'text-ios-green'}`}>{stats.sym} {Math.abs(week.totalBanca).toFixed(2)}</span>
                                                </p>
                                            </div>
                                            <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-ios-blue/10 text-ios-blue' : 'bg-black/5 dark:bg-white/5 text-ios-subtext'}`}>
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </button>

                                        {/* Content */}
                                        {isExpanded && (
                                            <div className="p-5 space-y-5 border-t border-black/5 dark:border-white/5 animate-fade-in bg-white/30 dark:bg-black/30">
                                                {/* KPI Cards Específicas */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="glass-panel p-5 rounded-[1.5rem] relative overflow-hidden group transition-all duration-300 shadow-sm border border-black/5 dark:border-white/5 hover:border-ios-green/30 hover:shadow-md bg-white dark:bg-[#1C1C1E]">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-ios-green to-emerald-400"></div>
                                                        <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity group-hover:-translate-y-1"><TrendingUp size={48} /></div>
                                                        <div className="flex items-center gap-2 text-ios-subtext text-[10px] font-bold uppercase tracking-widest mb-3 relative z-10">
                                                            <div className="p-1 rounded-md bg-ios-green/10">
                                                                <TrendingUp size={14} className="text-ios-green" />
                                                            </div>
                                                             Mis Ganancias
                                                        </div>
                                                        <p className="text-3xl font-black text-ios-text tracking-tight relative z-10">{stats.sym} {(week.totalVendedor || 0).toFixed(2)}</p>
                                                        <p className="text-xs text-ios-subtext mt-1 relative z-10 font-medium">De esta semana</p>
                                                    </div>

                                                    <div className="glass-panel p-5 rounded-[1.5rem] relative overflow-hidden group transition-all duration-300 shadow-sm border border-black/5 dark:border-white/5 hover:border-purple-500/30 hover:shadow-md bg-white dark:bg-[#1C1C1E]">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-purple-500 to-pink-500"></div>
                                                        <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity group-hover:-translate-y-1"><TrendingDown size={48} /></div>
                                                        <div className="flex items-center gap-2 text-ios-subtext text-[10px] font-bold uppercase tracking-widest mb-3 relative z-10">
                                                            <div className="p-1 rounded-md bg-purple-500/10">
                                                                <TrendingDown size={14} className="text-purple-600" />
                                                            </div>
                                                            Premios a Clientes
                                                        </div>
                                                        <p className="text-3xl font-black text-ios-text tracking-tight relative z-10">{stats.sym} {(week.premio || 0).toFixed(2)}</p>
                                                        <p className="text-xs text-ios-subtext mt-1 relative z-10 font-medium">Pagados desde mi caja</p>
                                                    </div>

                                                    <div className={`glass-panel p-6 rounded-[1.5rem] relative overflow-hidden group transition-all duration-300 shadow-sm col-span-1 sm:col-span-2 ${isDebt ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/40' : 'border-ios-green/20 bg-ios-green/5 hover:border-ios-green/40'} hover:shadow-md`}>
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${isDebt ? 'from-red-500 to-rose-400' : 'from-ios-green to-emerald-400'}`}></div>
                                                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity group-hover:scale-105"><Landmark size={64} /></div>
                                                        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 relative z-10 ${isDebt ? 'text-red-500/80' : 'text-ios-green/80'}`}>
                                                            <div className={`p-1 rounded-md ${isDebt ? 'bg-red-500/20' : 'bg-ios-green/20'}`}>
                                                                <Landmark size={14} className={isDebt ? 'text-red-600' : 'text-ios-green'} />
                                                            </div>
                                                            {isDebt ? 'Deuda Generada' : 'Abono de Agencia a tu favor'}
                                                        </div>
                                                        <p className="text-4xl font-black text-ios-text tracking-tight relative z-10">{stats.sym} {Math.abs(week.totalBanca || 0).toFixed(2)}</p>
                                                        <p className={`text-xs mt-2 relative z-10 font-bold uppercase tracking-widest ${isDebt ? 'text-red-600/70 dark:text-red-400/70' : 'text-ios-green/70 dark:text-ios-green/70'}`}>
                                                            {isDebt ? 'Lo que debes pagarle a la agencia' : 'Lo que la agencia debe reponerte'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Detalle proforma */}
                                                {(week.venta > 0 || week.premio > 0) && (
                                                    <div className="glass-panel p-6 rounded-[1.5rem] mt-6 border border-black/5 dark:border-white/5 relative overflow-hidden bg-white/60 dark:bg-black/20 shadow-inner">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-ios-blue/5 rounded-full blur-3xl"></div>
                                                        <h3 className="text-xs uppercase tracking-widest font-black mb-5 flex items-center gap-2 text-ios-text relative z-10">
                                                            <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10"><Receipt size={14} className="text-ios-blue" /></div>
                                                            Cálculo de la semana
                                                        </h3>
                                                        <div className="grid grid-cols-2 gap-y-3.5 text-sm relative z-10">
                                                            {[
                                                                { label: 'Lo que vendiste', value: week.venta, color: 'text-ios-text font-semibold' },
                                                                { label: 'Premios pagados', value: -week.premio, color: 'text-purple-600 font-semibold' },
                                                                { label: `Tu comisión`, value: -week.comision, color: 'text-purple-600 font-medium' },
                                                                { label: 'Quedó en Caja', value: week.total, color: 'font-black text-ios-text' },
                                                                { label: 'Participación Agencia', value: -week.part, color: 'text-red-500 font-semibold' },
                                                            ].map(({ label, value, color }) => (
                                                                <React.Fragment key={label}>
                                                                    <div className="text-ios-subtext text-xs font-semibold self-center">{label}</div>
                                                                    <div className={`text-right tracking-tight ${color || (value < 0 ? 'text-red-500' : 'text-ios-text')}`}>
                                                                        {value < 0 ? `-${stats.sym} ${Math.abs(value).toFixed(2)}` : `${stats.sym} ${value.toFixed(2)}`}
                                                                    </div>
                                                                </React.Fragment>
                                                            ))}
                                                            <div className="col-span-2 border-t border-black/10 dark:border-white/10 my-3" />
                                                            <div className="text-ios-green font-bold text-[10px] uppercase tracking-widest self-center">A tu favor</div>
                                                            <div className="text-right font-black text-ios-green text-xl tracking-tight self-center drop-shadow-sm">{stats.sym} {(week.totalVendedor || 0).toFixed(2)}</div>
                                                            
                                                            <div className={`font-bold text-[10px] uppercase tracking-widest self-center mt-2 ${isDebt ? 'text-red-500' : 'text-ios-green'}`}>{isDebt ? 'Para la Agencia' : 'Deuda Agencia Contigo'}</div>
                                                            <div className={`text-right font-black text-xl tracking-tight self-center mt-2 drop-shadow-sm ${isDebt ? 'text-red-500' : 'text-ios-green'}`}>{stats.sym} {Math.abs(week.totalBanca || 0).toFixed(2)}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            })}

            {/* Pending alert Global */}
            {totalPendingGlobal > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 shadow-sm mt-8">
                    <Clock size={16} className="text-orange-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-orange-600 dark:text-orange-400">Pagos en revisión general</p>
                        <p className="text-xs text-ios-subtext">Tienes comprobantes cargados esperando aprobación del administrador.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
