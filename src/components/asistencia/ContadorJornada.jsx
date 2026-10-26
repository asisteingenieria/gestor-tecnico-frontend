import React from 'react';
import { formatearHora12, formatearHoraTime12, formatearDuracion, minutosDesdeMedianoche } from '../../utils/tiempoAsistencia';

const RADIO = 104;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

const ESTADO_BADGE = {
    pendiente: { label: 'Sin iniciar', clase: 'ai-badge--neutral' },
    en_curso: { label: 'En turno', clase: 'ai-badge--success' },
    en_pausa: { label: 'En pausa', clase: 'ai-badge--info' },
    finalizada: { label: 'Jornada finalizada', clase: 'ai-badge--neutral' },
    ausente: { label: 'Ausente', clase: 'ai-badge--danger' }
};

// Combina la fecha laboral (Bogotá) con una hora TIME de horario (también Bogotá, UTC-5 fijo)
// para obtener el instante UTC comparable contra jornada.servidor_ahora. Bogotá no tiene
// horario de verano, así que el offset +5 es constante todo el año.
function instanteBogota(fechaISO, horaTime) {
    if (!fechaISO || !horaTime) return null;
    const [y, m, d] = fechaISO.slice(0, 10).split('-').map(Number);
    const [hh, mm, ss] = horaTime.split(':').map(Number);
    return Date.UTC(y, m - 1, d, hh + 5, mm, ss || 0);
}

// El reloj grande es el tiempo EN JORNADA (desde la entrada, pausas incluidas), para que al volver
// de un break siga desde donde iba; el laborado y cada estado van en el desglose de la derecha.
const ContadorJornada = ({ jornada, segundosTrabajadosHoy, segundosEnJornada }) => {
    if (!jornada) return null;

    const badge = ESTADO_BADGE[jornada.estado] || ESTADO_BADGE.pendiente;
    const horario = jornada.horario;
    const turnoMin = horario ? minutosDesdeMedianoche(horario.hora_salida) - minutosDesdeMedianoche(horario.hora_entrada) : null;

    const minutosTrabajados = Math.floor(Math.max(0, segundosTrabajadosHoy || 0) / 60);
    const segundos = Math.max(0, segundosEnJornada ?? segundosTrabajadosHoy ?? 0);
    const minutosJornada = Math.floor(segundos / 60);
    const horas = Math.floor(minutosJornada / 60);
    const minutosResto = minutosJornada % 60;
    const segundosResto = segundos % 60;

    const minutosPausas = (jornada.minutos_pausa_bano || 0) + (jornada.minutos_break || 0) + (jornada.minutos_pausa_almuerzo || 0);
    const pctTrabajo = turnoMin ? Math.min(100, (minutosTrabajados / turnoMin) * 100) : 0;
    const pctPausa = turnoMin ? Math.max(0, Math.min(100 - pctTrabajo, (minutosPausas / turnoMin) * 100)) : 0;
    const largoTrabajo = (pctTrabajo / 100) * CIRCUNFERENCIA;
    const largoPausa = (pctPausa / 100) * CIRCUNFERENCIA;

    const horaEntradaReal = formatearHora12(jornada.hora_entrada_real);
    const horaSalidaProgramada = horario ? formatearHoraTime12(horario.hora_salida) : null;

    const salidaInstante = horario ? instanteBogota(jornada.fecha, horario.hora_salida) : null;
    const msHastaSalida = salidaInstante ? salidaInstante - new Date(jornada.servidor_ahora).getTime() : null;
    const faltanTexto = msHastaSalida != null && msHastaSalida > 0
        ? `en ${formatearDuracion(msHastaSalida / 60000)}`
        : null;

    return (
        <div className="ai-panel ai-clock">
            <div className="ai-clock-top">
                <span className={`ai-badge ${badge.clase}`}>{badge.label}</span>
                {horaEntradaReal && <span className="ai-muted" style={{ fontSize: 13 }}>Entrada {horaEntradaReal}</span>}
            </div>

            <div className="ai-clock-main">
                <div className="ai-ring">
                    <svg viewBox="0 0 236 236">
                        <circle className="trk" cx="118" cy="118" r={RADIO} fill="none" strokeWidth="14" />
                        <circle
                            className="val" cx="118" cy="118" r={RADIO} fill="none" strokeWidth="14"
                            strokeLinecap="round"
                            strokeDasharray={`${largoTrabajo} ${CIRCUNFERENCIA - largoTrabajo}`}
                        />
                        {largoPausa > 0 && (
                            <circle
                                className="pau" cx="118" cy="118" r={RADIO} fill="none" strokeWidth="14"
                                strokeLinecap="round"
                                strokeDasharray={`${largoPausa} ${CIRCUNFERENCIA - largoPausa}`}
                                strokeDashoffset={-largoTrabajo}
                            />
                        )}
                    </svg>
                    <div className="ai-ring-in">
                        <span className="ai-overline">TIEMPO EN JORNADA</span>
                        <div className="ai-timer">
                            {horas}:{String(minutosResto).padStart(2, '0')}
                            <small>:{String(segundosResto).padStart(2, '0')}</small>
                        </div>
                        {turnoMin != null && (
                            <span className="ai-muted" style={{ fontSize: 13 }}>
                                de {formatearDuracion(turnoMin)} · {Math.min(100, Math.round((minutosJornada / turnoMin) * 100))}%
                            </span>
                        )}
                    </div>
                </div>

                <dl className="ai-clock-facts">
                    <div className="ai-fact">
                        <dt>Entrada</dt>
                        <dd>
                            {horaEntradaReal || '—'}
                            {jornada.hora_entrada_real && (
                                jornada.minutos_tarde > 0
                                    ? <span style={{ color: 'var(--warning)' }}> +{jornada.minutos_tarde} min</span>
                                    : <span style={{ color: 'var(--success)' }}> Puntual</span>
                            )}
                        </dd>
                    </div>
                    <div className="ai-fact">
                        <dt>Salida programada</dt>
                        <dd>
                            {horaSalidaProgramada || '—'}
                            {faltanTexto && <span> {faltanTexto}</span>}
                        </dd>
                    </div>
                    <div className="ai-fact">
                        <dt>Laborado</dt>
                        <dd>{formatearDuracion(minutosTrabajados)}</dd>
                    </div>
                    {(jornada.minutos_desconexion || 0) > 0 && (
                        <div className="ai-fact">
                            <dt>Desconectado</dt>
                            <dd>{formatearDuracion(jornada.minutos_desconexion)}</dd>
                        </div>
                    )}
                    <div className="ai-fact">
                        <dt>Baño hoy</dt>
                        <dd>{formatearDuracion(jornada.minutos_pausa_bano)}</dd>
                    </div>
                    <div className="ai-fact">
                        <dt>Break hoy</dt>
                        <dd>{formatearDuracion(jornada.minutos_break)}</dd>
                    </div>
                    <div className="ai-fact">
                        <dt>Capacitación</dt>
                        <dd>{formatearDuracion(jornada.minutos_capacitacion)}</dd>
                    </div>
                    <div className="ai-fact">
                        <dt>Almuerzo</dt>
                        <dd>
                            {jornada.minutos_pausa_almuerzo || 0}
                            {horario?.minutos_almuerzo != null && <span> / {horario.minutos_almuerzo}</span>} min
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    );
};

export default ContadorJornada;
