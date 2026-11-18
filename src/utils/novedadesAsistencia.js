// Novedades de RRHH en las pantallas de asistencia del equipo (backend: asistencia.md §71). El servidor manda
// en cada persona `novedad = { id, tipo, desde, hasta, cubre_dia }` (Hoy) y en cada día del histórico.

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Estados en que la persona sí está trabajando o ya trabajó hoy: la novedad se muestra, pero no la reemplaza.
const TRABAJANDO = new Set(['en_curso', 'en_pausa', 'finalizada']);

/** Nombre corto del tipo para la pastilla: "Incapacidad", "Vacaciones", "Licencia remunerada"… */
export function etiquetaNovedad(tipo) {
    const t = normalizar(tipo);
    if (t.startsWith('incapacidad')) return 'Incapacidad';
    if (t.startsWith('suspension')) return 'Suspensión';
    if (t.startsWith('horas de votacion')) return 'Votación';
    if (t.startsWith('dia de la familia')) return 'Día de la familia';
    if (t.startsWith('vacaciones')) return 'Vacaciones';
    const limpio = String(tipo || 'Novedad').trim().toLowerCase();
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

const fechaCorta = (f) => {
    const [, m, d] = String(f).split('-');
    return `${d}/${m}`;
};

/** "Incapacidades origen comun 1- 2 días · del 10/11 al 11/11" */
export function tituloNovedad(novedad) {
    if (!novedad) return '';
    const rango = novedad.desde === novedad.hasta
        ? `el ${fechaCorta(novedad.desde)}`
        : `del ${fechaCorta(novedad.desde)} al ${fechaCorta(novedad.hasta)}`;
    const parcial = novedad.cubre_dia ? '' : ' · no cubre el día completo';
    return `Novedad de RRHH: ${novedad.tipo} · ${rango}${parcial}`;
}

/** ¿Hoy no vino por una novedad que cubre el día? (si está trabajando, no). */
export function noAsistioPorNovedad(emp) {
    return !!emp?.novedad?.cubre_dia && !TRABAJANDO.has(emp.estado);
}
