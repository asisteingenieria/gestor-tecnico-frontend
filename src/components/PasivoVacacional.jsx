import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { pasivoVacacionalService } from '../services/api';
import Pagination from './Pagination';
import FiltroChip from './FiltroChip';
import AjusteSaldoPasivo from './AjusteSaldoPasivo';
import { nombrePropio, iniciales, claseCampania, primeraMayuscula } from '../utils/formatoRRHH';
import {
    CalendarClock, Search, AlertCircle, Download, Loader2, Users, Wallet, CalendarDays, Info, SlidersHorizontal
} from 'lucide-react';

// Pasivo vacacional calculado (claude/modulo recursoshumanos.md §58). Mismas fórmulas del Excel de Gestión Humana:
// días trabajados = DAYS360(ingreso, fecha) + 1; acumulados = trabajados × 15 / 360; pasivo = acumulados −
// disfrutados − compensados; total = pasivo − programadas; valor = días × salario / 30. Los disfrutados parten del
// Excel cargado al corte y desde ahí suman las novedades de Vacaciones; los compensados también, según la modalidad
// de la novedad (disfrutadas / compensadas / las dos, §59).

const PAGE_SIZE = 20;
// "Con observación" = no venía en el Excel de corte: sus disfrutados salen solo de las novedades y RRHH lo está revisando.
const SALDO = { con: 'Sin observación', sin: 'Con observación', ajustado: 'Ajustado por financiera' };
// Rangos del filtro "Pasivo" (días de pasivo a la fecha): 15 días = un año de vacaciones acumulado.
const RANGOS_PASIVO = [
    { etiqueta: 'Más de 30 días', cumple: (d) => d > 30 },
    { etiqueta: '15 a 30 días', cumple: (d) => d >= 15 && d <= 30 },
    { etiqueta: 'Menos de 15 días', cumple: (d) => d >= 0 && d < 15 },
    { etiqueta: 'Negativo', cumple: (d) => d < 0 }
];
const ORDENES = {
    ingreso_desc: { etiqueta: 'Ingreso más reciente', comparar: (a, b) => String(b.fecha_ingreso || '').localeCompare(String(a.fecha_ingreso || '')) },
    ingreso_asc: { etiqueta: 'Ingreso más antiguo', comparar: (a, b) => String(a.fecha_ingreso || '').localeCompare(String(b.fecha_ingreso || '')) },
    pasivo_desc: { etiqueta: 'Mayor pasivo', comparar: (a, b) => (Number(b.pasivo_dias) || 0) - (Number(a.pasivo_dias) || 0) },
    pasivo_asc: { etiqueta: 'Menor pasivo', comparar: (a, b) => (Number(a.pasivo_dias) || 0) - (Number(b.pasivo_dias) || 0) }
};
const AYUDA_OBSERVACION = 'Con observación: no venía en el Excel de corte de Gestión Humana y a esa fecha ya llevaba un año o más en la empresa, así que pudo tomar vacaciones que el sistema no conoce. Su pasivo es el acumulado menos las novedades de Vacaciones registradas; financiera puede ajustar su saldo.';

function calcularKpi(filas) {
    const suma = (campo) => filas.reduce((s, f) => s + (Number(f[campo]) || 0), 0);
    return {
        empleados: filas.length,
        pasivoDias: suma('pasivo_dias'),
        valorPasivo: suma('valor_pasivo'),
        programadas: suma('dias_programados'),
        totalDias: suma('total_dias'),
        valorTotal: suma('valor_total'),
        sinCorte: filas.filter(f => f.con_observacion).length
    };
}

const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
// Último día del mes anterior y del mes actual, para los atajos de cierre.
const finDeMes = (desplazamiento) => {
    const [a, m] = hoyBogota().split('-').map(Number);
    return new Date(Date.UTC(a, m - 1 + desplazamiento + 1, 0)).toISOString().slice(0, 10);
};

