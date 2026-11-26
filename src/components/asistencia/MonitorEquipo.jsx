import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, RefreshCw,
    User, Headphones, Coffee, Bath, Utensils, GraduationCap, Unplug, Play, CheckCircle2, Clock,
    CalendarDays, Activity, Timer, ClipboardList, Moon
} from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { escucharAsistencia } from '../../utils/socketAsistencia';
import SelectorVistaEquipo from './SelectorVistaEquipo';
import NovedadChip from './NovedadChip';
import { CeldaLogin, CeldaTiempoTotal, CeldasEstado } from './CeldasMonitor';
import { estadoMonitor, colorMonitor, ORDEN_MONITOR, COLUMNAS_ESTADO, horaLoginDe } from '../../utils/monitorAsistencia';
import { useTiemposEnVivo } from '../../hooks/useTiemposEnVivo';
import {
    EncabezadoVista, Mosaicos, Mosaico, BarraFiltros, CampoBusqueda, Leyenda,
    TablaVista, AvatarVista, siguienteOrden, Pastilla, CargandoVista, VistaVacia
} from '../ui';

// Monitor del equipo del coordinador (jefe inmediato), con el diseño de Downloads/Dashboard.png: mosaicos de
// colores con los totales, leyenda y una tabla con el horario, el estado en pastilla, el tiempo total desde el
// primer login y, por estado, el acumulado del día y cuántas veces entró. La lógica de estados y tiempos es la
// de utils/monitorAsistencia.js, compartida con EquipoAsistencia (jefes y financiera).
const POLL_MS = 30000;

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
    { id: 'novedad', label: 'Con novedad', leyenda: 'Novedad RRHH', icono: ClipboardList, estados: ['novedad'] },
    { id: 'descanso', label: 'Descanso', leyenda: 'Descanso', icono: Moon, estados: ['descanso'] }
];

// "08:00 – 17:00" del turno de hoy; descanso o sin horario asignado.
function textoHorario(turno) {
    if (!turno) return 'Sin horario';
    if (turno.es_descanso) return 'Descanso';
    const hm = (t) => (t || '').slice(0, 5);
    return `${hm(turno.hora_entrada)} – ${hm(turno.hora_salida)}`;
}

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
    const [loading, setLoading] = useState(true);
    const [actualizando, setActualizando] = useState(false);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState({ col: 'nombre', asc: true });
    const pausadoRef = useRef(false);
    const { totalDe, enEstadoDe, acumuladoDe } = useTiemposEnVivo(cargadoEn);

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

    const filas = useMemo(() => equipo.map((emp) => ({ emp, est: estadoMonitor(emp) })), [equipo]);

    const conteo = useMemo(() => {
        const c = {};
        for (const m of MOSAICOS) c[m.id] = filas.filter((f) => m.estados.includes(f.est.clave)).length;
        return c;
    }, [filas]);

    const visibles = useMemo(() => {
        let lista = filas;
        const mosaico = MOSAICOS.find((m) => m.id === filtro);
        if (mosaico) lista = lista.filter((f) => mosaico.estados.includes(f.est.clave));
        const q = busqueda.trim().toLowerCase();
        if (q) lista = lista.filter(({ emp }) => (emp.nombre || '').toLowerCase().includes(q) || emp.cedula?.includes(q));
        const valor = {
            login: (f) => horaLoginDe(f.emp) || '9',
            nombre: (f) => (f.emp.nombre || '').toUpperCase(),
            estado: (f) => ORDEN_MONITOR[f.est.clave] ?? 9,
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

    if (loading) {
        return <div className="ai-content"><CargandoVista /></div>;
    }

    return (
        <div className="ai-content">
            <EncabezadoVista
                icono={Users}
                titulo="Equipo"
                subtitulo={`${equipo.length} persona${equipo.length === 1 ? '' : 's'} a tu cargo`}
                enVivo
            >
                <SelectorVistaEquipo />
                <button type="button" className="ai-monitor-btn" onClick={() => cargar(true)}>
                    <RefreshCw size={15} strokeWidth={2} className={actualizando ? 'animate-spin' : ''} /> Actualizar
                </button>
            </EncabezadoVista>

            {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

            <Mosaicos>
                {MOSAICOS.map((m) => (
                    <Mosaico
                        key={m.id}
                        color={colorMonitor(m.id)}
                        icono={m.icono}
                        valor={conteo[m.id]}
                        label={m.label}
                        activo={filtro === m.id}
                        onClick={() => setFiltro((f) => (f === m.id ? null : m.id))}
                    />
                ))}
            </Mosaicos>

            <BarraFiltros>
                <CampoBusqueda value={busqueda} onChange={setBusqueda} />
                <Leyenda items={MOSAICOS.map((m) => ({ id: m.id, color: colorMonitor(m.id), label: m.leyenda }))} />
                {filtro && (
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => setFiltro(null)}>
                        Ver todos ({equipo.length})
                    </button>
                )}
            </BarraFiltros>

            {visibles.length === 0 ? (
                <VistaVacia icono={Users}>
                    {equipo.length === 0 ? 'No tienes personas a cargo.' : 'Nadie coincide con este filtro.'}
                </VistaVacia>
            ) : (
                <TablaVista columnas={COLUMNAS} orden={orden} onOrdenar={(col) => setOrden(siguienteOrden(col))}>
                    {visibles.map((fila) => {
                        const { emp, est } = fila;
                        return (
                            <tr
                                key={emp.users_company_id}
                                onClick={() => navigate(`/asistencia/equipo/${emp.users_company_id}/trazabilidad`)}
                                title={`${emp.nombre} · CC ${emp.cedula} — ver el detalle de hoy`}
                            >
                                <CeldaLogin emp={emp} />
                                <td className="ai-monitor-nombre">
                                    <span>
                                        <AvatarVista />
                                        {(emp.nombre || '').toUpperCase()}
                                        <NovedadChip novedad={emp.novedad} />
                                    </span>
                                </td>
                                <td className="ai-monitor-centro">{textoHorario(emp.turno)}</td>
                                <td className="ai-monitor-centro">
                                    <Pastilla color={colorMonitor(est.clave)} punto>{est.label}</Pastilla>
                                </td>
                                <CeldaTiempoTotal total={totalDe(fila)} />
                                <CeldasEstado fila={fila} acumuladoDe={acumuladoDe} enEstadoDe={enEstadoDe} />
                            </tr>
                        );
                    })}
                </TablaVista>
            )}
        </div>
    );
};

export default MonitorEquipo;
