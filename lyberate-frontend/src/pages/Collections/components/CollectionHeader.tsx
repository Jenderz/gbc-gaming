import { Download, Plus } from 'lucide-react';

interface Props {
    onNewPayment: () => void;
}

export const CollectionHeader = ({ onNewPayment }: Props) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Recaudaciones</h1>
                <p className="text-ios-subtext text-sm mt-1">Gestión de pagos recibidos de vendedores.</p>
            </div>
            <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl text-sm font-semibold hover:shadow-sm transition-all">
                    <Download size={16} /> Exportar
                </button>
                <button
                    onClick={onNewPayment}
                    className="flex items-center gap-2 px-4 py-2 bg-ios-blue text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-600 transition-all"
                >
                    <Plus size={16} /> Nueva Recaudación
                </button>
            </div>
        </div>
    );
};
