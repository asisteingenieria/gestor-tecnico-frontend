// Qué se llena en cada tipo de traspaso: hoja "TRASPASOS" de Criterios (1).xlsx (migración 070).
// Copia de utils/camposTraspaso.js del backend (que además valida y deja en NULL lo que no
// aplica): si cambia uno, hay que cambiar el otro.

const DESTINO = [
    'area_nueva_id', 'campania_nueva_id', 'centro_costo_nuevo_id', 'cargo_ssff_nuevo', 'usuario_ssff_nuevo',
    'jefe_area_nuevo_id', 'jefe_inmediato_nuevo_id', 'modalidad_idmodalidad'
];

export const CAMPOS_NUEVOS_POR_TIPO = {
    ENCARGO: ['cargo_nuevo_id', 'bono_no_prestacional_nuevo', 'fecha_inicio', 'fecha_fin', ...DESTINO],
    RATIFICACION: ['cargo_nuevo_id', 'salario_nuevo', 'fecha_inicio', ...DESTINO],
    NO_RATIFICACION: ['cargo_nuevo_id', 'salario_nuevo', 'fecha_inicio', ...DESTINO],
    TRABAJO_CASA: ['modalidad_idmodalidad', 'fecha_inicio_trabajo_casa', 'fecha_fin_trabajo_casa', 'diadema', 'equipo_computo'],
    CAMBIO_CARGO: ['cargo_nuevo_id', 'salario_nuevo', 'fecha_inicio', ...DESTINO],
    CAMBIO_SALARIO: ['cargo_nuevo_id', 'salario_nuevo', 'fecha_inicio', ...DESTINO]
};

export const OBLIGATORIOS_POR_TIPO = {
    ENCARGO: ['cargo_nuevo_id', 'fecha_inicio', 'fecha_fin'],
    RATIFICACION: ['cargo_nuevo_id', 'fecha_inicio'],
    NO_RATIFICACION: ['cargo_nuevo_id', 'fecha_inicio'],
    TRABAJO_CASA: ['modalidad_idmodalidad', 'fecha_inicio_trabajo_casa', 'fecha_fin_trabajo_casa'],
    CAMBIO_CARGO: ['cargo_nuevo_id', 'salario_nuevo', 'fecha_inicio'],
    CAMBIO_SALARIO: ['salario_nuevo', 'fecha_inicio']
};

// "Información actual": igual en todos los tipos, en el orden de la hoja.
export const CAMPOS_ACTUALES = [
    'tipo_contrato_anterior_id', 'ciudad_anterior_id', 'fecha_ingreso_anterior',
    'area_anterior_id', 'campania_anterior_id', 'centro_costo_anterior_id',
    'cargo_ssff_anterior', 'usuario_ssff_anterior', 'cargo_anterior_id',
    'salario_anterior', 'bono_no_prestacional_anterior',
    'jefe_area_anterior_id', 'jefe_inmediato_anterior_id', 'modalidad_anterior_id'
];

const ETIQUETAS = {
    tipo_contrato_anterior_id: 'Tipo de contrato',
    ciudad_anterior_id: 'Ciudad donde labora',
    fecha_ingreso_anterior: 'Fecha de ingreso',
    area_anterior_id: 'Área actual',
    campania_anterior_id: 'Campaña',
    centro_costo_anterior_id: 'Centro de costo',
    cargo_ssff_anterior: 'Cargo SuccessFactors anterior',
    usuario_ssff_anterior: 'Usuario SSFF anterior',
    cargo_anterior_id: 'Cargo actual',
    salario_anterior: 'Salario actual',
    bono_no_prestacional_anterior: 'BNP actual',
    jefe_area_anterior_id: 'Jefe de área',
    jefe_inmediato_anterior_id: 'Jefe inmediato',
    modalidad_anterior_id: 'Modalidad',

    cargo_nuevo_id: 'Cargo nuevo',
    bono_no_prestacional_nuevo: 'BNP nuevo',
    salario_nuevo: 'Salario nuevo',
    fecha_inicio: 'Fecha inicio',
    fecha_fin: 'Fecha fin',
    area_nueva_id: 'Área',
    campania_nueva_id: 'Campaña',
    centro_costo_nuevo_id: 'Centro de costo',
    cargo_ssff_nuevo: 'Cargo SuccessFactors',
    usuario_ssff_nuevo: 'Usuario SSFF',
    jefe_area_nuevo_id: 'Jefe de área',
    jefe_inmediato_nuevo_id: 'Jefe inmediato',
    modalidad_idmodalidad: 'Modalidad',
    fecha_inicio_trabajo_casa: 'Fecha de inicio de trabajo en casa',
    fecha_fin_trabajo_casa: 'Fecha fin de trabajo en casa',
    diadema: 'Diadema',
    equipo_computo: 'Equipo de cómputo'
};

// En "cambio de salario" la hoja dice "Cargo" (el mismo, se confirma) y en trabajo en casa
// "Modalidad nueva".
export function etiquetaCampo(campo, codigo) {
    if (campo === 'cargo_nuevo_id' && codigo === 'CAMBIO_SALARIO') return 'Cargo';
    if (campo === 'modalidad_idmodalidad' && codigo === 'TRABAJO_CASA') return 'Modalidad nueva';
    return ETIQUETAS[campo] || campo;
}

export const TIPOS_CON_EVALUACION = ['RATIFICACION', 'NO_RATIFICACION'];
export const DIAS_AVISO_RETORNO = 7;

// Fecha (YYYY-MM-DD) menos n días, sin pasar por la zona horaria del navegador.
export function restarDias(fechaISO, dias) {
    if (!fechaISO) return '';
    const d = new Date(`${String(fechaISO).slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - dias);
    return d.toISOString().slice(0, 10);
}
