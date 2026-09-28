/**
 * Diagnóstico profundo del Report $.xls
 * Simula EXACTAMENTE la lógica del SalesImportModal con el fix aplicado
 */
const XLSX = require('./lyberate-frontend/node_modules/xlsx');

const file = 'Report $.xls';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`Total filas en el archivo: ${data.length}\n`);

// ── parseAmount ───────────────────────────────────────────────────────────────
const parseAmount = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).replace(/\s/g, '');
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
};

// ── parseAmericanasName ───────────────────────────────────────────────────────
const parseAmericanasName = (raw) => {
    const s = raw.trim();
    let currency = '', rest = s;
    if (/^BS\s*/i.test(s)) { currency = 'BOLIVAR'; rest = s.replace(/^BS\s*/i, ''); }
    else if (/^\$\s*/.test(s)) { currency = 'DOLAR'; rest = s.replace(/^\$\s*/, ''); }
    else return null;
    if (!rest) return null;
    let operadora = '', remaining = rest;
    const parenParts = [];
    const parenGlobal = /\(([^)]+)\)/g;
    let m;
    while ((m = parenGlobal.exec(rest)) !== null) parenParts.push(m[1].trim().toUpperCase());
    if (parenParts.length > 0) { operadora = parenParts.join(' / '); remaining = rest.replace(/\s*\([^)]*\)/g, '').trim(); }
    remaining = remaining.replace(/[\s.\-]+$/, '').trim();
    const sepRegex = /\s*\.-\s+|\s+-\s+/;
    const sepMatch = sepRegex.exec(remaining);
    let vendorName = '', grupo = '';
    if (sepMatch && sepMatch.index !== undefined) {
        vendorName = remaining.substring(0, sepMatch.index).trim().toUpperCase();
        grupo = remaining.substring(sepMatch.index + sepMatch[0].length).trim().toUpperCase();
    } else { vendorName = remaining.trim().toUpperCase(); }
    vendorName = vendorName.replace(/[\s.\-]+$/, '').trim();
    if (!vendorName) return null;
    return { currency, vendorName, grupo, operadora };
};

// ── FIX #2 con la corrección nueva: buscar vendorIdx también en col adyacente ─
let vendorIdx = -1, salesIdx = -1, prizesIdx = -1, headerRowIndex = -1;

for (let i = 0; i < Math.min(data.length, 30); i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;
    const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
    const pIdx = row.findIndex(c => typeof c === 'string' && /premio|pagado|pago/i.test(c));
    const nIdx = row.findIndex(c => typeof c === 'string' && /nombre/i.test(c));
    if (vIdx !== -1 && nIdx !== -1) {
        let realSalesIdx = vIdx, realPrizesIdx = pIdx, realVendorIdx = nIdx;
        const testRows = data.slice(i + 1, i + 60);

        let sampleDataRow, sampleVendorCol = nIdx;
        for (const colOffset of [0, -1, 1, -2, 2]) {
            const checkCol = nIdx + colOffset;
            if (checkCol < 0) continue;
            const found = testRows.find(r => {
                if (!r || !Array.isArray(r)) return false;
                const nameSample = String(r[checkCol] ?? '').trim();
                return nameSample.length > 3 &&
                    !/^nombre$/i.test(nameSample) &&
                    !/^total/i.test(nameSample) &&
                    /^[\w$\u00C0-\u024F]/i.test(nameSample);
            });
            if (found) { sampleDataRow = found; sampleVendorCol = checkCol; break; }
        }

        if (sampleVendorCol !== nIdx) realVendorIdx = sampleVendorCol;
        console.log(`Header en fila ${i}: nIdx=${nIdx}, vIdx=${vIdx}, pIdx=${pIdx}`);
        console.log(`sampleVendorCol=${sampleVendorCol} → realVendorIdx=${realVendorIdx}`);

        if (sampleDataRow) {
            console.log(`sampleDataRow[vIdx=${vIdx}] = ${JSON.stringify(sampleDataRow[vIdx])}`);
            const cellAtVIdx = sampleDataRow[vIdx];
            if (cellAtVIdx === undefined || cellAtVIdx === null || (typeof cellAtVIdx === 'string' && isNaN(parseFloat(cellAtVIdx)))) {
                for (let offset = 1; offset <= 4; offset++) {
                    if (vIdx - offset >= 0 && typeof sampleDataRow[vIdx - offset] === 'number') { realSalesIdx = vIdx - offset; break; }
                    if (vIdx + offset < sampleDataRow.length && typeof sampleDataRow[vIdx + offset] === 'number') { realSalesIdx = vIdx + offset; break; }
                }
            }
            if (pIdx !== -1) {
                const cellAtPIdx = sampleDataRow[pIdx];
                console.log(`sampleDataRow[pIdx=${pIdx}] = ${JSON.stringify(cellAtPIdx)}`);
                if (cellAtPIdx === undefined || cellAtPIdx === null || (typeof cellAtPIdx === 'string' && isNaN(parseFloat(cellAtPIdx)))) {
                    for (let offset = 1; offset <= 4; offset++) {
                        if (pIdx - offset >= 0 && typeof sampleDataRow[pIdx - offset] === 'number') { realPrizesIdx = pIdx - offset; break; }
                        if (pIdx + offset < sampleDataRow.length && typeof sampleDataRow[pIdx + offset] === 'number') { realPrizesIdx = pIdx + offset; break; }
                    }
                }
            }
        }

        vendorIdx = realVendorIdx;
        salesIdx = realSalesIdx;
        prizesIdx = realPrizesIdx;
        headerRowIndex = i;
        console.log(`→ vendorIdx=${vendorIdx}, salesIdx=${salesIdx}, prizesIdx=${prizesIdx}\n`);
        break;
    }
}

