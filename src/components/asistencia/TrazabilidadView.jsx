import React from 'react';
import { Clock, Timer, LogIn, Coffee, Unplug, Activity, Laptop, DoorOpen, CalendarDays, ListOrdered } from 'lucide-react';
import { formatearHora12, formatearDuracion, minutosDesdeMedianoche, minutosBogotaDe } from '../../utils/tiempoAsistencia';
import { tardeExacto } from '../../utils/llegadaAsistencia';
import { RegistrosAsislock } from './IngresoAsislock';
import MarcacionesMolinete from './MarcacionesMolinete';
import { MODALIDAD_INGRESO } from '../../utils/asislock';
import { Mosaicos, Mosaico, PanelVista, Leyenda, Pastilla, CargandoVista, VistaVacia, TONO } from '../ui';

const ETIQUETAS_EVENTO = {
    entrada: 'Entrada',
    salida: 'Salida',
    inicio_bano: 'Inicio baño',
    fin_bano: 'Fin baño',
    inicio_break: 'Inicio break',
    fin_break: 'Fin break',
    inicio_almuerzo: 'Inicio almuerzo',
    fin_almuerzo: 'Fin almuerzo',
    inicio_capacitacion: 'Inicio capacitación',
    fin_capacitacion: 'Fin capacitación',
    inicio_extra: 'Inicio hora extra',
    fin_extra: 'Fin hora extra',
    inicio_desconexion: 'Desconexión (logout AsisLock)',
    fin_desconexion: 'Reconexión (login AsisLock)'
};

const ORIGEN_LABEL = { empleado: 'El empleado', director: 'El director', sistema: 'Cierre automático', asislock: 'AsisLock', molinete: 'Molinete' };

const ESTADO_BADGE = {
    pendiente: { label: 'Sin iniciar', color: 'sin_iniciar' },
    en_curso: { label: 'En turno', color: 'conectado' },
    en_pausa: { label: 'En pausa', color: 'break' },
    finalizada: { label: 'Finalizada', color: 'finalizado' },
    ausente: { label: 'Ausente', color: 'no_llego' }
};

// Break usa el color de pausa (tiempo libre); capacitación el de trabajo (cuenta como laborada).
const TIPOS_PAUSA_INICIO = {
    inicio_bano: { clase: 'pause', label: 'Baño' },
    inicio_break: { clase: 'pause', label: 'Break' },
    inicio_almuerzo: { clase: 'lunch', label: 'Almuerzo' },
    inicio_capacitacion: { clase: 'work', label: 'Capacitación' }
};
const FIN_PAUSA = new Set(['fin_bano', 'fin_break', 'fin_almuerzo', 'fin_capacitacion', 'fin_desconexion']);
const TRABAJO = { clase: 'work', label: 'Trabajo' };

function construirSegmentos(eventos, finAbierto) {
    const segmentos = [];
    let actual = null;
    for (const ev of eventos) {
        if (ev.tipo === 'entrada') {
            actual = { ...TRABAJO, desde: ev.ocurrido_en };
        } else if (TIPOS_PAUSA_INICIO[ev.tipo]) {
            if (actual) segmentos.push({ ...actual, hasta: ev.ocurrido_en });
            actual = { ...TIPOS_PAUSA_INICIO[ev.tipo], desde: ev.ocurrido_en };
        } else if (FIN_PAUSA.has(ev.tipo)) {
            if (actual) segmentos.push({ ...actual, hasta: ev.ocurrido_en });
            actual = { ...TRABAJO, desde: ev.ocurrido_en };
        } else if (ev.tipo === 'inicio_extra') {
            // Hora extra (bloque aparte tras la salida): tiempo trabajado, color de trabajo.
            if (actual) segmentos.push({ ...actual, hasta: ev.ocurrido_en });
            actual = { clase: 'work', label: 'Hora extra', desde: ev.ocurrido_en };
        } else if (ev.tipo === 'fin_extra') {
            if (actual) segmentos.push({ ...actual, hasta: ev.ocurrido_en });
            actual = null;
        } else if (ev.tipo === 'inicio_desconexion') {
            // Desconectado de AsisLock: no es tiempo laborado, queda como hueco en la barra.
            if (actual) segmentos.push({ ...actual, hasta: ev.ocurrido_en });
            actual = null;
        } else if (ev.tipo === 'salida') {
            if (actual) segmentos.push({ ...actual, hasta: ev.ocurrido_en });
            actual = null;
        }
    }
    if (actual && finAbierto) segmentos.push({ ...actual, hasta: finAbierto, enVivo: true });
    return segmentos;
}

