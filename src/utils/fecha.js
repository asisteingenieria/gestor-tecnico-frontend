// Los campos DATE puros del backend (sin hora) llegan como medianoche UTC
// (p. ej. "2026-09-15T00:00:00.000Z"). Si se formatean con la zona horaria local del
// navegador, un visitante en un huso con offset negativo (como Bogotá, UTC-5) los ve
// un día atrás. `timeZone: 'UTC'` evita esa conversión: el día calendario que muestra
// es siempre el que el backend guardó.
export function formatearFecha(fechaIso, opciones = { day: '2-digit', month: 'short', year: 'numeric' }) {
    // Sin guardia, new Date(null)/new Date(undefined) cae al epoch Unix y se ve como
    // "01 de ene de 1970" para cualquier fecha que en realidad está vacía en la BD.
    if (!fechaIso) return null;
    return new Date(fechaIso).toLocaleDateString('es-CO', { ...opciones, timeZone: 'UTC' });
}
