import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users, UserCheck, Coffee, Utensils, Clock, AlertTriangle, UserX, RefreshCw, Download, Search, History } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, iniciales, primeraMayuscula } from '../../utils/formatoRRHH';
import { formatearDuracion } from '../../utils/tiempoAsistencia';
import { descargarCsv } from '../../utils/csv';

const POLL_MS = 30000;

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

function esTarde(emp) {
    return emp.alertas?.includes('llegada_tarde');
}

const EquipoAsistencia = () => {
    const [equipo, setEquipo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actualizando, setActualizando] = useState(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
    const [haceSegundos, setHaceSegundos] = useState(0);
    const [tab, setTab] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const pausadoRef = useRef(false);

    const cargar = useCallback(async (silencioso = false) => {
        if (silencioso) setActualizando(true);
        try {
            const { data } = await asistenciaService.getEquipo();
            setEquipo(data);
            setUltimaActualizacion(Date.now());
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo cargar el equipo');
        } finally {
            setLoading(false);
            setActualizando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
        const onVisibility = () => { pausadoRef.current = document.visibilityState !== 'visible'; };
        document.addEventListener('visibilitychange', onVisibility);
        const id = setInterval(() => { if (!pausadoRef.current) cargar(true); }, POLL_MS);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
    }, [cargar]);

    useEffect(() => {
        const id = setInterval(() => {
            if (ultimaActualizacion) setHaceSegundos(Math.floor((Date.now() - ultimaActualizacion) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [ultimaActualizacion]);

    const kpis = useMemo(() => ({
        enTurno: equipo.filter((e) => e.estado === 'en_curso').length,
        enPausaBano: equipo.filter((e) => e.pausa_activa?.tipo === 'bano').length,
        enPausaAlmuerzo: equipo.filter((e) => e.pausa_activa?.tipo === 'almuerzo').length,
        sinIniciar: equipo.filter((e) => e.estado === 'pendiente').length,
        tarde: equipo.filter(esTarde).length,
        ausentes: equipo.filter((e) => e.estado === 'ausente').length
    }), [equipo]);

    const filtrado = useMemo(() => {
        let lista = equipo;
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
    }, [equipo, tab, busqueda]);

    const exportar = () => {
        const filas = filtrado.map((e) => [
            nombrePropio(e.nombre), e.cedula || '', primeraMayuscula(e.cargo || ''),
            formatearDuracion(e.minutos_trabajados), ESTADO_BADGE[e.estado]?.label || e.estado, e.alertas?.length || 0
        ]);
        descargarCsv('equipo_hoy.csv', ['Empleado', 'Cédula', 'Cargo', 'Tiempo hoy', 'Estado', 'Alertas'], filas);
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

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Equipo hoy</h1>
                    <p className="ai-page-sub">{equipo.length} persona{equipo.length === 1 ? '' : 's'} a tu cargo</p>
                </div>
                <div className="ai-row">
                    <span className="ai-live">En vivo · actualizado hace {haceSegundos}s</span>
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => cargar(true)}>
                        <RefreshCw size={14} strokeWidth={1.75} className={actualizando ? 'animate-spin' : ''} /> Actualizar
                    </button>
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
                </button>
                <div className="ai-kpi">
                    <div className="ai-kpi-head"><span className="ai-kpi-label">En pausa</span><span className="ai-kpi-icon"><Coffee size={16} strokeWidth={1.75} /></span></div>
                    <div className="ai-kpi-value">{kpis.enPausaBano + kpis.enPausaAlmuerzo}</div>
                    <div className="ai-kpi-foot">{kpis.enPausaBano} baño · {kpis.enPausaAlmuerzo} almuerzo</div>
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
                            <span className="ai-count">{t.id === 'todos' ? equipo.length : equipo.filter((e) => e.estado === t.id).length}</span>
                        </button>
                    ))}
                </div>
                <div className="ai-panel-body" style={{ paddingBottom: 0 }}>
                    <div className="ai-input" style={{ maxWidth: 320 }}>
                        <Search size={16} strokeWidth={1.75} className="ai-ic" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cédula"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ border: 0, outline: 'none', flex: 1, background: 'transparent', color: 'var(--ink)', font: 'inherit' }}
                        />
                    </div>
                </div>

                {filtrado.length === 0 ? (
                    <div className="ai-empty">
                        <Users size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                        <p>{equipo.length === 0 ? 'No tienes empleados a cargo.' : 'Nadie coincide con este filtro.'}</p>
                    </div>
                ) : (
                    <table className="ai-table ai-table--dense">
                        <thead>
                            <tr>
                                <th>Empleado</th>
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
                                        <td className="ai-num">{formatearDuracion(emp.minutos_trabajados)}</td>
                                        <td>
                                            {emp.pausa_activa ? (
                                                <span className="ai-badge ai-badge--info">
                                                    {emp.pausa_activa.tipo === 'bano' ? <Coffee size={12} strokeWidth={1.75} /> : <Utensils size={12} strokeWidth={1.75} />}
                                                    {emp.pausa_activa.tipo === 'bano' ? 'Baño' : 'Almuerzo'} · {emp.pausa_activa.minutosTranscurridos} min
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
                                            <Link to={`/operaciones/equipo/${emp.users_company_id}/trazabilidad`} className="ai-icon-btn" title="Ver trazabilidad" aria-label={`Ver trazabilidad de ${emp.nombre}`}>
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
