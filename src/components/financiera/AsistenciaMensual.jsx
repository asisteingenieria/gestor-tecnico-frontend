import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, Users, Clock, CalendarX, Download, BarChart3, Search, History, X, Timer } from 'lucide-react';
import { financieraService } from '../../services/api';
import { nombrePropio, primeraMayuscula, iniciales } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import { periodoActual, nombrePeriodo } from '../../utils/reporteHorasExtra';
import { escucharCambiosEmpleados } from '../../utils/socketAsistencia';

// Reporte de asistencia para financiera/admin (asistencia.md §35-§36): estadísticas comparativas por
// campaña de toda la organización. "Ver detalle" abre una ventana con el detalle completo de la
// campaña (KPIs, calendario diario y tabla por empleado, con buscador y exportación). Absorbe la
// antigua pestaña "Trazabilidad por campaña": cada celda del calendario y cada empleado abren su
// trazabilidad diaria. La campaña abierta vive en la URL (?campania=) para volver a ella.

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

// "Outbound 7-4 · 07:00–16:00": el turno con el nombre de su plantilla (§46).
function textoTurno(turno) {
    if (!turno) return '';
    const horas = `${String(turno.hora_entrada).slice(0, 5)}–${String(turno.hora_salida).slice(0, 5)}`;
    return turno.plantilla ? `${turno.plantilla} · ${horas}` : horas;
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

    // `silencioso`: recarga en vivo (aviso de un cambio de jornada) sin spinner ni borrar la tabla.
    const cargar = useCallback(async (silencioso = false) => {
        if (!silencioso) setLoading(true);
        setError(null);
        try {
            const { data } = await financieraService.getResumenMensual(periodo, campaniaId || undefined);
            setDatos(data);
        } catch (err) {
            // Una recarga en vivo que falla deja la tabla que ya se veía.
            if (silencioso) return;
            setDatos(null);
            setError(err.response?.data?.message || 'No se pudo cargar el resumen');
        } finally {
            setLoading(false);
        }
    }, [periodo, campaniaId]);

    useEffect(() => { cargar(); }, [cargar]);

    // En vivo solo el mes en curso (el único que cambia); la ráfaga de avisos se agrupa en 5 s.
    useEffect(() => {
        if (periodo !== periodoActual()) return undefined;
        return escucharCambiosEmpleados(() => { cargar(true); }, 5000);
    }, [periodo, cargar]);

    const cambiar = (clave, valor) => {
        const next = new URLSearchParams(searchParams);
        if (valor) next.set(clave, valor); else next.delete(clave);
        setSearchParams(next);
    };

    const porCampania = datos?.por_campania ?? [];
    const totales = datos?.totales;
    // El detalle que trae la respuesta solo vale si es de la campaña abierta (mientras recarga, no).
    const campania = datos?.campania && String(datos.campania.idcampania) === campaniaId ? datos.campania : null;
    const filaCampania = porCampania.find((c) => String(c.idcampania) === campaniaId);

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

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Reporte de asistencia</h1>
                    <p className="ai-page-sub">{nombrePeriodo(periodo)} · comparativo por campaña; abre una campaña para ver su detalle completo</p>
                </div>
                <div className="ai-row">
                    <select className="ai-input" style={{ width: 220 }} value={campaniaId} onChange={(e) => cambiar('campania', e.target.value)} aria-label="Abrir campaña">
                        <option value="">Abrir campaña…</option>
                        {campanias.map((c) => <option key={c.idcampania} value={c.idcampania}>{primeraMayuscula(c.nombre)}</option>)}
                    </select>
                    <input
                        type="month" className="ai-input" style={{ width: 170 }} value={periodo} max={periodoActual()}
                        onChange={(e) => e.target.value && cambiar('periodo', e.target.value)} aria-label="Mes"
                    />
                </div>
            </div>

            {loading && !datos ? (
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
                                    {porCampania.map((c) => (
                                        <tr key={c.idcampania ?? 'sin'}>
                                            <td style={{ fontWeight: 600 }}>{primeraMayuscula(c.campania)}</td>
                                            <td className="ai-num">{c.totales.empleados}</td>
                                            <td><BarraPuntualidad pct={c.totales.porcentaje_puntualidad} /></td>
                                            <td className="ai-num"><Tendencia totales={c.totales} anterior={c.anterior} periodoAnterior={datos.periodo_anterior} /></td>
                                            <td className="ai-num">{c.totales.dias_trabajados}</td>
                                            <td className="ai-num" style={{ color: c.totales.ausencias > 0 ? 'var(--danger)' : 'inherit' }}>{c.totales.ausencias}</td>
                                            <td className="ai-num">{c.totales.dias_tarde}</td>
                                            <td className="ai-num">{hFmt(c.totales.minutos_trabajados)}</td>
                                            <td className="ai-num">{hFmt(c.totales.minutos_extra)}</td>
                                            <td className="ai-num">
                                                {c.idcampania != null && (
                                                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => cambiar('campania', String(c.idcampania))}>
                                                        Ver detalle
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
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
                </>
            )}

            {campaniaId && (
                <DetalleCampaniaModal
                    periodo={periodo}
                    periodoAnterior={datos?.periodo_anterior}
                    nombre={campania?.nombre || filaCampania?.campania || campanias.find((c) => String(c.idcampania) === campaniaId)?.nombre}
                    fila={filaCampania}
                    campania={campania}
                    loading={loading}
                    onClose={() => cambiar('campania', '')}
                />
            )}
        </div>
    );
};

// Ventana con el detalle completo de una campaña en el mes.
const DetalleCampaniaModal = ({ periodo, periodoAnterior, nombre, fila, campania, loading, onClose }) => {
    const [busqueda, setBusqueda] = useState('');
    const [centro, setCentro] = useState('');
    const dias = useMemo(() => diasDelMes(periodo), [periodo]);

    // Centros de costo de la campaña con su conteo: los horarios se definen por centro (§46).
    const centros = useMemo(() => {
        const conteo = new Map();
        for (const e of campania?.empleados ?? []) {
            const nombreCentro = e.centro_costo || 'Sin centro de costo';
            conteo.set(nombreCentro, (conteo.get(nombreCentro) || 0) + 1);
        }
        return [...conteo.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [campania]);

    useEffect(() => {
        const cerrarConEscape = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', cerrarConEscape);
        return () => window.removeEventListener('keydown', cerrarConEscape);
    }, [onClose]);

    const empleados = useMemo(() => {
        const lista = (campania?.empleados ?? []).filter((e) => !centro || (e.centro_costo || 'Sin centro de costo') === centro);
        const q = busqueda.trim().toLowerCase();
        if (!q) return lista;
        return lista.filter((e) => (e.nombre || '').toLowerCase().includes(q) || String(e.documento || '').includes(q));
    }, [campania, busqueda, centro]);

    const t = fila?.totales;

    const exportarEmpleados = () => {
        descargarCsv(
            `asistencia_${(nombre || 'campania').replace(/\s+/g, '_').toLowerCase()}_${periodo}.csv`,
            ['Empleado', 'Cédula', 'Cargo', 'Centro de costo', 'Turno', 'Días trab.', 'Ausencias', 'Días tarde', 'Min. tarde', 'Puntualidad %',
                'H. trabajadas', 'H. extra', 'Baño', 'Break', 'Almuerzo', 'Capacitación'],
            (campania?.empleados ?? []).map((e) => [
                nombrePropio(e.nombre), e.documento, primeraMayuscula(e.cargo || ''), e.centro_costo || '', textoTurno(e.turno),
                e.dias_trabajados, e.ausencias,
                e.dias_tarde, e.minutos_tarde, e.porcentaje_puntualidad ?? '', hFmt(e.minutos_trabajados), hFmt(e.minutos_extra),
                hFmt(e.minutos_bano), hFmt(e.minutos_break), hFmt(e.minutos_almuerzo), hFmt(e.minutos_capacitacion)
            ])
        );
    };

    const porFecha = (e) => {
        const mapa = {};
        for (const d of e.dias || []) mapa[d.fecha] = d;
        return mapa;
    };
    const turnosPorFecha = (e) => {
        const mapa = {};
        for (const t of e.turnos || []) mapa[String(t.fecha).slice(0, 10)] = t;
        return mapa;
    };

    return (
        <div className="ai-overlay ai-scope" onClick={onClose}>
            <div className="ai-modal" style={{ maxWidth: 1200 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Detalle de ${nombre || 'la campaña'}`}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><BarChart3 size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h2 className="ai-modal-title">{primeraMayuscula(nombre || 'Campaña')}</h2>
                        <p className="ai-modal-sub">
                            {nombrePeriodo(periodo)}
                            {campania && ` · ${campania.empleados.length} empleado${campania.empleados.length === 1 ? '' : 's'}`}
                        </p>
                    </div>
                    <button type="button" className="ai-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                </div>

                <div className="ai-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {loading || !campania ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                            <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        </div>
                    ) : (
                        <>
                            {t && (
                                <div className="ai-kpis" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
                                    <Kpi label="Puntualidad" valor={t.porcentaje_puntualidad != null ? `${t.porcentaje_puntualidad}%` : '—'} icon={<Clock size={16} strokeWidth={1.75} />}
                                        extra={<Tendencia totales={t} anterior={fila.anterior} periodoAnterior={periodoAnterior} />} />
                                    <Kpi label="Días trabajados" valor={t.dias_trabajados} icon={<BarChart3 size={16} strokeWidth={1.75} />} />
                                    <Kpi label="Ausencias" valor={t.ausencias} alerta={t.ausencias > 0} icon={<CalendarX size={16} strokeWidth={1.75} />} />
                                    <Kpi label="Días tarde" valor={t.dias_tarde} icon={<Timer size={16} strokeWidth={1.75} />} />
                                    <Kpi label="H. trabajadas" valor={hFmt(t.minutos_trabajados)} icon={<Clock size={16} strokeWidth={1.75} />} />
                                    <Kpi label="H. extra" valor={hFmt(t.minutos_extra)} icon={<Clock size={16} strokeWidth={1.75} />} />
                                </div>
                            )}

                            <div className="ai-row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                <div className="ai-row" style={{ gap: 12, flex: 1, flexWrap: 'wrap' }}>
                                    <div className="ai-input" style={{ maxWidth: 320, flex: 1 }}>
                                        <Search size={16} strokeWidth={1.75} className="ai-ic" />
                                        <input
                                            type="text" placeholder="Buscar por nombre o cédula" value={busqueda} autoFocus
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            style={{ border: 0, outline: 'none', flex: 1, background: 'transparent', color: 'var(--ink)', font: 'inherit' }}
                                        />
                                    </div>
                                    {centros.length > 1 && (
                                        <select className="ai-input" style={{ maxWidth: 260 }} value={centro} onChange={(e) => setCentro(e.target.value)} aria-label="Centro de costo">
                                            <option value="">Todos los centros de costo ({campania.empleados.length})</option>
                                            {centros.map(([nombreCentro, total]) => <option key={nombreCentro} value={nombreCentro}>{nombreCentro} ({total})</option>)}
                                        </select>
                                    )}
                                </div>
                                <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportarEmpleados} disabled={campania.empleados.length === 0}>
                                    <Download size={14} strokeWidth={1.75} /> Exportar empleados
                                </button>
                            </div>

                            <div className="ai-panel">
                                <div className="ai-panel-head">
                                    <h3 className="ai-panel-title">Calendario diario <span className="ai-muted" style={{ fontWeight: 400, fontSize: 13 }}>· clic en un día para ver su trazabilidad</span></h3>
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
                                            {empleados.map((e) => {
                                                const mapa = porFecha(e);
                                                const turnos = turnosPorFecha(e);
                                                return (
                                                    <tr key={e.users_company_id}>
                                                        <td style={{ position: 'sticky', left: 0, background: 'var(--surface-100)', zIndex: 1, whiteSpace: 'nowrap', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis' }} title={nombrePropio(e.nombre)}>{nombrePropio(e.nombre)}</td>
                                                        {dias.map((d) => {
                                                            const clase = claseDia(mapa[d.fecha]);
                                                            const cfg = clase ? CELDA[clase] : null;
                                                            const celda = mapa[d.fecha];
                                                            const turno = turnos[d.fecha];
                                                            const textoTurnoDia = turno ? ` · turno ${turno.es_descanso ? 'descanso' : textoTurno(turno)}` : ' · sin horario';
                                                            const titulo = (celda ? `${d.fecha} · ${cfg?.label}${celda.minutos_tarde > 0 ? ` (+${celda.minutos_tarde} min)` : ''}` : `${d.fecha} · sin jornada`) + textoTurnoDia;
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
                                <div className="ai-panel-head"><h3 className="ai-panel-title">Detalle por empleado</h3></div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="ai-table ai-table--dense">
                                        <thead>
                                            <tr>
                                                <th>Empleado</th>
                                                <th>Centro de costo · turno</th>
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
                                                <th className="ai-num">Trazabilidad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {empleados.length === 0 && (
                                                <tr><td colSpan={13} className="ai-muted" style={{ textAlign: 'center', padding: 16 }}>
                                                    {busqueda ? 'Nadie coincide con la búsqueda.' : 'Esta campaña no tiene empleados en el mes.'}
                                                </td></tr>
                                            )}
                                            {empleados.map((e) => (
                                                <tr key={e.users_company_id}>
                                                    <td>
                                                        <span className="ai-row" style={{ gap: 8 }}>
                                                            <span className="ai-avatar ai-avatar--sm ai-avatar--brand">{iniciales(e.nombre)}</span>
                                                            <span>
                                                                <div style={{ fontWeight: 600 }}>{nombrePropio(e.nombre)}</div>
                                                                <div className="ai-muted" style={{ fontSize: 12 }}>CC {e.documento}{e.cargo ? ` · ${primeraMayuscula(e.cargo)}` : ''}</div>
                                                            </span>
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{e.centro_costo || 'Sin centro de costo'}</div>
                                                        <div className="ai-muted" style={{ fontSize: 12 }}>{e.turno ? textoTurno(e.turno) : 'Sin horario en el mes'}</div>
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
                                                    <td className="ai-num">
                                                        <Link
                                                            to={`/recursos-humanos/trazabilidad/${e.users_company_id}`}
                                                            className="ai-icon-btn" title="Ver trazabilidad diaria" aria-label={`Ver trazabilidad de ${e.nombre}`}
                                                        >
                                                            <History size={16} strokeWidth={1.75} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const BarraPuntualidad = ({ pct }) => (
    <div className="ai-row" style={{ gap: 8 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-0)', overflow: 'hidden', minWidth: 80 }}>
            <div style={{ width: `${pct ?? 0}%`, height: '100%', background: pct >= 90 ? 'var(--success)' : pct >= 75 ? '#f59e0b' : 'var(--danger)' }} />
        </div>
        <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{pct != null ? `${pct}%` : '—'}</span>
    </div>
);

const Kpi = ({ label, valor, icon, alerta, extra }) => (
    <div className="ai-kpi" style={alerta ? { borderColor: 'var(--danger)' } : undefined}>
        <div className="ai-kpi-head"><span className="ai-kpi-label">{label}</span><span className="ai-kpi-icon">{icon}</span></div>
        <div className="ai-kpi-value">{valor}</div>
        {extra && <div style={{ fontSize: 12, marginTop: 2 }}>{extra}</div>}
    </div>
);

export default AsistenciaMensual;
