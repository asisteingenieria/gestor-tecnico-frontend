import React from 'react';
import { FileText, FileSignature, AlertTriangle, Eye, Loader2 } from 'lucide-react';
import { tamanoLegible } from '../../utils/soportesRrhh';
import PrevisualizacionDocumento from '../PrevisualizacionDocumento';
import usePrevisualizacion from '../../hooks/usePrevisualizacion';

const FIRMADOS = ['hoja_vida_firmada', 'tratamiento_datos_firmado'];
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '');

/**
 * Documentos de contratación que envió Hydra (migración 087): la hoja de vida y el
 * tratamiento de datos firmados y los soportes de antecedentes. Si a Contratación le
 * faltaba algún antecedente al enviar, se muestra cuáles y la nota que dejó.
 *
 * `info` es la respuesta del backend; `descargar(documentoId)` la llamada del servicio.
 * "Ver" abre el documento en un modal de previsualización (PDF o imagen).
 */
const DocumentosHydra = ({ info, descargar }) => {
    const { vista, abriendo, error, abrir, cerrar } = usePrevisualizacion();

    if (!info) return null;
    const documentos = info.documentos ?? [];

    if (!info.aplica && documentos.length === 0) {
        return <p className="ai-help" style={{ margin: 0 }}>Este candidato llegó de Hydra antes de que se enviaran los documentos de contratación.</p>;
    }

    const grupo = (titulo, Icono, lista) => lista.length > 0 && (
        <div className="ai-card" style={{ padding: 16 }}>
            <p className="ai-overline" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icono size={14} strokeWidth={1.75} /> {titulo}
            </p>
            <div className="ai-stack" style={{ gap: 8 }}>
                {lista.map(d => (
                    <div key={d.id} className="ai-row" style={{ justifyContent: 'space-between', gap: 12, fontSize: 13, flexWrap: 'nowrap' }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>{d.nombre}</div>
                            <div style={{ color: 'var(--ink-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {d.nombre_original} · {tamanoLegible(d.tamano_bytes)} · recibido {fecha(d.recibido_en)}
                            </div>
                        </div>
                        <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" style={{ flexShrink: 0 }} onClick={() => abrir(d.id, d, () => descargar(d.id))} disabled={abriendo === d.id}>
                            {abriendo === d.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Ver
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="ai-stack" style={{ gap: 12 }}>
            {error && <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px' }}>{error}</div>}

            {info.firmados_pendientes?.length > 0 && (
                <div style={{ border: '1px solid var(--danger)', background: 'var(--danger-soft)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 13, display: 'flex', gap: 8 }}>
                    <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <strong>Todavía no llega de Hydra:</strong> {info.firmados_pendientes.map(p => p.nombre.toLowerCase()).join(' y ')}.
                        Sin estos documentos no se puede registrar. Si no llegan en unos minutos, revisa los envíos en Hydra.
                    </div>
                </div>
            )}

            {info.antecedentes_faltantes?.length > 0 && (
                <div style={{ border: '1px solid var(--warning)', background: 'var(--warning-soft)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 13, display: 'flex', gap: 8 }}>
                    <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <strong>Antecedentes sin soporte al enviar:</strong> {info.antecedentes_faltantes.join(', ')}.
                        {info.nota_antecedentes && (
                            <div style={{ marginTop: 6 }}><strong>Nota de Contratación:</strong> {info.nota_antecedentes}</div>
                        )}
                    </div>
                </div>
            )}

            {grupo('Documentos firmados', FileSignature, documentos.filter(d => FIRMADOS.includes(d.tipo)))}
            {grupo('Soportes de antecedentes', FileText, documentos.filter(d => !FIRMADOS.includes(d.tipo)))}

            <PrevisualizacionDocumento vista={vista} onClose={cerrar} />
        </div>
    );
};

export default DocumentosHydra;
