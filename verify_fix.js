const XLSX = require('./lyberate-frontend/node_modules/xlsx');

// Test del fix - simular el nuevo parser en Report DOLARES.xls
const wb = XLSX.readFile('Report DOLARES.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Replicar la lógica corregida
let vendorIdx = -1, salesIdx = -1, prizesIdx = -1;
let headerRowIndex = -1;

for (let i = 0; i < Math.min(data.length, 30); i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;
    const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
    const pIdx = row.findIndex(c => typeof c === 'string' && /premio|pagado|pago/i.test(c));
    const nIdx = row.findIndex(c => typeof c === 'string' && /nombre/i.test(c));
    if (vIdx !== -1 && nIdx !== -1) {
        let realSalesIdx = vIdx;
        let realPrizesIdx = pIdx;
        
        // FIX #2: buscar en filas de datos para encontrar columna numérica real
        const testRows = data.slice(i + 1, i + 60);
        const sampleDataRow = testRows.find(r => {
            if (!r || !Array.isArray(r)) return false;
            const nameSample = String(r[nIdx] ?? '').trim();
            return nameSample.length > 3 &&
                !/^nombre$/i.test(nameSample) &&
                !/^total/i.test(nameSample);
        });
        
        if (sampleDataRow) {
            const cellAtVIdx = sampleDataRow[vIdx];
            console.log(`Sample row found. Cell at vIdx(${vIdx}): ${JSON.stringify(cellAtVIdx)}`);
            if (cellAtVIdx === undefined || cellAtVIdx === null ||
                (typeof cellAtVIdx === 'string' && isNaN(parseFloat(cellAtVIdx)))) {
                for (let offset = 1; offset <= 4; offset++) {
                    if (vIdx - offset >= 0 && typeof sampleDataRow[vIdx - offset] === 'number') {
                        realSalesIdx = vIdx - offset;
                        console.log(`  -> Ajustando salesIdx de ${vIdx} a ${realSalesIdx} (celda combinada!)`);
                        break;
                    }
                    if (vIdx + offset < sampleDataRow.length && typeof sampleDataRow[vIdx + offset] === 'number') {
                        realSalesIdx = vIdx + offset;
                        console.log(`  -> Ajustando salesIdx de ${vIdx} a ${realSalesIdx} (derecha)`);
                        break;
                    }
                }
            } else {
                console.log(`  -> salesIdx ${vIdx} OK, valor: ${cellAtVIdx}`);
            }
            
            if (pIdx !== -1) {
                const cellAtPIdx = sampleDataRow[pIdx];
                console.log(`Cell at pIdx(${pIdx}): ${JSON.stringify(cellAtPIdx)}`);
                if (cellAtPIdx === undefined || cellAtPIdx === null ||
                    (typeof cellAtPIdx === 'string' && isNaN(parseFloat(cellAtPIdx)))) {
                    for (let offset = 1; offset <= 4; offset++) {
                        if (pIdx - offset >= 0 && typeof sampleDataRow[pIdx - offset] === 'number') {
                            realPrizesIdx = pIdx - offset;
                            console.log(`  -> Ajustando prizesIdx de ${pIdx} a ${realPrizesIdx}`);
                            break;
                        }
                        if (pIdx + offset < sampleDataRow.length && typeof sampleDataRow[pIdx + offset] === 'number') {
                            realPrizesIdx = pIdx + offset;
                            console.log(`  -> Ajustando prizesIdx de ${pIdx} a ${realPrizesIdx}`);
                            break;
                        }
                    }
                }
            }
        }
        
        salesIdx = realSalesIdx;
        prizesIdx = realPrizesIdx;
        vendorIdx = nIdx;
        headerRowIndex = i;
        console.log(`\nHeader en fila ${i}: vendorIdx=${vendorIdx}, salesIdx=${salesIdx}, prizesIdx=${prizesIdx}`);
        break;
    }
}

// FIX #3: Filtrar headers repetidos y contar filas válidas
console.log('\n--- Conteo de filas válidas (con el fix aplicado) ---');
let validRows = 0, skippedHeaders = 0, skippedEmpty = 0;
const resultSummary = new Map();

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
    return { currency, rest };
};

data.slice(headerRowIndex + 1).forEach((row, idx) => {
    const raw = String(row[vendorIdx] ?? '').trim();
    if (!raw) { skippedEmpty++; return; }
    
    // FIX #3: skip header repetidos
    if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') { skippedHeaders++; return; }
    if (salesIdx !== -1) {
        const salesCell = row[salesIdx];
        if (typeof salesCell === 'string' && /^[a-z]/i.test(salesCell)) { skippedHeaders++; return; }
    }
    
    const parsed = parseAmericanasName(raw);
    if (!parsed) return;
    
    const salesVal = salesIdx !== -1 ? (row[salesIdx] ?? 0) : 0;
    const prizesVal = prizesIdx !== -1 ? (row[prizesIdx] ?? 0) : 0;
    
    if (salesVal === 0 && prizesVal === 0) { skippedEmpty++; return; }
    
    validRows++;
    const key = `${parsed.rest.substring(0, 30)} [${parsed.currency}]`;
    if (!resultSummary.has(key)) resultSummary.set(key, { sales: 0, prizes: 0 });
    resultSummary.get(key).sales += typeof salesVal === 'number' ? salesVal : 0;
    resultSummary.get(key).prizes += typeof prizesVal === 'number' ? prizesVal : 0;
});

console.log(`Filas válidas: ${validRows}`);
console.log(`Headers repetidos ignorados: ${skippedHeaders}`);
console.log(`Filas vacías ignoradas: ${skippedEmpty}`);
console.log('\nPrimeros 10 resultados:');
let shown = 0;
for (const [k, v] of resultSummary) {
    if (shown++ >= 10) break;
    console.log(`  ${k}: Venta=${v.sales}, Premio=${v.prizes}`);
}
