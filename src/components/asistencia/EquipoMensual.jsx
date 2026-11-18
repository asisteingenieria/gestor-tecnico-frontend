import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    Loader2, Users, Clock, CalendarX, AlertTriangle, Download, CalendarRange, Search,
    CalendarDays, CheckCircle2, Timer, User, Bath, Coffee, Utensils, GraduationCap, Table2, BarChart3, ClipboardList, Moon
} from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import { periodoActual, nombrePeriodo } from '../../utils/reporteHorasExtra';
import { escucharCambiosEmpleados } from '../../utils/socketAsistencia';
import SelectorVistaEquipo from './SelectorVistaEquipo';
import { useBaseEquipo } from '../../utils/rutaEquipo';
import { CELDA, claseDia, tardeExacto } from '../../utils/llegadaAsistencia';
import FiltroCampaniaEquipo from './FiltroCampaniaEquipo';
import GraficasEquipoMes from './GraficasEquipoMes';
import NovedadChip from './NovedadChip';
import { etiquetaNovedad } from '../../utils/novedadesAsistencia';
import { useAlcanceEquipo, paramsAlcance, sufijoAlcance, TODAS } from '../../hooks/useAlcanceEquipo';

// Histórico del equipo para el jefe (asistencia.md §35): KPIs del mes, un calendario tipo heatmap
// (día × empleado) agrupado por centro de costo o por cargo, y la tabla detallada por empleado.
// Es la segunda vista de "Equipo"; la primera es hoy en vivo (EquipoAsistencia).

const AZUL = 'var(--primary)';
const LEYENDA = ['puntual', 'tarde', 'ausente', 'novedad', 'descanso', 'curso_puntual', 'curso_tarde', 'pendiente'];

// Tipos de novedad de RRHH que tuvo la persona en el mes (para el distintivo y su title, §71).
const tiposNovedad = (e) => [...new Set((e.dias || []).filter((d) => d.novedad).map((d) => d.novedad.tipo))];

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
        dias_novedad: suma('dias_novedad'),
        dias_descanso: suma('dias_descanso'),
        dias_tarde: suma('dias_tarde'),
        porcentaje_puntualidad: diasTrabajados > 0 ? Math.round((suma('dias_puntuales') / diasTrabajados) * 100) : null,
        ...Object.fromEntries(['minutos_trabajados', 'minutos_extra', 'minutos_bano', 'minutos_break', 'minutos_almuerzo', 'minutos_capacitacion']
            .map((c) => [c, suma(c)]))
    };
}

const opciones = (empleados, campo) => [...new Set(empleados.map((e) => e[campo] || SIN_DATO[campo]))]
    .sort((a, b) => a.localeCompare(b));

