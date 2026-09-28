const XLSX = require('./lyberate-frontend/node_modules/xlsx');
const fs = require('fs');

// ─── Simular exactamente la lógica corregida del importador ──────────────────

const parseAmount = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).replace(/\s/g, '');
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
};

const parseAmericanasName = (raw) => {
    const s = raw.trim();
    let currency = '';
    let rest = s;
    if (/^BS\s*/i.test(s)) { currency = 'BOLIVAR'; rest = s.replace(/^BS\s*/i, ''); }
    else if (/^\$\s*/.test(s)) { currency = 'DOLAR'; rest = s.replace(/^\$\s*/, ''); }
    else return null;
    if (!rest) return null;

    let operadora = '';
    let remaining = rest;
    const parenParts = [];
    const parenGlobal = /\(([^)]+)\)/g;
    let m;
    while ((m = parenGlobal.exec(rest)) !== null) parenParts.push(m[1].trim().toUpperCase());
    if (parenParts.length > 0) { operadora = parenParts.join(' / '); remaining = rest.replace(/\s*\([^)]*\)/g, '').trim(); }
    remaining = remaining.replace(/[\s.\-]+$/, '').trim();

    const sepRegex = /\s*\.-\s+|\s+-\s+/;
    const sepMatch = sepRegex.exec(remaining);
    let vendorName = '';
    let grupo = '';
    if (sepMatch && sepMatch.index !== undefined) {
        vendorName = remaining.substring(0, sepMatch.index).trim().toUpperCase();
        grupo = remaining.substring(sepMatch.index + sepMatch[0].length).trim().toUpperCase();
    } else { vendorName = remaining.trim().toUpperCase(); }
    vendorName = vendorName.replace(/[\s.\-]+$/, '').trim();
    if (!vendorName) return null;
    return { currency, vendorName, grupo, operadora };
};

// ─── Lógica de detección CORREGIDA ────────────────────────────────────────────
const detectFile = (fileName) => {
    const fileNameUpper = fileName.toUpperCase();
    const isReportFile = fileNameUpper.includes('REPORT');
    const isAmericanas = fileNameUpper.includes('AMERICANAS') || (
        isReportFile && (
            fileNameUpper.includes('DOLAR') ||
            fileNameUpper.includes('BOLIVAR') ||
            fileNameUpper.includes('$') ||
            /\bBS\b/i.test(fileNameUpper)
        )
    );
    if (!isAmericanas) return null;
    const isBsFile = fileNameUpper.includes('BOLIVAR') || /\bBS\b/i.test(fileNameUpper);
    return { isAmericanas: true, forcedCurrency: isBsFile ? 'BOLIVAR' : 'DOLAR' };
};

