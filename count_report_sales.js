const XLSX = require('./lyberate-frontend/node_modules/xlsx');
const fs = require('fs');

const file = 'Report $.xls';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`Total filas: ${data.length}`);

// Encontrar header
let vendorIdx = -1, salesIdxReal = -1, prizesIdxReal = -1;
let headerRow = -1;

for (let i = 0; i < Math.min(data.length, 30); i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;
    const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
    const nIdx = row.findIndex(c => typeof c === 'string' && /nombre/i.test(c));
    if (vIdx !== -1 && nIdx !== -1) {
        vendorIdx = nIdx;
        headerRow = i;
        console.log(`Header en fila ${i}: vendorIdx=col[${nIdx}], venta=col[${vIdx}]`);
        
        // Simular FIX #2 para encontrar la columna real de venta
        const testRows = data.slice(i + 1, i + 60);
        const sampleDataRow = testRows.find(r => {
            if (!r || !Array.isArray(r)) return false;
            const nameSample = String(r[nIdx] ?? '').trim();
            return nameSample.length > 3 && !/^nombre$/i.test(nameSample) && !/^total/i.test(nameSample);
        });
        
        let realSalesIdx = vIdx;
        let realPrizesIdx = -1;
        
        const pIdx = row.findIndex((c, j) => j > nIdx && typeof c === 'string' && /premio|pagado|pago/i.test(c));
        if (pIdx !== -1) realPrizesIdx = pIdx;
        
        if (sampleDataRow) {
            const cellAtVIdx = sampleDataRow[vIdx];
            console.log(`Sample data row en col[${vIdx}] = ${JSON.stringify(cellAtVIdx)}`);
            if (cellAtVIdx === undefined || cellAtVIdx === null || (typeof cellAtVIdx === 'string' && isNaN(parseFloat(cellAtVIdx)))) {
                for (let offset = 1; offset <= 4; offset++) {
                    if (vIdx - offset >= 0 && typeof sampleDataRow[vIdx - offset] === 'number') {
                        realSalesIdx = vIdx - offset;
                        console.log(`  → Ajustado a col[${realSalesIdx}] (offset -${offset})`);
                        break;
                    }
                    if (vIdx + offset < sampleDataRow.length && typeof sampleDataRow[vIdx + offset] === 'number') {
                        realSalesIdx = vIdx + offset;
                        console.log(`  → Ajustado a col[${realSalesIdx}] (offset +${offset})`);
                        break;
                    }
                }
            }
        }
        
        salesIdxReal = realSalesIdx;
        prizesIdxReal = realPrizesIdx;
        console.log(`Columna real de venta: col[${salesIdxReal}], premios: col[${prizesIdxReal}]`);
        break;
    }
}

// Contar vendedores con venta > 0
const parseAmount = (val) => {
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

const parseAmericanasName = (raw) => {
    const s = raw.trim();
    let currency = '';
    let rest = s;
    if (/^BS\s*/i.test(s)) {
        currency = 'BOLIVAR';
        rest = s.replace(/^BS\s*/i, '');
    } else if (/^\$\s*/.test(s)) {
        currency = 'DOLAR';
        rest = s.replace(/^\$\s*/, '');
    } else {
        return null;
    }
    if (!rest) return null;
    let operadora = '';
    let remaining = rest;
    const parenParts = [];
    const parenGlobal = /\(([^)]+)\)/g;
    let m;
    while ((m = parenGlobal.exec(rest)) !== null) {
        parenParts.push(m[1].trim().toUpperCase());
    }
    if (parenParts.length > 0) {
        operadora = parenParts.join(' / ');
        remaining = rest.replace(/\s*\([^)]*\)/g, '').trim();
    }
    remaining = remaining.replace(/[\s.\-]+$/, '').trim();
    const sepRegex = /\s*\.-\s+|\s+-\s+/;
    const sepMatch = sepRegex.exec(remaining);
    let vendorName = '';
    let grupo = '';
    if (sepMatch && sepMatch.index !== undefined) {
        vendorName = remaining.substring(0, sepMatch.index).trim().toUpperCase();
        grupo = remaining.substring(sepMatch.index + sepMatch[0].length).trim().toUpperCase();
    } else {
        vendorName = remaining.trim().toUpperCase();
    }
    vendorName = vendorName.replace(/[\s.\-]+$/, '').trim();
    if (!vendorName) return null;
    return { currency, vendorName, grupo, operadora };
};

