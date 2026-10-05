import { RawRow, ImportSession } from './types';
import { Seller } from '../../services/apiService';
import {
    normalizeCurrency,
    normalizeProductName,
    normalizeSellerName
} from '../../utils/importNormalize';

export const parseAmount = (val: any): number => {
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

/**
 * Detección robusta de la moneda por el nombre del archivo usando la normalización canónica.
 */
export const detectFileCurrency = (fn: string): string => {
    return normalizeCurrency(fn);
};

/**
 * Parser para el formato AMERICANAS / Reportes de Centros Hípicos.
 */
export const parseAmericanasName = (
    raw: string,
    defaultCurrency: string = 'DOLAR'
): { currency: string; agencyName: string; grupo: string; operadora: string; isGrande: boolean } | null => {
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

    const isGrande = grupo.includes('GRANDE') || agencyName.toUpperCase().includes('GRANDE');

    return {
        currency,
        agencyName,
        grupo,
        operadora,
        isGrande
    };
};

/**
 * Parser para nombres de agentes en formato Mastergreen / Worlddeportes / Adminwd / Parley.
 */
export const parseMastergreenName = (raw: string): { currency: string; vendorName: string } | null => {
    const s = raw.trim();
    if (/^parley\s+/i.test(s)) return null;

    const match = s.match(/^(.+?)\s+(Usd|USD|usd|Bs|BS|bs|Cop|COP|cop)$/i);
    if (!match) return null;
    const name = normalizeSellerName(match[1]);
    const currency = normalizeCurrency(match[2]);
    if (!name) return null;
    return { vendorName: name, currency };
};

export interface ParseAnalysisResult {
    session: ImportSession | null;
    needsManualMapping: boolean;
    headerRowIndex: number;
}

/**
 * Analiza un conjunto de datos (tabla JSON de un archivo Excel o CSV) y genera una ImportSession estructurada.
 */
export const analyzeImportData = (
    fileName: string,
    data: any[][],
    sellerAliases: Record<string, number>,
    allSellers: Seller[]
): ParseAnalysisResult => {
    let detectedType: ImportSession['detectedType'] = 'unknown';
    let rows: RawRow[] = [];
    let productName = "";
    let forcedCurrency: string | null = null;

    const fileNameUpper = fileName.toUpperCase();
    const contentStr = JSON.stringify(data.slice(0, 15)).toUpperCase();

    // 0. Detectar el nombre del producto sugerido basado en nombre de archivo y contenido
    const combinedStr = fileNameUpper + ' ' + contentStr;
    if (combinedStr.includes("BETM3")) productName = "PARLEY BETM3";
    else if (fileNameUpper.includes("LOTOREY") || fileNameUpper.includes("LOTERIAS") || fileNameUpper.includes("BANKLOT") || contentStr.includes("BANKLOT") || contentStr.includes("LOTOREY")) productName = "LOTERIAS";
    else if (combinedStr.includes("MAXPLAY")) productName = "MAXPLAY";
    else if (combinedStr.includes("GALILEO")) productName = "GALILEO";
    else if (combinedStr.includes("POSNET")) productName = "POSNET";
    else if (combinedStr.includes("GATO")) productName = "GATO";
    else if (combinedStr.includes("INMEJORABLE") || combinedStr.includes("PARLEY")) productName = "PARLEY";
    else if (combinedStr.includes("NACIONALES")) productName = "NACIONALES";
    else if (combinedStr.includes("AMERICANAS")) productName = "AMERICANAS";

    // ─── Detección formato MASTERGREEN / WORLDDEPORTES / ADMINWD / PARLEY ─
    const isParley = fileNameUpper.includes('PARLEY') || (contentStr.includes('PARLEY') && contentStr.includes('AGENTES'));
    const isMastergreen = fileNameUpper.includes('MASTERGREEN')
        || fileNameUpper.includes('WORLDDEPORTES')
        || fileNameUpper.includes('ADMINWD')
        || isParley;

    if (isMastergreen) {
        if (isParley) {
            detectedType = 'parley';
            if (!productName || productName === 'WORLDDEPORTES') productName = 'PARLEY';
        } else if (fileNameUpper.includes('ADMINWD') || fileNameUpper.includes('INH')) {
            detectedType = 'adminwd';
            productName = 'PARLEY INH';
        } else {
            detectedType = 'mastergreen';
            if (!productName) productName = 'WORLDDEPORTES';
        }

        let taqIdx = -1, salesIdx = -1, anuladosIdx = -1, prizesIdx = -1;
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
                const vIdx = row.findIndex((c: any, j: number) => j > tIdx && typeof c === 'string' && /venta/i.test(c));
                salesIdx = vIdx !== -1 ? vIdx : taqIdx + 1;
                const anIdx = row.findIndex((c: any, j: number) => j > tIdx && typeof c === 'string' && /anulad/i.test(c));
                anuladosIdx = anIdx !== -1 ? anIdx : -1;
                const pIdx = row.findIndex((c: any, j: number) => j > taqIdx && typeof c === 'string' && /premio/i.test(c));
                prizesIdx = pIdx !== -1 ? pIdx : -1;
                break;
            }
        }

        if (taqIdx !== -1) {
            const hasParleyBreakdown = isParley && data.slice(headerRowIndex + 1).some(r => {
                const raw = String(r?.[taqIdx] ?? '').trim();
                return /^parley\s+([^\s]+)\s+(usd|bs|cop)\s+/i.test(raw);
            });

            const consolidatedMG = new Map<string, RawRow>();

            data.slice(headerRowIndex + 1).forEach((row: any[]) => {
                const raw = String(row[taqIdx] ?? '').trim();
                if (!raw || /^total/i.test(raw)) return;

                if (hasParleyBreakdown) {
                    const match = raw.match(/^parley\s+([^\s]+)\s+(usd|bs|cop)\s+(.+)$/i);
                    if (!match) return;

                    const subProduct = normalizeProductName('PARLEY ' + match[1]);
                    const currency = normalizeCurrency(match[2]);

                    let vendorName = normalizeSellerName(match[3]);
                    const rawKey = vendorName;
                    if (sellerAliases[rawKey]) {
                        const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawKey]);
                        if (mappedSeller) vendorName = normalizeSellerName(mappedSeller.name);
                    }

                    const rawSalesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
                    const anuladosVal = anuladosIdx !== -1 ? parseAmount(row[anuladosIdx]) : 0;
                    const salesVal  = Math.max(0, rawSalesVal - anuladosVal);
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
                    if (/^parley\s+/i.test(raw)) return;

                    const parsed = parseMastergreenName(raw);
                    if (!parsed) return;

                    const { vendorName, currency } = parsed;
                    let finalName = vendorName;
                    const rawKey = vendorName.trim().toUpperCase();
                    if (sellerAliases[rawKey]) {
                        const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawKey]);
                        if (mappedSeller) finalName = mappedSeller.name.toUpperCase();
                    }

                    const rawSalesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
                    const anuladosVal = anuladosIdx !== -1 ? parseAmount(row[anuladosIdx]) : 0;
                    const salesVal  = Math.max(0, rawSalesVal - anuladosVal);
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
            if (mgRows.length > 0) {
                const hasBs  = mgRows.some(r => normalizeCurrency(r.sourceRow._currency) === 'BOLIVARES VENEZOLANOS');
                const hasUsd = mgRows.some(r => normalizeCurrency(r.sourceRow._currency) === 'DOLAR');
                const hasCop = mgRows.some(r => normalizeCurrency(r.sourceRow._currency) === 'PESO COLOMBIANA');
                const sessionCurrency = (hasBs && !hasUsd && !hasCop) ? 'BOLIVARES VENEZOLANOS'
                    : (hasCop && !hasUsd && !hasBs) ? 'PESO COLOMBIANA'
                    : 'DOLAR';

                return {
                    session: {
                        fileName,
                        productName,
                        currency: sessionCurrency,
                        date: new Date().toISOString().split('T')[0],
                        rows: mgRows,
                        detectedType
                    },
                    needsManualMapping: false,
                    headerRowIndex
                };
            }
        }
    }

    // ─── Detección formato AMERICANAS / Report Hipódromo ──────────────────
    const isKnownOtherProduct = !!productName && !['AMERICANAS'].includes(productName);
    const isReportFile = /^REPORT[\s\-_].*\.xls/i.test(fileName) || fileNameUpper === 'REPORT.XLS';
    const isAmericanas = !isKnownOtherProduct && (
        fileNameUpper.includes('AMERICANAS') ||
        fileNameUpper.includes('HIPIC') ||
        contentStr.includes('CENTROS HIPICOS') ||
        contentStr.includes('HIPICO') ||
        contentStr.includes('WCENTER') ||
        isReportFile
    );

    if (isAmericanas) {
        detectedType = 'americanas';
        if (!productName) productName = 'AMERICANAS';
        forcedCurrency = detectFileCurrency(fileName);

        let vendorIdx = -1, salesIdx = -1, prizesIdx = -1;
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 30); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            const vIdx = row.findIndex((c: any) => typeof c === 'string' && /venta/i.test(c));
            const pIdx = row.findIndex((c: any) => typeof c === 'string' && /premio|pagado|pago/i.test(c));
            const nIdx = row.findIndex((c: any) => typeof c === 'string' && /nombre/i.test(c));
            if (vIdx !== -1 && nIdx !== -1) {
                let realSalesIdx = vIdx;
                let realPrizesIdx = pIdx;
                let realVendorIdx = nIdx;
                const testRows = data.slice(i + 1, i + 100);

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

                let maxSalesVotes = 0;
                let bestSalesIdx = vIdx;
                salesCandidates.forEach((col, idx) => {
                    if (salesVotes[idx] > maxSalesVotes) {
                        maxSalesVotes = salesVotes[idx];
                        bestSalesIdx = col;
                    }
                });
                realSalesIdx = bestSalesIdx;

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

        if (headerRowIndex === -1) {
            for (let i = 0; i < Math.min(data.length, 30); i++) {
                const row = data[i];
                if (!row || !Array.isArray(row)) continue;
                const aIdx = row.findIndex((c: any) => typeof c === 'string' && /^(BS\s*|\$)/i.test(String(c).trim()));
                if (aIdx !== -1) {
                    vendorIdx = aIdx;
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
                if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') return;
                if (salesIdx !== -1) {
                    const salesCell = row[salesIdx];
                    if (typeof salesCell === 'string' && /^[a-z]/i.test(salesCell)) return;
                }
                const parsed = parseAmericanasName(raw, forcedCurrency || 'DOLAR');
                if (!parsed) return;

                const rowCurrency = parsed.currency;
                const isGrande = parsed.isGrande;
                let finalVendorName = isGrande ? parsed.agencyName : parsed.grupo;
                const rawVendorKey = finalVendorName.trim().toUpperCase();
                if (sellerAliases[rawVendorKey]) {
                    const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawVendorKey]);
                    if (mappedSeller) finalVendorName = mappedSeller.name.toUpperCase();
                }

                const salesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
                const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
                if (salesVal === 0 && prizesVal === 0) return;

                rows.push({
                    vendorName: finalVendorName,
                    agencyName: parsed.agencyName,
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

            if (consolidatedRows.length > 0) {
                return {
                    session: {
                        fileName,
                        productName,
                        currency: forcedCurrency || 'DOLAR',
                        date: new Date().toISOString().split('T')[0],
                        rows: consolidatedRows,
                        detectedType
                    },
                    needsManualMapping: false,
                    headerRowIndex
                };
            }
        }
    }

    // ─── 2. Buscador Universal Dinámico de Columnas ─────────────────────────
    let vendorIdx = -1, salesIdx = -1, anuladosIdx = -1, prizesIdx = -1;
    let headerRowIndex = -1;

    for (let i = 0; i < Math.min(data.length, 30); i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        
        const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
        const pIdx = row.findIndex(c => typeof c === 'string' && /premio|pagado|pago/i.test(c));
        const nIdx = row.findIndex(c => typeof c === 'string' && /nombre|agencia|agentes?|nivel|comercio|taquilla|distribuidor|usuario|vendedor/i.test(c));
        const anIdx = row.findIndex(c => typeof c === 'string' && /anulad/i.test(c));

        if (vIdx !== -1 && nIdx !== -1) {
            salesIdx = vIdx;
            prizesIdx = pIdx;
            vendorIdx = nIdx;
            anuladosIdx = anIdx !== -1 ? anIdx : -1;
            headerRowIndex = i;
            break;
        }
    }

    // ─── 3. Fallback Extremo de Inteligencia de Datos ───────────────────────
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
        detectedType = 'universal';
        data.slice(headerRowIndex + 1).forEach(row => {
            const name = row[vendorIdx];
            const nameStr = String(name || '').trim().toUpperCase();
            
            if (nameStr && !nameStr.includes("TOTAL") && !nameStr.startsWith("-") && nameStr !== "USUARIO" && row[salesIdx] !== undefined) {
                const rawName = nameStr;
                let finalName = rawName;
                
                if (sellerAliases[rawName]) {
                    const mappedSeller = allSellers.find(s => Number(s.id) === sellerAliases[rawName]);
                    if (mappedSeller) finalName = mappedSeller.name.toUpperCase();
                }
                
                const rawSalesVal = parseAmount(row[salesIdx]);
                const anuladosVal = anuladosIdx !== -1 ? parseAmount(row[anuladosIdx]) : 0;
                const salesVal = Math.max(0, rawSalesVal - anuladosVal);

                rows.push({
                    vendorName: finalName,
                    sales: salesVal,
                    prizes: prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0,
                    sourceRow: row
                });
            }
        });
    }

    if (rows.length === 0) {
        return {
            session: null,
            needsManualMapping: true,
            headerRowIndex
        };
    }

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

    return {
        session: {
            fileName,
            productName,
            currency: forcedCurrency || detectFileCurrency(fileName),
            date: new Date().toISOString().split('T')[0],
            rows: consolidatedRows,
            detectedType
        },
        needsManualMapping: false,
        headerRowIndex
    };
};
