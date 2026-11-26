import React from 'react';
import { Send, CheckCircle2, XCircle, Clock3, CalendarClock } from 'lucide-react';
import { nombrePropio } from '../../utils/formatoRRHH';
import { PanelVista, Pastilla, COLOR_SOLICITUD, TONO } from '../ui';
import { TIPO_NOVEDAD, ESTADO_NOVEDAD, instante, tiempoEntre } from '../../utils/novedadAsistencia';

// Traza de una novedad de asistencia —cambio de turno, intercambio o libre— (asistencia.md §86), como la de la
// hora extra: cuándo se envió y quién la pidió, a quién le llegó y cuándo y quién la aprobó o rechazó. La usan
// la pantalla de novedades (CambiosTurno) y la trazabilidad del día.

const Paso = ({ icono, color, titulo, cuando, detalle }) => (
    <div className="ai-row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span style={{ color, marginTop: 1 }}>{React.createElement(icono, { size: 16, strokeWidth: 1.9 })}</span>
        <div style={{ fontSize: 13 }}>
            <div><strong>{titulo}</strong>{cuando && <span className="ai-muted"> · {cuando}</span>}</div>
            {detalle && <div className="ai-muted" style={{ fontSize: 12 }}>{detalle}</div>}
        </div>
    </div>
);

/** Los pasos de la solicitud `s` (forma de /cambios-turno o de `novedades_asistencia` de la trazabilidad). */
export const TrazaSolicitud = ({ s }) => (
    <div className="ai-stack" style={{ gap: 8, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <Paso
            icono={Send} color="var(--primary)"
            titulo={`Enviada por ${nombrePropio(s.solicitante)}`} cuando={instante(s.creado_en)}
            detalle={`Le llegó a ${nombrePropio(s.aprobador)}${s.motivo ? ` · Motivo: ${s.motivo}` : ''}`}
        />
        {s.estado === 'pendiente' && (
            <Paso icono={Clock3} color="#f59e0b" titulo={`Pendiente de ${nombrePropio(s.aprobador)}`}
                cuando={`hace ${tiempoEntre(s.creado_en, new Date())}`} />
        )}
        {s.estado === 'aprobada' && (
            <Paso icono={CheckCircle2} color="var(--success)" titulo={`Aprobada por ${nombrePropio(s.resuelto_por)}`}
                cuando={instante(s.resuelta_en)}
                detalle={[`Respondida ${tiempoEntre(s.creado_en, s.resuelta_en)} después de enviada`, s.comentario && `"${s.comentario}"`].filter(Boolean).join(' · ')} />
        )}
        {s.estado === 'rechazada' && (
            <Paso icono={XCircle} color="var(--danger)" titulo={`Rechazada por ${nombrePropio(s.resuelto_por)}`}
                cuando={instante(s.resuelta_en)}
                detalle={`Motivo: ${s.motivo_rechazo} · respondida ${tiempoEntre(s.creado_en, s.resuelta_en)} después de enviada`} />
        )}
    </div>
);

const hhmm = (h) => (h ? String(h).slice(0, 5) : '');
const turnoDe = (descanso, entrada, salida) => (descanso ? 'Descanso' : `${hhmm(entrada)}–${hhmm(salida)}`);

/** Panel de la trazabilidad del día: las novedades de asistencia que tocan ese día, con su traza. */
export const NovedadesAsistenciaDia = ({ novedades }) => {
    if (!novedades?.length) return null;
    return (
        <PanelVista icono={CalendarClock} titulo="Novedades de asistencia del día">
            <div className="ai-stack" style={{ padding: 16, gap: 12 }}>
                {novedades.map((n) => (
                    <div key={n.id} className="ai-stack" style={{ gap: 6 }}>
                        <div className="ai-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 14 }}>{TIPO_NOVEDAD[n.tipo] || n.tipo} · #{n.id}</strong>
                            <Pastilla color={COLOR_SOLICITUD[n.estado] || TONO.neutro} punto>{ESTADO_NOVEDAD[n.estado] || n.estado}</Pastilla>
                            <span className="ai-muted" style={{ fontSize: 13 }}>
                                {n.tipo === 'libre'
                                    ? `Turno ${n.anterior_hora_entrada == null ? 'sin horario' : turnoDe(n.anterior_es_descanso, n.anterior_hora_entrada, n.anterior_hora_salida)} → Libre`
                                    : `Turno ${n.anterior_hora_entrada == null ? 'sin horario' : turnoDe(n.anterior_es_descanso, n.anterior_hora_entrada, n.anterior_hora_salida)} → ${turnoDe(n.es_descanso, n.hora_entrada, n.hora_salida)}`}
                            </span>
                        </div>
                        <TrazaSolicitud s={n} />
                    </div>
                ))}
            </div>
        </PanelVista>
    );
};
