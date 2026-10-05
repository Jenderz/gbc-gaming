import React, { useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';

interface UploadStepProps {
    onFileSelected: (file: File) => void;
    loading: boolean;
}

export const UploadStep: React.FC<UploadStepProps> = ({ onFileSelected, loading }) => {
    const [dragging, setDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => setDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFileSelected(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFileSelected(file);
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
                h-80 relative group overflow-hidden
                border-2 border-dashed rounded-3xl p-12 transition-all duration-500
                flex flex-col items-center justify-center gap-4 text-center
                ${dragging
                    ? 'border-ios-blue bg-ios-blue/5 scale-[1.01]'
                    : 'border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5'
                }
            `}
        >
            <div className="w-16 h-16 rounded-2xl bg-ios-blue/10 flex items-center justify-center text-ios-blue animate-fade-in">
                {loading ? <Loader2 className="animate-spin" size={32} /> : <FileUp size={32} />}
            </div>
            <div className="space-y-1">
                <h3 className="text-lg font-bold">Selecciona archivo de ventas</h3>
                <p className="text-ios-subtext text-xs max-w-xs">
                    Arrastra tu archivo Excel (.xlsx, .xls) o CSV — Betm3, Banklot, Maxplay, Americanas, Report Hipódromo, Posnet, Gato...
                </p>
            </div>
            <label className="mt-4 px-6 py-2.5 bg-ios-blue text-white rounded-full font-bold cursor-pointer hover:brightness-110 active:scale-95 transition-all text-xs shadow-lg shadow-ios-blue/20">
                Explorar Archivos
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            </label>
        </div>
    );
};
