import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Folder, FolderOpen, FileText, Image as ImageIcon, Eye, Upload, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { userCompanyService } from '../services/api';
import { tamanoLegible } from '../utils/soportesRrhh';
import PrevisualizacionDocumento from './PrevisualizacionDocumento';
import usePrevisualizacion from '../hooks/usePrevisualizacion';

const MAX_MB = 50;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
// Tipos de novedad con el nombre de carpeta que usa Gestión Humana (el backend los normaliza igual).
const TIPOS_NOVEDAD = ['INC', 'LNR', 'LR', 'LM', 'VACACIONES', 'SUSPENSION', 'DIA DE LA FAMILIA', 'OTRO SI', 'TELETRABAJO'];
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium' }) : '');

/**
 * Expediente documental del empleado (migración 097): las carpetas 1.SELECCION … 6.NOVEDADES, igual que
 * en la carpeta compartida de Gestión Humana. Cada carpeta se abre para ver sus archivos (en NOVEDADES,
 * agrupados por tipo: INC, LNR…). RRHH puede subir y eliminar; en `soloLectura` solo se ven.
 * `onCambio()` avisa después de subir o eliminar (la ficha recalcula qué documentos faltan).
 */
const ExpedienteEmpleado = ({ empleadoId, soloLectura = false, onCambio }) => {
    const { vista, abriendo, error: errorVista, abrir, cerrar } = usePrevisualizacion();
    const [expediente, setExpediente] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [abiertas, setAbiertas] = useState({});
    const [subiendo, setSubiendo] = useState(null); // { categoria, progreso }
    const [tipoNovedad, setTipoNovedad] = useState('INC');
    const [confirmarEliminar, setConfirmarEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(null);
    const inputs = useRef({});

    const cargar = useCallback(async () => {
        setCargando(true);
        setError('');
        try {
            const { data } = await userCompanyService.getExpediente(empleadoId);
            setExpediente(data.expediente);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo cargar el expediente');
        } finally {
            setCargando(false);
        }
    }, [empleadoId]);

    useEffect(() => { cargar(); }, [cargar]);

    const subir = async (categoria, archivo) => {
        setError('');
        if (!archivo) return;
        if (!/\.(pdf|jpe?g|png|webp)$/i.test(archivo.name)) { setError('Solo se aceptan PDF o imagen (JPG, PNG, WEBP)'); return; }
        if (archivo.size > MAX_MB * 1024 * 1024) { setError(`El archivo pesa ${tamanoLegible(archivo.size)}: el máximo es ${MAX_MB} MB`); return; }
        setSubiendo({ categoria, progreso: 0 });
        try {
            const { data } = await userCompanyService.subirArchivoExpediente(
                empleadoId, categoria, archivo, categoria === 'novedades' ? tipoNovedad : null,
                (e) => { if (e.total) setSubiendo({ categoria, progreso: Math.round((e.loaded / e.total) * 100) }); }
            );
            setExpediente(data.expediente);
            setAbiertas((a) => ({ ...a, [categoria]: true }));
            onCambio?.();
        } catch (err) {
            setError(err.response?.status === 413
                ? `El servidor rechazó el archivo por tamaño (máximo ${MAX_MB} MB)`
                : err.response?.data?.message || 'No se pudo cargar el archivo');
        } finally {
            setSubiendo(null);
        }
    };

    const eliminar = async (archivoId) => {
        setEliminando(archivoId);
        setError('');
        try {
            const { data } = await userCompanyService.eliminarArchivoExpediente(empleadoId, archivoId);
            setExpediente(data.expediente);
            onCambio?.();
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo eliminar el archivo');
        } finally {
            setEliminando(null);
            setConfirmarEliminar(null);
        }
    };

    const ver = (a) => abrir(a.id, { nombre: a.nombre, nombre_original: a.nombre, mime: a.mime, tamano_bytes: a.tamano },
        () => userCompanyService.descargarArchivoExpediente(empleadoId, a.id));

    if (cargando) {
        return <div className="ai-card" style={{ padding: 16, fontSize: 13 }}><Loader2 size={14} className="animate-spin" /> Cargando expediente…</div>;
    }

    const fila = (a) => (
        <div key={a.id} style={{ padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
            <div className="ai-row" style={{ gap: 6, minWidth: 0 }}>
                {a.mime?.startsWith('image/') ? <ImageIcon size={14} style={{ flexShrink: 0 }} /> : <FileText size={14} style={{ flexShrink: 0 }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }} title={a.nombre}>{a.nombre}</span>
                <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" disabled={abriendo === a.id} onClick={() => ver(a)}>
                    {abriendo === a.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Ver
                </button>
                {!soloLectura && (
                    <button type="button" className="ai-icon-btn ai-icon-btn--danger" aria-label={`Eliminar ${a.nombre}`} title="Eliminar"
                        disabled={eliminando === a.id} onClick={() => setConfirmarEliminar(a.id)}>
                        <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                )}
            </div>
            <div style={{ color: 'var(--ink-subtle)', fontSize: 12, paddingLeft: 20 }}>
                {tamanoLegible(a.tamano)} · {a.origen === 'migracion' ? 'carpeta compartida' : `subido ${fecha(a.created_at)}`}
            </div>
            {confirmarEliminar === a.id && (
                <div className="ai-row" style={{ marginTop: 6, justifyContent: 'flex-end', gap: 8 }}>
                    <span style={{ marginRight: 'auto' }}>¿Eliminar este archivo?</span>
                    <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => setConfirmarEliminar(null)} disabled={eliminando === a.id}>Cancelar</button>
                    <button type="button" className="ai-btn ai-btn--danger ai-btn--sm" onClick={() => eliminar(a.id)} disabled={eliminando === a.id}>
                        {eliminando === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Eliminar
                    </button>
                </div>
            )}
        </div>
    );

    // Archivos agrupados por subcarpeta (en NOVEDADES: INC, LNR…); los que van directo, primero.
    const porSubcarpeta = (archivos) => {
        const grupos = new Map();
        for (const a of archivos) grupos.set(a.subcarpeta || '', [...(grupos.get(a.subcarpeta || '') || []), a]);
        return [...grupos.entries()].sort(([x], [y]) => (x === '' ? -1 : y === '' ? 1 : x.localeCompare(y)));
    };

    return (
        <div className="ai-card" style={{ padding: 16 }}>
            <div className="ai-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <p className="ai-overline" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FolderOpen size={14} strokeWidth={1.75} /> Expediente
                </p>
                <span className="ai-badge"><span className="ai-dot" />{expediente?.total || 0} archivos</span>
            </div>
            {expediente?.carpeta && <p className="ai-help" style={{ marginTop: 0 }}>Carpeta {expediente.carpeta}</p>}

            {(error || errorVista) && (
                <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', marginBottom: 10, whiteSpace: 'normal' }}>{error || errorVista}</div>
            )}

            <div className="ai-stack" style={{ gap: 6 }}>
                {(expediente?.categorias || []).map((c) => {
                    const abierta = !!abiertas[c.clave];
                    const cargandoAqui = subiendo?.categoria === c.clave;
                    return (
                        <div key={c.clave} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
                            <button type="button" onClick={() => setAbiertas((a) => ({ ...a, [c.clave]: !abierta }))}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'inherit', textAlign: 'left' }}>
                                <ChevronRight size={14} style={{ transform: abierta ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                                {abierta ? <FolderOpen size={15} /> : <Folder size={15} />}
                                <span style={{ flex: 1 }}>{c.carpeta}</span>
                                <span style={{ color: 'var(--ink-subtle)', fontWeight: 400 }}>{c.archivos.length}</span>
                            </button>

                            {abierta && (
                                <div style={{ marginTop: 6 }}>
                                    {c.archivos.length === 0 && <p className="ai-help" style={{ margin: '4px 0' }}>Sin archivos.</p>}
                                    {porSubcarpeta(c.archivos).map(([sub, archivos]) => (
                                        <div key={sub || '_'} style={{ marginTop: sub ? 6 : 0 }}>
                                            {sub && <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}><Folder size={13} /> {sub} <span style={{ color: 'var(--ink-subtle)', fontWeight: 400 }}>{archivos.length}</span></div>}
                                            <div style={{ paddingLeft: sub ? 12 : 0 }}>{archivos.map(fila)}</div>
                                        </div>
                                    ))}

                                    {!soloLectura && c.clave !== 'otros' && (
                                        <div className="ai-row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                            {c.clave === 'novedades' && (
                                                <>
                                                    <input className="ai-input" list="tipos-novedad-expediente" value={tipoNovedad}
                                                        onChange={(e) => setTipoNovedad(e.target.value.toUpperCase())}
                                                        style={{ width: 170, height: 30, fontSize: 13 }} aria-label="Tipo de novedad" placeholder="Tipo (INC, LNR…)" />
                                                    <datalist id="tipos-novedad-expediente">{TIPOS_NOVEDAD.map(t => <option key={t} value={t} />)}</datalist>
                                                </>
                                            )}
                                            <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm"
                                                disabled={!!subiendo || (c.clave === 'novedades' && !tipoNovedad.trim())}
                                                onClick={() => inputs.current[c.clave]?.click()}>
                                                <Upload size={14} /> Subir a {c.carpeta}{c.clave === 'novedades' && tipoNovedad.trim() ? ` / ${tipoNovedad.trim()}` : ''}
                                            </button>
                                            <input ref={(el) => { inputs.current[c.clave] = el; }} type="file" accept={ACCEPT} style={{ display: 'none' }}
                                                onChange={(e) => { subir(c.clave, e.target.files?.[0]); e.target.value = ''; }} />
                                        </div>
                                    )}
                                    {cargandoAqui && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-200)', overflow: 'hidden' }}>
                                                <div style={{ width: `${subiendo.progreso}%`, height: '100%', background: 'var(--primary)', transition: 'width .2s' }} />
                                            </div>
                                            <div className="ai-help" style={{ marginTop: 4 }}>{subiendo.progreso < 100 ? `Subiendo… ${subiendo.progreso}%` : 'Guardando…'}</div>
                                        </div>
                                    )}
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

export default ExpedienteEmpleado;
