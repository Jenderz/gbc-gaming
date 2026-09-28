const XLSX = require('./lyberate-frontend/node_modules/xlsx');
const fs = require('fs');

const files = [
    'AMERICANAS $.xlsx',
    'AMERICANAS BS.xlsx',
    'Report BOLIVARES.xls',
    'Report DOLARES.xls',
];

let out = '';
const print = (...args) => {
    out += args.join(' ') + '\n';
    console.log(...args);
};

for (const file of files) {
    print(`\n${'='.repeat(60)}`);
    print(`ARCHIVO: ${file}`);
    print('='.repeat(60));

    try {
        const workbook = XLSX.readFile(file);
        print(`Hojas disponibles: ${workbook.SheetNames.join(', ')}`);

        for (const sheetName of workbook.SheetNames.slice(0, 3)) {
            print(`\n--- Hoja: "${sheetName}" ---`);
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            print(`Total filas: ${data.length}`);

            // Mostrar las primeras 20 filas raw con todas las columnas
            print(`\nPrimeras 20 filas (raw JSON):`);
            for (let i = 0; i < Math.min(data.length, 20); i++) {
                const row = data[i];
                print(`  [${i}] ${JSON.stringify(row)}`);
            }

            // Buscar header con palabras clave (AMERICANAS parser)
            print(`\n--- Búsqueda de columnas (parser AMERICANAS) ---`);
            let vendorIdx = -1, salesIdx = -1, prizesIdx = -1;
            let headerRowIndex = -1;

            for (let i = 0; i < Math.min(data.length, 30); i++) {
                const row = data[i];
                if (!row || !Array.isArray(row)) continue;
                const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
                const pIdx = row.findIndex(c => typeof c === 'string' && /premio|pagado|pago/i.test(c));
                const nIdx = row.findIndex(c => typeof c === 'string' && /nombre/i.test(c));
                if (vIdx !== -1 && nIdx !== -1) {
                    salesIdx = vIdx; prizesIdx = pIdx; vendorIdx = nIdx; headerRowIndex = i;
                    print(`  [OK] Header encontrado en fila ${i}: Nombre:col${vendorIdx}="${row[vendorIdx]}", Venta:col${salesIdx}="${row[salesIdx]}", Premio:col${prizesIdx}="${row[prizesIdx]}"`);
                    break;
                }
            }

            if (headerRowIndex === -1) {
                print(`  [FAIL] No se encontró header con Nombre+Venta.`);

                // Fallback: buscar celdas que empiecen con BS o $
                print(`\n--- Fallback: buscar celdas con patrón BS/$ ---`);
                for (let i = 0; i < Math.min(data.length, 30); i++) {
                    const row = data[i];
                    if (!row) continue;
                    const aIdx = row.findIndex(c => typeof c === 'string' && /^(BS\s+|\$\s*)/i.test(String(c).trim()));
                    if (aIdx !== -1) {
                        print(`  [OK] Fila ${i}: celda col${aIdx} = "${row[aIdx]}"`);
                        // Buscar columnas numéricas
                        for (let j = 0; j < row.length; j++) {
                            if (typeof row[j] === 'number') {
                                print(`    -> número en col${j}: ${row[j]}`);
                            }
                        }
                    }
                }
            } else {
                // Mostrar primeras 5 filas de datos
                print(`\nPrimeras 5 filas de datos:`);
                let count = 0;
                const startRow = headerRowIndex + 1;
                for (let i = startRow; i < data.length && count < 5; i++) {
                    const row = data[i];
                    const raw = String(row[vendorIdx] ?? '').trim();
                    if (!raw) continue;
                    if (/^totales?:/i.test(raw) || raw.toLowerCase() === 'nombre') continue;
                    print(`  Nombre="${raw}", Venta=${row[salesIdx]}, Premio=${row[prizesIdx]}`);

                    // Intentar parsear el nombre
                    const s = raw;
                    let currency = '';
                    let rest = s;
                    if (/^BS\s*/i.test(s)) {
                        currency = 'BOLIVAR';
                        rest = s.replace(/^BS\s*/i, '');
                    } else if (/^\$\s*/.test(s)) {
                        currency = 'DOLAR';
                        rest = s.replace(/^\$\s*/, '');
                    } else {
                        print(`    -> PARSE FALLA: no empieza con BS o $. Texto: "${s.substring(0, 30)}"`);
                        count++;
                        continue;
                    }
                    print(`    -> Moneda: ${currency}, Rest: "${rest.substring(0, 40)}"`);
                    count++;
                }
            }
            break; // Solo analizar la primera hoja para no saturar
        }
    } catch (e) {
        print(`ERROR: ${e.message}`);
        print(e.stack);
    }
}

fs.writeFileSync('diagnose_out.txt', out, 'utf8');
print('\nResultado guardado en diagnose_out.txt');
