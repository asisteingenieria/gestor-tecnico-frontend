import React from 'react';
import { Loader2 } from 'lucide-react';

// Panel con encabezado azul marino (asistencia.md §70): calendario, gráficas o cualquier bloque.
// `extra` va a la derecha del título (una Leyenda con `enPanel`, botones…).
const PanelVista = ({ icono: Icono, titulo, extra, children }) => (
    <div className="ai-monitor-panel">
        {(titulo || extra) && (
            <div className="ai-monitor-panel-head">
                {titulo && <h3>{Icono && <Icono size={18} strokeWidth={2} aria-hidden="true" />} {titulo}</h3>}
                {extra}
            </div>
        )}
        {children}
    </div>
);

// Cargando y vacío, con el mismo marco en todas las vistas.
export const CargandoVista = () => (
    <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
    </div>
);

export const VistaVacia = ({ icono: Icono, children, error = false }) => (
    <div className="ai-panel">
        <div className="ai-empty">
            {Icono && <Icono size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />}
            <p style={error ? { color: 'var(--danger)' } : undefined}>{children}</p>
        </div>
    </div>
);

export default PanelVista;
