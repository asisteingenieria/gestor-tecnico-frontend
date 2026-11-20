// Etiquetas y colores de mantenimientos de equipos (rol técnico de inventario).
// Las reglas viven en el backend (utils/mantenimientoActivos.js): 3 meses naranja, 6 meses rojo.

export const TIPOS_COMPUTADOR = ['ECC-CPU', 'ECC-POR', 'ECC-SER'];
export const esComputador = (tipoActivo) => TIPOS_COMPUTADOR.includes(tipoActivo);

export const TAREAS_PREVENTIVAS = [
    { campo: 'pasta_termica', label: 'Cambio de pasta térmica' },
    { campo: 'limpieza_componentes', label: 'Limpieza de componentes' },
    { campo: 'formateo', label: 'Formateo' }
];

export const ALERTAS = {
    rojo: {
        label: 'Urgente (6+ meses)',
        corto: 'Urgente',
        badge: 'bg-red-100 text-red-800 border-red-300',
        punto: 'bg-red-500',
        rgb: [220, 38, 38]
    },
    naranja: {
        label: 'Próximo (3+ meses)',
        corto: '3+ meses',
        badge: 'bg-orange-100 text-orange-800 border-orange-300',
        punto: 'bg-orange-500',
        rgb: [234, 88, 12]
    },
    al_dia: {
        label: 'Al día',
        corto: 'Al día',
        badge: 'bg-green-100 text-green-800 border-green-300',
        punto: 'bg-green-500',
        rgb: [22, 163, 74]
    },
    sin_registro: {
        label: 'Sin registro',
        corto: 'Sin registro',
        badge: 'bg-gray-100 text-gray-700 border-gray-300',
        punto: 'bg-gray-400',
        rgb: [107, 114, 128]
    }
};

export const TIPO_MANTENIMIENTO = {
    preventivo: 'Preventivo',
    correctivo: 'Correctivo',
    registro_anterior: 'Registro anterior'
};

export const ESTADO_SOLICITUD = {
    pendiente: 'Pendiente',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    cancelada: 'Cancelada'
};

export const CAMPO_HISTORIAL = {
    cpu_procesador: 'CPU / Procesador',
    memoria_ram: 'Memoria RAM',
    almacenamiento: 'Almacenamiento',
    sistema_operativo: 'Sistema operativo',
    clasificacion: 'Clasificación',
    estado: 'Estado',
    puesto: 'Puesto',
    site: 'Site'
};

export const NOMBRE_TIPO_ACTIVO = {
    'ECC-CPU': 'Computadora',
    'ECC-POR': 'Portátil',
    'ECC-SER': 'Servidor',
    'ECC-MON': 'Monitor',
    'ECC-IMP': 'Impresora',
    'ECC-TV': 'Televisor',
    OTHER: 'Otro'
};

export const textoEstado = (estado) => {
    if (!estado) return '—';
    if (estado === 'pendiente_baja') return 'Baja pendiente (admin)';
    if (estado === 'dado_de_baja') return 'Dado de baja';
    return estado.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
};

// La BD guarda UTC; el negocio opera en Colombia.
export const formatoFecha = (fecha, conHora = true) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {})
    });
};

export const textoAlerta = (alerta) => {
    if (!alerta) return '';
    if (alerta.nivel === 'sin_registro') return 'Sin mantenimiento registrado';
    const dias = alerta.diasDesde;
    return `Último mantenimiento: ${formatoFecha(alerta.ultimoMantenimiento, false)} (hace ${dias} día${dias === 1 ? '' : 's'})`;
};
