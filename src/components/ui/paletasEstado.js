// Colores de estado de las vistas con el diseño de Equipo (asistencia.md §70). Cada color es una clase
// `.ai-st--<clave>` de components.css, la que usan mosaicos, leyenda y pastillas.
//
// Los módulos no inventan colores: eligen uno de estos TONOS, que significan lo mismo en todas las pantallas
// (exito = bien, alerta = pendiente/espera, peligro = rechazo/retiro, etc.). Las combinaciones de cada módulo se
// validaron con scripts/validate_palette.js del skill dataviz, en claro (#ffffff) y en oscuro (#121d2e), con
// --pairs all: ningún par cae bajo el piso de visión normal (ΔE 15). Verde↔rojo queda en ΔE 7,5 para deuteranopía,
// legal solo con codificación secundaria: por eso el mosaico y la pastilla llevan siempre ícono y texto, nunca
// el color solo.
export const TONO = {
    exito: 'conectado',      // verde
    alerta: 'break',         // ámbar
    peligro: 'peligro',      // rojo
    info: 'en_turno',        // azul marino
    neutro: 'desconectado',  // gris
    acento: 'capacitacion',  // morado
    cian: 'bano',            // celeste
    novedad: 'novedad',      // magenta
    suave: 'sin_iniciar'     // gris claro
};

export const claseEstado = (color) => `ai-st--${color}`;

// Estado del contrato del empleado (Personal de la empresa).
export const COLOR_EMPLEADO = {
    activo: TONO.exito,
    periodo_prueba: TONO.info,
    suspendido: TONO.alerta,
    en_proceso: TONO.alerta,
    retirado: TONO.peligro,
    inactivo: TONO.peligro,
    sin_contrato: TONO.neutro
};

// Solicitudes con aprobación: horas extra y cambios de turno.
export const COLOR_SOLICITUD = {
    pendiente: TONO.alerta,
    aprobada: TONO.exito,
    rechazada: TONO.peligro,
    cancelada: TONO.neutro
};

// Aviso de un traspaso al jefe (campana del portal).
export const COLOR_ALERTA_TRASPASO = {
    programada: TONO.suave,
    enviada: TONO.alerta,
    leida: TONO.exito
};

// Contratación Hydra: candidato, examen médico de SST y lote.
export const COLOR_CANDIDATO = {
    pendiente: TONO.alerta,
    listo: TONO.exito,
    registrado: TONO.info,
    no_apto: TONO.peligro,
    descartado: TONO.neutro,
    cancelado_hydra: TONO.neutro
};

export const COLOR_EXAMEN = {
    pendiente: TONO.alerta,
    reagendado: TONO.acento,
    asistio: TONO.info,
    aprobado: TONO.exito,
    no_aprobado: TONO.peligro,
    no_asistio: TONO.novedad
};

export const COLOR_LOTE = {
    abierto: TONO.alerta,
    listo: TONO.exito,
    registrado: TONO.info,
    cancelado: TONO.neutro
};

// Tipo de novedad de RRHH por familia (los nombres vienen de tipo_novedad, migración 069).
const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function colorTipoNovedad(nombre) {
    const n = sinTildes(nombre);
    if (n.includes('incapacidad')) return TONO.novedad;
    if (n.includes('vacacion')) return TONO.cian;
    if (n.includes('licencia')) return TONO.acento;
    if (n.includes('suspension')) return TONO.peligro;
    return TONO.alerta;
}
