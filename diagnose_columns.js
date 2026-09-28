const XLSX = require('./lyberate-frontend/node_modules/xlsx');

// Analizar Report DOLARES.xls en detalle - columnas específicas de datos
const wb = XLSX.readFile('Report DOLARES.xls');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('--- Fila 10 (header) completa:');
console.log(JSON.stringify(data[10]));
console.log('\n--- Columnas con valores en fila 10:');
data[10].forEach((v, i) => { if (v !== null && v !== undefined) console.log(`  col[${i}] = "${v}"`); });

// Buscar filas con valores > 0
console.log('\n--- Primeras 10 filas con venta > 0 (col9 o buscar col con valor):');
let found = 0;
for (let i = 11; i < data.length && found < 10; i++) {
    const row = data[i];
    if (!row) continue;
    // Ver todas las columnas con números > 0
    const nums = [];
    row.forEach((v, j) => { if (typeof v === 'number' && v > 0) nums.push(`col[${j}]=${v}`); });
    if (nums.length > 0) {
        console.log(`  Row[${i}] Nombre="${row[1]?.substring?.(0,40)}", nums: ${nums.join(', ')}`);
        found++;
    }
}

// Verificar si hay celdas combinadas (merged cells)
console.log('\n--- Celdas combinadas (merges):');
const merges = ws['!merges'];
if (merges) {
    console.log(`Total merges: ${merges.length}`);
    merges.slice(0, 10).forEach(m => console.log(`  ${JSON.stringify(m)}`));
} else {
    console.log('No hay celdas combinadas reportadas por XLSX.');
}

// Leer con cellDates y raw para ver si hay diferencia
const data2 = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
console.log('\n--- Fila 11 con raw:false:');
console.log(JSON.stringify(data2[11]));

// Buscar una fila con venta real (no 0)
console.log('\n--- Buscando filas con venta != 0 o != undefined en col9:');
let rowsWithSales = 0;
for (let i = 11; i < data.length && rowsWithSales < 5; i++) {
    const row = data[i];
    if (!row) continue;
    const venta = row[9];
    if (venta !== undefined && venta !== null && venta !== 0 && venta !== '') {
        console.log(`  Row[${i}]: Nombre="${String(row[1] || '').substring(0, 50)}", Venta=${venta}`);
        rowsWithSales++;
    }
}
if (rowsWithSales === 0) {
    console.log('  NINGUNA fila tiene venta != 0 en col9!');
    // Buscar qué columna tiene valores
    console.log('\n  Buscando la columna con ventas reales...');
    for (let col = 0; col < 30; col++) {
        let hasValues = false;
        for (let i = 11; i < Math.min(data.length, 100); i++) {
            const row = data[i];
            if (row && typeof row[col] === 'number' && row[col] > 0) {
                hasValues = true;
                break;
            }
        }
        if (hasValues) {
            const sample = [];
            for (let i = 11; i < Math.min(data.length, 20); i++) {
                if (data[i] && typeof data[i][col] === 'number') sample.push(data[i][col]);
            }
            console.log(`  col[${col}] tiene valores: ${sample.slice(0,5).join(', ')}`);
        }
    }
}
