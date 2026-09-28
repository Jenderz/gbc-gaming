const xlsx = require('xlsx');

function readAndPrint(filePath) {
    try {
        console.log(`\n=== File: ${filePath} ===`);
        const workbook = xlsx.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array of arrays to see headers and first rows clearly
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        // Print original columns (first row) and a couple of data rows
        if (data.length > 0) {
            console.log("Headers:");
            console.log(data[0]);
            console.log("\nFirst 2 Content Rows:");
            console.log(data.slice(1, 3));
        } else {
            console.log("Empty sheet");
        }
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e.message);
    }
}

readAndPrint('c:\\Users\\User\\Downloads\\WDLYBE\\Maxplay.xlsx');
readAndPrint('c:\\Users\\User\\Downloads\\WDLYBE\\cuadre_de_caja.csv');
readAndPrint('c:\\Users\\User\\Downloads\\WDLYBE\\reporte-ventas.xlsx');
