import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, Download, Users, Timer, Sun, Moon } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import { CLASES_HORAS, formatearHoras, periodoActual, nombrePeriodo } from '../../utils/reporteHorasExtra';
import { EncabezadoVista, Mosaicos, Mosaico, AvatarVista, CargandoVista, VistaVacia, TONO } from '../ui';

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

    // Horas por familia de clase (diurnas / nocturnas) para los mosaicos.
    const sumaClases = (filtro) => CLASES_HORAS.filter((c) => filtro(c.campo)).reduce((a, c) => a + (Number(totales?.[c.campo]) || 0), 0);
    const nocturnas = sumaClases((campo) => campo.includes('noct'));
    const diurnas = (Number(totales?.total_horas) || 0) - nocturnas;

    return (
        <div className="ai-content">
            <EncabezadoVista
                icono={FileSpreadsheet}
                titulo="Reporte de horas extras"
                subtitulo={`${nombrePeriodo(periodo)} · se arma solo con las horas que apruebas · financiera lo ve en tiempo real, con el valor en dinero`}
            >
                <input
                    type="month" className="ai-monitor-btn ai-monitor-mes" value={periodo} max={periodoActual()}
                    onChange={(e) => e.target.value && setSearchParams({ periodo: e.target.value })}
                    aria-label="Mes del reporte"
                />
                <button type="button" className="ai-monitor-btn" onClick={exportar} disabled={filas.length === 0}>
                    <Download size={15} strokeWidth={2} /> Exportar
                </button>
            </EncabezadoVista>

            {loading ? (
                <CargandoVista />
            ) : !datos ? (
                <VistaVacia error>{error}</VistaVacia>
            ) : filas.length === 0 ? (
                <VistaVacia icono={FileSpreadsheet}>
                    Nadie de tu equipo tiene horas extra aprobadas en {nombrePeriodo(periodo).toLowerCase()}. A medida que apruebes horas extra, aparecen aquí automáticamente.
                </VistaVacia>
            ) : (
                <>
                    <Mosaicos>
                        <Mosaico color={TONO.info} icono={Users} valor={totales?.empleados ?? filas.length} label="Personas" />
                        <Mosaico color={TONO.acento} icono={Timer} valor={formatearHoras(totales?.total_horas)} label="Total horas" />
                        <Mosaico color={TONO.alerta} icono={Sun} valor={formatearHoras(diurnas)} label="Diurnas y festivas" />
                        <Mosaico color={TONO.neutro} icono={Moon} valor={formatearHoras(nocturnas)} label="Nocturnas" />
                    </Mosaicos>

                    <div className="ai-monitor-tabla-wrap">
                        <table className="ai-monitor-tabla ai-monitor-tabla--simple">
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
                                        <td className="ai-monitor-nombre">
                                            <span>
                                                <AvatarVista />
                                                <span>
                                                    {nombrePropio(f.nombre).toUpperCase()}
                                                    <span className="ai-monitor-sub">CC {f.documento}</span>
                                                </span>
                                            </span>
                                        </td>
                                        <td className="ai-muted" style={{ fontSize: 12 }}>
                                            {[f.campania, f.centro_costo, f.cargo].filter(Boolean).map(primeraMayuscula).join(' · ') || '—'}
                                        </td>
                                        {CLASES_HORAS.map((c) => <td key={c.campo} className="ai-num">{formatearHoras(f[c.campo])}</td>)}
                                        <td className="ai-num" style={{ fontWeight: 700 }}>{formatearHoras(f.total_horas)}</td>
                                        <td style={{ fontSize: 13, maxWidth: 280 }}>{f.aclaraciones || <span className="ai-muted">—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {totales && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={3}>Total ({totales.empleados} persona{totales.empleados === 1 ? '' : 's'})</td>
                                        {CLASES_HORAS.map((c) => <td key={c.campo} className="ai-num">{formatearHoras(totales[c.campo])}</td>)}
                                        <td className="ai-num">{formatearHoras(totales.total_horas)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default ReporteHorasExtra;
