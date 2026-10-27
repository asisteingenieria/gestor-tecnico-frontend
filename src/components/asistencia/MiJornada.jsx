import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Clock3, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useJornada } from '../../hooks/useJornada';
import { asistenciaService } from '../../services/api';
import { formatearFecha } from '../../utils/fecha';
import { formatearHoraTime12, formatearHora12 } from '../../utils/tiempoAsistencia';
import ContadorJornada from './ContadorJornada';
import TarjetaPausa from './TarjetaPausa';
import BotonesPausa from './BotonesPausa';
import { ResumenAsislock } from './IngresoAsislock';

const MiJornada = () => {
    const { user } = useAuth();
    const {
        jornada, loading, error,
        segundosTrabajadosHoy, segundosEnJornada, segundosParaHabilitarSalida, pausaSegundosTranscurridos,
        iniciarPausa, finalizarPausa, marcarSalida
    } = useJornada();

    const [mostrarModalExtra, setMostrarModalExtra] = useState(false);
    const [formExtra, setFormExtra] = useState({ inicio: '', fin: '', motivo: '' });
    const [enviandoExtra, setEnviandoExtra] = useState(false);
    const [mensajeExtra, setMensajeExtra] = useState(null);
    // Confirmación en la página, no dentro del modal: el modal se cierra al enviar.
    const [avisoExtra, setAvisoExtra] = useState(null);

    useEffect(() => {
        if (!avisoExtra) return undefined;
        const id = setTimeout(() => setAvisoExtra(null), 6000);
        return () => clearTimeout(id);
    }, [avisoExtra]);

    const solicitarExtra = async (e) => {
        e.preventDefault();
        setEnviandoExtra(true);
        setMensajeExtra(null);
        try {
            await asistenciaService.solicitarHoraExtra({
                fecha: jornada.fecha,
                hora_inicio: formExtra.inicio,
                hora_fin: formExtra.fin,
                motivo: formExtra.motivo || undefined
            });
            setFormExtra({ inicio: '', fin: '', motivo: '' });
            setMostrarModalExtra(false);
            setAvisoExtra('Solicitud de hora extra enviada. Queda pendiente hasta que tu jefe la apruebe.');
        } catch (err) {
            setMensajeExtra({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo enviar la solicitud' });
        } finally {
            setEnviandoExtra(false);
        }
    };

    if (loading) {
        return (
            <div className="ai-content">
                <div className="ai-panel" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={28} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            </div>
        );
    }

    const primerNombre = (user?.full_name || user?.fullName || '').trim().split(/\s+/)[0] || '';
    const fechaLargaCruda = jornada ? formatearFecha(jornada.fecha, { weekday: 'long', day: 'numeric', month: 'long' }) : '';
    const fechaLarga = fechaLargaCruda ? fechaLargaCruda[0].toUpperCase() + fechaLargaCruda.slice(1) : '';
    const horario = jornada?.horario;
    const turnoTexto = horario
        ? `Turno ${horario.plantilla ? `${horario.plantilla} · ` : ''}${formatearHoraTime12(horario.hora_entrada)} – ${formatearHoraTime12(horario.hora_salida)}`
        : 'Sin horario asignado hoy';

    const puedeSolicitarExtra = jornada && jornada.estado !== 'pendiente' && !jornada.pausa_activa;

    return (
        <div className="ai-content" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Hola, {primerNombre}</h1>
                    {jornada && <p className="ai-page-sub">{fechaLarga} · {turnoTexto}</p>}
                </div>
                {puedeSolicitarExtra && (
                    <button type="button" className="ai-link" onClick={() => setMostrarModalExtra(true)} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
                        <Clock3 size={14} strokeWidth={1.75} /> Solicitar hora extra
                    </button>
                )}
            </div>

            {error && (
                <div className="ai-row" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <AlertCircle size={16} strokeWidth={1.75} />
                    <span style={{ fontSize: 13 }}>{error}</span>
                </div>
            )}

            {avisoExtra && (
                <div className="ai-row" role="status" style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <Check size={16} strokeWidth={1.75} />
                    <span style={{ fontSize: 13 }}>{avisoExtra}</span>
                </div>
            )}

            <ResumenAsislock resumen={jornada?.asislock} />

            {jornada?.desconexion_activa && (
                <div className="ai-row" style={{ background: 'var(--warning-soft)', color: 'var(--warning)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <AlertCircle size={16} strokeWidth={1.75} />
                    <span style={{ fontSize: 13 }}>
                        Cerraste sesión en AsisLock a las {formatearHora12(jornada.desconexion_activa.desde)}.
                        {horario
                            ? ` La jornada sigue corriendo hasta tu salida (${formatearHoraTime12(horario.hora_salida)}), pero como tiempo desconectado: no cuenta como laborado hasta que vuelvas a iniciar sesión allí.`
                            : ' Como no tienes horario asignado hoy, la jornada queda detenida ahí hasta que vuelvas a iniciar sesión.'}
                    </span>
                </div>
            )}

            {jornada?.pausa_activa ? (
                <TarjetaPausa jornada={jornada} pausaSegundosTranscurridos={pausaSegundosTranscurridos} onFinalizarPausa={finalizarPausa} />
            ) : (
                <>
                    <ContadorJornada jornada={jornada} segundosTrabajadosHoy={segundosTrabajadosHoy} segundosEnJornada={segundosEnJornada} />
                    <BotonesPausa
                        jornada={jornada}
                        segundosParaHabilitarSalida={segundosParaHabilitarSalida}
                        onIniciarPausa={iniciarPausa}
                        onMarcarSalida={marcarSalida}
                    />
                </>
            )}

            {mostrarModalExtra && (
                <div className="ai-overlay" onClick={() => setMostrarModalExtra(false)}>
                    <div className="ai-modal ai-modal--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="ai-modal-head">
                            <span className="ai-modal-icon"><Clock3 size={20} strokeWidth={1.75} /></span>
                            <div>
                                <h3 className="ai-modal-title">Solicitar hora extra</h3>
                                <p className="ai-modal-sub">Para hoy · queda pendiente de aprobación de tu jefe</p>
                            </div>
                            <button type="button" className="ai-icon-btn" onClick={() => setMostrarModalExtra(false)} aria-label="Cerrar">
                                <X size={18} strokeWidth={1.75} />
                            </button>
                        </div>
                        <form onSubmit={solicitarExtra}>
                            <div className="ai-modal-body ai-stack">
                                <div className="ai-form-grid">
                                    <div className="ai-field">
                                        <label className="ai-label">Hora inicio <em>*</em></label>
                                        <input
                                            type="time" required className="ai-input"
                                            value={formExtra.inicio}
                                            onChange={(e) => setFormExtra({ ...formExtra, inicio: e.target.value })}
                                        />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Hora fin <em>*</em></label>
                                        <input
                                            type="time" required className="ai-input"
                                            value={formExtra.fin}
                                            onChange={(e) => setFormExtra({ ...formExtra, fin: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <p className="ai-help">La clase (diurna, nocturna, festiva…) la determina el sistema; tu jefe la confirma al aprobar.</p>
                                <div className="ai-field">
                                    <label className="ai-label">Motivo (opcional)</label>
                                    <textarea
                                        className="ai-input"
                                        style={{ height: 'auto', padding: '10px 12px' }}
                                        rows={3}
                                        value={formExtra.motivo}
                                        onChange={(e) => setFormExtra({ ...formExtra, motivo: e.target.value })}
                                    />
                                </div>
                                {mensajeExtra && (
                                    <p className="ai-help" style={{ color: mensajeExtra.tipo === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
                                        {mensajeExtra.texto}
                                    </p>
                                )}
                            </div>
                            <div className="ai-modal-foot">
                                <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setMostrarModalExtra(false)}>Cancelar</button>
                                <button type="submit" className="ai-btn ai-btn--primary" disabled={enviandoExtra || !formExtra.inicio || !formExtra.fin || formExtra.inicio === formExtra.fin}>
                                    {enviandoExtra ? 'Enviando...' : 'Enviar solicitud'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MiJornada;
