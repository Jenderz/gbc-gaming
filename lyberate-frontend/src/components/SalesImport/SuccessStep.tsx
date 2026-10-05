import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessStepProps {
    onClose: () => void;
    onReset: () => void;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ onClose, onReset }) => {
    return (
        <div className="animate-fade-in flex flex-col items-center justify-center gap-6 py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-ios-green/10 text-ios-green flex items-center justify-center animate-bounce-slow">
                <CheckCircle2 size={48} />
            </div>
            <div className="space-y-1">
                <h2 className="text-2xl font-bold">¡Carga Completada!</h2>
                <p className="text-ios-subtext text-sm">Los datos han sido liquidados e integrados correctamente.</p>
            </div>
            <div className="flex gap-3 mt-4">
                <button
                    onClick={onClose}
                    className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
                >
                    Volver a Ventas
                </button>
                <button
                    onClick={onReset}
                    className="px-8 py-3 border border-black/10 dark:border-white/10 rounded-2xl font-bold text-sm hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
                >
                    Nueva Carga
                </button>
            </div>
        </div>
    );
};
