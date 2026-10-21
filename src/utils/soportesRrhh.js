// Soportes documentales de RRHH (novedades y traspasos): PDF o imagen, uno por tipo de soporte.
// El backend valida lo mismo (middleware/uploadSoportesRrhh.js).
export const ACCEPT_SOPORTE = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
export const TAMANO_MAXIMO_SOPORTE_MB = 10;

// Valida en el navegador lo mismo que el backend, para avisar antes de subir.
export function errorArchivoSoporte(archivo) {
    if (!archivo) return null;
    if (!/\.(pdf|jpe?g|png|webp)$/i.test(archivo.name)) return 'Solo PDF o imagen (JPG, PNG, WEBP)';
    if (archivo.size > TAMANO_MAXIMO_SOPORTE_MB * 1024 * 1024) return `Máximo ${TAMANO_MAXIMO_SOPORTE_MB} MB`;
    return null;
}

// Abre un soporte en una pestaña nueva. El archivo se pide con el token (no hay URL pública:
// son datos sensibles), así que se abre la pestaña de inmediato —para que el navegador no la
// bloquee como ventana emergente— y se le pone el contenido cuando llega.
// `descargar` es la función del servicio que trae el blob (p. ej. novedadRrhhService.descargarSoporte).
export async function abrirSoporte(descargar) {
    const ventana = window.open('', '_blank');
    try {
        const { data } = await descargar();
        const url = URL.createObjectURL(data);
        if (ventana) ventana.location.href = url;
        else window.location.assign(url);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
        if (ventana) ventana.close();
        throw err;
    }
}

export function tamanoLegible(bytes) {
    if (!bytes) return '';
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Sube, uno por uno, los archivos elegidos de los soportes que aplican (necesitan el id del
// registro ya guardado). `subir(tipoSoporteId, archivo)` es la llamada del servicio.
// Devuelve los nombres que fallaron, los ids subidos y la última lista de soportes del servidor.
export async function subirSoportesPendientes(aplican, archivos, subir) {
    const fallidos = [];
    const subidos = [];
    let ultimos = null;
    for (const soporte of aplican) {
        const archivo = archivos[soporte.id];
        if (!archivo) continue;
        try {
            const { data } = await subir(soporte.id, archivo);
            ultimos = data.soportes;
            subidos.push(soporte.id);
        } catch (err) {
            console.error('Error al subir soporte:', err);
            fallidos.push(`${soporte.nombre}: ${err.response?.data?.message || 'no se pudo cargar'}`);
        }
    }
    return { fallidos, subidos, ultimos };
}
