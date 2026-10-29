import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, Users, Clock, CalendarX, AlertTriangle, Download, CalendarRange, Search } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, primeraMayuscula, iniciales } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import { periodoActual, nombrePeriodo } from '../../utils/reporteHorasExtra';
import { escucharCambiosEmpleados } from '../../utils/socketAsistencia';
import SelectorVistaEquipo from './SelectorVistaEquipo';
import { CELDA, claseDia } from '../../utils/llegadaAsistencia';

// Histórico del equipo para el jefe (asistencia.md §35): KPIs del mes, un calendario tipo heatmap
// (día × empleado) agrupado por centro de costo o por cargo, y la tabla detallada por empleado.
// Es la segunda vista de "Equipo"; la primera es hoy en vivo (EquipoAsistencia).

const AZUL = 'var(--primary)';
const LEYENDA = ['puntual', 'tarde', 'ausente', 'curso_puntual', 'curso_tarde', 'pendiente'];

const AGRUPAR = [
    { id: 'centro_costo', label: 'Centro de costo' },
    { id: 'cargo', label: 'Cargo' },
    { id: 'ninguno', label: 'Sin agrupar' }
];
const SIN_DATO = { centro_costo: 'Sin centro de costo', cargo: 'Sin cargo' };

const hFmt = (min) => `${((Number(min) || 0) / 60).toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`;
const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

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

// Los mismos totales que arma el servidor (domain/asistencia/resumenMensual.js), pero sobre las
// personas filtradas, para que los KPIs respondan a los filtros.
function totalesDe(empleados) {
    const suma = (c) => empleados.reduce((a, e) => a + (Number(e[c]) || 0), 0);
    const diasTrabajados = suma('dias_trabajados');
    return {
        empleados: empleados.length,
        dias_trabajados: diasTrabajados,
        ausencias: suma('ausencias'),
        dias_tarde: suma('dias_tarde'),
        porcentaje_puntualidad: diasTrabajados > 0 ? Math.round((suma('dias_puntuales') / diasTrabajados) * 100) : null,
        ...Object.fromEntries(['minutos_trabajados', 'minutos_extra', 'minutos_bano', 'minutos_break', 'minutos_almuerzo', 'minutos_capacitacion']
            .map((c) => [c, suma(c)]))
    };
}

const opciones = (empleados, campo) => [...new Set(empleados.map((e) => e[campo] || SIN_DATO[campo]))]
    .sort((a, b) => a.localeCompare(b));

