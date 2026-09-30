import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

function normalizar(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const LIMITE_RESULTADOS = 50;

/**
 * Select con buscador (escribe y filtra) para catálogos grandes donde un <select> plano
 * es inmanejable — ej. las ~1.030 ciudades de DIVIPOLA en AgentForm.jsx. El menú se saca
 * a un portal en <body> por el mismo motivo que FiltroChip en AgentManagement.jsx: el
 * modal del formulario tiene overflow con scroll propio y recortaría el desplegable.
 */
const ComboboxBuscable = ({ label, opciones, value, onChange, placeholder = 'Escribe para buscar…', required = false }) => {
    const [query, setQuery] = useState('');
    const [abierto, setAbierto] = useState(false);
    const [resaltado, setResaltado] = useState(0);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef(null);
    const menuRef = useRef(null);

    const seleccionado = opciones.find(o => String(o.id) === String(value));

    useEffect(() => {
        const cerrarFuera = (e) => {
            if (inputRef.current?.contains(e.target)) return;
            if (menuRef.current?.contains(e.target)) return;
            setAbierto(false);
        };
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

    const abrir = () => {
        if (inputRef.current) {
            const r = inputRef.current.getBoundingClientRect();
            setCoords({ top: r.bottom + 6, left: r.left, width: r.width });
        }
        setResaltado(0);
        setAbierto(true);
    };

    const filtradas = (query ? opciones.filter(o => normalizar(o.nombre).includes(normalizar(query))) : opciones)
        .slice(0, LIMITE_RESULTADOS);

    const elegir = (opcion) => {
        onChange(opcion.id);
        setQuery('');
        setAbierto(false);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape') { setAbierto(false); return; }
        if (!abierto) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setResaltado(i => Math.min(i + 1, filtradas.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setResaltado(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (filtradas[resaltado]) elegir(filtradas[resaltado]); }
    };

    return (
        <div className="ai-field">
            {label && <label className="ai-label">{label}{required && <em>*</em>}</label>}
            <div style={{ position: 'relative' }}>
                <input
                    ref={inputRef}
                    type="text"
                    className="ai-input"
                    value={abierto ? query : (seleccionado?.nombre || '')}
                    placeholder={seleccionado && !abierto ? seleccionado.nombre : placeholder}
                    onFocus={abrir}
                    onChange={(e) => { setQuery(e.target.value); setResaltado(0); if (!abierto) abrir(); }}
                    onKeyDown={onKeyDown}
                    autoComplete="off"
                    required={required}
                />
                {seleccionado && !abierto && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        aria-label="Quitar selección"
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-subtle)', display: 'flex' }}
                    >
                        <X size={14} strokeWidth={1.75} />
                    </button>
                )}
            </div>
            {abierto && createPortal(
                <div
                    ref={menuRef}
                    role="listbox"
                    style={{
                        position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 1000,
                        background: 'var(--surface-100)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)', padding: 4,
                        maxHeight: '40vh', overflowY: 'auto'
                    }}
                >
                    {filtradas.length === 0 ? (
                        <p className="ai-muted" style={{ fontSize: 13, padding: '8px 10px', margin: 0 }}>Sin resultados</p>
                    ) : (
                        filtradas.map((o, i) => (
                            <div
                                key={o.id}
                                role="option"
                                aria-selected={i === resaltado}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => elegir(o)}
                                onMouseEnter={() => setResaltado(i)}
                                style={{
                                    padding: '8px 10px', fontSize: 14, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                    color: 'var(--ink)', background: i === resaltado ? 'var(--surface-200)' : 'transparent'
                                }}
                            >
                                {o.nombre}
                            </div>
                        ))
                    )}
                    {!query && opciones.length > LIMITE_RESULTADOS && (
                        <p className="ai-muted" style={{ fontSize: 12, padding: '6px 10px 2px', margin: 0 }}>
                            Mostrando {LIMITE_RESULTADOS} de {opciones.length} ciudades — escribe para filtrar
                        </p>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default ComboboxBuscable;
