import React from 'react';
import { claseEstado } from './paletasEstado';

// Fila de mosaicos de color con los totales (asistencia.md §70).
export const Mosaicos = ({ children }) => <div className="ai-monitor-mosaicos">{children}</div>;

// Un mosaico: número, ícono y etiqueta sobre el color del estado (`color` = clave de `.ai-st--*`, ver
// paletasEstado.js). Con `onClick` es un botón que filtra (`activo` lo marca); sin él es un KPI fijo.
// `detalle` es una línea chica debajo de la etiqueta (p. ej. el total sin filtros o el valor en dinero).
export const Mosaico = ({ color, icono: Icono, valor, label, detalle, activo = false, onClick, title }) => {
    const contenido = (
        <>
            {Icono && <Icono size={26} strokeWidth={2} className="ai-monitor-ic" aria-hidden="true" />}
            <span className="ai-monitor-num">{valor}</span>
            <span className="ai-monitor-lbl">{label}</span>
            {detalle && <span className="ai-monitor-det">{detalle}</span>}
        </>
    );
    if (!onClick) {
        return <div className={`ai-monitor-mosaico ai-monitor-mosaico--estatico ${claseEstado(color)}`} title={title}>{contenido}</div>;
    }
    return (
        <button
            type="button"
            className={`ai-monitor-mosaico ${claseEstado(color)} ${activo ? 'is-active' : ''}`}
            onClick={onClick}
            aria-pressed={activo}
            title={title ?? (activo ? 'Quitar el filtro' : `Ver solo: ${String(label).toLowerCase()}`)}
        >
            {contenido}
        </button>
    );
};

export default Mosaicos;
