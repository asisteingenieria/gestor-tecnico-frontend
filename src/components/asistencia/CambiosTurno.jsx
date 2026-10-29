import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, CalendarClock, ArrowLeftRight, Check, X, Plus, Search, ArrowRight } from 'lucide-react';
import { cambioTurnoService } from '../../services/api';
import { escucharAsistencia } from '../../utils/socketAsistencia';
import { avisarCambioContadores } from '../../utils/eventosAsistencia';
import { formatearFecha } from '../../utils/fecha';
import { nombrePropio } from '../../utils/formatoRRHH';

// Cambios de turno (asistencia.md §50). Una pantalla, tres vistas:
// - coordinador (jefe inmediato de alguien): pide cambios para cualquier empleado y ve "Mis solicitudes";
// - jefe (gestiona la asistencia del empleado): "Por aprobar", aprueba —el horario se reemplaza solo— o
//   rechaza con un motivo;
// - financiera (`financiera`): todas las solicitudes y su estado, solo lectura.
// Se recarga sola con el aviso `asistencia:notificacion` del socket.

const ESTADO_BADGE = {
    pendiente: { label: 'Pendiente', clase: 'ai-badge--warning' },
    aprobada: { label: 'Aprobada', clase: 'ai-badge--success' },
    rechazada: { label: 'Rechazada', clase: 'ai-badge--danger' }
};
const TIPO_LABEL = { cambio_horario: 'Cambio de horario', intercambio: 'Intercambio' };
const FILTROS_ESTADO = [
    { valor: '', texto: 'Todas' },
    { valor: 'pendiente', texto: 'Pendientes' },
    { valor: 'aprobada', texto: 'Aprobadas' },
    { valor: 'rechazada', texto: 'Rechazadas' }
];

