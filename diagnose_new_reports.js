const XLSX = require('./lyberate-frontend/node_modules/xlsx');
const fs = require('fs');

// Archivos a analizar
const files = [
    'Report $.xls',
    'Report BOLIVARES.xls',   // Para comparar nombre exacto vs lo que detecta el código
    'Report DOLARES.xls',
];

let out = '';
const p = (...args) => { const s = args.join(' '); out += s + '\n'; console.log(s); };

// ─── Simular detección del código actual ───────────────────────────────────────
const currentDetection = (fileName) => {
    const fileNameUpper = fileName.toUpperCase();
    const isAmericanas = fileNameUpper.includes('AMERICANAS') ||
        (fileNameUpper.includes('REPORT') && (fileNameUpper.includes('DOLAR') || fileNameUpper.includes('BOLIVAR')));
    return isAmericanas;
};

for (const file of files) {
    if (!fs.existsSync(file)) { p(`\n[SKIP] No existe: ${file}`); continue; }

    p(`\n${'='.repeat(65)}`);
    p(`ARCHIVO: "${file}"  (${fs.statSync(file).size} bytes)`);
    p('='.repeat(65));

    // ─── Test de detección por nombre ──────────────────────────────────────────
    const detected = currentDetection(file);
    p(`Detección por nombre de archivo: ${detected ? '✓ AMERICANAS/REPORT' : '✗ NO DETECTADO'}`);
    if (!detected) {
        p(`  → fileNameUpper = "${file.toUpperCase()}"`);
        p(`  → Contiene REPORT: ${file.toUpperCase().includes('REPORT')}`);
        p(`  → Contiene DOLAR:  ${file.toUpperCase().includes('DOLAR')}`);
        p(`  → Contiene BOLIVAR:${file.toUpperCase().includes('BOLIVAR')}`);
        p(`  → Contiene BS:     ${file.toUpperCase().includes('BS')}`);
        p(`  → Contiene $:      ${file.toUpperCase().includes('$')}`);
    }

    // ─── Lectura del archivo ────────────────────────────────────────────────────
    try {
        const wb = XLSX.readFile(file);
        p(`Hojas: ${wb.SheetNames.join(', ')}`);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        p(`Total filas: ${data.length}`);

        p('\nPrimeras 15 filas (primeras 6 celdas no-null):');
        for (let i = 0; i < Math.min(data.length, 15); i++) {
            const row = data[i];
            const nonNull = row ? row.filter(c => c !== null && c !== undefined && c !== '').slice(0, 6) : [];
            if (nonNull.length > 0) p(`  [${i}] ${JSON.stringify(nonNull)}`);
        }

        // Buscar header Nombre+Venta
        p('\nBúsqueda de header (Nombre + Venta):');
        for (let i = 0; i < Math.min(data.length, 30); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
            const nIdx = row.findIndex(c => typeof c === 'string' && /nombre/i.test(c));
            if (vIdx !== -1 && nIdx !== -1) {
                p(`  ✓ Header en fila ${i}: Nombre=col[${nIdx}], Venta=col[${vIdx}]`);
                // Mostrar fila completa con índices
                p(`    Fila completa: ${JSON.stringify(row)}`);

                // Buscar fila de datos real para detectar offset de celdas combinadas
                for (let j = i + 1; j < Math.min(data.length, i + 60); j++) {
                    const dr = data[j];
                    if (!dr) continue;
                    const name = String(dr[nIdx] ?? '').trim();
                    if (name.length > 3 && !/^nombre$/i.test(name) && !/^total/i.test(name)) {
                        p(`  Primera fila de datos (row ${j}):`);
                        p(`    Nombre: "${name.substring(0, 50)}"`);
                        p(`    cell[vIdx=${vIdx}] = ${JSON.stringify(dr[vIdx])}`);
                        p(`    cell[vIdx-1=${vIdx-1}] = ${JSON.stringify(dr[vIdx-1])}`);
                        p(`    Columnas numéricas: ${dr.map((v,idx)=>typeof v==='number'?`col[${idx}]=${v}`:null).filter(Boolean).join(', ')}`);
                        break;
                    }
                }
                break;
            }
        }

        // Buscar filas con ventas reales (no 0)
        p('\nBuscando filas con ventas > 0 (primeras 5):');
        let found = 0;
        for (let i = 10; i < data.length && found < 5; i++) {
            const row = data[i];
            if (!row) continue;
            const hasMoney = row.some(v => typeof v === 'number' && v > 0);
            const name = row.find(v => typeof v === 'string' && v.length > 3 && /^(BS|\$)/i.test(v.trim()));
            if (hasMoney && name) {
                const nums = row.map((v,j) => typeof v === 'number' && v > 0 ? `col[${j}]=${v}` : null).filter(Boolean);
                p(`  row[${i}] nombre="${name.substring(0,45)}" nums=[${nums.join(', ')}]`);
                found++;
            }
        }
        if (found === 0) p('  → No se encontraron filas con ventas > 0 y nombre con BS/$');

    } catch (e) {
        p(`ERROR: ${e.message}`);
    }
}

fs.writeFileSync('new_reports_diag.txt', out, 'utf8');
p('\nGuardado en new_reports_diag.txt');
