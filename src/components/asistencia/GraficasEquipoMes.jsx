import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Timer } from 'lucide-react';
import { nombrePropio } from '../../utils/formatoRRHH';

// Gráficas del histórico del equipo (EquipoMensual.jsx): la tabla "Detalle por empleado" en dos barras
// apiladas horizontales, una por unidad (una gráfica nunca mezcla días con horas):
//   1. Asistencia del mes en días: puntual · tarde · ausente, con la puntualidad al final.
//   2. Distribución del tiempo en horas: disponible · capacitación · break · baño · almuerzo · extra.
// Colores validados con el validador de paletas (claro y oscuro, tokens --gm-* de components.css), en el
// orden en que se validaron: no se reordenan. Al pasar el mouse sale el detalle de la persona; el clic abre
// su trazabilidad, como en la tabla.

const LIMITE = 20;

const SERIES_ASISTENCIA = [
    { id: 'puntual', label: 'Puntual', valor: (e) => Number(e.dias_puntuales) || 0 },
    { id: 'tarde', label: 'Llegó tarde', valor: (e) => Number(e.dias_tarde) || 0 },
    { id: 'ausente', label: 'Ausente', valor: (e) => Number(e.ausencias) || 0 }
];

// Horas trabajadas incluyen capacitación y horas extra: "disponible" es el resto, para no contarlas dos veces.
const SERIES_TIEMPO = [
    { id: 'disponible', label: 'Disponible', valor: (e) => Math.max(0, (Number(e.minutos_trabajados) || 0) - (Number(e.minutos_capacitacion) || 0) - (Number(e.minutos_extra) || 0)) },
    { id: 'capacitacion', label: 'Capacitación', valor: (e) => Number(e.minutos_capacitacion) || 0 },
    { id: 'break', label: 'Break', valor: (e) => Number(e.minutos_break) || 0 },
    { id: 'bano', label: 'Baño', valor: (e) => Number(e.minutos_bano) || 0 },
    { id: 'almuerzo', label: 'Almuerzo', valor: (e) => Number(e.minutos_almuerzo) || 0 },
    { id: 'extra', label: 'Horas extra', valor: (e) => Number(e.minutos_extra) || 0 }
];

const horas = (min) => `${(min / 60).toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`;
const dias = (n) => `${n} ${n === 1 ? 'día' : 'días'}`;
const pausas = (e) => (Number(e.minutos_bano) || 0) + (Number(e.minutos_break) || 0) + (Number(e.minutos_almuerzo) || 0);

// Marcas del eje: hasta 5, en pasos enteros, y la última justo por encima del máximo.
function marcas(max) {
    if (max <= 0) return [0];
    const paso = Math.max(1, Math.ceil(max / 4));
    const n = Math.ceil(max / paso);
    return Array.from({ length: n + 1 }, (_, i) => i * paso);
}

