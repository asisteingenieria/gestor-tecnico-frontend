import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
    Loader2, RefreshCw, Wallet, Clock3, Users, Clock, CalendarX, AlertTriangle, CheckCircle2, Info,
    Table2, BarChart3, ArrowUpRight, ArrowDownRight, Minus, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { financieraService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { periodoActual, nombrePeriodo } from '../../utils/reporteHorasExtra';
import { descargarCsv } from '../../utils/csv';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Home de financiera/admin (asistencia.md §37): lo que hay que mirar del mes en RRHH, asistencia,
// horas extra y costos. Todo sale de GET /asistencia/financiera/home.
//
// Gráficas según la guía de visualización: azul/naranja/violeta/aqua/amarillo validados para
// daltonismo en claro y oscuro sobre las superficies de la app, en el orden de apilado (el aqua y el
// amarillo en claro quedan bajo 3:1: siempre con leyenda y vista de tabla), gris para lo que es contexto, una escala por gráfica,
// barras delgadas con el extremo de dato redondeado, y una vista de tabla en cada tarjeta.

const PALETA = {
    claro: { serie1: '#2a78d6', serie2: '#eb6834', serie3: '#1baf7a', serie4: '#6250d6', serie5: '#eda100', contexto: '#c5cdd8', superficie: '#ffffff', grid: '#e7edf4', eje: '#c3ccd8', texto: '#52627a', meta: '#0f1f35' },
    oscuro: { serie1: '#3987e5', serie2: '#d95926', serie3: '#199e70', serie4: '#9085e9', serie5: '#c98500', contexto: '#33445c', superficie: '#111f33', grid: '#1f3149', eje: '#33445c', texto: '#9fb0c7', meta: '#e8eef7' }
};

const CLASES = {
    recargo_nocturno: 'Recargo nocturno',
    extras_diurnas: 'Extra diurna',
    extras_nocturnas: 'Extra nocturna',
    dominicales_festivas: 'Dominical / festivo',
    extras_dominicales_festivas: 'Extra dominical / festiva'
};

const REFRESCO_MS = 2 * 60 * 1000;

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mesCorto = (p) => `${MESES_CORTOS[Number(p.slice(5, 7)) - 1]} ${p.slice(2, 4)}`;

const cop = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
function copCompacto(n) {
    const v = Number(n) || 0;
    // Siempre en millones (también sobre mil millones): "$ 1.036,7 M" no pierde precisión.
    if (Math.abs(v) >= 1e6) return `$ ${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
    if (Math.abs(v) >= 1e3) return `$ ${(v / 1e3).toLocaleString('es-CO', { maximumFractionDigits: 0 })} mil`;
    return cop(v);
}
const horas = (n) => `${(Number(n) || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`;
const entero = (n) => (Number(n) || 0).toLocaleString('es-CO');

// El tema lo pone la app en <html data-theme>; las gráficas (canvas) no leen CSS, así que se observa.
function useTemaOscuro() {
    const leer = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
    const [oscuro, setOscuro] = useState(leer);
    useEffect(() => {
        const obs = new MutationObserver(() => setOscuro(leer()));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);
    return oscuro;
}

// Opciones base: grid recesivo, ejes en tinta tenue, tooltip con el valor formateado.
function opcionesBase(c, { horizontal = false, formato = entero, ejeFormato, leyenda = false, max } = {}) {
    const ejeValor = {
        beginAtZero: true,
        max,
        grid: { color: c.grid, drawTicks: false },
        border: { display: false },
        ticks: { color: c.texto, font: { size: 11 }, padding: 6, callback: (v) => (ejeFormato || formato)(v), maxTicksLimit: 6 }
    };
    const ejeCategoria = {
        grid: { display: false },
        border: { color: c.eje },
        ticks: { color: c.texto, font: { size: 11 }, autoSkip: false }
    };
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        animation: { duration: 250 },
        interaction: { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' },
        plugins: {
            legend: leyenda
                ? { display: true, position: 'top', align: 'end', labels: { color: c.texto, boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2, font: { size: 12 } } }
                : { display: false },
            tooltip: {
                padding: 10,
                cornerRadius: 6,
                callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formato(ctx.parsed[horizontal ? 'x' : 'y'])}` }
            }
        },
        scales: horizontal ? { x: ejeValor, y: ejeCategoria } : { x: ejeCategoria, y: ejeValor }
    };
}

const barra = (extra) => ({ borderRadius: 4, borderSkipped: 'start', maxBarThickness: 26, categoryPercentage: 0.72, barPercentage: 0.9, ...extra });

// Las tres partes del costo de nómina, en orden fijo de la paleta (el color sigue a la parte).
const PARTES_COSTO = [
    { clave: 'salarios', etiqueta: 'Nómina', color: 'serie1' },
    { clave: 'prestaciones', etiqueta: 'Prestaciones', color: 'serie2' },
    { clave: 'aportes', etiqueta: 'Aportes', color: 'serie4' },
    { clave: 'bonos', etiqueta: 'Bonos', color: 'serie3' },
    { clave: 'auxilio_transporte', etiqueta: 'Auxilio de transporte', color: 'serie5' }
];
const LEYENDA_COSTO = (c) => PARTES_COSTO.map((p) => ({ color: c[p.color], texto: p.etiqueta }));

