import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, FileSpreadsheet, Download } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import { CLASES_HORAS, formatearHoras, periodoActual, nombrePeriodo } from '../../utils/reporteHorasExtra';

// Reporte mensual de horas extras del jefe de área (asistencia.md §32). Se llena solo con las horas
// extra aprobadas del mes (la clase la pone el agente al solicitar y el jefe la ajusta al aprobar):
// aquí es de solo lectura. Reemplaza el Excel "FORMATO REPORTE DE HORAS EXTRAS V.3".

const ReporteHorasExtra = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const periodo = searchParams.get('periodo') || periodoActual();
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await asistenciaService.getReporteHorasExtra(periodo);
            setDatos(data);
        } catch (err) {
            setDatos(null);
            setError(err.response?.data?.message || 'No se pudo cargar el reporte');
        } finally {
            setLoading(false);
        }
    }, [periodo]);

    useEffect(() => { cargar(); }, [cargar]);

    const filas = datos?.filas ?? [];
    const totales = datos?.totales;

    const exportar = () => {
        const cuerpo = filas.map((f, i) => [
            i + 1, f.documento, nombrePropio(f.nombre), f.campania || '', f.centro_costo || '', f.cargo || '',
            ...CLASES_HORAS.map((c) => f[c.campo]), f.total_horas, f.aclaraciones || ''
        ]);
        descargarCsv(
            `horas_extra_${periodo}.csv`,
            ['N°', 'Documento', 'Nombre', 'Campaña', 'Centro de costo', 'Cargo', ...CLASES_HORAS.map((c) => c.label), 'Total horas', 'Aclaraciones'],
            cuerpo
        );
    };

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Reporte de horas extras</h1>
                    <p className="ai-page-sub">{nombrePeriodo(periodo)} · se arma solo con las horas que apruebas</p>
                </div>
                <div className="ai-row">
                    <input
                        type="month" className="ai-input" style={{ width: 170 }} value={periodo} max={periodoActual()}
                        onChange={(e) => e.target.value && setSearchParams({ periodo: e.target.value })}
                        aria-label="Mes del reporte"
                    />
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportar} disabled={filas.length === 0}>
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
                <div className="ai-panel">
                    <div className="ai-panel-head">
                        <h3 className="ai-panel-title">Equipo con horas extra en {nombrePeriodo(periodo).toLowerCase()}</h3>
                        <span className="ai-muted" style={{ fontSize: 12 }}>Financiera ve este mismo reporte en tiempo real, con el valor en dinero.</span>
                    </div>
                    {filas.length === 0 ? (
                        <div className="ai-empty">
                            <FileSpreadsheet size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                            <p>Nadie de tu equipo tiene horas extra aprobadas en {nombrePeriodo(periodo).toLowerCase()}.</p>
                            <p className="ai-muted" style={{ fontSize: 13 }}>A medida que apruebes horas extra, aparecen aquí automáticamente.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ai-table ai-table--dense">
                                <thead>
                                    <tr>
                                        <th>N°</th>
                                        <th>Empleado</th>
                                        <th>Campaña · C. costo · Cargo</th>
                                        {CLASES_HORAS.map((c) => <th key={c.campo} className="ai-num" title={c.label}>{c.corto}</th>)}
                                        <th className="ai-num">Total</th>
                                        <th>Aclaraciones</th>
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
                                            {CLASES_HORAS.map((c) => <td key={c.campo} className="ai-num">{formatearHoras(f[c.campo])}</td>)}
                                            <td className="ai-num" style={{ fontWeight: 600 }}>{formatearHoras(f.total_horas)}</td>
                                            <td style={{ fontSize: 13, maxWidth: 280 }}>{f.aclaraciones || <span className="ai-muted">—</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {totales && (
                                    <tfoot>
                                        <tr style={{ fontWeight: 600 }}>
                                            <td colSpan={3}>Total ({totales.empleados} persona{totales.empleados === 1 ? '' : 's'})</td>
                                            {CLASES_HORAS.map((c) => <td key={c.campo} className="ai-num">{formatearHoras(totales[c.campo])}</td>)}
                                            <td className="ai-num">{formatearHoras(totales.total_horas)}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReporteHorasExtra;
