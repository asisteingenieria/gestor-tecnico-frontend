import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CalendarDays, CalendarRange, Moon, Clock, Utensils } from 'lucide-react';
import { EncabezadoVista, Mosaicos, Mosaico, PanelVista, CargandoVista, VistaVacia, TONO } from '../ui';
import { asistenciaService } from '../../services/api';

const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES_LABEL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function hoyIso() { return new Date().toISOString().slice(0, 10); }
function hhmm(t) { return t ? t.slice(0, 5) : ''; }
function aIso(d) { return d.toISOString().slice(0, 10); }
function lunesDe(fecha) {
    const d = new Date(`${fecha}T00:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
}
function sumarDiasLocal(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

const MiHorario = () => {
    const [vista, setVista] = useState('semana');
    const [mesRef, setMesRef] = useState(() => { const d = new Date(); return { anio: d.getFullYear(), mes: d.getMonth() }; });
    const [horarios, setHorarios] = useState([]);
    // Centro de costo y campaña del contrato: los horarios se definen por centro de costo.
    const [contexto, setContexto] = useState({ centro_costo: null, campania: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const semanaInicio = useMemo(() => lunesDe(hoyIso()), []);
    const diasSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDiasLocal(semanaInicio, i)), [semanaInicio]);

    const rango = useMemo(() => {
        if (vista === 'semana') {
            return { desde: aIso(diasSemana[0]), hasta: aIso(diasSemana[6]) };
        }
        const inicio = new Date(mesRef.anio, mesRef.mes, 1);
        const fin = new Date(mesRef.anio, mesRef.mes + 1, 0);
        return { desde: aIso(inicio), hasta: aIso(fin) };
    }, [vista, mesRef, diasSemana]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data } = await asistenciaService.getMiHorario(rango);
                setHorarios(data.horarios);
                setContexto({ centro_costo: data.centro_costo, campania: data.campania });
                setError(null);
            } catch (err) {
                setError(err.response?.data?.message || 'No se pudo cargar tu horario');
            } finally {
                setLoading(false);
            }
        })();
    }, [rango]);

    const mapaHorarios = useMemo(() => {
        const mapa = {};
        horarios.forEach((h) => { mapa[h.fecha.slice(0, 10)] = h; });
        return mapa;
    }, [horarios]);

    const turnoHoy = mapaHorarios[hoyIso()];

    const celdasMes = useMemo(() => {
        const primerDia = new Date(mesRef.anio, mesRef.mes, 1);
        const diasEnMes = new Date(mesRef.anio, mesRef.mes + 1, 0).getDate();
        const offset = (primerDia.getDay() + 6) % 7;
        const celdas = Array.from({ length: offset }, () => null);
        for (let d = 1; d <= diasEnMes; d++) {
            const fecha = aIso(new Date(mesRef.anio, mesRef.mes, d));
            celdas.push({ dia: d, fecha });
        }
        return celdas;
    }, [mesRef]);

    return (
        <div className="ai-content">
            <EncabezadoVista
                icono={CalendarClock}
                titulo="Mi horario"
                subtitulo={`Tu turno asignado${contexto.centro_costo ? ` · Centro de costo ${contexto.centro_costo}` : ''}${contexto.campania ? ` · ${contexto.campania}` : ''}`}
            >
                <div className="ai-seg" role="tablist" aria-label="Vista">
                    {[['semana', 'Semana', CalendarDays], ['mes', 'Mes', CalendarRange]].map(([v, label, icono]) => (
                        <span key={v} role="tab" tabIndex={0} aria-selected={vista === v} className={vista === v ? 'is-active' : ''}
                            style={{ cursor: 'pointer' }} onClick={() => setVista(v)}
                            onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setVista(v); }}>
                            {React.createElement(icono, { size: 14, strokeWidth: 1.9 })} {label}
                        </span>
                    ))}
                </div>
            </EncabezadoVista>

            {/* El turno de hoy, en mosaicos: horario, almuerzo y turnos/descansos del rango que se ve. */}
            <Mosaicos>
                <Mosaico
                    color={!turnoHoy ? TONO.suave : turnoHoy.es_descanso ? 'descanso' : TONO.info}
                    icono={turnoHoy?.es_descanso ? Moon : Clock}
                    valor={!turnoHoy ? '—' : turnoHoy.es_descanso ? 'Descanso' : `${hhmm(turnoHoy.hora_entrada)} – ${hhmm(turnoHoy.hora_salida)}`}
                    label={turnoHoy?.plantilla && !turnoHoy.es_descanso ? `Hoy · ${turnoHoy.plantilla}` : turnoHoy ? 'Tu turno de hoy' : 'Sin horario asignado hoy'}
                />
                <Mosaico
                    color={TONO.alerta} icono={Utensils}
                    valor={turnoHoy && !turnoHoy.es_descanso ? `${turnoHoy.minutos_almuerzo} min` : '—'}
                    label="Almuerzo de hoy"
                    detalle={turnoHoy?.hora_almuerzo_inicio && !turnoHoy.es_descanso ? `a las ${hhmm(turnoHoy.hora_almuerzo_inicio)}` : null}
                />
                <Mosaico color={TONO.exito} icono={CalendarDays} valor={horarios.filter((x) => !x.es_descanso).length}
                    label={vista === 'semana' ? 'Turnos esta semana' : 'Turnos del mes'} />
                <Mosaico color="descanso" icono={Moon} valor={horarios.filter((x) => x.es_descanso).length}
                    label={vista === 'semana' ? 'Descansos esta semana' : 'Descansos del mes'} />
            </Mosaicos>

            {loading && <CargandoVista />}

            {!loading && error && <VistaVacia error>{error}</VistaVacia>}

            {!loading && !error && vista === 'semana' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10 }}>
                    {diasSemana.map((d, i) => {
                        const fecha = aIso(d);
                        const h = mapaHorarios[fecha];
                        const esHoy = fecha === hoyIso();
                        return (
                            <div key={fecha} className="ai-panel" style={{ padding: 14, borderColor: esHoy ? 'var(--primary)' : undefined, boxShadow: esHoy ? '0 0 0 2px var(--primary-soft)' : undefined }}>
                                <div className="ai-overline">{DIAS_LABEL[i]}</div>
                                <div style={{ font: '600 16px var(--font-display)', margin: '2px 0 8px' }}>{d.getDate()}</div>
                                {h ? (
                                    h.es_descanso
                                        ? <span className="ai-sh ai-sh--off">Descanso</span>
                                        : (
                                            <span className="ai-sh" style={{ background: 'var(--primary-soft)', color: 'var(--primary-soft-ink)' }} title={h.plantilla || undefined}>
                                                {h.plantilla && <small style={{ fontWeight: 600 }}>{h.plantilla}</small>}
                                                {hhmm(h.hora_entrada)}<small>{hhmm(h.hora_salida)}</small>
                                            </span>
                                        )
                                ) : <span className="ai-muted" style={{ fontSize: 12 }}>—</span>}
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && !error && vista === 'mes' && (
                <PanelVista
                    icono={CalendarRange}
                    titulo={`${MESES_LABEL[mesRef.mes][0].toUpperCase()}${MESES_LABEL[mesRef.mes].slice(1)} ${mesRef.anio}`}
                    extra={(
                        <div className="ai-row" style={{ gap: 6 }}>
                            <button type="button" className="ai-monitor-btn" style={{ height: 30, width: 34, padding: 0, justifyContent: 'center' }} aria-label="Mes anterior" onClick={() => setMesRef((r) => { const m = r.mes - 1; return m < 0 ? { anio: r.anio - 1, mes: 11 } : { ...r, mes: m }; })}>‹</button>
                            <button type="button" className="ai-monitor-btn" style={{ height: 30, width: 34, padding: 0, justifyContent: 'center' }} aria-label="Mes siguiente" onClick={() => setMesRef((r) => { const m = r.mes + 1; return m > 11 ? { anio: r.anio + 1, mes: 0 } : { ...r, mes: m }; })}>›</button>
                        </div>
                    )}
                >
                    <div className="ai-panel-body">
                        <div className="ai-cal">
                            {DIAS_LABEL.map((d) => <div key={d} className="h">{d}</div>)}
                            {celdasMes.map((c, i) => {
                                if (!c) return <div key={`vacio-${i}`} className="d empty" />;
                                const h = mapaHorarios[c.fecha];
                                const esHoy = c.fecha === hoyIso();
                                let clase = '';
                                if (h?.es_descanso) clase = 'off';
                                return (
                                    <div key={c.fecha} className={`d ${clase} ${esHoy ? 'today' : ''}`} title={h && !h.es_descanso ? `${h.plantilla ? `${h.plantilla} · ` : ''}${hhmm(h.hora_entrada)}–${hhmm(h.hora_salida)}` : undefined}>
                                        {c.dia}
                                        {h && !h.es_descanso && <small>{hhmm(h.hora_entrada)}</small>}
                                        {h?.es_descanso && <small>Descanso</small>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </PanelVista>
            )}
        </div>
    );
};

export default MiHorario;
