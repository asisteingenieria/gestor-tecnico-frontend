import { useCallback, useEffect, useState } from 'react';

// Reloj del monitor en vivo (asistencia.md §70): a partir de los segundos que mandó el servidor en la última
// carga (`cargadoEn`, ms), sigue contando segundo a segundo. Cada función recibe la fila { emp, est } con el
// estado de estadoMonitor (utils/monitorAsistencia.js).
export function useTiemposEnVivo(cargadoEn) {
    const [ahora, setAhora] = useState(Date.now());

    useEffect(() => {
        const id = setInterval(() => setAhora(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const transcurrido = cargadoEn ? Math.max(0, (ahora - cargadoEn) / 1000) : 0;

    // Tiempo total desde el primer login: no se detiene en las pausas, sí en la salida.
    const totalDe = useCallback(
        ({ emp }) => (emp.segundos_en_jornada != null ? emp.segundos_en_jornada + (emp.jornada_corre ? transcurrido : 0) : null),
        [transcurrido]
    );
    // Cuánto lleva en el estado actual (desde que entró esta vez).
    const enEstadoDe = useCallback(
        ({ emp, est }) => (est.corre && emp.segundos_en_estado != null ? emp.segundos_en_estado + transcurrido : null),
        [transcurrido]
    );
    // Acumulado del día en un estado (columna de COLUMNAS_ESTADO); el del estado actual sigue contando.
    const acumuladoDe = useCallback(({ emp, est }, col) => {
        const base = emp.segundos_por_estado?.[col.id];
        if (base == null) return null;
        return base + (est.corre && col.claves.includes(est.clave) ? transcurrido : 0);
    }, [transcurrido]);

    return { totalDe, enEstadoDe, acumuladoDe };
}
