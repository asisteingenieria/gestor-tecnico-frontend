// Campos de cada sección del checklist de contratación (backend:
// domain/contratacionHydra/secciones.js). Las claves y rutas tienen que coincidir con las
// del backend, que es quien valida y decide si una sección está completa.
//
// Solo se MUESTRAN los campos que ya pide el alta manual (AgentForm.jsx): la regla de RRHH
// es que el formulario de empleado solo lleva campos de las hojas fuente "Nuevo Epleado" y
// "EJEMPLO" (claude/modulo recursoshumanos.md). Los demás campos del backend se conservan
// tal como estén, sin pedirlos.
//
// Tipos: texto | email | tel | fecha | numero | moneda | select | combobox | check.
// `catalogo` es la clave en GET /users-company/catalogos. Rutas que empiezan por "_" son
// solo de interfaz (no se envían).

import {
    TARIFAS_ARL, clientesUnicos, campaniasDeCliente, clienteDeCampania, cargosDeCliente,
    jefesCandidatos, conValorActual, aplicaFinContrato, esAprendizaje, sumarMeses, entidadesVigentes,
    sugerirJefatura, aplicarSugerenciaJefatura, jefeInmediatoElegido, ROLES_JEFATURA
} from '../../utils/catalogosRRHH';

const conCodigo = (o) => (o.codigo ? `${o.nombre} (${o.codigo})` : o.nombre);
const nombreDe = (lista, id) => lista.find(o => String(o.id) === String(id))?.nombre || '';

// Jefatura sugerida por Campaña + Cargo, igual que en el alta manual (AgentForm). Se recalcula
// al cambiar Cliente, Campaña, Cargo o Jefe inmediato; `_jefatura_sugerida` recuerda lo que
// puso la sugerencia para reemplazarlo después sin pisar nunca lo elegido a mano.
const conJefaturaSugerida = (d, cat) => {
    const antes = d._jefatura_sugerida || {};
    const actual = Object.fromEntries(ROLES_JEFATURA.map(rol => [rol, d[`contrato.${rol}`]]));
    const ahora = sugerirJefatura(
        cat.cadenas_jefatura, d['contrato.campania_id'], d['contrato.cargo_id'],
        jefeInmediatoElegido(actual.jefe_inmediato_id, antes)
    );
    const aplicado = aplicarSugerenciaJefatura(actual, antes, ahora);
    const siguiente = { ...d, _jefatura_sugerida: {} };
    for (const rol of ROLES_JEFATURA) {
        siguiente[`contrato.${rol}`] = aplicado[rol];
        if (aplicado[rol] && aplicado[rol] === (ahora[rol] || '')) siguiente._jefatura_sugerida[rol] = aplicado[rol];
    }
    return siguiente;
};
const codigoDe = (lista, id) => lista.find(o => String(o.id) === String(id))?.codigo || '';
const nombreCompleto = (o) => o.nombre_completo;

