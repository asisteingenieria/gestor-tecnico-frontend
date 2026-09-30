import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CalendarDays, BarChart3 } from 'lucide-react';
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
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Mis estadísticas</h1>
                    <p className="ai-page-sub">Puntualidad y horas laboradas del periodo</p>
                </div>
                <div className="ai-row">
                    {PERIODOS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            className={`ai-btn ai-btn--sm ${periodo === p.id && !personalizado ? 'ai-btn--primary' : 'ai-btn--secondary'}`}
                            onClick={() => elegirPeriodo(p)}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        className={`ai-btn ai-btn--sm ${personalizado ? 'ai-btn--primary' : 'ai-btn--secondary'}`}
                        onClick={() => setPersonalizado((v) => !v)}
                    >
                        Personalizado
                    </button>
                </div>
            </div>

            {personalizado && (
                <div className="ai-row">
                    <div className="ai-field" style={{ maxWidth: 180 }}>
                        <label className="ai-label">Desde</label>
                        <input type="date" className="ai-input" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
                    </div>
                    <div className="ai-field" style={{ maxWidth: 180 }}>
                        <label className="ai-label">Hasta</label>
                        <input type="date" className="ai-input" value={hasta} max={hoyIso()} min={desde} onChange={(e) => setHasta(e.target.value)} />
                    </div>
                </div>
            )}

            {loading && (
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            )}

            {!loading && error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

            {!loading && stats && (
                <>
                    <div className="ai-kpis">
                        <div className="ai-kpi">
                            <div className="ai-kpi-head">
                                <span className="ai-kpi-label">Días trabajados</span>
                                <span className="ai-kpi-icon"><CalendarDays size={18} strokeWidth={1.75} /></span>
                            </div>
                            <div className="ai-kpi-value">{stats.dias_trabajados}</div>
                            <div className="ai-kpi-foot">{stats.ausencias} ausencia{stats.ausencias === 1 ? '' : 's'}</div>
                        </div>

                        <div className="ai-kpi">
                            <div className="ai-kpi-head">
                                <span className="ai-kpi-label">Puntualidad</span>
                            </div>
                            <div className="ai-kpi-value">{stats.porcentaje_puntualidad != null ? `${stats.porcentaje_puntualidad}%` : '—'}</div>
                            <div className="ai-kpi-bar"><span style={{ width: `${stats.porcentaje_puntualidad ?? 0}%` }} /></div>
                        </div>

                        <div className="ai-kpi">
                            <div className="ai-kpi-head">
                                <span className="ai-kpi-label">Minutos tarde</span>
                            </div>
                            <div className="ai-kpi-value">{stats.minutos_tarde_acumulados}</div>
                            <div className="ai-kpi-foot">{diasConTarde} día{diasConTarde === 1 ? '' : 's'} con tardanza</div>
                        </div>

                        <div className="ai-kpi ai-kpi--hero">
                            <div className="ai-kpi-head">
                                <span className="ai-kpi-label">Horas trabajadas</span>
                                <span className="ai-kpi-icon"><BarChart3 size={18} strokeWidth={1.75} /></span>
                            </div>
                            <div className="ai-kpi-value">{formatearDuracion(stats.minutos_trabajados_acumulados)}</div>
                            <div className="ai-kpi-foot">+{formatearDuracion(stats.minutos_extra_acumulados)} extra aprobadas</div>
                        </div>
                    </div>

                    <div className="ai-grid-2">
                        <div className="ai-panel">
                            <div className="ai-panel-head">
                                <h3 className="ai-panel-title">Calendario del mes</h3>
                                <div className="ai-datenav">
                                    <button type="button" className="ai-icon-btn" aria-label="Mes anterior" onClick={() => setMesRef((r) => { const m = r.mes - 1; return m < 0 ? { anio: r.anio - 1, mes: 11 } : { ...r, mes: m }; })}>‹</button>
                                    <b style={{ textTransform: 'capitalize' }}>{MESES_LABEL[mesRef.mes]} {mesRef.anio}</b>
                                    <button type="button" className="ai-icon-btn" aria-label="Mes siguiente" onClick={() => setMesRef((r) => { const m = r.mes + 1; return m > 11 ? { anio: r.anio + 1, mes: 0 } : { ...r, mes: m }; })}>›</button>
                                </div>
                            </div>
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
                                            else if (j && j.minutos_tarde > 0) { clase = 'late'; texto = `+${j.minutos_tarde} min`; }
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
                        </div>

                        <div className="ai-panel">
                            <div className="ai-panel-head"><h3 className="ai-panel-title">Horas por día</h3></div>
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
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MisEstadisticas;
