import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, Download, DollarSign, Clock, Users, Building2, ListOrdered } from 'lucide-react';
import { financieraService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import { CLASES_HORAS, formatearHoras, formatearPesos, periodoActual, nombrePeriodo } from '../../utils/reporteHorasExtra';
import { EncabezadoVista, Mosaicos, Mosaico, PanelVista, AvatarVista, CargandoVista, VistaVacia, TONO } from '../ui';

// Reporte de horas extras para financiera (asistencia.md §32). Es el mismo reporte que ve el jefe
// pero de todos los empleados (o de una campaña), con el valor en dinero de cada hora, en vivo a
// medida que se aprueban. Se muestra el resumen por campaña y el detalle por empleado.

const ReportesHorasExtra = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    // El reporte es en vivo: por defecto el mes en curso (igual que el del jefe), para ver las
    // horas extra a medida que se aprueban. El selector permite ir a meses anteriores.
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
            const { data } = await financieraService.getReporteHorasExtra(periodo, campaniaId || undefined);
            setDatos(data);
        } catch (err) {
            setDatos(null);
            setError(err.response?.data?.message || 'No se pudo cargar el reporte');
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

    const filas = datos?.filas ?? [];
    const totales = datos?.totales;

    const exportar = () => {
        const cuerpo = filas.map((f, i) => [
            i + 1, f.documento, nombrePropio(f.nombre), f.campania || '', f.centro_costo || '', f.cargo || '',
            ...CLASES_HORAS.map((c) => f[c.campo]), f.total_horas, f.valor_hora,
            ...CLASES_HORAS.map((c) => f[`${c.campo}_dinero`]), f.total_dinero, f.aclaraciones || ''
        ]);
        descargarCsv(
            `horas_extra_dinero_${periodo}.csv`,
            [
                'N°', 'Documento', 'Nombre', 'Campaña', 'Centro de costo', 'Cargo',
                ...CLASES_HORAS.map((c) => `${c.label} (h)`), 'Total horas', 'Valor hora',
                ...CLASES_HORAS.map((c) => `${c.label} ($)`), 'Total $', 'Aclaraciones'
            ],
            cuerpo
        );
    };

    return (
        <div className="ai-content">
            <EncabezadoVista
                icono={FileSpreadsheet}
                titulo="Reporte de horas extras"
                subtitulo={`${nombrePeriodo(periodo)} · horas y costo en dinero, en tiempo real`}
            >
                <select className="ai-monitor-btn ai-monitor-select" value={campaniaId} onChange={(e) => cambiar('campania', e.target.value)} aria-label="Campaña">
                    <option value="">Todas las campañas</option>
                    {campanias.map((c) => <option key={c.idcampania} value={c.idcampania}>{primeraMayuscula(c.nombre)}</option>)}
                </select>
                <input
                    type="month" className="ai-monitor-btn ai-monitor-mes" value={periodo} max={periodoActual()}
                    onChange={(e) => e.target.value && cambiar('periodo', e.target.value)} aria-label="Mes"
                />
                <button type="button" className="ai-monitor-btn" onClick={exportar} disabled={filas.length === 0}>
                    <Download size={15} strokeWidth={2} /> Exportar
                </button>
            </EncabezadoVista>

            {loading ? (
                <CargandoVista />
            ) : !datos ? (
                <VistaVacia error>{error}</VistaVacia>
            ) : (
                <>
                    <Mosaicos>
                        <Mosaico color={TONO.exito} icono={DollarSign} valor={formatearPesos(totales?.total_dinero)} label="Costo total" detalle="horas extra del mes" />
                        <Mosaico color={TONO.acento} icono={Clock} valor={formatearHoras(totales?.total_horas)} label="Horas" />
                        <Mosaico color={TONO.info} icono={Users} valor={totales?.empleados ?? 0} label="Empleados" />
                    </Mosaicos>

                    {(datos.por_campania?.length ?? 0) > 1 && (
                        <PanelVista icono={Building2} titulo="Por campaña">
                            <table className="ai-monitor-tabla ai-monitor-tabla--simple">
                                <thead>
                                    <tr><th>Campaña</th><th className="ai-num">Empleados</th><th className="ai-num">Horas</th><th className="ai-num">Costo</th></tr>
                                </thead>
                                <tbody>
                                    {datos.por_campania.map((g) => (
                                        <tr key={g.idcampania ?? 'sin'}>
                                            <td style={{ fontWeight: 600 }}>{primeraMayuscula(g.campania)}</td>
                                            <td className="ai-num">{g.totales.empleados}</td>
                                            <td className="ai-num">{formatearHoras(g.totales.total_horas)}</td>
                                            <td className="ai-num" style={{ fontWeight: 600 }}>{formatearPesos(g.totales.total_dinero)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {totales && (
                                    <tfoot>
                                        <tr style={{ fontWeight: 600 }}>
                                            <td>Total</td>
                                            <td className="ai-num">{totales.empleados}</td>
                                            <td className="ai-num">{formatearHoras(totales.total_horas)}</td>
                                            <td className="ai-num">{formatearPesos(totales.total_dinero)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </PanelVista>
                    )}

                    <div className="ai-monitor-detalle-head">
                        <h3><ListOrdered size={18} strokeWidth={2} aria-hidden="true" /> Detalle por empleado</h3>
                    </div>
                    {filas.length === 0 ? (
                        <VistaVacia icono={FileSpreadsheet}>
                            No hay horas extra aprobadas en {nombrePeriodo(periodo).toLowerCase()}{campaniaId ? ' para esta campaña' : ''}.
                        </VistaVacia>
                    ) : (
                            <div className="ai-monitor-tabla-wrap" style={{ marginBottom: 12 }}>
                                <table className="ai-monitor-tabla ai-monitor-tabla--simple">
                                    <thead>
                                        <tr>
                                            <th>Empleado</th>
                                            <th>Campaña · Cargo</th>
                                            {CLASES_HORAS.map((c) => <th key={c.campo} className="ai-num" title={`${c.label} (horas)`}>{c.corto}</th>)}
                                            <th className="ai-num">Total h</th>
                                            <th className="ai-num">Valor hora</th>
                                            <th className="ai-num">Costo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filas.map((f) => (
                                            <tr key={f.users_company_id}>
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
                                                    {[f.campania, f.cargo].filter(Boolean).map(primeraMayuscula).join(' · ') || '—'}
                                                </td>
                                                {CLASES_HORAS.map((c) => (
                                                    <td key={c.campo} className="ai-num" title={f[`${c.campo}_dinero`] ? formatearPesos(f[`${c.campo}_dinero`]) : ''}>
                                                        {formatearHoras(f[c.campo])}
                                                    </td>
                                                ))}
                                                <td className="ai-num" style={{ fontWeight: 600 }}>{formatearHoras(f.total_horas)}</td>
                                                <td className="ai-num ai-muted">{f.valor_hora ? formatearPesos(f.valor_hora) : '—'}</td>
                                                <td className="ai-num" style={{ fontWeight: 600 }}>{formatearPesos(f.total_dinero)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {totales && (
                                        <tfoot>
                                            <tr style={{ fontWeight: 600 }}>
                                                <td colSpan={2}>Total</td>
                                                {CLASES_HORAS.map((c) => <td key={c.campo} className="ai-num">{formatearHoras(totales[c.campo])}</td>)}
                                                <td className="ai-num">{formatearHoras(totales.total_horas)}</td>
                                                <td />
                                                <td className="ai-num">{formatearPesos(totales.total_dinero)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                    )}
                    {filas.some((f) => !f.valor_hora) && (
                        <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}>
                            Los empleados sin salario registrado aparecen con costo $0: hay que cargarles el salario en su ficha para que el dinero cuadre.
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

export default ReportesHorasExtra;