// ─── Procesamiento con lógica corregida de columnas ──────────────────────────
const processFile = (file, data) => {
    let vendorIdx = -1, salesIdx = -1, prizesIdx = -1, headerRowIndex = -1;

    for (let i = 0; i < Math.min(data.length, 30); i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
        const pIdx = row.findIndex(c => typeof c === 'string' && /premio|pagado|pago/i.test(c));
        const nIdx = row.findIndex(c => typeof c === 'string' && /nombre/i.test(c));
        if (vIdx !== -1 && nIdx !== -1) {
            let realSalesIdx = vIdx, realPrizesIdx = pIdx;
            const testRows = data.slice(i + 1, i + 60);
            const sampleDataRow = testRows.find(r => {
                if (!r || !Array.isArray(r)) return false;
                const nameSample = String(r[nIdx] ?? '').trim();
                return nameSample.length > 3 && !/^nombre$/i.test(nameSample) && !/^total/i.test(nameSample);
            });
            if (sampleDataRow) {
                const cellAtVIdx = sampleDataRow[vIdx];
                if (cellAtVIdx === undefined || cellAtVIdx === null || (typeof cellAtVIdx === 'string' && isNaN(parseFloat(cellAtVIdx)))) {
                    for (let offset = 1; offset <= 4; offset++) {
                        if (vIdx - offset >= 0 && typeof sampleDataRow[vIdx - offset] === 'number') { realSalesIdx = vIdx - offset; break; }
                        if (vIdx + offset < sampleDataRow.length && typeof sampleDataRow[vIdx + offset] === 'number') { realSalesIdx = vIdx + offset; break; }
                    }
                }
                if (pIdx !== -1) {
                    const cellAtPIdx = sampleDataRow[pIdx];
                    if (cellAtPIdx === undefined || cellAtPIdx === null || (typeof cellAtPIdx === 'string' && isNaN(parseFloat(cellAtPIdx)))) {
                        for (let offset = 1; offset <= 4; offset++) {
                            if (pIdx - offset >= 0 && typeof sampleDataRow[pIdx - offset] === 'number') { realPrizesIdx = pIdx - offset; break; }
                            if (pIdx + offset < sampleDataRow.length && typeof sampleDataRow[pIdx + offset] === 'number') { realPrizesIdx = pIdx + offset; break; }
                        }
                    }
                }
            }
            salesIdx = realSalesIdx; prizesIdx = realPrizesIdx; vendorIdx = nIdx; headerRowIndex = i;
            break;
        }
    }
    if (vendorIdx === -1) return { error: 'No se encontró columna Nombre+Venta' };

    const rows = [];
    data.slice(headerRowIndex + 1).forEach(row => {
        const raw = String(row[vendorIdx] ?? '').trim();
        if (!raw) return;
        if (/^totales?/i.test(raw) || raw.toLowerCase() === 'nombre') return;
        if (salesIdx !== -1) {
            const salesCell = row[salesIdx];
            if (typeof salesCell === 'string' && /^[a-z]/i.test(salesCell)) return;
        }
        const parsed = parseAmericanasName(raw);
        if (!parsed) return;
        const salesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
        const prizesVal = prizesIdx !== -1 ? parseAmount(row[prizesIdx]) : 0;
        if (salesVal === 0 && prizesVal === 0) return;
        rows.push({ vendorName: parsed.vendorName, currency: parsed.currency, sales: salesVal, prizes: prizesVal });
    });
    return { headerRow: headerRowIndex, salesIdx, prizesIdx, rows };
};

// ─── TEST DE TODOS LOS ARCHIVOS ───────────────────────────────────────────────
const testFiles = [
    'Report $.xls',
    'Report BOLIVARES.xls',
    'Report DOLARES.xls',
    'AMERICANAS $.xlsx',
    'AMERICANAS BS.xlsx',
];

let out = '';
const p = (...a) => { const s = a.join(' '); out += s + '\n'; console.log(s); };

for (const file of testFiles) {
    if (!fs.existsSync(file)) { p(`\n[SKIP] No existe: ${file}`); continue; }
    p(`\n${'─'.repeat(60)}`);
    p(`ARCHIVO: ${file}`);

    const det = detectFile(file);
    if (!det) { p(`  ✗ NO DETECTADO como AMERICANAS/REPORT`); continue; }
    p(`  ✓ Detectado: moneda=${det.forcedCurrency}`);

    const wb = XLSX.readFile(file);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const result = processFile(file, data);

    if (result.error) { p(`  ✗ Error: ${result.error}`); continue; }
    p(`  Header en fila ${result.headerRow}, salesCol=${result.salesIdx}, prizesCol=${result.prizesIdx}`);
    p(`  Total filas válidas con venta: ${result.rows.length}`);
    p(`  Primeros 5 resultados:`);
    result.rows.slice(0, 5).forEach(r => {
        p(`    [${r.currency}] ${r.vendorName.substring(0,40).padEnd(40)} | Venta=${r.sales} | Premio=${r.prizes}`);
    });
}

fs.writeFileSync('final_validation.txt', out, 'utf8');
p('\n✓ Guardado en final_validation.txt');