if (headerRow !== -1 && vendorIdx !== -1) {
    const startRow = headerRow + 1;
    let withSales = 0;
    let withZero = 0;
    let skippedBadFormat = 0;
    let skippedRepeatHeader = 0;
    const vendorsWithSales = new Set();
    const vendorsWithZero = new Set();
    
    // Iterar TODAS las filas
    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        
        const raw = String(row[vendorIdx] ?? '').trim();
        if (!raw) continue;
        
        // Filtros de la app
        if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') { skippedRepeatHeader++; continue; }
        if (salesIdxReal !== -1) {
            const salesCell = row[salesIdxReal];
            if (typeof salesCell === 'string' && /^[a-z]/i.test(salesCell)) { skippedRepeatHeader++; continue; }
        }
        
        const parsed = parseAmericanasName(raw);
        if (!parsed) { skippedBadFormat++; continue; }
        
        const salesVal = salesIdxReal !== -1 ? parseAmount(row[salesIdxReal]) : 0;
        const prizesVal = prizesIdxReal !== -1 ? parseAmount(row[prizesIdxReal]) : 0;
        
        if (salesVal > 0 || prizesVal > 0) {
            withSales++;
            vendorsWithSales.add(parsed.vendorName);
        } else {
            withZero++;
            vendorsWithZero.add(parsed.vendorName);
        }
    }
    
    console.log(`\n=== RESULTADOS ===`);
    console.log(`Filas con venta > 0:   ${withSales}  (vendedores únicos: ${vendorsWithSales.size})`);
    console.log(`Filas con venta = 0:   ${withZero}  (vendedores únicos: ${vendorsWithZero.size})`);
    console.log(`Headers repetidos omitidos: ${skippedRepeatHeader}`);
    console.log(`Formato no reconocido:      ${skippedBadFormat}`);
    
    // Mostrar primeros 10 vendedores con venta
    console.log(`\nPrimeros 10 vendedores únicos CON venta:`);
    let count = 0;
    for (const v of vendorsWithSales) {
        if (count++ >= 10) break;
        console.log(`  - ${v}`);
    }
    
    // Ahora simular la consolidación (suma de filas repetidas)
    const consolidated = new Map();
    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        const raw = String(row[vendorIdx] ?? '').trim();
        if (!raw) continue;
        if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') continue;
        if (salesIdxReal !== -1) {
            const salesCell = row[salesIdxReal];
            if (typeof salesCell === 'string' && /^[a-z]/i.test(salesCell)) continue;
        }
        const parsed = parseAmericanasName(raw);
        if (!parsed) continue;
        const salesVal = salesIdxReal !== -1 ? parseAmount(row[salesIdxReal]) : 0;
        const prizesVal = prizesIdxReal !== -1 ? parseAmount(row[prizesIdxReal]) : 0;
        if (salesVal === 0 && prizesVal === 0) continue;
        
        const key = `${parsed.vendorName}||${parsed.currency}`;
        const existing = consolidated.get(key);
        if (existing) {
            existing.sales += salesVal;
            existing.prizes += prizesVal;
        } else {
            consolidated.set(key, { vendorName: parsed.vendorName, sales: salesVal, prizes: prizesVal, currency: parsed.currency });
        }
    }
    
    console.log(`\nDespués de consolidar: ${consolidated.size} registros únicos (vendedor+moneda)`);
    console.log(`\nTodos los registros consolidados:`);
    for (const [key, r] of consolidated) {
        console.log(`  [${r.currency}] ${r.vendorName}: venta=${r.sales.toFixed(2)}, premios=${r.prizes.toFixed(2)}`);
    }
}