export const SECCIONES_UI = [
    {
        clave: 'personal',
        titulo: 'Datos personales',
        campos: [
            { ruta: 'tipo_identificacion_id', label: 'Tipo de documento', tipo: 'select', catalogo: 'tipos_identificacion', render: conCodigo, requerido: true },
            { ruta: 'numero_identificacion', label: 'Número de identificación', tipo: 'texto', requerido: true },
            { ruta: 'fecha_expedicion', label: 'Fecha de expedición', tipo: 'fecha' },
            { ruta: 'ciudad_expedicion_id', label: 'Ciudad de expedición', tipo: 'combobox', catalogo: 'ciudades' },
            // Documento secundario: solo PPT o Pasaporte (mismo criterio que AgentForm).
            {
                ruta: 'tipo_identificacion_secundaria_id', label: 'Tipo de documento secundario', tipo: 'select',
                catalogo: 'tipos_identificacion', render: conCodigo,
                visible: (d, cat) => ['PPT', 'PA'].includes(codigoDe(cat.tipos_identificacion, d.tipo_identificacion_id))
            },
            {
                ruta: 'numero_identificacion_secundaria', label: 'Identificación secundaria', tipo: 'texto',
                visible: (d, cat) => ['PPT', 'PA'].includes(codigoDe(cat.tipos_identificacion, d.tipo_identificacion_id))
            },
            { ruta: 'rut', label: 'RUT', tipo: 'texto' },
            { ruta: 'libreta_militar_numero', label: 'Libreta militar No.', tipo: 'texto' },
            { ruta: 'primer_nombre', label: 'Primer nombre', tipo: 'texto', requerido: true },
            { ruta: 'segundo_nombre', label: 'Segundo nombre', tipo: 'texto' },
            { ruta: 'primer_apellido', label: 'Primer apellido', tipo: 'texto', requerido: true },
            { ruta: 'segundo_apellido', label: 'Segundo apellido', tipo: 'texto' },
            { ruta: 'fecha_nacimiento', label: 'Fecha de nacimiento', tipo: 'fecha' },
            { ruta: 'ciudad_nacimiento_id', label: 'Ciudad de nacimiento', tipo: 'combobox', catalogo: 'ciudades' },
            { ruta: 'genero_id', label: 'Género', tipo: 'select', catalogo: 'generos' },
            { ruta: 'estado_civil_id', label: 'Estado civil', tipo: 'select', catalogo: 'estados_civiles' },
            { ruta: 'grupo_sanguineo_id', label: 'Grupo sanguíneo', tipo: 'select', catalogo: 'grupos_sanguineos' },
            { ruta: 'numero_hijos', label: 'Número de hijos', tipo: 'numero' },
            { ruta: 'email', label: 'Correo electrónico', tipo: 'email' },
            { ruta: 'telefono', label: 'Teléfono', tipo: 'tel' },
            { ruta: 'usuario_ssff', label: 'Usuario SSFF', tipo: 'texto' }
        ]
    },
    {
        clave: 'contrato',
        titulo: 'Contrato',
        campos: [
            // Cliente es un filtro de interfaz: el backend deriva el cliente de la campaña.
            {
                ruta: '_cliente_id', label: 'Cliente', tipo: 'select', requerido: true, etiquetaSalario: true,
                opciones: (d, cat) => clientesUnicos(cat.campanias, d._cliente_id),
                alCambiar: (d, valor, cat) => conJefaturaSugerida({
                    ...d,
                    _cliente_id: valor,
                    'contrato.campania_id': String(clienteDeCampania(cat.campanias, d['contrato.campania_id'])) === String(valor) ? d['contrato.campania_id'] : '',
                    'contrato.cargo_id': cargosDeCliente(cat.cargos, cat.salarios_referencia, valor, '').some(c => String(c.id) === String(d['contrato.cargo_id'])) ? d['contrato.cargo_id'] : ''
                }, cat)
            },
            {
                ruta: 'contrato.campania_id', label: 'Campaña', tipo: 'select', requerido: true,
                opciones: (d, cat) => campaniasDeCliente(cat.campanias, d._cliente_id),
                alCambiar: (d, valor, cat) => conJefaturaSugerida({ ...d, 'contrato.campania_id': valor, _cliente_id: clienteDeCampania(cat.campanias, valor) || d._cliente_id }, cat)
            },
            { ruta: 'contrato.area_id', label: 'Área', tipo: 'select', catalogo: 'areas', requerido: true },
            { ruta: 'contrato.centro_costo_id', label: 'Centro de costo', tipo: 'select', catalogo: 'centros_costo', requerido: true, render: (o) => `${o.codigo} — ${o.nombre}` },
            {
                ruta: 'contrato.cargo_id', label: 'Cargo', tipo: 'select', requerido: true, etiquetaSalario: true,
                opciones: (d, cat) => cargosDeCliente(cat.cargos, cat.salarios_referencia, d._cliente_id, d['contrato.cargo_id']),
                alCambiar: (d, valor, cat) => conJefaturaSugerida({ ...d, 'contrato.cargo_id': valor }, cat)
            },
            { ruta: 'contrato.cargo_ssff', label: 'Cargo en SSFF', tipo: 'texto' },
            {
                ruta: 'contrato.tipo_contrato_id', label: 'Tipo de contrato', tipo: 'select', catalogo: 'tipos_contrato', requerido: true,
                alCambiar: (d, valor, cat) => {
                    const nombre = nombreDe(cat.tipos_contrato, valor);
                    const siguiente = { ...d, 'contrato.tipo_contrato_id': valor };
                    if (!aplicaFinContrato(nombre)) siguiente['contrato.fecha_fin_contrato'] = '';
                    if (esAprendizaje(nombre) && d['contrato.fecha_ingreso']) siguiente['contrato.fecha_fin_contrato'] = sumarMeses(d['contrato.fecha_ingreso'], 6);
                    return siguiente;
                }
            },
            { ruta: 'contrato.modalidad_id', label: 'Modalidad', tipo: 'select', catalogo: 'modalidades', requerido: true },
            { ruta: 'contrato.oleada_id', label: 'Oleada', tipo: 'select', catalogo: 'oleadas', requerido: true },
            { ruta: 'contrato.ciudad_id', label: 'Ciudad de trabajo', tipo: 'combobox', catalogo: 'ciudades', requerido: true },
            { ruta: 'contrato.piso', label: 'Piso', tipo: 'texto' },
            {
                ruta: 'contrato.fecha_ingreso', label: 'Fecha de ingreso', tipo: 'fecha', requerido: true,
                // Periodo de prueba a 2 meses y, si es Aprendizaje, fin de contrato a 6 (editables).
                alCambiar: (d, valor, cat) => ({
                    ...d,
                    'contrato.fecha_ingreso': valor,
                    'contrato.fecha_fin_periodo_prueba': valor ? sumarMeses(valor, 2) : d['contrato.fecha_fin_periodo_prueba'],
                    ...(esAprendizaje(nombreDe(cat.tipos_contrato, d['contrato.tipo_contrato_id'])) ? { 'contrato.fecha_fin_contrato': valor ? sumarMeses(valor, 6) : '' } : {})
                })
            },
            { ruta: 'contrato.fecha_fin_periodo_prueba', label: 'Fin periodo de prueba', tipo: 'fecha' },
            {
                ruta: 'contrato.fecha_fin_contrato', label: 'Fin de contrato', tipo: 'fecha',
                visible: (d, cat) => aplicaFinContrato(nombreDe(cat.tipos_contrato, d['contrato.tipo_contrato_id']))
            },
            {
                ruta: 'contrato.jefe_inmediato_id', label: 'Jefe inmediato', tipo: 'select', render: nombreCompleto,
                opciones: (d, cat) => conValorActual(jefesCandidatos(cat.jefes_inmediatos, d['contrato.campania_id'], d['contrato.cargo_id']), cat.empleados, d['contrato.jefe_inmediato_id']),
                alCambiar: (d, valor, cat) => conJefaturaSugerida({ ...d, 'contrato.jefe_inmediato_id': valor }, cat)
            },
            {
                ruta: 'contrato.jefe_area_id', label: 'Jefe de área', tipo: 'select', render: nombreCompleto,
                opciones: (d, cat) => conValorActual(jefesCandidatos(cat.jefes_area, d['contrato.campania_id'], d['contrato.cargo_id']), cat.empleados, d['contrato.jefe_area_id'])
            },
            {
                ruta: 'contrato.director_area_id', label: 'Director de área', tipo: 'select', render: nombreCompleto,
                opciones: (d, cat) => conValorActual(jefesCandidatos(cat.directores_area, d['contrato.campania_id'], d['contrato.cargo_id']), cat.empleados, d['contrato.director_area_id'])
            },
            { ruta: 'contrato.empresa_id', label: 'Empresa', tipo: 'select', catalogo: 'empresas', unicoPorDefecto: true },
            { ruta: 'contrato.periodo_pago_id', label: 'Periodo de pago', tipo: 'select', catalogo: 'periodos_pago', unicoPorDefecto: true },
            { ruta: 'contrato.tipo_cotizante_id', label: 'Tipo cotizante', tipo: 'select', catalogo: 'tipos_cotizante', unicoPorDefecto: true }
        ]
    },
    {
        clave: 'salario',
        titulo: 'Salario',
        campos: [
            { ruta: 'salario.salario', label: 'Salario mensual', tipo: 'moneda', requerido: true },
            { ruta: 'salario.bono_no_prestacional', label: 'Bono no prestacional', tipo: 'numero' },
            { ruta: 'salario.bono_cafeteria', label: 'Bono cafetería', tipo: 'numero' }
        ]
    },
    {
        clave: 'seguridad_social',
        titulo: 'Seguridad social',
        campos: [
            // Solo las entidades vigentes (hoja "EPS AFP CESANTIAS", migración 068), más la ya elegida.
            { ruta: 'seguridad_social.eps_id', label: 'EPS', tipo: 'select', opciones: (d, cat) => entidadesVigentes(cat.entidades_eps, d['seguridad_social.eps_id']) },
            { ruta: 'seguridad_social.eps_fecha_afiliacion', label: 'Fecha afiliación EPS', tipo: 'fecha' },
            { ruta: 'seguridad_social.arl_id', label: 'ARL', tipo: 'select', opciones: (d, cat) => entidadesVigentes(cat.entidades_arl, d['seguridad_social.arl_id']) },
            { ruta: 'seguridad_social.arl_fecha_afiliacion', label: 'Fecha afiliación ARL', tipo: 'fecha' },
            { ruta: 'seguridad_social.tarifa_arl', label: 'Tarifa ARL (%)', tipo: 'select', opciones: () => TARIFAS_ARL, span2: true },
            { ruta: 'seguridad_social.afp_id', label: 'Fondo de pensiones (AFP)', tipo: 'select', opciones: (d, cat) => entidadesVigentes(cat.entidades_afp, d['seguridad_social.afp_id']) },
            { ruta: 'seguridad_social.afp_fecha_afiliacion', label: 'Fecha afiliación AFP', tipo: 'fecha' },
            { ruta: 'seguridad_social.cesantias_id', label: 'Fondo de cesantías', tipo: 'select', opciones: (d, cat) => entidadesVigentes(cat.entidades_cesantias, d['seguridad_social.cesantias_id']) },
            { ruta: 'seguridad_social.caja_id', label: 'Caja de compensación', tipo: 'select', opciones: (d, cat) => entidadesVigentes(cat.entidades_caja, d['seguridad_social.caja_id']) },
            { ruta: 'seguridad_social.caja_fecha_afiliacion', label: 'Fecha afiliación caja', tipo: 'fecha' }
        ]
    },
    {
        clave: 'cuenta_bancaria',
        titulo: 'Cuenta bancaria',
        nota: 'Se registra completa (banco, tipo y número) o se deja vacía.',
        campos: [
            { ruta: 'cuenta_bancaria.banco_id', label: 'Banco', tipo: 'select', catalogo: 'bancos' },
            { ruta: 'cuenta_bancaria.tipo_cuenta_id', label: 'Tipo de cuenta', tipo: 'select', catalogo: 'tipos_cuenta' },
            { ruta: 'cuenta_bancaria.numero_cuenta', label: 'Número de cuenta', tipo: 'texto' }
        ]
    },
    {
        clave: 'direccion_contacto',
        titulo: 'Dirección y contacto de emergencia',
        campos: [
            { ruta: 'direccion.direccion', label: 'Dirección', tipo: 'texto', span2: true },
            { ruta: 'direccion.barrio', label: 'Barrio', tipo: 'texto' },
            { ruta: 'direccion.ciudad_id', label: 'Ciudad de residencia', tipo: 'combobox', catalogo: 'ciudades' },
            { ruta: 'direccion.zona_direccion_id', label: 'Zona', tipo: 'select', catalogo: 'zonas_direccion' },
            { ruta: 'direccion.tipo_vivienda_id', label: 'Tipo de vivienda', tipo: 'select', catalogo: 'tipos_vivienda' },
            // Igual que el alta manual: siempre "Residencia", sin exponer el selector.
            { ruta: 'direccion.tipo_direccion_id', tipo: 'oculto', porDefecto: (cat) => cat.tipos_direccion.find(o => o.nombre === 'Residencia')?.id ?? '' },
            { ruta: 'contacto_emergencia.nombre', label: 'Contacto de emergencia', tipo: 'texto' },
            { ruta: 'contacto_emergencia.telefono', label: 'Teléfono de emergencia', tipo: 'tel' },
            { ruta: 'contacto_emergencia.parentesco_id', label: 'Parentesco', tipo: 'select', catalogo: 'parentescos' }
        ]
    },
    {
        clave: 'dotacion',
        titulo: 'Dotación',
        campos: [
            { ruta: 'contrato.aplica_dotacion', label: 'Aplica dotación', tipo: 'check' },
            { ruta: 'dotacion.talla_camisa', label: 'Talla camisa', tipo: 'texto', visible: (d) => d['contrato.aplica_dotacion'] === true },
            { ruta: 'dotacion.talla_pantalon', label: 'Talla pantalón', tipo: 'texto', visible: (d) => d['contrato.aplica_dotacion'] === true },
            { ruta: 'dotacion.talla_calzado', label: 'Talla calzado', tipo: 'texto', visible: (d) => d['contrato.aplica_dotacion'] === true }
        ]
    }
];

