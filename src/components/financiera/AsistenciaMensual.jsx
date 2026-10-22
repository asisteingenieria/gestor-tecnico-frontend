import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, Users, Clock, CalendarX, AlertTriangle, Download, BarChart3 } from 'lucide-react';
import { financieraService } from '../../services/api';
import { nombrePropio, primeraMayuscula, iniciales } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import { periodoActual, nombrePeriodo } from '../../utils/reporteHorasExtra';

// Resumen mensual de asistencia para financiera/admin (asistencia.md §35): estadísticas comparativas
// por campaña de toda la organización y, al abrir una campaña, su detalle (KPIs, calendario y tabla),
// la misma vista que ve el jefe de su equipo.

const CELDA = {
    puntual: { bg: 'var(--success)', label: 'Puntual' },
    tarde: { bg: '#f59e0b', label: 'Llegó tarde' },
    ausente: { bg: 'var(--danger)', label: 'Ausente' },
    curso: { bg: 'var(--primary)', label: 'En curso' },
    pendiente: { bg: 'var(--border)', label: 'Pendiente' }
};

function claseDia(dia) {
    if (!dia) return null;
    if (dia.estado === 'ausente') return 'ausente';
    if (dia.estado === 'pendiente') return 'pendiente';
    if (dia.estado === 'en_curso' || dia.estado === 'en_pausa') return 'curso';
    return dia.minutos_tarde > 0 ? 'tarde' : 'puntual';
}

const hFmt = (min) => `${((Number(min) || 0) / 60).toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`;

// Tendencia de la puntualidad vs el mes anterior (en puntos porcentuales). Subir es bueno (verde).
function Tendencia({ totales, anterior, periodoAnterior }) {
    if (!anterior || anterior.porcentaje_puntualidad == null || totales.porcentaje_puntualidad == null) {
        return <span className="ai-muted" title={anterior ? '' : `Sin datos en ${periodoAnterior}`}>—</span>;
    }
    const delta = totales.porcentaje_puntualidad - anterior.porcentaje_puntualidad;
    const color = delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--ink-subtle)';
    const flecha = delta > 0 ? '▲' : delta < 0 ? '▼' : '=';
    const titulo = `Mes anterior (${periodoAnterior}): puntualidad ${anterior.porcentaje_puntualidad}% · ausencias ${anterior.ausencias} · extra ${((anterior.minutos_extra || 0) / 60).toFixed(1)} h`;
    return <span style={{ color, fontWeight: 600 }} title={titulo}>{flecha} {delta > 0 ? '+' : ''}{delta} pp</span>;
}

function diasDelMes(periodo) {
    const [a, m] = periodo.split('-').map(Number);
    const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
    return Array.from({ length: total }, (_, i) => {
        const d = i + 1;
        const fecha = `${periodo}-${String(d).padStart(2, '0')}`;
        const finde = [0, 6].includes(new Date(`${fecha}T00:00:00Z`).getUTCDay());
        return { d, fecha, finde };
    });
}

