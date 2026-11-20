// Qué datos aplican a cada tipo de novedad, para el detalle (NovedadDetalleModal). Los nombres
// son los de tipo_novedad (migración 069 del backend). Origen, diagnóstico y accidente de
// tránsito solo tienen sentido en las incapacidades.

export const esIncapacidad = (tipo) => /incapacidad/i.test(tipo || '');
export const esAccidenteTransito = (tipo) => /transito|tránsito/i.test(tipo || '');
export const esVacaciones = (tipo) => String(tipo || '').trim().toLowerCase() === 'vacaciones';

// Modalidad de la novedad de Vacaciones (migración 107 del backend, §59). Las de antes no tienen: disfrutadas.
export const MODALIDADES_VACACIONES = {
    disfrutadas: 'Disfrutadas',
    compensadas: 'Compensadas',
    disfrutadas_compensadas: 'Disfrutadas y compensadas'
};
export const modalidadVacaciones = (n) => MODALIDADES_VACACIONES[n.modalidad_vacaciones || 'disfrutadas'];
// "Disfrutadas y compensadas · 5 + 5 días" para la tabla.
export function detalleVacaciones(n) {
    if (n.modalidad_vacaciones === 'disfrutadas_compensadas') {
        return `${modalidadVacaciones(n)} · ${n.dias_disfrutados} + ${n.dias_compensados} días`;
    }
    return modalidadVacaciones(n);
}

const fmtFecha = (v) => (v ? new Date(v).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : null);

/**
 * Secciones del detalle de una novedad: [{ titulo, campos: [{ label, value }] }]. Los campos sin
 * valor se omiten, salvo las fechas base, que salen con "—" para que se note si faltan.
 */
export function seccionesNovedad(n) {
    const tipo = n.tipo_novedad_nombre;
    // Vacaciones compensadas: se pagan en dinero, no hay fecha final ni de retorno (§59.1).
    const compensadas = esVacaciones(tipo) && n.modalidad_vacaciones === 'compensadas';
    const fechas = [
        { label: compensadas ? 'Fecha de compensación' : 'Fecha inicial', value: fmtFecha(n.fecha_inicial), siempre: true },
        { label: 'Fecha final', value: fmtFecha(n.fecha_final), siempre: !compensadas },
        { label: 'Total días', value: n.total_dias ?? null, siempre: true },
        { label: 'Fecha de retorno', value: fmtFecha(n.fecha_retorno), siempre: !compensadas },
        { label: 'Fecha de reporte', value: fmtFecha(n.fecha_reporte), siempre: true },
        { label: 'Fecha de recibido', value: fmtFecha(n.fecha_recibido), siempre: true }
    ];

    const especificos = [];
    if (esVacaciones(tipo)) {
        especificos.push({ label: 'Modalidad', value: modalidadVacaciones(n), siempre: true });
        especificos.push({ label: 'Días disfrutados', value: n.modalidad_vacaciones ? n.dias_disfrutados : n.total_dias, siempre: true });
        especificos.push({ label: 'Días compensados en dinero', value: n.modalidad_vacaciones ? n.dias_compensados : 0, siempre: true });
    }
    if (esIncapacidad(tipo)) {
        especificos.push({ label: 'Origen de la incapacidad', value: n.origen_incapacidad, siempre: true });
        if (esAccidenteTransito(tipo)) especificos.push({ label: 'Accidente de tránsito', value: n.accidente_transito ? 'Sí' : 'No', siempre: true });
        especificos.push({ label: 'Diagnóstico', value: n.resumen_diagnostico, siempre: true, ancho: true });
    }

    const empleado = [
        { label: 'Cargo', value: n.cargo_nombre },
        { label: 'Campaña', value: n.campania_nombre },
        { label: 'Centro de costo', value: n.centro_costo_nombre },
        { label: 'Responsable', value: n.responsable_nombre }
    ];

    const visibles = (campos) => campos.filter(c => c.siempre || (c.value !== null && c.value !== undefined && c.value !== ''));
    return [
        { titulo: 'Fechas', campos: visibles(fechas) },
        { titulo: esVacaciones(tipo) ? 'Vacaciones' : 'Incapacidad', campos: visibles(especificos) },
        { titulo: 'Empleado', campos: visibles(empleado) },
        { titulo: 'Observaciones', campos: visibles([{ label: 'Observaciones', value: n.observaciones, ancho: true }]) }
    ].filter(s => s.campos.length > 0);
}
