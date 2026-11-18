import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, Users, RefreshCw, Search, ChevronUp, ChevronDown,
    User, Headphones, Wifi, Coffee, Bath, Utensils, GraduationCap, Unplug, Play, CheckCircle2, Clock,
    CalendarDays, Activity, Timer, ClipboardList
} from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { escucharAsistencia } from '../../utils/socketAsistencia';
import { datosPausa } from '../../utils/pausasAsistencia';
import SelectorVistaEquipo from './SelectorVistaEquipo';
import NovedadChip from './NovedadChip';
import { tardeExacto } from '../../utils/llegadaAsistencia';
import { etiquetaNovedad, noAsistioPorNovedad } from '../../utils/novedadesAsistencia';

// Monitor del equipo del coordinador (jefe inmediato), con el diseño de Downloads/Dashboard.png: mosaicos de
// colores con los totales, leyenda y una tabla con el horario, el estado en pastilla, el tiempo total desde el
// primer login y, por estado, el acumulado del día y cuántas veces entró. Los tiempos los calcula el servidor
// (`segundos_en_jornada`, `segundos_en_estado`, `segundos_por_estado`, `veces_por_estado`); aquí solo siguen
// contando segundo a segundo desde la última carga.
const POLL_MS = 30000;

const PAUSAS_CONOCIDAS = ['break', 'bano', 'almuerzo', 'capacitacion'];

// Estado del monitor de cada persona: conectado, la pausa en que está, desconectado de AsisLock,
// finalizado, sin iniciar o ausente.
function estadoMonitor(emp) {
    if (emp.estado === 'en_curso') return { clave: 'conectado', label: 'Conectado', corre: true };
    if (emp.estado === 'en_pausa' && emp.pausa_activa) {
        // Cada pausa de AsisLock con su clave (break, bano, almuerzo, capacitacion); una desconocida, 'pausa'.
        const tipo = emp.pausa_activa.tipo;
        return { clave: PAUSAS_CONOCIDAS.includes(tipo) ? tipo : 'pausa', label: datosPausa(tipo).etiqueta, corre: true };
    }
    if (emp.estado === 'en_pausa') return { clave: 'desconectado', label: 'Desconectado', corre: true };
    if (emp.estado === 'finalizada') return { clave: 'finalizado', label: 'Finalizado', corre: false };
    // Novedad de RRHH que cubre hoy (incapacidad, vacaciones, licencia…, §71): ni ausente ni "No ha llegado".
    if (noAsistioPorNovedad(emp)) return { clave: 'novedad', label: etiquetaNovedad(emp.novedad.tipo), corre: false };
    if (emp.estado === 'ausente') return { clave: 'ausente', label: 'Ausente', corre: false };
    // Sin entrada con su turno ya empezado (lo decide el servidor, §62); si no, aún no le toca, descansa o no tiene horario.
    if (emp.no_ha_llegado) return { clave: 'no_llego', label: 'No ha llegado', corre: false };
    return { clave: 'sin_iniciar', label: 'Sin iniciar', corre: false };
}

// Colores de cada clave de estadoMonitor (clases .ai-st--* de components.css).
const COLOR_DE = { pausa: 'break', ausente: 'no_llego' };
const claseColor = (clave) => `ai-st--${COLOR_DE[clave] || clave}`;

// Mosaicos de arriba, uno por estado de AsisLock (asistencia.md §34) y los del día. `estados` = claves de
// estadoMonitor que cuenta cada uno; un clic filtra la tabla. También son la leyenda.
const MOSAICOS = [
    { id: 'en_turno', label: 'En turno', leyenda: 'En turno', icono: User, estados: ['conectado', 'break', 'bano', 'almuerzo', 'capacitacion', 'pausa', 'desconectado'] },
    { id: 'conectado', label: 'Conectados', leyenda: 'Conectados', icono: Headphones, estados: ['conectado'] },
    { id: 'break', label: 'Break', leyenda: 'Break', icono: Coffee, estados: ['break', 'pausa'] },
    { id: 'bano', label: 'Baño', leyenda: 'Baño', icono: Bath, estados: ['bano'] },
    { id: 'almuerzo', label: 'Almuerzo', leyenda: 'Almuerzo', icono: Utensils, estados: ['almuerzo'] },
    { id: 'capacitacion', label: 'Capacitación', leyenda: 'Capacitación', icono: GraduationCap, estados: ['capacitacion'] },
    { id: 'desconectado', label: 'Desconectados', leyenda: 'Desconectados', icono: Unplug, estados: ['desconectado'] },
    { id: 'sin_iniciar', label: 'Sin iniciar', leyenda: 'Sin iniciar', icono: Play, estados: ['sin_iniciar'] },
    { id: 'finalizado', label: 'Finalizados', leyenda: 'Finalizados', icono: CheckCircle2, estados: ['finalizado'] },
    { id: 'no_llego', label: 'No han llegado', leyenda: 'No ha llegado', icono: Clock, estados: ['no_llego', 'ausente'] },
    { id: 'novedad', label: 'Con novedad', leyenda: 'Novedad RRHH', icono: ClipboardList, estados: ['novedad'] }
];

