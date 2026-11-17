import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { asistenciaService } from '../services/api';

// Alcance de las pantallas de "Equipo" (backend asistencia.md §68). Quien ve todas las campañas
// (Director de Tecnología) entra viendo su equipo y con el filtro cambia a "Todas las campañas" o a
// una. El alcance vive en la URL (?campania=todas | <id>) para que se conserve al pasar de Hoy a
// Histórico y al volver de la trazabilidad. Sin el parámetro, su equipo.
export const TODAS = 'todas';

export function useAlcanceEquipo() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [verTodas, setVerTodas] = useState(false);
    const [campanias, setCampanias] = useState([]);
    const alcance = searchParams.get('campania') || '';

    useEffect(() => {
        let vigente = true;
        asistenciaService.getPermisosEquipo()
            .then(({ data }) => {
                if (!vigente || !data.ver_todas_campanias) return null;
                setVerTodas(true);
                return asistenciaService.getCampaniasEquipo().then((r) => { if (vigente) setCampanias(r.data); });
            })
            .catch(() => {});
        return () => { vigente = false; };
    }, []);

    const cambiarAlcance = useCallback((valor) => {
        setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            if (valor) params.set('campania', valor); else params.delete('campania');
            return params;
        });
    }, [setSearchParams]);

    return { verTodas, campanias, alcance, cambiarAlcance };
}

// Parámetros de la API para un alcance. `permitirTodas` = false en el histórico, que va campaña por campaña.
export function paramsAlcance(alcance, permitirTodas = true) {
    if (alcance === TODAS) return permitirTodas ? { alcance: TODAS } : {};
    if (/^\d+$/.test(alcance || '')) return { campania_id: alcance };
    return {};
}

// "?campania=…" para los enlaces entre pantallas del equipo (vacío si es su equipo).
export function sufijoAlcance(alcance, separador = '?') {
    return alcance ? `${separador}campania=${encodeURIComponent(alcance)}` : '';
}
