// Reporte mensual de horas extras (asistencia.md §32). Se llena solo con las horas aprobadas; el
// dinero lo calcula el backend (solo para financiera). Las columnas son las del antiguo Excel
// "FORMATO REPORTE DE HORAS EXTRAS V.3".

export const CLASES_HORAS = [
    { campo: 'recargo_nocturno', label: 'Recargo nocturno', corto: 'Rec. noct.' },
    { campo: 'extras_diurnas', label: 'Extras diurnas', corto: 'Ext. diurnas' },
    { campo: 'extras_nocturnas', label: 'Extras nocturnas', corto: 'Ext. noct.' },
    { campo: 'dominicales_festivas', label: 'Dominicales / festivas (90%)', corto: 'Dom./fest. 90%' },
    { campo: 'extras_dominicales_festivas', label: 'Extras dominicales / festivas (115%)', corto: 'Ext. dom. 115%' }
];

// La clase que el agente elige al pedir la hora extra (y el jefe ajusta al aprobar).
export const OPCIONES_CLASE = CLASES_HORAS.map((c) => ({ value: c.campo, label: c.label }));

export const formatearHoras = (h) => (Number(h) || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });

export const formatearPesos = (n) => (Number(n) || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

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