const GraficaBarras = ({ titulo, icono, subtitulo, series, filas, formato, total, etiquetaFinal, hrefDe, unidad }) => {
    const navigate = useNavigate();
    const [tip, setTip] = useState(null);
    const [verTodas, setVerTodas] = useState(false);
    const visibles = verTodas ? filas : filas.slice(0, LIMITE);
    const valores = (e) => series.map((s) => ({ ...s, v: s.valor(e) }));
    const ejes = marcas(Math.max(0, ...filas.map((e) => total(e)), 0) / (unidad || 1));
    const tope = ejes[ejes.length - 1] * (unidad || 1) || 1;

    const mostrar = (ev, e) => {
        const caja = ev.currentTarget.closest('.gm-grafica').getBoundingClientRect();
        const x = ev.clientX - caja.left;
        // Cerca del borde derecho, el detalle sale a la izquierda del cursor para no cortarse.
        const y = ev.clientY - caja.top;
        // Y en la mitad de abajo, hacia arriba, para no salirse de la pantalla al final de la página.
        setTip({ e, x, y, izquierda: x > caja.width - 250, arriba: y > caja.height / 2 });
    };

    return (
        <section className="gm-grafica" onMouseLeave={() => setTip(null)}>
            <header className="gm-head">
                <div>
                    <h3>{icono && React.createElement(icono, { size: 17, strokeWidth: 2, 'aria-hidden': 'true' })} {titulo}</h3>
                    <p>{subtitulo}</p>
                </div>
                <div className="gm-leyenda" aria-label="Leyenda">
                    {series.map((s) => (
                        <span key={s.id}><i className={`gm-c--${s.id}`} aria-hidden="true" />{s.label}</span>
                    ))}
                </div>
            </header>

            <div className="gm-cuerpo">
                <div className="gm-rejilla" aria-hidden="true">
                    {ejes.map((m) => <span key={m} style={{ left: `${(m * (unidad || 1) / tope) * 100}%` }} />)}
                </div>
                {visibles.map((e) => {
                    const vals = valores(e);
                    const t = total(e);
                    return (
                        <button
                            type="button" key={e.users_company_id} className="gm-fila"
                            onMouseMove={(ev) => mostrar(ev, e)} onFocus={(ev) => mostrar(ev, e)} onBlur={() => setTip(null)}
                            onClick={() => navigate(hrefDe(e))}
                            aria-label={`${nombrePropio(e.nombre)}: ${vals.map((s) => `${s.label} ${formato(s.v)}`).join(', ')}`}
                        >
                            <span className="gm-nombre">{nombrePropio(e.nombre)}</span>
                            <span className="gm-pista">
                                <span className="gm-barra" style={{ width: `${(t / tope) * 100}%` }}>
                                    {vals.filter((s) => s.v > 0).map((s) => (
                                        <span key={s.id} className={`gm-seg gm-c--${s.id}`} style={{ flexGrow: s.v }} />
                                    ))}
                                </span>
                                <span className="gm-valor">{etiquetaFinal(e)}</span>
                            </span>
                        </button>
                    );
                })}
                <div className="gm-eje">
                    <span className="gm-nombre" />
                    <span className="gm-pista">
                        {ejes.map((m) => (
                            <span key={m} style={{ left: `${(m * (unidad || 1) / tope) * 100}%` }}>{unidad ? `${m} h` : m}</span>
                        ))}
                    </span>
                </div>
            </div>

            {filas.length > LIMITE && (
                <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm gm-ver" onClick={() => setVerTodas((v) => !v)}>
                    {verTodas ? `Ver solo las primeras ${LIMITE}` : `Ver las ${filas.length} personas`}
                </button>
            )}

            {tip && (
                <div
                    className="gm-tip" role="tooltip"
                    style={{
                        left: tip.izquierda ? tip.x - 14 : tip.x + 14,
                        top: tip.arriba ? tip.y - 14 : tip.y + 14,
                        transform: `translate(${tip.izquierda ? '-100%' : '0'}, ${tip.arriba ? '-100%' : '0'})`
                    }}
                >
                    <strong>{nombrePropio(tip.e.nombre)}</strong>
                    {valores(tip.e).map((s) => (
                        <div key={s.id} className="gm-tip-fila">
                            <i className={`gm-c--${s.id}`} aria-hidden="true" />
                            <span>{s.label}</span>
                            <b>{formato(s.v)}</b>
                        </div>
                    ))}
                    <div className="gm-tip-pie">{etiquetaFinal(tip.e, true)}</div>
                </div>
            )}
        </section>
    );
};

const GraficasEquipoMes = ({ empleados, hrefDe }) => {
    // Primero quien más necesita atención: menor puntualidad / más ausencias; más horas en pausas.
    const porAsistencia = useMemo(() => [...empleados].sort((a, b) =>
        (a.porcentaje_puntualidad ?? 101) - (b.porcentaje_puntualidad ?? 101)
        || (Number(b.ausencias) || 0) - (Number(a.ausencias) || 0)
        || String(a.nombre).localeCompare(String(b.nombre))), [empleados]);
    const porPausas = useMemo(() => [...empleados].sort((a, b) => pausas(b) - pausas(a)
        || String(a.nombre).localeCompare(String(b.nombre))), [empleados]);

    const totalDias = (e) => SERIES_ASISTENCIA.reduce((acc, s) => acc + s.valor(e), 0);
    const totalMin = (e) => SERIES_TIEMPO.reduce((acc, s) => acc + s.valor(e), 0);

    return (
        <div className="gm-graficas">
            <GraficaBarras
                titulo="Asistencia del mes" icono={CalendarCheck}
                subtitulo={`Días por persona${empleados.length > LIMITE ? ` · primero las ${LIMITE} con menor puntualidad` : ' · de menor a mayor puntualidad'}`}
                series={SERIES_ASISTENCIA} filas={porAsistencia} formato={dias} total={totalDias} hrefDe={hrefDe}
                etiquetaFinal={(e, largo) => (e.porcentaje_puntualidad != null
                    ? `${e.porcentaje_puntualidad}%${largo ? ' de puntualidad' : ''}`
                    : (largo ? 'Sin días trabajados' : '—'))}
            />
            <GraficaBarras
                titulo="Distribución del tiempo" icono={Timer} unidad={60}
                subtitulo={`Horas por persona${empleados.length > LIMITE ? ` · primero las ${LIMITE} con más horas en pausas` : ' · de más a menos horas en pausas'}`}
                series={SERIES_TIEMPO} filas={porPausas} formato={horas} total={totalMin} hrefDe={hrefDe}
                etiquetaFinal={(e, largo) => (largo ? `Pausas: ${horas(pausas(e))} · Total: ${horas(totalMin(e))}` : horas(totalMin(e)))}
            />
        </div>
    );
};

export default GraficasEquipoMes;
