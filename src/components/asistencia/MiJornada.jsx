import React, { useState } from 'react';
import { AlertCircle, Loader2, Clock3, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useJornada } from '../../hooks/useJornada';
import { asistenciaService } from '../../services/api';
import { formatearFecha } from '../../utils/fecha';
import { formatearHoraTime12 } from '../../utils/tiempoAsistencia';
import ContadorJornada from './ContadorJornada';
import TarjetaPausa from './TarjetaPausa';
import BotonesPausa from './BotonesPausa';

const MiJornada = () => {
    const { user } = useAuth();
    const {
        jornada, loading, error,
        segundosTrabajadosHoy, segundosParaHabilitarSalida, pausaSegundosTranscurridos,
        iniciarPausa, finalizarPausa, marcarSalida
    } = useJornada();

    const [mostrarModalExtra, setMostrarModalExtra] = useState(false);
    const [formExtra, setFormExtra] = useState({ minutos_estimados: '', motivo: '' });
    const [enviandoExtra, setEnviandoExtra] = useState(false);
    const [mensajeExtra, setMensajeExtra] = useState(null);

    const solicitarExtra = async (e) => {
        e.preventDefault();
        setEnviandoExtra(true);
        setMensajeExtra(null);
        try {
            await asistenciaService.solicitarHoraExtra({
                fecha: jornada.fecha,
                minutos_estimados: Number(formExtra.minutos_estimados),
                motivo: formExtra.motivo || undefined
            });
            setMensajeExtra({ tipo: 'ok', texto: 'Solicitud enviada al director.' });
            setFormExtra({ minutos_estimados: '', motivo: '' });
            setTimeout(() => { setMostrarModalExtra(false); setMensajeExtra(null); }, 1200);
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
        ? `Turno ${formatearHoraTime12(horario.hora_entrada)} – ${formatearHoraTime12(horario.hora_salida)}`
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

            {jornada?.pausa_activa ? (
                <TarjetaPausa jornada={jornada} pausaSegundosTranscurridos={pausaSegundosTranscurridos} onFinalizarPausa={finalizarPausa} />
            ) : (
                <>
                    <ContadorJornada jornada={jornada} segundosTrabajadosHoy={segundosTrabajadosHoy} />
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
                                <p className="ai-modal-sub">Para hoy · queda pendiente de aprobación del director</p>
                            </div>
                            <button type="button" className="ai-icon-btn" onClick={() => setMostrarModalExtra(false)} aria-label="Cerrar">
                                <X size={18} strokeWidth={1.75} />
                            </button>
                        </div>
                        <form onSubmit={solicitarExtra}>
                            <div className="ai-modal-body ai-stack">
                                <div className="ai-field">
                                    <label className="ai-label">Minutos estimados <em>*</em></label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        className="ai-input"
                                        value={formExtra.minutos_estimados}
                                        onChange={(e) => setFormExtra({ ...formExtra, minutos_estimados: e.target.value })}
                                    />
                                </div>
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
                                <button type="submit" className="ai-btn ai-btn--primary" disabled={enviandoExtra}>
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