const EquipoMensual = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const periodo = searchParams.get('periodo') || periodoActual();
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroCentro, setFiltroCentro] = useState('');
    const [filtroCargo, setFiltroCargo] = useState('');
    const [agrupar, setAgrupar] = useState('centro_costo');

    // `silencioso`: recarga en vivo (aviso de un cambio de jornada) sin spinner ni borrar la tabla.
    const cargar = useCallback(async (silencioso = false) => {
        if (!silencioso) setLoading(true);
        setError(null);
        try {
            const { data } = await asistenciaService.getResumenMensualEquipo(periodo);
            setDatos(data);
        } catch (err) {
            // Una recarga en vivo que falla deja la tabla que ya se veía.
            if (silencioso) return;
            setDatos(null);
            setError(err.response?.data?.message || 'No se pudo cargar el resumen del equipo');
        } finally {
            setLoading(false);
        }
    }, [periodo]);

    useEffect(() => { cargar(); }, [cargar]);

    // En vivo solo el mes en curso (el único que cambia); la ráfaga de avisos se agrupa en 5 s.
    useEffect(() => {
        if (periodo !== periodoActual()) return undefined;
        return escucharCambiosEmpleados(() => { cargar(true); }, 5000);
    }, [periodo, cargar]);

    const dias = useMemo(() => diasDelMes(periodo), [periodo]);
    const hoy = hoyBogota();
    const todos = useMemo(() => datos?.empleados ?? [], [datos]);
    const centros = useMemo(() => opciones(todos, 'centro_costo'), [todos]);
    const cargos = useMemo(() => opciones(todos, 'cargo'), [todos]);

    const empleados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return todos.filter((e) => (!q || String(e.nombre || '').toLowerCase().includes(q) || String(e.documento || '').includes(q))
            && (!filtroCentro || (e.centro_costo || SIN_DATO.centro_costo) === filtroCentro)
            && (!filtroCargo || (e.cargo || SIN_DATO.cargo) === filtroCargo));
    }, [todos, busqueda, filtroCentro, filtroCargo]);

    const grupos = useMemo(() => {
        if (agrupar === 'ninguno') return [{ nombre: null, empleados }];
        const mapa = new Map();
        for (const e of empleados) {
            const clave = e[agrupar] || SIN_DATO[agrupar];
            if (!mapa.has(clave)) mapa.set(clave, []);
            mapa.get(clave).push(e);
        }
        return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([nombre, lista]) => ({ nombre, empleados: lista }));
    }, [empleados, agrupar]);

    const totales = useMemo(() => totalesDe(empleados), [empleados]);
    // Debajo del nombre va el dato por el que no se agrupa (si se agrupa por centro, el cargo, y al revés).
    // El centro de costo es un código y va tal cual; el cargo, con mayúscula inicial.
    const detalle = (e) => {
        const cargo = e.cargo ? primeraMayuscula(e.cargo) : '';
        if (agrupar === 'cargo') return e.centro_costo || '';
        if (agrupar === 'centro_costo') return cargo;
        return [e.centro_costo, cargo].filter(Boolean).join(' · ');
    };

    const exportar = () => {
        const cuerpo = empleados.map((e, i) => [
            i + 1, e.documento, nombrePropio(e.nombre), e.centro_costo || '', e.cargo || '',
            e.dias_trabajados, e.ausencias, e.dias_tarde, e.minutos_tarde,
            e.porcentaje_puntualidad ?? '', hFmt(e.minutos_trabajados), hFmt(e.minutos_extra),
            hFmt(e.minutos_bano), hFmt(e.minutos_break), hFmt(e.minutos_almuerzo), hFmt(e.minutos_capacitacion)
        ]);
        descargarCsv(
            `equipo_mensual_${periodo}.csv`,
            ['N°', 'Documento', 'Empleado', 'Centro de costo', 'Cargo', 'Días trab.', 'Ausencias', 'Días tarde', 'Min tarde',
                'Puntualidad %', 'H. trabajadas', 'H. extra', 'Baño', 'Break', 'Almuerzo', 'Capacitación'],
            cuerpo
        );
    };

    const porFecha = (e) => {
        const mapa = {};
        for (const d of e.dias || []) mapa[d.fecha] = d;
        return mapa;
    };

    const filtrando = Boolean(busqueda || filtroCentro || filtroCargo);

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Equipo</h1>
                    <p className="ai-page-sub">
                        Histórico · {nombrePeriodo(periodo)}
                        {datos ? ` · ${filtrando ? `${empleados.length} de ${todos.length}` : todos.length} ${todos.length === 1 ? 'persona' : 'personas'}` : ''}
                    </p>
                </div>
                <div className="ai-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <SelectorVistaEquipo />
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
            ) : todos.length === 0 ? (
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
                        <div className="ai-row" style={{ padding: '12px 16px', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
                                <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-subtle)' }} />
                                <input className="ai-input" style={{ paddingLeft: 30 }} placeholder="Buscar por nombre o cédula" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                            </div>
                            <select className="ai-input" style={{ width: 'auto', maxWidth: 240 }} value={filtroCentro} onChange={(e) => setFiltroCentro(e.target.value)} aria-label="Centro de costo">
                                <option value="">Todos los centros de costo ({centros.length})</option>
                                {centros.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className="ai-input" style={{ width: 'auto', maxWidth: 240 }} value={filtroCargo} onChange={(e) => setFiltroCargo(e.target.value)} aria-label="Cargo">
                                <option value="">Todos los cargos ({cargos.length})</option>
                                {cargos.map((c) => <option key={c} value={c}>{primeraMayuscula(c)}</option>)}
                            </select>
                            <span className="ai-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>Agrupar por</span>
                            <div className="ai-seg">
                                {AGRUPAR.map((a) => (
                                    <span key={a.id} className={agrupar === a.id ? 'is-active' : ''} style={{ cursor: 'pointer' }} onClick={() => setAgrupar(a.id)}>{a.label}</span>
                                ))}
                            </div>
                        </div>

                        <div className="ai-panel-head">
                            <h3 className="ai-panel-title">Calendario del mes</h3>
                            <div className="ai-row" style={{ gap: 12, flexWrap: 'wrap' }}>
                                {LEYENDA.map((k) => (
                                    <span key={k} className="ai-row" style={{ gap: 5, fontSize: 12, color: 'var(--ink-muted)' }}>
                                        <i style={{ width: 12, height: 12, borderRadius: 3, background: CELDA[k].bg, display: 'inline-block' }} />
                                        {CELDA[k].label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {empleados.length === 0 ? (
                            <div className="ai-empty"><p>Nadie coincide con los filtros.</p></div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="ai-mes-grid" style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 11 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ position: 'sticky', left: 0, background: 'var(--surface-100)', textAlign: 'left', zIndex: 1, minWidth: 190 }}>Empleado</th>
                                            {dias.map((d) => {
                                                const esHoy = d.fecha === hoy;
                                                return (
                                                    <th key={d.d} title={esHoy ? 'Hoy' : undefined} style={{
                                                        width: 20, textAlign: 'center', borderRadius: 4,
                                                        color: esHoy ? '#fff' : d.finde ? 'var(--ink-subtle)' : 'var(--ink-muted)',
                                                        background: esHoy ? AZUL : undefined,
                                                        fontWeight: d.finde && !esHoy ? 400 : 600
                                                    }}>{d.d}</th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grupos.map((g) => (
                                            <React.Fragment key={g.nombre || 'todos'}>
                                                {g.nombre && (
                                                    <tr>
                                                        <td colSpan={dias.length + 1} style={{ padding: '8px 6px 4px', background: 'var(--surface-200)', borderRadius: 4 }}>
                                                            <span style={{ position: 'sticky', left: 6, fontWeight: 700, fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--primary)' }}>
                                                                {agrupar === 'cargo' ? primeraMayuscula(g.nombre) : g.nombre}
                                                                <span className="ai-muted" style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}> · {g.empleados.length} {g.empleados.length === 1 ? 'persona' : 'personas'}</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )}
                                                {g.empleados.map((e) => {
                                                    const mapa = porFecha(e);
                                                    const sub = detalle(e);
                                                    return (
                                                        <tr key={e.users_company_id}>
                                                            <td style={{ position: 'sticky', left: 0, background: 'var(--surface-100)', zIndex: 1, whiteSpace: 'nowrap', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', padding: '2px 6px 2px 0' }}
                                                                title={[nombrePropio(e.nombre), e.cargo && primeraMayuscula(e.cargo), e.centro_costo, e.jefe_area && `Jefe: ${nombrePropio(e.jefe_area)}`].filter(Boolean).join(' · ')}>
                                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombrePropio(e.nombre)}</div>
                                                                {sub && <div className="ai-muted" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
                                                            </td>
                                                            {dias.map((d) => {
                                                                const celda = mapa[d.fecha];
                                                                const clase = claseDia(celda);
                                                                const cfg = clase ? CELDA[clase] : null;
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
                                                                                border: cfg ? 'none' : '1px dashed var(--border)', margin: '0 auto',
                                                                                boxShadow: d.fecha === hoy ? `0 0 0 1.5px ${AZUL}` : undefined
                                                                            }}
                                                                            aria-label={titulo}
                                                                        />
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {empleados.length > 0 && (
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
                                        {grupos.map((g) => (
                                            <React.Fragment key={g.nombre || 'todos'}>
                                                {g.nombre && (
                                                    <tr>
                                                        <td colSpan={11} style={{ background: 'var(--surface-200)', fontWeight: 700, fontSize: 11, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--primary)', padding: '6px 16px' }}>
                                                            {agrupar === 'cargo' ? primeraMayuscula(g.nombre) : g.nombre}
                                                            <span className="ai-muted" style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}> · {g.empleados.length}</span>
                                                        </td>
                                                    </tr>
                                                )}
                                                {g.empleados.map((e) => (
                                                    <tr key={e.users_company_id}>
                                                        <td>
                                                            <Link to={`/operaciones/equipo/${e.users_company_id}/trazabilidad`} className="ai-row" style={{ gap: 8, textDecoration: 'none', color: 'inherit' }}>
                                                                <span className="ai-avatar ai-avatar--sm ai-avatar--brand">{iniciales(e.nombre)}</span>
                                                                <span>
                                                                    <div style={{ fontWeight: 600 }}>{nombrePropio(e.nombre)}</div>
                                                                    <div className="ai-muted" style={{ fontSize: 12 }}>
                                                                        CC {e.documento}{detalle(e) ? ` · ${detalle(e)}` : ''}
                                                                        {e.jefe_area ? ` · Jefe: ${nombrePropio(e.jefe_area)}` : ''}
                                                                    </div>
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
                                            </React.Fragment>
                                        ))}
                                    </tbody>
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
                                </table>
                            </div>
                        </div>
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

export default EquipoMensual;
