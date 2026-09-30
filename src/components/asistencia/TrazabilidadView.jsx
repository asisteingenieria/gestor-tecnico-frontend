import React from 'react';
import { Loader2, Clock } from 'lucide-react';
import { formatearHora12, formatearDuracion, minutosDesdeMedianoche, minutosBogotaDe } from '../../utils/tiempoAsistencia';

const ETIQUETAS_EVENTO = {
    entrada: 'Entrada',
    salida: 'Salida',
    inicio_bano: 'Inicio baño',
    fin_bano: 'Fin baño',
    inicio_almuerzo: 'Inicio almuerzo',
    fin_almuerzo: 'Fin almuerzo',
    inicio_extra: 'Inicio hora extra',
    fin_extra: 'Fin hora extra'
};

const ORIGEN_LABEL = { empleado: 'El empleado', director: 'El director', sistema: 'Cierre automático' };

const ESTADO_BADGE = {
    pendiente: { label: 'Sin iniciar', clase: 'ai-badge--neutral' },
    en_curso: { label: 'En turno', clase: 'ai-badge--success' },
    en_pausa: { label: 'En pausa', clase: 'ai-badge--info' },
    finalizada: { label: 'Finalizada', clase: 'ai-badge--neutral' },
    ausente: { label: 'Ausente', clase: 'ai-badge--danger' }
};

const TIPOS_PAUSA_INICIO = { inicio_bano: 'pause', inicio_almuerzo: 'lunch' };

function construirSegmentos(eventos, finAbierto) {
    const segmentos = [];
    let actual = null;
    for (const ev of eventos) {
        if (ev.tipo === 'entrada') {
            actual = { tipo: 'work', desde: ev.ocurrido_en };
        } else if (TIPOS_PAUSA_INICIO[ev.tipo]) {
            if (actual) segmentos.push({ ...actual, hasta: ev.ocurrido_en });
            actual = { tipo: TIPOS_PAUSA_INICIO[ev.tipo], desde: ev.ocurrido_en };
        } else if (ev.tipo === 'fin_bano' || ev.tipo === 'fin_almuerzo') {
            if (actual) segmentos.push({ ...actual, hasta: ev.ocurrido_en });
            actual = { tipo: 'work', desde: ev.ocurrido_en };
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
            ? <span className="ai-badge ai-badge--warning">+{jornada.minutosTarde} min tarde</span>
            : <span className="ai-badge ai-badge--success">Puntual</span>;
    }
    if (ev.tipo === 'fin_bano' || ev.tipo === 'fin_almuerzo') {
        return <span className="ai-muted">Regresó {formatearHora12(ev.ocurrido_en)}</span>;
    }
    if (ev.tipo === 'salida' && jornada.minutosSalidaAnticipada > 0) {
        return <span className="ai-badge ai-badge--warning">Salida anticipada</span>;
    }
    return null;
}

const TrazabilidadView = ({ datos, loading, error, horario, esHoy }) => {
    if (loading) {
        return (
            <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="ai-empty">
                <Clock size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                <p>{error}</p>
            </div>
        );
    }

    if (!datos) return null;

    const { jornada, eventos } = datos;
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

    const SEG_CLASE = { work: 'work', pause: 'pause', lunch: 'lunch' };

    return (
        <>
            <div className="ai-kpi-strip">
                <div>
                    <span className="ai-kpi-icon"><Clock size={16} strokeWidth={1.75} /></span>
                    <span>
                        <span className="ai-kpi-label">Tiempo trabajado</span>
                        <div className="ai-kpi-value">{formatearDuracion(jornada.minutosTrabajados)}</div>
                    </span>
                </div>
                <div>
                    <span>
                        <span className="ai-kpi-label">Entrada</span>
                        <div className="ai-kpi-value" style={{ fontSize: 18 }}>
                            {formatearHora12(jornada.hora_entrada_real) || '—'}
                        </div>
                        {jornada.hora_entrada_real && (
                            jornada.minutosTarde > 0
                                ? <span className="ai-badge ai-badge--warning">+{jornada.minutosTarde} min</span>
                                : <span className="ai-badge ai-badge--success">Puntual</span>
                        )}
                    </span>
                </div>
                <div>
                    <span>
                        <span className="ai-kpi-label">Pausas + almuerzo</span>
                        <div className="ai-kpi-value">{formatearDuracion(minutosPausas)}</div>
                    </span>
                </div>
                <div>
                    <span>
                        <span className="ai-kpi-label">Estado</span>
                        <div style={{ marginTop: 4 }}><span className={`ai-badge ${badge.clase}`}>{badge.label}</span></div>
                    </span>
                </div>
            </div>

            {jornada.alertas?.length > 0 && (
                <div className="ai-row">
                    {jornada.alertas.map((a) => (
                        <span key={a} className="ai-badge ai-badge--warning">{a.replace(/_/g, ' ')}</span>
                    ))}
                </div>
            )}

            <div className="ai-panel">
                <div className="ai-panel-head">
                    <h3 className="ai-panel-title">Línea del día</h3>
                    <div className="ai-legend">
                        <span><i style={{ background: 'var(--primary)' }} /> Trabajo</span>
                        <span><i style={{ background: 'var(--brand-cyan)' }} /> Baño</span>
                        <span><i style={{ background: 'var(--lunch)' }} /> Almuerzo</span>
                    </div>
                </div>
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
                                    className={`seg ${seg.enVivo ? 'live' : SEG_CLASE[seg.tipo]}`}
                                    style={{ left: pct(desdeMin), width: `calc(${pct(hastaMin)} - ${pct(desdeMin)})` }}
                                    title={`${seg.tipo === 'work' ? 'Trabajo' : seg.tipo === 'pause' ? 'Baño' : 'Almuerzo'} · ${formatearHora12(seg.desde)}–${formatearHora12(seg.hasta)} · ${formatearDuracion(duracionMin)}`}
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
            </div>

            <div className="ai-panel">
                <table className="ai-table ai-table--dense">
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
                                    <td className="ai-num">{new Date(ev.ocurrido_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
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
        </>
    );
};

export default TrazabilidadView;
