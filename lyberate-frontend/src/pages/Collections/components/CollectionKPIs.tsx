interface Props {
    totalCollected: number;
    totalPending: number;
    totalCredits: number;
    totalPayouts: number;
}

export const CollectionKPIs = ({ totalCollected, totalPending, totalCredits, totalPayouts }: Props) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-ios-blue">
                <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Recaudado (Aprobado)</p>
                <h3 className="text-2xl font-bold">${totalCollected.toFixed(2)}</h3>
                <p className="text-xs text-ios-subtext mt-1">Líquido confirmado en USD</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-orange-500">
                <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Por Aprobar (Pendiente)</p>
                <h3 className="text-2xl font-bold">${totalPending.toFixed(2)}</h3>
                <p className="text-xs text-ios-subtext mt-1">Requiere validación manual</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-amber-500">
                <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Saldo a Favor Vendedores</p>
                <h3 className="text-2xl font-bold text-amber-500">${totalCredits.toFixed(2)}</h3>
                <p className="text-xs text-ios-subtext mt-1">Créditos aprobados en USD</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-blue-500">
                <p className="text-ios-subtext text-xs font-bold uppercase tracking-wider mb-2">Pagos Emitidos</p>
                <h3 className="text-2xl font-bold text-blue-500">${totalPayouts.toFixed(2)}</h3>
                <p className="text-xs text-ios-subtext mt-1">Retiros a vendedores en USD</p>
            </div>
        </div>
    );
};
