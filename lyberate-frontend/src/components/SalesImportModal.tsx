import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
    FileUp,
    CheckCircle2,
    Loader2,
    UserPlus,
    Calendar,
    Coins,
    Package,
    X,
    Percent,
    Trash2,
    Building2,
    Users,
    UserCheck
} from 'lucide-react';
import {
    getGlobalProducts,
    addGlobalProduct,
    getAvailableCurrencies,
    dateToWeekId,
    getSellerAliases,
    addSellerAlias,
    Seller,
    getAgencies,
    addAgency,
    Agency
} from '../services/apiService';
import { useApiScope } from '../hooks/useApiScope';
import { roundFinance } from '../utils/finance';

interface RawRow {
    vendorName: string;
    agencyName?: string;
    productName?: string; // Sub-producto individual (ej. "PARLEY 4+", "PARLEY 3L", "PARLEY 2L", "PARLEY PD")
    sales: number;
    prizes: number;
    sourceRow: any;
}

interface ImportSession {
    fileName: string;
    productName: string;
    currency: string;
    date: string; // YYYY-MM-DD
    rows: RawRow[];
    detectedType: 'betm3' | 'banklot' | 'maxplay' | 'americanas' | 'mastergreen' | 'adminwd' | 'parley' | 'unknown';
}

interface VendorConfig {
    name: string;
    commissionPct: number;
    partPct: number;
    mappedSellerId?: number | null;
    isExisting?: boolean;
}

interface SalesImportModalProps {
    onClose: () => void;
    onImportSuccess: () => void;
}

