import React, { useEffect, useState } from 'react';
import { redMaestraService } from '../../services/api';
import { formatearFecha } from '../../utils/fecha';
import { hoyBogota } from './redMaestraUtils';
import { X, Save, Plus, Edit3, Trash2, Loader2 } from 'lucide-react';

/**
 * Panel de la Red Maestra de un agente: datos del Gestor (solo lectura), su ficha RM (editable)
 * y el historial de requerimientos enviados a Claro.
 */

const REQ_VACIO = { numero: '', fecha_envio: '', observacion_id: '', estado_requerimiento_id: '' };

// Opciones activas de una lista, más la que ya tiene el registro aunque la hayan desactivado.
const opcionesDe = (opciones, campo, actualId) =>
    opciones.filter((o) => o.campo === campo && (o.activo || o.id === Number(actualId)));

const fichaDe = (e) => ({
    novedades: e.novedades || '',
    cargo_rm_id: e.cargo_rm_id || '',
    estado_rm_id: e.estado_rm_id || ''
});

const SelectOpcion = ({ etiqueta, campo, valor, opciones, onChange }) => (
    <div className="ai-field">
        <label className="ai-label">{etiqueta}</label>
        <select className="ai-input" value={valor} onChange={(e) => onChange(e.target.value)}>
            <option value="">— Sin dato —</option>
            {opcionesDe(opciones, campo, valor).map((o) => (
                <option key={o.id} value={o.id}>{o.valor}{o.activo ? '' : ' (desactivada)'}</option>
            ))}
        </select>
    </div>
);

const Dato = ({ etiqueta, valor }) => (
    <div>
        <p className="ai-overline" style={{ margin: 0 }}>{etiqueta}</p>
        <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--ink)' }}>{valor || <span className="ai-muted">—</span>}</p>
    </div>
);

