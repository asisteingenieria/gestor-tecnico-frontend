// Helpers de formato de tiempo compartidos por el módulo de Asistencia (presentación pura,
// sin llamadas a la API). Bogotá es UTC-5 fijo, sin horario de verano.

export function formatearHora12(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Formatea un TIME "HH:MM:SS" de horario (ya en hora Bogotá) sin pasar por Date/zona horaria.
export function formatearHoraTime12(horaTime) {
    if (!horaTime) return null;
    const [hh, mm] = horaTime.split(':').map(Number);
    const periodo = hh < 12 ? 'a. m.' : 'p. m.';
    const hora12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${hora12}:${String(mm).padStart(2, '0')} ${periodo}`;
}

export function formatearDuracion(totalMinutos) {
    const m = Math.max(0, Math.round(totalMinutos || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h === 0) return `${r} min`;
    return `${h} h ${String(r).padStart(2, '0')} min`;
}

export function formatearMinSeg(totalSegundos) {
    const t = Math.max(0, Math.round(totalSegundos));
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function minutosDesdeMedianoche(horaTime) {
    if (!horaTime) return null;
    const [h, m] = horaTime.split(':').map(Number);
    return h * 60 + m;
}

// Minutos desde medianoche Bogotá de un instante UTC real (DATETIME de servidor).
export function minutosBogotaDe(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    let min = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 - 5 * 60;
    if (min < 0) min += 1440;
    return min;
}
