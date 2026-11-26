import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CalendarDays, BarChart3, Clock, AlertTriangle, Timer, PieChart, CalendarRange } from 'lucide-react';
import { EncabezadoVista, Mosaicos, Mosaico, PanelVista, CargandoVista, VistaVacia, TONO } from '../ui';
import { tardeExacto } from '../../utils/llegadaAsistencia';
import { useAuth } from '../../context/AuthContext';
import { asistenciaService } from '../../services/api';
import { formatearDuracion } from '../../utils/tiempoAsistencia';

const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES_LABEL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const META_MIN = 480; // 8 h — referencia visual fija del diseño, no un dato por empleado
const UMBRAL_NAVY_MIN = 510; // 8.5 h

function hoyIso() {
    return new Date().toISOString().slice(0, 10);
}
function aIso(d) {
    return d.toISOString().slice(0, 10);
}
function inicioSemana() {
    const d = new Date();
    const dia = (d.getDay() + 6) % 7; // lunes = 0
    d.setDate(d.getDate() - dia);
    return aIso(d);
}
function inicioMes() {
    const d = new Date();
    return aIso(new Date(d.getFullYear(), d.getMonth(), 1));
}
function inicioTrimestre() {
    const d = new Date();
    const mesTrimestre = Math.floor(d.getMonth() / 3) * 3;
    return aIso(new Date(d.getFullYear(), mesTrimestre, 1));
}

const PERIODOS = [
    { id: 'semana', label: 'Semana', desde: inicioSemana },
    { id: 'mes', label: 'Este mes', desde: inicioMes },
    { id: 'trimestre', label: 'Trimestre', desde: inicioTrimestre }
];

