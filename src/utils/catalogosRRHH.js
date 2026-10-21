// Lógica pura sobre los catálogos de RRHH (`GET /users-company/catalogos`): filtros de
// Cliente → Campaña → Cargo, sueldo sugerido por Cliente + Cargo, jefes reales y jefatura
// sugerida por Campaña + Cargo, y fechas derivadas del contrato.
//
// Replica EXACTAMENTE las reglas de AgentForm.jsx (alta manual de empleados), para que un
// empleado que llega de Hydra se complete con los mismos criterios que uno creado a mano.
// AgentForm todavía tiene su propia copia de la mayoría; si cambia una regla allá, hay que
// cambiarla aquí. Los jefes (candidatos y sugerencia) ya los importa de aquí.

// Las 5 clases de riesgo ARL (Decreto 1607 de 2002). Se guarda solo el número.
export const TARIFAS_ARL = [
    { id: '0.522', nombre: 'Clase I — Riesgo mínimo (0,522%): oficinas, actividades administrativas y financieras' },
    { id: '1.044', nombre: 'Clase II — Riesgo bajo (1,044%): comercio al por menor, manufactura ligera y restaurantes' },
    { id: '2.436', nombre: 'Clase III — Riesgo medio (2,436%): procesos industriales, manufactura y confecciones' },
    { id: '4.350', nombre: 'Clase IV — Riesgo alto (4,350%): transporte, vigilancia privada y manufactura pesada' },
    { id: '6.960', nombre: 'Clase V — Riesgo máximo (6,960%): construcción y minería' }
];

// Suma meses a una fecha ISO sin desbordar el mes destino (31 ene + 1 mes = 28/29 feb).
export function sumarMeses(fechaISO, meses) {
    const [y, m, d] = fechaISO.split('-').map(Number);
    const objetivo = new Date(y, m - 1 + meses, 1);
    const ultimoDia = new Date(objetivo.getFullYear(), objetivo.getMonth() + 1, 0).getDate();
    objetivo.setDate(Math.min(d, ultimoDia));
    return `${objetivo.getFullYear()}-${String(objetivo.getMonth() + 1).padStart(2, '0')}-${String(objetivo.getDate()).padStart(2, '0')}`;
}

export function formatearMiles(valor) {
    if (valor === '' || valor === null || valor === undefined) return '';
    const numero = Number(valor);
    return Number.isNaN(numero) ? '' : Math.round(numero).toLocaleString('es-CO');
}

const mismo = (a, b) => String(a) === String(b);

