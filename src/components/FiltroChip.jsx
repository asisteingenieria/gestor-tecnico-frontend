import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Filter, ChevronDown } from 'lucide-react';

/** Chip de filtro con popover de checkboxes (Campaña / Estado / Cargo / Tipo de novedad…). */
const FiltroChip = ({ etiqueta, opciones, seleccion, onChange }) => {
    const [abierto, setAbierto] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);
    const menuRef = useRef(null);

    // El menú se saca a un portal en <body> porque .ai-card (el contenedor de la tabla)
    // tiene overflow oculto para recortar las esquinas redondeadas — con pocos resultados
    // filtrados la tarjeta se encoge y el menú (incluido el botón "Limpiar") quedaba
    // cortado en vez de flotar por encima de la tabla.
    useEffect(() => {
        const cerrarFuera = (e) => {
            if (btnRef.current?.contains(e.target)) return;
            if (menuRef.current?.contains(e.target)) return;
            setAbierto(false);
        };
        // capture:true porque la página no tiene un único contenedor con scroll — pero
        // eso también dispara el scroll interno del propio menú (overflowY: auto), así
        // que hay que ignorar los eventos que se originan dentro de él.
        const cerrarAlScrollear = (e) => {
            if (menuRef.current?.contains(e.target)) return;
            setAbierto(false);
        };
        document.addEventListener('mousedown', cerrarFuera);
        window.addEventListener('scroll', cerrarAlScrollear, true);
        window.addEventListener('resize', cerrarAlScrollear);
        return () => {
            document.removeEventListener('mousedown', cerrarFuera);
            window.removeEventListener('scroll', cerrarAlScrollear, true);
            window.removeEventListener('resize', cerrarAlScrollear);
        };
    }, []);

    const activo = seleccion.size > 0;
    const resumen = activo
        ? `${etiqueta}: ${seleccion.size === 1 ? [...seleccion][0] : `${seleccion.size} seleccionadas`}`
        : `${etiqueta}: Todas`;

    const toggle = (valor) => {
        const next = new Set(seleccion);
        if (next.has(valor)) next.delete(valor); else next.add(valor);
        onChange(next);
    };

    const abrir = () => {
        if (!abierto && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setCoords({ top: r.bottom + 6, left: r.left });
        }
        setAbierto(o => !o);
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                ref={btnRef}
                type="button"
                className={`ai-filter${activo ? ' is-on' : ''}`}
                onClick={abrir}
            >
                <Filter size={14} strokeWidth={1.75} />
                {resumen}
                <ChevronDown size={14} strokeWidth={1.75} />
            </button>
            {abierto && createPortal(
                <div
                    ref={menuRef}
                    role="menu"
                    style={{
                        position: 'fixed', top: coords.top, left: coords.left, minWidth: 200, zIndex: 1000,
                        background: 'var(--surface-100)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)', padding: 8,
                        maxHeight: '60vh', overflowY: 'auto'
                    }}
                >
                    {opciones.length === 0 && (
                        <p className="ai-muted" style={{ fontSize: 13, padding: '4px 6px' }}>Sin opciones</p>
                    )}
                    {opciones.map((op) => (
                        <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', fontSize: 13, color: 'var(--ink)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={seleccion.has(op)} onChange={() => toggle(op)} />
                            {op}
                        </label>
                    ))}
                    {activo && (
                        <button
                            type="button"
                            className="ai-btn ai-btn--ghost ai-btn--sm"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                            onClick={() => onChange(new Set())}
                        >
                            Limpiar
                        </button>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default FiltroChip;