// ----------------------------------------------------------------- helpers ----

export function obtener(objeto, ruta) {
    return ruta.split('.').reduce((actual, clave) => (actual == null ? undefined : actual[clave]), objeto);
}

function asignar(objeto, ruta, valor) {
    const claves = ruta.split('.');
    const ultima = claves.pop();
    let actual = objeto;
    for (const clave of claves) {
        if (actual[clave] == null || typeof actual[clave] !== 'object') actual[clave] = {};
        actual = actual[clave];
    }
    actual[ultima] = valor;
}

// Borrador plano { ruta: valor } de una sección, para los inputs.
export function borradorDeSeccion(seccion, datosEmpleado, catalogos) {
    const borrador = {};
    for (const campo of seccion.campos) {
        if (campo.ruta.startsWith('_')) continue;
        const valor = obtener(datosEmpleado, campo.ruta);
        if (campo.tipo === 'check') borrador[campo.ruta] = valor === true || valor === 1;
        else borrador[campo.ruta] = valor === null || valor === undefined ? '' : String(valor);
    }
    if (seccion.clave === 'contrato') {
        borrador._cliente_id = String(clienteDeCampania(catalogos.campanias, borrador['contrato.campania_id']) || '');
    }
    return borrador;
}

// Sugerencias que el alta manual también pone solas, aplicadas al borrador (sin guardar):
// catálogos de un único valor, el tipo de dirección "Residencia" y la jefatura por Campaña +
// Cargo (solo llena los jefes vacíos: los ya guardados cuentan como elegidos a mano).
export function aplicarValoresPorDefecto(seccion, borrador, catalogos) {
    let siguiente = { ...borrador };
    if (seccion.clave === 'contrato') siguiente = conJefaturaSugerida(siguiente, catalogos);
    for (const campo of seccion.campos) {
        if (siguiente[campo.ruta] !== '') continue;
        if (campo.unicoPorDefecto && catalogos[campo.catalogo]?.length === 1) {
            siguiente[campo.ruta] = String(catalogos[campo.catalogo][0].id);
        }
        if (campo.porDefecto && siguiente['direccion.direccion']) {
            siguiente[campo.ruta] = String(campo.porDefecto(catalogos));
        }
    }
    return siguiente;
}

