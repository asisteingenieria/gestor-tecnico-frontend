import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, FileSpreadsheet, CalendarClock, Download, ChevronRight, Inbox, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { financieraService } from '../../services/api';
import { nombrePropio } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import {
    CLASES_HORAS, ESTADO_REPORTE, formatearHoras, periodoActual, periodoAnterior, nombrePeriodo,
    formatearFechaCorta, formatearInstante
} from '../../utils/reporteHorasExtra';

// Bandeja de financiera (asistencia.md §32): un mes, su fecha límite y el estado del reporte de
// cada jefe de área, incluidos los que todavía no lo envían.

const FILTROS = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendientes', label: 'Sin enviar', estados: ['sin_reporte', 'borrador'] },
    { id: 'enviado', label: 'Por revisar', estados: ['enviado'] },
    { id: 'devuelto', label: 'Devueltos', estados: ['devuelto'] },
    { id: 'aprobado', label: 'Aprobados', estados: ['aprobado'] }
];

const ReportesHorasExtra = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    // Se reportan las horas del mes que cerró: por defecto el anterior.
    const periodo = searchParams.get('periodo') || periodoAnterior();
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState('todos');
    const [fechaLimite, setFechaLimite] = useState('');
    const [guardandoFecha, setGuardandoFecha] = useState(false);
    const [avisoFecha, setAvisoFecha] = useState(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await financieraService.getReportesDelPeriodo(periodo);
            setDatos(data);
            setFechaLimite(data.fecha_limite || '');
        } catch (err) {
            setDatos(null);
            setError(err.response?.data?.message || 'No se pudieron cargar los reportes');
        } finally {
            setLoading(false);
        }
    }, [periodo]);

    useEffect(() => { cargar(); setAvisoFecha(null); }, [cargar]);

    const guardarFecha = async (e) => {
        e.preventDefault();
        if (!fechaLimite) return;
        setGuardandoFecha(true);
        setAvisoFecha(null);
        try {
            await financieraService.fijarFechaLimite(periodo, fechaLimite);
            setAvisoFecha({ ok: true, texto: 'Fecha límite guardada. La campana les avisa a los jefes desde unos días antes.' });
            await cargar();
        } catch (err) {
            setAvisoFecha({ ok: false, texto: err.response?.data?.message || 'No se pudo guardar la fecha' });
        } finally {
            setGuardandoFecha(false);
        }
    };

    const jefes = datos?.jefes || [];
    const estadosFiltro = FILTROS.find((f) => f.id === filtro)?.estados;
    const visibles = estadosFiltro ? jefes.filter((j) => estadosFiltro.includes(j.estado)) : jefes;

    const exportar = () => {
        const filas = jefes.map((j) => [
            nombrePropio(j.jefe_nombre), j.jefe_documento || '', ESTADO_REPORTE[j.estado]?.label || j.estado,
            j.enviado_en ? formatearInstante(j.enviado_en) : '', j.fuera_de_plazo ? 'Sí' : '',
            j.empleados ?? 0, ...CLASES_HORAS.map((c) => j[c.campo] ?? 0), j.total ?? 0
        ]);
        descargarCsv(
            `reportes_horas_extra_${periodo}.csv`,
            ['Jefe de área', 'Cédula', 'Estado', 'Enviado', 'Fuera de plazo', 'Empleados', ...CLASES_HORAS.map((c) => c.label), 'Total'],
            filas
        );
    };

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Reportes de horas extras</h1>
                    <p className="ai-page-sub">{nombrePeriodo(periodo)} · lo que envía cada jefe de área</p>
                </div>
                <div className="ai-row">
                    <input
                        type="month" className="ai-input" style={{ width: 170 }} value={periodo} max={periodoActual()}
                        onChange={(e) => e.target.value && setSearchParams({ periodo: e.target.value })}
                        aria-label="Mes"
                    />
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportar} disabled={jefes.length === 0}>
                        <Download size={14} strokeWidth={1.75} /> Exportar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            ) : !datos ? (
                <div className="ai-panel ai-empty"><p style={{ color: 'var(--danger)' }}>{error}</p></div>
            ) : (
                <>
                    <div className="ai-kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                        <div className="ai-kpi">
                            <div className="ai-kpi-head"><span className="ai-kpi-label">Sin enviar</span><span className="ai-kpi-icon"><Clock size={16} strokeWidth={1.75} /></span></div>
                            <div className="ai-kpi-value" style={{ color: datos.resumen.sin_enviar > 0 ? 'var(--warning)' : undefined }}>{datos.resumen.sin_enviar}</div>
                            <div className="ai-kpi-foot">de {datos.resumen.jefes} jefes de área</div>
                        </div>
                        <div className="ai-kpi">
                            <div className="ai-kpi-head"><span className="ai-kpi-label">Por revisar</span><span className="ai-kpi-icon"><Inbox size={16} strokeWidth={1.75} /></span></div>
                            <div className="ai-kpi-value" style={{ color: datos.resumen.por_revisar > 0 ? 'var(--primary)' : undefined }}>{datos.resumen.por_revisar}</div>
                        </div>
                        <div className="ai-kpi">
                            <div className="ai-kpi-head"><span className="ai-kpi-label">Aprobados</span><span className="ai-kpi-icon"><CheckCircle2 size={16} strokeWidth={1.75} /></span></div>
                            <div className="ai-kpi-value" style={{ color: 'var(--success)' }}>{datos.resumen.aprobados}</div>
                            <div className="ai-kpi-foot">{datos.resumen.devueltos} devuelto{datos.resumen.devueltos === 1 ? '' : 's'}</div>
                        </div>
                        <div className="ai-kpi">
                            <div className="ai-kpi-head"><span className="ai-kpi-label">Horas recibidas</span><span className="ai-kpi-icon"><FileSpreadsheet size={16} strokeWidth={1.75} /></span></div>
                            <div className="ai-kpi-value">{formatearHoras(datos.totales?.total)}</div>
                            <div className="ai-kpi-foot">enviadas y aprobadas</div>
                        </div>
                    </div>

                    <div className="ai-panel">
                        <form className="ai-panel-body ai-row" style={{ flexWrap: 'wrap', gap: 12 }} onSubmit={guardarFecha}>
                            <CalendarClock size={18} strokeWidth={1.75} style={{ color: 'var(--primary)' }} />
                            <span style={{ fontWeight: 600 }}>Fecha límite para {nombrePeriodo(periodo).toLowerCase()}</span>
                            <input
                                type="date" className="ai-input" style={{ width: 170 }} value={fechaLimite} required
                                onChange={(e) => setFechaLimite(e.target.value)} aria-label="Fecha límite"
                            />
                            <button type="submit" className="ai-btn ai-btn--primary ai-btn--sm" disabled={guardandoFecha || !fechaLimite || fechaLimite === datos.fecha_limite}>
                                {guardandoFecha ? 'Guardando…' : 'Guardar'}
                            </button>
                            {!datos.fecha_limite && <span className="ai-muted" style={{ fontSize: 13 }}>Sin fecha límite, la campana no les recuerda a los jefes.</span>}
                            {avisoFecha && <span style={{ fontSize: 13, color: avisoFecha.ok ? 'var(--success)' : 'var(--danger)' }}>{avisoFecha.texto}</span>}
                        </form>
                    </div>

                    <div className="ai-panel">
                        <div className="ai-tabs">
                            {FILTROS.map((f) => (
                                <button
                                    key={f.id} type="button" className={`ai-tab ${filtro === f.id ? 'is-active' : ''}`}
                                    style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setFiltro(f.id)}
                                >
                                    {f.label}
                                    <span className="ai-count">{f.estados ? jefes.filter((j) => f.estados.includes(j.estado)).length : jefes.length}</span>
                                </button>
                            ))}
                        </div>
                        {visibles.length === 0 ? (
                            <div className="ai-empty">
                                <Inbox size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                                <p>No hay jefes en esta bandeja.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="ai-table ai-table--dense">
                                    <thead>
                                        <tr>
                                            <th>Jefe de área</th>
                                            <th>Estado</th>
                                            <th>Enviado</th>
                                            <th className="ai-num">Empleados</th>
                                            <th className="ai-num">Total horas</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibles.map((j) => {
                                            const badge = ESTADO_REPORTE[j.estado] || ESTADO_REPORTE.sin_reporte;
                                            const tieneDetalle = j.idreporte_horas_extra && j.estado !== 'borrador';
                                            return (
                                                <tr key={j.jefe_users_company_id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>{nombrePropio(j.jefe_nombre)}</div>
                                                        <div className="ai-muted" style={{ fontSize: 12 }}>CC {j.jefe_documento} · {j.personas_a_cargo ?? 0} a cargo</div>
                                                    </td>
                                                    <td>
                                                        <span className={`ai-badge ${badge.clase}`}>{badge.label}</span>
                                                        {j.estado === 'devuelto' && j.observacion_financiera && (
                                                            <div className="ai-muted" style={{ fontSize: 12, marginTop: 2, maxWidth: 280 }}>{j.observacion_financiera}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: 13 }}>
                                                        {j.enviado_en ? formatearInstante(j.enviado_en) : <span className="ai-muted">—</span>}
                                                        {j.fuera_de_plazo && (
                                                            <span className="ai-badge ai-badge--warning" style={{ marginLeft: 6 }}>
                                                                <AlertTriangle size={12} strokeWidth={1.75} /> Fuera de plazo
                                                            </span>
                                                        )}
                                                        {j.veces_enviado > 1 && <div className="ai-muted" style={{ fontSize: 12 }}>Enviado {j.veces_enviado} veces</div>}
                                                    </td>
                                                    <td className="ai-num">{tieneDetalle ? j.empleados : '—'}</td>
                                                    <td className="ai-num" style={{ fontWeight: 600 }}>{tieneDetalle ? formatearHoras(j.total) : '—'}</td>
                                                    <td>
                                                        {tieneDetalle && (
                                                            <Link to={`/recursos-humanos/reportes-horas-extra/${j.idreporte_horas_extra}`} className="ai-btn ai-btn--secondary ai-btn--sm">
                                                                {j.estado === 'enviado' ? 'Revisar' : 'Ver'} <ChevronRight size={14} strokeWidth={1.75} />
                                                            </Link>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {datos.fecha_limite && (
                        <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}>
                            Plazo: {formatearFechaCorta(datos.fecha_limite)}. Un reporte enviado después queda marcado como fuera de plazo.
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

export default ReportesHorasExtra;
