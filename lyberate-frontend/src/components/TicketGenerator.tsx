import { useRef, useState } from 'react';
import { renderElementToDataUrl } from '../utils/ticketRenderer';
import { Download, Share2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface TicketProps {
    id: string;
    type: 'Cobro' | 'Venta' | 'Pago';
    amountUsd: number;
    amountVes: number;
    clientName: string;
    agencyName: string;
    date: string;
    onClose: () => void;
    // Props opcionales para desglose de venta
    saleBreakdown?: {
        currency: string;
        symbol: string;
        venta: number;
        premio: number;
        comision: number;
        comisionPct: number;
        total: number;
        participacion: number;
        partPct: number;
        totalVendedor: number;
        totalBanca: number;
        isBancaDebt: boolean; // true = el premio supera la venta, banca debe al vendedor
    };
}

export const TicketGenerator = ({ id, type, amountUsd, amountVes, clientName, agencyName, date, onClose, saleBreakdown }: TicketProps) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const cachedDataUrlRef = useRef<string | null>(null);
    const cachedBlobRef = useRef<Blob | null>(null);

    const generateImage = async (): Promise<{ dataUrl: string; blob: Blob | null }> => {
        if (cachedDataUrlRef.current && cachedBlobRef.current) {
            return { dataUrl: cachedDataUrlRef.current, blob: cachedBlobRef.current };
        }
        if (!ticketRef.current) throw new Error("Ticket view reference not ready");

        const dataUrl = await renderElementToDataUrl(ticketRef.current, { scale: 2, backgroundColor: '#ffffff' });
        let blob: Blob | null = null;
        try {
            const res = await fetch(dataUrl);
            blob = await res.blob();
        } catch (e) {
            console.error("Error converting dataUrl to blob:", e);
        }

        cachedDataUrlRef.current = dataUrl;
        cachedBlobRef.current = blob;
        return { dataUrl, blob };
    };

    const handleDownload = async () => {
        if (!ticketRef.current) return;
        setIsGenerating(true);
        try {
            const { dataUrl } = await generateImage();
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Ticket_${type}_${id}.png`;
            link.click();
        } catch (error) {
            console.error("Error generating ticket:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (!ticketRef.current) return;
        setIsGenerating(true);
        try {
            const { dataUrl, blob } = await generateImage();
            if (blob && navigator.share) {
                const file = new File([blob], `Ticket_${id}.png`, { type: 'image/png' });
                await navigator.share({
                    title: `Comprobante ${id}`,
                    text: `Adjunto comprobante de ${type} por $${amountUsd}`,
                    files: [file]
                });
            } else {
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `Ticket_${type}_${id}.png`;
                link.click();
            }
        } catch (error) {
            console.error("Error sharing ticket:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-ios-bg dark:bg-black w-full max-w-[320px] rounded-3xl overflow-hidden shadow-2xl flex flex-col">

                {/* Visual del Ticket para Screenshot */}
                <div className="p-6 bg-white text-black" ref={ticketRef} id="ticket-view">
                    <div className="text-center mb-5">
                        <img src="/logo.png" alt="GBC GAMING Logo" className="w-16 h-16 mx-auto mb-2 opacity-100 object-contain drop-shadow-sm" />
                        <h2 className="font-black text-xl tracking-tight text-[#00361F]">GBC GAMING</h2>
                        <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-0.5">Comprobante de Operación</p>
                    </div>

                    {saleBreakdown ? (
                        <>
                            {saleBreakdown.isBancaDebt ? (
                                <div className="flex flex-col items-center justify-center mb-5 bg-orange-50 p-3 rounded-2xl border border-dashed border-orange-200">
                                    <AlertTriangle size={28} className="text-orange-500 mb-1" />
                                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">SALDO A FAVOR VENDEDOR</span>
                                    <h3 className="text-2xl font-black text-orange-600 mt-1">{saleBreakdown.symbol}{Math.abs(saleBreakdown.totalBanca).toFixed(2)}</h3>
                                    <p className="text-[11px] text-orange-500/80 font-medium mt-1">El premio excede la venta</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center mb-5 bg-blue-50 p-3 rounded-2xl border border-dashed border-blue-200">
                                    <CheckCircle2 size={28} className="text-ios-blue mb-1" />
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">A RECAUDAR (BANCA)</span>
                                    <h3 className="text-2xl font-black text-blue-600 mt-1">{saleBreakdown.symbol}{saleBreakdown.totalBanca.toFixed(2)}</h3>
                                    <p className="text-[11px] text-blue-500/80 font-medium mt-1">Venta Liquidada</p>
                                </div>
                            )}

                            <div className="space-y-2.5 text-[13px]">
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 text-xs">ID Referencia</span>
                                    <span className="font-bold font-mono">{id}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 text-xs">Fecha Operación</span>
                                    <span className="font-semibold">{date}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 text-xs">Vendedor</span>
                                    <span className="font-semibold text-right max-w-[150px] truncate">{clientName}</span>
                                </div>

                                <div className="pt-2 pb-1">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Desglose de Liquidación</div>
                                    <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-medium">Venta Bruta</span>
                                            <span className="font-bold">{saleBreakdown.symbol}{saleBreakdown.venta.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-medium">Premios PAG</span>
                                            <span className="font-bold text-red-500">-{saleBreakdown.symbol}{Math.abs(saleBreakdown.premio).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-medium">Comisión Ag. ({saleBreakdown.comisionPct}%)</span>
                                            <span className="font-bold text-red-500">-{saleBreakdown.symbol}{Math.abs(saleBreakdown.comision).toFixed(2)}</span>
                                        </div>
                                        <div className="h-px w-full bg-gray-200 my-1"></div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-semibold">Total Neto</span>
                                            <span className="font-bold">{saleBreakdown.symbol}{saleBreakdown.total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs bg-white rounded p-1.5 border border-gray-100 mt-1">
                                            <span className="text-gray-500 font-medium italic">Participación ({saleBreakdown.partPct}%)</span>
                                            <span className="font-bold text-orange-500">{saleBreakdown.participacion < 0 ? `-${saleBreakdown.symbol}${Math.abs(saleBreakdown.participacion).toFixed(2)}` : `${saleBreakdown.symbol}${saleBreakdown.participacion.toFixed(2)}`}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 px-1">
                                    <span className="text-gray-500 text-[11px] font-bold uppercase">Utilidad Vendedor</span>
                                    <span className="font-black text-green-600 text-sm">{saleBreakdown.symbol}{saleBreakdown.totalVendedor.toFixed(2)}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col items-center justify-center mb-5 bg-gray-50 p-3 rounded-2xl border border-dashed border-gray-200">
                                <CheckCircle2 size={28} className="text-ios-green mb-1" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    {type.toUpperCase()} {type === 'Venta' ? 'APROBADA' : 'APROBADO'}
                                </span>
                                {amountUsd > 0 ? (
                                    <h3 className="text-2xl font-black mt-1 text-[#1c1c1e] dark:text-white">
                                        ${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h3>
                                ) : (
                                    <h3 className="text-2xl font-black mt-1 text-[#1c1c1e] dark:text-white">
                                        Bs. {amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h3>
                                )}
                            </div>

                            <div className="space-y-2.5 text-[13px]">
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 text-xs">ID Referencia</span>
                                    <span className="font-bold font-mono">{id}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 text-xs">Fecha</span>
                                    <span className="font-semibold">{date}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 text-xs">Cliente / Vendedor</span>
                                    <span className="font-semibold">{clientName}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 text-xs">Agencia</span>
                                    <span className="font-semibold text-right max-w-[150px] truncate">{agencyName}</span>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="mt-5 text-center text-[9px] text-gray-400 font-medium">
                        Generado de forma segura por GBC GAMING • GBC GAMING, C.A.
                    </div>
                </div>

                {/* Controles (No se incluyen en el screenshot) */}
                <div className="p-4 bg-ios-bg dark:bg-black/90 border-t border-black/5 dark:border-white/5 flex gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-white dark:bg-white/10 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/20 active:scale-95 transition-all"
                    >
                        <Download size={20} />
                        Descargar
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 bg-ios-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 active:scale-95 transition-all shadow-md"
                    >
                        <Share2 size={20} />
                        Compartir
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-none flex items-center justify-center w-14 p-3 bg-white dark:bg-white/10 text-ios-red rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 transition-all"
                    >
                        Salir
                    </button>
                </div>

            </div>
        </div>
    );
};
