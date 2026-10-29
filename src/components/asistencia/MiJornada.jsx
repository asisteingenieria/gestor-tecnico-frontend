import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useJornada } from '../../hooks/useJornada';
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

    return (
        <div className="ai-content" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Hola, {primerNombre}</h1>
                    {jornada && <p className="ai-page-sub">{fechaLarga} · {turnoTexto}</p>}
                </div>
            </div>

            {error && (
                <div className="ai-row" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <AlertCircle size={16} strokeWidth={1.75} />
                    <span style={{ fontSize: 13 }}>{error}</span>
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

        </div>
    );
};

export default MiJornada;