const MisEstadisticas = () => {
    const { isDirectorOperaciones } = useAuth();
    const baseTrazabilidad = isDirectorOperaciones ? '/operaciones/trazabilidad' : '/asistencia/trazabilidad';

    const [periodo, setPeriodo] = useState('mes');
    const [personalizado, setPersonalizado] = useState(false);
    const [desde, setDesde] = useState(inicioMes());
    const [hasta, setHasta] = useState(hoyIso());
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [mesRef, setMesRef] = useState(() => { const d = new Date(); return { anio: d.getFullYear(), mes: d.getMonth() }; });
    const [jornadasMes, setJornadasMes] = useState([]);
    const [loadingMes, setLoadingMes] = useState(true);

    const elegirPeriodo = (p) => {
        setPeriodo(p.id);
        setPersonalizado(false);
        setDesde(p.desde());
        setHasta(hoyIso());
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await asistenciaService.getMisEstadisticas({ desde, hasta });
                setStats(data);
            } catch (err) {
                setError(err.response?.data?.message || 'No se pudieron cargar las estadísticas');
            } finally {
                setLoading(false);
            }
        })();
    }, [desde, hasta]);

    const rangoMes = useMemo(() => {
        const inicio = new Date(mesRef.anio, mesRef.mes, 1);
        const fin = new Date(mesRef.anio, mesRef.mes + 1, 0);
        return { desde: aIso(inicio), hasta: aIso(fin) };
    }, [mesRef]);

    useEffect(() => {
        (async () => {
            setLoadingMes(true);
            try {
                const { data } = await asistenciaService.getMisJornadas(rangoMes);
                setJornadasMes(data);
            } catch {
                setJornadasMes([]);
            } finally {
                setLoadingMes(false);
            }
        })();
    }, [rangoMes]);

    const mapaJornadas = useMemo(() => {
        const mapa = {};
        jornadasMes.forEach((j) => { mapa[j.fecha.slice(0, 10)] = j; });
        return mapa;
    }, [jornadasMes]);

    const celdasMes = useMemo(() => {
        const primerDia = new Date(mesRef.anio, mesRef.mes, 1);
        const diasEnMes = new Date(mesRef.anio, mesRef.mes + 1, 0).getDate();
        const offset = (primerDia.getDay() + 6) % 7;
        const celdas = Array.from({ length: offset }, () => null);
        for (let d = 1; d <= diasEnMes; d++) {
            celdas.push({ dia: d, fecha: aIso(new Date(mesRef.anio, mesRef.mes, d)) });
        }
        return celdas;
    }, [mesRef]);

    const diasConDatos = useMemo(
        () => celdasMes.filter((c) => c && c.fecha <= hoyIso()).map((c) => ({ ...c, jornada: mapaJornadas[c.fecha] })),
        [celdasMes, mapaJornadas]
    );

    const maxBarra = Math.max(META_MIN, ...diasConDatos.map((c) => c.jornada?.minutos_trabajados || 0));

    const diasConTarde = stats ? Math.max(0, stats.dias_trabajados - stats.dias_puntuales) : 0;

    return (
        <div className="ai-content">
            <EncabezadoVista icono={PieChart} titulo="Mis estadísticas" subtitulo="Puntualidad y horas laboradas del periodo">
                <div className="ai-seg" role="tablist" aria-label="Periodo">
                    {PERIODOS.map((p) => (
                        <span key={p.id} role="tab" tabIndex={0} aria-selected={periodo === p.id && !personalizado}
                            className={periodo === p.id && !personalizado ? 'is-active' : ''} style={{ cursor: 'pointer' }}
                            onClick={() => elegirPeriodo(p)}
                            onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') elegirPeriodo(p); }}>
                            {p.label}
                        </span>
                    ))}
                    <span role="tab" tabIndex={0} aria-selected={personalizado} className={personalizado ? 'is-active' : ''} style={{ cursor: 'pointer' }}
                        onClick={() => setPersonalizado((v) => !v)}
                        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setPersonalizado((v) => !v); }}>
                        Personalizado
                    </span>
                </div>
            </EncabezadoVista>

            {personalizado && (
                <div className="ai-monitor-barra">
                    <label className="ai-row" style={{ gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)' }}>
                        Desde
                        <input type="date" className="ai-input" style={{ width: 'auto', flex: 'none' }} value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
                    </label>
                    <label className="ai-row" style={{ gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)' }}>
                        Hasta
                        <input type="date" className="ai-input" style={{ width: 'auto', flex: 'none' }} value={hasta} max={hoyIso()} min={desde} onChange={(e) => setHasta(e.target.value)} />
                    </label>
                </div>
            )}

            {loading && <CargandoVista />}

            {!loading && error && <VistaVacia error>{error}</VistaVacia>}

            {!loading && stats && (
                <>
                    <Mosaicos>
                        <Mosaico color="conectado" icono={CalendarDays} valor={stats.dias_trabajados} label="Días trabajados"
                            detalle={`${stats.ausencias} ausencia${stats.ausencias === 1 ? '' : 's'}`} />
                        <Mosaico
                            color={stats.porcentaje_puntualidad == null ? TONO.suave : stats.porcentaje_puntualidad >= 90 ? TONO.exito : stats.porcentaje_puntualidad >= 75 ? TONO.alerta : TONO.peligro}
                            icono={Clock} valor={stats.porcentaje_puntualidad != null ? `${stats.porcentaje_puntualidad}%` : '—'} label="Puntualidad" />
                        <Mosaico color={diasConTarde > 0 ? 'almuerzo' : TONO.suave} icono={AlertTriangle}
                            valor={stats.minutos_tarde_acumulados > 0 ? tardeExacto(stats.segundos_tarde_acumulados, stats.minutos_tarde_acumulados) : 0}
                            label="Tiempo tarde" detalle={`${diasConTarde} día${diasConTarde === 1 ? '' : 's'} con tardanza`} />
                        <Mosaico color={TONO.info} icono={Timer} valor={formatearDuracion(stats.minutos_trabajados_acumulados)} label="Horas trabajadas"
                            detalle={`+${formatearDuracion(stats.minutos_extra_acumulados)} extra aprobadas`} />
                    </Mosaicos>

                    <div className="ai-grid-2">
                        <PanelVista
                            icono={CalendarRange}
                            titulo={`Calendario · ${MESES_LABEL[mesRef.mes]} ${mesRef.anio}`}
                            extra={(
                                <div className="ai-row" style={{ gap: 6 }}>
                                    <button type="button" className="ai-monitor-btn" style={{ height: 30, width: 34, padding: 0, justifyContent: 'center' }} aria-label="Mes anterior" onClick={() => setMesRef((r) => { const m = r.mes - 1; return m < 0 ? { anio: r.anio - 1, mes: 11 } : { ...r, mes: m }; })}>‹</button>
                                    <button type="button" className="ai-monitor-btn" style={{ height: 30, width: 34, padding: 0, justifyContent: 'center' }} aria-label="Mes siguiente" onClick={() => setMesRef((r) => { const m = r.mes + 1; return m > 11 ? { anio: r.anio + 1, mes: 0 } : { ...r, mes: m }; })}>›</button>
                                </div>
                            )}
                        >
                            <div className="ai-panel-body">
                                <div className="ai-legend" style={{ marginBottom: 10 }}>
                                    <span><i style={{ background: 'var(--success-soft)', border: '1px solid var(--success)' }} /> Puntual</span>
                                    <span><i style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }} /> Tarde</span>
                                    <span><i style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }} /> Ausente</span>
                                </div>
                                {loadingMes ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                                        <Loader2 size={20} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                                    </div>
                                ) : (
                                    <div className="ai-cal">
                                        {DIAS_LABEL.map((d) => <div key={d} className="h">{d}</div>)}
                                        {celdasMes.map((c, i) => {
                                            if (!c) return <div key={`vacio-${i}`} className="d empty" />;
                                            const esHoy = c.fecha === hoyIso();
                                            const esFuturo = c.fecha > hoyIso();
                                            const j = mapaJornadas[c.fecha];
                                            let clase = '';
                                            let texto = null;
                                            if (esFuturo) clase = 'fut';
                                            else if (j?.estado === 'ausente') { clase = 'abs'; texto = 'Ausente'; }
                                            else if (j && j.minutos_tarde > 0) { clase = 'late'; texto = `+${tardeExacto(j.segundos_tarde, j.minutos_tarde)}`; }
                                            else if (j && j.estado !== 'pendiente') { clase = 'ok'; texto = 'Puntual'; }

                                            const contenido = (
                                                <>
                                                    {c.dia}
                                                    {texto && <small>{texto}</small>}
                                                </>
                                            );
                                            return esFuturo || !j ? (
                                                <div key={c.fecha} className={`d ${clase} ${esHoy ? 'today' : ''}`}>{contenido}</div>
                                            ) : (
                                                <Link key={c.fecha} to={`${baseTrazabilidad}?fecha=${c.fecha}`} className={`d ${clase} ${esHoy ? 'today' : ''}`} style={{ textDecoration: 'none', cursor: 'pointer' }}>
                                                    {contenido}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </PanelVista>

                        <PanelVista icono={BarChart3} titulo="Horas por día">
                            <div className="ai-panel-body">
                                {loadingMes ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                                        <Loader2 size={20} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                                    </div>
                                ) : diasConDatos.every((c) => !c.jornada) ? (
                                    <div className="ai-empty">
                                        <BarChart3 size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                                        <p>Sin jornadas registradas este mes.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="ai-bars">
                                            <div className="target" style={{ bottom: `${(META_MIN / maxBarra) * 100}%` }}>
                                                <span>Meta 8 h</span>
                                            </div>
                                            {diasConDatos.map((c) => {
                                                const min = c.jornada?.minutos_trabajados || 0;
                                                return (
                                                    <div key={c.fecha} className={`b ${min > UMBRAL_NAVY_MIN ? 'over' : ''}`}>
                                                        {min > 0 && <span style={{ fontSize: 10 }}>{formatearDuracion(min)}</span>}
                                                        <i style={{ height: `${Math.max(2, (min / maxBarra) * 100)}%` }} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="ai-bars-x">
                                            {diasConDatos.map((c) => <span key={c.fecha}>{c.dia}</span>)}
                                        </div>
                                        <div className="ai-legend" style={{ marginTop: 10 }}>
                                            <span><i style={{ background: 'var(--primary)' }} /> Horas trabajadas</span>
                                            <span><i style={{ background: 'var(--brand-navy)' }} /> Más de 8.5 h</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </PanelVista>
                    </div>
                </>
            )}
        </div>
    );
};

export default MisEstadisticas;
