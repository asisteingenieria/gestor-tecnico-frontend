// Lógica pura sobre los catálogos de RRHH (`GET /users-company/catalogos`): filtros de
// Cliente → Campaña → Cargo, sueldo sugerido por Cliente + Cargo, jefes reales por campaña
// y fechas derivadas del contrato.
//
// Replica EXACTAMENTE las reglas de AgentForm.jsx (alta manual de empleados), para que un
// empleado que llega de Hydra se complete con los mismos criterios que uno creado a mano.
// AgentForm todavía tiene su propia copia; si cambia una regla allá, hay que cambiarla aquí.

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

// Jefe de área / Director de área: personas que ya lo son en esa campaña; sin campaña o sin
// candidatos reales en ella, la lista completa.
export function jefesPorCampania(lista, campaniaId) {
    if (!campaniaId) return dedupePorId(lista);
    const filtrados = lista.filter(j => mismo(j.campania_id, campaniaId));
    return dedupePorId(filtrados.length > 0 ? filtrados : lista);
}

// Jefe inmediato varía por Cargo dentro de la campaña: Campaña + Cargo, si no, solo Campaña.
export function jefesInmediatos(lista, campaniaId, cargoId) {
    if (campaniaId && cargoId) {
        const exactos = lista.filter(j => mismo(j.campania_id, campaniaId) && mismo(j.cargo_id, cargoId));
        if (exactos.length > 0) return dedupePorId(exactos);
    }
    return jefesPorCampania(lista, campaniaId);
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