// ── Procesar todas las filas ──────────────────────────────────────────────────
if (vendorIdx !== -1) {
    const startRow = headerRowIndex + 1;
    let totalRows = 0, withSales = 0, withZero = 0, badFormat = 0, headerRepeat = 0;
    const consolidated = new Map();

    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        totalRows++;

        const raw = String(row[vendorIdx] ?? '').trim();
        if (!raw) continue;

        if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') { headerRepeat++; continue; }
        if (salesIdx !== -1) {
            const salesCell = row[salesIdx];
            if (typeof salesCell === 'string' && /^[a-z]/i.test(salesCell)) { headerRepeat++; continue; }
        }

        const parsed = parseAmericanasName(raw);
        if (!parsed) { badFormat++; continue; }

        const salesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
        const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;

        if (salesVal === 0 && prizesVal === 0) { withZero++; continue; }
        withSales++;

        const key = `${parsed.vendorName.trim().toUpperCase()}||${parsed.currency}`;
        const existing = consolidated.get(key);
        if (existing) {
            existing.sales += salesVal;
            existing.prizes += prizesVal;
            existing.count++;
        } else {
            consolidated.set(key, { vendorName: parsed.vendorName, sales: salesVal, prizes: prizesVal, currency: parsed.currency, count: 1 });
        }
    }

    console.log('════════════════════════════════════════════════');
    console.log(`Total filas procesadas:           ${totalRows}`);
    console.log(`  → con venta/premio > 0:         ${withSales}`);
    console.log(`  → con venta/premio = 0:         ${withZero}`);
    console.log(`  → formato no reconocido:        ${badFormat}`);
    console.log(`  → encabezados repetidos skip:   ${headerRepeat}`);
    console.log(`\nDespués de consolidar: ${consolidated.size} registros únicos`);
    console.log('════════════════════════════════════════════════\n');

    // Mostrar TODOS los registros con ventas
    console.log('TODOS los vendedores con ventas (consolidados):');
    let n = 0;
    for (const [key, r] of consolidated) {
        n++;
        console.log(`  [${n}] [${r.currency}] ${r.vendorName}`);
        console.log(`        venta=${r.sales.toFixed(2)}, premios=${r.prizes.toFixed(2)}, aparece ${r.count} vez/veces`);
    }

    // Verificar si badFormat oculta algún registro con datos
    if (badFormat > 0) {
        console.log(`\n⚠️  Hay ${badFormat} filas con formato no reconocido. Mostrando primeras 10:`);
        let shown = 0;
        for (let i = startRow; i < data.length && shown < 10; i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            const raw = String(row[vendorIdx] ?? '').trim();
            if (!raw) continue;
            if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') continue;
            if (salesIdx !== -1 && typeof row[salesIdx] === 'string' && /^[a-z]/i.test(row[salesIdx])) continue;
            const parsed = parseAmericanasName(raw);
            if (!parsed) {
                const salesVal = parseAmount(row[salesIdx]);
                const prizesVal = parseAmount(row[prizesIdx]);
                if (salesVal > 0 || prizesVal > 0) {
                    console.log(`  ⚡ TIENE VENTAS pero no parseó: "${raw.substring(0, 60)}" → venta=${salesVal}`);
                } else {
                    console.log(`  → "${raw.substring(0, 60)}"`);
                }
                shown++;
            }
        }
    }
}
