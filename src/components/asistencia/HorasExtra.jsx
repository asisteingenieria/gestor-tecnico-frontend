import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Clock3, Check, X, Plus, Search, CheckCircle2, XCircle, Inbox, Send, FileSpreadsheet } from 'lucide-react';
import HorasExtraExcelModal from './HorasExtraExcelModal';
import { useAuth } from '../../context/AuthContext';
import { asistenciaService, cambioTurnoService } from '../../services/api';
import { formatearFecha } from '../../utils/fecha';
import { formatearDuracion } from '../../utils/tiempoAsistencia';
import { nombrePropio, iniciales } from '../../utils/formatoRRHH';
import { avisarCambioContadores } from '../../utils/eventosAsistencia';
import { escucharAsistencia } from '../../utils/socketAsistencia';
import { OPCIONES_CLASE, etiquetaClase } from '../../utils/reporteHorasExtra';
import { EncabezadoVista, Mosaicos, Mosaico, BarraFiltros, PanelVista, Pastilla, CargandoVista, VistaVacia, COLOR_SOLICITUD, TONO } from '../ui';

const ESTADO_LABEL = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada', cancelada: 'Cancelada' };

// Vista previa de la clasificación: como mucho para estas personas (cada una se calcula con su turno).
const MAX_PREVIA = 10;

const hhmm = (h) => (h ? String(h).slice(0, 5) : '');
const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const fmtDia = (f) => formatearFecha(f, { weekday: 'short', day: 'numeric', month: 'short' });
const franja = (h) => (h.hora_inicio && h.hora_fin ? `${hhmm(h.hora_inicio)}–${hhmm(h.hora_fin)}` : null);

function esDelMesActual(fechaIso) {
    // hora_extra.fecha llega como fila cruda de la BD (Date -> ISO con hora), no como
    // "YYYY-MM-DD" puro; new Date() ya lo parsea bien sin concatenar hora otra vez.
    const f = new Date(fechaIso);
    const hoy = new Date();
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
}

const Tramos = ({ tramos }) => (tramos?.length > 0 ? (
    <div className="ai-req-meta" style={{ marginTop: 4, flexWrap: 'wrap' }}>
        {tramos.map((t) => <Pastilla key={t.clase} color={TONO.suave}>{etiquetaClase(t.clase)}: {formatearDuracion(t.minutos)}</Pastilla>)}
    </div>
) : null);

