import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users, UserCheck, Coffee, Clock, AlertTriangle, UserX, RefreshCw, Download, Search, History, BarChart3 } from 'lucide-react';
import { asistenciaService, financieraService } from '../../services/api';
import { nombrePropio, iniciales, primeraMayuscula } from '../../utils/formatoRRHH';
import { formatearDuracion } from '../../utils/tiempoAsistencia';
import { descargarCsv } from '../../utils/csv';
import { formatearHora12 } from '../../utils/tiempoAsistencia';
import { BadgeIngreso } from './IngresoAsislock';
import { MODALIDAD_INGRESO, textoConexion } from '../../utils/asislock';
import { datosPausa } from '../../utils/pausasAsistencia';
import { escucharAsistencia, escucharCambiosEmpleados } from '../../utils/socketAsistencia';
import SelectorVistaEquipo from './SelectorVistaEquipo';

const POLL_MS = 30000;
// Financiera ve a toda la empresa: los avisos de una ráfaga (cambio de turno) se agrupan en una recarga.
const ESPERA_AVISOS_FINANCIERA_MS = 3000;

const BadgePausa = ({ pausa }) => {
    const { etiqueta, Icono, badge } = datosPausa(pausa.tipo);
    return (
        <span className={`ai-badge ${badge}`}>
            <Icono size={12} strokeWidth={1.75} />
            {etiqueta} · {pausa.minutosTranscurridos} min
        </span>
    );
};

const ESTADO_BADGE = {
    pendiente: { label: 'Sin iniciar', clase: 'ai-badge--neutral' },
    en_curso: { label: 'En turno', clase: 'ai-badge--success' },
    en_pausa: { label: 'En pausa', clase: 'ai-badge--info' },
    finalizada: { label: 'Finalizada', clase: 'ai-badge--neutral' },
    ausente: { label: 'Ausente', clase: 'ai-badge--danger' }
};

const ORDEN_ESTADO = { ausente: 0, en_pausa: 1, en_curso: 2, pendiente: 3, finalizada: 4 };

const TABS = [
    { id: 'todos', label: 'Todos' },
    { id: 'en_curso', label: 'En turno' },
    { id: 'en_pausa', label: 'En pausa' },
    { id: 'pendiente', label: 'Sin iniciar' },
    { id: 'ausente', label: 'Ausentes' }
];

const SIN_CENTRO = 'Sin centro de costo';

function esTarde(emp) {
    return emp.alertas?.includes('llegada_tarde');
}

// "Outbound 7-4 · 07:00–16:00", "Descanso" o "Sin horario" (§46).
function textoTurno(turno) {
    if (!turno) return 'Sin horario hoy';
    if (turno.es_descanso) return 'Descanso';
    const horas = `${turno.hora_entrada.slice(0, 5)}–${turno.hora_salida.slice(0, 5)}`;
    return turno.plantilla ? `${turno.plantilla} · ${horas}` : horas;
}

