import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, CalendarClock } from 'lucide-react';
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
                setHorarios(data);
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
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Mi horario</h1>
                    <p className="ai-page-sub">Tu turno asignado</p>
                </div>
                <div className="ai-row">
                    <button type="button" className={`ai-btn ai-btn--sm ${vista === 'semana' ? 'ai-btn--primary' : 'ai-btn--secondary'}`} onClick={() => setVista('semana')}>Semana</button>
                    <button type="button" className={`ai-btn ai-btn--sm ${vista === 'mes' ? 'ai-btn--primary' : 'ai-btn--secondary'}`} onClick={() => setVista('mes')}>Mes</button>
                </div>
            </div>

            <div className="ai-panel">
                <div className="ai-panel-body ai-row" style={{ gap: 20 }}>
                    <span className="ai-kpi-icon" style={{ width: 44, height: 44 }}><CalendarClock size={20} strokeWidth={1.75} /></span>
                    <div>
                        <span className="ai-overline">Tu turno de hoy</span>
                        {turnoHoy ? (
                            turnoHoy.es_descanso ? (
                                <div style={{ font: '600 18px var(--font-display)' }}>Descanso</div>
                            ) : (
                                <div style={{ font: '600 18px var(--font-display)' }}>
                                    {hhmm(turnoHoy.hora_entrada)} – {hhmm(turnoHoy.hora_salida)}
                                    <span className="ai-muted" style={{ fontSize: 13, fontWeight: 500, marginLeft: 10 }}>
                                        Almuerzo {turnoHoy.minutos_almuerzo} min{turnoHoy.hora_almuerzo_inicio ? ` a las ${hhmm(turnoHoy.hora_almuerzo_inicio)}` : ''} · Tolerancia {turnoHoy.tolerancia_entrada_min} min
                                    </span>
                                </div>
                            )
                        ) : <div className="ai-muted">Sin horario asignado hoy</div>}
                    </div>
                </div>
            </div>

            {loading && (
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            )}

            {!loading && error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

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
                                        : <span className="ai-sh" style={{ background: 'var(--primary-soft)', color: 'var(--primary-soft-ink)' }}>{hhmm(h.hora_entrada)}<small>{hhmm(h.hora_salida)}</small></span>
                                ) : <span className="ai-muted" style={{ fontSize: 12 }}>—</span>}
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && !error && vista === 'mes' && (
                <div className="ai-panel">
                    <div className="ai-panel-head">
                        <div className="ai-datenav">
                            <button type="button" className="ai-icon-btn" aria-label="Mes anterior" onClick={() => setMesRef((r) => { const m = r.mes - 1; return m < 0 ? { anio: r.anio - 1, mes: 11 } : { ...r, mes: m }; })}>‹</button>
                            <b>{MESES_LABEL[mesRef.mes]} {mesRef.anio}</b>
                            <button type="button" className="ai-icon-btn" aria-label="Mes siguiente" onClick={() => setMesRef((r) => { const m = r.mes + 1; return m > 11 ? { anio: r.anio + 1, mes: 0 } : { ...r, mes: m }; })}>›</button>
                        </div>
                    </div>
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
                                    <div key={c.fecha} className={`d ${clase} ${esHoy ? 'today' : ''}`}>
                                        {c.dia}
                                        {h && !h.es_descanso && <small>{hhmm(h.hora_entrada)}</small>}
                                        {h?.es_descanso && <small>Descanso</small>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MiHorario;
