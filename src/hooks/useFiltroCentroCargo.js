import { useMemo, useState } from 'react';

// Estado del filtro por centro de costo y por cargo de las vistas de Equipo (asistencia.md §85). Los selectores
// están en components/asistencia/FiltroCentroCargo.jsx. Los dos filtros se combinan: el conteo de cada centro
// respeta el cargo elegido y el de cada cargo respeta el centro. La opción elegida se conserva aunque con el
// otro filtro quede en 0, para no borrar la selección por sorpresa.

export const SIN_CENTRO = 'Sin centro de costo';
export const SIN_CARGO = 'Sin cargo';

const centroDe = (e) => e.centro_costo || SIN_CENTRO;
const cargoDe = (e) => e.cargo || SIN_CARGO;

function conConteo(lista, valorDe, elegido) {
    const conteo = new Map();
    for (const e of lista) conteo.set(valorDe(e), (conteo.get(valorDe(e)) || 0) + 1);
    if (elegido && !conteo.has(elegido)) conteo.set(elegido, 0);
    return [...conteo.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Estado de los dos filtros sobre `lista` (filas con `centro_costo` y `cargo`). */
export function useFiltroCentroCargo(lista) {
    const [centro, setCentro] = useState('');
    const [cargo, setCargo] = useState('');

    return useMemo(() => {
        const delCargo = cargo ? lista.filter((e) => cargoDe(e) === cargo) : lista;
        const delCentro = centro ? lista.filter((e) => centroDe(e) === centro) : lista;
        return {
            centro,
            cargo,
            setCentro,
            setCargo,
            limpiar: () => { setCentro(''); setCargo(''); },
            // Cada selector se muestra si en todo el equipo hay más de un valor, sin importar el otro filtro:
            // así no desaparece al elegir un cargo que solo existe en un centro.
            hayVariosCentros: new Set(lista.map(centroDe)).size > 1,
            hayVariosCargos: new Set(lista.map(cargoDe)).size > 1,
            centros: conConteo(delCargo, centroDe, centro),
            cargos: conConteo(delCentro, cargoDe, cargo),
            // Totales para "Todos los …": con el otro filtro aplicado.
            totalCentros: delCargo.length,
            totalCargos: delCentro.length,
            filtrados: centro ? delCargo.filter((e) => centroDe(e) === centro) : delCargo
        };
    }, [lista, centro, cargo]);
}