const hhmm = (h) => (h ? String(h).slice(0, 5) : '');
const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const fmtDia = (f) => formatearFecha(f, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtInstante = (v) => (v ? new Date(v).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const textoTurno = ({ es_descanso: descanso, hora_entrada: e, hora_salida: s, plantilla }) => {
    if (descanso) return 'Descanso';
    return `${plantilla ? `${plantilla} · ` : ''}${hhmm(e)}–${hhmm(s)}`;
};
const textoAnterior = (d) => (d.anterior_hora_entrada == null
    ? 'Sin horario'
    : textoTurno({ es_descanso: d.anterior_es_descanso, hora_entrada: d.anterior_hora_entrada, hora_salida: d.anterior_hora_salida, plantilla: d.anterior_plantilla }));

const Cargando = () => (
    <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
    </div>
);

// ---------------------------------------------------------------------------------------------
// Tarjeta de una solicitud, con los días (antes → después) y, en la bandeja del jefe, sus acciones.
const TarjetaSolicitud = ({ s, conAcciones, onResuelta, onError }) => {
    const [accion, setAccion] = useState(null); // 'aprobar' | 'rechazar'
    const [texto, setTexto] = useState('');
    const [procesando, setProcesando] = useState(false);
    const badge = ESTADO_BADGE[s.estado] || ESTADO_BADGE.pendiente;

    const confirmar = async () => {
        if (accion === 'rechazar' && !texto.trim()) return;
        setProcesando(true);
        try {
            if (accion === 'aprobar') await cambioTurnoService.aprobar(s.idsolicitud_cambio_turno, { comentario: texto.trim() || undefined });
            else await cambioTurnoService.rechazar(s.idsolicitud_cambio_turno, { motivo_rechazo: texto.trim() });
            setAccion(null);
            setTexto('');
            onResuelta(accion === 'aprobar' ? 'Solicitud aprobada: el horario ya quedó cambiado.' : 'Solicitud rechazada.');
        } catch (err) {
            onError(err.response?.data?.message || 'No se pudo resolver la solicitud');
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="ai-panel" style={{ padding: 16 }}>
            <div className="ai-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div className="ai-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span className="ai-badge ai-badge--neutral">
                        {s.tipo === 'intercambio' ? <ArrowLeftRight size={12} strokeWidth={2} /> : <CalendarClock size={12} strokeWidth={2} />}
                        &nbsp;{TIPO_LABEL[s.tipo]}
                    </span>
                    <span className={`ai-badge ${badge.clase}`}>{badge.label}</span>
                    <span className="ai-muted" style={{ fontSize: 12 }}>#{s.idsolicitud_cambio_turno} · {fmtInstante(s.creado_en)}</span>
                </div>
                {conAcciones && s.estado === 'pendiente' && !accion && (
                    <div className="ai-row" style={{ gap: 6 }}>
                        <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => setAccion('rechazar')}><X size={14} strokeWidth={1.75} /> Rechazar</button>
                        <button type="button" className="ai-btn ai-btn--sm ai-btn--primary" onClick={() => setAccion('aprobar')}><Check size={14} strokeWidth={1.75} /> Aprobar</button>
                    </div>
                )}
            </div>

            <div className="ai-req-meta">
                <span>Pedida por <strong>{nombrePropio(s.solicitante)}</strong></span>
                <span>La aprueba <strong>{nombrePropio(s.aprobador)}</strong></span>
            </div>
            <p style={{ fontSize: 13, margin: '8px 0' }}><span className="ai-muted">Motivo:</span> {s.motivo}</p>

            <div style={{ overflowX: 'auto' }}>
                <table className="ai-table" style={{ fontSize: 13 }}>
                    <thead>
                        <tr><th>Empleado</th><th>Fecha</th><th>Turno actual</th><th aria-label="pasa a" /><th>Turno nuevo</th></tr>
                    </thead>
                    <tbody>
                        {s.dias.map((d) => (
                            <tr key={d.idsolicitud_cambio_turno_dia}>
                                <td>{nombrePropio(d.empleado)}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>{fmtDia(d.fecha)}</td>
                                <td className="ai-muted">{textoAnterior(d)}</td>
                                <td><ArrowRight size={14} strokeWidth={1.75} style={{ color: 'var(--ink-subtle)' }} /></td>
                                <td style={{ fontWeight: 600 }}>{textoTurno(d)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {s.estado === 'rechazada' && (
                <p style={{ fontSize: 13, marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                    Rechazada por {nombrePropio(s.resuelto_por)} el {fmtInstante(s.resuelta_en)}. Motivo: {s.motivo_rechazo}
                </p>
            )}
            {s.estado === 'aprobada' && (
                <p className="ai-muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Aprobada por {nombrePropio(s.resuelto_por)} el {fmtInstante(s.resuelta_en)}{s.comentario ? ` · "${s.comentario}"` : ''}
                </p>
            )}

            {accion && (
                <div className="ai-stack" style={{ marginTop: 10, gap: 6 }}>
                    <label className="ai-label">
                        {accion === 'rechazar' ? <>Motivo del rechazo <em>*</em></> : 'Comentario (opcional)'}
                    </label>
                    <textarea
                        autoFocus className="ai-input" rows={2} style={{ height: 'auto', padding: '8px 12px' }}
                        value={texto} onChange={(e) => setTexto(e.target.value)}
                        placeholder={accion === 'rechazar' ? 'Explica por qué no se aprueba' : ''}
                    />
                    <div className="ai-row" style={{ gap: 6 }}>
                        <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => { setAccion(null); setTexto(''); }}>Cancelar</button>
                        <button
                            type="button"
                            className={`ai-btn ai-btn--sm ${accion === 'rechazar' ? 'ai-btn--danger' : 'ai-btn--primary'}`}
                            onClick={confirmar}
                            disabled={procesando || (accion === 'rechazar' && !texto.trim())}
                        >
                            {procesando ? 'Guardando…' : accion === 'rechazar' ? 'Confirmar rechazo' : 'Confirmar aprobación'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------------------------
// Buscador de empleado por nombre o cédula (son 400+: se filtra en el navegador).
const SelectorEmpleado = ({ empleados, valor, onCambiar, etiqueta, placeholder }) => {
    const [busqueda, setBusqueda] = useState('');
    const seleccionado = empleados.find((e) => e.users_company_id === valor) || null;
    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (q.length < 2) return [];
        return empleados.filter((e) => e.nombre.toLowerCase().includes(q) || String(e.cedula).includes(q)).slice(0, 8);
    }, [busqueda, empleados]);

    if (seleccionado) {
        return (
            <div className="ai-field">
                <label className="ai-label">{etiqueta} <em>*</em></label>
                <div className="ai-row" style={{ justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{nombrePropio(seleccionado.nombre)}</div>
                        <div className="ai-muted" style={{ fontSize: 12 }}>
                            {[seleccionado.campania, seleccionado.centro_costo, seleccionado.cargo].filter(Boolean).join(' · ')}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>
                            {seleccionado.gestor_id
                                ? <>La solicitud le llega a <strong>{nombrePropio(seleccionado.gestor)}</strong></>
                                : <span style={{ color: 'var(--danger)' }}>No tiene jefe que gestione su asistencia</span>}
                        </div>
                    </div>
                    <button type="button" className="ai-icon-btn" onClick={() => { onCambiar(null); setBusqueda(''); }} aria-label="Cambiar empleado"><X size={16} strokeWidth={1.75} /></button>
                </div>
            </div>
        );
    }
    return (
        <div className="ai-field" style={{ position: 'relative' }}>
            <label className="ai-label">{etiqueta} <em>*</em></label>
            <div style={{ position: 'relative' }}>
                <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-subtle)' }} />
                <input
                    className="ai-input" style={{ paddingLeft: 30 }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                    placeholder={placeholder || 'Nombre o cédula'}
                />
            </div>
            {filtrados.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginTop: 4, maxHeight: 240, overflowY: 'auto', background: 'var(--surface-100)' }}>
                    {filtrados.map((e) => (
                        <button
                            key={e.users_company_id} type="button" onClick={() => onCambiar(e.users_company_id)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
                        >
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{nombrePropio(e.nombre)}</div>
                            <div className="ai-muted" style={{ fontSize: 12 }}>{[e.cedula, e.campania, e.centro_costo].filter(Boolean).join(' · ')}</div>
                        </button>
                    ))}
                </div>
            )}
            {busqueda.trim().length >= 2 && filtrados.length === 0 && <p className="ai-help">Sin resultados.</p>}
        </div>
    );
};

// ---------------------------------------------------------------------------------------------
const FORM_VACIO = { tipo: 'cambio_horario', empleado: null, empleado2: null, desde: '', hasta: '', fecha: '', modo: 'plantilla', plantillaId: '', entrada: '', salida: '', almuerzo: '60', motivo: '' };

const ModalSolicitud = ({ onCerrar, onEnviada }) => {
    const [empleados, setEmpleados] = useState(null);
    const [form, setForm] = useState(() => ({ ...FORM_VACIO, desde: hoyBogota(), hasta: hoyBogota(), fecha: hoyBogota() }));
    const [plantillas, setPlantillas] = useState([]);
    const [actuales, setActuales] = useState([]);
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
    const hoy = hoyBogota();

    useEffect(() => {
        cambioTurnoService.getEmpleados()
            .then(({ data }) => setEmpleados(data))
            .catch((err) => { setEmpleados([]); setError(err.response?.data?.message || 'No se pudo cargar la lista de empleados'); });
    }, []);

    const emp1 = empleados?.find((e) => e.users_company_id === form.empleado) || null;
    // Para intercambiar, los dos tienen que tener el mismo jefe (es quien aprueba).
    const candidatos2 = useMemo(
        () => (empleados || []).filter((e) => emp1 && e.gestor_id === emp1.gestor_id && e.users_company_id !== emp1.users_company_id),
        [empleados, emp1]
    );

    // Plantillas del jefe que va a aprobar.
    useEffect(() => {
        setPlantillas([]);
        if (!form.empleado || form.tipo !== 'cambio_horario') return;
        cambioTurnoService.getPlantillas(form.empleado).then(({ data }) => setPlantillas(data)).catch(() => setPlantillas([]));
    }, [form.empleado, form.tipo]);

    // Turno actual de los días que cambian, para ver el antes y el después antes de enviar.
    const ids = form.tipo === 'intercambio' ? [form.empleado, form.empleado2].filter(Boolean) : [form.empleado].filter(Boolean);
    const desde = form.tipo === 'intercambio' ? form.fecha : form.desde;
    const hasta = form.tipo === 'intercambio' ? form.fecha : (form.hasta || form.desde);
    const claveActuales = `${ids.join(',')}|${desde}|${hasta}`;
    useEffect(() => {
        setActuales([]);
        if (ids.length === 0 || !desde || !hasta || hasta < desde) return;
        cambioTurnoService.getHorarios(ids, desde, hasta).then(({ data }) => setActuales(data)).catch(() => setActuales([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [claveActuales]);

    const turnoDe = (uc, fecha) => actuales.find((h) => h.users_company_id === uc && h.fecha === fecha);
    const plantilla = plantillas.find((p) => String(p.idhorario_plantilla) === String(form.plantillaId));

    const enviar = async (e) => {
        e.preventDefault();
        setError(null);
        const base = { tipo: form.tipo, motivo: form.motivo.trim(), empleado_id: form.empleado };
        let datos;
        if (form.tipo === 'intercambio') {
            datos = { ...base, empleado2_id: form.empleado2, fecha: form.fecha };
        } else {
            datos = { ...base, desde: form.desde, hasta: form.hasta || form.desde };
            if (form.modo === 'descanso') datos.es_descanso = true;
            else if (form.modo === 'plantilla') datos.plantilla_id = Number(form.plantillaId);
            else Object.assign(datos, { hora_entrada: form.entrada, hora_salida: form.salida, minutos_almuerzo: Number(form.almuerzo) || 0 });
        }
        setEnviando(true);
        try {
            await cambioTurnoService.solicitar(datos);
            onEnviada();
        } catch (err) {
            const msg = err.response?.data?.message || 'No se pudo enviar la solicitud';
            const detalles = err.response?.data?.detalles;
            setError(Array.isArray(detalles) ? `${msg}: ${detalles.join(', ')}` : msg);
        } finally {
            setEnviando(false);
        }
    };

    const nuevoValido = form.modo === 'descanso' || (form.modo === 'plantilla' ? Boolean(form.plantillaId) : Boolean(form.entrada && form.salida && form.salida > form.entrada));
    const valido = Boolean(form.motivo.trim() && emp1?.gestor_id) && (form.tipo === 'intercambio'
        ? Boolean(form.empleado2 && form.fecha)
        : Boolean(form.desde && (!form.hasta || form.hasta >= form.desde) && nuevoValido));

    // Fechas del rango (para la vista previa del cambio de horario), como mucho 31.
    const fechasRango = useMemo(() => {
        if (form.tipo !== 'cambio_horario' || !desde || !hasta || hasta < desde) return [];
        const lista = [];
        for (let d = new Date(`${desde}T00:00:00Z`); d <= new Date(`${hasta}T00:00:00Z`) && lista.length < 31; d.setUTCDate(d.getUTCDate() + 1)) {
            lista.push(d.toISOString().slice(0, 10));
        }
        return lista;
    }, [form.tipo, desde, hasta]);

    const textoNuevo = form.modo === 'descanso'
        ? 'Descanso'
        : form.modo === 'plantilla'
            ? (plantilla ? textoTurno(plantilla) : '—')
            : (form.entrada && form.salida ? `${form.entrada}–${form.salida}` : '—');

    return (
        <div className="ai-overlay" onClick={onCerrar}>
            <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><CalendarClock size={20} strokeWidth={1.75} /></span>
                    <div><h3 className="ai-modal-title">Solicitar cambio de turno</h3><p className="ai-modal-sub">Le llega al jefe que gestiona la asistencia del empleado</p></div>
                    <button type="button" className="ai-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                </div>
                <form onSubmit={enviar}>
                    <div className="ai-modal-body ai-stack" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
                        <div className="ai-seg" style={{ alignSelf: 'flex-start' }}>
                            {[['cambio_horario', 'Cambio de horario'], ['intercambio', 'Intercambio entre dos']].map(([valor, texto]) => (
                                <span key={valor} className={form.tipo === valor ? 'is-active' : ''} style={{ cursor: 'pointer' }}
                                    onClick={() => setForm((f) => ({ ...f, tipo: valor, empleado2: null }))}>{texto}</span>
                            ))}
                        </div>

                        {!empleados ? <p className="ai-help">Cargando empleados…</p> : (
                            <SelectorEmpleado
                                empleados={empleados} valor={form.empleado} etiqueta={form.tipo === 'intercambio' ? 'Primer empleado' : 'Empleado'}
                                onCambiar={(id) => setForm((f) => ({ ...f, empleado: id, empleado2: null, plantillaId: '' }))}
                            />
                        )}

                        {form.tipo === 'intercambio' && emp1 && (
                            <SelectorEmpleado
                                empleados={candidatos2} valor={form.empleado2} etiqueta="Segundo empleado (mismo jefe)"
                                placeholder={`Alguien del equipo de ${nombrePropio(emp1.gestor || '')}`}
                                onCambiar={(id) => set('empleado2', id)}
                            />
                        )}

                        {form.tipo === 'intercambio' ? (
                            <div className="ai-field">
                                <label className="ai-label">Fecha <em>*</em></label>
                                <input type="date" required min={hoy} className="ai-input" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
                            </div>
                        ) : (
                            <>
                                <div className="ai-form-grid">
                                    <div className="ai-field">
                                        <label className="ai-label">Desde <em>*</em></label>
                                        <input type="date" required min={hoy} className="ai-input" value={form.desde}
                                            onChange={(e) => setForm((f) => ({ ...f, desde: e.target.value, hasta: f.hasta && f.hasta < e.target.value ? e.target.value : f.hasta }))} />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Hasta</label>
                                        <input type="date" min={form.desde || hoy} className="ai-input" value={form.hasta} onChange={(e) => set('hasta', e.target.value)} />
                                    </div>
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Turno nuevo <em>*</em></label>
                                    <div className="ai-seg" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                                        {[['plantilla', 'Plantilla del jefe'], ['horas', 'Horas'], ['descanso', 'Descanso']].map(([valor, texto]) => (
                                            <span key={valor} className={form.modo === valor ? 'is-active' : ''} style={{ cursor: 'pointer' }} onClick={() => set('modo', valor)}>{texto}</span>
                                        ))}
                                    </div>
                                    {form.modo === 'plantilla' && (
                                        form.empleado && plantillas.length === 0
                                            ? <p className="ai-help">El jefe de este empleado no tiene plantillas: indica las horas.</p>
                                            : (
                                                <select className="ai-input" value={form.plantillaId} onChange={(e) => set('plantillaId', e.target.value)} disabled={!form.empleado}>
                                                    <option value="">{form.empleado ? 'Selecciona una plantilla' : 'Primero elige el empleado'}</option>
                                                    {plantillas.map((p) => (
                                                        <option key={p.idhorario_plantilla} value={p.idhorario_plantilla}>
                                                            {p.nombre} · {hhmm(p.hora_entrada)}–{hhmm(p.hora_salida)}{p.centro_costo ? ` (${p.centro_costo})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            )
                                    )}
                                    {form.modo === 'horas' && (
                                        <div className="ai-form-grid">
                                            <input type="time" className="ai-input" aria-label="Hora de entrada" value={form.entrada} onChange={(e) => set('entrada', e.target.value)} />
                                            <input type="time" className="ai-input" aria-label="Hora de salida" value={form.salida} onChange={(e) => set('salida', e.target.value)} />
                                            <input type="number" min="0" className="ai-input" aria-label="Minutos de almuerzo" placeholder="Almuerzo (min)" value={form.almuerzo} onChange={(e) => set('almuerzo', e.target.value)} />
                                        </div>
                                    )}
                                    {form.modo === 'horas' && form.entrada && form.salida && form.salida <= form.entrada && (
                                        <p className="ai-help is-error">La salida debe ser después de la entrada (no se manejan turnos que cruzan la medianoche).</p>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Vista previa: turno actual → turno nuevo */}
                        {form.tipo === 'cambio_horario' && emp1 && fechasRango.length > 0 && (
                            <div className="ai-field">
                                <label className="ai-label">Así quedaría</label>
                                <table className="ai-table" style={{ fontSize: 13 }}>
                                    <tbody>
                                        {fechasRango.map((f) => {
                                            const actual = turnoDe(emp1.users_company_id, f);
                                            return (
                                                <tr key={f}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDia(f)}</td>
                                                    <td className="ai-muted">{actual ? textoTurno(actual) : 'Sin horario'}</td>
                                                    <td><ArrowRight size={14} strokeWidth={1.75} style={{ color: 'var(--ink-subtle)' }} /></td>
                                                    <td style={{ fontWeight: 600 }}>{textoNuevo}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {form.tipo === 'intercambio' && emp1 && form.empleado2 && form.fecha && (() => {
                            const emp2 = candidatos2.find((e) => e.users_company_id === form.empleado2);
                            const t1 = turnoDe(emp1.users_company_id, form.fecha);
                            const t2 = turnoDe(form.empleado2, form.fecha);
                            return (
                                <div className="ai-field">
                                    <label className="ai-label">Así quedaría el {fmtDia(form.fecha)}</label>
                                    <table className="ai-table" style={{ fontSize: 13 }}>
                                        <tbody>
                                            <tr><td>{nombrePropio(emp1.nombre)}</td><td className="ai-muted">{t1 ? textoTurno(t1) : 'Sin horario'}</td><td><ArrowRight size={14} /></td><td style={{ fontWeight: 600 }}>{t2 ? textoTurno(t2) : 'Sin horario'}</td></tr>
                                            <tr><td>{nombrePropio(emp2?.nombre)}</td><td className="ai-muted">{t2 ? textoTurno(t2) : 'Sin horario'}</td><td><ArrowRight size={14} /></td><td style={{ fontWeight: 600 }}>{t1 ? textoTurno(t1) : 'Sin horario'}</td></tr>
                                        </tbody>
                                    </table>
                                    {(!t1 || !t2) && <p className="ai-help is-error">Los dos deben tener turno asignado ese día para intercambiarlo.</p>}
                                </div>
                            );
                        })()}

                        <div className="ai-field">
                            <label className="ai-label">Motivo <em>*</em></label>
                            <textarea required className="ai-input" rows={3} style={{ height: 'auto', padding: '10px 12px' }}
                                value={form.motivo} onChange={(e) => set('motivo', e.target.value)} placeholder="Por qué se necesita el cambio" />
                        </div>
                        {error && <p className="ai-help is-error">{error}</p>}
                    </div>
                    <div className="ai-modal-foot">
                        <button type="button" className="ai-btn ai-btn--secondary" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="ai-btn ai-btn--primary" disabled={enviando || !valido}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------------------------
const CambiosTurno = ({ financiera = false }) => {
    const [permisos, setPermisos] = useState(financiera ? { puede_solicitar: false, puede_aprobar: false } : null);
    const [tab, setTab] = useState(financiera ? 'todas' : null);
    const [bandeja, setBandeja] = useState([]);
    const [mias, setMias] = useState([]);
    const [todas, setTodas] = useState([]);
    const [filtro, setFiltro] = useState(financiera ? '' : 'pendiente');
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState(null);
    const [aviso, setAviso] = useState(null);
    const [modal, setModal] = useState(false);

    const cargar = useCallback(async () => {
        try {
            if (financiera) {
                const { data } = await cambioTurnoService.getTodas();
                setTodas(data);
                return;
            }
            const { data: p } = await cambioTurnoService.getPermisos();
            setPermisos(p);
            setTab((t) => t || (p.puede_aprobar ? 'bandeja' : 'mias'));
            const [b, m] = await Promise.all([
                p.puede_aprobar ? cambioTurnoService.getBandeja() : Promise.resolve({ data: [] }),
                p.puede_solicitar ? cambioTurnoService.getMias() : Promise.resolve({ data: [] })
            ]);
            setBandeja(b.data);
            setMias(m.data);
        } catch (err) {
            setMensaje(err.response?.data?.message || 'No se pudieron cargar las solicitudes');
        } finally {
            setLoading(false);
        }
    }, [financiera]);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => escucharAsistencia('asistencia:notificacion', cargar), [cargar]);

    const fuente = tab === 'bandeja' ? bandeja : tab === 'mias' ? mias : todas;
    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return fuente.filter((s) => (!filtro || s.estado === filtro) && (!q || [s.solicitante, s.aprobador, ...s.dias.map((d) => d.empleado)]
            .some((n) => String(n || '').toLowerCase().includes(q))));
    }, [fuente, filtro, busqueda]);

    const resuelta = async (texto) => {
        setMensaje(null);
        setAviso(texto);
        await cargar();
        avisarCambioContadores();
    };

    if (loading) return <div className="ai-content"><Cargando /></div>;

    const tabs = [
        ...(permisos?.puede_aprobar ? [{ id: 'bandeja', label: 'Por aprobar', count: bandeja.filter((s) => s.estado === 'pendiente').length }] : []),
        ...(permisos?.puede_solicitar ? [{ id: 'mias', label: 'Mis solicitudes', count: mias.filter((s) => s.estado === 'pendiente').length }] : [])
    ];

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Cambios de turno</h1>
                    <p className="ai-page-sub">
                        {financiera ? 'Todas las solicitudes de los coordinadores y su respuesta' : 'Solicitudes de los coordinadores y aprobación del jefe'}
                    </p>
                </div>
                {permisos?.puede_solicitar && (
                    <button type="button" className="ai-btn ai-btn--primary" onClick={() => { setAviso(null); setModal(true); }}>
                        <Plus size={16} strokeWidth={1.75} /> Solicitar cambio de turno
                    </button>
                )}
            </div>

            {mensaje && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{mensaje}</p>}
            {aviso && (
                <div className="ai-row" role="status" style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <Check size={16} strokeWidth={1.75} /><span style={{ fontSize: 13 }}>{aviso}</span>
                </div>
            )}

            {!financiera && tabs.length === 0 ? (
                <div className="ai-panel"><div className="ai-empty"><CalendarClock size={36} strokeWidth={1.5} /><p>Los cambios de turno los piden los coordinadores y los aprueban los jefes.</p></div></div>
            ) : (
                <>
                    <div className="ai-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        {tabs.length > 1 ? (
                            <div className="ai-tabs" style={{ borderBottom: 0 }}>
                                {tabs.map((t) => (
                                    <button key={t.id} type="button" className={`ai-tab ${tab === t.id ? 'is-active' : ''}`}
                                        style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setTab(t.id)}>
                                        {t.label}<span className="ai-count">{t.count}</span>
                                    </button>
                                ))}
                            </div>
                        ) : <span />}
                        <div className="ai-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                            <div className="ai-seg">
                                {FILTROS_ESTADO.map((f) => (
                                    <span key={f.valor} className={filtro === f.valor ? 'is-active' : ''} style={{ cursor: 'pointer' }} onClick={() => setFiltro(f.valor)}>{f.texto}</span>
                                ))}
                            </div>
                            <input className="ai-input" style={{ width: 220, height: 36 }} placeholder="Buscar por nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                        </div>
                    </div>

                    {visibles.length === 0 ? (
                        <div className="ai-panel"><div className="ai-empty"><CalendarClock size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} /><p>No hay solicitudes con este filtro.</p></div></div>
                    ) : (
                        <div className="ai-stack" style={{ gap: 12 }}>
                            {visibles.map((s) => (
                                <TarjetaSolicitud key={s.idsolicitud_cambio_turno} s={s} conAcciones={tab === 'bandeja'} onResuelta={resuelta} onError={(m) => { setAviso(null); setMensaje(m); }} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {modal && (
                <ModalSolicitud
                    onCerrar={() => setModal(false)}
                    onEnviada={async () => {
                        setModal(false);
                        setTab('mias');
                        setFiltro('');
                        setAviso('Solicitud enviada. Le llegó al jefe del empleado y te avisaremos cuando la responda.');
                        await cargar();
                    }}
                />
            )}
        </div>
    );
};

export default CambiosTurno;