const EquipoMensual = () => {
    const baseEquipo = useBaseEquipo();
    const [searchParams, setSearchParams] = useSearchParams();
    const periodo = searchParams.get('periodo') || periodoActual();
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroCentro, setFiltroCentro] = useState('');
    const [filtroCargo, setFiltroCargo] = useState('');
    const [agrupar, setAgrupar] = useState('centro_costo');
    // Detalle por empleado como tabla o como gráficas (mismos datos y filtros).
    const [vistaDetalle, setVistaDetalle] = useState('tabla');
    // Director de Tecnología (§68): su equipo o una campaña. El histórico va campaña por campaña:
    // "Todas las campañas" de la vista Hoy aquí es su equipo.
    const { verTodas, campanias, alcance: alcanceUrl, cambiarAlcance } = useAlcanceEquipo();
    const alcance = alcanceUrl === TODAS ? '' : alcanceUrl;
    const nombreCampania = alcance ? primeraMayuscula(campanias.find((c) => String(c.idcampania) === alcance)?.nombre || 'Campaña') : null;

    // `silencioso`: recarga en vivo (aviso de un cambio de jornada) sin spinner ni borrar la tabla.
    const cargar = useCallback(async (silencioso = false) => {
        if (!silencioso) setLoading(true);
        setError(null);
        try {
            const { data } = await asistenciaService.getResumenMensualEquipo(periodo, paramsAlcance(alcance, false));
            setDatos(data);
        } catch (err) {
            // Una recarga en vivo que falla deja la tabla que ya se veía.
            if (silencioso) return;
            setDatos(null);
            setError(err.response?.data?.message || 'No se pudo cargar el resumen del equipo');
        } finally {
            setLoading(false);
        }
    }, [periodo, alcance]);

    const cambiarCampania = (valor) => {
        setFiltroCentro('');
        setFiltroCargo('');
        cambiarAlcance(valor);
    };

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
            e.dias_trabajados, e.ausencias, e.dias_novedad || 0, tiposNovedad(e).join(' / '), e.dias_tarde, e.minutos_tarde > 0 ? tardeExacto(e.segundos_tarde, e.minutos_tarde) : '',
            e.porcentaje_puntualidad ?? '', hFmt(e.minutos_trabajados), hFmt(e.minutos_extra),
            hFmt(e.minutos_bano), hFmt(e.minutos_break), hFmt(e.minutos_almuerzo), hFmt(e.minutos_capacitacion)
        ]);
        descargarCsv(
            `equipo_mensual_${periodo}.csv`,
            ['N°', 'Documento', 'Empleado', 'Centro de costo', 'Cargo', 'Días trab.', 'Ausencias', 'Días con novedad', 'Novedades', 'Días tarde', 'Tiempo tarde',
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
            <div className="ai-monitor-head">
                <div className="ai-monitor-titulo">
                    <Users size={52} strokeWidth={1.6} aria-hidden="true" />
                    <div>
                        <h1>Equipo</h1>
                        <p>
                            Histórico · {nombrePeriodo(periodo)}{nombreCampania ? ` · ${nombreCampania} · solo consulta` : ''}
                            {datos ? ` · ${filtrando ? `${empleados.length} de ${todos.length}` : todos.length} ${todos.length === 1 ? 'persona' : 'personas'}` : ''}
                        </p>
                    </div>
                </div>
                <div className="ai-monitor-acciones">
                    <SelectorVistaEquipo />
                    {verTodas && (
                        <FiltroCampaniaEquipo alcance={alcance} campanias={campanias} onChange={cambiarCampania} incluirTodas={false} />
                    )}
                    <input
                        type="month" className="ai-monitor-btn ai-monitor-mes" value={periodo} max={periodoActual()}
                        onChange={(e) => e.target.value && setSearchParams((prev) => {
                            const params = new URLSearchParams(prev);
                            params.set('periodo', e.target.value);
                            return params;
                        })} aria-label="Mes"
                    />
                    <button type="button" className="ai-monitor-btn" onClick={exportar} disabled={empleados.length === 0}>
                        <Download size={15} strokeWidth={2} /> Exportar
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
                    <p>{nombreCampania ? `${nombreCampania} no tiene personal activo` : `No tienes empleados a cargo con datos en ${nombrePeriodo(periodo).toLowerCase()}`}.</p>
                </div>
            ) : (
                <>
                    {/* KPIs del mes en mosaicos, con los colores de los estados de la vista Hoy. */}
                    <div className="ai-monitor-mosaicos">
                        <Mosaico color="conectado" icono={CheckCircle2} valor={totales.porcentaje_puntualidad != null ? `${totales.porcentaje_puntualidad}%` : '—'} label="Puntualidad" />
                        <Mosaico color="en_turno" icono={Users} valor={totales.dias_trabajados} label="Días trabajados" />
                        <Mosaico color="bano" icono={Timer} valor={hFmt(totales.minutos_trabajados)} label="Horas trabajadas" />
                        <Mosaico color="no_llego" icono={CalendarX} valor={totales.ausencias} label="Ausencias" />
                        <Mosaico color="novedad" icono={ClipboardList} valor={totales.dias_novedad} label="Días con novedad" />
                        <Mosaico color="descanso" icono={Moon} valor={totales.dias_descanso || 0} label="Días de descanso" />
                        <Mosaico color="almuerzo" icono={AlertTriangle} valor={totales.dias_tarde} label="Días tarde" />
                        <Mosaico color="capacitacion" icono={Clock} valor={hFmt(totales.minutos_extra)} label="Horas extra" />
                    </div>

                    <div className="ai-monitor-barra">
                        <div className="ai-input">
                            <Search size={16} strokeWidth={1.75} className="ai-ic" />
                            <input
                                type="text" placeholder="Buscar por nombre o cédula..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                                style={{ border: 0, outline: 'none', flex: 1, background: 'transparent', color: 'var(--ink)', font: 'inherit' }}
                            />
                        </div>
                        <select className="ai-input ai-monitor-select" value={filtroCentro} onChange={(e) => setFiltroCentro(e.target.value)} aria-label="Centro de costo">
                            <option value="">Todos los centros de costo ({centros.length})</option>
                            {centros.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="ai-input ai-monitor-select" value={filtroCargo} onChange={(e) => setFiltroCargo(e.target.value)} aria-label="Cargo">
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

                    <div className="ai-monitor-panel">
                        <div className="ai-monitor-panel-head">
                            <h3><CalendarDays size={18} strokeWidth={2} aria-hidden="true" /> Calendario del mes</h3>
                            <div className="ai-monitor-leyenda" style={{ borderLeft: 0, paddingLeft: 0 }}>
                                {LEYENDA.map((k) => (
                                    <span key={k}>
                                        <i style={{ width: 12, height: 12, borderRadius: 3, background: CELDA[k].bg, display: 'inline-block' }} />
                                        {CELDA[k].label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {empleados.length === 0 ? (
                            <div className="ai-empty"><p>Nadie coincide con los filtros.</p></div>
                        ) : (
                            <div style={{ overflowX: 'auto', padding: '4px 12px 12px' }}>
                                <table className="ai-mes-grid" style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 11 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ position: 'sticky', left: 0, background: 'var(--surface-100)', textAlign: 'left', zIndex: 1, minWidth: 190, color: 'var(--mon-ink)' }}>Empleado</th>
                                            {dias.map((d) => {
                                                const esHoy = d.fecha === hoy;
                                                return (
                                                    <th key={d.d} title={esHoy ? 'Hoy' : undefined} style={{
                                                        width: 20, textAlign: 'center', borderRadius: 4,
                                                        color: esHoy ? '#fff' : d.finde ? 'var(--ink-subtle)' : 'var(--mon-ink)',
                                                        background: esHoy ? AZUL : undefined,
                                                        fontWeight: d.finde && !esHoy ? 400 : 700
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
                                                        <td colSpan={dias.length + 1} className="ai-monitor-grupo" style={{ borderRadius: 6 }}>
                                                            <span style={{ position: 'sticky', left: 6 }}>
                                                                {agrupar === 'cargo' ? primeraMayuscula(g.nombre) : g.nombre}
                                                                <span className="ai-monitor-grupo-n"> · {g.empleados.length} {g.empleados.length === 1 ? 'persona' : 'personas'}</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )}
                                                {g.empleados.map((e) => {
                                                    const mapa = porFecha(e);
                                                    const sub = detalle(e);
                                                    return (
                                                        <tr key={e.users_company_id}>
                                                            <td style={{ position: 'sticky', left: 0, background: 'var(--surface-100)', zIndex: 1, whiteSpace: 'nowrap', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', padding: '2px 6px 2px 0', color: 'var(--mon-ink)' }}
                                                                title={[nombrePropio(e.nombre), e.cargo && primeraMayuscula(e.cargo), e.centro_costo, e.jefe_area && `Jefe: ${nombrePropio(e.jefe_area)}`].filter(Boolean).join(' · ')}>
                                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>{nombrePropio(e.nombre)}</div>
                                                                {sub && <div className="ai-muted" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
                                                            </td>
                                                            {dias.map((d) => {
                                                                const celda = mapa[d.fecha];
                                                                const clase = claseDia(celda);
                                                                const cfg = clase ? CELDA[clase] : null;
                                                                const titulo = celda
                                                                    ? `${d.fecha} · ${cfg?.label}${celda.minutos_tarde > 0 ? ` (+${tardeExacto(celda.segundos_tarde, celda.minutos_tarde)})` : ''}${celda.novedad ? ` · ${celda.novedad.tipo}` : ''}`
                                                                    : `${d.fecha} · sin jornada`;
                                                                return (
                                                                    <td key={d.d} style={{ padding: 0 }}>
                                                                        <Link
                                                                            to={`${baseEquipo}/equipo/${e.users_company_id}/trazabilidad?fecha=${d.fecha}${sufijoAlcance(alcance, '&')}`}
                                                                            title={titulo}
                                                                            style={{
                                                                                display: 'block', width: 18, height: 18, borderRadius: 4,
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
                        <div className="ai-monitor-detalle-head">
                            <h3><User size={18} strokeWidth={2} aria-hidden="true" /> Detalle por empleado</h3>
                            <div className="ai-seg" role="tablist" aria-label="Ver el detalle como">
                                {[{ id: 'tabla', label: 'Tabla', icono: Table2 }, { id: 'grafica', label: 'Gráfica', icono: BarChart3 }].map((v) => (
                                    <span
                                        key={v.id} role="tab" tabIndex={0} aria-selected={vistaDetalle === v.id}
                                        className={vistaDetalle === v.id ? 'is-active' : ''} style={{ cursor: 'pointer' }}
                                        onClick={() => setVistaDetalle(v.id)}
                                        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setVistaDetalle(v.id); }}
                                    >
                                        {React.createElement(v.icono, { size: 14, strokeWidth: 1.9 })} {v.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {empleados.length > 0 && vistaDetalle === 'grafica' && (
                        <div className="ai-monitor-panel">
                            <GraficasEquipoMes
                                empleados={empleados}
                                hrefDe={(e) => `${baseEquipo}/equipo/${e.users_company_id}/trazabilidad${sufijoAlcance(alcance)}`}
                            />
                        </div>
                    )}

                    {empleados.length > 0 && vistaDetalle === 'tabla' && (
                        <div className="ai-monitor-tabla-wrap">
                            <table className="ai-monitor-tabla ai-monitor-tabla--fija">
                                <thead>
                                    <tr>
                                        {COLUMNAS_DETALLE.map((c) => (
                                            <th key={c.id} title={c.title}>
                                                <span className="ai-monitor-th"><c.icono size={17} strokeWidth={1.9} aria-hidden="true" />{c.label}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {grupos.map((g) => (
                                        <React.Fragment key={g.nombre || 'todos'}>
                                            {g.nombre && (
                                                <tr className="ai-monitor-fila-grupo">
                                                    <td colSpan={COLUMNAS_DETALLE.length} className="ai-monitor-grupo">
                                                        {agrupar === 'cargo' ? primeraMayuscula(g.nombre) : g.nombre}
                                                        <span className="ai-monitor-grupo-n"> · {g.empleados.length}</span>
                                                    </td>
                                                </tr>
                                            )}
                                            {g.empleados.map((e) => (
                                                <tr key={e.users_company_id}>
                                                    <td className="ai-monitor-nombre">
                                                        <Link to={`${baseEquipo}/equipo/${e.users_company_id}/trazabilidad${sufijoAlcance(alcance)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                                                            <i className="ai-monitor-avatar" aria-hidden="true"><User size={16} strokeWidth={2.4} /></i>
                                                            <span>
                                                                <div>
                                                                    {nombrePropio(e.nombre).toUpperCase()}
                                                                    {e.dias_novedad > 0 && (
                                                                        <NovedadChip
                                                                            texto={`${e.dias_novedad} ${e.dias_novedad === 1 ? 'día' : 'días'} · ${[...new Set(tiposNovedad(e).map(etiquetaNovedad))].join(', ')}`}
                                                                            titulo={`${e.dias_novedad} ${e.dias_novedad === 1 ? 'día' : 'días'} sin asistir por novedad de RRHH: ${tiposNovedad(e).join(', ')}`}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="ai-muted" style={{ fontSize: 11.5, fontWeight: 500 }}>
                                                                    CC {e.documento}{detalle(e) ? ` · ${detalle(e)}` : ''}
                                                                    {e.jefe_area ? ` · Jefe: ${nombrePropio(e.jefe_area)}` : ''}
                                                                </div>
                                                            </span>
                                                        </Link>
                                                    </td>
                                                    <td className="ai-monitor-centro" style={{ fontWeight: 700 }}>{e.dias_trabajados}</td>
                                                    <td className="ai-monitor-centro">
                                                        {e.ausencias > 0 ? <Pastilla color="no_llego">{e.ausencias}</Pastilla> : 0}
                                                    </td>
                                                    <td className="ai-monitor-centro" title={tiposNovedad(e).join(', ') || undefined}>
                                                        {e.dias_novedad > 0 ? <Pastilla color="novedad">{e.dias_novedad}</Pastilla> : 0}
                                                    </td>
                                                    <td className="ai-monitor-centro">
                                                        {e.dias_tarde > 0
                                                            ? <Pastilla color="almuerzo">{e.dias_tarde}{e.minutos_tarde > 0 ? ` · ${tardeExacto(e.segundos_tarde, e.minutos_tarde)}` : ''}</Pastilla>
                                                            : 0}
                                                    </td>
                                                    <td className="ai-monitor-centro">
                                                        {e.porcentaje_puntualidad != null
                                                            ? <Pastilla color={e.porcentaje_puntualidad >= 90 ? 'conectado' : e.porcentaje_puntualidad >= 70 ? 'break' : 'no_llego'}>{e.porcentaje_puntualidad}%</Pastilla>
                                                            : '—'}
                                                    </td>
                                                    <td className="ai-monitor-centro" style={{ fontWeight: 700 }}>{hFmt(e.minutos_trabajados)}</td>
                                                    <td className="ai-monitor-centro">{hFmt(e.minutos_extra)}</td>
                                                    <td className="ai-monitor-centro">{hFmt(e.minutos_bano)}</td>
                                                    <td className="ai-monitor-centro">{hFmt(e.minutos_break)}</td>
                                                    <td className="ai-monitor-centro">{hFmt(e.minutos_almuerzo)}</td>
                                                    <td className="ai-monitor-centro">{hFmt(e.minutos_capacitacion)}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td>Total ({totales.empleados})</td>
                                        <td className="ai-monitor-centro">{totales.dias_trabajados}</td>
                                        <td className="ai-monitor-centro">{totales.ausencias}</td>
                                        <td className="ai-monitor-centro">{totales.dias_novedad}</td>
                                        <td className="ai-monitor-centro">{totales.dias_tarde}</td>
                                        <td className="ai-monitor-centro">{totales.porcentaje_puntualidad != null ? `${totales.porcentaje_puntualidad}%` : '—'}</td>
                                        <td className="ai-monitor-centro">{hFmt(totales.minutos_trabajados)}</td>
                                        <td className="ai-monitor-centro">{hFmt(totales.minutos_extra)}</td>
                                        <td className="ai-monitor-centro">{hFmt(totales.minutos_bano)}</td>
                                        <td className="ai-monitor-centro">{hFmt(totales.minutos_break)}</td>
                                        <td className="ai-monitor-centro">{hFmt(totales.minutos_almuerzo)}</td>
                                        <td className="ai-monitor-centro">{hFmt(totales.minutos_capacitacion)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// Columnas del detalle por empleado, con su ícono como en la tabla de la vista Hoy.
const COLUMNAS_DETALLE = [
    { id: 'empleado', label: 'Empleado', icono: User },
    { id: 'dias', label: 'Días trab.', icono: CalendarDays },
    { id: 'ausencias', label: 'Ausencias', icono: CalendarX },
    { id: 'novedad', label: 'Con novedad', icono: ClipboardList, title: 'Días que no asistió por una novedad de RRHH (no son ausencias)' },
    { id: 'tarde', label: 'Días tarde', icono: AlertTriangle },
    { id: 'puntualidad', label: 'Puntualidad', icono: CheckCircle2 },
    { id: 'trabajadas', label: 'H. trabajadas', icono: Timer },
    { id: 'extra', label: 'H. extra', icono: Clock },
    { id: 'bano', label: 'Baño', icono: Bath },
    { id: 'break', label: 'Break', icono: Coffee },
    { id: 'almuerzo', label: 'Almuerzo', icono: Utensils },
    { id: 'capacitacion', label: 'Capac.', icono: GraduationCap, title: 'Capacitación (cuenta como laborada)' }
];

// KPI del mes con el estilo de los mosaicos de la vista Hoy (colores .ai-st--*); no filtra.
const Mosaico = ({ color, icono, valor, label }) => (
    <div className={`ai-monitor-mosaico ai-monitor-mosaico--estatico ai-st--${color}`}>
        {React.createElement(icono, { size: 26, strokeWidth: 2, className: "ai-monitor-ic", "aria-hidden": "true" })}
        <span className="ai-monitor-num">{valor}</span>
        <span className="ai-monitor-lbl">{label}</span>
    </div>
);

const Pastilla = ({ color, children }) => (
    <span className={`ai-monitor-pill ai-monitor-pill--acum ai-st--${color}`} style={{ minWidth: 44 }}>{children}</span>
);

export default EquipoMensual;