// Clientes derivados de las campañas. "Obama" es un duplicado residual de OBAMACARE y se
// oculta, salvo que sea el cliente ya elegido (mismo criterio que AgentForm).
export function clientesUnicos(campanias, clienteActual) {
    const mapa = new Map();
    for (const c of campanias) {
        if (!mapa.has(c.cliente_id)) mapa.set(c.cliente_id, { id: c.cliente_id, nombre: c.cliente_nombre });
    }
    for (const [id, c] of mapa) {
        if (c.nombre === 'Obama' && !mismo(id, clienteActual)) mapa.delete(id);
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function campaniasDeCliente(campanias, clienteId) {
    return clienteId ? campanias.filter(c => mismo(c.cliente_id, clienteId)) : campanias;
}

export function clienteDeCampania(campanias, campaniaId) {
    return campanias.find(c => mismo(c.id, campaniaId))?.cliente_id ?? '';
}

// Cargo filtrado por Cliente según `salarios_referencia`. Sin referencias para ese cliente
// no se filtra: mejor el catálogo completo que un selector vacío.
export function cargosDeCliente(cargos, salariosReferencia, clienteId, cargoActual) {
    if (!clienteId) return cargos;
    const ids = new Set(salariosReferencia.filter(s => mismo(s.cliente_id, clienteId)).map(s => String(s.cargo_id)));
    return ids.size > 0 ? cargos.filter(c => ids.has(String(c.id)) || mismo(c.id, cargoActual)) : cargos;
}

// Salarios reales distintos para Cliente + Cargo, redondeados a pesos enteros.
export function salariosReferencia(salariosRef, clienteId, cargoId) {
    if (!clienteId || !cargoId) return [];
    const valores = salariosRef
        .filter(s => mismo(s.cliente_id, clienteId) && mismo(s.cargo_id, cargoId))
        .map(s => String(Math.round(Number(s.salario))));
    return [...new Set(valores)].sort((a, b) => Number(a) - Number(b));
}

function dedupePorId(lista) {
    const mapa = new Map();
    for (const item of lista) if (!mapa.has(item.id)) mapa.set(item.id, item);
    return [...mapa.values()];
}

// Jefe inmediato / Jefe de área / Director de área: personas que ya lo son para esa Campaña +
// Cargo (los 3 roles cambian por cargo dentro de una campaña); si la combinación no tiene
// candidatos, los de la Campaña; sin campaña o sin candidatos en ella, la lista completa.
export function jefesCandidatos(lista, campaniaId, cargoId) {
    if (!campaniaId) return dedupePorId(lista);
    const deCampania = lista.filter(j => mismo(j.campania_id, campaniaId));
    const exactos = cargoId ? deCampania.filter(j => mismo(j.cargo_id, cargoId)) : [];
    if (exactos.length > 0) return dedupePorId(exactos);
    return dedupePorId(deCampania.length > 0 ? deCampania : lista);
}

export const ROLES_JEFATURA = ['jefe_inmediato_id', 'jefe_area_id', 'director_area_id'];

// Persona más frecuente en `campo`, ponderada por cuántos contratos siguen cada cadena.
function masComun(cadenas, campo) {
    const totales = new Map();
    for (const c of cadenas) {
        if (c[campo] == null) continue;
        const id = String(c[campo]);
        totales.set(id, (totales.get(id) || 0) + Number(c.total));
    }
    let mejor = '';
    for (const [id, total] of totales) if (!mejor || total > totales.get(mejor)) mejor = id;
    return { id: mejor, distintos: totales.size };
}

// Jefatura sugerida para un empleado nuevo según las cadenas de mando reales
// (`cadenas_jefatura`) de su Campaña + Cargo exactos. Sin cargo, o con una combinación sin
// historia, no se sugiere nada: caer a la campaña le propondría a un cargo de la cima (ej.
// Director financiero) un jefe que en realidad es de su equipo.
// - Jefe inmediato: solo si la combinación tiene uno solo. Con varios equipos (ej. HOGAR +
//   Agente call center tiene 5) no se adivina: se elige a mano entre los candidatos filtrados.
// - Jefe de área / Director: los del equipo del jefe inmediato (elegido o sugerido); sin él,
//   los más comunes de la combinación. Un cargo sin jefes en la realidad queda sin sugerencia.
export function sugerirJefatura(cadenas = [], campaniaId, cargoId, jefeInmediatoId) {
    if (!campaniaId || !cargoId) return {};
    let base = cadenas.filter(c => mismo(c.campania_id, campaniaId) && mismo(c.cargo_id, cargoId));
    if (base.length === 0) return {};

    const inmediato = masComun(base, 'jefe_inmediato_id');
    const sugerido = { jefe_inmediato_id: inmediato.distintos === 1 ? inmediato.id : '' };

    const jefe = jefeInmediatoId || sugerido.jefe_inmediato_id;
    const delEquipo = jefe ? base.filter(c => mismo(c.jefe_inmediato_id, jefe)) : [];
    if (delEquipo.length > 0) base = delEquipo;
    sugerido.jefe_area_id = masComun(base, 'jefe_area_id').id;
    sugerido.director_area_id = masComun(base, 'director_area_id').id;
    return sugerido;
}

// Aplica una sugerencia de jefatura sin pisar lo elegido a mano: solo cambia los campos vacíos
// o los que siguen con el valor de la sugerencia anterior (`sugeridoAntes`).
export function aplicarSugerenciaJefatura(actual, sugeridoAntes, sugeridoAhora) {
    const resultado = {};
    for (const rol of ROLES_JEFATURA) {
        const valor = actual[rol] ? String(actual[rol]) : '';
        const automatico = !valor || valor === (sugeridoAntes?.[rol] || '');
        resultado[rol] = automatico ? (sugeridoAhora[rol] || '') : valor;
    }
    return resultado;
}

// El jefe inmediato que se pasa a `sugerirJefatura`: solo si lo eligió la persona. Si es el
// que puso la sugerencia anterior, se recalcula desde cero (pudo cambiar la campaña o el cargo).
export function jefeInmediatoElegido(actual, sugeridoAntes) {
    const valor = actual ? String(actual) : '';
    return valor && valor !== (sugeridoAntes?.jefe_inmediato_id || '') ? valor : '';
}

// EPS / AFP / Cesantías / Caja / ARL para un selector: solo las vigentes (lista oficial de la
// hoja "EPS AFP CESANTIAS", migración 068), más la ya elegida aunque no lo sea, para no
// esconder la afiliación real de un empleado al editarlo.
export function entidadesVigentes(lista, valorActual) {
    return lista.filter(e => e.vigente === undefined || Number(e.vigente) === 1 || mismo(e.id, valorActual));
}

// Agrega a las opciones el valor ya guardado si el filtro lo dejó fuera, para no mostrar un
// selector con un valor elegido invisible.
export function conValorActual(opciones, todos, valorActual) {
    if (!valorActual || opciones.some(o => mismo(o.id, valorActual))) return opciones;
    const actual = todos.find(o => mismo(o.id, valorActual));
    return actual ? [...opciones, actual] : opciones;
}

// "Fin de contrato" solo aplica a contratos con fecha de finalización (no indefinidos).
export function aplicaFinContrato(nombreTipoContrato) {
    return Boolean(nombreTipoContrato) && !nombreTipoContrato.toLowerCase().includes('indefinido');
}

export function esAprendizaje(nombreTipoContrato) {
    return (nombreTipoContrato || '').toLowerCase().includes('aprendizaje');
}

// Comparación de nombres sin tildes ni mayúsculas (para preseleccionar el cliente que dice Hydra).
export function normalizarNombre(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
