import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, FileSpreadsheet, Send, Save, Plus, Trash2, CheckCircle2, AlertTriangle, CalendarClock, X } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import {
    CLASES_HORAS, ESTADO_REPORTE, totalFila, horasExtraFila, horasDeMinutos, formatearHoras,
    periodoActual, nombrePeriodo, formatearFechaCorta, formatearInstante
} from '../../utils/reporteHorasExtra';

// Reporte mensual de horas extras del jefe de área a financiera (asistencia.md §32). Reemplaza
// el Excel "FORMATO REPORTE DE HORAS EXTRAS V.3": Gestor trae a quienes tienen horas extra
// aprobadas en el mes y el jefe las reparte en las 5 clases del formato.

const aFilaEditable = (f) => ({
    ...f,
    ...Object.fromEntries(CLASES_HORAS.map((c) => [c.campo, f[c.campo] ? String(f[c.campo]) : ''])),
    aclaraciones: f.aclaraciones || ''
});

const aCuerpo = (filas) => filas.map((f) => ({
    users_company_id: f.users_company_id,
    ...Object.fromEntries(CLASES_HORAS.map((c) => [c.campo, f[c.campo] === '' ? 0 : Number(f[c.campo])])),
    aclaraciones: f.aclaraciones
}));

function Cuadre({ fila }) {
    const aprobadas = horasDeMinutos(fila.minutos_aprobados);
    const diferencia = Math.round((horasExtraFila(fila) - aprobadas) * 100) / 100;
    if (aprobadas === 0 && horasExtraFila(fila) === 0) return <span className="ai-muted" style={{ fontSize: 12 }}>Sin extras</span>;
    if (Math.abs(diferencia) < 0.01) {
        return <span className="ai-badge ai-badge--success"><CheckCircle2 size={12} strokeWidth={1.75} /> Cuadra</span>;
    }
    return (
        <span className="ai-badge ai-badge--warning" title="Extras diurnas + nocturnas + dominicales (115%) deben sumar las horas aprobadas">
            {diferencia < 0 ? `Faltan ${formatearHoras(-diferencia)} h` : `Sobran ${formatearHoras(diferencia)} h`}
        </span>
    );
}