const fmtDias = (n) => (n == null ? '—' : Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 }));
const fmtMoneda = (n) => (n == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n));
const fmtFecha = (iso) => {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
};

async function mensajeDeError(err, porDefecto) {
    const data = err?.response?.data;
    if (data instanceof Blob) {
        try { return JSON.parse(await data.text()).message; } catch { /* no era JSON */ }
    }
    return data?.message || porDefecto;
}

const PasivoVacacional = () => {
    const { isRecursosHumanos } = useAuth();
    const [fecha, setFecha] = useState(hoyBogota());
    // `conValores`: el servidor solo manda salario y valores en pesos a financiera; RRHH ve el pasivo en días.
    const [datos, setDatos] = useState({ filas: [], totales: null, conValores: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroCampanias, setFiltroCampanias] = useState(new Set());
    const [filtroAreas, setFiltroAreas] = useState(new Set());
    const [filtroSaldo, setFiltroSaldo] = useState(new Set());
    const [filtroPasivo, setFiltroPasivo] = useState(new Set());
    const [orden, setOrden] = useState('ingreso_desc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const [descargando, setDescargando] = useState(false);
    const [ajustando, setAjustando] = useState(null);

    const cargar = async (dia = fecha) => {
        try {
            setLoading(true);
            const response = await pasivoVacacionalService.get({ fecha: dia });
            setDatos({ filas: response.data.filas, totales: response.data.totales, conValores: Boolean(response.data.con_valores) });
            setError('');
        } catch (err) {
            console.error('Error al cargar el pasivo vacacional:', err);
            setError(err?.response?.data?.message || 'Error al cargar el pasivo vacacional');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (fecha) cargar(fecha);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, filtroCampanias, filtroAreas, filtroSaldo, filtroPasivo, orden, fecha]);

    const opcionesCampania = useMemo(() => [...new Set(datos.filas.map(f => f.campania || 'Sin campaña'))].sort((a, b) => a.localeCompare(b, 'es')), [datos.filas]);
    const opcionesArea = useMemo(() => [...new Set(datos.filas.map(f => f.area || 'Sin área'))].sort((a, b) => a.localeCompare(b, 'es')), [datos.filas]);

    const busqueda = searchTerm.trim().toLowerCase();
    const filtradas = datos.filas.filter(f => {
        if (busqueda && !((f.nombre || '').toLowerCase().includes(busqueda) || String(f.numero_identificacion || '').includes(busqueda) || (f.cargo || '').toLowerCase().includes(busqueda))) return false;
        if (filtroCampanias.size && !filtroCampanias.has(f.campania || 'Sin campaña')) return false;
        if (filtroAreas.size && !filtroAreas.has(f.area || 'Sin área')) return false;
        if (filtroSaldo.size && !(filtroSaldo.has(f.con_observacion ? SALDO.sin : SALDO.con)
            || (filtroSaldo.has(SALDO.ajustado) && f.origen_saldo === 'financiera'))) return false;
        if (filtroPasivo.size && !RANGOS_PASIVO.some(r => filtroPasivo.has(r.etiqueta) && r.cumple(Number(f.pasivo_dias) || 0))) return false;
        return true;
    }).sort(ORDENES[orden].comparar);
    const hayFiltros = Boolean(busqueda) || filtroCampanias.size > 0 || filtroAreas.size > 0 || filtroSaldo.size > 0 || filtroPasivo.size > 0;

    // KPI sobre la lista filtrada; con filtros, cada tarjeta muestra además el total general (§58.4, como §56.2).
    const kpi = calcularKpi(filtradas);
    const kpiTotal = useMemo(() => calcularKpi(datos.filas), [datos.filas]);

    const { conValores } = datos;
    const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
    const paginadas = filtradas.slice((page - 1) * pageSize, page * pageSize);

    const descargar = async () => {
        setDescargando(true);
        setAviso('');
        try {
            const response = await pasivoVacacionalService.exportar({ fecha });
            const disposicion = response.headers?.['content-disposition'] || '';
            const nombre = disposicion.match(/filename="?([^"]+)"?/)?.[1] || `pasivo_vacacional_${fecha}.xlsx`;
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            a.click();
            URL.revokeObjectURL(url);
            setAviso(`Se descargó el pasivo de ${response.headers?.['x-total-empleados'] ?? ''} empleados al ${fmtFecha(fecha)}.`);
        } catch (err) {
            console.error('Error al descargar el pasivo:', err);
            setError(await mensajeDeError(err, 'No se pudo descargar el pasivo vacacional'));
        } finally {
            setDescargando(false);
        }
    };

    if (!isRecursosHumanos) {
        return (
            <div className="ai-scope">
                <div className="ai-content" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div className="ai-card" style={{ padding: 32, textAlign: 'center', maxWidth: 360 }}>
                        <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--danger)' }} />
                        <h2 style={{ font: '600 20px/28px var(--font-display)', margin: '0 0 6px' }}>Acceso denegado</h2>
                        <p className="ai-muted">Solo Recursos Humanos puede acceder a esta sección.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-scope">
            <div className="ai-content">
                <div className="ai-page-head">
                    <div>
                        <h1 className="ai-page-title">Pasivo vacacional</h1>
                        <p className="ai-page-sub">
                            {conValores ? 'Días y valor' : 'Días'} de vacaciones pendientes por empleado, con la fórmula del Excel de Gestión Humana
                        </p>
                    </div>
                    <div className="ai-row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div>
                            <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Calcular al</label>
                            <input type="date" className="ai-input" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
                        </div>
                        <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => setFecha(finDeMes(-1))}>Cierre mes anterior</button>
                        <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => setFecha(finDeMes(0))}>Cierre de este mes</button>
                        <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => setFecha(hoyBogota())}>Hoy</button>
                        {/* La descarga es solo de financiera (§58.2); RRHH consulta en pantalla. */}
                        {conValores && (
                            <button onClick={descargar} className="ai-btn ai-btn--secondary" disabled={descargando || loading}>
                                {descargando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {descargando ? 'Descargando…' : 'Descargar Excel'}
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', width: 'fit-content' }}>
                        <span className="ai-dot" />
                        {error}
                    </div>
                )}
                {aviso && (
                    <div className="ai-badge ai-badge--success" style={{ height: 'auto', padding: '10px 14px', width: 'fit-content' }}>
                        <span className="ai-dot" />
                        {aviso}
                    </div>
                )}

                <div className="ai-kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div>
                        <span className="ai-kpi-icon"><Users size={18} strokeWidth={1.75} /></span>
                        <div>
                            <p className="ai-kpi-label">Empleados</p>
                            <p className="ai-kpi-value ai-num">{kpi.empleados}</p>
                            {kpi.sinCorte > 0 && <p className="ai-muted" style={{ fontSize: 12, margin: 0 }} title={AYUDA_OBSERVACION}><span className="ai-num">{kpi.sinCorte}</span> con observación</p>}
                            {hayFiltros && <p className="ai-muted" style={{ fontSize: 11, margin: 0 }}>Según los filtros · <span className="ai-num">{kpiTotal.empleados}</span> en total</p>}
                        </div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><CalendarClock size={18} strokeWidth={1.75} /></span>
                        <div>
                            <p className="ai-kpi-label">Pasivo (días)</p>
                            <p className="ai-kpi-value ai-num">{fmtDias(kpi.pasivoDias)}</p>
                            {conValores && <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}>{fmtMoneda(kpi.valorPasivo)}</p>}
                            {hayFiltros && <p className="ai-muted" style={{ fontSize: 11, margin: 0 }}>Según los filtros · <span className="ai-num">{fmtDias(kpiTotal.pasivoDias)}{conValores && ` · ${fmtMoneda(kpiTotal.valorPasivo)}`}</span> en total</p>}
                        </div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><CalendarDays size={18} strokeWidth={1.75} /></span>
                        <div>
                            <p className="ai-kpi-label">Vacaciones programadas</p>
                            <p className="ai-kpi-value ai-num">{fmtDias(kpi.programadas)}</p>
                            <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}>días después del {fmtFecha(fecha)}</p>
                            {hayFiltros && <p className="ai-muted" style={{ fontSize: 11, margin: 0 }}>Según los filtros · <span className="ai-num">{fmtDias(kpiTotal.programadas)}</span> en total</p>}
                        </div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><Wallet size={18} strokeWidth={1.75} /></span>
                        <div>
                            <p className="ai-kpi-label">Total (pasivo − programadas)</p>
                            {conValores ? (
                                <>
                                    <p className="ai-kpi-value ai-num">{fmtMoneda(kpi.valorTotal)}</p>
                                    <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}><span className="ai-num">{fmtDias(kpi.totalDias)}</span> días</p>
                                </>
                            ) : (
                                <p className="ai-kpi-value ai-num">{fmtDias(kpi.totalDias)} <span className="ai-muted" style={{ fontSize: 13, fontWeight: 400 }}>días</span></p>
                            )}
                            {hayFiltros && <p className="ai-muted" style={{ fontSize: 11, margin: 0 }}>Según los filtros · <span className="ai-num">{conValores ? fmtMoneda(kpiTotal.valorTotal) : `${fmtDias(kpiTotal.totalDias)} días`}</span> en total</p>}
                        </div>
                    </div>
                </div>

                <div className="ai-card">
                    <div className="ai-toolbar">
                        <div className="ai-search" style={{ flex: 1 }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por empleado, identificación o cargo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, font: 'inherit', color: 'inherit' }}
                            />
                        </div>
                        <FiltroChip etiqueta="Campaña" opciones={opcionesCampania} seleccion={filtroCampanias} onChange={setFiltroCampanias} />
                        <FiltroChip etiqueta="Área" opciones={opcionesArea} seleccion={filtroAreas} onChange={setFiltroAreas} />
                        <FiltroChip etiqueta="Observación" opciones={[SALDO.sin, SALDO.con, SALDO.ajustado]} seleccion={filtroSaldo} onChange={setFiltroSaldo} />
                        <FiltroChip etiqueta="Pasivo" opciones={RANGOS_PASIVO.map(r => r.etiqueta)} seleccion={filtroPasivo} onChange={setFiltroPasivo} />
                        <select value={orden} onChange={(e) => setOrden(e.target.value)} className="ai-input" style={{ width: 'auto' }} title="Orden de la tabla">
                            {Object.entries(ORDENES).map(([k, o]) => <option key={k} value={k}>Ordenar: {o.etiqueta}</option>)}
                        </select>
                    </div>
                    <div className="ai-row" style={{ gap: 8, padding: '0 16px 12px', alignItems: 'center' }}>
                        <Info size={14} style={{ color: 'var(--ink-subtle)', flexShrink: 0 }} />
                        <span className="ai-muted" style={{ fontSize: 12 }}>
                            Disfrutados y compensados = los del Excel al corte + novedades de Vacaciones desde el corte, según su
                            modalidad. Programadas = novedades de Vacaciones que empiezan después de la fecha.{conValores && ' Valor = días × salario / 30.'}
                            {hayFiltros && <> · <strong className="ai-num">{filtradas.length}</strong> de {datos.filas.length} empleados</>}
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--primary)' }} />
                        </div>
                    ) : filtradas.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <CalendarClock size={36} style={{ margin: '0 auto 10px', color: 'var(--ink-subtle)' }} />
                            <p style={{ fontWeight: 600, margin: 0 }}>Sin empleados</p>
                            <p className="ai-muted" style={{ marginTop: 4 }}>{hayFiltros ? 'Ningún empleado coincide con los filtros.' : 'No hay empleados vigentes a esa fecha.'}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ai-table ai-table--dense">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Campaña</th>
                                        <th>Ingreso</th>
                                        <th className="ai-num" title="DAYS360(ingreso, fecha) + 1">Trabajados</th>
                                        <th className="ai-num" title="Trabajados × 15 / 360">Acumulados</th>
                                        <th className="ai-num">Disfrutados</th>
                                        <th className="ai-num">Compensados</th>
                                        <th className="ai-num">Pasivo</th>
                                        <th className="ai-num">Programadas</th>
                                        <th className="ai-num">Total</th>
                                        {conValores && <th className="ai-num">Valor pasivo</th>}
                                        {conValores && <th aria-label="Ajustar" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginadas.map((f) => {
                                        const chip = claseCampania(f.campania);
                                        return (
                                            <tr key={f.users_company_id}>
                                                <td>
                                                    <div className="ai-person">
                                                        <span className="ai-avatar ai-avatar--sm ai-avatar--brand">{iniciales(f.nombre)}</span>
                                                        <div>
                                                            <div className="ai-person-name">{nombrePropio(f.nombre)}</div>
                                                            <div className="ai-person-sub">
                                                                {f.numero_identificacion}
                                                                {f.con_observacion && (
                                                                    <span className="ai-badge ai-badge--warning" style={{ marginLeft: 6 }} title={AYUDA_OBSERVACION}>
                                                                        con observación
                                                                    </span>
                                                                )}
                                                                {f.origen_saldo === 'financiera' && (
                                                                    <span className="ai-badge ai-badge--info" style={{ marginLeft: 6 }} title={`Saldo ajustado por financiera al ${fmtFecha(f.fecha_corte)}${f.nota_saldo ? `: ${f.nota_saldo}` : ''}`}>
                                                                        ajustado
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {f.campania ? <span className={`ai-chip${chip ? ` ${chip}` : ''}`}>{primeraMayuscula(f.campania)}</span> : <span className="ai-muted">—</span>}
                                                </td>
                                                <td className="ai-muted">{fmtFecha(f.fecha_ingreso)}</td>
                                                <td className="ai-num">{f.dias_trabajados}</td>
                                                <td className="ai-num">{fmtDias(f.dias_acumulados)}</td>
                                                <td className="ai-num">{fmtDias(f.dias_disfrutados)}</td>
                                                <td className="ai-num">{fmtDias(f.dias_compensados)}</td>
                                                <td className="ai-num" style={{ fontWeight: 600, color: f.pasivo_dias < 0 ? 'var(--danger)' : undefined }}>{fmtDias(f.pasivo_dias)}</td>
                                                <td className="ai-num">{fmtDias(f.dias_programados)}</td>
                                                <td className="ai-num">{fmtDias(f.total_dias)}</td>
                                                {conValores && (
                                                    <td className="ai-num" title={f.salario ? `Salario ${fmtMoneda(f.salario)}` : 'Sin salario vigente'}>{fmtMoneda(f.valor_pasivo)}</td>
                                                )}
                                                {conValores && (
                                                    <td>
                                                        <button type="button" className="ai-icon-btn" title="Ajustar fecha de corte, disfrutados y compensados" onClick={() => setAjustando(f)}>
                                                            <SlidersHorizontal size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        totalItems={filtradas.length}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                        etiqueta="empleados"
                    />
                </div>
            </div>
            {ajustando && (
                <AjusteSaldoPasivo
                    fila={ajustando}
                    fechaCalculo={fecha}
                    onClose={() => setAjustando(null)}
                    onGuardado={() => {
                        setAviso(`Se ajustó el saldo de ${nombrePropio(ajustando.nombre)}.`);
                        setAjustando(null);
                        cargar(fecha);
                    }}
                />
            )}
        </div>
    );
};

export default PasivoVacacional;
