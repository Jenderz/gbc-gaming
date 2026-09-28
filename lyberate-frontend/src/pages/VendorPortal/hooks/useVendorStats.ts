import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    getPayments, getSales, getWeeklyTicketsBySeller,
    Payment, WeeklyTicket, getWeeklyPeriods
} from '../../../services/apiService';
import { roundFinance, getSymbol } from '../../../utils/finance';

export interface CurrencyStats {
    currency: string;
    sym: string;
    venta: number;
    premio: number;
    comision: number;
    total: number;
    part: number;
    totalVendedor: number;
    totalBanca: number;
    totalPaidVendor: number;
    totalPaidBank: number;
    totalPending: number;
    debt: number;
    positiveBalance: number;
    netBalance: number;
    accountBalance: number;
    PendingTicketsCount: number;
    prevVenta: number;
    count: number;
    weeks: WeekStat[];
}

export interface WeekStat {
    weekId: string;
    weekLabel: string;
    venta: number;
    premio: number;
    comision: number;
    total: number;
    part: number;
    totalVendedor: number;
    totalBanca: number;
}

export const useVendorStats = (_userId: string | undefined, sellerId: string | undefined) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [weeklyTickets, setWeeklyTickets] = useState<WeeklyTicket[]>([]);
    const [sales, setSales] = useState<any[]>([]);

    const refreshData = useCallback(async () => {
        if (!sellerId) return;
        const [allPayments, allSales, tickets] = await Promise.all([
            getPayments(),
            getSales(),
            getWeeklyTicketsBySeller(sellerId),
        ]);
        setPayments(allPayments.filter(p => String(p.sellerId) === String(sellerId)));
        setSales(allSales.filter(s => String(s.sellerId) === String(sellerId)));
        setWeeklyTickets(tickets);
    }, [sellerId]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Detectar semana actual y previa directamente de los weekIds presentes en las ventas
    // (ordenados de más reciente a más antigua), sin recalcular desde fechas locales
    const sortedWeekIds = useMemo(() => {
        const ids = Array.from(new Set(sales.map(s => s.weekId).filter(Boolean)));
        // Orden descendente: "week-2026-03-09" > "week-2026-03-02" funciona lexicográficamente
        return ids.sort((a, b) => b.localeCompare(a));
    }, [sales]);
    const currWeekId = sortedWeekIds[0] || 'week-0';
    const prevWeekId = sortedWeekIds[1] || 'week-1';

    const pendingWeeks = useMemo(() => weeklyTickets.filter(t => t.status !== 'settled'), [weeklyTickets]);
    const totalPendingGlobal = useMemo(() => payments.filter(p => p.status === 'pending').reduce((s, p) => roundFinance(s + p.amount), 0), [payments]);

    const statsByCurrency = useMemo(() => {
        if (!sellerId) return [];

        const currWeekSales = sales.filter(s => s.weekId === currWeekId);
        const previousWeekSales = sales.filter(s => s.weekId === prevWeekId);

        const currencySet = new Set<string>([
            ...currWeekSales.map(s => s.currencyName),
            ...previousWeekSales.map(s => s.currencyName),
            ...weeklyTickets.map(t => t.currency),
            ...payments.map(p => p.currency)
        ]);

        const result: CurrencyStats[] = [];

        currencySet.forEach(currency => {
            const cSales = currWeekSales.filter(s => s.currencyName === currency);
            const venta = cSales.reduce((acc, s) => roundFinance(acc + s.amount), 0);
            const premio = cSales.reduce((acc, s) => roundFinance(acc + s.prize), 0);
            const comision = cSales.reduce((acc, s) => roundFinance(acc + s.commission), 0);
            const total = cSales.reduce((acc, s) => roundFinance(acc + s.total), 0);
            const part = cSales.reduce((acc, s) => roundFinance(acc + s.participation), 0);
            const totalVendedor = cSales.reduce((acc, s) => roundFinance(acc + s.totalVendor), 0);
            const totalBanca = cSales.reduce((acc, s) => roundFinance(acc + s.totalBank), 0);
            const count = cSales.length;

            const pSales = previousWeekSales.filter(s => s.currencyName === currency);
            const prevVenta = pSales.reduce((acc, s) => roundFinance(acc + s.amount), 0);

            const cPayments = payments.filter(p => p.currency === currency);
            const totalPaidVendor = cPayments.filter(p => p.status === 'approved' && p.type !== 'credit').reduce((s, p) => roundFinance(s + p.amount), 0);
            const totalPaidBank = cPayments.filter(p => p.status === 'approved' && p.type === 'credit').reduce((s, p) => roundFinance(s + p.amount), 0);
            const totalPending = cPayments.filter(p => p.status === 'pending').reduce((s, p) => roundFinance(s + p.amount), 0);

            const allSalesCurrency = sales.filter(s => s.currencyName === currency);
            const totalHistoricoBanca = allSalesCurrency.reduce((acc, s) => roundFinance(acc + s.totalBank), 0);

            const weeks: WeekStat[] = [];
            sortedWeekIds.forEach(wId => {
                const wSales = allSalesCurrency.filter(s => s.weekId === wId);
                // Only include weeks that have some activity
                if (wSales.length === 0) return;
                
                const wDate = wId.replace('week-', '');
                const wPeriod = getWeeklyPeriods([wDate]).find(p => p.id === wId);
                const weekLabel = wPeriod ? wPeriod.label : wId;

                const wVenta = wSales.reduce((acc, s) => roundFinance(acc + s.amount), 0);
                const wPremio = wSales.reduce((acc, s) => roundFinance(acc + s.prize), 0);
                const wComision = wSales.reduce((acc, s) => roundFinance(acc + s.commission), 0);
                const wTotal = wSales.reduce((acc, s) => roundFinance(acc + s.total), 0);
                const wPart = wSales.reduce((acc, s) => roundFinance(acc + s.participation), 0);
                const wTotalVendedor = wSales.reduce((acc, s) => roundFinance(acc + s.totalVendor), 0);
                const wTotalBanca = wSales.reduce((acc, s) => roundFinance(acc + s.totalBank), 0);
                
                weeks.push({
                    weekId: wId,
                    weekLabel,
                    venta: wVenta,
                    premio: wPremio,
                    comision: wComision,
                    total: wTotal,
                    part: wPart,
                    totalVendedor: wTotalVendedor,
                    totalBanca: wTotalBanca
                });
            });

            // La deuda neta histórica = sumatoria de todo lo que hay que pagarle a la banca
            // menos (-) lo que el vendedor ya pagó en efectivo/transferencia
            // menos (-) lo que la agencia haya perdonado o dado como crédito al vendedor
            const totalNetBalance = roundFinance(totalHistoricoBanca - totalPaidVendor - totalPaidBank);

            let debt = 0;
            let positiveBalance = 0;
            if (totalNetBalance > 0) { debt = totalNetBalance; } else { positiveBalance = Math.abs(totalNetBalance); }

            const netBalance = totalNetBalance;
            const accountBalance = totalNetBalance;
            const PendingTicketsCount = debt > 0 ? 1 : 0;

            if (venta > 0 || prevVenta > 0 || debt > 0 || positiveBalance > 0 || totalPaidVendor > 0 || totalPending > 0) {
                result.push({
                    currency,
                    sym: getSymbol(currency),
                    venta, premio, comision, total, part, totalVendedor, totalBanca, count,
                    prevVenta,
                    totalPaidVendor, totalPaidBank, totalPending,
                    debt, positiveBalance, netBalance, accountBalance, PendingTicketsCount,
                    weeks
                });
            }
        });

        return result.sort((a, b) => a.currency.localeCompare(b.currency));
    }, [sellerId, sales, currWeekId, prevWeekId, weeklyTickets, payments]);

    const currentWeekPeriod = useMemo(() => {
        if (currWeekId === 'week-0') return null;
        return getWeeklyPeriods([currWeekId]).find(p => p.id === currWeekId);
    }, [currWeekId]);

    return {
        payments,
        sales,
        weeklyTickets,
        statsByCurrency,
        pendingWeeks,
        totalPendingGlobal,
        currentWeekLabel: currentWeekPeriod?.label || 'Semana actual',
        refreshData
    };
};
