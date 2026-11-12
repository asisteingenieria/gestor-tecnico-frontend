import React, { useRef, useState } from 'react';
import { redMaestraService } from '../../services/api';
import { FileSpreadsheet, Upload, X, Loader2, AlertTriangle, CheckCircle, File } from 'lucide-react';

/**
 * Cargue de la Red Maestra con la plantilla en Excel (PLANTILLA RM EJEMPLO o la descarga de esta pantalla).
 * La llave es la CÉDULA; DOCUMENTO, NOMBRE y CAMPAÑA se toman del Gestor. Una celda vacía no borra lo
 * que ya hay. Primero se ve la vista previa y nada se guarda hasta confirmar.
 */

const PASO = { SELECCION: 'seleccion', PREVIEW: 'preview', LISTO: 'listo' };

const CargueRedMaestraModal = ({ onClose, onCargado }) => {
    const inputRef = useRef(null);
    const [paso, setPaso] = useState(PASO.SELECCION);
    const [archivo, setArchivo] = useState(null);
    const [preview, setPreview] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [verTodas, setVerTodas] = useState(false);

    const formData = (f) => {
        const fd = new FormData();
        fd.append('archivo', f);
        return fd;
    };

    const procesar = async (f) => {
        if (!f) return;
        if (!/\.(xlsx|xls)$/i.test(f.name)) {
            setError('El archivo debe ser Excel (.xlsx o .xls)');
            return;
        }
        try {
            setCargando(true);
            setError('');
            setArchivo(f);
            const { data } = await redMaestraService.previewCargue(formData(f));
            setPreview(data.data);
            setPaso(PASO.PREVIEW);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo leer el archivo');
        } finally {
            setCargando(false);
        }
    };

    const confirmar = async () => {
        try {
            setCargando(true);
            setError('');
            const { data } = await redMaestraService.confirmarCargue(formData(archivo));
            setResultado(data.data);
            setPaso(PASO.LISTO);
            onCargado?.();
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo cargar el archivo');
        } finally {
            setCargando(false);
        }
    };

    const reiniciar = () => {
        setPaso(PASO.SELECCION);
        setArchivo(null);
        setPreview(null);
        setError('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const conNovedad = preview ? preview.filas.filter((f) => f.errores.length || f.advertencias.length) : [];
    const filasTabla = verTodas ? (preview?.filas || []) : conNovedad;

    return (
        <div className="ai-overlay ai-scope" onClick={cargando ? undefined : onClose}>
            <div className="ai-modal" style={{ width: 'min(760px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><FileSpreadsheet size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h2 className="ai-modal-title">Cargar Red Maestra desde Excel</h2>
                        <p className="ai-modal-sub">Columnas de la plantilla RM; se cruza por CÉDULA con el personal registrado</p>
                    </div>
                    <button className="ai-icon-btn" onClick={onClose} aria-label="Cerrar" disabled={cargando}><X size={18} strokeWidth={1.75} /></button>
                </div>

                <div className="ai-modal-body">
                    {error && (
                        <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', width: '100%', marginBottom: 16, whiteSpace: 'normal' }}>
                            <AlertTriangle size={14} strokeWidth={1.75} /> {error}
                        </div>
                    )}

                    {paso === PASO.SELECCION && (
                        <div className="ai-stack">
                            <div
                                className="ai-drop"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); procesar(e.dataTransfer.files?.[0]); }}
                            >
                                <span className="ai-modal-icon">
                                    {cargando ? <Loader2 size={22} strokeWidth={1.75} className="animate-spin" /> : <Upload size={22} strokeWidth={1.75} />}
                                </span>
                                <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)' }}>
                                    {cargando ? 'Leyendo archivo…' : (
                                        <>Arrastra tu archivo aquí o <button type="button" onClick={() => inputRef.current?.click()} style={{ background: 'none', border: 0, padding: 0, color: 'var(--primary)', font: 'inherit', cursor: 'pointer' }}>selecciónalo</button></>
                                    )}
                                </p>
                                <p className="ai-help">.xlsx · máximo 15 MB</p>
                                <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => procesar(e.target.files?.[0])} />
                            </div>
                            <ul className="ai-help" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                                <li>Se leen las columnas por nombre: CEDULA (obligatoria), NOVEDADES, CARGO RM, ESTADO RM, REQUERIMIENTO, FECHA DE ENVIO, OBSERVACIÓN y ESTADO REQUERIMIENTO.</li>
                                <li>DOCUMENTO, NOMBRE COMPLETO, CAMPAÑA, USUARIO SSFF y ESTADO AGENTE (activo o retirado) se toman del personal registrado en RRHH, no del archivo.</li>
                                <li>Una celda vacía no borra lo que ya está guardado. Un requerimiento que ya existe se actualiza, no se duplica.</li>
                                <li>Los valores que no estén en las listas se agregan a ellas (por ejemplo, un cargo RM nuevo).</li>
                            </ul>
                        </div>
                    )}

                    {paso === PASO.PREVIEW && preview && (
                        <div className="ai-stack">
                            <div className="ai-file">
                                <span className="ai-modal-icon" style={{ width: 36, height: 36 }}><File size={16} strokeWidth={1.75} /></span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{archivo?.name}</p>
                                    <p className="ai-help" style={{ margin: 0 }}>Hoja "{preview.hoja}" · {preview.total_filas} filas</p>
                                </div>
                            </div>

                            <div className="ai-kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                <div><div><p className="ai-kpi-label">Se cargan</p><p className="ai-kpi-value ai-num" style={{ color: 'var(--success)' }}>{preview.a_cargar}</p></div></div>
                                <div><div><p className="ai-kpi-label">Con requerimiento</p><p className="ai-kpi-value ai-num">{preview.con_requerimiento}</p></div></div>
                                <div><div><p className="ai-kpi-label">Con error (se omiten)</p><p className="ai-kpi-value ai-num" style={{ color: preview.con_errores ? 'var(--danger)' : undefined }}>{preview.con_errores}</p></div></div>
                            </div>

                            {preview.opciones_nuevas.length > 0 && (
                                <div className="ai-badge ai-badge--info" style={{ height: 'auto', padding: '10px 14px', whiteSpace: 'normal', display: 'block' }}>
                                    Se agregarán a las listas: {preview.opciones_nuevas.map((o) => `${o.etiqueta}: ${o.valor}`).join(' · ')}
                                </div>
                            )}

                            <div className="ai-row" style={{ justifyContent: 'space-between' }}>
                                <p className="ai-overline" style={{ margin: 0 }}>
                                    {verTodas ? 'Todas las filas' : `Filas con errores o avisos (${conNovedad.length})`}
                                </p>
                                <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => setVerTodas(!verTodas)}>
                                    {verTodas ? 'Ver solo errores y avisos' : 'Ver todas'}
                                </button>
                            </div>

                            {filasTabla.length === 0 ? (
                                <p className="ai-muted" style={{ margin: 0, fontSize: 13 }}>
                                    <CheckCircle size={14} style={{ verticalAlign: -2, color: 'var(--success)' }} /> Todas las filas están bien.
                                </p>
                            ) : (
                                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                                    <table className="ai-table ai-table--dense">
                                        <thead><tr><th>Fila</th><th>Cédula</th><th>Nombre</th><th>Detalle</th></tr></thead>
                                        <tbody>
                                            {filasTabla.map((f) => (
                                                <tr key={f.fila}>
                                                    <td className="ai-num">{f.fila}</td>
                                                    <td className="ai-num">{f.cedula || '—'}</td>
                                                    <td>{f.nombre || '—'}</td>
                                                    <td style={{ fontSize: 12 }}>
                                                        {f.errores.map((m) => <div key={m} style={{ color: 'var(--danger)' }}>✖ {m}</div>)}
                                                        {f.advertencias.map((m) => <div key={m} style={{ color: 'var(--warning)' }}>⚠ {m}</div>)}
                                                        {!f.errores.length && !f.advertencias.length && <span className="ai-muted">OK</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {paso === PASO.LISTO && resultado && (
                        <div className="ai-stack" style={{ textAlign: 'center', padding: '12px 0' }}>
                            <CheckCircle size={40} strokeWidth={1.5} style={{ color: 'var(--success)', margin: '0 auto' }} />
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)' }}>Red Maestra cargada</p>
                            <p className="ai-help" style={{ margin: 0 }}>
                                {resultado.fichas} fichas · {resultado.requerimientos} requerimientos
                                {resultado.opciones_creadas > 0 && ` · ${resultado.opciones_creadas} valores nuevos en las listas`}
                                {resultado.omitidas > 0 && ` · ${resultado.omitidas} filas omitidas por error`}
                            </p>
                        </div>
                    )}
                </div>

                <div className="ai-modal-foot">
                    {paso === PASO.SELECCION && (
                        <button type="button" className="ai-btn ai-btn--secondary" onClick={onClose} style={{ marginLeft: 'auto' }}>Cancelar</button>
                    )}
                    {paso === PASO.PREVIEW && (
                        <>
                            <button type="button" className="ai-btn ai-btn--secondary" onClick={reiniciar} disabled={cargando}>Elegir otro archivo</button>
                            <button type="button" className="ai-btn ai-btn--primary" onClick={confirmar} disabled={cargando || !preview?.a_cargar} style={{ marginLeft: 'auto' }}>
                                {cargando ? 'Cargando…' : `Cargar ${preview?.a_cargar || 0} filas`}
                            </button>
                        </>
                    )}
                    {paso === PASO.LISTO && (
                        <button type="button" className="ai-btn ai-btn--primary" onClick={onClose} style={{ marginLeft: 'auto' }}>Cerrar</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CargueRedMaestraModal;
