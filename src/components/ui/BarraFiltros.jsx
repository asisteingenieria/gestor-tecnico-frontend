import React from 'react';
import { Search } from 'lucide-react';
import { claseEstado } from './paletasEstado';

// Barra blanca de búsqueda y filtros (asistencia.md §70). Lo que va dentro lo decide cada vista:
// CampoBusqueda, selects (`className="ai-input ai-monitor-select"`), Leyenda, botones.
export const BarraFiltros = ({ children }) => <div className="ai-monitor-barra">{children}</div>;

export const CampoBusqueda = ({ value, onChange, placeholder = 'Buscar por nombre o cédula...', ariaLabel }) => (
    <div className="ai-input">
        <Search size={16} strokeWidth={1.75} className="ai-ic" />
        <input
            type="text"
            placeholder={placeholder}
            aria-label={ariaLabel || placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ border: 0, outline: 'none', flex: 1, background: 'transparent', color: 'var(--ink)', font: 'inherit' }}
        />
    </div>
);

// Leyenda de colores. Cada ítem trae `color` (clave de `.ai-st--*`, punto redondo) o `fondo` (un color o
// gradiente CSS, cuadrito, como las celdas del calendario). `enPanel` la pone sin el separador izquierdo,
// para el encabezado azul de un PanelVista.
export const Leyenda = ({ items, enPanel = false, ariaLabel = 'Colores por estado' }) => (
    <div className="ai-monitor-leyenda" aria-label={ariaLabel} style={enPanel ? { borderLeft: 0, paddingLeft: 0 } : undefined}>
        {items.map((it) => (
            <span key={it.id ?? it.label} className={it.color ? claseEstado(it.color) : undefined}>
                {it.color
                    ? <i className="ai-monitor-punto" aria-hidden="true" />
                    : <i aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: it.fondo, display: 'inline-block' }} />}
                {it.color ? ' ' : ''}{it.label}
            </span>
        ))}
    </div>
);

export default BarraFiltros;