// Tablero en vivo de la jornada de hoy. El jefe ve su equipo ("Equipo hoy"); financiera, con
// `financiera`, ve a toda la empresa filtrando por campaña y centro de costo (asistencia.md §47).
// El histórico de cada persona es su trazabilidad día a día y el reporte mensual.
const EquipoAsistencia = ({ financiera = false }) => {
    const [equipo, setEquipo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actualizando, setActualizando] = useState(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
    const [haceSegundos, setHaceSegundos] = useState(0);
    const [tab, setTab] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [centro, setCentro] = useState('');
    const [campanias, setCampanias] = useState([]);
    const [campaniaId, setCampaniaId] = useState('');
    const pausadoRef = useRef(false);

    const cargar = useCallback(async (silencioso = false) => {
        if (silencioso) setActualizando(true);
        try {
            const { data } = financiera ? await financieraService.getEnVivo(campaniaId) : await asistenciaService.getEquipo();
            setEquipo(data);
            setUltimaActualizacion(Date.now());
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo cargar la asistencia');
        } finally {
            setLoading(false);
            setActualizando(false);
        }
    }, [financiera, campaniaId]);

    useEffect(() => {
        if (!financiera) return;
        financieraService.getCampanias().then(({ data }) => setCampanias(data)).catch(() => setCampanias([]));
    }, [financiera]);

    useEffect(() => {
        cargar();
        const onVisibility = () => { pausadoRef.current = document.visibilityState !== 'visible'; };
        document.addEventListener('visibilitychange', onVisibility);
        const id = setInterval(() => { if (!pausadoRef.current) cargar(true); }, POLL_MS);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
    }, [cargar]);

    // Aviso en vivo: un cambio de jornada (AsisLock o portal) recarga la tabla sin esperar al sondeo
    // de 30 s. El jefe recibe los de su equipo; financiera, los de todos (sala de monitores, §43).
    useEffect(() => (financiera
        ? escucharCambiosEmpleados(() => { cargar(true); }, ESPERA_AVISOS_FINANCIERA_MS)
        : escucharAsistencia('asistencia:equipo', () => { cargar(true); })
    ), [cargar, financiera]);

    useEffect(() => {
        const id = setInterval(() => {
            if (ultimaActualizacion) setHaceSegundos(Math.floor((Date.now() - ultimaActualizacion) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [ultimaActualizacion]);

    // Centros de costo presentes, con su conteo: los turnos se definen por centro (§45).
    const centros = useMemo(() => {
        const conteo = new Map();
        for (const e of equipo) {
            const nombreCentro = e.centro_costo || SIN_CENTRO;
            conteo.set(nombreCentro, (conteo.get(nombreCentro) || 0) + 1);
        }
        return [...conteo.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [equipo]);

    // Lo que cuentan los KPIs y las pestañas: el filtro de centro de costo aplica a todo el tablero.
    const delCentro = useMemo(
        () => (centro ? equipo.filter((e) => (e.centro_costo || SIN_CENTRO) === centro) : equipo),
        [equipo, centro]
    );

    const kpis = useMemo(() => ({
        enTurno: delCentro.filter((e) => e.estado === 'en_curso').length,
        enPausaBano: delCentro.filter((e) => e.pausa_activa?.tipo === 'bano').length,
        enPausaAlmuerzo: delCentro.filter((e) => e.pausa_activa?.tipo === 'almuerzo').length,
        enPausaBreak: delCentro.filter((e) => e.pausa_activa?.tipo === 'break').length,
        enCapacitacion: delCentro.filter((e) => e.pausa_activa?.tipo === 'capacitacion').length,
        sinIniciar: delCentro.filter((e) => e.estado === 'pendiente').length,
        tarde: delCentro.filter(esTarde).length,
        ausentes: delCentro.filter((e) => e.estado === 'ausente').length,
        presencial: delCentro.filter((e) => e.asislock?.modalidad === 'presencial').length,
        teletrabajo: delCentro.filter((e) => e.asislock?.modalidad === 'teletrabajo').length
    }), [delCentro]);

    const filtrado = useMemo(() => {
        let lista = delCentro;
        if (tab !== 'todos') lista = lista.filter((e) => e.estado === tab);
        if (busqueda.trim()) {
            const q = busqueda.trim().toLowerCase();
            lista = lista.filter((e) => (e.nombre || '').toLowerCase().includes(q) || e.cedula?.includes(q));
        }
        return [...lista].sort((a, b) => {
            const pa = (a.estado === 'ausente' || esTarde(a)) ? 0 : ORDEN_ESTADO[a.estado] ?? 9;
            const pb = (b.estado === 'ausente' || esTarde(b)) ? 0 : ORDEN_ESTADO[b.estado] ?? 9;
            if (pa !== pb) return pa - pb;
            return (a.nombre || '').localeCompare(b.nombre || '');
        });
    }, [delCentro, tab, busqueda]);

    const exportar = () => {
        const filas = filtrado.map((e) => [
            nombrePropio(e.nombre), e.cedula || '', primeraMayuscula(e.cargo || ''),
            primeraMayuscula(e.campania || ''), e.centro_costo || '', e.jefe_area ? nombrePropio(e.jefe_area) : '', textoTurno(e.turno),
            MODALIDAD_INGRESO[e.asislock?.modalidad]?.label || '',
            e.asislock?.primer_login ? formatearHora12(e.asislock.primer_login) : '',
            textoConexion(e.asislock) || '',
            formatearDuracion(e.minutos_trabajados), ESTADO_BADGE[e.estado]?.label || e.estado, e.alertas?.length || 0
        ]);
        descargarCsv(
            financiera ? 'asistencia_en_vivo.csv' : 'equipo_hoy.csv',
            ['Empleado', 'Cédula', 'Cargo', 'Campaña', 'Centro de costo', 'Jefe de área', 'Turno', 'Ingreso', 'Primer login AsisLock', 'AsisLock', 'Tiempo hoy', 'Estado', 'Alertas'],
            filas
        );
    };

    const cambiarCampania = (id) => {
        setCampaniaId(id);
        setCentro('');
        setLoading(true);
    };

    if (loading) {
        return (
            <div className="ai-content">
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            </div>
        );
    }

    const nombreCampania = campanias.find((c) => String(c.idcampania) === String(campaniaId))?.nombre;

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">{financiera ? 'Asistencia en vivo' : 'Equipo'}</h1>
                    <p className="ai-page-sub">
                        {financiera
                            ? `${equipo.length} persona${equipo.length === 1 ? '' : 's'} · ${nombreCampania ? primeraMayuscula(nombreCampania) : 'todas las campañas'}`
                            : `${equipo.length} persona${equipo.length === 1 ? '' : 's'} a tu cargo`}
                    </p>
                </div>
                <div className="ai-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {!financiera && <SelectorVistaEquipo />}
                    <span className="ai-live">En vivo · actualizado hace {haceSegundos}s</span>
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => cargar(true)}>
                        <RefreshCw size={14} strokeWidth={1.75} className={actualizando ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    {financiera && (
                        <Link to={`/recursos-humanos/asistencia-mensual${campaniaId ? `?campania=${campaniaId}` : ''}`} className="ai-btn ai-btn--secondary ai-btn--sm">
                            <BarChart3 size={14} strokeWidth={1.75} /> Histórico mensual
                        </Link>
                    )}
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportar} disabled={filtrado.length === 0}>
                        <Download size={14} strokeWidth={1.75} /> Exportar
                    </button>
                </div>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

            <div className="ai-kpis" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                <button type="button" className="ai-kpi" style={{ textAlign: 'left', cursor: 'pointer', border: tab === 'en_curso' ? '1px solid var(--primary)' : undefined }} onClick={() => setTab('en_curso')}>
                    <div className="ai-kpi-head"><span className="ai-kpi-label">En turno</span><span className="ai-kpi-icon"><UserCheck size={16} strokeWidth={1.75} /></span></div>
                    <div className="ai-kpi-value" style={{ color: 'var(--success)' }}>{kpis.enTurno}</div>
                    <div className="ai-kpi-foot">{kpis.presencial} presencial · {kpis.teletrabajo} teletrabajo</div>
                </button>
                <div className="ai-kpi">
                    <div className="ai-kpi-head"><span className="ai-kpi-label">En pausa</span><span className="ai-kpi-icon"><Coffee size={16} strokeWidth={1.75} /></span></div>
                    <div className="ai-kpi-value">{kpis.enPausaBano + kpis.enPausaBreak + kpis.enPausaAlmuerzo + kpis.enCapacitacion}</div>
                    <div className="ai-kpi-foot">{kpis.enPausaBano} baño · {kpis.enPausaBreak} break · {kpis.enPausaAlmuerzo} almuerzo · {kpis.enCapacitacion} capacitación</div>
                </div>
                <button type="button" className="ai-kpi" style={{ textAlign: 'left', cursor: 'pointer', border: tab === 'pendiente' ? '1px solid var(--primary)' : undefined }} onClick={() => setTab('pendiente')}>
                    <div className="ai-kpi-head"><span className="ai-kpi-label">Sin iniciar</span><span className="ai-kpi-icon"><Clock size={16} strokeWidth={1.75} /></span></div>
                    <div className="ai-kpi-value">{kpis.sinIniciar}</div>
                </button>
                <div className="ai-kpi" style={{ borderColor: kpis.tarde > 0 ? 'var(--warning)' : undefined }}>
                    <div className="ai-kpi-head"><span className="ai-kpi-label">Llegaron tarde</span><span className="ai-kpi-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}><AlertTriangle size={16} strokeWidth={1.75} /></span></div>
                    <div className="ai-kpi-value" style={{ color: kpis.tarde > 0 ? 'var(--warning)' : undefined }}>{kpis.tarde}</div>
                </div>
                <button type="button" className="ai-kpi" style={{ textAlign: 'left', cursor: 'pointer', borderColor: kpis.ausentes > 0 ? 'var(--danger)' : (tab === 'ausente' ? 'var(--primary)' : undefined) }} onClick={() => setTab('ausente')}>
                    <div className="ai-kpi-head"><span className="ai-kpi-label">Ausentes</span><span className="ai-kpi-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}><UserX size={16} strokeWidth={1.75} /></span></div>
                    <div className="ai-kpi-value" style={{ color: kpis.ausentes > 0 ? 'var(--danger)' : undefined }}>{kpis.ausentes}</div>
                </button>
            </div>

            <div className="ai-panel">
                <div className="ai-tabs">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className={`ai-tab ${tab === t.id ? 'is-active' : ''}`}
                            style={{ background: 'none', border: 0, cursor: 'pointer' }}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                            <span className="ai-count">{t.id === 'todos' ? delCentro.length : delCentro.filter((e) => e.estado === t.id).length}</span>
                        </button>
                    ))}
                </div>
                <div className="ai-panel-body ai-row" style={{ paddingBottom: 0, gap: 12, flexWrap: 'wrap' }}>
                    <div className="ai-input" style={{ maxWidth: 320, flex: 1 }}>
                        <Search size={16} strokeWidth={1.75} className="ai-ic" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cédula"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ border: 0, outline: 'none', flex: 1, background: 'transparent', color: 'var(--ink)', font: 'inherit' }}
                        />
                    </div>
                    {financiera && (
                        <select className="ai-input" style={{ maxWidth: 240 }} value={campaniaId} onChange={(e) => cambiarCampania(e.target.value)} aria-label="Campaña">
                            <option value="">Todas las campañas</option>
                            {campanias.map((c) => <option key={c.idcampania} value={c.idcampania}>{primeraMayuscula(c.nombre)} ({c.empleados})</option>)}
                        </select>
                    )}
                    {centros.length > 1 && (
                        <select className="ai-input" style={{ maxWidth: 260 }} value={centro} onChange={(e) => setCentro(e.target.value)} aria-label="Centro de costo">
                            <option value="">Todos los centros de costo ({equipo.length})</option>
                            {centros.map(([nombreCentro, total]) => <option key={nombreCentro} value={nombreCentro}>{nombreCentro} ({total})</option>)}
                        </select>
                    )}
                </div>

                {filtrado.length === 0 ? (
                    <div className="ai-empty">
                        <Users size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                        <p>{equipo.length === 0 ? (financiera ? 'No hay empleados activos.' : 'No tienes empleados a cargo.') : 'Nadie coincide con este filtro.'}</p>
                    </div>
                ) : (
                    <table className="ai-table ai-table--dense">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Centro de costo · turno</th>
                                <th>Ingreso</th>
                                <th>Tiempo hoy</th>
                                <th>Pausa</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrado.map((emp) => {
                                const badge = ESTADO_BADGE[emp.estado] || ESTADO_BADGE.pendiente;
                                return (
                                    <tr key={emp.users_company_id}>
                                        <td>
                                            <span className="ai-row" style={{ gap: 10 }}>
                                                <span className="ai-avatar">{iniciales(emp.nombre)}</span>
                                                <span>
                                                    <div style={{ fontWeight: 600 }}>{nombrePropio(emp.nombre)}</div>
                                                    <div className="ai-muted" style={{ fontSize: 12 }}>{primeraMayuscula(emp.cargo || '')} · CC {emp.cedula}</div>
                                                </span>
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.centro_costo || SIN_CENTRO}</div>
                                            <div className="ai-muted" style={{ fontSize: 12 }}>{textoTurno(emp.turno)}</div>
                                            {(financiera ? (emp.campania || emp.jefe_area) : emp.jefe_area) && (
                                                <div className="ai-muted" style={{ fontSize: 11 }}>
                                                    {primeraMayuscula(emp.campania || '')}{emp.campania && emp.jefe_area ? ' · ' : ''}{emp.jefe_area ? `Jefe: ${nombrePropio(emp.jefe_area)}` : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td title={emp.asislock ? textoConexion(emp.asislock) : 'Sin registros de AsisLock hoy'}>
                                            <BadgeIngreso modalidad={emp.asislock?.modalidad} />
                                            {emp.asislock?.primer_login && (
                                                <div className="ai-muted" style={{ fontSize: 12, marginTop: 2 }}>Login {formatearHora12(emp.asislock.primer_login)}</div>
                                            )}
                                        </td>
                                        <td className="ai-num">{formatearDuracion(emp.minutos_trabajados)}</td>
                                        <td>
                                            {emp.pausa_activa ? (
                                                <BadgePausa pausa={emp.pausa_activa} />
                                            ) : emp.desconexion_activa ? (
                                                <span className="ai-badge ai-badge--warning">
                                                    Desconectado de AsisLock · {emp.desconexion_activa.minutosTranscurridos} min
                                                </span>
                                            ) : <span className="ai-muted">—</span>}
                                        </td>
                                        <td>
                                            <span className="ai-row" style={{ gap: 6 }}>
                                                <span className={`ai-badge ${badge.clase}`}>
                                                    {badge.label}{esTarde(emp) && ` · +${emp.alertas.length > 1 ? emp.alertas.length + ' alertas' : '1 alerta'}`}
                                                </span>
                                            </span>
                                        </td>
                                        <td>
                                            {/* La trazabilidad abre hoy en vivo y se navega día a día hacia atrás (histórico). */}
                                            <Link
                                                to={financiera ? `/recursos-humanos/trazabilidad/${emp.users_company_id}?origen=en-vivo` : `/operaciones/equipo/${emp.users_company_id}/trazabilidad`}
                                                className="ai-icon-btn" title="Jornada en vivo e histórico por día" aria-label={`Ver trazabilidad de ${emp.nombre}`}
                                            >
                                                <History size={16} strokeWidth={1.75} />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default EquipoAsistencia;