const ORDEN_ESTADO = { conectado: 0, capacitacion: 1, break: 2, pausa: 2, bano: 3, almuerzo: 4, desconectado: 5, no_llego: 6, ausente: 6, novedad: 7, sin_iniciar: 8, finalizado: 9 };

// "08:01:46" en hora de Bogotá.
function hora24(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
}

function hhmmss(totalSegundos) {
    const s = Math.max(0, Math.floor(totalSegundos));
    const dos = (n) => String(n).padStart(2, '0');
    return `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
}

// "08:00 – 17:00" del turno de hoy; descanso o sin horario asignado.
function textoHorario(turno) {
    if (!turno) return 'Sin horario';
    if (turno.es_descanso) return 'Descanso';
    const hm = (t) => (t || '').slice(0, 5);
    return `${hm(turno.hora_entrada)} – ${hm(turno.hora_salida)}`;
}

// El login de AsisLock si lo hay; si no, la entrada de la jornada (portal o molinete).
const horaLoginDe = (emp) => emp.asislock?.primer_login || emp.entrada_en || null;

// Columnas por estado. `claves` = las de estadoMonitor que corren en esa columna. Mientras la persona está en
// una pausa, su columna cuenta desde que entró esta vez (con el acumulado del día debajo); fuera de ella muestra
// el acumulado del día y cuántas veces entró. Tiempo disponible es siempre el acumulado conectado.
const COLUMNAS_ESTADO = [
    { id: 'conectado', label: 'Tiempo disponible', icono: Wifi, claves: ['conectado'], soloAcumulado: true },
    { id: 'break', label: 'Break', icono: Coffee, claves: ['break', 'pausa'] },
    { id: 'bano', label: 'Baño', icono: Bath, claves: ['bano'] },
    { id: 'almuerzo', label: 'Almuerzo', icono: Utensils, claves: ['almuerzo'] },
    { id: 'capacitacion', label: 'Capacitación', icono: GraduationCap, claves: ['capacitacion'] },
    { id: 'desconectado', label: 'Desconectado', icono: Unplug, claves: ['desconectado'] }
];

const COLUMNAS = [
    { id: 'login', label: 'Hora Login', icono: Clock },
    { id: 'nombre', label: 'Nombre', icono: User },
    { id: 'horario', label: 'Horario', icono: CalendarDays },
    { id: 'estado', label: 'Estado', icono: Activity },
    { id: 'tiempo', label: 'Tiempo total', icono: Timer },
    ...COLUMNAS_ESTADO
];

const MonitorEquipo = () => {
    const navigate = useNavigate();
    const [equipo, setEquipo] = useState([]);
    const [cargadoEn, setCargadoEn] = useState(null);
    const [ahora, setAhora] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [actualizando, setActualizando] = useState(false);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState({ col: 'nombre', asc: true });
    const pausadoRef = useRef(false);

    const cargar = useCallback(async (silencioso = false) => {
        if (silencioso) setActualizando(true);
        try {
            const { data } = await asistenciaService.getEquipo();
            setEquipo(data);
            setCargadoEn(Date.now());
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

    // Cada cambio de jornada del equipo llega por socket y recarga (asistencia.md §43, §57).
    useEffect(() => escucharAsistencia('asistencia:equipo', () => { cargar(true); }), [cargar]);

    // Reloj de las columnas de tiempo.
    useEffect(() => {
        const id = setInterval(() => setAhora(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const filas = useMemo(() => equipo.map((emp) => ({ emp, est: estadoMonitor(emp) })), [equipo]);

    const conteo = useMemo(() => {
        const c = {};
        for (const m of MOSAICOS) c[m.id] = filas.filter((f) => m.estados.includes(f.est.clave)).length;
        return c;
    }, [filas]);

    const transcurrido = cargadoEn ? (ahora - cargadoEn) / 1000 : 0;
    // Tiempo total desde el primer login: no se detiene en las pausas, sí en la salida.
    const totalDe = useCallback(
        ({ emp }) => (emp.segundos_en_jornada != null ? emp.segundos_en_jornada + (emp.jornada_corre ? transcurrido : 0) : null),
        [transcurrido]
    );
    // Cuánto lleva en el estado actual (desde que entró esta vez).
    const enEstadoDe = useCallback(
        ({ emp, est }) => (est.corre && emp.segundos_en_estado != null ? emp.segundos_en_estado + transcurrido : null),
        [transcurrido]
    );
    // Acumulado del día en un estado; el del estado actual sigue contando desde la última carga.
    const acumuladoDe = useCallback(({ emp, est }, col) => {
        const base = emp.segundos_por_estado?.[col.id];
        if (base == null) return null;
        return base + (est.corre && col.claves.includes(est.clave) ? transcurrido : 0);
    }, [transcurrido]);

    const visibles = useMemo(() => {
        let lista = filas;
        const mosaico = MOSAICOS.find((m) => m.id === filtro);
        if (mosaico) lista = lista.filter((f) => mosaico.estados.includes(f.est.clave));
        const q = busqueda.trim().toLowerCase();
        if (q) lista = lista.filter(({ emp }) => (emp.nombre || '').toLowerCase().includes(q) || emp.cedula?.includes(q));
        const valor = {
            login: (f) => horaLoginDe(f.emp) || '9',
            nombre: (f) => (f.emp.nombre || '').toUpperCase(),
            estado: (f) => ORDEN_ESTADO[f.est.clave] ?? 9,
            horario: (f) => (f.emp.turno && !f.emp.turno.es_descanso ? f.emp.turno.hora_entrada : '99'),
            tiempo: (f) => totalDe(f) ?? -1,
            ...Object.fromEntries(COLUMNAS_ESTADO.map((c) => [c.id, (f) => acumuladoDe(f, c) ?? -1]))
        }[orden.col];
        return [...lista].sort((a, b) => {
            const va = valor(a);
            const vb = valor(b);
            const cmp = typeof va === 'number' ? va - vb : va.localeCompare(vb);
            return (orden.asc ? cmp : -cmp) || (a.emp.nombre || '').localeCompare(b.emp.nombre || '');
        });
    }, [filas, filtro, busqueda, orden, totalDe, acumuladoDe]);

    const ordenarPor = (col) => setOrden((o) => ({ col, asc: o.col === col ? !o.asc : true }));

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
            <div className="ai-monitor-head">
                <div className="ai-monitor-titulo">
                    <Users size={52} strokeWidth={1.6} aria-hidden="true" />
                    <div>
                        <h1>Equipo</h1>
                        <p>
                            {equipo.length} persona{equipo.length === 1 ? '' : 's'} a tu cargo ·
                            <span className="ai-monitor-vivo" aria-hidden="true" /> en vivo
                        </p>
                    </div>
                </div>
                <div className="ai-monitor-acciones">
                    <SelectorVistaEquipo />
                    <button type="button" className="ai-monitor-btn" onClick={() => cargar(true)}>
                        <RefreshCw size={15} strokeWidth={2} className={actualizando ? 'animate-spin' : ''} /> Actualizar
                    </button>
                </div>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

            <div className="ai-monitor-mosaicos">
                {MOSAICOS.map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        className={`ai-monitor-mosaico ${claseColor(m.id)} ${filtro === m.id ? 'is-active' : ''}`}
                        onClick={() => setFiltro((f) => (f === m.id ? null : m.id))}
                        aria-pressed={filtro === m.id}
                        title={filtro === m.id ? 'Quitar el filtro' : `Ver solo: ${m.label.toLowerCase()}`}
                    >
                        <m.icono size={26} strokeWidth={2} className="ai-monitor-ic" aria-hidden="true" />
                        <span className="ai-monitor-num">{conteo[m.id]}</span>
                        <span className="ai-monitor-lbl">{m.label}</span>
                    </button>
                ))}
            </div>

            <div className="ai-monitor-barra">
                <div className="ai-input">
                    <Search size={16} strokeWidth={1.75} className="ai-ic" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o cédula..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={{ border: 0, outline: 'none', flex: 1, background: 'transparent', color: 'var(--ink)', font: 'inherit' }}
                    />
                </div>
                <div className="ai-monitor-leyenda" aria-label="Colores por estado">
                    {MOSAICOS.map((m) => (
                        <span key={m.id} className={claseColor(m.id)}>
                            <i className="ai-monitor-punto" aria-hidden="true" /> {m.leyenda}
                        </span>
                    ))}
                </div>
                {filtro && (
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => setFiltro(null)}>
                        Ver todos ({equipo.length})
                    </button>
                )}
            </div>

            {visibles.length === 0 ? (
                <div className="ai-panel">
                    <div className="ai-empty">
                        <Users size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                        <p>{equipo.length === 0 ? 'No tienes personas a cargo.' : 'Nadie coincide con este filtro.'}</p>
                    </div>
                </div>
            ) : (
                <div className="ai-monitor-tabla-wrap">
                    <table className="ai-monitor-tabla">
                        <thead>
                            <tr>
                                {COLUMNAS.map((c) => (
                                    <th key={c.id} aria-sort={orden.col === c.id ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                                        <button type="button" onClick={() => ordenarPor(c.id)}>
                                            <c.icono size={17} strokeWidth={1.9} aria-hidden="true" />
                                            {c.label}
                                            {orden.col === c.id && (orden.asc
                                                ? <ChevronUp size={14} strokeWidth={2.4} />
                                                : <ChevronDown size={14} strokeWidth={2.4} />)}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((fila) => {
                                const { emp, est } = fila;
                                const total = totalDe(fila);
                                return (
                                    <tr
                                        key={emp.users_company_id}
                                        onClick={() => navigate(`/asistencia/equipo/${emp.users_company_id}/trazabilidad`)}
                                        title={`${emp.nombre} · CC ${emp.cedula} — ver el detalle de hoy`}
                                    >
                                        <td className="ai-monitor-centro ai-monitor-login">
                                            {hora24(horaLoginDe(emp)) || '—'}
                                            {emp.minutos_tarde > 0 && (
                                                <span className="ai-monitor-tarde" title={`Llegó ${tardeExacto(emp.segundos_tarde, emp.minutos_tarde)} tarde a su turno de las ${(emp.turno?.hora_entrada || '').slice(0, 5)}`}>
                                                    Tarde +{tardeExacto(emp.segundos_tarde, emp.minutos_tarde)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="ai-monitor-nombre">
                                            <span>
                                                <i className="ai-monitor-avatar" aria-hidden="true"><User size={16} strokeWidth={2.4} /></i>
                                                {(emp.nombre || '').toUpperCase()}
                                                <NovedadChip novedad={emp.novedad} />
                                            </span>
                                        </td>
                                        <td className="ai-monitor-centro">{textoHorario(emp.turno)}</td>
                                        <td className="ai-monitor-centro">
                                            <span className={`ai-monitor-pill ${claseColor(est.clave)}`}>
                                                <i className="ai-monitor-punto" aria-hidden="true" /> {est.label}
                                            </span>
                                        </td>
                                        <td className="ai-monitor-centro">
                                            {total != null
                                                ? <span className="ai-monitor-tiempo"><Timer size={16} strokeWidth={2} aria-hidden="true" />{hhmmss(total)}</span>
                                                : '—'}
                                        </td>
                                        {COLUMNAS_ESTADO.map((c) => {
                                            const acum = acumuladoDe(fila, c);
                                            const activo = est.corre && c.claves.includes(est.clave);
                                            const veces = c.soloAcumulado ? 0 : (emp.veces_por_estado?.[c.id] || 0);
                                            const enCurso = activo && !c.soloAcumulado ? enEstadoDe(fila) : null;
                                            return (
                                                <td key={c.id} className="ai-monitor-centro">
                                                    {activo && acum != null ? (
                                                        <span className={`ai-monitor-pill ai-monitor-pill--acum ${claseColor(c.id)}`}
                                                            title={enCurso != null ? 'Desde que entró esta vez' : 'Acumulado del día'}>
                                                            {hhmmss(enCurso ?? acum)}
                                                        </span>
                                                    ) : (acum || veces ? hhmmss(acum ?? 0) : '—')}
                                                    {(enCurso != null || veces > 0) && (
                                                        <span className="ai-monitor-sub">
                                                            {enCurso != null && <>Acum. {hhmmss(acum)}</>}
                                                            {enCurso != null && veces > 0 && ' · '}
                                                            {veces > 0 && <>{veces} {veces === 1 ? 'vez' : 'veces'}</>}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MonitorEquipo;