export const SalesImportModal: React.FC<SalesImportModalProps> = ({ onClose, onImportSuccess }) => {
    const api = useApiScope();
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<ImportSession | null>(null);
    const [products, setProducts] = useState<string[]>([]);
    const [currencies, setCurrencies] = useState<string[]>([]);
    const [sellerAliases, setSellerAliases] = useState<Record<string, number>>({});
    const [allSellers, setAllSellers] = useState<Seller[]>([]);

    // UI State
    const [step, setStep] = useState<'upload' | 'preview' | 'resolution' | 'manual' | 'success'>('upload');
    const [missingVendors, setMissingVendors] = useState<VendorConfig[]>([]);
    // Estado para el modo de mapeo manual de columnas
    const [manualRawData, setManualRawData] = useState<{ fileName: string; data: any[][] } | null>(null);
    const [manualVendorCol, setManualVendorCol] = useState<number>(-1);
    const [manualSalesCol, setManualSalesCol] = useState<number>(-1);
    const [manualPrizesCol, setManualPrizesCol] = useState<number>(-1);
    const [manualSelectMode, setManualSelectMode] = useState<'vendor' | 'sales' | 'prizes'>('vendor');
    const [manualStartRow, setManualStartRow] = useState<number>(1);
    const [bulkCommission, setBulkCommission] = useState<number>(0);
    const [bulkParticipation, setBulkParticipation] = useState<number>(0);

    // Estado para agrupación manual de vendedores en el importador
    const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
    const [bulkTargetSeller, setBulkTargetSeller] = useState<string>('');
    const [bulkSaveAlias, setBulkSaveAlias] = useState<boolean>(true);
    const [isGroupingModalOpen, setIsGroupingModalOpen] = useState<boolean>(false);
    const [groupingSourceAgent, setGroupingSourceAgent] = useState<string>('');
    const [groupingTargetSeller, setGroupingTargetSeller] = useState<string>('');
    const [groupingCustomTarget, setGroupingCustomTarget] = useState<string>('');
    const [groupingSaveAlias, setGroupingSaveAlias] = useState<boolean>(true);

    const handleApplyBulkPercentages = (comm: number, part: number) => {
        setMissingVendors(prev => prev.map(v => ({
            ...v,
            commissionPct: comm,
            partPct: part
        })));
    };

    /**
     * Aplica la agrupación manual de un conjunto de filas hacia un vendedor destino.
     * Si saveAlias es true, registra la asignación permanente en sellerAliases.
     */
    const handleApplyManualGroup = async (targetSellerName: string, indicesToUpdate: number[], saveAlias: boolean = true) => {
        if (!session || !targetSellerName.trim() || indicesToUpdate.length === 0) return;
        const cleanTarget = targetSellerName.trim().toUpperCase();
        const targetSellerObj = allSellers.find(s => s.name.trim().toUpperCase() === cleanTarget);

        // Agentes originales que se están reasignando
        const originalAgents = Array.from(new Set(
            indicesToUpdate.map(idx => session.rows[idx]?.vendorName?.trim()?.toUpperCase()).filter(Boolean)
        ));

        // Actualizar filas en la sesión
        const updatedRows = session.rows.map((row, idx) => {
            if (indicesToUpdate.includes(idx)) {
                return { ...row, vendorName: cleanTarget };
            }
            return row;
        });

        // Consolidar filas que ahora compartan vendedor, producto, agencia y moneda
        const consolidatedMap = new Map<string, RawRow>();
        for (const r of updatedRows) {
            const prod = (r.productName || session.productName).trim().toUpperCase();
            const curr = (r.sourceRow?._currency || session.currency).trim().toUpperCase();
            const agency = (r.agencyName || '').trim().toUpperCase();
            const vend = r.vendorName.trim().toUpperCase();
            const key = `${vend}||${prod}||${agency}||${curr}`;
            const existing = consolidatedMap.get(key);
            if (existing) {
                existing.sales += r.sales;
                existing.prizes += r.prizes;
            } else {
                consolidatedMap.set(key, { ...r });
            }
        }
        const newRows = Array.from(consolidatedMap.values());
        setSession({ ...session, rows: newRows });
        setSelectedRowIndices([]);
        setBulkTargetSeller('');

        // Si se eligió guardar alias permanente y el vendedor existe en BD
        if (saveAlias && targetSellerObj) {
            for (const orig of originalAgents) {
                if (orig && orig !== cleanTarget) {
                    try {
                        await addSellerAlias(targetSellerObj.id, orig);
                        setSellerAliases(prev => ({ ...prev, [orig]: Number(targetSellerObj.id) }));
                    } catch (err) {
                        console.warn(`No se pudo guardar alias para ${orig}:`, err);
                    }
                }
            }
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [prods, curs, aliases, sellers] = await Promise.all([
                    getGlobalProducts().catch(err => { console.error("Error cargando productos globales:", err); return []; }), 
                    getAvailableCurrencies().catch(err => { console.error("Error cargando monedas disponibles:", err); return []; }),
                    getSellerAliases().catch(err => { console.error("Error cargando alias de vendedores:", err); return {}; }),
                    api.getSellers().catch(err => { console.error("Error cargando vendedores:", err); return []; })
                ]);
                setProducts(prods);
                setCurrencies(curs);
                setSellerAliases(aliases);
                setAllSellers(sellers);
            } catch (error) {
                console.error("Error al cargar los catálogos del importador:", error);
            }
        };
        load();
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => setDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const parseAmount = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return val;
        let s = String(val).replace(/\s/g, '');
        if (s.includes(',') && s.includes('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else if (s.includes(',')) {
            s = s.replace(',', '.');
        }
        const num = parseFloat(s);
        return isNaN(num) ? 0 : num;
    };

    const processFile = async (file: File) => {
        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const isCsv = file.name.toLowerCase().endsWith('.csv');
                const workbook = XLSX.read(data, { 
                    type: 'binary',
                    raw: isCsv
                });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                analyzeAndCreateSession(file.name, jsonData);
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error(error);
            alert("Error al leer el archivo");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Detección robusta de la moneda por el nombre del archivo.
     * Soporta extensiones (.xls, .xlsx, .csv) y patrones:
     *   - "Report-$.xls", "Report $.xls", "ventas-$.xlsx" -> "DOLAR"
     *   - "Report-bs.xls", "Report BOLIVARES.xls", "report-bs.xlsx" -> "BOLIVARES VENEZOLANOS"
     *   - "Report-cop.xls" -> "PESOS COLOMBIANOS"
     */
    const detectFileCurrency = (fn: string): string => {
        const u = fn.trim().toUpperCase();
        // Bolívares
        if (
            u.includes('BOLIVAR') ||
            u.includes('VES') ||
            /[\s_\-]BS(\.[A-Z0-9]+)?$/i.test(u) ||
            /[\s_\-]BS[\s_\-\.]/i.test(u) ||
            u.includes('REPORT BS') ||
            u.includes('REPORT-BS')
        ) {
            return 'BOLIVARES VENEZOLANOS';
        }
        // Pesos Colombianos
        if (u.includes('COP') || u.includes('PESO')) {
            return 'PESO COLOMBIANA';
        }
        // Dólares (por defecto si termina en $, USD, DOLAR o estándar)
        return 'DOLAR';
    };

    /**
     * Parser senior para el formato AMERICANAS / Reportes de Centros Hípicos.
     * Ejemplo de celdas:
     *   "$YONILITZA.- PIRO (OFIC. ZULIA)"
     *   "$A QUE SOL - YANKEE (OFIC ZULIA)"
     *   "$PA QUE YOMAR.- GORDOXZ (OFIC ZULIA)"
     *   "WILL -ABERMUDEZ  (OFIC ZULIA)"
     *   "$ EL MUÑECO - GRANDE (W DEPORTES)"
     *   "BS EL MUÑECO - GRANDE (W DEPORTES)"
     *   "BODEGON A LO ZULIANO AK CA BS.- PIRO (W DEPORTES)"
     *
     * Reglas de negocio:
     *   - Moneda:
     *       Prefijo "BS" → BOLIVARES VENEZOLANOS | "$" → DOLAR | Fallback a defaultCurrency
     *   - Operadora / Oficina:
     *       Se extrae entre paréntesis "(OFIC. ZULIA)", "(W DEPORTES)"
     *   - Separación:
     *       El primer guión (-) encontrado separa la Agencia/Taquilla (antes) y el Grupo (después).
     */
    const parseAmericanasName = (raw: string, defaultCurrency: string = 'DOLAR'): { currency: string; agencyName: string; grupo: string; operadora: string; isGrande: boolean } | null => {
        if (!raw) return null;
        let s = String(raw).trim();
        if (!s) return null;

        let currency = defaultCurrency;
        let rest = s;

        // 1. Detectar prefijo de moneda
        if (/^BS\s*/i.test(s)) {
            currency = 'BOLIVARES VENEZOLANOS';
            rest = s.replace(/^BS\s*/i, '');
        } else if (/^\$\s*/.test(s)) {
            currency = 'DOLAR';
            rest = s.replace(/^\$\s*/, '');
        }

        // 2. Extraer paréntesis (operadoras / oficinas vs grupos entre paréntesis)
        let operadora = '';
        let potentialParenGroup = '';
        const parenParts: string[] = [];
        const parenGlobal = /\(([^)]+)\)/g;
        let m: RegExpExecArray | null;
        while ((m = parenGlobal.exec(rest)) !== null) {
            parenParts.push(m[1].trim().toUpperCase());
        }
        parenParts.forEach(p => {
            if (/^(OFIC|W DEPORTES|WORLD DEPORTES|GBC|GBC GAMING|STREAM)/i.test(p)) {
                operadora = operadora ? `${operadora} / ${p}` : p;
            } else {
                potentialParenGroup = p;
            }
        });
        rest = rest.replace(/\s*\([^)]*\)/g, '').trim();

        // 3. Separar por el PRIMER guión encontrado (ej. "Andres - Grupo")
        const firstDashIndex = rest.indexOf('-');
        let agencyName = '';
        let grupo = '';

        if (firstDashIndex !== -1) {
            agencyName = rest.substring(0, firstDashIndex).trim();
            grupo = rest.substring(firstDashIndex + 1).trim();
        } else if (potentialParenGroup) {
            agencyName = rest.trim();
            grupo = potentialParenGroup;
        } else if (/\.\s*[A-Z]/.test(rest)) {
            const dotIdx = rest.lastIndexOf('.');
            agencyName = rest.substring(0, dotIdx).trim();
            grupo = rest.substring(dotIdx + 1).trim();
        } else {
            agencyName = rest.trim();
            grupo = rest.trim();
        }

        // Limpieza de caracteres residuales en agencyName
        agencyName = agencyName.replace(/^[/\s.\-]+/, '').replace(/[\s.\-]+$/, '').trim();
        if (/\s+BS$/i.test(agencyName)) {
            currency = 'BOLIVARES VENEZOLANOS';
            agencyName = agencyName.replace(/\s+BS$/i, '').trim();
        } else if (/\s+\$$/i.test(agencyName)) {
            currency = 'DOLAR';
            agencyName = agencyName.replace(/\s+\$$/i, '').trim();
        }

        // Limpieza de caracteres residuales en grupo
        grupo = grupo.replace(/^[\s.\-]+/, '').replace(/[\s.\-]+$/, '').trim().toUpperCase();

        if (!grupo) {
            grupo = agencyName.toUpperCase();
        }

        if (!agencyName && !grupo) return null;

        // Detección senior para 'GRANDE':
        // Se considera vendedor individual si el grupo contiene 'GRANDE',
        // si hubo una anotación '(GRANDE)', o si la palabra 'GRANDE' aparece en el registro.
        const isGrande = /grande/i.test(grupo) ||
            /grande/i.test(potentialParenGroup) ||
            /\bgrande\b/i.test(raw);

        return {
            currency,
            agencyName: agencyName.toUpperCase() || grupo,
            grupo,
            operadora,
            isGrande
        };
    };

    /**
     * Parser para el formato MASTERGREEN / WORLDDEPORTES.
     * La primera columna «Taquillas» contiene: "paquejuancho Usd" o "cruces Bs"
     *   - Nombre vendedor : todo menos el sufijo de moneda
     *   - Moneda          : "Usd" → DOLAR  |  "Bs" → BOLIVARES VENEZOLANOS
     * Los montos ya vienen en formato europeo (242.600,00) que parseAmount maneja.
     * Si hay filas con ambas monedas, se crean entradas separadas por moneda.
     */
    const parseMastergreenName = (raw: string): { currency: string; vendorName: string } | null => {
        const s = raw.trim();
        // Ignorar filas de desglose por juego en Parley (ej. "Parley 4+ Usd AGENTE", "Parley 3l Usd AGENTE")
        // para no duplicar con la fila totalizadora del agente ("AGENTE Usd" / "AGENTE Bs")
        if (/^parley\s+/i.test(s)) return null;

        // Sufijo al final: " Usd", " Bs", " Cop" — con o sin espacio antes
        // Cop = Pesos Colombianos (COP)
        const match = s.match(/^(.+?)\s+(Usd|USD|usd|Bs|BS|bs|Cop|COP|cop)$/i);
        if (!match) return null;
        const name = match[1].trim().toUpperCase();
        const currencyRaw = match[2].toUpperCase();
        if (!name) return null;
        const currency = currencyRaw === 'BS'  ? 'BOLIVARES VENEZOLANOS'
                       : currencyRaw === 'COP' ? 'PESO COLOMBIANA'
                       : 'DOLAR';
        return { vendorName: name, currency };
    };

    const analyzeAndCreateSession = (fileName: string, data: any[][]) => {
        let detectedType: ImportSession['detectedType'] = 'unknown';
        let rows: RawRow[] = [];
        let productName = "";
        let forcedCurrency: string | null = null;

        const fileNameUpper = fileName.toUpperCase();
        const contentStr = JSON.stringify(data.slice(0, 15)).toUpperCase();

        // ─── Detección formato MASTERGREEN / WORLDDEPORTES / ADMINWD / PARLEY ─
        // Aplica a archivos que contengan "MASTERGREEN", "WORLDDEPORTES", "ADMINWD" o "PARLEY"
        // en el nombre o en las cabeceras.
        // Soporta cabeceras: "Taquillas", "Agentes", "G. Recogedores".
        // Sufijos de moneda: "Usd" (Dólar), "Bs" (Bolívares), "Cop" (Pesos COP).
        const isParley = fileNameUpper.includes('PARLEY') || (contentStr.includes('PARLEY') && contentStr.includes('AGENTES'));
        const isMastergreen = fileNameUpper.includes('MASTERGREEN')
            || fileNameUpper.includes('WORLDDEPORTES')
            || fileNameUpper.includes('ADMINWD')
            || isParley;

        if (isMastergreen) {
            if (isParley) {
                detectedType = 'parley';
                productName = 'PARLEY';
            } else if (fileNameUpper.includes('ADMINWD')) {
                detectedType = 'adminwd';
                productName = 'WORLDDEPORTES';
            } else {
                detectedType = 'mastergreen';
                productName = 'WORLDDEPORTES';
            }

            // Buscar fila de encabezado con columna "Taquillas", "Agentes" o "G. Recogedores"
            let taqIdx = -1, salesIdx = -1, prizesIdx = -1;
            let headerRowIndex = -1;

            for (let i = 0; i < Math.min(data.length, 10); i++) {
                const row = data[i];
                if (!row || !Array.isArray(row)) continue;
                const tIdx = row.findIndex((c: any) =>
                    typeof c === 'string' &&
                    /^(taquillas?|agentes?|g\.\s*recogedores?|recogedores?)$/i.test(String(c).trim())
                );
                if (tIdx !== -1) {
                    taqIdx = tIdx;
                    headerRowIndex = i;
                    // Buscar columna de ventas: primera columna con /venta/i después de la col. nombre
                    const vIdx = row.findIndex((c: any, j: number) => j > tIdx && typeof c === 'string' && /venta/i.test(c));
                    salesIdx = vIdx !== -1 ? vIdx : taqIdx + 1;
                    // Buscar columna de premios: primera columna con /premio/i
                    const pIdx = row.findIndex((c: any, j: number) => j > taqIdx && typeof c === 'string' && /premio/i.test(c));
                    prizesIdx = pIdx !== -1 ? pIdx : -1;
                    break;
                }
            }

            if (taqIdx !== -1) {
                // Verificar si es un archivo de Parley con desglose por producto/jugada ("Parley 4+", "Parley 3l", etc.)
                const hasParleyBreakdown = isParley && data.slice(headerRowIndex + 1).some(r => {
                    const raw = String(r?.[taqIdx] ?? '').trim();
                    return /^parley\s+([^\s]+)\s+(usd|bs|cop)\s+/i.test(raw);
                });

                const consolidatedMG = new Map<string, RawRow>();

                data.slice(headerRowIndex + 1).forEach((row: any[]) => {
                    const raw = String(row[taqIdx] ?? '').trim();
                    if (!raw || /^totales?/i.test(raw)) return;

                    if (hasParleyBreakdown) {
                        // Desglose granular de PARLEY (Parley 4+, Parley 3l, Parley 2l, Parley PD)
                        const match = raw.match(/^parley\s+([^\s]+)\s+(usd|bs|cop)\s+(.+)$/i);
                        if (!match) return; // Omitir filas totalizadoras ("1DONLUCHO Usd") para no duplicar ventas

                        const subProduct = 'PARLEY ' + match[1].toUpperCase();
                        const currCode = match[2].toUpperCase();
                        const currency = currCode === 'BS' ? 'BOLIVARES VENEZOLANOS'
                                       : currCode === 'COP' ? 'PESO COLOMBIANA'
                                       : 'DOLAR';

                        let vendorName = match[3].trim().toUpperCase();
                        const rawKey = vendorName.trim().toUpperCase();
                        if (sellerAliases[rawKey]) {
                            const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawKey]);
                            if (mappedSeller) vendorName = mappedSeller.name.toUpperCase();
                        }

                        const salesVal  = salesIdx  !== -1 ? parseAmount(row[salesIdx])  : 0;
                        const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                        if (salesVal === 0 && prizesVal === 0) return;

                        const key = `${vendorName}||${subProduct}||${currency}`;
                        const existing = consolidatedMG.get(key);
                        if (existing) {
                            existing.sales  += salesVal;
                            existing.prizes += prizesVal;
                        } else {
                            consolidatedMG.set(key, {
                                vendorName,
                                productName: subProduct,
                                sales:  salesVal,
                                prizes: prizesVal,
                                sourceRow: { ...row, _currency: currency, _productName: subProduct }
                            });
                        }
                    } else {
                        // Flujo estándar Mastergreen / Worlddeportes sin desglose
                        if (/^parley\s+/i.test(raw)) return;

                        const parsed = parseMastergreenName(raw);
                        if (!parsed) return;

                        const { vendorName, currency } = parsed;

                        // Resolver alias si existe
                        let finalName = vendorName;
                        const rawKey = vendorName.trim().toUpperCase();
                        if (sellerAliases[rawKey]) {
                            const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawKey]);
                            if (mappedSeller) finalName = mappedSeller.name.toUpperCase();
                        }

                        const salesVal  = salesIdx  !== -1 ? parseAmount(row[salesIdx])  : 0;
                        const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                        if (salesVal === 0 && prizesVal === 0) return;

                        const key = `${finalName}||${currency}`;
                        const existing = consolidatedMG.get(key);
                        if (existing) {
                            existing.sales  += salesVal;
                            existing.prizes += prizesVal;
                        } else {
                            consolidatedMG.set(key, {
                                vendorName: finalName,
                                productName: productName || 'WORLDDEPORTES',
                                sales:  salesVal,
                                prizes: prizesVal,
                                sourceRow: { ...row, _currency: currency }
                            });
                        }
                    }
                });

                const mgRows = Array.from(consolidatedMG.values());

                if (mgRows.length === 0) {
                    alert("No se pudo leer ninguna taquilla en el archivo. Verifica que el formato sea correcto.");
                    return;
                }

                // Detectar moneda predominante para la sesión.
                // Las filas conservan su moneda individual en sourceRow._currency.
                const hasBs  = mgRows.some(r => r.sourceRow._currency === 'BOLIVARES VENEZOLANOS');
                const hasUsd = mgRows.some(r => r.sourceRow._currency === 'DOLAR');
                const hasCop = mgRows.some(r => r.sourceRow._currency === 'PESO COLOMBIANA' || r.sourceRow._currency === 'PESOS COLOMBIANOS');
                const sessionCurrency = (hasBs && !hasUsd && !hasCop) ? 'BOLIVARES VENEZOLANOS'
                    : (hasCop && !hasUsd && !hasBs) ? 'PESO COLOMBIANA'
                    : 'DOLAR';

                setSession({
                    fileName,
                    productName,
                    currency: sessionCurrency,
                    date: new Date().toISOString().split('T')[0],
                    rows: mgRows,
                    detectedType
                });
                setStep('preview');
                return; // Salida anticipada para MASTERGREEN / ADMINWD
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        // ─── Detección formato AMERICANAS / Report Hipódromo ──────────────────
        // Detecta nombres canónicos como Report-$.xls, Report-bs.xls, Report $.xls, Report BOLIVARES.xls,
        // así como reportes que contengan encabezados hípicos en el contenido.
        const isReportFile = fileNameUpper.includes('REPORT');
        const isAmericanas = fileNameUpper.includes('AMERICANAS') ||
            fileNameUpper.includes('HIPIC') ||
            contentStr.includes('CENTROS HIPICOS') ||
            contentStr.includes('HIPICO') ||
            (contentStr.includes('VENTA') && (contentStr.includes('COMISION') || contentStr.includes('COMISIÓN')) && contentStr.includes('PREMIO')) ||
            isReportFile;

        if (isAmericanas) {
            detectedType = 'americanas';
            productName = 'AMERICANAS';
            forcedCurrency = detectFileCurrency(fileName);
        }

        // 1. Detectar el nombre del producto sugerido basado en el contenido del archivo
        if (!productName) {
            if (contentStr.includes("BETM3")) productName = "PARLEY BETM3";
            else if (contentStr.includes("LOTOREY") || contentStr.includes("LOTERIAS") || contentStr.includes("BANKLOT")) productName = "LOTERIAS";
            else if (contentStr.includes("MAXPLAY")) productName = "MAXPLAY";
            else if (contentStr.includes("GALILEO")) productName = "GALILEO";
            else if (contentStr.includes("POSNET")) productName = "POSNET";
            else if (contentStr.includes("GATO")) productName = "GATO";
            else if (contentStr.includes("INMEJORABLE") || contentStr.includes("PARLEY")) productName = "PARLEY";
        }

        // ─── Parser especial para AMERICANAS ───────────────────────────────────
        if (isAmericanas) {
            // Buscar la columna «Nombre» y las columnas numéricas (Venta, Premio, etc.)
            let vendorIdx = -1, salesIdx = -1, prizesIdx = -1;
            let headerRowIndex = -1;

            for (let i = 0; i < Math.min(data.length, 30); i++) {
                const row = data[i];
                if (!row || !Array.isArray(row)) continue;
                const vIdx = row.findIndex((c: any) => typeof c === 'string' && /venta/i.test(c));
                const pIdx = row.findIndex((c: any) => typeof c === 'string' && /premio|pagado|pago/i.test(c));
                const nIdx = row.findIndex((c: any) => typeof c === 'string' && /nombre/i.test(c));
                if (vIdx !== -1 && nIdx !== -1) {
                    // ── FIX #2: Celdas combinadas en Report .xls ──────────────────────────
                    // En archivos con muchas celdas combinadas (p.ej. Report $.xls),
                    // los encabezados "Nombre" y "Venta" pueden estar en col N, pero los
                    // datos reales están en col N-1 (inicio del rango combinado). Esto
                    // hace que la búsqueda de sampleDataRow falle usando nIdx, porque en
                    // las filas de datos el nombre está en nIdx-1.
                    // Solución: buscar la muestra revisando también columnas adyacentes.
                    let realSalesIdx = vIdx;
                    let realPrizesIdx = pIdx;
                    let realVendorIdx = nIdx;
                    const testRows = data.slice(i + 1, i + 100);

                    // 1. Buscar la columna real del nombre de la agencia (vendorIdx)
                    let sampleVendorCol = nIdx;
                    for (const colOffset of [0, -1, 1, -2, 2]) {
                        const checkCol = nIdx + colOffset;
                        if (checkCol < 0) continue;
                        const found = testRows.find((r: any[]) => {
                            if (!r || !Array.isArray(r)) return false;
                            const nameSample = String(r[checkCol] ?? '').trim();
                            return nameSample.length > 3 &&
                                !/^nombre$/i.test(nameSample) &&
                                !/^total/i.test(nameSample) &&
                                /^[\w$\u00C0-\u024F]/i.test(nameSample);
                        });
                        if (found) {
                            sampleVendorCol = checkCol;
                            break;
                        }
                    }
                    realVendorIdx = sampleVendorCol;

                    // 2. Votación de columna para Ventas (salesIdx) y Premios (prizesIdx)
                    // Escaneamos las filas de muestra para encontrar cuál columna contiene
                    // la mayor concentración de números reales o strings numéricos válidos.
                    const salesCandidates = [vIdx, vIdx - 1, vIdx + 1, vIdx - 2, vIdx + 2, vIdx - 3, vIdx + 3].filter(c => c >= 0);
                    const salesVotes = new Array(salesCandidates.length).fill(0);

                    const prizesCandidates = pIdx !== -1
                        ? [pIdx, pIdx - 1, pIdx + 1, pIdx - 2, pIdx + 2, pIdx - 3, pIdx + 3].filter(c => c >= 0)
                        : [];
                    const prizesVotes = new Array(prizesCandidates.length).fill(0);

                    testRows.forEach((r: any[]) => {
                        if (!r || !Array.isArray(r)) return;
                        const nameSample = String(r[realVendorIdx] ?? '').trim();
                        if (nameSample.length <= 3 || /^nombre$/i.test(nameSample) || /^total/i.test(nameSample)) return;

                        // Votar por Ventas
                        salesCandidates.forEach((col, idx) => {
                            const val = r[col];
                            if (val !== undefined && val !== null && val !== '') {
                                if (typeof val === 'number' && !isNaN(val)) {
                                    salesVotes[idx]++;
                                } else if (typeof val === 'string') {
                                    const cleaned = val.replace(/\s/g, '').replace(/,/g, '.');
                                    if (cleaned !== '' && !isNaN(parseFloat(cleaned))) {
                                        salesVotes[idx]++;
                                    }
                                }
                            }
                        });

                        // Votar por Premios
                        prizesCandidates.forEach((col, idx) => {
                            const val = r[col];
                            if (val !== undefined && val !== null && val !== '') {
                                if (typeof val === 'number' && !isNaN(val)) {
                                    prizesVotes[idx]++;
                                } else if (typeof val === 'string') {
                                    const cleaned = val.replace(/\s/g, '').replace(/,/g, '.');
                                    if (cleaned !== '' && !isNaN(parseFloat(cleaned))) {
                                        prizesVotes[idx]++;
                                    }
                                }
                            }
                        });
                    });

                    // Seleccionar columna ganadora de ventas
                    let maxSalesVotes = 0;
                    let bestSalesIdx = vIdx;
                    salesCandidates.forEach((col, idx) => {
                        if (salesVotes[idx] > maxSalesVotes) {
                            maxSalesVotes = salesVotes[idx];
                            bestSalesIdx = col;
                        }
                    });
                    realSalesIdx = bestSalesIdx;

                    // Seleccionar columna ganadora de premios
                    if (pIdx !== -1) {
                        let maxPrizesVotes = 0;
                        let bestPrizesIdx = pIdx;
                        prizesCandidates.forEach((col, idx) => {
                            if (prizesVotes[idx] > maxPrizesVotes) {
                                maxPrizesVotes = prizesVotes[idx];
                                bestPrizesIdx = col;
                            }
                        });
                        realPrizesIdx = bestPrizesIdx;
                    }

                    salesIdx = realSalesIdx;
                    prizesIdx = realPrizesIdx;
                    vendorIdx = realVendorIdx;
                    headerRowIndex = i;
                    break;
                }
            }

            // Fallback: buscar la primera columna de texto seguida de números
            if (headerRowIndex === -1) {
                for (let i = 0; i < Math.min(data.length, 30); i++) {
                    const row = data[i];
                    if (!row || !Array.isArray(row)) continue;
                    // Buscar primera celda que parezca nombre AMERICANAS (empieza con BS o $)
                    const aIdx = row.findIndex((c: any) => typeof c === 'string' && /^(BS\s*|\$)/i.test(String(c).trim()));
                    if (aIdx !== -1) {
                        vendorIdx = aIdx;
                        // Buscar primer número a la derecha de la columna de nombre
                        for (let j = aIdx + 1; j < row.length; j++) {
                            if (typeof row[j] === 'number') { salesIdx = j; break; }
                        }
                        for (let j = salesIdx + 1; j < row.length; j++) {
                            if (typeof row[j] === 'number') { prizesIdx = j; break; }
                        }
                        headerRowIndex = Math.max(0, i - 1);
                        break;
                    }
                }
            }

            if (vendorIdx !== -1) {
                const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
                data.slice(startRow).forEach((row: any[]) => {
                    const raw = String(row[vendorIdx] ?? '').trim();
                    if (!raw) return;
                    // ── FIX #3: Ignorar headers repetidos internos ────────────────────────
                    // Los Report .xls repiten la fila de encabezado cada ~46 filas.
                    // Detectamos si la celda de venta contiene texto (no número).
                    if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') return;
                    if (salesIdx !== -1) {
                        const salesCell = row[salesIdx];
                        if (typeof salesCell === 'string' && /^[a-z]/i.test(salesCell)) return;
                    }
                    const parsed = parseAmericanasName(raw, forcedCurrency || 'DOLAR');
                    if (!parsed) return;

                    // La moneda se toma de la propia celda (BS/$ del prefijo) o del archivo
                    const rowCurrency = parsed.currency;

                    // ── Regla de Negocio Senior:
                    // Si el grupo contiene GRANDE o en el registro está la palabra GRANDE,
                    // no se agrupan en el grupo ficticio "GRANDE": cada taquilla se toma como vendedor individual sin agrupar.
                    const isGrande = parsed.isGrande;
                    let finalVendorName = isGrande ? parsed.agencyName : parsed.grupo;
                    const rawVendorKey = finalVendorName.trim().toUpperCase();
                    if (sellerAliases[rawVendorKey]) {
                        const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawVendorKey]);
                        if (mappedSeller) finalVendorName = mappedSeller.name.toUpperCase();
                    }

                    const salesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
                    const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;

                    if (salesVal === 0 && prizesVal === 0) return; // omitir filas vacías

                    rows.push({
                        vendorName: finalVendorName,        // Vendedor individual (si es GRANDE) o Grupo Concesionario
                        agencyName: parsed.agencyName,     // Nombre de la Agencia / Taquilla
                        sales: salesVal,
                        prizes: prizesVal,
                        sourceRow: {
                            ...row,
                            _currency: rowCurrency,
                            _grupo: isGrande ? finalVendorName : parsed.grupo,
                            _agencyName: parsed.agencyName,
                            _operadora: parsed.operadora,
                            _isIndividual: isGrande
                        }
                    });
                });
            }

            // Consolidar por Grupo + Agencia (Taquilla) + Moneda
            const consolidated = new Map<string, RawRow>();
            for (const row of rows) {
                const key = `${row.vendorName.trim().toUpperCase()}||${(row.agencyName || '').trim().toUpperCase()}||${row.sourceRow._currency}`;
                const existing = consolidated.get(key);
                if (existing) {
                    existing.sales += row.sales;
                    existing.prizes += row.prizes;
                } else {
                    consolidated.set(key, { ...row });
                }
            }
            const consolidatedRows = Array.from(consolidated.values());

            if (consolidatedRows.length === 0) {
                alert("No se pudo detectar ningún registro válido en el archivo. Asegúrate de que contenga una lista de taquillas con sus montos de venta al lado.");
                return;
            }

            setSession({
                fileName,
                productName,
                currency: forcedCurrency || 'DOLAR',
                date: new Date().toISOString().split('T')[0],
                rows: consolidatedRows,
                detectedType
            });
            setStep('preview');
            return; // Salida anticipada para AMERICANAS
        }
        // ──────────────────────────────────────────────────────────────────────

        // 2. Buscador Universal Dinámico de Columnas
        // Escanea las primeras 30 filas intentando conseguir una fila que tenga columas de Venta, Premio y Nombre/Agencia/Usuario
        let vendorIdx = -1, salesIdx = -1, prizesIdx = -1;
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 30); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            
            const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
            const pIdx = row.findIndex(c => typeof c === 'string' && /premio|pagado|pago/i.test(c));
            const nIdx = row.findIndex(c => typeof c === 'string' && /nombre|agencia|agentes?|nivel|comercio|taquilla|distribuidor|usuario|vendedor/i.test(c));

            if (vIdx !== -1 && nIdx !== -1) {
                salesIdx = vIdx;
                prizesIdx = pIdx;
                vendorIdx = nIdx;
                headerRowIndex = i;
                break;
            }
        }

        // 3. Fallback Extremo de Inteligencia Artificial
        // Si no encontró ningun encabezado con los nombres conocidos, deduce las columnas por su tipo de dato
        if (headerRowIndex === -1 && data.length > 0) {
            for (let i = 0; i < Math.min(data.length, 30); i++) {
                const row = data[i];
                if (!row || !Array.isArray(row)) continue;
                
                let strIdx = -1;
                let num1Idx = -1;
                let num2Idx = -1;
                
                for(let j=0; j<Math.min(row.length, 25); j++) {
                    const cell = row[j];
                    if (cell === null || cell === undefined || cell === '') continue;
                    
                    const isNum = typeof cell === 'number' || (typeof cell === 'string' && /^-?[\d.,\s]+$/.test(cell) && !isNaN(parseFloat(cell.replace(/[,.\s]/g, ''))));
                    const isStr = typeof cell === 'string' && !isNum && cell.length > 3 && !cell.toUpperCase().includes('TOTAL') && !cell.toUpperCase().includes('FECHA');
                    
                    if (strIdx === -1 && isStr) strIdx = j;
                    else if (strIdx !== -1 && num1Idx === -1 && isNum) num1Idx = j;
                    else if (num1Idx !== -1 && num2Idx === -1 && isNum) num2Idx = j;
                }
                
                if (strIdx !== -1 && num1Idx !== -1) {
                    vendorIdx = strIdx;
                    salesIdx = num1Idx;
                    prizesIdx = num2Idx;
                    headerRowIndex = Math.max(0, i - 1);
                    break;
                }
            }
        }

        if (headerRowIndex !== -1) {
            detectedType = 'unknown'; // Parsed via dynamic engine
            data.slice(headerRowIndex + 1).forEach(row => {
                const name = row[vendorIdx];
                const nameStr = String(name || '').trim().toUpperCase();
                
                // Ignorar filas en blanco, totales, super-rayas "----", y encabezados repetidos
                if (nameStr && !nameStr.includes("TOTAL") && !nameStr.startsWith("-") && nameStr !== "USUARIO" && row[salesIdx] !== undefined) {
                    const rawName = nameStr;
                    let finalName = rawName;
                    
                    if (sellerAliases[rawName]) {
                        const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawName]);
                        if (mappedSeller) finalName = mappedSeller.name.toUpperCase();
                    }
                    
                    rows.push({
                        vendorName: finalName,
                        sales: parseAmount(row[salesIdx]),
                        prizes: prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0,
                        sourceRow: row
                    });
                }
            });
        }

        if (rows.length === 0) {
            // Activar modo de mapeo manual: el usuario seleccionará las columnas manualmente
            setManualRawData({ fileName, data });
            setManualVendorCol(-1);
            setManualSalesCol(-1);
            setManualPrizesCol(-1);
            setManualSelectMode('vendor');
            setManualStartRow(headerRowIndex >= 0 ? headerRowIndex + 1 : 1);
            setStep('manual');
            return;
        }

        // Consolidar filas con el mismo vendedor (suma ventas y premios) por si el Excel viene repetido
        const consolidated = new Map<string, RawRow>();
        for (const row of rows) {
            const key = row.vendorName.trim().toUpperCase();
            const existing = consolidated.get(key);
            if (existing) {
                existing.sales += row.sales;
                existing.prizes += row.prizes;
            } else {
                consolidated.set(key, { ...row });
            }
        }
        const consolidatedRows = Array.from(consolidated.values());

        setSession({
            fileName,
            productName,
            currency: 'DOLAR',
            date: new Date().toISOString().split('T')[0],
            rows: consolidatedRows,
            detectedType
        });
        setStep('preview');
    };

    const validateVendors = async () => {
        if (!session) return;
        setLoading(true);

        try {
            const allSales = await api.getSales();
            
            // Check for duplicates
            const currentDate = session.date;

            const nonDuplicateRows = session.rows.filter(row => {
                const vendorName = row.vendorName.toUpperCase();
                const rowProductName = (row.productName || session.productName).toUpperCase();
                const rowCurrency = (row.sourceRow?._currency || session.currency).toUpperCase();
                const isDuplicate = allSales.some(sale => 
                    sale.sellerName.trim().toUpperCase() === vendorName.trim().toUpperCase() &&
                    sale.productName.toUpperCase() === rowProductName &&
                    sale.currencyName.toUpperCase() === rowCurrency &&
                    sale.date === currentDate &&
                    (row.agencyName ? (sale.agencyName?.trim().toUpperCase() === row.agencyName.trim().toUpperCase()) : true)
                );
                return !isDuplicate;
            });

            const diff = session.rows.length - nonDuplicateRows.length;
            if (diff > 0) {
                if (nonDuplicateRows.length === 0) {
                    alert("No hay registros nuevos para importar. Todos los registros ya existen para esta fecha y producto.");
                    setLoading(false);
                    return;
                }
                const confirmImport = window.confirm(`Se encontraron ${diff} registros que ya existen. ¿Deseas importar solo los ${nonDuplicateRows.length} registros nuevos?`);
                if (!confirmImport) {
                    setLoading(false);
                    return;
                }
            }

            const newSession = { ...session, rows: nonDuplicateRows };
            setSession(newSession);

            const currentSellers = await api.getSellers();
            const missing = nonDuplicateRows
                .filter(r => {
                    const seller = currentSellers.find(s => s.name.trim().toUpperCase() === r.vendorName.trim().toUpperCase());
                    if (!seller) return true;
                    
                    const rowProductName = (r.productName || session.productName).trim().toUpperCase();
                    const productId = `p-${rowProductName.toLowerCase().replace(/\s/g, '-')}`;
                    const product = seller.products.find(p => String(p.id) === String(productId) || p.name.toUpperCase() === rowProductName);
                    if (!product) return true;

                    // Verificar si tiene la moneda específica de esta fila configurada
                    const rowCurrency = (r.sourceRow?._currency || session.currency || 'DOLAR').toUpperCase();
                    return !product.currencies.some(c => String(c.id).toUpperCase() === rowCurrency || c.name.toUpperCase() === rowCurrency);
                })
                .map(r => r.vendorName);

            const uniqueMissing = Array.from(new Set(missing));

            if (uniqueMissing.length > 0) {
                setMissingVendors(uniqueMissing.map(name => ({ 
                    name, 
                    commissionPct: 0, 
                    partPct: 0,
                    isExisting: !!currentSellers.find(s => s.name.trim().toUpperCase() === name.trim().toUpperCase())
                })));
                setStep('resolution');
            } else {
                await executeImport(newSession);
            }
        } catch (error: any) {
            console.error(error);
            alert(`Error al validar los registros de la importación: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const createAndImportSellers = async () => {
        if (!session || loading) return;
        setLoading(true);
        
        try {
            let updatedSession = { ...session, rows: [...session.rows] };
            const currentSellers = await api.getSellers();

            for (const v of missingVendors) {
                // Filas asociadas a este vendedor
                const vendorRows = updatedSession.rows.filter(r => r.vendorName.trim().toUpperCase() === v.name.trim().toUpperCase());

                // Productos que este vendedor maneja en la importación
                const vendorProducts = Array.from(new Set(
                    vendorRows.map(r => (r.productName || session.productName).trim().toUpperCase())
                ));
                if (vendorProducts.length === 0) {
                    vendorProducts.push(session.productName.trim().toUpperCase() || 'PARLEY');
                }

                // Si está mapeado a un vendedor existente
                if (v.mappedSellerId) {
                    await addSellerAlias(v.mappedSellerId, v.name);
                    
                    const mappedSeller = currentSellers.find(s => Number(s.id) === v.mappedSellerId);
                    if (mappedSeller) {
                        updatedSession.rows = updatedSession.rows.map(r => 
                            r.vendorName.trim().toUpperCase() === v.name.trim().toUpperCase()
                                ? { ...r, vendorName: mappedSeller.name.toUpperCase() }
                                : r
                        );

                        let needsUpdate = false;
                        for (const prodName of vendorProducts) {
                            const prodId = `p-${prodName.toLowerCase().replace(/\s/g, '-')}`;
                            let product = mappedSeller.products.find(p => String(p.id) === String(prodId) || p.name.toUpperCase() === prodName);
                            if (!product) {
                                product = {
                                    id: prodId,
                                    name: prodName,
                                    currencies: []
                                };
                                mappedSeller.products.push(product);
                                needsUpdate = true;
                            }

                            const prodCurrencies = Array.from(new Set(
                                vendorRows
                                    .filter(r => (r.productName || session.productName).trim().toUpperCase() === prodName)
                                    .map(r => (r.sourceRow?._currency || session.currency || 'DOLAR').toUpperCase())
                            ));
                            if (prodCurrencies.length === 0) prodCurrencies.push((session.currency || 'DOLAR').toUpperCase());

                            for (const curr of prodCurrencies) {
                                let currencyConfig = product.currencies.find(c => String(c.id).toUpperCase() === curr || c.name.toUpperCase() === curr);
                                if (!currencyConfig) {
                                    currencyConfig = {
                                        id: curr,
                                        name: curr,
                                        commissionPct: v.commissionPct || 0,
                                        partPct: v.partPct || 0
                                    };
                                    product.currencies.push(currencyConfig);
                                    needsUpdate = true;
                                } else if (currencyConfig.commissionPct === 0 && currencyConfig.partPct === 0 && (v.commissionPct > 0 || v.partPct > 0)) {
                                    currencyConfig.commissionPct = v.commissionPct;
                                    currencyConfig.partPct = v.partPct;
                                    needsUpdate = true;
                                }
                            }
                        }

                        if (needsUpdate) {
                            await api.updateSeller(mappedSeller);
                        }
                    }
                    continue;
                }

                const existingSeller = currentSellers.find(s => s.name.trim().toUpperCase() === v.name.trim().toUpperCase());
                
                if (existingSeller) {
                    let needsUpdate = false;
                    for (const prodName of vendorProducts) {
                        const prodId = `p-${prodName.toLowerCase().replace(/\s/g, '-')}`;
                        let product = existingSeller.products.find(p => String(p.id) === String(prodId) || p.name.toUpperCase() === prodName);
                        
                        if (!product) {
                            product = {
                                id: prodId,
                                name: prodName,
                                currencies: []
                            };
                            existingSeller.products.push(product);
                            needsUpdate = true;
                        }
                        
                        const prodCurrencies = Array.from(new Set(
                            vendorRows
                                .filter(r => (r.productName || session.productName).trim().toUpperCase() === prodName)
                                .map(r => (r.sourceRow?._currency || session.currency || 'DOLAR').toUpperCase())
                        ));
                        if (prodCurrencies.length === 0) prodCurrencies.push((session.currency || 'DOLAR').toUpperCase());

                        for (const curr of prodCurrencies) {
                            let currencyConfig = product.currencies.find(c => String(c.id).toUpperCase() === curr || c.name.toUpperCase() === curr);
                            if (!currencyConfig) {
                                currencyConfig = {
                                    id: curr,
                                    name: curr,
                                    commissionPct: v.commissionPct || 0,
                                    partPct: v.partPct || 0
                                };
                                product.currencies.push(currencyConfig);
                                needsUpdate = true;
                            } else if (v.commissionPct > 0 || v.partPct > 0) {
                                currencyConfig.commissionPct = v.commissionPct;
                                currencyConfig.partPct = v.partPct;
                                needsUpdate = true;
                            }
                        }
                    }
                    
                    if (needsUpdate) {
                        await api.updateSeller(existingSeller);
                    }
                } else {
                    const productsToAdd = vendorProducts.map(prodName => {
                        const prodId = `p-${prodName.toLowerCase().replace(/\s/g, '-')}`;
                        const prodCurrencies = Array.from(new Set(
                            vendorRows
                                .filter(r => (r.productName || session.productName).trim().toUpperCase() === prodName)
                                .map(r => (r.sourceRow?._currency || session.currency || 'DOLAR').toUpperCase())
                        ));
                        if (prodCurrencies.length === 0) prodCurrencies.push((session.currency || 'DOLAR').toUpperCase());

                        return {
                            id: prodId,
                            name: prodName,
                            currencies: prodCurrencies.map(curr => ({
                                id: curr,
                                name: curr,
                                commissionPct: v.commissionPct || 0,
                                partPct: v.partPct || 0
                            }))
                        };
                    });

                    await api.addSeller({
                        name: v.name,
                        products: productsToAdd
                    });
                }
            }

            setMissingVendors([]);
            setSession(updatedSession);
            await executeImport(updatedSession);
        } catch (error: any) {
            console.error(error);
            alert(`Error durante la importación: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const executeImport = async (validSession?: ImportSession) => {
        const activeSession = validSession || session;
        if (!activeSession) return;
        setLoading(true);

        try {
            // Asegurar que todos los productos globales presentes en la sesión existan en la lista de productos globales
            const allSessionProducts = Array.from(new Set(
                activeSession.rows
                    .map(r => (r.productName || activeSession.productName).trim().toUpperCase())
                    .filter(Boolean)
            ));
            if (activeSession.productName) {
                allSessionProducts.push(activeSession.productName.trim().toUpperCase());
            }

            const currentGlobal = await getGlobalProducts();
            const currentGlobalUpper = currentGlobal.map(p => p.toUpperCase());

            for (const prodName of allSessionProducts) {
                if (!currentGlobalUpper.includes(prodName)) {
                    await addGlobalProduct(prodName);
                    currentGlobalUpper.push(prodName);
                }
            }

            const allSellers = await api.getSellers();
            let allAgencies: Agency[] = [];
            try {
                allAgencies = await getAgencies();
            } catch (err) {
                console.warn("No se pudieron cargar agencias existentes:", err);
            }

            const weekId = dateToWeekId(activeSession.date);

            for (const row of activeSession.rows) {
                const seller = allSellers.find(s => s.name.trim().toUpperCase() === row.vendorName.trim().toUpperCase());
                if (!seller) continue;

                const rowProductName = (row.productName || activeSession.productName).trim().toUpperCase();
                const rowProductId = `p-${rowProductName.toLowerCase().replace(/\s/g, '-')}`;
                const rowCurrency = (row.sourceRow?._currency || activeSession.currency || 'DOLAR').toUpperCase();

                let sellerModified = false;

                // Asegurar que el vendedor tenga el producto en su perfil
                let product = seller.products.find(p => 
                    String(p.id) === String(rowProductId) || p.name.toUpperCase() === rowProductName
                );
                
                if (!product) {
                    product = {
                        id: rowProductId,
                        name: rowProductName,
                        currencies: [{ id: rowCurrency, name: rowCurrency, commissionPct: 0, partPct: 0 }]
                    };
                    seller.products.push(product);
                    sellerModified = true;
                }

                // Obtener moneda y sus porcentajes
                let currencyConfig = product.currencies.find(c => 
                    String(c.id).toUpperCase() === rowCurrency || c.name.toUpperCase() === rowCurrency
                );

                // Si la moneda no existe en el producto del vendedor, la agregamos con 0% por defecto
                if (!currencyConfig) {
                    currencyConfig = { id: rowCurrency, name: rowCurrency, commissionPct: 0, partPct: 0 };
                    product.currencies.push(currencyConfig);
                    sellerModified = true;
                }

                // Actualizar vendedor en BD solo si fue modificado
                if (sellerModified) {
                    await api.updateSeller(seller);
                }

                const comPct = currencyConfig.commissionPct;
                const partPct = currencyConfig.partPct;

                const comision = roundFinance(row.sales * (comPct / 100));
                const neto = roundFinance(row.sales - row.prizes - comision);
                const participacion = roundFinance(neto * (partPct / 100));

                // Si viene nombre de taquilla/agencia, vincular o crear automáticamente
                let agencyId: string | number | undefined = undefined;
                if (row.agencyName) {
                    const existingAgency = allAgencies.find(a => 
                        a.name.trim().toUpperCase() === row.agencyName!.trim().toUpperCase() &&
                        String(a.sellerId) === String(seller.id)
                    );
                    if (existingAgency) {
                        agencyId = existingAgency.id;
                    } else {
                        try {
                            const newAgency = await addAgency({
                                name: row.agencyName,
                                sellerId: seller.id,
                                sellerName: seller.name
                            });
                            agencyId = newAgency.id;
                            allAgencies.push(newAgency);
                        } catch (err) {
                            console.warn("No se pudo crear automáticamente la agencia:", err);
                        }
                    }
                }

                await api.addSale({
                    sellerId: String(seller.id),
                    sellerName: seller.name,
                    agencyId: agencyId,
                    agencyName: row.agencyName,
                    productId: product.id,
                    productName: rowProductName,
                    currencyId: currencyConfig.id,
                    currencyName: rowCurrency,
                    amount: row.sales,
                    prize: row.prizes,
                    commission: comision,
                    total: neto,
                    participation: participacion,
                    totalVendor: roundFinance(comision + participacion),
                    totalBank: roundFinance(neto - participacion),
                    date: activeSession.date,
                    weekId: weekId,
                    registeredAt: new Date().toISOString()
                });
            }

            setStep('success');
            onImportSuccess();
        } catch (error: any) {
            console.error(error);
            alert(`Error durante la importación: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setSession(null);
        setStep('upload');
        setMissingVendors([]);
        setManualRawData(null);
        setManualVendorCol(-1);
        setManualSalesCol(-1);
        setManualPrizesCol(-1);
    };

    const handleDeleteRow = (index: number) => {
        if (!session) return;
        const newRows = [...session.rows];
        newRows.splice(index, 1);
        setSession({ ...session, rows: newRows });
    };

    const handleRemoveMissingVendor = (index: number) => {
        const vendorToRemove = missingVendors[index];
        const newMissing = [...missingVendors];
        newMissing.splice(index, 1);
        setMissingVendors(newMissing);

        if (session) {
            const newRows = session.rows.filter(r => r.vendorName.trim().toUpperCase() !== vendorToRemove.name.trim().toUpperCase());
            setSession({ ...session, rows: newRows });
        }
    };

    /**
     * Confirma el mapeo manual de columnas y crea la sesión de importación.
     * Requiere que manualVendorCol y manualSalesCol estén asignados.
     */
    const confirmManualMapping = () => {
        if (!manualRawData || manualVendorCol === -1 || manualSalesCol === -1) return;
        const { fileName, data } = manualRawData;

        const rows: RawRow[] = [];
        data.slice(manualStartRow).forEach((row: any[]) => {
            if (!Array.isArray(row)) return;
            const name = String(row[manualVendorCol] ?? '').trim().toUpperCase();
            if (!name || /^total/i.test(name) || name.startsWith('-')) return;

            let finalName = name;
            if (sellerAliases[name]) {
                const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[name]);
                if (mappedSeller) finalName = mappedSeller.name.toUpperCase();
            }

            const salesVal  = parseAmount(row[manualSalesCol]);
            const prizesVal = manualPrizesCol !== -1 ? parseAmount(row[manualPrizesCol]) : 0;
            if (salesVal === 0 && prizesVal === 0) return;

            rows.push({ vendorName: finalName, sales: salesVal, prizes: prizesVal, sourceRow: row });
        });

        if (rows.length === 0) {
            alert('No se pudieron extraer filas con esos ajustes. Revisa la selección de columnas y la fila de inicio.');
            return;
        }

        // Consolidar filas con el mismo nombre de vendedor
        const consolidated = new Map<string, RawRow>();
        for (const row of rows) {
            const key = row.vendorName.trim().toUpperCase();
            const existing = consolidated.get(key);
            if (existing) {
                existing.sales  += row.sales;
                existing.prizes += row.prizes;
            } else {
                consolidated.set(key, { ...row });
            }
        }

        setSession({
            fileName,
            productName: '',
            currency: 'DOLAR',
            date: new Date().toISOString().split('T')[0],
            rows: Array.from(consolidated.values()),
            detectedType: 'unknown'
        });
        setManualRawData(null);
        setStep('preview');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-ios-blue/10 text-ios-blue flex items-center justify-center">
                            <FileUp size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Importación Centralizada</h2>
                            <p className="text-[10px] text-[#00361F] dark:text-[#EBBB03] uppercase tracking-widest font-bold">Tecnología GBC GAMING</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} className="text-ios-subtext" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                    {step === 'upload' && (
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
                                <p className="text-ios-subtext text-xs max-w-xs">Arrastra tu archivo Excel (.xlsx, .xls) o CSV — Betm3, Banklot, Maxplay, Americanas, Report Hipódromo...</p>
                            </div>
                            <label className="mt-4 px-6 py-2.5 bg-ios-blue text-white rounded-full font-bold cursor-pointer hover:brightness-110 active:scale-95 transition-all text-xs shadow-lg shadow-ios-blue/20">
                                Explorar Archivos
                                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                            </label>
                        </div>
                    )}

                    {step === 'preview' && session && (
                        <div className="animate-fade-in space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5"><Package size={12} /> Producto</label>
                                    <input
                                        list="product-list"
                                        placeholder="Escribe o selecciona..."
                                        value={session.productName}
                                        onChange={(e) => setSession({ ...session, productName: e.target.value.toUpperCase() })}
                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                                    />
                                    <datalist id="product-list">
                                        {products.map(p => <option key={p} value={p} />)}
                                    </datalist>
                                </div>
                                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5"><Coins size={12} /> Moneda</label>
                                    <input
                                        list="currency-list"
                                        placeholder="Escribe o selecciona..."
                                        value={session.currency}
                                        onChange={(e) => setSession({ ...session, currency: e.target.value.toUpperCase() })}
                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                                    />
                                    <datalist id="currency-list">
                                        {currencies.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                                <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                                    <label className="text-[10px] font-bold text-ios-subtext uppercase flex items-center gap-1.5"><Calendar size={12} /> Fecha de Semana</label>
                                    <input
                                        type="date"
                                        value={session.date}
                                        onChange={(e) => setSession({ ...session, date: e.target.value })}
                                        className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-ios-blue outline-none"
                                    />
                                </div>
                            </div>

                            {/* Resumen de Métricas */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Total Filas</p>
                                    <p className="text-xl font-black">{session.rows.length}</p>
                                </div>
                                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Grupos Únicos</p>
                                    <p className="text-xl font-black text-ios-blue">
                                        {new Set(session.rows.map(r => r.vendorName)).size}
                                    </p>
                                </div>
                                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Ventas Totales</p>
                                    <p className="text-xl font-black text-ios-green">
                                        {roundFinance(session.rows.reduce((acc, r) => acc + r.sales, 0)).toLocaleString()}
                                    </p>
                                </div>
                                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Premios Totales</p>
                                    <p className="text-xl font-black text-ios-red">
                                        {roundFinance(session.rows.reduce((acc, r) => acc + r.prizes, 0)).toLocaleString()}
                                    </p>
                                </div>
                                <div className="glass-panel p-3.5 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                                    <p className="text-[10px] font-bold text-ios-subtext uppercase tracking-wider">Importe Neto</p>
                                    <p className="text-xl font-black">
                                        {roundFinance(session.rows.reduce((acc, r) => acc + (r.sales - r.prizes), 0)).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Barra de Herramientas de Agrupación Manual cuando hay filas seleccionadas */}
                            {selectedRowIndices.length > 0 && (
                                <div className="glass-panel p-4 rounded-2xl border border-ios-blue/30 bg-ios-blue/5 flex flex-col md:flex-row items-center justify-between gap-3 animate-fade-in shadow-lg shadow-ios-blue/5">
                                    <div className="flex items-center gap-2.5 text-ios-blue">
                                        <div className="p-2 rounded-xl bg-ios-blue/10">
                                            <Users size={18} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold leading-tight">
                                                {selectedRowIndices.length} {selectedRowIndices.length === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
                                            </div>
                                            <div className="text-[10px] text-ios-subtext">
                                                Agrupar bajo un solo vendedor
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                                        <div className="relative flex-1 md:w-56">
                                            <input
                                                list="grouping-sellers-list"
                                                type="text"
                                                placeholder="Vendedor destino..."
                                                value={bulkTargetSeller}
                                                onChange={e => setBulkTargetSeller(e.target.value.toUpperCase())}
                                                className="w-full bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-ios-blue outline-none"
                                            />
                                            <datalist id="grouping-sellers-list">
                                                {allSellers.map(s => <option key={String(s.id)} value={s.name} />)}
                                            </datalist>
                                        </div>

                                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-ios-subtext cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={bulkSaveAlias}
                                                onChange={e => setBulkSaveAlias(e.target.checked)}
                                                className="rounded accent-ios-blue text-xs cursor-pointer"
                                            />
                                            Recordar alias
                                        </label>

                                        <button
                                            type="button"
                                            disabled={!bulkTargetSeller.trim()}
                                            onClick={() => handleApplyManualGroup(bulkTargetSeller, selectedRowIndices, bulkSaveAlias)}
                                            className="px-4 py-1.5 bg-ios-blue text-white rounded-xl text-xs font-bold shadow-md shadow-ios-blue/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Agrupar Selección
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedRowIndices([])}
                                            className="px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-ios-subtext transition-colors"
                                        >
                                            Deseleccionar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Cabecera de la tabla con acción de Agrupar */}
                            <div className="flex items-center justify-between gap-2 px-1">
                                <span className="text-xs font-bold text-ios-subtext uppercase tracking-wider">
                                    Detalle de Filas ({session.rows.length})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const firstVendor = session.rows[0]?.vendorName || '';
                                        setGroupingSourceAgent(firstVendor);
                                        setGroupingTargetSeller('');
                                        setGroupingCustomTarget('');
                                        setGroupingSaveAlias(true);
                                        setIsGroupingModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-ios-blue/10 hover:text-ios-blue text-ios-subtext text-xs font-bold flex items-center gap-1.5 transition-colors border border-black/5 dark:border-white/5"
                                >
                                    <Users size={13} />
                                    Agrupar Vendedor...
                                </button>
                            </div>

                            <div className="glass-panel rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                                <div className="overflow-x-auto max-h-72 no-scrollbar">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 bg-white dark:bg-[#1c1c1e] z-10 border-b border-black/5 dark:border-white/5">
                                            <tr className="text-ios-subtext font-bold">
                                                <th className="px-3 py-3 w-8 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRowIndices.length === session.rows.length && session.rows.length > 0}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setSelectedRowIndices(session.rows.map((_, idx) => idx));
                                                            } else {
                                                                setSelectedRowIndices([]);
                                                            }
                                                        }}
                                                        className="rounded accent-ios-blue cursor-pointer"
                                                        title="Seleccionar todas"
                                                    />
                                                </th>
                                                <th className="px-4 py-3">Vendedor / Grupo</th>
                                                <th className="px-4 py-3">Producto</th>
                                                {session.rows.some(r => r.agencyName) && (
                                                    <th className="px-4 py-3">Agencia / Taquilla</th>
                                                )}
                                                <th className="px-4 py-3">Moneda</th>
                                                <th className="px-4 py-3 text-right">Ventas</th>
                                                <th className="px-4 py-3 text-right">Premios</th>
                                                <th className="px-4 py-3 text-right">Importe Neto</th>
                                                <th className="px-4 py-3 text-center">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                            {session.rows.map((row, i) => {
                                                const rowCurr = row.sourceRow?._currency || session.currency;
                                                const isBs = rowCurr === 'BOLIVARES VENEZOLANOS';
                                                const isCop = rowCurr === 'PESO COLOMBIANA' || rowCurr === 'PESOS COLOMBIANOS';
                                                const rowProd = row.productName || session.productName;
                                                const isSelected = selectedRowIndices.includes(i);

                                                return (
                                                    <tr key={i} className={`transition-colors ${isSelected ? 'bg-ios-blue/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        setSelectedRowIndices(prev => [...prev, i]);
                                                                    } else {
                                                                        setSelectedRowIndices(prev => prev.filter(idx => idx !== i));
                                                                    }
                                                                }}
                                                                className="rounded accent-ios-blue cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-ios-blue">{row.vendorName}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setGroupingSourceAgent(row.vendorName);
                                                                        setGroupingTargetSeller('');
                                                                        setGroupingCustomTarget('');
                                                                        setGroupingSaveAlias(true);
                                                                        setIsGroupingModalOpen(true);
                                                                    }}
                                                                    className="p-1 rounded-lg text-ios-subtext/50 hover:text-ios-blue hover:bg-ios-blue/10 transition-colors"
                                                                    title={`Reasignar o agrupar ${row.vendorName}`}
                                                                >
                                                                    <UserCheck size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-ios-subtext">
                                                                {rowProd}
                                                            </span>
                                                        </td>
                                                        {session.rows.some(r => r.agencyName) && (
                                                            <td className="px-4 py-2.5 font-medium text-ios-text">
                                                                {row.agencyName || <span className="text-ios-subtext opacity-50">—</span>}
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-2.5">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                isBs
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                    : isCop
                                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                                        : 'bg-ios-blue/10 text-ios-blue'
                                                            }`}>
                                                                {isBs ? 'Bs' : isCop ? 'COP' : 'USD'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right tabular-nums">{row.sales.toLocaleString()}</td>
                                                        <td className="px-4 py-2.5 text-right tabular-nums text-ios-red">{row.prizes.toLocaleString()}</td>
                                                        <td className="px-4 py-2.5 text-right tabular-nums font-black">{(row.sales - row.prizes).toLocaleString()}</td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setGroupingSourceAgent(row.vendorName);
                                                                        setGroupingTargetSeller('');
                                                                        setGroupingCustomTarget('');
                                                                        setGroupingSaveAlias(true);
                                                                        setIsGroupingModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 text-ios-subtext hover:text-ios-blue hover:bg-ios-blue/10 rounded-xl transition-colors"
                                                                    title="Agrupar a vendedor"
                                                                >
                                                                    <Users size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteRow(i)} 
                                                                    className="p-1.5 text-ios-red/70 hover:text-ios-red hover:bg-ios-red/10 rounded-xl transition-colors"
                                                                    title="Eliminar fila"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={reset} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">Cancelar</button>
                                <button
                                    onClick={validateVendors}
                                    disabled={loading}
                                    className="px-8 py-3 bg-ios-blue text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> Validar e Importar</>}
                                </button>
                            </div>

                            {/* Submodal de Agrupación Manual */}
                            {isGroupingModalOpen && (
                                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                                    <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 rounded-xl bg-ios-blue/10 text-ios-blue">
                                                    <Users size={18} />
                                                </div>
                                                <h3 className="text-base font-bold">Agrupar a Vendedor</h3>
                                            </div>
                                            <button
                                                onClick={() => setIsGroupingModalOpen(false)}
                                                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-ios-subtext transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="space-y-4 text-xs">
                                            <div className="space-y-1.5">
                                                <label className="font-bold text-ios-subtext uppercase text-[10px]">Agente del archivo</label>
                                                <select
                                                    value={groupingSourceAgent}
                                                    onChange={e => setGroupingSourceAgent(e.target.value)}
                                                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2 font-bold outline-none border border-black/5 dark:border-white/5"
                                                >
                                                    {Array.from(new Set(session.rows.map(r => r.vendorName))).map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="font-bold text-ios-subtext uppercase text-[10px]">Asignar / Agrupar a</label>
                                                <div className="space-y-2">
                                                    <select
                                                        value={groupingTargetSeller}
                                                        onChange={e => {
                                                            setGroupingTargetSeller(e.target.value);
                                                            if (e.target.value) setGroupingCustomTarget('');
                                                        }}
                                                        className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2 font-bold outline-none border border-black/5 dark:border-white/5"
                                                    >
                                                        <option value="">-- Seleccionar vendedor existente --</option>
                                                        {allSellers.map(s => (
                                                            <option key={String(s.id)} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>

                                                    <div className="flex items-center gap-2">
                                                        <div className="h-px bg-black/10 dark:bg-white/10 flex-1"></div>
                                                        <span className="text-[10px] text-ios-subtext uppercase font-bold">o nuevo</span>
                                                        <div className="h-px bg-black/10 dark:bg-white/10 flex-1"></div>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder="Escribir nombre de nuevo vendedor..."
                                                        value={groupingCustomTarget}
                                                        onChange={e => {
                                                            setGroupingCustomTarget(e.target.value.toUpperCase());
                                                            if (e.target.value) setGroupingTargetSeller('');
                                                        }}
                                                        className="w-full bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2 font-bold outline-none border border-black/5 dark:border-white/5 placeholder:font-normal"
                                                    />
                                                </div>
                                            </div>

                                            <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={groupingSaveAlias}
                                                    onChange={e => setGroupingSaveAlias(e.target.checked)}
                                                    className="rounded accent-ios-blue mt-0.5 cursor-pointer"
                                                />
                                                <span className="text-[11px] text-ios-subtext leading-snug">
                                                    <strong>Guardar regla permanente:</strong> asociar siempre automáticamente <em>"{groupingSourceAgent}"</em> a este vendedor en futuras importaciones.
                                                </span>
                                            </label>
                                        </div>

                                        <div className="flex justify-end gap-2.5 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsGroupingModalOpen(false)}
                                                className="px-4 py-2 rounded-xl text-xs font-bold text-ios-subtext hover:bg-black/5"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!groupingTargetSeller && !groupingCustomTarget.trim()}
                                                onClick={() => {
                                                    const target = (groupingTargetSeller || groupingCustomTarget).trim().toUpperCase();
                                                    if (!target) return;
                                                    const matchingIndices = session.rows
                                                        .map((r, idx) => r.vendorName.trim().toUpperCase() === groupingSourceAgent.trim().toUpperCase() ? idx : -1)
                                                        .filter(idx => idx !== -1);
                                                    handleApplyManualGroup(target, matchingIndices, groupingSaveAlias);
                                                    setIsGroupingModalOpen(false);
                                                }}
                                                className="px-5 py-2 bg-ios-blue text-white rounded-xl text-xs font-bold shadow-md shadow-ios-blue/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Confirmar Agrupación
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'resolution' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="text-center space-y-2 mb-6">
                                <div className="w-16 h-16 rounded-full bg-ios-blue/10 text-ios-blue flex items-center justify-center mx-auto">
                                    <UserPlus size={32} />
                                </div>
                                <h3 className="text-xl font-bold">Configuración de Porcentajes por Vendedor / Grupo</h3>
                                <p className="text-xs text-ios-subtext">Configura los porcentajes para los {missingVendors.length} vendedores o grupos detectados en el archivo que no tienen este producto/moneda configurado.</p>
                            </div>

                            {/* Panel de Asignación Rápida Masiva */}
                            <div className="glass-panel p-4 rounded-2xl border border-ios-blue/20 bg-ios-blue/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2.5 text-ios-blue">
                                    <div className="p-2 rounded-xl bg-ios-blue/10">
                                        <Percent size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold leading-tight">Asignación Masiva de Porcentajes</h4>
                                        <p className="text-[10px] text-ios-subtext">Aplica comisión y participación a todos los {missingVendors.length} vendedores/grupos faltantes</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                    <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-1.5 border border-black/5 dark:border-white/5">
                                        <span className="text-[10px] font-bold text-ios-subtext uppercase">Venta:</span>
                                        <input
                                            type="number"
                                            value={bulkCommission}
                                            onChange={e => setBulkCommission(Number(e.target.value))}
                                            className="w-12 bg-transparent text-xs font-black text-right focus:outline-none"
                                            placeholder="0"
                                        />
                                        <span className="text-xs font-bold text-ios-subtext">%</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-1.5 border border-black/5 dark:border-white/5">
                                        <span className="text-[10px] font-bold text-ios-subtext uppercase">Part:</span>
                                        <input
                                            type="number"
                                            value={bulkParticipation}
                                            onChange={e => setBulkParticipation(Number(e.target.value))}
                                            className="w-12 bg-transparent text-xs font-black text-right focus:outline-none"
                                            placeholder="0"
                                        />
                                        <span className="text-xs font-bold text-ios-subtext">%</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyBulkPercentages(bulkCommission, bulkParticipation)}
                                        className="px-4 py-2 bg-ios-blue text-white rounded-xl text-xs font-bold shadow-md shadow-ios-blue/20 hover:opacity-90 active:scale-95 transition-all whitespace-nowrap"
                                    >
                                        Aplicar a Todos
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar pr-1">
                                {missingVendors.map((v, i) => {
                                    const mappedSeller = v.mappedSellerId ? allSellers.find(s => Number(s.id) === v.mappedSellerId) : null;
                                    const mappedProduct = mappedSeller && session ? mappedSeller.products.find(p => String(p.id) === `p-${session.productName.toLowerCase().replace(/\s/g, '-')}` || p.name.toUpperCase() === session.productName.toUpperCase()) : null;
                                    const mappedCurrency = mappedProduct && session ? mappedProduct.currencies.find(c => String(c.id) === String(session.currency) || c.name.toUpperCase() === session.currency.toUpperCase()) : null;
                                    const needsPercentages = !v.mappedSellerId || !mappedProduct || !mappedCurrency;
                                    const associatedCount = session ? session.rows.filter(r => r.vendorName.trim().toUpperCase() === v.name.trim().toUpperCase()).length : 0;

                                    return (
                                    <div key={i} className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-ios-red animate-pulse"></div>
                                            <span className="font-bold text-sm truncate flex-1">{v.name}</span>
                                            {associatedCount > 0 && (
                                                <span className="text-[10px] text-ios-subtext font-semibold px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-md flex items-center gap-1">
                                                    <Building2 size={11} /> {associatedCount} taquillas
                                                </span>
                                            )}
                                            
                                            {!v.isExisting ? (
                                                <select
                                                    value={v.mappedSellerId || ''}
                                                    onChange={e => {
                                                        const copy = [...missingVendors];
                                                        copy[i].mappedSellerId = e.target.value ? Number(e.target.value) : null;
                                                        setMissingVendors(copy);
                                                    }}
                                                    className="bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-ios-blue outline-none max-w-[200px]"
                                                >
                                                    <option value="">Crear como nuevo Grupo (Requiere %)</option>
                                                    {allSellers.map(s => (
                                                        <option key={String(s.id)} value={Number(s.id)}>
                                                            Asignar al Grupo {s.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-[10px] text-ios-blue font-bold px-3 py-1 bg-ios-blue/10 rounded-full">
                                                    Grupo existente (Requiere % para Moneda/Producto)
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => handleRemoveMissingVendor(i)}
                                                className="p-1.5 text-ios-red/70 hover:text-ios-red hover:bg-ios-red/10 rounded-xl transition-colors shrink-0"
                                                title="Omitir este vendedor de la importación"
                                                type="button"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        
                                        {needsPercentages && (
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-ios-subtext uppercase">Venta (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={v.commissionPct}
                                                            onChange={e => {
                                                                const copy = [...missingVendors];
                                                                copy[i].commissionPct = Number(e.target.value);
                                                                setMissingVendors(copy);
                                                            }}
                                                            className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-black focus:ring-1 focus:ring-ios-blue outline-none"
                                                        />
                                                        <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-ios-subtext uppercase">Neto/Part (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={v.partPct}
                                                            onChange={e => {
                                                                const copy = [...missingVendors];
                                                                copy[i].partPct = Number(e.target.value);
                                                                setMissingVendors(copy);
                                                            }}
                                                            className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-2 text-sm font-black focus:ring-1 focus:ring-ios-blue outline-none"
                                                        />
                                                        <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {v.mappedSellerId && !needsPercentages && (
                                            <div className="text-[10px] text-ios-blue font-bold px-2">
                                                Se usará este vendedor y se guardará la regla de autocompletado para futuras importaciones. Usará sus porcentajes actuales.
                                            </div>
                                        )}
                                        {v.mappedSellerId && needsPercentages && (
                                            <div className="text-[10px] text-ios-blue font-bold px-2">
                                                Este vendedor no tiene los porcentajes para este producto. Por favor configúralos arriba.
                                            </div>
                                        )}
                                    </div>
                                )})}
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                                <button onClick={reset} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">Atrás</button>
                                <button
                                    onClick={createAndImportSellers}
                                    disabled={loading}
                                    className="px-10 py-3 bg-ios-blue text-white rounded-2xl font-bold shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                                    {loading ? 'Importando...' : 'Crear y Finalizar Importación'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'manual' && manualRawData && (() => {
                        const allRows = manualRawData.data;
                        const maxCols = Math.min(
                            Math.max(...allRows.slice(0, 20).map((r: any[]) => Array.isArray(r) ? r.length : 0), 1),
                            15
                        );
                        const modeColors = {
                            vendor: { active: 'bg-ios-blue text-white border-transparent shadow-sm', col: 'bg-ios-blue/10 text-ios-blue font-bold', hover: 'hover:bg-ios-blue/5 dark:hover:bg-ios-blue/10' },
                            sales:  { active: 'bg-emerald-500 text-white border-transparent shadow-sm', col: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold', hover: 'hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10' },
                            prizes: { active: 'bg-ios-red text-white border-transparent shadow-sm', col: 'bg-ios-red/10 text-ios-red font-bold', hover: 'hover:bg-ios-red/5 dark:hover:bg-ios-red/10' }
                        };
                        const modeLabels: Record<'vendor'|'sales'|'prizes', string> = {
                            vendor: '👤 Nombre',
                            sales:  '💰 Ventas',
                            prizes: '🏆 Premios (opcional)'
                        };
                        const getColStyle = (ci: number) => {
                            if (ci === manualVendorCol) return modeColors.vendor.col;
                            if (ci === manualSalesCol)  return modeColors.sales.col;
                            if (ci === manualPrizesCol) return modeColors.prizes.col;
                            return 'text-ios-subtext';
                        };
                        const handleColClick = (ci: number) => {
                            if (manualSelectMode === 'vendor')      setManualVendorCol(ci);
                            else if (manualSelectMode === 'sales')  setManualSalesCol(ci);
                            else                                     setManualPrizesCol(ci);
                        };
                        return (
                            <div className="animate-fade-in space-y-5">
                                {/* Cabecera informativa */}
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                                        <FileUp size={28} />
                                    </div>
                                    <h3 className="text-lg font-bold">Mapeo Manual de Columnas</h3>
                                    <p className="text-xs text-ios-subtext max-w-sm mx-auto">
                                        El formato no pudo detectarse automáticamente.
                                        Selecciona el modo y haz clic en una columna para asignarla.
                                        <b> Nombre</b> y <b>Ventas</b> son obligatorias.
                                    </p>
                                </div>

                                {/* Botones de modo */}
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {(['vendor', 'sales', 'prizes'] as const).map(mode => {
                                        const colIdx = mode === 'vendor' ? manualVendorCol : mode === 'sales' ? manualSalesCol : manualPrizesCol;
                                        const isActive = manualSelectMode === mode;
                                        return (
                                            <button
                                                key={mode}
                                                onClick={() => setManualSelectMode(mode)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                                    isActive
                                                        ? modeColors[mode].active
                                                        : 'border-black/10 dark:border-white/10 text-ios-subtext hover:bg-black/5'
                                                }`}
                                            >
                                                {modeLabels[mode]}{colIdx !== -1 ? ` → Col ${colIdx + 1}` : ''}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Control de fila de inicio */}
                                <div className="flex items-center gap-3 justify-center">
                                    <span className="text-xs text-ios-subtext font-semibold">Primera fila de datos:</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={allRows.length}
                                        value={manualStartRow + 1}
                                        onChange={e => setManualStartRow(Math.max(0, Number(e.target.value) - 1))}
                                        className="w-20 bg-black/5 dark:bg-white/5 border-none rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-ios-blue outline-none text-center"
                                    />
                                    <span className="text-[10px] text-ios-subtext">(filas anteriores se atenúan)</span>
                                </div>

                                {/* Tabla de datos raw interactiva */}
                                <div className="glass-panel rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                                    <div className="overflow-auto max-h-64 no-scrollbar">
                                        <table className="w-full text-left text-xs min-w-max">
                                            <thead className="sticky top-0 bg-white dark:bg-[#1c1c1e] z-10 border-b border-black/5 dark:border-white/5">
                                                <tr>
                                                    {Array.from({ length: maxCols }, (_, ci) => (
                                                        <th
                                                            key={ci}
                                                            onClick={() => handleColClick(ci)}
                                                            title={`Clic para asignar a: ${modeLabels[manualSelectMode]}`}
                                                            className={`px-3 py-2.5 cursor-pointer select-none whitespace-nowrap transition-colors border-r border-black/5 dark:border-white/5 last:border-r-0 ${getColStyle(ci)} ${
                                                                ci !== manualVendorCol && ci !== manualSalesCol && ci !== manualPrizesCol
                                                                    ? modeColors[manualSelectMode].hover
                                                                    : ''
                                                            }`}
                                                        >
                                                            {ci === manualVendorCol ? '👤 Nombre'
                                                             : ci === manualSalesCol ? '💰 Ventas'
                                                             : ci === manualPrizesCol ? '🏆 Premios'
                                                             : `Col ${ci + 1}`}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {allRows.slice(0, 25).map((row: any[], ri) => (
                                                    <tr key={ri} className={`transition-colors ${ri < manualStartRow ? 'opacity-30' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                                        {Array.from({ length: maxCols }, (_, ci) => (
                                                            <td
                                                                key={ci}
                                                                onClick={() => handleColClick(ci)}
                                                                className={`px-3 py-1.5 cursor-pointer transition-colors whitespace-nowrap border-r border-black/5 dark:border-white/5 last:border-r-0 ${getColStyle(ci)}`}
                                                            >
                                                                {String(Array.isArray(row) ? (row[ci] ?? '') : '')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="flex justify-end gap-3 pt-1">
                                    <button onClick={reset} className="px-6 py-3 rounded-2xl text-sm font-bold text-ios-subtext hover:bg-black/5">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmManualMapping}
                                        disabled={manualVendorCol === -1 || manualSalesCol === -1}
                                        className="px-8 py-3 bg-ios-blue text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-ios-blue/20 active:scale-95 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <CheckCircle2 size={16} /> Confirmar y Previsualizar
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {step === 'success' && (
                        <div className="animate-fade-in flex flex-col items-center justify-center gap-6 py-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-ios-green/10 text-ios-green flex items-center justify-center animate-bounce-slow">
                                <CheckCircle2 size={48} />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold">¡Carga Completada!</h2>
                                <p className="text-ios-subtext text-sm">Los datos han sido liquidados e integrados correctamente.</p>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={onClose} className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm">Volver a Ventas</button>
                                <button onClick={reset} className="px-8 py-3 border border-black/10 dark:border-white/10 rounded-2xl font-bold text-sm">Nueva Carga</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