function detalleEvento(ev, jornada) {
    if (ev.tipo === 'entrada') {
        return jornada.minutosTarde > 0
            ? <Pastilla color={TONO.alerta}>+{tardeExacto(jornada.segundosTarde, jornada.minutosTarde)} tarde</Pastilla>
            : <Pastilla color={TONO.exito}>Puntual</Pastilla>;
    }
    if (ev.tipo === 'fin_bano' || ev.tipo === 'fin_break' || ev.tipo === 'fin_almuerzo' || ev.tipo === 'fin_capacitacion' || ev.tipo === 'fin_desconexion') {
        return <span className="ai-muted">Regresó {formatearHora12(ev.ocurrido_en)}</span>;
    }
    if (ev.tipo === 'inicio_desconexion') {
        return <Pastilla color={TONO.alerta}>No cuenta como tiempo laborado</Pastilla>;
    }
    if (ev.tipo === 'salida' && jornada.minutosSalidaAnticipada > 0) {
        return <Pastilla color={TONO.alerta}>Salida anticipada</Pastilla>;
    }
    return null;
}

const TrazabilidadView = ({ datos, loading, error, horario, esHoy }) => {
    if (loading) return <CargandoVista />;

    if (error) return <VistaVacia icono={Clock}>{error}</VistaVacia>;

    if (!datos) return null;

    const { jornada, eventos } = datos;
    const horaExtra = datos.hora_extra;
    const asislock = datos.asislock;
    const badge = ESTADO_BADGE[jornada.estado] || ESTADO_BADGE.pendiente;
    const minutosPausas = (jornada.minutosPausaBano || 0) + (jornada.minutosPausaAlmuerzo || 0);

    const finAbierto = esHoy && !jornada.hora_salida_real ? new Date().toISOString() : null;
    const segmentos = construirSegmentos(eventos, finAbierto);

    let ejeMin = 6 * 60;
    let ejeMax = 20 * 60;
    const puntos = eventos.map((e) => minutosBogotaDe(e.ocurrido_en));
    if (horario) {
        puntos.push(minutosDesdeMedianoche(horario.hora_entrada), minutosDesdeMedianoche(horario.hora_salida));
    }
    puntos.forEach((p) => {
        if (p == null) return;
        ejeMin = Math.min(ejeMin, Math.floor(p / 60) * 60);
        ejeMax = Math.max(ejeMax, Math.ceil(p / 60) * 60);
    });
    const rangoEje = ejeMax - ejeMin;

    const pct = (min) => `${Math.max(0, Math.min(100, ((min - ejeMin) / rangoEje) * 100))}%`;

    const marcasEje = [];
    for (let m = ejeMin; m <= ejeMax; m += 120) marcasEje.push(m);


    return (
        <>
            <Mosaicos>
                <Mosaico color={TONO.exito} icono={Timer} valor={formatearDuracion(jornada.minutosTrabajados)} label="Tiempo trabajado" />
                <Mosaico
                    color={!jornada.hora_entrada_real ? TONO.suave : jornada.minutosTarde > 0 ? 'almuerzo' : TONO.info}
                    icono={LogIn}
                    valor={formatearHora12(jornada.hora_entrada_real) || '—'}
                    label={!jornada.hora_entrada_real ? 'Entrada' : jornada.minutosTarde > 0 ? `Entrada · +${tardeExacto(jornada.segundosTarde, jornada.minutosTarde)} tarde` : 'Entrada · puntual'}
                />
                <Mosaico color="break" icono={Coffee} valor={formatearDuracion(minutosPausas)} label="Pausas + almuerzo" />
                {jornada.minutosDesconexion > 0 && (
                    <Mosaico color="desconectado" icono={Unplug} valor={formatearDuracion(jornada.minutosDesconexion)} label="Desconectado de AsisLock" />
                )}
                <Mosaico color={badge.color} icono={Activity} valor={badge.label} label="Estado" />
                {asislock?.resumen && (
                    <Mosaico
                        color={TONO.cian}
                        icono={Laptop}
                        valor={MODALIDAD_INGRESO[asislock.resumen.modalidad]?.label || 'Sin dato'}
                        label={asislock.resumen.modalidades.length > 1 ? 'Ingreso AsisLock · cambió en el día' : 'Ingreso (AsisLock)'}
                    />
                )}
                {datos.molinete?.resumen && (
                    <Mosaico color={TONO.suave} icono={DoorOpen} valor={datos.molinete.resumen.cruces_intermedios} label="Cruces del molinete" />
                )}
            </Mosaicos>

            {jornada.alertas?.length > 0 && (
                <div className="ai-row" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
                    {jornada.alertas.map((a) => (
                        <Pastilla key={a} color={TONO.alerta} punto>{a.replace(/_/g, ' ')}</Pastilla>
                    ))}
                </div>
            )}

            <PanelVista
                icono={CalendarDays}
                titulo="Línea del día"
                extra={<Leyenda enPanel ariaLabel="Colores de la línea" items={[
                    { id: 'trabajo', fondo: 'var(--primary)', label: 'Trabajo' },
                    { id: 'bano', fondo: 'var(--brand-cyan)', label: 'Baño' },
                    { id: 'almuerzo', fondo: 'var(--lunch)', label: 'Almuerzo' }
                ]} />}
            >
                <div className="ai-panel-body">
                    <div className="ai-daybar">
                        {horario && (
                            <div
                                className="shift"
                                style={{
                                    left: pct(minutosDesdeMedianoche(horario.hora_entrada)),
                                    width: `calc(${pct(minutosDesdeMedianoche(horario.hora_salida))} - ${pct(minutosDesdeMedianoche(horario.hora_entrada))})`
                                }}
                                title={`Turno programado · ${horario.hora_entrada.slice(0, 5)}–${horario.hora_salida.slice(0, 5)}`}
                            />
                        )}
                        {segmentos.map((seg, i) => {
                            const desdeMin = minutosBogotaDe(seg.desde);
                            const hastaMin = minutosBogotaDe(seg.hasta);
                            const duracionMin = Math.max(1, hastaMin - desdeMin);
                            return (
                                <div
                                    key={i}
                                    className={`seg ${seg.enVivo ? 'live' : seg.clase}`}
                                    style={{ left: pct(desdeMin), width: `calc(${pct(hastaMin)} - ${pct(desdeMin)})` }}
                                    title={`${seg.label} · ${formatearHora12(seg.desde)}–${formatearHora12(seg.hasta)} · ${formatearDuracion(duracionMin)}`}
                                />
                            );
                        })}
                    </div>
                    <div className="ai-axis">
                        {marcasEje.map((m) => (
                            <span key={m}>{String(Math.floor(m / 60) % 24).padStart(2, '0')}:00</span>
                        ))}
                    </div>
                </div>
            </PanelVista>

            {horaExtra && (
                <PanelVista icono={Clock} titulo="Hora extra">
                    <div className="ai-stack" style={{ padding: '12px 16px', gap: 8 }}>
                        {horaExtra.solicitudes.map((s, i) => (
                            <p key={i} className="ai-muted" style={{ fontSize: 13, margin: 0 }}>
                                Solicitó hora extra de <b>{s.hora_inicio}</b> a <b>{s.hora_fin}</b>
                                {s.aprobado_en && <> · aprobada {new Date(s.aprobado_en).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>}
                            </p>
                        ))}
                        {horaExtra.extra ? (
                            <p style={{ fontSize: 13, margin: 0 }}>
                                Ingresó al tiempo extra a las <b>{formatearHora12(horaExtra.extra.inicio_real)}</b>
                                {horaExtra.extra.en_curso
                                    ? <> y sigue trabajando ({formatearDuracion(horaExtra.extra.minutos)} hasta ahora).</>
                                    : <> hasta las <b>{formatearHora12(horaExtra.extra.fin_real)}</b> ({formatearDuracion(horaExtra.extra.minutos)}).</>}
                                {horaExtra.extra.excedio_min > 0 && (
                                    <>{' '}<Pastilla color={TONO.alerta}>
                                        Siguió {formatearDuracion(horaExtra.extra.excedio_min)} más allá del fin aprobado
                                    </Pastilla></>
                                )}
                            </p>
                        ) : (
                            <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>Aún no registra ingreso al tiempo extra.</p>
                        )}
                    </div>
                </PanelVista>
            )}

            <div className="ai-monitor-detalle-head">
                <h3><ListOrdered size={18} strokeWidth={2} aria-hidden="true" /> Eventos del día</h3>
            </div>
            <div className="ai-monitor-tabla-wrap" style={{ marginBottom: 14 }}>
                <table className="ai-monitor-tabla ai-monitor-tabla--simple">
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Evento</th>
                            <th>Duración</th>
                            <th>Detalle</th>
                            <th>Registrado desde</th>
                        </tr>
                    </thead>
                    <tbody>
                        {eventos.map((ev, i) => {
                            const siguiente = eventos[i + 1];
                            const hastaMin = siguiente ? minutosBogotaDe(siguiente.ocurrido_en) : (finAbierto ? minutosBogotaDe(finAbierto) : null);
                            const desdeMin = minutosBogotaDe(ev.ocurrido_en);
                            const duracion = hastaMin != null ? formatearDuracion(hastaMin - desdeMin) : '—';
                            return (
                                <tr key={i}>
                                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{new Date(ev.ocurrido_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                    <td>
                                        <span className="ai-row" style={{ gap: 8 }}>
                                            <i style={{ width: 8, height: 8, borderRadius: 2, display: 'inline-block', background: 'var(--primary)' }} />
                                            {ETIQUETAS_EVENTO[ev.tipo] || ev.tipo}
                                        </span>
                                    </td>
                                    <td className="ai-num ai-muted">{duracion}</td>
                                    <td>{detalleEvento(ev, jornada)}{ev.nota && <span className="ai-muted" style={{ marginLeft: 6 }}>— {ev.nota}</span>}</td>
                                    <td className="ai-muted">{ORIGEN_LABEL[ev.origen] || ev.origen}</td>
                                </tr>
                            );
                        })}
                        {eventos.length === 0 && (
                            <tr><td colSpan={5} className="ai-muted" style={{ textAlign: 'center', padding: 20 }}>Sin eventos ese día.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <RegistrosAsislock registros={asislock?.registros} />
            <MarcacionesMolinete molinete={datos.molinete} />
        </>
    );
};

export default TrazabilidadView;