// Barras apiladas: 2px del color de la superficie separan los segmentos; solo el último segmento
// lleva el extremo de dato redondeado. `alfa(i)` aclara una barra (el mes en curso).
function datasetsCosto(c, filas, { horizontal = false, alfa } = {}) {
    return PARTES_COSTO.map((p, i) => {
        const ultimo = i === PARTES_COSTO.length - 1;
        const color = c[p.color];
        return {
            label: p.etiqueta,
            data: filas.map((f) => f[p.clave]),
            backgroundColor: alfa ? filas.map((_, j) => (alfa(j) ? `${color}66` : color)) : color,
            borderColor: c.superficie,
            borderWidth: horizontal ? { right: ultimo ? 0 : 2 } : { top: ultimo ? 0 : 2 },
            borderSkipped: false,
            borderRadius: ultimo ? (horizontal ? { topRight: 4, bottomRight: 4 } : { topLeft: 4, topRight: 4 }) : 0,
            maxBarThickness: horizontal ? 18 : 34,
            categoryPercentage: 0.72,
            barPercentage: 0.9
        };
    });
}

// Opciones para barras apiladas de pesos: tooltip con cada parte y el total al pie.
function opcionesApiladas(c, { horizontal = false, filas = [] } = {}) {
    const o = opcionesBase(c, { horizontal, formato: cop, ejeFormato: copCompacto });
    o.scales.x.stacked = true;
    o.scales.y.stacked = true;
    o.plugins.tooltip.callbacks.footer = (items) => {
        const f = filas[items[0]?.dataIndex];
        if (!f) return '';
        return [`Total: ${cop(f.total)}`, ...(f.empleados != null ? [`${f.empleados} empleados`] : []), ...(f.extra ? [f.extra] : [])];
    };
    return o;
}