// Cuerpo anidado para PUT /secciones/:seccion. Vacío → null (el backend lo vacía).
export function cuerpoDeBorrador(seccion, borrador) {
    const cuerpo = {};
    for (const campo of seccion.campos) {
        if (campo.ruta.startsWith('_')) continue;
        const valor = borrador[campo.ruta];
        asignar(cuerpo, campo.ruta, valor === '' ? null : valor);
    }
    return cuerpo;
}

export function borradorCambio(a, b) {
    const claves = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const clave of claves) {
        if (clave.startsWith('_')) continue;
        if (String(a[clave] ?? '') !== String(b[clave] ?? '')) return true;
    }
    return false;
}

export const ESTADO_SECCION = {
    completo: { clase: 'ai-badge--success', texto: 'Completo' },
    pendiente: { clase: 'ai-badge--warning', texto: 'Pendiente' },
    desactualizada: { clase: 'ai-badge--danger', texto: 'Cambió tras verificar' }
};

export const ESTADO_CANDIDATO = {
    pendiente: { clase: 'ai-badge--warning', texto: 'Pendiente' },
    listo: { clase: 'ai-badge--success', texto: 'Listo' },
    registrado: { clase: 'ai-badge--info', texto: 'Registrado' },
    descartado: { clase: 'ai-badge--neutral', texto: 'Descartado' },
    cancelado_hydra: { clase: 'ai-badge--neutral', texto: 'Cancelado en Hydra' },
    no_apto: { clase: 'ai-badge--danger', texto: 'No apto (exámenes)' }
};

