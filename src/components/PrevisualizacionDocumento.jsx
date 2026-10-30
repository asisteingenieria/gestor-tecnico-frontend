import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ExternalLink } from 'lucide-react';
import { tamanoLegible } from '../utils/soportesRrhh';

/**
 * Modal de previsualización: PDF embebido o imagen. Va en un portal sobre el panel lateral
 * (z-index 50) y Escape cierra solo el modal, no el panel que está debajo.
 */
const PrevisualizacionDocumento = ({ vista, onClose }) => {
    useEffect(() => {
        if (!vista) return undefined;
        const alEscape = (e) => {
            if (e.key !== 'Escape') return;
            e.stopImmediatePropagation();
            onClose();
        };
        window.addEventListener('keydown', alEscape, true);
        return () => window.removeEventListener('keydown', alEscape, true);
    }, [vista, onClose]);

    if (!vista) return null;
    const { documento, url } = vista;
    const esImagen = documento.mime?.startsWith('image/');

    return createPortal(
        <div
            className="ai-overlay ai-scope"
            style={{ zIndex: 60 }}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={documento.nombre}
        >
            <div
                className="ai-modal"
                style={{ maxWidth: 'min(960px, 100%)', height: 'min(90vh, 1100px)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ai-modal-head" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ minWidth: 0 }}>
                        <h3 className="ai-modal-title">{documento.nombre}</h3>
                        <p className="ai-modal-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {documento.nombre_original} · {tamanoLegible(documento.tamano_bytes)}
                        </p>
                    </div>
                    <div className="ai-row" style={{ marginLeft: 'auto', gap: 4, flexWrap: 'nowrap' }}>
                        <a className="ai-btn ai-btn--ghost ai-btn--sm" href={url} download={documento.nombre_original} title="Descargar">
                            <Download size={14} /> Descargar
                        </a>
                        <a className="ai-btn ai-btn--ghost ai-btn--sm" href={url} target="_blank" rel="noreferrer" title="Abrir en otra pestaña">
                            <ExternalLink size={14} />
                        </a>
                        <button type="button" className="ai-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                    </div>
                </div>
                <div style={{ flex: 1, minHeight: 0, background: 'var(--surface-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {esImagen ? (
                        <img src={url} alt={documento.nombre} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                        <iframe src={url} title={documento.nombre} style={{ width: '100%', height: '100%', border: 0, background: '#fff' }} />
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PrevisualizacionDocumento;
