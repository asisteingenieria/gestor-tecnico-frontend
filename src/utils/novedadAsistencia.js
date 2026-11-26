// Textos y tiempos de las novedades de asistencia —cambio de turno, intercambio y libre— (asistencia.md §86).

export const TIPO_NOVEDAD = { cambio_horario: 'Cambio de turno', intercambio: 'Intercambio de turno', libre: 'Libre' };
export const ESTADO_NOVEDAD = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' };

/** "26 nov 2026, 10:05:13 a. m." en hora de Colombia. */
export const instante = (v) => (v
    ? new Date(v).toLocaleString('es-CO', {
        timeZone: 'America/Bogota', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    : '');

/** Tiempo entre dos instantes: "45 s", "12 min", "3 h 5 min", "2 d 4 h". */
export function tiempoEntre(desde, hasta) {
    if (!desde || !hasta) return '';
    const s = Math.max(0, Math.round((new Date(hasta) - new Date(desde)) / 1000));
    if (s < 60) return `${s} s`;
    const min = Math.floor(s / 60);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
    const d = Math.floor(h / 24);
    return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}