// Exámenes médicos de SST (migración 089). Solo con "aprobado" se registra.
export const ESTADO_EXAMEN = {
    pendiente: { clase: 'ai-badge--warning', texto: 'Examen pendiente' },
    no_asistio: { clase: 'ai-badge--danger', texto: 'No asistió' },
    reagendado: { clase: 'ai-badge--info', texto: 'Reagendado' },
    asistio: { clase: 'ai-badge--info', texto: 'Asistió · sin resultado' },
    aprobado: { clase: 'ai-badge--success', texto: 'Examen aprobado' },
    no_aprobado: { clase: 'ai-badge--danger', texto: 'No aprobó' }
};

export const ESTADO_LOTE = {
    abierto: { clase: 'ai-badge--warning', texto: 'En completitud' },
    listo: { clase: 'ai-badge--success', texto: 'Listo para registrar' },
    registrado: { clase: 'ai-badge--info', texto: 'Registrado' },
    cancelado: { clase: 'ai-badge--neutral', texto: 'Cancelado' }
};

// Mensaje + detalles de un error del backend ({ message, detalles }).
export function mensajeError(err, porDefecto = 'Ocurrió un error') {
    const data = err?.response?.data;
    return {
        mensaje: data?.message || data?.msg || err?.message || porDefecto,
        detalles: Array.isArray(data?.detalles) ? data.detalles : []
    };
}
