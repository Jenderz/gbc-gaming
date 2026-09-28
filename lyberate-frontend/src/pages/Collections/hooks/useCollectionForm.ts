import { useState, useMemo, useEffect } from 'react';
import {
    PaymentMethod, PaymentType, Payment, Sale, Seller,
    addPayment as defaultAddPayment, updatePayment as defaultUpdatePayment,
    getWeeklyPeriods, dateToWeekId, getAvailableCurrencies,
    getPaymentMethods, getBanks
} from '../../../services/apiService';

interface FormApiOverrides {
    addPayment?: typeof defaultAddPayment;
    updatePayment?: typeof defaultUpdatePayment;
}

export const useCollectionForm = (
    sellers: Seller[],
    sales: Sale[],
    payments: Payment[],
    onSuccess: () => void,
    apiOverrides?: FormApiOverrides
) => {
    const addPayment = apiOverrides?.addPayment || defaultAddPayment;
    const updatePayment = apiOverrides?.updatePayment || defaultUpdatePayment;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currencies, setCurrencies] = useState<string[]>(['DOLAR']);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
    const [banks, setBanks] = useState<string[]>([]);

    // ─── Edit mode ───────────────────────────────────────────────────────
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [showEditConfirm, setShowEditConfirm] = useState(false);
    const [editConfirmLoading, setEditConfirmLoading] = useState(false);

    // Load catalogs on mount
    useEffect(() => {
        Promise.all([
            getAvailableCurrencies(),
            getPaymentMethods(),
            getBanks()
        ]).then(([c, m, b]) => {
            setCurrencies(c);
            setPaymentMethods(m);
            setBanks(b);
        }).catch(() => { });
    }, []);

    // Modal form states
    const [formOperationType, setFormOperationType] = useState<'income' | 'payout'>('income');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formSellerId, setFormSellerId] = useState('');
    const [formCurrency, setFormCurrency] = useState('DOLAR');
    const [formAmount, setFormAmount] = useState<number | ''>('');
    const [formBank, setFormBank] = useState('');
    const [formMethod, setFormMethod] = useState<PaymentMethod>('Transferencia');
    const [formReference, setFormReference] = useState('');

    const selectedSeller = sellers.find(s => String(s.id) === formSellerId);

    // ── Balance ACUMULADO GLOBAL del vendedor en esa moneda ──
    // Usa la misma fórmula que SellerBalanceTable para consistencia total.
    const { totalBank, balance } = useMemo(() => {
        if (!formSellerId) return { totalBank: 0, totalPaid: 0, totalCredits: 0, totalPayouts: 0, balance: 0 };

        // Sumar TODAS las ventas del vendedor en esa moneda (sin filtro de semana)
        const tb = sales
            .filter(s => String(s.sellerId) === formSellerId && s.currencyName === formCurrency)
            .reduce((sum, s) => sum + s.totalBank, 0);

        // Sumar TODOS los pagos aprobados del vendedor en esa moneda
        let paid = 0, credits = 0, payouts = 0;
        payments
            .filter(p =>
                String(p.sellerId) === formSellerId &&
                p.currency === formCurrency &&
                p.status === 'approved'
            )
            .forEach(p => {
                if (p.type === 'credit') credits += p.amount;
                else if (p.type === 'payout') payouts += p.amount;
                else paid += p.amount;
            });

        // Misma fórmula que SellerBalanceTable:
        // balance > 0 → vendedor nos debe
        // balance < 0 → nosotros le debemos
        const bal = tb - paid - credits + payouts;

        return { totalBank: tb, totalPaid: paid, totalCredits: credits, totalPayouts: payouts, balance: bal };
    }, [sales, payments, formSellerId, formCurrency]);

    const difference = balance - Number(formAmount || 0);

    const resetForm = () => {
        setFormAmount('');
        setFormReference('');
        setFormBank('');
        setFormSellerId('');
        setEditingPayment(null);
    };

    // ─── Start editing a payment ─────────────────────────────────────────
    const startEditPayment = (payment: Payment) => {
        setEditingPayment(payment);
        setFormSellerId(String(payment.sellerId));
        setFormCurrency(payment.currency);
        setFormAmount(payment.amount);
        setFormBank(payment.bank);
        setFormMethod(payment.method);
        setFormReference(payment.reference);
        setFormDate(payment.date);
        setFormOperationType(payment.type === 'payout' ? 'payout' : 'income');
        setIsModalOpen(true);
    };

    // ─── Build changes list for confirmation ─────────────────────────────
    const editChanges = useMemo(() => {
        if (!editingPayment) return [];
        const changes: { label: string; oldValue: string | number; newValue: string | number }[] = [];
        const sellerName = selectedSeller?.name || '';
        if (editingPayment.vendorName !== sellerName && sellerName) changes.push({ label: 'Vendedor', oldValue: editingPayment.vendorName, newValue: sellerName });
        if (editingPayment.amount !== Number(formAmount)) changes.push({ label: 'Monto', oldValue: editingPayment.amount.toFixed(2), newValue: Number(formAmount).toFixed(2) });
        if (editingPayment.currency !== formCurrency) changes.push({ label: 'Moneda', oldValue: editingPayment.currency, newValue: formCurrency });
        if (editingPayment.bank !== formBank) changes.push({ label: 'Banco', oldValue: editingPayment.bank, newValue: formBank });
        if (editingPayment.method !== formMethod) changes.push({ label: 'Método', oldValue: editingPayment.method, newValue: formMethod });
        if (editingPayment.reference !== formReference) changes.push({ label: 'Referencia', oldValue: editingPayment.reference, newValue: formReference });
        if (editingPayment.date !== formDate) changes.push({ label: 'Fecha', oldValue: editingPayment.date, newValue: formDate });
        return changes;
    }, [editingPayment, selectedSeller, formAmount, formCurrency, formBank, formMethod, formReference, formDate]);

    // ─── Confirm edit ────────────────────────────────────────────────────
    const handleConfirmEdit = async () => {
        if (!editingPayment) return;
        setEditConfirmLoading(true);
        try {
            const paymentDate = formDate || new Date().toISOString().split('T')[0];
            await updatePayment(editingPayment.id, {
                sellerId: formSellerId,
                week: getWeeklyPeriods([paymentDate])[0]?.label || '',
                weekId: dateToWeekId(paymentDate),
                amount: Math.abs(Number(formAmount)),
                currency: formCurrency,
                bank: formBank,
                method: formMethod,
                reference: formReference,
                date: paymentDate,
                type: (formOperationType === 'payout' ? 'payout' : editingPayment.type) as PaymentType,
            });
            setShowEditConfirm(false);
            setIsModalOpen(false);
            resetForm();
            onSuccess();
        } catch (err: any) {
            alert(`Error al editar pago: ${err?.message || 'Error desconocido'}`);
        } finally {
            setEditConfirmLoading(false);
        }
    };

    const handleRegisterPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formSellerId || !formAmount || !formBank || !formReference) return;

        // If editing, show confirmation instead
        if (editingPayment) {
            setShowEditConfirm(true);
            return;
        }

        const enteredAmount = Math.abs(Number(formAmount));
        const paymentDate = formDate || new Date().toISOString().split('T')[0];
        const basePayload = {
            vendorId: selectedSeller?.id || '',
            vendorName: selectedSeller?.name || '',
            sellerId: formSellerId,
            week: getWeeklyPeriods([paymentDate])[0]?.label || '',
            weekId: dateToWeekId(paymentDate),
            currency: formCurrency,
            bank: formBank,
            method: formMethod,
            reference: formReference,
            date: paymentDate,
            status: 'approved' as const,
        };

        if (formOperationType === 'payout') {
            await addPayment({ ...basePayload, amount: enteredAmount, type: 'payout' as PaymentType });
        } else {
            if (balance <= 0) {
                await addPayment({ ...basePayload, amount: enteredAmount, type: 'credit' as PaymentType });
            } else if (enteredAmount <= balance) {
                await addPayment({ ...basePayload, amount: enteredAmount, type: 'payment' as PaymentType });
            } else {
                await addPayment({ ...basePayload, amount: balance, type: 'payment' as PaymentType });
                await addPayment({
                    ...basePayload,
                    amount: enteredAmount - balance,
                    type: 'credit' as PaymentType,
                    reference: `${formReference}-CREDIT`,
                });
            }
        }

        setIsModalOpen(false);
        resetForm();
        onSuccess();
    };

    return {
        isModalOpen,
        setIsModalOpen,
        currencies,
        paymentMethods,
        banks,
        formOperationType, setFormOperationType,
        formDate, setFormDate,
        formSellerId, setFormSellerId,
        formCurrency, setFormCurrency,
        formAmount, setFormAmount,
        formBank, setFormBank,
        formMethod, setFormMethod,
        formReference, setFormReference,
        totalBank,
        balance,
        difference,
        handleRegisterPayment,
        resetForm,
        // Edit mode
        editingPayment,
        startEditPayment,
        showEditConfirm, setShowEditConfirm,
        editConfirmLoading,
        editChanges,
        handleConfirmEdit,
    };
};