const ReporteHorasExtra = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const periodo = searchParams.get('periodo') || periodoActual();
    const [datos, setDatos] = useState(null);
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(null);
    const [error, setError] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [aviso, setAviso] = useState(null);
    const [confirmarEnvio, setConfirmarEnvio] = useState(false);
    const [agregar, setAgregar] = useState('');

    const aplicar = (data) => {
        setDatos(data);
        setFilas(data.filas.map(aFilaEditable));
    };

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        setDetalles([]);
        setAviso(null);
        try {
            const { data } = await asistenciaService.getReporteHorasExtra(periodo);
            aplicar(data);
        } catch (err) {
            setDatos(null);
            setError(err.response?.data?.message || 'No se pudo cargar el reporte');
        } finally {
            setLoading(false);
        }
    }, [periodo]);

    useEffect(() => { cargar(); }, [cargar]);

    const editable = Boolean(datos?.editable);
    const estado = datos?.reporte?.estado || 'sin_reporte';

    const totales = useMemo(() => {
        const t = Object.fromEntries(CLASES_HORAS.map((c) => [c.campo, 0]));
        let aprobadas = 0;
        for (const f of filas) {
            for (const c of CLASES_HORAS) t[c.campo] += Number(f[c.campo]) || 0;
            aprobadas += horasDeMinutos(f.minutos_aprobados);
        }
        return { ...t, total: totalFila(t), aprobadas, extras: horasExtraFila(t) };
    }, [filas]);

    const disponibles = useMemo(() => {
        const en = new Set(filas.map((f) => f.users_company_id));
        return (datos?.equipo || []).filter((e) => !en.has(e.users_company_id));
    }, [datos, filas]);

    const cambiar = (id, campo, valor) => {
        setFilas((prev) => prev.map((f) => (f.users_company_id === id ? { ...f, [campo]: valor } : f)));
    };

    const agregarEmpleado = () => {
        const e = (datos?.equipo || []).find((x) => String(x.users_company_id) === agregar);
        if (!e) return;
        setFilas((prev) => [...prev, aFilaEditable({ ...e, minutos_aprobados: 0 })]);
        setAgregar('');
    };

    const quitar = (id) => setFilas((prev) => prev.filter((f) => f.users_company_id !== id));

    const guardar = async (enviar) => {
        setGuardando(enviar ? 'enviar' : 'guardar');
        setError(null);
        setDetalles([]);
        setAviso(null);
        try {
            const llamada = enviar ? asistenciaService.enviarReporteHorasExtra : asistenciaService.guardarReporteHorasExtra;
            const { data } = await llamada(periodo, aCuerpo(filas));
            aplicar(data);
            setAviso(enviar ? 'Reporte enviado a financiera.' : 'Borrador guardado. Todavía no le llega a financiera.');
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo guardar el reporte');
            setDetalles(err.response?.data?.detalles || []);
        } finally {
            setGuardando(null);
            setConfirmarEnvio(false);
        }
    };

    const cambiarPeriodo = (valor) => {
        if (valor) setSearchParams({ periodo: valor });
    };

    const badge = ESTADO_REPORTE[estado] || ESTADO_REPORTE.sin_reporte;

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Reporte de horas extras</h1>
                    <p className="ai-page-sub">{nombrePeriodo(periodo)} · se envía a financiera</p>
                </div>
                <div className="ai-row">
                    <input
                        type="month"
                        className="ai-input"
                        style={{ width: 170 }}
                        value={periodo}
                        max={periodoActual()}
                        onChange={(e) => cambiarPeriodo(e.target.value)}
                        aria-label="Mes del reporte"
                    />
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
                    <div className="ai-kpi-strip">
                        <div>
                            <span className="ai-kpi-icon"><FileSpreadsheet size={16} strokeWidth={1.75} /></span>
                            <span><span className="ai-kpi-label">Estado</span><div style={{ marginTop: 4 }}><span className={`ai-badge ${badge.clase}`}>{badge.label}</span></div></span>
                        </div>
                        <div>
                            <span className="ai-kpi-icon"><CalendarClock size={16} strokeWidth={1.75} /></span>
                            <span>
                                <span className="ai-kpi-label">Fecha límite</span>
                                <div className="ai-kpi-value" style={{ fontSize: 16 }}>{datos.fecha_limite ? formatearFechaCorta(datos.fecha_limite) : 'Sin definir'}</div>
                            </span>
                        </div>
                        <div>
                            <span><span className="ai-kpi-label">Horas extra aprobadas</span><div className="ai-kpi-value">{formatearHoras(totales.aprobadas)} h</div></span>
                        </div>
                        <div>
                            <span><span className="ai-kpi-label">Total reportado</span><div className="ai-kpi-value">{formatearHoras(totales.total)} h</div></span>
                        </div>
                    </div>

                    {estado === 'devuelto' && datos.reporte?.observacion_financiera && (
                        <div className="ai-panel" style={{ borderColor: 'var(--warning)', background: 'var(--warning-soft)' }}>
                            <div className="ai-panel-body ai-row" style={{ alignItems: 'flex-start', gap: 10 }}>
                                <AlertTriangle size={18} strokeWidth={1.75} style={{ color: 'var(--warning)', flex: 'none', marginTop: 2 }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>Financiera devolvió el reporte</div>
                                    <div style={{ fontSize: 14 }}>{datos.reporte.observacion_financiera}</div>
                                    <div className="ai-muted" style={{ fontSize: 12, marginTop: 4 }}>Corrígelo y vuelve a enviarlo.</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {datos.reporte?.enviado_en && !editable && (
                        <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>
                            Enviado el {formatearInstante(datos.reporte.enviado_en)}
                            {datos.fuera_de_plazo && <span className="ai-badge ai-badge--warning" style={{ marginLeft: 8 }}>Fuera de plazo</span>}
                            {estado === 'aprobado' && datos.reporte.revisado_en && ` · aprobado el ${formatearInstante(datos.reporte.revisado_en)}`}
                        </p>
                    )}

                    {aviso && <p style={{ color: 'var(--success)', fontSize: 13, margin: 0 }}>{aviso}</p>}
                    {error && (
                        <div className="ai-panel" style={{ borderColor: 'var(--danger)' }}>
                            <div className="ai-panel-body">
                                <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{error}</div>
                                {detalles.length > 0 && (
                                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
                                        {detalles.map((d) => <li key={d}>{d}</li>)}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="ai-panel">
                        <div className="ai-panel-head">
                            <h3 className="ai-panel-title">Empleados</h3>
                            {editable && (
                                <span className="ai-muted" style={{ fontSize: 12 }}>
                                    Extras diurnas + nocturnas + dominicales (115%) deben sumar las horas aprobadas de cada persona. Recargo nocturno y dominical (90%) son aparte.
                                </span>
                            )}
                        </div>
                        {filas.length === 0 ? (
                            <div className="ai-empty">
                                <FileSpreadsheet size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                                <p>Nadie de tu equipo tiene horas extra aprobadas en {nombrePeriodo(periodo).toLowerCase()}.</p>
                                {editable && <p className="ai-muted" style={{ fontSize: 13 }}>Puedes enviar el reporte vacío, o agregar a alguien con recargos.</p>}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="ai-table ai-table--dense">
                                    <thead>
                                        <tr>
                                            <th>N°</th>
                                            <th>Empleado</th>
                                            <th>Campaña · C. costo · Cargo</th>
                                            <th className="ai-num">H. aprobadas</th>
                                            {CLASES_HORAS.map((c) => <th key={c.campo} className="ai-num" title={c.label}>{c.corto}</th>)}
                                            <th className="ai-num">Total</th>
                                            <th>Cuadre</th>
                                            <th>Aclaraciones</th>
                                            {editable && <th />}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filas.map((f, i) => (
                                            <tr key={f.users_company_id}>
                                                <td className="ai-num ai-muted">{i + 1}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{nombrePropio(f.nombre)}</div>
                                                    <div className="ai-muted" style={{ fontSize: 12 }}>CC {f.documento}</div>
                                                </td>
                                                <td className="ai-muted" style={{ fontSize: 12 }}>
                                                    {[f.campania, f.centro_costo, f.cargo].filter(Boolean).map(primeraMayuscula).join(' · ') || '—'}
                                                </td>
                                                <td className="ai-num">{formatearHoras(horasDeMinutos(f.minutos_aprobados))}</td>
                                                {CLASES_HORAS.map((c) => (
                                                    <td key={c.campo} className="ai-num">
                                                        {editable ? (
                                                            <input
                                                                type="number" min="0" step="0.5" inputMode="decimal"
                                                                className="ai-input" style={{ width: 72, textAlign: 'right' }}
                                                                value={f[c.campo]} placeholder="0"
                                                                onChange={(e) => cambiar(f.users_company_id, c.campo, e.target.value)}
                                                                aria-label={`${c.label} de ${f.nombre}`}
                                                            />
                                                        ) : formatearHoras(f[c.campo])}
                                                    </td>
                                                ))}
                                                <td className="ai-num" style={{ fontWeight: 600 }}>{formatearHoras(totalFila(f))}</td>
                                                <td><Cuadre fila={f} /></td>
                                                <td style={{ minWidth: 200 }}>
                                                    {editable ? (
                                                        <input
                                                            type="text" maxLength={1000} className="ai-input" style={{ width: '100%' }}
                                                            value={f.aclaraciones} placeholder="Novedades del trabajador"
                                                            onChange={(e) => cambiar(f.users_company_id, 'aclaraciones', e.target.value)}
                                                        />
                                                    ) : <span style={{ fontSize: 13 }}>{f.aclaraciones || '—'}</span>}
                                                </td>
                                                {editable && (
                                                    <td>
                                                        {!f.minutos_aprobados && (
                                                            <button type="button" className="ai-icon-btn ai-icon-btn--danger" onClick={() => quitar(f.users_company_id)} title="Quitar del reporte" aria-label={`Quitar a ${f.nombre}`}>
                                                                <Trash2 size={16} strokeWidth={1.75} />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ fontWeight: 600 }}>
                                            <td colSpan={3}>Total</td>
                                            <td className="ai-num">{formatearHoras(totales.aprobadas)}</td>
                                            {CLASES_HORAS.map((c) => <td key={c.campo} className="ai-num">{formatearHoras(totales[c.campo])}</td>)}
                                            <td className="ai-num">{formatearHoras(totales.total)}</td>
                                            <td colSpan={editable ? 3 : 2} />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {editable && (
                            <div className="ai-panel-body ai-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--border)' }}>
                                <div className="ai-row" style={{ gap: 8 }}>
                                    <select className="ai-input" style={{ width: 260 }} value={agregar} onChange={(e) => setAgregar(e.target.value)} aria-label="Agregar a alguien del equipo">
                                        <option value="">Agregar a alguien del equipo…</option>
                                        {disponibles.map((e) => <option key={e.users_company_id} value={e.users_company_id}>{nombrePropio(e.nombre)}</option>)}
                                    </select>
                                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={agregarEmpleado} disabled={!agregar}>
                                        <Plus size={14} strokeWidth={1.75} /> Agregar
                                    </button>
                                </div>
                                <div className="ai-row" style={{ gap: 8 }}>
                                    <button type="button" className="ai-btn ai-btn--secondary" onClick={() => guardar(false)} disabled={Boolean(guardando)}>
                                        <Save size={16} strokeWidth={1.75} /> {guardando === 'guardar' ? 'Guardando…' : 'Guardar borrador'}
                                    </button>
                                    <button type="button" className="ai-btn ai-btn--primary" onClick={() => setConfirmarEnvio(true)} disabled={Boolean(guardando)}>
                                        <Send size={16} strokeWidth={1.75} /> Enviar a financiera
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {confirmarEnvio && (
                <div className="ai-overlay" onClick={() => setConfirmarEnvio(false)}>
                    <div className="ai-modal ai-modal--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="ai-modal-head">
                            <span className="ai-modal-icon"><Send size={20} strokeWidth={1.75} /></span>
                            <div>
                                <h3 className="ai-modal-title">Enviar a financiera</h3>
                                <p className="ai-modal-sub">{nombrePeriodo(periodo)} · {filas.length} persona{filas.length === 1 ? '' : 's'} · {formatearHoras(totales.total)} h</p>
                            </div>
                            <button type="button" className="ai-icon-btn" onClick={() => setConfirmarEnvio(false)} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                        </div>
                        <div className="ai-modal-body">
                            <p style={{ margin: 0, fontSize: 14 }}>
                                Después de enviarlo no podrás modificarlo, salvo que financiera te lo devuelva.
                            </p>
                        </div>
                        <div className="ai-modal-foot">
                            <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setConfirmarEnvio(false)}>Cancelar</button>
                            <button type="button" className="ai-btn ai-btn--primary" onClick={() => guardar(true)} disabled={Boolean(guardando)}>
                                {guardando === 'enviar' ? 'Enviando…' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReporteHorasExtra;
