// Reporte mensual de horas extras (asistencia.md §32). Las columnas son las del antiguo Excel
// "FORMATO REPORTE DE HORAS EXTRAS V.3"; las reglas viven en el backend
// (domain/asistencia/reporteHorasExtra.js).

export const CLASES_HORAS = [
    { campo: 'recargo_nocturno', label: 'Recargo nocturno', corto: 'Rec. noct.', extra: false },
    { campo: 'extras_diurnas', label: 'Extras diurnas', corto: 'Ext. diurnas', extra: true },
    { campo: 'extras_nocturnas', label: 'Extras nocturnas', corto: 'Ext. noct.', extra: true },
    { campo: 'dominicales_festivas', label: 'Dominicales / festivas (90%)', corto: 'Dom./fest. 90%', extra: false },
    { campo: 'extras_dominicales_festivas', label: 'Extras dominicales / festivas (115%)', corto: 'Ext. dom. 115%', extra: true }
];

export const ESTADO_REPORTE = {
    sin_reporte: { label: 'Sin enviar', clase: 'ai-badge--neutral' },
    borrador: { label: 'Sin enviar (borrador)', clase: 'ai-badge--neutral' },
    enviado: { label: 'Por revisar', clase: 'ai-badge--info' },
    devuelto: { label: 'Devuelto', clase: 'ai-badge--warning' },
    aprobado: { label: 'Aprobado', clase: 'ai-badge--success' }
};

const redondear2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const totalFila = (fila) => redondear2(CLASES_HORAS.reduce((acc, c) => acc + (Number(fila[c.campo]) || 0), 0));

// Solo extras diurnas, nocturnas y dominicales (115%): lo que debe cuadrar con las horas aprobadas.
export const horasExtraFila = (fila) => redondear2(CLASES_HORAS.filter((c) => c.extra).reduce((acc, c) => acc + (Number(fila[c.campo]) || 0), 0));

export const horasDeMinutos = (minutos) => redondear2((Number(minutos) || 0) / 60);

export const formatearHoras = (h) => (Number(h) || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });

// Mes actual y anterior en hora de Colombia, como 'AAAA-MM'.
export function periodoActual() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7);
}

export function periodoAnterior(periodo = periodoActual()) {
    const [a, m] = periodo.split('-').map(Number);
    return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
}

export function nombrePeriodo(periodo) {
    if (!periodo) return '';
    const [a, m] = periodo.split('-').map(Number);
    const texto = new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const formatearFechaCorta = (fechaIso) => (fechaIso
    ? new Date(`${String(fechaIso).slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : '');

export const formatearInstante = (iso) => (iso
    ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '');