const RedMaestraDrawer = ({ empleadoId, opciones, onClose, onGuardado }) => {
    const [empleado, setEmpleado] = useState(null);
    const [ficha, setFicha] = useState(fichaDe({}));
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');

    const [reqForm, setReqForm] = useState(null); // null | { id?, ...REQ_VACIO }
    const [guardandoReq, setGuardandoReq] = useState(false);
    const [aEliminar, setAEliminar] = useState(null);

    const [fechaRm, setFechaRm] = useState('');
    const [guardandoRm, setGuardandoRm] = useState(false);

    const aplicar = (data) => {
        setEmpleado(data);
        setFicha(fichaDe(data));
        setFechaRm(data.fecha_retiro_rm || '');
    };

    const guardarRetiroRm = async () => {
        try {
            setGuardandoRm(true);
            setError('');
            const { data } = await redMaestraService.guardarRetiroRm(empleadoId, fechaRm);
            setEmpleado(data.data);
            setFechaRm(data.data.fecha_retiro_rm || '');
            setAviso('Fecha de retiro en Red Maestra guardada');
            onGuardado?.();
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo guardar la fecha de retiro');
        } finally {
            setGuardandoRm(false);
        }
    };

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        redMaestraService.getEmpleado(empleadoId)
            .then(({ data }) => { if (vigente) aplicar(data.data); })
            .catch((err) => { if (vigente) setError(err.response?.data?.message || 'No se pudo cargar el agente'); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [empleadoId]);

    useEffect(() => {
        const alTeclado = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', alTeclado);
        return () => window.removeEventListener('keydown', alTeclado);
    }, [onClose]);

    const cambiado = empleado && JSON.stringify(ficha) !== JSON.stringify(fichaDe(empleado));

    const guardarFicha = async () => {
        try {
            setGuardando(true);
            setError('');
            const { data } = await redMaestraService.guardarFicha(empleadoId, ficha);
            aplicar(data.data);
            setAviso('Red Maestra guardada');
            onGuardado?.();
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    const guardarReq = async (e) => {
        e.preventDefault();
        try {
            setGuardandoReq(true);
            setError('');
            const { id, ...datos } = reqForm;
            const { data } = id
                ? await redMaestraService.actualizarRequerimiento(id, datos)
                : await redMaestraService.crearRequerimiento(empleadoId, datos);
            // Conserva lo que el admin tenga sin guardar en la ficha.
            setEmpleado(data.data);
            setReqForm(null);
            setAviso(id ? 'Requerimiento actualizado' : 'Requerimiento agregado');
            onGuardado?.();
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo guardar el requerimiento');
        } finally {
            setGuardandoReq(false);
        }
    };

    const eliminarReq = async (id) => {
        try {
            setError('');
            const { data } = await redMaestraService.eliminarRequerimiento(id);
            setEmpleado(data.data);
            setAEliminar(null);
            setAviso('Requerimiento eliminado');
            onGuardado?.();
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo eliminar el requerimiento');
        }
    };

    useEffect(() => {
        if (!aviso) return undefined;
        const t = setTimeout(() => setAviso(''), 2500);
        return () => clearTimeout(t);
    }, [aviso]);

    const editarReq = (q) => setReqForm({
        id: q.id,
        numero: q.numero,
        fecha_envio: q.fecha_envio || '',
        observacion_id: q.observacion_id || '',
        estado_requerimiento_id: q.estado_requerimiento_id || ''
    });

    return (
        <div className="ai-overlay ai-scope" style={{ position: 'fixed', inset: 0, zIndex: 50, justifyContent: 'flex-end', padding: 0 }} onClick={onClose}>
            <div className="ai-drawer" style={{ width: 'min(560px, 100vw)' }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-drawer-hero">
                    <button className="ai-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                    <h2 style={{ font: '600 18px var(--font-display)', color: '#fff', margin: '12px 0 2px' }}>
                        {empleado ? empleado.nombre : 'Cargando…'}
                    </h2>
                    {empleado && (
                        <p style={{ margin: 0, color: 'rgba(255,255,255,.85)', fontSize: 14 }}>
                            {empleado.tipo_documento === 'CC' ? 'CEDULA' : empleado.tipo_documento} {empleado.cedula}
                        </p>
                    )}
                </div>

                <div style={{ padding: 20, overflowY: 'auto', flex: 1 }} className="ai-stack">
                    {error && <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', whiteSpace: 'normal' }}>{error}</div>}
                    {aviso && <div className="ai-badge ai-badge--success" style={{ height: 'auto', padding: '8px 14px' }}>{aviso}</div>}

                    {cargando ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" /></div>
                    ) : empleado && (
                        <>
                            <section className="ai-panel">
                                <div className="ai-panel-head"><h3 className="ai-panel-title">Del personal registrado</h3></div>
                                <div className="ai-panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                                    <Dato etiqueta="Campaña" valor={empleado.campania} />
                                    <Dato etiqueta="Centro de costo" valor={empleado.centro_costo} />
                                    <Dato etiqueta="Usuario SSFF" valor={empleado.usuario_ssff} />
                                    <Dato etiqueta="Cargo" valor={empleado.cargo} />
                                    <Dato etiqueta="Cliente" valor={empleado.cliente} />
                                    <Dato etiqueta="Estado agente (RRHH)" valor={empleado.estado_agente && `${empleado.estado_agente} · ${empleado.estado_contrato}`} />
                                </div>
                            </section>

                            {empleado.fecha_retiro && (
                                <section className="ai-panel" style={{ borderColor: empleado.fecha_retiro_rm ? undefined : 'var(--warning)' }}>
                                    <div className="ai-panel-head"><h3 className="ai-panel-title">Retiro</h3></div>
                                    <div className="ai-panel-body ai-stack">
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                                            <Dato etiqueta="Retiro en RRHH" valor={formatearFecha(empleado.fecha_retiro)} />
                                            <Dato etiqueta="Tipo de retiro" valor={empleado.tipo_retiro} />
                                        </div>
                                        <div className="ai-row" style={{ gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                            <div className="ai-field" style={{ flex: '0 0 180px' }}>
                                                <label className="ai-label">Retiro Red Maestra</label>
                                                <input type="date" className="ai-input" value={fechaRm} min={empleado.fecha_ingreso || undefined} max={hoyBogota()}
                                                    onChange={(e) => setFechaRm(e.target.value)} />
                                            </div>
                                            <button className="ai-btn ai-btn--secondary ai-btn--sm" onClick={guardarRetiroRm}
                                                disabled={guardandoRm || fechaRm === (empleado.fecha_retiro_rm || '')}>
                                                {guardandoRm ? 'Guardando…' : 'Guardar fecha'}
                                            </button>
                                        </div>
                                        <span className="ai-help">
                                            {empleado.fecha_retiro_rm
                                                ? `Registrado${empleado.retiro_rm_registrado_por ? ` por ${empleado.retiro_rm_registrado_por}` : ''}`
                                                : 'Pendiente: el jefe del agente lo registra desde su portal (Equipo → Retiros) o tú aquí.'}
                                        </span>
                                    </div>
                                </section>
                            )}

                            <section className="ai-panel">
                                <div className="ai-panel-head"><h3 className="ai-panel-title">Red Maestra</h3></div>
                                <div className="ai-panel-body ai-stack">
                                    <div className="ai-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                                        <SelectOpcion etiqueta="Cargo RM" campo="cargo_rm" valor={ficha.cargo_rm_id} opciones={opciones} onChange={(v) => setFicha({ ...ficha, cargo_rm_id: v })} />
                                        <SelectOpcion etiqueta="Estado RM" campo="estado_rm" valor={ficha.estado_rm_id} opciones={opciones} onChange={(v) => setFicha({ ...ficha, estado_rm_id: v })} />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Novedades</label>
                                        <textarea
                                            className="ai-input"
                                            rows={3}
                                            maxLength={2000}
                                            value={ficha.novedades}
                                            onChange={(e) => setFicha({ ...ficha, novedades: e.target.value })}
                                            placeholder="Ej.: ASESOR ACTIVO EN OTRO ALIADO"
                                            style={{ height: 'auto', resize: 'vertical', paddingTop: 8 }}
                                        />
                                    </div>
                                    <div className="ai-row" style={{ justifyContent: 'space-between' }}>
                                        <span className="ai-help">
                                            {empleado.rm_actualizado
                                                ? `Actualizado ${formatearFecha(empleado.rm_actualizado)}${empleado.rm_actualizado_por ? ` por ${empleado.rm_actualizado_por}` : ''}`
                                                : 'Sin datos de Red Maestra todavía'}
                                        </span>
                                        <button className="ai-btn ai-btn--primary ai-btn--sm" onClick={guardarFicha} disabled={!cambiado || guardando}>
                                            <Save size={14} strokeWidth={1.75} /> {guardando ? 'Guardando…' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section className="ai-panel">
                                <div className="ai-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 className="ai-panel-title">Requerimientos ({empleado.requerimientos.length})</h3>
                                    {!reqForm && (
                                        <button className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => setReqForm({ ...REQ_VACIO })}>
                                            <Plus size={14} strokeWidth={1.75} /> Agregar
                                        </button>
                                    )}
                                </div>
                                <div className="ai-panel-body ai-stack">
                                    {reqForm && (
                                        <form onSubmit={guardarReq} className="ai-stack" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 10 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                                                <div className="ai-field">
                                                    <label className="ai-label">Requerimiento <em>*</em></label>
                                                    <input className="ai-input" value={reqForm.numero} maxLength={40} required placeholder="REQ000008079444"
                                                        onChange={(e) => setReqForm({ ...reqForm, numero: e.target.value })} />
                                                </div>
                                                <div className="ai-field">
                                                    <label className="ai-label">Fecha de envío</label>
                                                    <input type="date" className="ai-input" value={reqForm.fecha_envio}
                                                        onChange={(e) => setReqForm({ ...reqForm, fecha_envio: e.target.value })} />
                                                </div>
                                                <SelectOpcion etiqueta="Observación" campo="observacion" valor={reqForm.observacion_id} opciones={opciones}
                                                    onChange={(v) => setReqForm({ ...reqForm, observacion_id: v })} />
                                                <SelectOpcion etiqueta="Estado requerimiento" campo="estado_requerimiento" valor={reqForm.estado_requerimiento_id} opciones={opciones}
                                                    onChange={(v) => setReqForm({ ...reqForm, estado_requerimiento_id: v })} />
                                            </div>
                                            <div className="ai-row" style={{ justifyContent: 'flex-end' }}>
                                                <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => setReqForm(null)}>Cancelar</button>
                                                <button type="submit" className="ai-btn ai-btn--primary ai-btn--sm" disabled={guardandoReq}>
                                                    {guardandoReq ? 'Guardando…' : (reqForm.id ? 'Guardar cambios' : 'Agregar requerimiento')}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {empleado.requerimientos.length === 0 && !reqForm && (
                                        <p className="ai-muted" style={{ margin: 0, fontSize: 13 }}>Sin requerimientos registrados.</p>
                                    )}

                                    {empleado.requerimientos.map((q) => (
                                        <div key={q.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="ai-num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{q.numero}</div>
                                                <div className="ai-person-sub">
                                                    {[formatearFecha(q.fecha_envio) || 'Sin fecha', q.observacion, q.creado_por && `registró ${q.creado_por}`].filter(Boolean).join(' · ')}
                                                </div>
                                            </div>
                                            {q.estado_requerimiento && <span className="ai-badge ai-badge--neutral">{q.estado_requerimiento}</span>}
                                            {aEliminar === q.id ? (
                                                <div className="ai-row" style={{ gap: 6 }}>
                                                    <button className="ai-btn ai-btn--danger ai-btn--sm" onClick={() => eliminarReq(q.id)}>Eliminar</button>
                                                    <button className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => setAEliminar(null)}>No</button>
                                                </div>
                                            ) : (
                                                <div className="ai-row-actions">
                                                    <button className="ai-icon-btn" aria-label="Editar requerimiento" onClick={() => editarReq(q)}><Edit3 size={15} strokeWidth={1.75} /></button>
                                                    <button className="ai-icon-btn ai-icon-btn--danger" aria-label="Eliminar requerimiento" onClick={() => setAEliminar(q.id)}><Trash2 size={15} strokeWidth={1.75} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RedMaestraDrawer;
