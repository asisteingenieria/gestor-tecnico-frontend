import React, { useRef, useState } from 'react';
import { FileText, Eye, Upload, RefreshCw, Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { userCompanyService } from '../services/api';
import { tamanoLegible } from '../utils/soportesRrhh';
import PrevisualizacionDocumento from './PrevisualizacionDocumento';
import usePrevisualizacion from '../hooks/usePrevisualizacion';

const MAX_MB = 50;
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '');

/**
 * Documentación del empleado y contrato y anexos (migración 088): dos PDF unificados que RRHH
 * carga después de registrar al empleado. Uno por tipo; subir otro lo reemplaza.
 *
 * `documentos` es la lista del backend (los dos tipos, con `cargado`); `onCambio(documentos)`
 * recibe la lista nueva después de subir o eliminar.
 */
const DocumentosEmpleado = ({ empleadoId, documentos, onCambio, soloLectura = false }) => {
    const { vista, abriendo, error: errorVista, abrir, cerrar } = usePrevisualizacion();
    const [subiendo, setSubiendo] = useState(null); // { tipo, progreso }
    const [confirmarEliminar, setConfirmarEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(null);
    const [error, setError] = useState('');
    const inputs = useRef({});

    if (!documentos) return null;
    // Está si se cargó el PDF o si su carpeta del expediente tiene archivos (`completo`, migración 097).
    const estaCompleto = (d) => d.completo ?? d.cargado;
    const faltantes = documentos.filter(d => !estaCompleto(d)).map(d => d.nombre);

    const subir = async (tipo, archivo) => {
        setError('');
        if (!archivo) return;
        if (archivo.type !== 'application/pdf' && !archivo.name.toLowerCase().endsWith('.pdf')) {
            setError('Solo se aceptan archivos PDF');
            return;
        }
        if (archivo.size > MAX_MB * 1024 * 1024) {
            setError(`El archivo pesa ${tamanoLegible(archivo.size)}: el máximo es ${MAX_MB} MB`);
            return;
        }
        setSubiendo({ tipo, progreso: 0 });
        try {
            const { data } = await userCompanyService.subirDocumento(empleadoId, tipo, archivo, (e) => {
                if (e.total) setSubiendo({ tipo, progreso: Math.round((e.loaded / e.total) * 100) });
            });
            onCambio(data.documentos);
        } catch (err) {
            setError(err.response?.status === 413
                ? `El servidor rechazó el archivo por tamaño (máximo ${MAX_MB} MB)`
                : err.response?.data?.message || 'No se pudo cargar el documento');
        } finally {
            setSubiendo(null);
        }
    };

    const eliminar = async (tipo) => {
        setEliminando(tipo);
        setError('');
        try {
            const { data } = await userCompanyService.eliminarDocumento(empleadoId, tipo);
            onCambio(data.documentos);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo eliminar el documento');
        } finally {
            setEliminando(null);
            setConfirmarEliminar(null);
        }
    };

    const elegirArchivo = (tipo) => inputs.current[tipo]?.click();

    return (
        <div className="ai-card" style={{ padding: 16 }}>
            <div className="ai-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <p className="ai-overline" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} strokeWidth={1.75} /> Documentos del empleado
                </p>
                {faltantes.length > 0 && (
                    <span className="ai-badge ai-badge--warning" style={{ height: 'auto', whiteSpace: 'normal' }}>
                        <span className="ai-dot" />{faltantes.length === 1 ? 'Falta' : 'Faltan'}: {faltantes.join(' y ')}
                    </span>
                )}
            </div>

            {(error || errorVista) && (
                <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', marginBottom: 10, whiteSpace: 'normal' }}>{error || errorVista}</div>
            )}

            <div className="ai-stack" style={{ gap: 10 }}>
                {documentos.map(d => {
                    const cargando = subiendo?.tipo === d.tipo;
                    const ocupado = cargando || eliminando === d.tipo;
                    return (
                        <div key={d.tipo} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                            {/* Nombre y archivo a todo el ancho; las acciones van debajo para no cortarlos. */}
                            <div style={{ fontSize: 13, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {estaCompleto(d)
                                        ? <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                        : <AlertTriangle size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
                                    {d.nombre}
                                </div>
                                {d.cargado ? (
                                    <>
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.nombre_original}>{d.nombre_original}</div>
                                        <div style={{ color: 'var(--ink-subtle)' }}>{tamanoLegible(d.tamano)} · cargado {fecha(d.cargado_en)}</div>
                                    </>
                                ) : d.en_expediente > 0 ? (
                                    <div style={{ color: 'var(--ink-subtle)' }}>
                                        En el expediente: {d.carpeta_expediente} ({d.en_expediente === 1 ? '1 archivo' : `${d.en_expediente} archivos`})
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--ink-subtle)' }}>Pendiente · PDF unificado de hasta {MAX_MB} MB, o súbelo a {d.carpeta_expediente || 'su carpeta'} del expediente</div>
                                )}
                            </div>
                            <div>
                                <div className="ai-row" style={{ gap: 4, marginTop: 8 }}>
                                    {d.cargado && (
                                        <button
                                            type="button"
                                            className="ai-btn ai-btn--ghost ai-btn--sm"
                                            disabled={ocupado || abriendo === d.tipo}
                                            onClick={() => abrir(d.tipo, { ...d, tamano_bytes: d.tamano }, () => userCompanyService.descargarDocumento(empleadoId, d.tipo))}
                                        >
                                            {abriendo === d.tipo ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Ver
                                        </button>
                                    )}
                                    {!soloLectura && (
                                        <button type="button" className={`ai-btn ai-btn--sm ${estaCompleto(d) ? 'ai-btn--ghost' : 'ai-btn--primary'}`} disabled={ocupado} onClick={() => elegirArchivo(d.tipo)}>
                                            {d.cargado ? <><RefreshCw size={14} /> Reemplazar</> : <><Upload size={14} /> Subir PDF</>}
                                        </button>
                                    )}
                                    {!soloLectura && d.cargado && (
                                        <button type="button" className="ai-icon-btn ai-icon-btn--danger" aria-label={`Eliminar ${d.nombre}`} title="Eliminar" disabled={ocupado} onClick={() => setConfirmarEliminar(d.tipo)}>
                                            <Trash2 size={15} strokeWidth={1.75} />
                                        </button>
                                    )}
                                    {!estaCompleto(d) && soloLectura && (
                                        <span className="ai-help" style={{ fontSize: 12 }}>Sin cargar</span>
                                    )}
                                    <input
                                        ref={(el) => { inputs.current[d.tipo] = el; }}
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        style={{ display: 'none' }}
                                        onChange={(e) => { subir(d.tipo, e.target.files?.[0]); e.target.value = ''; }}
                                    />
                                </div>
                            </div>

                            {cargando && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-200)', overflow: 'hidden' }}>
                                        <div style={{ width: `${subiendo.progreso}%`, height: '100%', background: 'var(--primary)', transition: 'width .2s' }} />
                                    </div>
                                    <div className="ai-help" style={{ marginTop: 4 }}>
                                        {subiendo.progreso < 100 ? `Subiendo… ${subiendo.progreso}%` : 'Guardando…'}
                                    </div>
                                </div>
                            )}

                            {confirmarEliminar === d.tipo && (
                                <div className="ai-row" style={{ marginTop: 8, justifyContent: 'flex-end', gap: 8, fontSize: 13 }}>
                                    <span style={{ marginRight: 'auto' }}>¿Eliminar este documento?</span>
                                    <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => setConfirmarEliminar(null)} disabled={eliminando === d.tipo}>Cancelar</button>
                                    <button type="button" className="ai-btn ai-btn--danger ai-btn--sm" onClick={() => eliminar(d.tipo)} disabled={eliminando === d.tipo}>
                                        {eliminando === d.tipo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <PrevisualizacionDocumento vista={vista} onClose={cerrar} />
        </div>
    );
};

export default DocumentosEmpleado;
