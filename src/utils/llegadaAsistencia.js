// Cómo se pinta la llegada de un día, igual en "Equipo · hoy" y en el calendario del histórico:
// mitad cómo llegó (verde puntual / amarillo tarde) y mitad azul mientras sigue en turno.

/**
 * Retraso exacto, sin redondear (asistencia.md §72): "45:41 min" o, desde una hora, "1:05:41 h". Usa los
 * segundos que manda el servidor; si no vienen (o vienen en 0 con minutos tarde), cae a los minutos.
 */
export function tardeExacto(segundos, minutos) {
    const total = Number(segundos) > 0 ? Math.floor(Number(segundos)) : Math.round((Number(minutos) || 0) * 60);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s} h` : `${m}:${s} min`;
}

const VERDE = 'var(--success)';
const AMARILLO = '#f59e0b';
const AZUL = 'var(--primary)';
const GRIS = '#9ca3af';
const mitades = (llegada) => `linear-gradient(90deg, ${llegada} 50%, ${AZUL} 50%)`;

export const CELDA = {
    puntual: { bg: VERDE, label: 'Puntual' },
    tarde: { bg: AMARILLO, label: 'Llegó tarde' },
    ausente: { bg: 'var(--danger)', label: 'Ausente' },
    curso_puntual: { bg: mitades(VERDE), label: 'En turno · llegó puntual' },
    curso_tarde: { bg: mitades(AMARILLO), label: 'En turno · llegó tarde' },
    pendiente: { bg: 'var(--border)', label: 'Pendiente' },
    // Novedad de RRHH que cubre el día (incapacidad, vacaciones, licencia…, §71): no es ausencia.
    novedad: { bg: '#a8338f', label: 'Novedad RRHH' },
    // Sin turno (o en su día de descanso) no hay contra qué medir la llegada: ni puntual ni tarde.
    sin_horario: { bg: GRIS, label: 'Sin horario' },
    curso_sin_horario: { bg: mitades(GRIS), label: 'En turno · sin horario' }
};

/** Clave de CELDA para un día con `estado` y `minutos_tarde`, o null si no hubo jornada. */
export function claseDia(dia) {
    if (!dia) return null;
    if (dia.estado === 'novedad') return 'novedad';
    if (dia.estado === 'ausente') return 'ausente';
    if (dia.estado === 'pendiente') return 'pendiente';
    const tarde = dia.minutos_tarde > 0;
    if (dia.estado === 'en_curso' || dia.estado === 'en_pausa') return tarde ? 'curso_tarde' : 'curso_puntual';
    return tarde ? 'tarde' : 'puntual';
}