// ---------------------------------------------------------------------------------------------
// Modal del jefe: pide horas extra para una o varias personas de su equipo, en la misma franja.
const ModalSolicitud = ({ onCerrar, onEnviada }) => {
    const [equipo, setEquipo] = useState(null);
    const [seleccion, setSeleccion] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [form, setForm] = useState({ fecha: hoyBogota(), inicio: '', fin: '', motivo: '' });
    const [previa, setPrevia] = useState(null);
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);

    // Su equipo directo, con quién aprueba (su director).
    useEffect(() => {
        cambioTurnoService.getEmpleados()
            .then(({ data }) => setEquipo(data))
            .catch((err) => { setEquipo([]); setError(err.response?.data?.message || 'No se pudo cargar tu equipo'); });
    }, []);

    const director = equipo?.[0]?.gestor || null;
    const sinDirector = equipo && equipo.length > 0 && !equipo[0].gestor_id;
    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return (equipo || []).filter((e) => !q || e.nombre.toLowerCase().includes(q) || String(e.cedula).includes(q)
            || String(e.centro_costo || '').toLowerCase().includes(q));
    }, [equipo, busqueda]);
    const nombreDe = (id) => nombrePropio(equipo?.find((e) => e.users_company_id === id)?.nombre || '');

    const alternar = (id) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const todosFiltrados = filtrados.length > 0 && filtrados.every((e) => seleccion.includes(e.users_company_id));
    const alternarFiltrados = () => {
        const ids = filtrados.map((e) => e.users_company_id);
        setSeleccion((s) => (todosFiltrados ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]));
    };

    const franjaValida = Boolean(form.inicio && form.fin && form.inicio !== form.fin);
    const paraPrevia = seleccion.slice(0, MAX_PREVIA);
    const clavePrevia = `${paraPrevia.join(',')}|${form.fecha}|${form.inicio}|${form.fin}`;
    useEffect(() => {
        setPrevia(null);
        if (paraPrevia.length === 0 || !franjaValida) return undefined;
        let vigente = true;
        asistenciaService.previsualizarHoraExtra({ empleados: paraPrevia, fecha: form.fecha, hora_inicio: form.inicio, hora_fin: form.fin })
            .then(({ data }) => { if (vigente) setPrevia(data); })
            .catch(() => { if (vigente) setPrevia([]); });
        return () => { vigente = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clavePrevia]);

    const enviar = async (e) => {
        e.preventDefault();
        setError(null);
        setEnviando(true);
        try {
            const { data } = await asistenciaService.solicitarHoraExtra({
                empleados: seleccion, fecha: form.fecha, hora_inicio: form.inicio, hora_fin: form.fin, motivo: form.motivo.trim()
            });
            onEnviada(data);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo enviar la solicitud');
        } finally {
            setEnviando(false);
        }
    };

    const valido = seleccion.length > 0 && franjaValida && form.motivo.trim() && !sinDirector;

    return (
        <div className="ai-overlay" onClick={onCerrar}>
            <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><Clock3 size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h3 className="ai-modal-title">Solicitar horas extra</h3>
                        <p className="ai-modal-sub">{director ? <>La aprueba <strong>{nombrePropio(director)}</strong></> : 'Queda pendiente de aprobación de tu director'}</p>
                    </div>
                    <button type="button" className="ai-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                </div>
                <form onSubmit={enviar}>
                    <div className="ai-modal-body ai-stack" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
                        {sinDirector && <p className="ai-help is-error">No tienes en RRHH un jefe que apruebe tus solicitudes: pide que lo asignen en tu ficha.</p>}

                        <div className="ai-field">
                            <label className="ai-label">Personas <em>*</em> {seleccion.length > 0 && <span className="ai-muted">· {seleccion.length} elegidas</span>}</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-subtle)' }} />
                                <input className="ai-input" style={{ paddingLeft: 30 }} placeholder="Buscar por nombre, cédula o centro de costo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                            </div>
                            {!equipo ? <p className="ai-help">Cargando tu equipo…</p> : (
                                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginTop: 4, maxHeight: 220, overflowY: 'auto' }}>
                                    {filtrados.length > 0 && (
                                        <label className="ai-row" style={{ padding: '6px 12px', gap: 8, borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                            <input type="checkbox" checked={todosFiltrados} onChange={alternarFiltrados} /> {busqueda ? 'Todos los que coinciden' : 'Todo el equipo'} ({filtrados.length})
                                        </label>
                                    )}
                                    {filtrados.map((e) => (
                                        <label key={e.users_company_id} className="ai-row" style={{ padding: '6px 12px', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                            <input type="checkbox" checked={seleccion.includes(e.users_company_id)} onChange={() => alternar(e.users_company_id)} />
                                            <span>{nombrePropio(e.nombre)} <span className="ai-muted" style={{ fontSize: 12 }}>· {[e.centro_costo, e.cargo].filter(Boolean).join(' · ')}</span></span>
                                        </label>
                                    ))}
                                    {filtrados.length === 0 && <p className="ai-help" style={{ padding: '8px 12px' }}>Sin resultados.</p>}
                                </div>
                            )}
                        </div>

                        <div className="ai-field">
                            <label className="ai-label">Fecha <em>*</em></label>
                            <input type="date" required className="ai-input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                        </div>
                        <div className="ai-form-grid">
                            <div className="ai-field">
                                <label className="ai-label">Hora inicio <em>*</em></label>
                                <input type="time" required className="ai-input" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
                            </div>
                            <div className="ai-field">
                                <label className="ai-label">Hora fin <em>*</em></label>
                                <input type="time" required className="ai-input" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} />
                            </div>
                        </div>

                        {franjaValida && seleccion.length > 0 && (
                            <div className="ai-field">
                                <label className="ai-label">Clasificación</label>
                                {!previa ? <p className="ai-help">Calculando…</p> : (
                                    <>
                                        {previa.map((p) => (
                                            <div key={p.users_company_id} style={{ fontSize: 13, marginBottom: 4 }}>
                                                <strong>{nombreDe(p.users_company_id)}</strong>
                                                {p.tramos.length > 0 ? <Tramos tramos={p.tramos} /> : <span className="ai-muted"> · esa franja no suma tiempo extra</span>}
                                            </div>
                                        ))}
                                        {seleccion.length > MAX_PREVIA && <p className="ai-help">… y {seleccion.length - MAX_PREVIA} personas más.</p>}
                                        <p className="ai-help">La determina el sistema según el turno de cada persona, la fecha y el umbral nocturno. El director puede ajustarla al aprobar.</p>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="ai-field">
                            <label className="ai-label">Motivo <em>*</em></label>
                            <textarea required className="ai-input" style={{ height: 'auto', padding: '10px 12px' }} rows={3} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
                        </div>
                        {error && <p className="ai-help is-error">{error}</p>}
                    </div>
                    <div className="ai-modal-foot">
                        <button type="button" className="ai-btn ai-btn--secondary" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="ai-btn ai-btn--primary" disabled={enviando || !valido}>
                            {enviando ? 'Enviando…' : seleccion.length > 1 ? `Solicitar para ${seleccion.length}` : 'Enviar solicitud'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------------------------
// Horas extra (asistencia.md §32, flujo de §51). Tres vistas:
// - empleado: solo consulta las suyas (ya no las pide);
// - jefe de operaciones: las solicita para su equipo y sigue su estado en "Mis solicitudes";
// - director: "Por aprobar", las que le piden sus jefes; aprueba (ajustando la clasificación) o rechaza.
// Las pendientes del flujo anterior (las pidió el empleado) siguen en la bandeja de su jefe.
const HorasExtra = () => {
    const { isDirectorOperaciones } = useAuth();
    const [propias, setPropias] = useState([]);
    const [solicitadas, setSolicitadas] = useState([]);
    const [bandeja, setBandeja] = useState([]);
    const [puedeAprobar, setPuedeAprobar] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState(null);
    const [aviso, setAviso] = useState(null);
    const [procesando, setProcesando] = useState(null);
    const [tab, setTab] = useState(null);
    const [estado, setEstado] = useState('pendiente');
    const [modal, setModal] = useState(false);
    const [modalExcel, setModalExcel] = useState(false);

    // Al aprobar, el director confirma la clasificación del servidor o la ajusta (editor de tramos con
    // la propuesta ya cargada). asistencia.md §32.
    const [aprobandoId, setAprobandoId] = useState(null);
    const [tramosAjuste, setTramosAjuste] = useState([]);
    const [rechazandoId, setRechazandoId] = useState(null);
    const [comentarioRechazo, setComentarioRechazo] = useState('');

    const cargar = useCallback(async () => {
        try {
            if (!isDirectorOperaciones) {
                setPropias((await asistenciaService.getMisHorasExtra()).data);
                return;
            }
            const [p, s, b] = await Promise.all([
                cambioTurnoService.getPermisos(),
                asistenciaService.getHorasExtraSolicitadas(),
                asistenciaService.getBandejaHorasExtra()
            ]);
            setSolicitadas(s.data);
            setBandeja(b.data);
            // "Por aprobar" es del director; un jefe la ve solo si le quedan pendientes del flujo anterior.
            const aprueba = p.data.puede_aprobar || b.data.length > 0;
            setPuedeAprobar(aprueba);
            setTab((t) => t || (aprueba ? 'bandeja' : 'mias'));
        } catch (err) {
            setMensaje(err.response?.data?.message || 'No se pudo cargar la información');
        } finally {
            setLoading(false);
        }
    }, [isDirectorOperaciones]);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => escucharAsistencia('asistencia:notificacion', cargar), [cargar]);

    const fuente = !isDirectorOperaciones ? propias : tab === 'bandeja' ? bandeja : solicitadas;
    const visibles = useMemo(() => fuente.filter((h) => h.estado === estado), [fuente, estado]);
    const kpis = useMemo(() => ({
        pendientes: fuente.filter((h) => h.estado === 'pendiente').length,
        aprobadas: fuente.filter((h) => h.estado === 'aprobada').length,
        aprobadasMes: fuente.filter((h) => h.estado === 'aprobada' && esDelMesActual(h.fecha)).reduce((acc, h) => acc + (h.minutos_aprobados || 0), 0),
        rechazadas: fuente.filter((h) => h.estado === 'rechazada').length
    }), [fuente]);

    const terminar = async (texto) => {
        setAprobandoId(null);
        setRechazandoId(null);
        setTramosAjuste([]);
        setComentarioRechazo('');
        setMensaje(null);
        setAviso(texto);
        await cargar();
        avisarCambioContadores();
    };

    const aprobar = async (id, tramos) => {
        setProcesando(id);
        try {
            await asistenciaService.aprobarHoraExtra(id, tramos ? { tramos } : {});
            await terminar('Horas extra aprobadas.');
        } catch (err) {
            setMensaje(err.response?.data?.message || 'No se pudo aprobar');
        } finally {
            setProcesando(null);
        }
    };

    const confirmarAjuste = (id) => {
        const tramos = tramosAjuste
            .map((t) => ({ clase: t.clase, minutos: Math.round(Number(t.minutos) || 0) }))
            .filter((t) => t.minutos > 0);
        if (tramos.length > 0) aprobar(id, tramos);
    };

    const confirmarRechazo = async (id) => {
        setProcesando(id);
        try {
            await asistenciaService.rechazarHoraExtra(id, { comentario: comentarioRechazo.trim() || undefined });
            await terminar('Horas extra rechazadas.');
        } catch (err) {
            setMensaje(err.response?.data?.message || 'No se pudo rechazar');
        } finally {
            setProcesando(null);
        }
    };

    const abrirAjuste = (h) => {
        setRechazandoId(null);
        setAprobandoId(h.idhora_extra);
        setTramosAjuste(h.tramos?.length
            ? h.tramos.map((t) => ({ clase: t.clase, minutos: String(t.minutos) }))
            : [{ clase: 'extras_diurnas', minutos: '' }]);
    };
    const cambiarTramo = (i, campo, valor) => setTramosAjuste((prev) => prev.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)));

    if (loading) {
        return <div className="ai-content"><CargandoVista /></div>;
    }

    const tabs = isDirectorOperaciones ? [
        ...(puedeAprobar ? [{ id: 'bandeja', label: 'Por aprobar', icono: Inbox, count: bandeja.filter((h) => h.estado === 'pendiente').length }] : []),
        { id: 'mias', label: 'Mis solicitudes', icono: Send, count: solicitadas.filter((h) => h.estado === 'pendiente').length }
    ] : [];

    const fila = (h) => {
        const enBandeja = tab === 'bandeja';
        const nombre = isDirectorOperaciones ? nombrePropio(h.empleado || '') : fmtDia(h.fecha);
        return (
            <div key={h.idhora_extra} className="ai-req" style={isDirectorOperaciones ? undefined : { gridTemplateColumns: '1fr auto' }}>
                {isDirectorOperaciones && <span className="ai-avatar">{iniciales(h.empleado || '?')}</span>}
                <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{nombre}</div>
                    <div className="ai-req-meta">
                        {isDirectorOperaciones && <span>{fmtDia(h.fecha)}</span>}
                        {franja(h) && <span>{franja(h)}</span>}
                        <span>{formatearDuracion(h.minutos_estimados)} solicitados</span>
                        {h.minutos_aprobados != null && <span>{formatearDuracion(h.minutos_aprobados)} aprobados</span>}
                        {enBandeja && h.solicitante && <span>Pedida por {nombrePropio(h.solicitante)}</span>}
                        {enBandeja && !h.solicitante && <Pastilla color={TONO.suave}>La pidió el empleado</Pastilla>}
                        {tab === 'mias' && h.aprobador && <span>La aprueba {nombrePropio(h.aprobador)}</span>}
                    </div>
                    {h.motivo && <q className="ai-muted">{h.motivo}</q>}
                    <Tramos tramos={h.tramos} />
                    {h.estado === 'rechazada' && h.comentario_director && (
                        <p style={{ fontSize: 12, marginTop: 4, color: 'var(--danger)' }}>Motivo del rechazo: {h.comentario_director}</p>
                    )}

                    {aprobandoId === h.idhora_extra && (
                        <div style={{ marginTop: 8 }}>
                            <p className="ai-help" style={{ marginBottom: 6 }}>Ajusta la clasificación si hace falta; el total aprobado es la suma de los tramos.</p>
                            {tramosAjuste.map((t, i) => (
                                <div key={i} className="ai-row" style={{ marginBottom: 6, gap: 6, flexWrap: 'wrap' }}>
                                    <select className="ai-input" style={{ width: 210 }} value={t.clase} onChange={(e) => cambiarTramo(i, 'clase', e.target.value)} aria-label="Clase de la hora extra">
                                        {OPCIONES_CLASE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    <input type="number" min="1" className="ai-input" style={{ width: 90 }} value={t.minutos} onChange={(e) => cambiarTramo(i, 'minutos', e.target.value)} aria-label="Minutos" placeholder="min" />
                                    {tramosAjuste.length > 1 && (
                                        <button type="button" className="ai-icon-btn" onClick={() => setTramosAjuste((prev) => prev.filter((_, j) => j !== i))} aria-label="Quitar tramo"><X size={14} strokeWidth={1.75} /></button>
                                    )}
                                </div>
                            ))}
                            <div className="ai-row" style={{ gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => setTramosAjuste((prev) => [...prev, { clase: 'extras_diurnas', minutos: '' }])}><Plus size={14} strokeWidth={1.75} /> Clase</button>
                                <button type="button" className="ai-btn ai-btn--sm ai-btn--primary" onClick={() => confirmarAjuste(h.idhora_extra)} disabled={procesando === h.idhora_extra}>Confirmar</button>
                                <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => setAprobandoId(null)}>Cancelar</button>
                            </div>
                        </div>
                    )}
                    {rechazandoId === h.idhora_extra && (
                        <div className="ai-row" style={{ marginTop: 8 }}>
                            <input type="text" autoFocus className="ai-input" placeholder="Motivo (opcional)" value={comentarioRechazo} onChange={(e) => setComentarioRechazo(e.target.value)} />
                            <button type="button" className="ai-btn ai-btn--sm ai-btn--danger" onClick={() => confirmarRechazo(h.idhora_extra)} disabled={procesando === h.idhora_extra}>Confirmar</button>
                            <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => setRechazandoId(null)}>Cancelar</button>
                        </div>
                    )}
                </div>
                {enBandeja && h.estado === 'pendiente' && aprobandoId !== h.idhora_extra && rechazandoId !== h.idhora_extra ? (
                    <div className="ai-row" style={{ flexWrap: 'wrap', gap: 6 }}>
                        <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => { setAprobandoId(null); setRechazandoId(h.idhora_extra); }}><X size={14} strokeWidth={1.75} /> Rechazar</button>
                        <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => abrirAjuste(h)}>Ajustar</button>
                        <button type="button" className="ai-btn ai-btn--sm ai-btn--primary" onClick={() => aprobar(h.idhora_extra)} disabled={procesando === h.idhora_extra}><Check size={14} strokeWidth={1.75} /> Aprobar</button>
                    </div>
                ) : (!enBandeja && <Pastilla color={COLOR_SOLICITUD[h.estado] || TONO.neutro} punto>{ESTADO_LABEL[h.estado] || h.estado}</Pastilla>)}
            </div>
        );
    };

    return (
        <div className="ai-content">
            <EncabezadoVista
                icono={Clock3}
                titulo="Horas extra"
                subtitulo={isDirectorOperaciones ? 'Las solicitas para tu equipo y las aprueba tu director' : 'Las solicita tu jefe y las aprueba su director'}
            >
                {isDirectorOperaciones && (
                    <>
                        {/* Masiva en Excel para todo el equipo (§91). */}
                        <button type="button" className="ai-monitor-btn" onClick={() => { setAviso(null); setModalExcel(true); }}>
                            <FileSpreadsheet size={15} strokeWidth={2} /> Solicitar en Excel
                        </button>
                        <button type="button" className="ai-monitor-btn" onClick={() => { setAviso(null); setModal(true); }}>
                            <Plus size={15} strokeWidth={2} /> Solicitar horas extra
                        </button>
                    </>
                )}
            </EncabezadoVista>

            {mensaje && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{mensaje}</p>}
            {aviso && (
                <div className="ai-row" role="status" style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 14 }}>
                    <Check size={16} strokeWidth={1.75} />
                    <span style={{ fontSize: 13 }}>{aviso}</span>
                </div>
            )}

            {/* Cada mosaico filtra la lista por su estado. */}
            <Mosaicos>
                <Mosaico color={COLOR_SOLICITUD.pendiente} icono={Clock3} valor={kpis.pendientes} label="Pendientes"
                    activo={estado === 'pendiente'} onClick={() => setEstado('pendiente')} title="Ver las pendientes" />
                <Mosaico color={COLOR_SOLICITUD.aprobada} icono={CheckCircle2} valor={kpis.aprobadas} label="Aprobadas"
                    activo={estado === 'aprobada'} onClick={() => setEstado('aprobada')} title="Ver las aprobadas" />
                <Mosaico color={TONO.cian} icono={CheckCircle2} valor={formatearDuracion(kpis.aprobadasMes)} label="Aprobadas este mes" />
                <Mosaico color={COLOR_SOLICITUD.rechazada} icono={XCircle} valor={kpis.rechazadas} label="Rechazadas"
                    activo={estado === 'rechazada'} onClick={() => setEstado('rechazada')} title="Ver las rechazadas" />
            </Mosaicos>

            {tabs.length > 0 && (
                <BarraFiltros>
                    <div className="ai-seg" role="tablist" aria-label="Bandeja">
                        {tabs.map((t) => (
                            <span key={t.id} role="tab" tabIndex={0} aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''}
                                style={{ cursor: 'pointer' }} onClick={() => setTab(t.id)}
                                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setTab(t.id); }}>
                                <t.icono size={14} strokeWidth={1.9} /> {t.label} <span className="ai-count">{t.count}</span>
                            </span>
                        ))}
                    </div>
                </BarraFiltros>
            )}

            {visibles.length === 0 ? (
                <VistaVacia icono={Clock3}>
                    {!isDirectorOperaciones && estado === 'pendiente' && propias.length === 0
                        ? 'No tienes horas extra. Las solicita tu jefe y te llega un aviso cuando se aprueban.'
                        : 'No hay horas extra con este filtro.'}
                </VistaVacia>
            ) : (
                <PanelVista
                    icono={Clock3}
                    titulo={`${isDirectorOperaciones ? (tab === 'bandeja' ? 'Por aprobar' : 'Mis solicitudes') : 'Mis horas extra'} · ${(ESTADO_LABEL[estado] || '').toLowerCase()}s (${visibles.length})`}
                >
                    {visibles.map(fila)}
                </PanelVista>
            )}

            {modalExcel && (
                <HorasExtraExcelModal
                    onClose={() => setModalExcel(false)}
                    onEnviada={async (data) => {
                        setModalExcel(false);
                        setTab('mias');
                        setEstado('pendiente');
                        setAviso(`Se enviaron ${data?.enviadas ?? 0} horas extra de ${data?.personas ?? 0} personas (${data?.horas ?? ''})${data?.aprobador ? ` a ${nombrePropio(data.aprobador)}` : ''}. Te llegará un aviso cuando las responda.`);
                        await cargar();
                    }}
                />
            )}

            {modal && (
                <ModalSolicitud
                    onCerrar={() => setModal(false)}
                    onEnviada={async (data) => {
                        setModal(false);
                        setTab('mias');
                        setEstado('pendiente');
                        setAviso(`Solicitud enviada${data?.aprobador ? ` a ${nombrePropio(data.aprobador)}` : ''}. Te llegará un aviso cuando la responda.`);
                        await cargar();
                    }}
                />
            )}
        </div>
    );
};

export default HorasExtra;