const AsistenciaMensual = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const periodo = searchParams.get('periodo') || periodoActual();
    const campaniaId = searchParams.get('campania') || '';
    const [datos, setDatos] = useState(null);
    const [campanias, setCampanias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        financieraService.getCampanias().then(({ data }) => setCampanias(data)).catch(() => setCampanias([]));
    }, []);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await financieraService.getResumenMensual(periodo, campaniaId || undefined);
            setDatos(data);
        } catch (err) {
            setDatos(null);
            setError(err.response?.data?.message || 'No se pudo cargar el resumen');
        } finally {
            setLoading(false);
        }
    }, [periodo, campaniaId]);

    useEffect(() => { cargar(); }, [cargar]);

    const cambiar = (clave, valor) => {
        const next = new URLSearchParams(searchParams);
        if (valor) next.set(clave, valor); else next.delete(clave);
        setSearchParams(next);
    };

    const dias = useMemo(() => diasDelMes(periodo), [periodo]);
    const porCampania = datos?.por_campania ?? [];
    const totales = datos?.totales;
    const campania = datos?.campania;

    const exportarComparativo = () => {
        const cuerpo = porCampania.map((c) => [
            primeraMayuscula(c.campania), c.totales.empleados, c.totales.dias_trabajados, c.totales.ausencias,
            c.totales.dias_tarde, c.totales.porcentaje_puntualidad ?? '', hFmt(c.totales.minutos_trabajados), hFmt(c.totales.minutos_extra)
        ]);
        descargarCsv(
            `asistencia_campanias_${periodo}.csv`,
            ['Campaña', 'Empleados', 'Días trab.', 'Ausencias', 'Días tarde', 'Puntualidad %', 'H. trabajadas', 'H. extra'],
            cuerpo
        );
    };

    const porFecha = (e) => {
        const mapa = {};
        for (const d of e.dias || []) mapa[d.fecha] = d;
        return mapa;
    };

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Asistencia · comparativo mensual</h1>
                    <p className="ai-page-sub">{nombrePeriodo(periodo)} · todas las campañas, en tiempo real</p>
                </div>
                <div className="ai-row">
                    <select className="ai-input" style={{ width: 220 }} value={campaniaId} onChange={(e) => cambiar('campania', e.target.value)} aria-label="Campaña">
                        <option value="">Todas las campañas</option>
                        {campanias.map((c) => <option key={c.idcampania} value={c.idcampania}>{primeraMayuscula(c.nombre)}</option>)}
                    </select>
                    <input
                        type="month" className="ai-input" style={{ width: 170 }} value={periodo} max={periodoActual()}
                        onChange={(e) => e.target.value && cambiar('periodo', e.target.value)} aria-label="Mes"
                    />
                </div>
            </div>

            {loading ? (
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            ) : error ? (
                <div className="ai-panel ai-empty"><p style={{ color: 'var(--danger)' }}>{error}</p></div>
            ) : !datos ? null : (
                <>
                    <div className="ai-kpis" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                        <Kpi label="Puntualidad global" valor={totales.porcentaje_puntualidad != null ? `${totales.porcentaje_puntualidad}%` : '—'} icon={<Clock size={16} strokeWidth={1.75} />} />
                        <Kpi label="Empleados" valor={totales.empleados} icon={<Users size={16} strokeWidth={1.75} />} />
                        <Kpi label="Días trabajados" valor={totales.dias_trabajados} icon={<BarChart3 size={16} strokeWidth={1.75} />} />
                        <Kpi label="Ausencias" valor={totales.ausencias} alerta={totales.ausencias > 0} icon={<CalendarX size={16} strokeWidth={1.75} />} />
                        <Kpi label="Horas extra" valor={hFmt(totales.minutos_extra)} icon={<Clock size={16} strokeWidth={1.75} />} />
                    </div>

                    <div className="ai-panel">
                        <div className="ai-panel-head">
                            <h3 className="ai-panel-title">Comparativo por campaña</h3>
                            <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportarComparativo} disabled={porCampania.length === 0}>
                                <Download size={14} strokeWidth={1.75} /> Exportar
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ai-table ai-table--dense">
                                <thead>
                                    <tr>
                                        <th>Campaña</th>
                                        <th className="ai-num">Empleados</th>
                                        <th style={{ minWidth: 160 }}>Puntualidad</th>
                                        <th className="ai-num" title={`Puntualidad vs ${nombrePeriodo(datos.periodo_anterior)}`}>Tendencia</th>
                                        <th className="ai-num">Días trab.</th>
                                        <th className="ai-num">Ausencias</th>
                                        <th className="ai-num">Días tarde</th>
                                        <th className="ai-num">H. trabajadas</th>
                                        <th className="ai-num">H. extra</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {porCampania.map((c) => {
                                        const pct = c.totales.porcentaje_puntualidad;
                                        const activa = String(c.idcampania) === String(campaniaId);
                                        return (
                                            <tr key={c.idcampania ?? 'sin'} style={activa ? { background: 'var(--primary-soft)' } : undefined}>
                                                <td style={{ fontWeight: 600 }}>{primeraMayuscula(c.campania)}</td>
                                                <td className="ai-num">{c.totales.empleados}</td>
                                                <td>
                                                    <div className="ai-row" style={{ gap: 8 }}>
                                                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-0)', overflow: 'hidden', minWidth: 80 }}>
                                                            <div style={{ width: `${pct ?? 0}%`, height: '100%', background: pct >= 90 ? 'var(--success)' : pct >= 75 ? '#f59e0b' : 'var(--danger)' }} />
                                                        </div>
                                                        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{pct != null ? `${pct}%` : '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="ai-num"><Tendencia totales={c.totales} anterior={c.anterior} periodoAnterior={datos.periodo_anterior} /></td>
                                                <td className="ai-num">{c.totales.dias_trabajados}</td>
                                                <td className="ai-num" style={{ color: c.totales.ausencias > 0 ? 'var(--danger)' : 'inherit' }}>{c.totales.ausencias}</td>
                                                <td className="ai-num">{c.totales.dias_tarde}</td>
                                                <td className="ai-num">{hFmt(c.totales.minutos_trabajados)}</td>
                                                <td className="ai-num">{hFmt(c.totales.minutos_extra)}</td>
                                                <td className="ai-num">
                                                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => cambiar('campania', activa ? '' : String(c.idcampania))}>
                                                        {activa ? 'Ocultar' : 'Ver detalle'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {totales && (
                                    <tfoot>
                                        <tr style={{ fontWeight: 600 }}>
                                            <td>Total</td>
                                            <td className="ai-num">{totales.empleados}</td>
                                            <td>{totales.porcentaje_puntualidad != null ? `${totales.porcentaje_puntualidad}%` : '—'}</td>
                                            <td></td>
                                            <td className="ai-num">{totales.dias_trabajados}</td>
                                            <td className="ai-num">{totales.ausencias}</td>
                                            <td className="ai-num">{totales.dias_tarde}</td>
                                            <td className="ai-num">{hFmt(totales.minutos_trabajados)}</td>
                                            <td className="ai-num">{hFmt(totales.minutos_extra)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {campania && (
                        <>
                            <div className="ai-panel">
                                <div className="ai-panel-head">
                                    <h3 className="ai-panel-title">Campaña: {primeraMayuscula(campania.nombre)} · calendario</h3>
                                    <div className="ai-row" style={{ gap: 12, flexWrap: 'wrap' }}>
                                        {['puntual', 'tarde', 'ausente', 'curso', 'pendiente'].map((k) => (
                                            <span key={k} className="ai-row" style={{ gap: 5, fontSize: 12, color: 'var(--ink-muted)' }}>
                                                <i style={{ width: 12, height: 12, borderRadius: 3, background: CELDA[k].bg, display: 'inline-block' }} />{CELDA[k].label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 11 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ position: 'sticky', left: 0, background: 'var(--surface-100)', textAlign: 'left', zIndex: 1, minWidth: 150 }}>Empleado</th>
                                                {dias.map((d) => <th key={d.d} style={{ width: 20, textAlign: 'center', color: d.finde ? 'var(--ink-subtle)' : 'var(--ink-muted)' }}>{d.d}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {campania.empleados.map((e) => {
                                                const mapa = porFecha(e);
                                                return (
                                                    <tr key={e.users_company_id}>
                                                        <td style={{ position: 'sticky', left: 0, background: 'var(--surface-100)', zIndex: 1, whiteSpace: 'nowrap', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis' }} title={nombrePropio(e.nombre)}>{nombrePropio(e.nombre)}</td>
                                                        {dias.map((d) => {
                                                            const clase = claseDia(mapa[d.fecha]);
                                                            const cfg = clase ? CELDA[clase] : null;
                                                            const celda = mapa[d.fecha];
                                                            const titulo = celda ? `${d.fecha} · ${cfg?.label}${celda.minutos_tarde > 0 ? ` (+${celda.minutos_tarde} min)` : ''}` : `${d.fecha} · sin jornada`;
                                                            return (
                                                                <td key={d.d} style={{ padding: 0 }}>
                                                                    <Link to={`/recursos-humanos/trazabilidad/${e.users_company_id}?fecha=${d.fecha}`} title={titulo} aria-label={titulo}
                                                                        style={{ display: 'block', width: 18, height: 18, borderRadius: 3, background: cfg ? cfg.bg : 'transparent', border: cfg ? 'none' : '1px dashed var(--border)', margin: '0 auto' }} />
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="ai-panel">
                                <div className="ai-panel-head"><h3 className="ai-panel-title">Detalle por empleado · {primeraMayuscula(campania.nombre)}</h3></div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="ai-table ai-table--dense">
                                        <thead>
                                            <tr>
                                                <th>Empleado</th>
                                                <th className="ai-num">Días trab.</th>
                                                <th className="ai-num">Ausencias</th>
                                                <th className="ai-num">Días tarde</th>
                                                <th className="ai-num">Puntualidad</th>
                                                <th className="ai-num">H. trabajadas</th>
                                                <th className="ai-num">H. extra</th>
                                                <th className="ai-num">Baño</th>
                                                <th className="ai-num">Break</th>
                                                <th className="ai-num">Almuerzo</th>
                                                <th className="ai-num">Capac.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {campania.empleados.map((e) => (
                                                <tr key={e.users_company_id}>
                                                    <td>
                                                        <Link to={`/recursos-humanos/trazabilidad/${e.users_company_id}`} className="ai-row" style={{ gap: 8, textDecoration: 'none', color: 'inherit' }}>
                                                            <span className="ai-avatar ai-avatar--sm ai-avatar--brand">{iniciales(e.nombre)}</span>
                                                            <span>
                                                                <div style={{ fontWeight: 600 }}>{nombrePropio(e.nombre)}</div>
                                                                <div className="ai-muted" style={{ fontSize: 12 }}>CC {e.documento}{e.cargo ? ` · ${primeraMayuscula(e.cargo)}` : ''}</div>
                                                            </span>
                                                        </Link>
                                                    </td>
                                                    <td className="ai-num" style={{ fontWeight: 600 }}>{e.dias_trabajados}</td>
                                                    <td className="ai-num" style={{ color: e.ausencias > 0 ? 'var(--danger)' : 'inherit' }}>{e.ausencias}</td>
                                                    <td className="ai-num">{e.dias_tarde}{e.minutos_tarde > 0 ? ` (${e.minutos_tarde}m)` : ''}</td>
                                                    <td className="ai-num">{e.porcentaje_puntualidad != null ? `${e.porcentaje_puntualidad}%` : '—'}</td>
                                                    <td className="ai-num" style={{ fontWeight: 600 }}>{hFmt(e.minutos_trabajados)}</td>
                                                    <td className="ai-num">{hFmt(e.minutos_extra)}</td>
                                                    <td className="ai-num ai-muted">{hFmt(e.minutos_bano)}</td>
                                                    <td className="ai-num ai-muted">{hFmt(e.minutos_break)}</td>
                                                    <td className="ai-num ai-muted">{hFmt(e.minutos_almuerzo)}</td>
                                                    <td className="ai-num ai-muted">{hFmt(e.minutos_capacitacion)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

const Kpi = ({ label, valor, icon, alerta }) => (
    <div className="ai-kpi" style={alerta ? { borderColor: 'var(--danger)' } : undefined}>
        <div className="ai-kpi-head"><span className="ai-kpi-label">{label}</span><span className="ai-kpi-icon">{icon}</span></div>
        <div className="ai-kpi-value">{valor}</div>
    </div>
);

export default AsistenciaMensual;
