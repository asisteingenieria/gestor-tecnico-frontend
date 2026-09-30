// Exportación CSV genérica, generada en el navegador sin llamar al backend.
export function descargarCsv(nombreArchivo, encabezados, filas) {
    const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const contenido = [encabezados, ...filas].map((fila) => fila.map(escapar).join(',')).join('\r\n');
    const bom = String.fromCharCode(0xFEFF);
    const blob = new Blob([bom + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
}
