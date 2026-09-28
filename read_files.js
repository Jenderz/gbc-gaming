const XLSX = require('./lyberate-frontend/node_modules/xlsx');
const fs = require('fs');

const files = [
    'AMERICANAS $.xlsx',
    'AMERICANAS BS.xlsx',
    'NACIONALES DOLARES.xlsx',
    'MASTERGREEN792_WORLDDEPORTES$MM23032026-25032026.csv'
];

let out = '';
const print = (arg) => {
    out += String(arg).replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '\n';
}

for (const file of files) {
    try {
        print(`\n--- ARCHIVO: ${file} ---`);
        const workbook = XLSX.readFile(file);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        print(`Leídas ${data.length} filas.`);
        if (data.length > 0) {
            print('Primeras 15 filas:');
            print(data.slice(0, 15).map(r => JSON.stringify(r.slice(0, 5))).join('\n'));
        }

        let vendorIdx = -1, salesIdx = -1, prizesIdx = -1;
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 30); i++) {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;
            
            const vIdx = row.findIndex(c => typeof c === 'string' && /venta/i.test(c));
            const pIdx = row.findIndex(c => typeof c === 'string' && /premio|pagado/i.test(c));
            const nIdx = row.findIndex(c => typeof c === 'string' && /nombre|agencia|nivel|comercio|taquilla|distribuidor|usuario/i.test(c));

            if (vIdx !== -1 && nIdx !== -1) {
                salesIdx = vIdx;
                prizesIdx = pIdx;
                vendorIdx = nIdx;
                headerRowIndex = i;
                print(`[Heurística 1] Encontrado en fila ${i}: Vendedor:${vendorIdx}(${row[vendorIdx]}), Ventas:${salesIdx}(${row[salesIdx]}), Premios:${prizesIdx}(${row[prizesIdx] !== undefined ? row[prizesIdx] : 'N/A'})`);
                break;
            }
        }

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
                    
                    const isNum = typeof cell === 'number' || (typeof cell === 'string' && !isNaN(parseFloat(cell.replace(/[,.]/g, ''))));
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
                    print(`[IA Fallback] Encontrado a partir de fila data ${i} -> header ${headerRowIndex}: Vendedor:${vendorIdx}, Ventas:${salesIdx}, Premios:${prizesIdx}`);
                    break;
                }
            }
        }

        if (headerRowIndex === -1) {
            print('=> FALLÓ: No se pudo detectar ningún formato.');
        } else {
            print('=> ÉXITO. Filas a procesar:');
            let rows = 0;
            data.slice(headerRowIndex + 1).forEach((row, i) => {
                if (rows < 5) {
                    const name = row[vendorIdx];
                    const nameStr = String(name || '').trim().toUpperCase();
                    if (nameStr && !nameStr.includes("TOTAL") && !nameStr.startsWith("-") && nameStr !== "USUARIO" && row[salesIdx] !== undefined) {
                        print(`  Row ${i}: Vendedor='${nameStr}', Ventas='${row[salesIdx]}', Premios='${prizesIdx !== -1 ? row[prizesIdx] : 0}'`);
                        rows++;
                    }
                }
            });
        }
    } catch (e) {
        print(`Error procesando ${file}: ${e.message}`);
    }
}

fs.writeFileSync('out.txt', out, 'utf8');