// Línea vertical de la meta de puntualidad (en las barras horizontales).
const lineaMeta = (valor, color) => ({
    id: 'lineaMeta',
    afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const x = scales.x.getPixelForValue(valor);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Meta ${valor} %`, x - 4, chartArea.top + 10);
        ctx.restore();
    }
});

const HomeFinanciera = () => {
    const [periodo, setPeriodo] = useState(periodoActual());
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const oscuro = useTemaOscuro();
    const c = oscuro ? PALETA.oscuro : PALETA.claro;

    const [actualizado, setActualizado] = useState(null);

    const cargar = useCallback(async ({ silencioso = false } = {}) => {
        if (!silencioso) setLoading(true);
        setError(null);
        try {
            const { data } = await financieraService.getHome(periodo);
            setDatos(data);
            setActualizado(new Date());
        } catch (err) {
            if (!silencioso) setError(err.response?.data?.message || 'No se pudo cargar el tablero');
        } finally {
            if (!silencioso) setLoading(false);
        }
    }, [periodo]);

    useEffect(() => { cargar(); }, [cargar]);

    // Tiempo real: el mes en curso se recalcula solo cada pocos minutos (los meses cerrados no cambian).
    useEffect(() => {
        if (!datos?.mes_en_curso) return undefined;
        const id = setInterval(() => cargar({ silencioso: true }), REFRESCO_MS);
        return () => clearInterval(id);
    }, [datos?.mes_en_curso, cargar]);

    return (
        <div className="ai-scope" style={{ minHeight: '100%' }}>
            <div className="ai-content">
                <div className="ai-page-head">
                    <div>
                        <h1 className="ai-page-title">Home</h1>
                        <p className="ai-page-sub">
                            {nombrePeriodo(periodo)}
                            {datos?.mes_en_curso ? ' · mes en curso, en vivo' : ''}
                            {' · RRHH, asistencia, horas extra y costos'}
                            {actualizado && <span className="ai-muted"> · actualizado {actualizado.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </p>
                    </div>
                    <div className="ai-row">
                        <input
                            type="month" className="ai-input" style={{ width: 170 }} value={periodo} max={periodoActual()}
                            onChange={(e) => e.target.value && setPeriodo(e.target.value)} aria-label="Mes"
                        />
                        <button type="button" className="ai-btn ai-btn--secondary" onClick={() => cargar()} disabled={loading} title="Actualizar">
                            <RefreshCw size={16} strokeWidth={1.75} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {loading && !datos ? (
                    <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
                        <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                    </div>
                ) : error ? (
                    <div className="ai-panel ai-empty"><p style={{ color: 'var(--danger)' }}>{error}</p></div>
                ) : datos && (
                    // key: Chart.js no relee los plugins (línea de meta) al cambiar el tema; se remonta.
                    <Tablero key={oscuro ? 'oscuro' : 'claro'} datos={datos} c={c} />
                )}
            </div>
        </div>
    );
};

const Tablero = ({ datos, c }) => {
    // El admin entra desde su propio layout y no tiene las pantallas de financiera.
    const { isFinanciera: esFinanciera } = useAuth();
    const { kpis, tendencia, por_campania: porCampania, horas_por_clase: porClase, top_empleados: top, novedades_por_tipo: novedades, meta_puntualidad: meta } = datos;
    const anterior = nombrePeriodo(datos.periodo_anterior);
    const enCurso = datos.mes_en_curso;

    const nominaOrdenada = useMemo(() => porCampania.filter((x) => x.costo_total > 0).sort((a, b) => b.costo_total - a.costo_total), [porCampania]);
    const extraOrdenado = useMemo(() => porCampania.filter((x) => x.dinero_extra > 0).sort((a, b) => b.dinero_extra - a.dinero_extra), [porCampania]);
    const conPuntualidad = useMemo(() => porCampania.filter((x) => x.puntualidad != null).sort((a, b) => a.puntualidad - b.puntualidad), [porCampania]);
    const sinMarcaciones = porCampania.length - conPuntualidad.length;
    const alto = (n) => Math.max(180, n * 26 + 40);

    return (
        <>
            <Hallazgos lista={datos.hallazgos} />

            <div className="ai-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
                <Kpi
                    hero label={enCurso ? 'Costo total de nómina · proyectado' : 'Costo total de nómina'}
                    valor={copCompacto(kpis.nomina.total)} titulo={cop(kpis.nomina.total)}
                    icon={<Wallet size={18} strokeWidth={1.75} />}
                    pie={enCurso && kpis.nomina.causado_hoy
                        ? `Causado a hoy ${copCompacto(kpis.nomina.causado_hoy.total)}`
                        : <Delta valor={kpis.nomina.variacion_pct} sufijo="%" texto={`vs ${anterior}`} neutro />}
                />
                <Kpi
                    label="Costo horas extra" valor={copCompacto(kpis.horas_extra.dinero)} titulo={cop(kpis.horas_extra.dinero)}
                    icon={<Clock3 size={18} strokeWidth={1.75} />}
                    pie={enCurso
                        ? <span>{horas(kpis.horas_extra.horas)} · {anterior}: {copCompacto(kpis.horas_extra.dinero_anterior)}</span>
                        : <Delta valor={kpis.horas_extra.variacion_pct} sufijo="%" subirEsMalo texto={`vs ${anterior}`} />}
                />
                <Kpi
                    label="Empleados activos" valor={entero(kpis.dotacion.activos)}
                    icon={<Users size={18} strokeWidth={1.75} />}
                    pie={`${kpis.dotacion.ingresos_mes} ingreso${kpis.dotacion.ingresos_mes === 1 ? '' : 's'} · ${kpis.dotacion.retiros_mes} retiro${kpis.dotacion.retiros_mes === 1 ? '' : 's'} en el mes`}
                />
                <Kpi
                    label="Puntualidad global" valor={kpis.asistencia.puntualidad != null ? `${kpis.asistencia.puntualidad} %` : '—'}
                    icon={<Clock size={18} strokeWidth={1.75} />}
                    pie={<Delta valor={kpis.asistencia.delta_pp} sufijo=" pp" texto={`vs ${anterior}`} />}
                />
                <Kpi
                    label="Ausencias del mes" valor={entero(kpis.asistencia.ausencias)} alerta={kpis.asistencia.ausencias > 0}
                    icon={<CalendarX size={18} strokeWidth={1.75} />}
                    pie={`${entero(kpis.novedades.total)} novedades · ${entero(kpis.novedades.dias)} días`}
                />
            </div>

            <CostoNomina costo={datos.costo_nomina} nomina={kpis.nomina} periodo={datos.periodo} c={c} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: 16, alignItems: 'start' }}>
                <Tarjeta
                    titulo="Costo de horas extra · últimos 6 meses"
                    fuente="Horas extra aprobadas × valor hora (salario ÷ 240) × factor de ley por clase."
                    vacio={tendencia.every((t) => !t.dinero_extra) && 'No hay horas extra aprobadas en estos meses.'}
                    tabla={{
                        columnas: ['Mes', 'Costo', 'Horas'],
                        filas: tendencia.map((t) => [nombrePeriodo(t.periodo), cop(t.dinero_extra), horas(t.horas_extra)])
                    }}
                >
                    <div style={{ height: 240 }}>
                        <Bar
                            data={{
                                labels: tendencia.map((t) => mesCorto(t.periodo)),
                                datasets: [{
                                    label: 'Costo', data: tendencia.map((t) => t.dinero_extra),
                                    // El mes en curso va más claro: todavía no está cerrado.
                                    backgroundColor: tendencia.map((t, i) => (enCurso && i === tendencia.length - 1 ? `${c.serie1}66` : c.serie1)),
                                    ...barra()
                                }]
                            }}
                            options={opcionesBase(c, { formato: cop, ejeFormato: copCompacto })}
                        />
                    </div>
                </Tarjeta>

                <Tarjeta
                    titulo="Ingresos y retiros · últimos 6 meses"
                    fuente="Ingresos por fecha de ingreso del contrato; retiros por fecha de retiro registrada."
                    tabla={{
                        columnas: ['Mes', 'Ingresos', 'Retiros', 'Neto'],
                        filas: tendencia.map((t) => [nombrePeriodo(t.periodo), t.ingresos, t.retiros, t.ingresos - t.retiros])
                    }}
                >
                    <div style={{ height: 240 }}>
                        <Bar
                            data={{
                                labels: tendencia.map((t) => mesCorto(t.periodo)),
                                datasets: [
                                    { label: 'Ingresos', data: tendencia.map((t) => t.ingresos), backgroundColor: c.serie1, ...barra({ maxBarThickness: 18 }) },
                                    { label: 'Retiros', data: tendencia.map((t) => t.retiros), backgroundColor: c.serie2, ...barra({ maxBarThickness: 18 }) }
                                ]
                            }}
                            options={opcionesBase(c, { leyenda: true })}
                        />
                    </div>
                </Tarjeta>

                <Tarjeta
                    titulo="Costo total de nómina por campaña"
                    subtitulo={<Leyenda items={LEYENDA_COSTO(c)} />}
                    fuente="Costo del mes elegido: nómina prorrateada por días + prestaciones + aportes + bonos + auxilio de transporte, según la campaña actual del contrato."
                    vacio={nominaOrdenada.length === 0 && 'No hay salarios registrados.'}
                    tabla={{
                        columnas: ['Campaña', 'Empleados', ...PARTES_COSTO.map((p) => p.etiqueta), 'Total'],
                        filas: nominaOrdenada.map((x) => [primeraMayuscula(x.campania), x.empleados, ...PARTES_COSTO.map((p) => cop(x[p.clave])), cop(x.costo_total)])
                    }}
                >
                    <div style={{ height: alto(nominaOrdenada.length) }}>
                        <Bar
                            data={{
                                labels: nominaOrdenada.map((x) => primeraMayuscula(x.campania)),
                                datasets: datasetsCosto(c, nominaOrdenada, { horizontal: true })
                            }}
                            options={opcionesApiladas(c, { horizontal: true, filas: nominaOrdenada.map((x) => ({ total: x.costo_total, empleados: x.empleados })) })}
                        />
                    </div>
                </Tarjeta>

                <Tarjeta
                    titulo="Puntualidad por campaña"
                    subtitulo={<Leyenda items={[{ color: c.serie2, texto: `Bajo la meta (${meta} %)` }, { color: c.contexto, texto: 'En la meta o más' }]} />}
                    fuente={`Días puntuales ÷ días trabajados del mes.${sinMarcaciones > 0 ? ` ${sinMarcaciones} campaña${sinMarcaciones === 1 ? '' : 's'} sin marcaciones en el mes no aparece${sinMarcaciones === 1 ? '' : 'n'}.` : ''}`}
                    vacio={conPuntualidad.length === 0 && 'Ninguna campaña tiene jornadas registradas en el mes.'}
                    tabla={{
                        columnas: ['Campaña', 'Puntualidad', 'Días trabajados', 'Ausencias'],
                        filas: conPuntualidad.map((x) => [primeraMayuscula(x.campania), `${x.puntualidad} %`, x.dias_trabajados, x.ausencias])
                    }}
                >
                    <div style={{ height: alto(conPuntualidad.length) }}>
                        <Bar
                            data={{
                                labels: conPuntualidad.map((x) => primeraMayuscula(x.campania)),
                                datasets: [{
                                    label: 'Puntualidad', data: conPuntualidad.map((x) => x.puntualidad),
                                    backgroundColor: conPuntualidad.map((x) => (x.puntualidad < meta ? c.serie2 : c.contexto)),
                                    ...barra({ maxBarThickness: 16 })
                                }]
                            }}
                            options={opcionesBase(c, { horizontal: true, formato: (v) => `${v} %`, max: 100 })}
                            plugins={[lineaMeta(meta, c.meta)]}
                        />
                    </div>
                </Tarjeta>

                <Tarjeta
                    titulo="Costo de horas extra por campaña"
                    fuente="Solo campañas con horas extra aprobadas en el mes."
                    vacio={extraOrdenado.length === 0 && 'No hay horas extra aprobadas en el mes.'}
                    tabla={{
                        columnas: ['Campaña', 'Horas', 'Costo'],
                        filas: extraOrdenado.map((x) => [primeraMayuscula(x.campania), horas(x.horas_extra), cop(x.dinero_extra)])
                    }}
                >
                    <div style={{ height: alto(extraOrdenado.length) }}>
                        <Bar
                            data={{
                                labels: extraOrdenado.map((x) => primeraMayuscula(x.campania)),
                                datasets: [{ label: 'Costo', data: extraOrdenado.map((x) => x.dinero_extra), backgroundColor: c.serie1, ...barra({ maxBarThickness: 16 }) }]
                            }}
                            options={(() => {
                                const o = opcionesBase(c, { horizontal: true, formato: cop, ejeFormato: copCompacto });
                                o.plugins.tooltip.callbacks.afterLabel = (ctx) => ` ${horas(extraOrdenado[ctx.dataIndex].horas_extra)}`;
                                return o;
                            })()}
                        />
                    </div>
                </Tarjeta>

                <Tarjeta
                    titulo="Horas extra por clase"
                    fuente="Recargos pagan solo el %; las extras, la hora completa + el %."
                    vacio={porClase.every((x) => !x.horas) && 'No hay horas extra aprobadas en el mes.'}
                    tabla={{
                        columnas: ['Clase', 'Horas', 'Costo'],
                        filas: porClase.map((x) => [CLASES[x.clase] || x.clase, horas(x.horas), cop(x.dinero)])
                    }}
                >
                    <div style={{ height: alto(porClase.length) }}>
                        <Bar
                            data={{
                                labels: porClase.map((x) => CLASES[x.clase] || x.clase),
                                datasets: [{ label: 'Horas', data: porClase.map((x) => x.horas), backgroundColor: c.serie1, ...barra({ maxBarThickness: 16 }) }]
                            }}
                            options={(() => {
                                const o = opcionesBase(c, { horizontal: true, formato: horas });
                                o.plugins.tooltip.callbacks.afterLabel = (ctx) => ` ${cop(porClase[ctx.dataIndex].dinero)}`;
                                return o;
                            })()}
                        />
                    </div>
                </Tarjeta>

                <Tarjeta
                    titulo="Novedades del mes por tipo"
                    fuente="Novedades de RRHH cuyo periodo se cruza con el mes."
                    vacio={novedades.length === 0 && 'No hay novedades registradas en el mes.'}
                    tabla={{ columnas: ['Tipo', 'Cantidad', 'Días'], filas: novedades.map((n) => [n.tipo, n.cantidad, n.dias]) }}
                >
                    <div style={{ height: alto(novedades.length) }}>
                        <Bar
                            data={{
                                labels: novedades.map((n) => n.tipo),
                                datasets: [{ label: 'Novedades', data: novedades.map((n) => n.cantidad), backgroundColor: c.serie1, ...barra({ maxBarThickness: 16 }) }]
                            }}
                            options={(() => {
                                const o = opcionesBase(c, { horizontal: true });
                                o.plugins.tooltip.callbacks.afterLabel = (ctx) => ` ${entero(novedades[ctx.dataIndex].dias)} días`;
                                return o;
                            })()}
                        />
                    </div>
                </Tarjeta>

                <div className="ai-panel">
                    <div className="ai-panel-head">
                        <h3 className="ai-panel-title">Empleados con más costo de horas extra</h3>
                        {esFinanciera && <Link to="/recursos-humanos/reportes-horas-extra" className="ai-link" style={{ fontSize: 13 }}>Ver reporte completo</Link>}
                    </div>
                    {top.length === 0 ? (
                        <div className="ai-empty"><p>No hay horas extra aprobadas en el mes.</p></div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ai-table ai-table--dense">
                                <thead><tr><th>Empleado</th><th>Campaña</th><th className="ai-num">Horas</th><th className="ai-num">Costo</th></tr></thead>
                                <tbody>
                                    {top.map((e) => (
                                        <tr key={e.users_company_id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{nombrePropio(e.nombre)}</div>
                                                <div className="ai-muted" style={{ fontSize: 12 }}>CC {e.documento}{e.cargo ? ` · ${primeraMayuscula(e.cargo)}` : ''}</div>
                                            </td>
                                            <td>{primeraMayuscula(e.campania || '') || '—'}</td>
                                            <td className="ai-num">{horas(e.horas)}</td>
                                            <td className="ai-num" style={{ fontWeight: 600 }}>{cop(e.dinero)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <p className="ai-muted" style={{ fontSize: 12, margin: '8px 16px 12px' }}>Fuente: reporte de horas extra del mes, ordenado por costo.</p>
                </div>
            </div>
        </>
    );
};

// Costo de nómina (asistencia.md §38): nómina, prestaciones, bonos y total del mes elegido, y su
// histórico mes a mes. El mes en curso es el proyectado al cierre con la nómina de hoy, más lo
// causado a la fecha.
const CostoNomina = ({ costo, nomina, periodo, c }) => {
    const [verTabla, setVerTabla] = useState(false);
    const historico = costo.historico;
    const iMes = historico.findIndex((m) => m.periodo === periodo);
    const mes = historico[iMes];
    const previo = iMes > 0 ? historico[iMes - 1] : null;
    const prestaciones = costo.factores.filter((f) => f.categoria !== 'aporte');
    const aportes = costo.factores.filter((f) => f.categoria === 'aporte');
    const pctPrestaciones = prestaciones.reduce((a, f) => a + f.porcentaje, 0);
    const pct = (n) => `${String(Math.round(n * 1000) / 1000).replace('.', ',')} %`;
    const variacion = (actual, antes) => (antes > 0 ? Math.round(((actual - antes) / antes) * 1000) / 10 : null);
    const etiquetaMes = (m) => `${nombrePeriodo(m.periodo)}${m.en_curso ? ' (en curso, proyectado)' : ''}`;

    const exportar = () => {
        const filas = historico.map((m, i) => [
            etiquetaMes(m), m.empleados, ...PARTES_COSTO.map((p) => Math.round(m[p.clave] ?? 0)), Math.round(m.total),
            i > 0 ? variacion(m.total, historico[i - 1].total) ?? '' : ''
        ]);
        const cursando = historico.find((m) => m.en_curso);
        if (cursando?.causado) {
            filas.push([`${nombrePeriodo(cursando.periodo)} (causado a hoy)`, '', ...PARTES_COSTO.map((p) => cursando.causado[p.clave] ?? 0), cursando.causado.total, '']);
        }
        descargarCsv(`costo_nomina_hasta_${periodo}.csv`, ['Mes', 'Empleados', ...PARTES_COSTO.map((p) => p.etiqueta), 'Costo total', 'Var. total %'], filas);
    };

    if (!mes) return null;
    const tiles = [
        { etiqueta: 'Nómina', clave: 'salarios', color: c.serie1, nota: `${entero(mes.empleados)} empleados` },
        { etiqueta: 'Prestaciones', clave: 'prestaciones', color: c.serie2, nota: `${pct(pctPrestaciones)} de la nómina` },
        { etiqueta: 'Aportes', clave: 'aportes', color: c.serie4, nota: 'Seguridad social y parafiscales' },
        { etiqueta: 'Bonos', clave: 'bonos', color: c.serie3, nota: 'No prestacional + cafetería' },
        { etiqueta: 'Auxilio de transporte', clave: 'auxilio_transporte', color: c.serie5, nota: `${entero(nomina.empleados_con_auxilio ?? 0)} empleados hasta 2 SMMLV` },
        { etiqueta: 'Costo total', clave: 'total', nota: 'Suma de las cinco partes', total: true }
    ];

    return (
        <div className="ai-panel">
            <div className="ai-panel-head" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                    <h3 className="ai-panel-title">Costo de nómina</h3>
                    <span className="ai-muted" style={{ fontSize: 13 }}>
                        {nombrePeriodo(periodo)}{mes.en_curso ? ' · proyectado al cierre con la nómina de hoy' : ''} · histórico de {historico.length} meses
                    </span>
                </div>
                <div className="ai-row" style={{ gap: 8 }}>
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportar}>
                        <Download size={14} strokeWidth={1.75} /> Exportar
                    </button>
                    <button type="button" className="ai-icon-btn" onClick={() => setVerTabla((v) => !v)}
                        title={verTabla ? 'Ver gráfica' : 'Ver tabla'} aria-label={verTabla ? 'Ver gráfica' : 'Ver tabla'}>
                        {verTabla ? <BarChart3 size={16} strokeWidth={1.75} /> : <Table2 size={16} strokeWidth={1.75} />}
                    </button>
                </div>
            </div>

            <div className="ai-kpi-strip" style={{ margin: '0 16px', boxShadow: 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                {tiles.map((t) => (
                    <div key={t.clave} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <span className="ai-row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-muted)', fontWeight: 500 }}>
                            {t.color && <i style={{ width: 10, height: 10, borderRadius: 2, background: t.color, display: 'inline-block' }} />}
                            {t.etiqueta}
                        </span>
                        <span className="ai-kpi-value" style={{ fontSize: t.total ? 26 : 22, lineHeight: '30px' }} title={cop(mes[t.clave])}>{copCompacto(mes[t.clave])}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                            {previo
                                ? <Delta valor={variacion(mes[t.clave], previo[t.clave])} sufijo="%" texto={`vs ${mesCorto(previo.periodo)}`} neutro />
                                : 'Sin mes anterior en el histórico'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>
                            {mes.en_curso && mes.causado ? `Causado a hoy ${copCompacto(mes.causado[t.clave])}` : t.nota}
                        </span>
                    </div>
                ))}
            </div>

            <div style={{ padding: '16px 16px 0' }}>
                {verTabla ? (
                    <div style={{ overflowX: 'auto', maxHeight: 440 }}>
                        <table className="ai-table ai-table--dense">
                            <thead>
                                <tr>
                                    <th>Mes</th><th className="ai-num">Empleados</th>
                                    {PARTES_COSTO.map((p) => <th key={p.clave} className="ai-num">{p.etiqueta}</th>)}
                                    <th className="ai-num">Costo total</th><th className="ai-num">Var. total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...historico].reverse().map((m) => {
                                    const i = historico.indexOf(m);
                                    const v = i > 0 ? variacion(m.total, historico[i - 1].total) : null;
                                    return (
                                        <React.Fragment key={m.periodo}>
                                            <tr style={m.periodo === periodo ? { background: 'var(--primary-soft)' } : undefined}>
                                                <td style={{ fontWeight: 600 }}>{etiquetaMes(m)}</td>
                                                <td className="ai-num">{entero(m.empleados)}</td>
                                                {PARTES_COSTO.map((p) => <td key={p.clave} className="ai-num">{cop(m[p.clave])}</td>)}
                                                <td className="ai-num" style={{ fontWeight: 600 }}>{cop(m.total)}</td>
                                                <td className="ai-num">{v == null ? '—' : `${v > 0 ? '+' : ''}${String(v).replace('.', ',')} %`}</td>
                                            </tr>
                                            {m.en_curso && m.causado && (
                                                <tr className="ai-muted">
                                                    <td style={{ paddingLeft: 24 }}>Causado a hoy</td>
                                                    <td />
                                                    {PARTES_COSTO.map((p) => <td key={p.clave} className="ai-num">{cop(m.causado[p.clave])}</td>)}
                                                    <td className="ai-num">{cop(m.causado.total)}</td>
                                                    <td />
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <>
                        <Leyenda items={LEYENDA_COSTO(c)} />
                        <div style={{ height: 280, marginTop: 8 }}>
                            <Bar
                                data={{
                                    labels: historico.map((m) => `${mesCorto(m.periodo)}${m.en_curso ? '*' : ''}`),
                                    datasets: datasetsCosto(c, historico, { alfa: (j) => historico[j].en_curso })
                                }}
                                options={opcionesApiladas(c, {
                                    filas: historico.map((m) => ({
                                        total: m.total,
                                        empleados: m.empleados,
                                        extra: m.en_curso && m.causado ? `En curso: proyectado. Causado a hoy ${cop(m.causado.total)}` : null
                                    }))
                                })}
                            />
                        </div>
                    </>
                )}
            </div>

            {[['Prestaciones', nomina.detalle_prestaciones], ['Aportes', nomina.detalle_aportes]].map(([titulo, detalle]) => (detalle?.length ? (
                <div key={titulo} style={{ padding: '12px 16px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600, alignSelf: 'center', minWidth: 92 }}>{titulo}:</span>
                    {detalle.map((d) => (
                        <span key={d.codigo} className="ai-badge" style={{ height: 'auto', padding: '4px 10px', fontSize: 12 }}
                            title={d.exonerable ? 'Exonerado para quien gana menos de 10 SMMLV (art. 114-1 E.T.)' : undefined}>
                            {d.exonerable && d.valor === 0 ? `${d.nombre} ${pct(d.porcentaje)} · exonerado` : `${d.nombre} ${pct(d.porcentaje_efectivo ?? d.porcentaje)} · ${copCompacto(d.valor)}`}
                        </span>
                    ))}
                </div>
            ) : null))}

            <p className="ai-muted" style={{ fontSize: 12, margin: '8px 16px 12px' }}>
                Fuente: vigencias del historial salarial de cada contrato, prorrateadas por días (mes comercial de {costo.dias_mes_comercial} días)
                entre el ingreso y el retiro. Prestaciones = {prestaciones.map((f) => `${f.nombre.toLowerCase()} ${pct(f.porcentaje)}`).join(' + ')} del
                salario básico (cesantías, intereses y prima también sobre el auxilio de transporte); los bonos no son base.
                {' '}Auxilio de transporte: valor del año para quien gana hasta 2 SMMLV, prorrateado por días; no es base de aportes.
                {aportes.length > 0 && <> Aportes del empleador sobre el IBC (salario + lo que los bonos pasen del 40 % de la remuneración):
                    {' '}{aportes.map((f) => `${f.nombre} ${f.codigo === 'arl' ? 'según la tarifa de cada empleado' : pct(f.porcentaje)}`).join(', ')};
                    {' '}{aportes.filter((f) => f.exonerable).map((f) => f.nombre).join(', ')} exonerados por debajo de 10 SMMLV. Los porcentajes del chip son los efectivos del mes.</>}
                {historico.some((m) => m.en_curso) ? ' * Mes en curso: proyectado al cierre con la nómina vigente hoy.' : ''}
            </p>
        </div>
    );
};

// "Lo que hay que mirar": los hallazgos redactados por el servidor, con icono + etiqueta (nunca solo color).
const NIVEL = {
    alerta: { icon: AlertTriangle, color: 'var(--warning)', fondo: 'var(--warning-soft)', etiqueta: 'Atención' },
    bueno: { icon: CheckCircle2, color: 'var(--success)', fondo: 'var(--success-soft)', etiqueta: 'Mejora' },
    info: { icon: Info, color: 'var(--primary-soft-ink)', fondo: 'var(--primary-soft)', etiqueta: 'Dato' }
};

const Hallazgos = ({ lista }) => (
    <div className="ai-panel">
        <div className="ai-panel-head"><h3 className="ai-panel-title">Lo que hay que mirar este mes</h3></div>
        {lista.length === 0 ? (
            <p className="ai-muted" style={{ margin: '12px 16px 16px', fontSize: 14 }}>Nada fuera de lo normal: sin cambios fuertes de costo ni de puntualidad.</p>
        ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '0 16px 16px', display: 'grid', gap: 8 }}>
                {lista.map((h, i) => {
                    const n = NIVEL[h.nivel] || NIVEL.info;
                    const Icono = n.icon;
                    return (
                        <li key={i} className="ai-row" style={{ gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, background: n.fondo }}>
                            <Icono size={16} strokeWidth={2} style={{ color: n.color, flex: 'none', marginTop: 2 }} />
                            <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                                <b style={{ color: n.color, fontWeight: 600 }}>{n.etiqueta}.</b> {h.texto}
                            </span>
                        </li>
                    );
                })}
            </ul>
        )}
    </div>
);

const Kpi = ({ label, valor, titulo, icon, pie, alerta, hero }) => (
    <div className={`ai-kpi${hero ? ' ai-kpi--hero' : ''}`} style={alerta ? { borderColor: 'var(--danger)' } : undefined}>
        <div className="ai-kpi-head"><span className="ai-kpi-label">{label}</span><span className="ai-kpi-icon" style={hero ? { background: 'rgba(255,255,255,.16)', color: '#fff' } : undefined}>{icon}</span></div>
        <div className="ai-kpi-value" title={titulo}>{valor}</div>
        {pie && <div className="ai-kpi-foot">{pie}</div>}
    </div>
);

// Variación con flecha + signo (no solo color). `subirEsMalo` invierte el color (p. ej. costos).
// `neutro`: sin juicio de bueno/malo (p. ej. la nómina sube porque se contrató): hereda el color.
const Delta = ({ valor, sufijo, texto, subirEsMalo, neutro }) => {
    if (valor == null) return <span>Sin base de comparación</span>;
    const Icono = valor > 0 ? ArrowUpRight : valor < 0 ? ArrowDownRight : Minus;
    const bueno = subirEsMalo ? valor < 0 : valor > 0;
    const color = neutro ? 'inherit' : valor === 0 ? 'var(--ink-muted)' : bueno ? 'var(--success)' : 'var(--danger)';
    return (
        <span className="ai-row" style={{ gap: 4 }}>
            <span className="ai-row" style={{ gap: 2, color, fontWeight: 600 }}>
                <Icono size={14} strokeWidth={2} />{valor > 0 ? '+' : ''}{String(valor).replace('.', ',')}{sufijo}
            </span>
            {texto}
        </span>
    );
};

const Leyenda = ({ items }) => (
    <span className="ai-row" style={{ gap: 12, flexWrap: 'wrap' }}>
        {items.map((it) => (
            <span key={it.texto} className="ai-row" style={{ gap: 5, fontSize: 12, color: 'var(--ink-muted)' }}>
                <i style={{ width: 10, height: 10, borderRadius: 2, background: it.color, display: 'inline-block' }} />{it.texto}
            </span>
        ))}
    </span>
);

// Tarjeta de gráfica: título, fuente del dato y alternancia gráfica ↔ tabla (accesibilidad).
const Tarjeta = ({ titulo, subtitulo, fuente, vacio, tabla, children }) => {
    const [verTabla, setVerTabla] = useState(false);
    return (
        <div className="ai-panel" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className="ai-panel-head" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                    <h3 className="ai-panel-title">{titulo}</h3>
                    {subtitulo}
                </div>
                {!vacio && tabla && (
                    <button type="button" className="ai-icon-btn" onClick={() => setVerTabla((v) => !v)}
                        title={verTabla ? 'Ver gráfica' : 'Ver tabla'} aria-label={verTabla ? 'Ver gráfica' : 'Ver tabla'}>
                        {verTabla ? <BarChart3 size={16} strokeWidth={1.75} /> : <Table2 size={16} strokeWidth={1.75} />}
                    </button>
                )}
            </div>
            <div style={{ padding: '0 16px', flex: 1 }}>
                {vacio ? (
                    <div className="ai-empty" style={{ padding: '32px 0' }}><p>{vacio}</p></div>
                ) : verTabla ? (
                    <div style={{ overflowX: 'auto', maxHeight: 420 }}>
                        <table className="ai-table ai-table--dense">
                            <thead><tr>{tabla.columnas.map((col, i) => <th key={col} className={i > 0 ? 'ai-num' : undefined}>{col}</th>)}</tr></thead>
                            <tbody>{tabla.filas.map((f, i) => <tr key={i}>{f.map((v, j) => <td key={j} className={j > 0 ? 'ai-num' : undefined}>{v}</td>)}</tr>)}</tbody>
                        </table>
                    </div>
                ) : children}
            </div>
            <p className="ai-muted" style={{ fontSize: 12, margin: '8px 16px 12px' }}>Fuente: {fuente}</p>
        </div>
    );
};

export default HomeFinanciera;
