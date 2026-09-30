import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, Clock3, Check, X, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { asistenciaService } from '../../services/api';
import { formatearFecha } from '../../utils/fecha';
import { formatearDuracion } from '../../utils/tiempoAsistencia';
import { nombrePropio, iniciales } from '../../utils/formatoRRHH';

const ESTADO_BADGE = {
    pendiente: { label: 'Pendiente', clase: 'ai-badge--info' },
    aprobada: { label: 'Aprobada', clase: 'ai-badge--success' },
    rechazada: { label: 'Rechazada', clase: 'ai-badge--danger' },
    cancelada: { label: 'Cancelada', clase: 'ai-badge--neutral' }
};

const TABS = [
    { id: 'pendiente', label: 'Por aprobar' },
    { id: 'aprobada', label: 'Aprobadas' },
    { id: 'rechazada', label: 'Rechazadas' }
];

function esDelMesActual(fechaIso) {
    // hora_extra.fecha llega como fila cruda de la BD (Date -> ISO con hora), no como
    // "YYYY-MM-DD" puro; new Date() ya lo parsea bien sin concatenar hora otra vez.
    const f = new Date(fechaIso);
    const hoy = new Date();
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
}

function horaAminutos(hora) {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

// Sirve tanto para el empleado (solo ve "Mis solicitudes") como para el director
// (además ve y resuelve la bandeja de su equipo) — una sola pantalla, dos vistas.
const HorasExtra = () => {
    const { isDirectorOperaciones } = useAuth();
    const [misSolicitudes, setMisSolicitudes] = useState([]);
    const [bandeja, setBandeja] = useState([]);
    const [equipo, setEquipo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState(null);
    const [procesando, setProcesando] = useState(null);
    const [tab, setTab] = useState('pendiente');

    const [aprobandoId, setAprobandoId] = useState(null);
    const [minutosAprobar, setMinutosAprobar] = useState('');
    const [rechazandoId, setRechazandoId] = useState(null);
    const [comentarioRechazo, setComentarioRechazo] = useState('');

    const [modalSolicitud, setModalSolicitud] = useState(false);
    const [formSolicitud, setFormSolicitud] = useState({ fecha: new Date().toISOString().slice(0, 10), inicio: '', fin: '', motivo: '' });
    const [enviando, setEnviando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const promesas = [asistenciaService.getMisHorasExtra()];
            if (isDirectorOperaciones) {
                promesas.push(asistenciaService.getBandejaHorasExtra());
                promesas.push(asistenciaService.getEquipo());
            }
            const resultados = await Promise.all(promesas);
            setMisSolicitudes(resultados[0].data);
            if (isDirectorOperaciones) {
                setBandeja(resultados[1].data);
                setEquipo(resultados[2].data);
            }
        } catch (err) {
            setMensaje(err.response?.data?.message || 'No se pudo cargar la información');
        } finally {
            setLoading(false);
        }
    }, [isDirectorOperaciones]);

    useEffect(() => { cargar(); }, [cargar]);

    const empleadoDe = (usersCompanyId) => equipo.find((e) => e.users_company_id === usersCompanyId);

    const bandejaFiltrada = useMemo(() => bandeja.filter((h) => h.estado === tab), [bandeja, tab]);

    const kpis = useMemo(() => {
        const fuente = isDirectorOperaciones ? bandeja : misSolicitudes;
        return {
            pendientes: fuente.filter((h) => h.estado === 'pendiente').length,
            aprobadasMes: fuente.filter((h) => h.estado === 'aprobada' && esDelMesActual(h.fecha)).reduce((acc, h) => acc + (h.minutos_aprobados || 0), 0),
            rechazadas: fuente.filter((h) => h.estado === 'rechazada').length
        };
    }, [bandeja, misSolicitudes, isDirectorOperaciones]);

    const confirmarAprobacion = async (id) => {
        if (minutosAprobar === '') return;
        setProcesando(id);
        try {
            await asistenciaService.aprobarHoraExtra(id, { minutos_aprobados: Number(minutosAprobar) });
            setAprobandoId(null);
            setMinutosAprobar('');
            await cargar();
        } catch (err) {
            setMensaje(err.response?.data?.message || 'No se pudo aprobar');
        } finally {
            setProcesando(null);
        }
    };

    const confirmarRechazo = async (id) => {
        setProcesando(id);
        try {
            await asistenciaService.rechazarHoraExtra(id, { comentario: comentarioRechazo || undefined });
            setRechazandoId(null);
            setComentarioRechazo('');
            await cargar();
        } catch (err) {
            setMensaje(err.response?.data?.message || 'No se pudo rechazar');
        } finally {
            setProcesando(null);
        }
    };

    const minutosSolicitud = formSolicitud.inicio && formSolicitud.fin
        ? Math.max(0, horaAminutos(formSolicitud.fin) - horaAminutos(formSolicitud.inicio))
        : 0;

    const enviarSolicitud = async (e) => {
        e.preventDefault();
        setEnviando(true);
        setMensaje(null);
        try {
            await asistenciaService.solicitarHoraExtra({
                fecha: formSolicitud.fecha,
                minutos_estimados: minutosSolicitud,
                motivo: formSolicitud.motivo
            });
            setModalSolicitud(false);
            setFormSolicitud({ fecha: new Date().toISOString().slice(0, 10), inicio: '', fin: '', motivo: '' });
            await cargar();
        } catch (err) {
            setMensaje(err.response?.data?.message || 'No se pudo enviar la solicitud');
        } finally {
            setEnviando(false);
        }
    };

    if (loading) {
        return (
            <div className="ai-content">
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Horas extra</h1>
                    <p className="ai-page-sub">Solicitudes y aprobaciones</p>
                </div>
                <button type="button" className="ai-btn ai-btn--primary" onClick={() => setModalSolicitud(true)}>
                    <Plus size={16} strokeWidth={1.75} /> Solicitar hora extra
                </button>
            </div>

            {mensaje && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{mensaje}</p>}

            <div className="ai-kpi-strip">
                <div>
                    <span className="ai-kpi-icon"><Clock3 size={16} strokeWidth={1.75} /></span>
                    <span><span className="ai-kpi-label">Pendientes</span><div className="ai-kpi-value">{kpis.pendientes}</div></span>
                </div>
                <div>
                    <span><span className="ai-kpi-label">Aprobadas este mes</span><div className="ai-kpi-value">{formatearDuracion(kpis.aprobadasMes)}</div></span>
                </div>
                <div>
                    <span><span className="ai-kpi-label">Rechazadas</span><div className="ai-kpi-value">{kpis.rechazadas}</div></span>
                </div>
            </div>

            <div className={isDirectorOperaciones ? 'ai-grid-2' : ''}>
                {isDirectorOperaciones && (
                    <div className="ai-panel">
                        <div className="ai-tabs">
                            {TABS.map((t) => (
                                <button
                                    key={t.id} type="button" className={`ai-tab ${tab === t.id ? 'is-active' : ''}`}
                                    style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setTab(t.id)}
                                >
                                    {t.label}
                                    <span className="ai-count">{bandeja.filter((h) => h.estado === t.id).length}</span>
                                </button>
                            ))}
                        </div>
                        {bandejaFiltrada.length === 0 ? (
                            <div className="ai-empty">
                                <Clock3 size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                                <p>No hay solicitudes en esta bandeja.</p>
                            </div>
                        ) : bandejaFiltrada.map((h) => {
                            const emp = empleadoDe(h.users_company_id);
                            return (
                                <div key={h.idhora_extra} className="ai-req">
                                    <span className="ai-avatar">{iniciales(emp?.nombre || '?')}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{emp ? nombrePropio(emp.nombre) : `Empleado #${h.users_company_id}`}</div>
                                        <div className="ai-req-meta">
                                            <span>{formatearFecha(h.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                            <span>{formatearDuracion(h.minutos_estimados)} solicitados</span>
                                            {h.tipo === 'asignada' && <span className="ai-badge ai-badge--neutral">Asignada</span>}
                                        </div>
                                        {h.motivo && <q className="ai-muted">{h.motivo}</q>}

                                        {aprobandoId === h.idhora_extra && (
                                            <div className="ai-row" style={{ marginTop: 8 }}>
                                                <input
                                                    type="number" min="1" autoFocus className="ai-input" style={{ width: 100 }}
                                                    value={minutosAprobar} onChange={(e) => setMinutosAprobar(e.target.value)}
                                                />
                                                <button type="button" className="ai-btn ai-btn--sm ai-btn--primary" onClick={() => confirmarAprobacion(h.idhora_extra)} disabled={procesando === h.idhora_extra}>Confirmar</button>
                                                <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => setAprobandoId(null)}>Cancelar</button>
                                            </div>
                                        )}
                                        {rechazandoId === h.idhora_extra && (
                                            <div className="ai-row" style={{ marginTop: 8 }}>
                                                <input
                                                    type="text" autoFocus className="ai-input" placeholder="Motivo (opcional)"
                                                    value={comentarioRechazo} onChange={(e) => setComentarioRechazo(e.target.value)}
                                                />
                                                <button type="button" className="ai-btn ai-btn--sm ai-btn--danger" onClick={() => confirmarRechazo(h.idhora_extra)} disabled={procesando === h.idhora_extra}>Confirmar</button>
                                                <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => setRechazandoId(null)}>Cancelar</button>
                                            </div>
                                        )}
                                    </div>
                                    {h.estado === 'pendiente' && aprobandoId !== h.idhora_extra && rechazandoId !== h.idhora_extra && (
                                        <div className="ai-row">
                                            <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={() => setRechazandoId(h.idhora_extra)}><X size={14} strokeWidth={1.75} /> Rechazar</button>
                                            <button type="button" className="ai-btn ai-btn--sm ai-btn--primary" onClick={() => { setAprobandoId(h.idhora_extra); setMinutosAprobar(String(h.minutos_estimados)); }}><Check size={14} strokeWidth={1.75} /> Aprobar</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="ai-panel">
                    <div className="ai-panel-head"><h3 className="ai-panel-title">Mis solicitudes</h3></div>
                    {misSolicitudes.length === 0 ? (
                        <div className="ai-empty">
                            <Clock3 size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                            <p>Aún no has solicitado horas extra.</p>
                            <button type="button" className="ai-btn ai-btn--primary ai-btn--sm" onClick={() => setModalSolicitud(true)}>Nueva solicitud</button>
                        </div>
                    ) : misSolicitudes.map((h) => {
                        const badge = ESTADO_BADGE[h.estado] || ESTADO_BADGE.cancelada;
                        return (
                            <div key={h.idhora_extra} className="ai-req" style={{ gridTemplateColumns: '1fr auto' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{formatearFecha(h.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                                    <div className="ai-req-meta"><span>{formatearDuracion(h.minutos_estimados)} solicitados</span>{h.minutos_aprobados != null && <span>{formatearDuracion(h.minutos_aprobados)} aprobados</span>}</div>
                                    {h.motivo && <q className="ai-muted">{h.motivo}</q>}
                                </div>
                                <span className={`ai-badge ${badge.clase}`}>{badge.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {modalSolicitud && (
                <div className="ai-overlay" onClick={() => setModalSolicitud(false)}>
                    <div className="ai-modal ai-modal--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="ai-modal-head">
                            <span className="ai-modal-icon"><Clock3 size={20} strokeWidth={1.75} /></span>
                            <div><h3 className="ai-modal-title">Solicitar hora extra</h3><p className="ai-modal-sub">Queda pendiente de aprobación del director</p></div>
                            <button type="button" className="ai-icon-btn" onClick={() => setModalSolicitud(false)} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                        </div>
                        <form onSubmit={enviarSolicitud}>
                            <div className="ai-modal-body ai-stack">
                                <div className="ai-field">
                                    <label className="ai-label">Fecha <em>*</em></label>
                                    <input type="date" required className="ai-input" value={formSolicitud.fecha} onChange={(e) => setFormSolicitud({ ...formSolicitud, fecha: e.target.value })} />
                                </div>
                                <div className="ai-form-grid">
                                    <div className="ai-field">
                                        <label className="ai-label">Hora inicio <em>*</em></label>
                                        <input type="time" required className="ai-input" value={formSolicitud.inicio} onChange={(e) => setFormSolicitud({ ...formSolicitud, inicio: e.target.value })} />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Hora fin <em>*</em></label>
                                        <input type="time" required className="ai-input" value={formSolicitud.fin} onChange={(e) => setFormSolicitud({ ...formSolicitud, fin: e.target.value })} />
                                    </div>
                                </div>
                                <p className="ai-help">Duración: {formatearDuracion(minutosSolicitud)}</p>
                                <div className="ai-field">
                                    <label className="ai-label">Motivo <em>*</em></label>
                                    <textarea required className="ai-input" style={{ height: 'auto', padding: '10px 12px' }} rows={3} value={formSolicitud.motivo} onChange={(e) => setFormSolicitud({ ...formSolicitud, motivo: e.target.value })} />
                                </div>
                            </div>
                            <div className="ai-modal-foot">
                                <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setModalSolicitud(false)}>Cancelar</button>
                                <button type="submit" className="ai-btn ai-btn--primary" disabled={enviando || minutosSolicitud <= 0}>{enviando ? 'Enviando...' : 'Enviar solicitud'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HorasExtra;
