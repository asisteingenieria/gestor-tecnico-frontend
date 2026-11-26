import React from 'react';
import { claseEstado } from './paletasEstado';

// Estado en pastilla (asistencia.md §70). `color` = clave de `.ai-st--*` (ver paletasEstado.js).
// - `punto`: con el punto de color delante (estado de la fila: "Conectado", "Aprobada"…).
// - sin `punto`: pastilla compacta para un valor (tiempos, conteos).
const Pastilla = ({ color, punto = false, minWidth, title, children }) => (
    <span
        className={`ai-monitor-pill${punto ? '' : ' ai-monitor-pill--acum'} ${claseEstado(color)}`}
        style={minWidth != null ? { minWidth } : undefined}
        title={title}
    >
        {punto && <><i className="ai-monitor-punto" aria-hidden="true" /> </>}
        {children}
    </span>
);

export default Pastilla;
