import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, Users, Clock, CalendarX, AlertTriangle, Download, CalendarRange } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, primeraMayuscula, iniciales } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import { periodoActual, nombrePeriodo } from '../../utils/reporteHorasExtra';

// Resumen mensual del equipo para el jefe (asistencia.md §35): KPIs del mes, un calendario tipo
// heatmap (día × empleado) para ver patrones de un vistazo, y la tabla detallada por empleado.

// Estado de cada día → cómo se pinta en el calendario.
const CELDA = {
    puntual: { bg: 'var(--success)', label: 'Puntual' },
    tarde: { bg: '#f59e0b', label: 'Llegó tarde' },
    ausente: { bg: 'var(--danger)', label: 'Ausente' },
    curso: { bg: 'var(--primary)', label: 'En curso' },
    pendiente: { bg: 'var(--border)', label: 'Pendiente' }
};

function claseDia(dia) {
    if (!dia) return null; // sin jornada ese día (no programado)
    if (dia.estado === 'ausente') return 'ausente';
    if (dia.estado === 'pendiente') return 'pendiente';
    if (dia.estado === 'en_curso' || dia.estado === 'en_pausa') return 'curso';
    return dia.minutos_tarde > 0 ? 'tarde' : 'puntual';
}

const hFmt = (min) => `${((Number(min) || 0) / 60).toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`;

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

