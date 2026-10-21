import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Check, Undo2, Download, X, AlertTriangle } from 'lucide-react';
import { financieraService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import {
    CLASES_HORAS, ESTADO_REPORTE, totalFila, horasDeMinutos, formatearHoras, nombrePeriodo,
    formatearFechaCorta, formatearInstante
} from '../../utils/reporteHorasExtra';

// Detalle de un reporte de horas extras para financiera: las mismas columnas del formato V.3,
// con aprobar o devolver al jefe con una observación (asistencia.md §32).
const DetalleReporteHorasExtra = () => {
    const { id } = useParams();
    const [reporte, setReporte] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [devolviendo, setDevolviendo] = useState(false);
    const [observacion, setObservacion] = useState('');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data } = await financieraService.getReporte(id);
                setReporte(data);
                setError(null);
            } catch (err) {
                setError(err.response?.data?.message || 'No se pudo cargar el reporte');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const ejecutar = async (accion) => {
        setProcesando(true);
        setError(null);
        try {
            const { data } = accion === 'aprobar'
                ? await financieraService.aprobarReporte(id)
                : await financieraService.devolverReporte(id, observacion);
            setReporte(data);
            setDevolviendo(false);
            setObservacion('');
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo actualizar el reporte');
        } finally {
            setProcesando(false);
        }
    };

    const exportar = () => {
        const filas = reporte.filas.map((f, i) => [
            i + 1, f.documento, nombrePropio(f.nombre), f.campania || '', f.centro_costo || '', f.cargo || '',
            ...CLASES_HORAS.map((c) => f[c.campo]), totalFila(f), f.aclaraciones || ''
        ]);
        descargarCsv(
            `horas_extra_${reporte.periodo}_${reporte.jefe_documento}.csv`,
            ['N°', 'Documento', 'Nombre', 'Campaña', 'Centro de costo', 'Cargo', ...CLASES_HORAS.map((c) => c.label), 'Total', 'Aclaraciones'],
            filas
        );
    };

    const volver = (
        <Link to={`/recursos-humanos/reportes-horas-extra${reporte ? `?periodo=${reporte.periodo}` : ''}`} className="ai-link">
            <ArrowLeft size={14} strokeWidth={1.75} /> Volver a los reportes
        </Link>
    );

    if (loading) {
        return (
            <div className="ai-content">
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            </div>
        );
    }

    if (!reporte) {
        return (
            <div className="ai-content">
                {volver}
                <div className="ai-panel ai-empty"><p style={{ color: 'var(--danger)' }}>{error}</p></div>
            </div>
        );
    }

    const badge = ESTADO_REPORTE[reporte.estado] || ESTADO_REPORTE.sin_reporte;
    const t = reporte.totales || {};

    return (
        <div className="ai-content">
            {volver}

            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">{nombrePropio(reporte.jefe_nombre)}</h1>
                    <p className="ai-page-sub">
                        Horas extras de {nombrePeriodo(reporte.periodo).toLowerCase()} · CC {reporte.jefe_documento}
                    </p>
                </div>
                <div className="ai-row">
                    <span className={`ai-badge ${badge.clase}`}>{badge.label}</span>
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportar}>
                        <Download size={14} strokeWidth={1.75} /> Exportar
                    </button>
                </div>
            </div>

            <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>
                Enviado el {formatearInstante(reporte.enviado_en)}
                {reporte.veces_enviado > 1 && ` (envío n.° ${reporte.veces_enviado})`}
                {reporte.fecha_limite && ` · plazo ${formatearFechaCorta(reporte.fecha_limite)}`}
                {reporte.fuera_de_plazo && (
                    <span className="ai-badge ai-badge--warning" style={{ marginLeft: 8 }}><AlertTriangle size={12} strokeWidth={1.75} /> Fuera de plazo</span>
                )}
                {reporte.revisado_en && ` · revisado el ${formatearInstante(reporte.revisado_en)}`}
            </p>

            {reporte.estado === 'devuelto' && reporte.observacion_financiera && (
                <div className="ai-panel" style={{ borderColor: 'var(--warning)', background: 'var(--warning-soft)' }}>
                    <div className="ai-panel-body" style={{ fontSize: 14 }}>
                        <b>Devuelto al jefe:</b> {reporte.observacion_financiera}
                    </div>
                </div>
            )}

            {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>}

            <div className="ai-panel">
                {reporte.filas.length === 0 ? (
                    <div className="ai-empty"><p>El jefe reportó el mes sin horas extras ni recargos.</p></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="ai-table ai-table--dense">
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Empleado</th>
                                    <th>Campaña · C. costo · Cargo</th>
                                    <th className="ai-num" title="Horas extra aprobadas en Gestor durante el mes">H. aprobadas</th>
                                    {CLASES_HORAS.map((c) => <th key={c.campo} className="ai-num" title={c.label}>{c.corto}</th>)}
                                    <th className="ai-num">Total</th>
                                    <th>Aclaraciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reporte.filas.map((f, i) => (
                                    <tr key={f.idreporte_horas_extra_detalle ?? `${f.documento}-${i}`}>
                                        <td className="ai-num ai-muted">{i + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{nombrePropio(f.nombre)}</div>
                                            <div className="ai-muted" style={{ fontSize: 12 }}>CC {f.documento}</div>
                                        </td>
                                        <td className="ai-muted" style={{ fontSize: 12 }}>
                                            {[f.campania, f.centro_costo, f.cargo].filter(Boolean).map(primeraMayuscula).join(' · ') || '—'}
                                        </td>
                                        <td className="ai-num">{formatearHoras(horasDeMinutos(f.minutos_aprobados))}</td>
                                        {CLASES_HORAS.map((c) => <td key={c.campo} className="ai-num">{formatearHoras(f[c.campo])}</td>)}
                                        <td className="ai-num" style={{ fontWeight: 600 }}>{formatearHoras(totalFila(f))}</td>
                                        <td style={{ fontSize: 13, maxWidth: 280 }}>{f.aclaraciones || <span className="ai-muted">—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ fontWeight: 600 }}>
                                    <td colSpan={4}>Total</td>
                                    {CLASES_HORAS.map((c) => <td key={c.campo} className="ai-num">{formatearHoras(t[c.campo])}</td>)}
                                    <td className="ai-num">{formatearHoras(t.total)}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {reporte.estado === 'enviado' && (
                    <div className="ai-panel-body" style={{ borderTop: '1px solid var(--border)' }}>
                        {devolviendo ? (
                            <div className="ai-stack">
                                <div className="ai-field">
                                    <label className="ai-label">¿Qué debe corregir el jefe? <em>*</em></label>
                                    <textarea
                                        className="ai-input" style={{ height: 'auto', padding: '10px 12px' }} rows={3} maxLength={500} autoFocus
                                        value={observacion} onChange={(e) => setObservacion(e.target.value)}
                                    />
                                    <p className="ai-help">El jefe la ve en el reporte y en su campana. {observacion.length}/500</p>
                                </div>
                                <div className="ai-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                                    <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setDevolviendo(false)}>
                                        <X size={16} strokeWidth={1.75} /> Cancelar
                                    </button>
                                    <button type="button" className="ai-btn ai-btn--danger" onClick={() => ejecutar('devolver')} disabled={procesando || !observacion.trim()}>
                                        <Undo2 size={16} strokeWidth={1.75} /> {procesando ? 'Devolviendo…' : 'Devolver al jefe'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="ai-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                                <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setDevolviendo(true)} disabled={procesando}>
                                    <Undo2 size={16} strokeWidth={1.75} /> Devolver
                                </button>
                                <button type="button" className="ai-btn ai-btn--primary" onClick={() => ejecutar('aprobar')} disabled={procesando}>
                                    <Check size={16} strokeWidth={1.75} /> {procesando ? 'Aprobando…' : 'Aprobar'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetalleReporteHorasExtra;
