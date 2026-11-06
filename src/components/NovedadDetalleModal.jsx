import React from 'react';
import { novedadRrhhService } from '../services/api';
import { SoportesResumen } from './SoportesDocumentales';
import { seccionesNovedad } from '../utils/camposNovedad';
import { nombrePropio } from '../utils/formatoRRHH';
import { ClipboardList, X } from 'lucide-react';

/** Detalle de solo lectura de una novedad: los datos que aplican a su tipo y sus documentos. */
const NovedadDetalleModal = ({ novedad, onClose }) => {
    if (!novedad) return null;
    const n = novedad;
    return (
        <div className="ai-overlay ai-scope" onClick={onClose}>
            <div className="ai-modal" style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <div className="ai-modal-icon"><ClipboardList size={20} /></div>
                    <div>
                        <h2 className="ai-modal-title">{n.tipo_novedad_nombre}</h2>
                        <p className="ai-modal-sub">{nombrePropio(n.empleado_nombre)} · {n.empleado_identificacion}</p>
                    </div>
                    <button onClick={onClose} className="ai-icon-btn" aria-label="Cerrar"><X size={18} /></button>
                </div>

                <div className="ai-modal-body">
                    <div className="ai-stack">
                        {seccionesNovedad(n).map(s => (
                            <div key={s.titulo}>
                                <p className="ai-overline" style={{ marginBottom: 8 }}>{s.titulo}</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
                                    {s.campos.map(c => (
                                        <div key={c.label} style={c.ancho ? { gridColumn: '1 / -1' } : undefined}>
                                            <p className="ai-muted" style={{ fontSize: 12, marginBottom: 2 }}>{c.label}</p>
                                            <p style={{ fontSize: 14, color: 'var(--ink)', margin: 0 }}>{c.value ?? '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div>
                            <p className="ai-overline" style={{ marginBottom: 8 }}>Documentos</p>
                            <SoportesResumen
                                cargar={() => novedadRrhhService.getSoportes(n.idnovedad_rrhh)}
                                descargar={(tipoSoporteId) => novedadRrhhService.descargarSoporte(n.idnovedad_rrhh, tipoSoporteId)}
                                descargarExpediente={(archivoId) => novedadRrhhService.descargarDocumentoExpediente(n.idnovedad_rrhh, archivoId)}
                                textoSinSoportes="Este tipo de novedad no requiere soportes."
                            />
                        </div>
                    </div>
                </div>

                <div className="ai-modal-foot">
                    <button type="button" onClick={onClose} className="ai-btn ai-btn--secondary">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default NovedadDetalleModal;