const EquipoMensual = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const periodo = searchParams.get('periodo') || periodoActual();
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await asistenciaService.getResumenMensualEquipo(periodo);
            setDatos(data);
        } catch (err) {
            setDatos(null);
            setError(err.response?.data?.message || 'No se pudo cargar el resumen del equipo');
        } finally {
            setLoading(false);
        }
    }, [periodo]);

    useEffect(() => { cargar(); }, [cargar]);

    const dias = useMemo(() => diasDelMes(periodo), [periodo]);
    const empleados = datos?.empleados ?? [];
    const totales = datos?.totales;

    const exportar = () => {
        const cuerpo = empleados.map((e, i) => [
            i + 1, e.documento, nombrePropio(e.nombre), e.cargo || '',
            e.dias_trabajados, e.ausencias, e.dias_tarde, e.minutos_tarde,
            e.porcentaje_puntualidad ?? '', hFmt(e.minutos_trabajados), hFmt(e.minutos_extra),
            hFmt(e.minutos_bano), hFmt(e.minutos_break), hFmt(e.minutos_almuerzo), hFmt(e.minutos_capacitacion)
        ]);
        descargarCsv(
            `equipo_mensual_${periodo}.csv`,
            ['N°', 'Documento', 'Empleado', 'Cargo', 'Días trab.', 'Ausencias', 'Días tarde', 'Min tarde',
                'Puntualidad %', 'H. trabajadas', 'H. extra', 'Baño', 'Break', 'Almuerzo', 'Capacitación'],
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
                    <h1 className="ai-page-title">Equipo · resumen mensual</h1>
                    <p className="ai-page-sub">
                        {nombrePeriodo(periodo)}{totales ? ` · ${totales.empleados} ${totales.empleados === 1 ? 'persona' : 'personas'}` : ''} · traza mes a mes
                    </p>
                </div>
                <div className="ai-row">
                    <input
                        type="month" className="ai-input" style={{ width: 170 }} value={periodo} max={periodoActual()}
                        onChange={(e) => e.target.value && setSearchParams({ periodo: e.target.value })} aria-label="Mes"
                    />
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportar} disabled={empleados.length === 0}>
                        <Download size={14} strokeWidth={1.75} /> Exportar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            ) : error ? (
                <div className="ai-panel ai-empty"><p style={{ color: 'var(--danger)' }}>{error}</p></div>
            ) : empleados.length === 0 ? (
                <div className="ai-panel ai-empty">
                    <CalendarRange size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                    <p>No tienes empleados a cargo con datos en {nombrePeriodo(periodo).toLowerCase()}.</p>
                </div>
            ) : (
                <>
                    <div className="ai-kpis" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                        <Kpi label="Puntualidad" valor={totales.porcentaje_puntualidad != null ? `${totales.porcentaje_puntualidad}%` : '—'} icon={<Clock size={16} strokeWidth={1.75} />} />
                        <Kpi label="Días trabajados" valor={totales.dias_trabajados} icon={<Users size={16} strokeWidth={1.75} />} />
                        <Kpi label="Ausencias" valor={totales.ausencias} alerta={totales.ausencias > 0} icon={<CalendarX size={16} strokeWidth={1.75} />} />
                        <Kpi label="Días tarde" valor={totales.dias_tarde} icon={<AlertTriangle size={16} strokeWidth={1.75} />} />
                        <Kpi label="Horas extra" valor={hFmt(totales.minutos_extra)} icon={<Clock size={16} strokeWidth={1.75} />} />
                    </div>

                    <div className="ai-panel">
                        <div className="ai-panel-head">
                            <h3 className="ai-panel-title">Calendario del mes</h3>
                            <div className="ai-row" style={{ gap: 12, flexWrap: 'wrap' }}>
                                {['puntual', 'tarde', 'ausente', 'curso', 'pendiente'].map((k) => (
                                    <span key={k} className="ai-row" style={{ gap: 5, fontSize: 12, color: 'var(--ink-muted)' }}>
                                        <i style={{ width: 12, height: 12, borderRadius: 3, background: CELDA[k].bg, display: 'inline-block' }} />
                                        {CELDA[k].label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ai-mes-grid" style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 11 }}>
                                <thead>
                                    <tr>
                                        <th style={{ position: 'sticky', left: 0, background: 'var(--surface-100)', textAlign: 'left', zIndex: 1, minWidth: 150 }}>Empleado</th>
                                        {dias.map((d) => (
                                            <th key={d.d} style={{ width: 20, textAlign: 'center', color: d.finde ? 'var(--ink-subtle)' : 'var(--ink-muted)', fontWeight: d.finde ? 400 : 600 }}>{d.d}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {empleados.map((e) => {
                                        const mapa = porFecha(e);
                                        return (
                                            <tr key={e.users_company_id}>
                                                <td style={{ position: 'sticky', left: 0, background: 'var(--surface-100)', zIndex: 1, whiteSpace: 'nowrap', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis' }} title={nombrePropio(e.nombre)}>
                                                    {nombrePropio(e.nombre)}
                                                </td>
                                                {dias.map((d) => {
                                                    const clase = claseDia(mapa[d.fecha]);
                                                    const cfg = clase ? CELDA[clase] : null;
                                                    const celda = mapa[d.fecha];
                                                    const titulo = celda
                                                        ? `${d.fecha} · ${cfg?.label}${celda.minutos_tarde > 0 ? ` (+${celda.minutos_tarde} min)` : ''}`
                                                        : `${d.fecha} · sin jornada`;
                                                    return (
                                                        <td key={d.d} style={{ padding: 0 }}>
                                                            <Link
                                                                to={`/operaciones/equipo/${e.users_company_id}/trazabilidad?fecha=${d.fecha}`}
                                                                title={titulo}
                                                                style={{
                                                                    display: 'block', width: 18, height: 18, borderRadius: 3,
                                                                    background: cfg ? cfg.bg : 'transparent',
                                                                    border: cfg ? 'none' : '1px dashed var(--border)', margin: '0 auto'
                                                                }}
                                                                aria-label={titulo}
                                                            />
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
                        <div className="ai-panel-head"><h3 className="ai-panel-title">Detalle por empleado</h3></div>
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
                                        <th className="ai-num" title="Baño">Baño</th>
                                        <th className="ai-num" title="Break">Break</th>
                                        <th className="ai-num" title="Almuerzo">Almuerzo</th>
                                        <th className="ai-num" title="Capacitación (cuenta como laborada)">Capac.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {empleados.map((e) => (
                                        <tr key={e.users_company_id}>
                                            <td>
                                                <Link to={`/operaciones/equipo/${e.users_company_id}/trazabilidad`} className="ai-row" style={{ gap: 8, textDecoration: 'none', color: 'inherit' }}>
                                                    <span className="ai-avatar ai-avatar--sm ai-avatar--brand">{iniciales(e.nombre)}</span>
                                                    <span>
                                                        <div style={{ fontWeight: 600 }}>{nombrePropio(e.nombre)}</div>
                                                        <div className="ai-muted" style={{ fontSize: 12 }}>CC {e.documento}{e.cargo ? ` · ${primeraMayuscula(e.cargo)}` : ''}</div>
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="ai-num" style={{ fontWeight: 600 }}>{e.dias_trabajados}</td>
                                            <td className="ai-num" style={{ color: e.ausencias > 0 ? 'var(--danger)' : 'inherit' }}>{e.ausencias}</td>
                                            <td className="ai-num" style={{ color: e.dias_tarde > 0 ? '#b45309' : 'inherit' }}>{e.dias_tarde}{e.minutos_tarde > 0 ? ` (${e.minutos_tarde}m)` : ''}</td>
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
                                {totales && (
                                    <tfoot>
                                        <tr style={{ fontWeight: 600 }}>
                                            <td>Total ({totales.empleados})</td>
                                            <td className="ai-num">{totales.dias_trabajados}</td>
                                            <td className="ai-num">{totales.ausencias}</td>
                                            <td className="ai-num">{totales.dias_tarde}</td>
                                            <td className="ai-num">{totales.porcentaje_puntualidad != null ? `${totales.porcentaje_puntualidad}%` : '—'}</td>
                                            <td className="ai-num">{hFmt(totales.minutos_trabajados)}</td>
                                            <td className="ai-num">{hFmt(totales.minutos_extra)}</td>
                                            <td className="ai-num">{hFmt(totales.minutos_bano)}</td>
                                            <td className="ai-num">{hFmt(totales.minutos_break)}</td>
                                            <td className="ai-num">{hFmt(totales.minutos_almuerzo)}</td>
                                            <td className="ai-num">{hFmt(totales.minutos_capacitacion)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
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

export default EquipoMensual;
