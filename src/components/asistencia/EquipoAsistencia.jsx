import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Users, UserCheck, Coffee, Clock, AlertTriangle, UserX, RefreshCw, Download, BarChart3, ClipboardList, Moon, LogOut,
    User, CalendarDays, Laptop, Activity, Timer
} from 'lucide-react';
import { asistenciaService, financieraService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { formatearDuracion, formatearHora12 } from '../../utils/tiempoAsistencia';
import { descargarCsv } from '../../utils/csv';
import { BadgeIngreso } from './IngresoAsislock';
import { MODALIDAD_INGRESO, textoConexion } from '../../utils/asislock';
import { escucharAsistencia, escucharCambiosEmpleados } from '../../utils/socketAsistencia';
import SelectorVistaEquipo from './SelectorVistaEquipo';
import { useBaseEquipo } from '../../utils/rutaEquipo';
import FiltroCampaniaEquipo from './FiltroCampaniaEquipo';
import { useAlcanceEquipo, paramsAlcance, sufijoAlcance, TODAS } from '../../hooks/useAlcanceEquipo';
import { claseDia, tardeExacto } from '../../utils/llegadaAsistencia';
import NovedadChip from './NovedadChip';
import { etiquetaNovedad, noAsistioPorNovedad } from '../../utils/novedadesAsistencia';
import { CeldaLogin, CeldaTiempoTotal, CeldasEstado } from './CeldasMonitor';
import { SelectoresCentroCargo } from './FiltroCentroCargo';
import { useFiltroCentroCargo, SIN_CENTRO } from '../../hooks/useFiltroCentroCargo';
import { estadoMonitor, colorMonitor, COLUMNAS_ESTADO, horaLoginDe, usaAsislock, columnasMonitor } from '../../utils/monitorAsistencia';
import { useTiemposEnVivo } from '../../hooks/useTiemposEnVivo';
import {
    EncabezadoVista, Mosaicos, Mosaico, BarraFiltros, CampoBusqueda, Leyenda,
    TablaVista, AvatarVista, siguienteOrden, Pastilla, CargandoVista, VistaVacia, claseEstado
} from '../ui';

// Tablero en vivo de la jornada de hoy, con el diseño de Equipo del coordinador (asistencia.md §70, plan de
// rediseño, Ola 1). El jefe ve su equipo ("Equipo hoy"); financiera, con `financiera`, ve a toda la empresa
// filtrando por campaña y centro de costo (§47). Los mosaicos son los siete estados del día y suman siempre el
// total (§78); "Llegaron tarde" va aparte porque no es un estado. La tabla es la del monitor del coordinador:
// login, estado fino (conectado, cada pausa, desconectado…), tiempo total y acumulado por estado.

const POLL_MS = 30000;
// Financiera ve a toda la empresa: los avisos de una ráfaga (cambio de turno) se agrupan en una recarga.
const ESPERA_AVISOS_FINANCIERA_MS = 3000;

// Estado del día con el que se cuenta y filtra a la persona: la novedad y el descanso reemplazan a 'pendiente'/'ausente'.
const estadoVista = (emp) => {
    if (noAsistioPorNovedad(emp)) return 'novedad';
    if (emp.turno?.es_descanso && emp.estado === 'pendiente') return 'descanso';
    return emp.estado;
};

// Los estados del día: cada persona está en uno solo, así que sus mosaicos suman siempre el total.
// "En pausa" incluye a quien se desconectó de AsisLock y no ha vuelto (el estado de su jornada es en_pausa).
const ESTADOS_DIA = [
    { id: 'en_curso', label: 'En turno', color: 'conectado', icono: UserCheck, titulo: 'Conectados y trabajando en este momento' },
    { id: 'en_pausa', label: 'En pausa', color: 'break', icono: Coffee, titulo: 'En baño, break, almuerzo o capacitación, o desconectados de AsisLock sin volver' },
    { id: 'pendiente', label: 'Sin iniciar', color: 'sin_iniciar', icono: Clock, titulo: 'Todavía no se han logueado hoy (en la tabla, "No ha llegado" si su turno ya empezó)' },
    { id: 'finalizada', label: 'Terminaron', color: 'finalizado', icono: LogOut, titulo: 'Ya marcaron salida o su jornada de hoy se cerró' },
    { id: 'ausente', label: 'Ausentes', color: 'no_llego', icono: UserX, titulo: 'Tenían turno y no se loguearon (se marca al cierre del día)' },
    { id: 'novedad', label: 'Con novedad', color: 'novedad', icono: ClipboardList, titulo: 'Incapacidades, vacaciones, licencias y suspensiones de RRHH que cubren hoy; no cuentan como ausentes' },
    { id: 'descanso', label: 'Descanso', color: 'descanso', icono: Moon, titulo: 'Hoy tienen día de descanso en su malla' }
];
const ESTADO_LABEL = { ...Object.fromEntries(ESTADOS_DIA.map((e) => [e.id, e.label])), pendiente: 'Sin iniciar', finalizada: 'Terminó', ausente: 'Ausente' };

// Leyenda de las pastillas de la tabla (estado fino de estadoMonitor).
const LEYENDA = [
    { id: 'conectado', label: 'Conectado' }, { id: 'break', label: 'Break' }, { id: 'bano', label: 'Baño' },
    { id: 'almuerzo', label: 'Almuerzo' }, { id: 'capacitacion', label: 'Capacitación' }, { id: 'desconectado', label: 'Desconectado' },
    { id: 'sin_iniciar', label: 'Sin iniciar' }, { id: 'no_llego', label: 'No ha llegado / ausente' }, { id: 'finalizado', label: 'Finalizado' },
    { id: 'novedad', label: 'Novedad RRHH' }, { id: 'descanso', label: 'Descanso' }
].map((l) => ({ ...l, color: colorMonitor(l.id) }));

// Si nadie de la tabla usa AsisLock (staff, §83), la leyenda no lleva las pausas y "Conectado" es "Presente".
const PAUSAS_LEYENDA = new Set(['break', 'bano', 'almuerzo', 'capacitacion', 'desconectado']);
const LEYENDA_STAFF = LEYENDA.filter((l) => !PAUSAS_LEYENDA.has(l.id)).map((l) => (l.id === 'conectado' ? { ...l, label: 'Presente' } : l));


// Detalle de cada mosaico (va en su title): lo que explica el número.
function detalleKpi(estado, k) {
    if (estado === 'en_curso') return `${k.presencial} presencial · ${k.teletrabajo} teletrabajo`;
    if (estado === 'en_pausa') {
        const partes = [['baño', k.bano], ['break', k.breaks], ['almuerzo', k.almuerzo], ['capacitación', k.capacitacion], ['desconectados', k.desconectados]]
            .filter(([, n]) => n > 0).map(([t, n]) => `${n} ${t}`);
        return partes.length ? partes.join(' · ') : 'Nadie en pausa';
    }
    return '';
}

const esTarde = (emp) => emp.alertas?.includes('llegada_tarde');

// Alertas del día (domain/asistencia/calcularJornada.js). La llegada tarde va junto a la hora de login.
const ALERTA_LABEL = {
    bano_excedido: 'Baño excedido',
    almuerzo_excedido: 'Almuerzo excedido',
    almuerzo_fuera_de_horario: 'Almuerzo fuera de horario',
    extra_sin_aprobar: 'Hora extra sin aprobar',
    sin_marcar_salida: 'Sin marcar salida'
};
const otrasAlertas = (emp) => (emp.alertas || []).filter((a) => a !== 'llegada_tarde');

// Cómo llegó hoy (para la descarga). Sin turno, o en su día de descanso, no se sabe si llegó tarde.
function textoLlegada(emp) {
    if (noAsistioPorNovedad(emp)) return `Novedad · ${etiquetaNovedad(emp.novedad.tipo)}`;
    if (estadoVista(emp) === 'descanso') return 'Día de descanso';
    const clase = claseDia(emp);
    if (!clase) return '';
    if (clase === 'pendiente') return 'Aún no llega';
    if (clase === 'ausente') return 'Ausente';
    const enTurno = clase.startsWith('curso_');
    if (!emp.turno || emp.turno.es_descanso) return enTurno ? 'Sin horario · en turno' : 'Sin horario · terminó';
    const llegada = emp.minutos_tarde > 0 ? `Tarde · ${tardeExacto(emp.segundos_tarde, emp.minutos_tarde)}` : 'Puntual';
    return enTurno ? `${llegada} · en turno` : `${llegada} · terminó`;
}

// "Outbound 7-4 · 07:00–16:00", "Descanso" o "Sin horario" (§46).
function textoTurno(turno) {
    if (!turno) return 'Sin horario hoy';
    if (turno.es_descanso) return 'Descanso';
    const horas = `${turno.hora_entrada.slice(0, 5)}–${turno.hora_salida.slice(0, 5)}`;
    return turno.plantilla ? `${turno.plantilla} · ${horas}` : horas;
}

const COLUMNAS = [
    { id: 'login', label: 'Hora Login', icono: Clock },
    { id: 'nombre', label: 'Empleado', icono: User },
    { id: 'turno', label: 'Centro de costo · turno', icono: CalendarDays },
    { id: 'ingreso', label: 'Ingreso', icono: Laptop, ordenable: false },
    { id: 'estado', label: 'Estado', icono: Activity, title: 'Ordena primero ausentes y llegadas tarde' },
    { id: 'tiempo', label: 'Tiempo total', icono: Timer },
    ...COLUMNAS_ESTADO
];

// Orden por "Estado": primero ausentes y llegadas tarde, luego por estado del día.
const ORDEN_ESTADO = { ausente: 0, en_pausa: 1, en_curso: 2, pendiente: 3, novedad: 4, descanso: 5, finalizada: 6 };
const prioridad = (emp) => ((estadoVista(emp) === 'ausente' || esTarde(emp)) ? 0 : ORDEN_ESTADO[estadoVista(emp)] ?? 9);

const EquipoAsistencia = ({ financiera = false }) => {
    const navigate = useNavigate();
    const baseEquipo = useBaseEquipo();
    const [equipo, setEquipo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actualizando, setActualizando] = useState(false);
    const [cargadoEn, setCargadoEn] = useState(null);
    const [haceSegundos, setHaceSegundos] = useState(0);
    const [filtro, setFiltro] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [campanias, setCampanias] = useState([]);
    const [campaniaId, setCampaniaId] = useState('');
    const [orden, setOrden] = useState({ col: 'estado', asc: true });
    const pausadoRef = useRef(false);
    const { totalDe, enEstadoDe, acumuladoDe } = useTiemposEnVivo(cargadoEn);
    // Director de Tecnología (§68): entra con su equipo y el filtro cambia a todas o a una campaña.
    const { verTodas, campanias: campaniasEquipo, alcance, cambiarAlcance } = useAlcanceEquipo();
    const otroAlcance = !financiera && Boolean(alcance);

    const cargar = useCallback(async (silencioso = false) => {
        if (silencioso) setActualizando(true);
        try {
            const { data } = financiera ? await financieraService.getEnVivo(campaniaId) : await asistenciaService.getEquipo(paramsAlcance(alcance));
            setEquipo(data);
            setCargadoEn(Date.now());
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo cargar la asistencia');
        } finally {
            setLoading(false);
            setActualizando(false);
        }
    }, [financiera, campaniaId, alcance]);

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
            if (cargadoEn) setHaceSegundos(Math.floor((Date.now() - cargadoEn) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [cargadoEn]);

    // Filtros de centro de costo (los turnos se definen por centro, §45) y de cargo (§85). Aplican a todo el
    // tablero: mosaicos, franja de llegada y tabla.
    const filtroCC = useFiltroCentroCargo(equipo);
    const delCentro = filtroCC.filtrados;

    const kpis = useMemo(() => {
        const porEstado = Object.fromEntries(ESTADOS_DIA.map((e) => [e.id, 0]));
        for (const e of delCentro) {
            const estado = estadoVista(e);
            if (estado in porEstado) porEstado[estado]++;
        }
        const enTurno = delCentro.filter((e) => estadoVista(e) === 'en_curso');
        const enPausa = delCentro.filter((e) => estadoVista(e) === 'en_pausa');
        const pausa = (tipo) => enPausa.filter((e) => e.pausa_activa?.tipo === tipo).length;
        // Cómo llegaron quienes ya entraron hoy (en turno + en pausa + terminaron). Sin turno, o con descanso,
        // no se sabe si fue tarde.
        const llegaron = delCentro.filter((e) => ['en_curso', 'en_pausa', 'finalizada'].includes(estadoVista(e)));
        const tarde = llegaron.filter(esTarde).length;
        const sinHorario = llegaron.filter((e) => !esTarde(e) && (!e.turno || e.turno.es_descanso)).length;
        return {
            porEstado,
            // Modalidad solo de quienes están en turno ahora.
            presencial: enTurno.filter((e) => e.asislock?.modalidad === 'presencial').length,
            teletrabajo: enTurno.filter((e) => e.asislock?.modalidad === 'teletrabajo').length,
            bano: pausa('bano'),
            breaks: pausa('break'),
            almuerzo: pausa('almuerzo'),
            capacitacion: pausa('capacitacion'),
            desconectados: enPausa.filter((e) => !e.pausa_activa && e.desconexion_activa).length,
            llegaron: llegaron.length,
            tarde,
            sinHorario,
            aTiempo: llegaron.length - tarde - sinHorario
        };
    }, [delCentro]);

    const visibles = useMemo(() => {
        let lista = delCentro;
        if (filtro === 'tarde') lista = lista.filter(esTarde);
        else if (filtro) lista = lista.filter((e) => estadoVista(e) === filtro);
        const q = busqueda.trim().toLowerCase();
        if (q) lista = lista.filter((e) => (e.nombre || '').toLowerCase().includes(q) || e.cedula?.includes(q));
        const filas = lista.map((emp) => ({ emp, est: estadoMonitor(emp) }));
        const valor = {
            login: (f) => horaLoginDe(f.emp) || '9',
            nombre: (f) => (f.emp.nombre || '').toUpperCase(),
            turno: (f) => `${f.emp.centro_costo || '~'} ${f.emp.turno && !f.emp.turno.es_descanso ? f.emp.turno.hora_entrada : '99'}`,
            estado: (f) => prioridad(f.emp),
            tiempo: (f) => totalDe(f) ?? -1,
            ...Object.fromEntries(COLUMNAS_ESTADO.map((c) => [c.id, (f) => acumuladoDe(f, c) ?? -1]))
        }[orden.col];
        return filas.sort((a, b) => {
            const va = valor(a);
            const vb = valor(b);
            const cmp = typeof va === 'number' ? va - vb : va.localeCompare(vb);
            return (orden.asc ? cmp : -cmp) || (a.emp.nombre || '').localeCompare(b.emp.nombre || '');
        });
    }, [delCentro, filtro, busqueda, orden, totalDe, acumuladoDe]);

    const exportar = () => {
        const filas = visibles.map(({ emp: e }) => [
            nombrePropio(e.nombre), e.cedula || '', primeraMayuscula(e.cargo || ''),
            primeraMayuscula(e.campania || ''), e.centro_costo || '', e.jefe_area ? nombrePropio(e.jefe_area) : '', textoTurno(e.turno),
            MODALIDAD_INGRESO[e.asislock?.modalidad]?.label || '',
            e.asislock?.primer_login ? formatearHora12(e.asislock.primer_login) : '',
            textoConexion(e.asislock) || '',
            textoLlegada(e), formatearDuracion(e.minutos_trabajados), (noAsistioPorNovedad(e) ? `Novedad: ${e.novedad.tipo}` : ESTADO_LABEL[estadoVista(e)] || e.estado),
            otrasAlertas(e).map((a) => ALERTA_LABEL[a] || a).join(', ')
        ]);
        descargarCsv(
            financiera ? 'asistencia_en_vivo.csv' : 'equipo_hoy.csv',
            ['Empleado', 'Cédula', 'Cargo', 'Campaña', 'Centro de costo', 'Jefe de área', 'Turno', 'Ingreso', 'Primer login AsisLock', 'AsisLock', 'Llegada', 'Tiempo hoy', 'Estado', 'Alertas'],
            filas
        );
    };

    const cambiarCampania = (id) => {
        setCampaniaId(id);
        filtroCC.limpiar();
        setLoading(true);
    };

    const cambiarAlcanceEquipo = (valor) => {
        cambiarAlcance(valor);
        filtroCC.limpiar();
        setLoading(true);
    };

    const rutaDetalle = (emp) => (financiera
        ? `/recursos-humanos/trazabilidad/${emp.users_company_id}?origen=en-vivo`
        : `${baseEquipo}/equipo/${emp.users_company_id}/trazabilidad${sufijoAlcance(alcance)}`);

    if (loading) {
        return <div className="ai-content"><CargandoVista /></div>;
    }

    const nombreCampania = campanias.find((c) => String(c.idcampania) === String(campaniaId))?.nombre;
    const nombreAlcance = alcance === TODAS
        ? 'todas las campañas'
        : primeraMayuscula(campaniasEquipo.find((c) => String(c.idcampania) === alcance)?.nombre || 'campaña');
    const personas = `${equipo.length} persona${equipo.length === 1 ? '' : 's'}`;
    const subtitulo = financiera
        ? `${personas} · ${nombreCampania ? primeraMayuscula(nombreCampania) : 'todas las campañas'}`
        : otroAlcance ? `${personas} · ${nombreAlcance} · solo consulta` : `${personas} a tu cargo`;
    const conVariasLineas = financiera || otroAlcance;

    return (
        <div className="ai-content">
            <EncabezadoVista
                icono={Users}
                titulo={financiera ? 'Asistencia en vivo' : 'Equipo'}
                subtitulo={`${subtitulo} · actualizado hace ${haceSegundos}s`}
                enVivo
            >
                {!financiera && <SelectorVistaEquipo />}
                {!financiera && verTodas && (
                    <FiltroCampaniaEquipo alcance={alcance} campanias={campaniasEquipo} onChange={cambiarAlcanceEquipo} />
                )}
                <button type="button" className="ai-monitor-btn" onClick={() => cargar(true)}>
                    <RefreshCw size={15} strokeWidth={2} className={actualizando ? 'animate-spin' : ''} /> Actualizar
                </button>
                {financiera && (
                    <Link to={`/recursos-humanos/asistencia-mensual${campaniaId ? `?campania=${campaniaId}` : ''}`} className="ai-monitor-btn" style={{ textDecoration: 'none' }}>
                        <BarChart3 size={15} strokeWidth={2} /> Histórico mensual
                    </Link>
                )}
                <button type="button" className="ai-monitor-btn" onClick={exportar} disabled={visibles.length === 0}>
                    <Download size={15} strokeWidth={2} /> Exportar
                </button>
            </EncabezadoVista>

            {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

            {/* Los siete estados del día suman el total (§78); "Llegaron tarde" es un desglose aparte. */}
            <Mosaicos>
                {ESTADOS_DIA.map((e) => {
                    const detalle = detalleKpi(e.id, kpis);
                    return (
                        <Mosaico
                            key={e.id}
                            color={e.color}
                            icono={e.icono}
                            valor={kpis.porEstado[e.id]}
                            label={e.label}
                            activo={filtro === e.id}
                            onClick={() => setFiltro((f) => (f === e.id ? null : e.id))}
                            title={`${e.titulo}${detalle ? ` · ${detalle}` : ''}${filtro === e.id ? ' · clic para quitar el filtro' : ''}`}
                        />
                    );
                })}
                <Mosaico
                    color="almuerzo"
                    icono={AlertTriangle}
                    valor={kpis.tarde}
                    label="Llegaron tarde"
                    activo={filtro === 'tarde'}
                    onClick={() => setFiltro((f) => (f === 'tarde' ? null : 'tarde'))}
                    title="No es un estado: de quienes llegaron hoy (en turno, en pausa y terminaron), los que llegaron tarde a su turno"
                />
            </Mosaicos>

            {/* Reparto del día: una barra con los siete estados y cómo llegaron quienes ya entraron. */}
            <BarraFiltros>
                <span className="ai-monitor-reparto-txt">
                    <b>{delCentro.length}</b> persona{delCentro.length === 1 ? '' : 's'} hoy · cada una en un solo estado
                </span>
                <div className="ai-monitor-reparto" role="img" aria-label={ESTADOS_DIA.map((e) => `${e.label}: ${kpis.porEstado[e.id]}`).join(', ')}>
                    {delCentro.length > 0 && ESTADOS_DIA.map((e) => kpis.porEstado[e.id] > 0 && (
                        <i key={e.id} className={claseEstado(e.color)} title={`${e.label}: ${kpis.porEstado[e.id]}`}
                            style={{ width: `${(kpis.porEstado[e.id] / delCentro.length) * 100}%` }} />
                    ))}
                </div>
                <span className="ai-monitor-reparto-txt" title="En turno + En pausa + Terminaron">
                    De los <b>{kpis.llegaron}</b> que llegaron: <Pastilla color="conectado">{kpis.aTiempo} a tiempo</Pastilla>{' '}
                    <Pastilla color="almuerzo">{kpis.tarde} tarde</Pastilla>
                    {kpis.sinHorario > 0 && <>{' '}<Pastilla color="sin_iniciar" title="Entraron sin turno asignado hoy: no se puede saber si llegaron tarde">{kpis.sinHorario} sin horario</Pastilla></>}
                </span>
            </BarraFiltros>

            <BarraFiltros>
                <CampoBusqueda value={busqueda} onChange={setBusqueda} />
                {financiera && (
                    <select className="ai-input ai-monitor-select" value={campaniaId} onChange={(e) => cambiarCampania(e.target.value)} aria-label="Campaña">
                        <option value="">Todas las campañas</option>
                        {campanias.map((c) => <option key={c.idcampania} value={c.idcampania}>{primeraMayuscula(c.nombre)} ({c.empleados})</option>)}
                    </select>
                )}
                <SelectoresCentroCargo filtro={filtroCC} />
                <Leyenda items={visibles.some((f) => usaAsislock(f.emp)) ? LEYENDA : LEYENDA_STAFF} />
                {filtro && (
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => setFiltro(null)}>
                        Ver todos ({delCentro.length})
                    </button>
                )}
            </BarraFiltros>

            {visibles.length === 0 ? (
                <VistaVacia icono={Users}>
                    {equipo.length === 0 ? (conVariasLineas ? 'No hay empleados activos.' : 'No tienes empleados a cargo.') : 'Nadie coincide con este filtro.'}
                </VistaVacia>
            ) : (
                <TablaVista columnas={columnasMonitor(COLUMNAS, visibles)} orden={orden} onOrdenar={(col) => setOrden(siguienteOrden(col))}>
                    {visibles.map((fila) => {
                        const { emp, est } = fila;
                        const lineas = conVariasLineas
                            ? [primeraMayuscula(emp.campania || ''), emp.jefe_area && `Jefe: ${nombrePropio(emp.jefe_area)}`]
                            : [emp.jefe_area && `Jefe: ${nombrePropio(emp.jefe_area)}`, emp.jefe_inmediato && `Coord.: ${nombrePropio(emp.jefe_inmediato)}`];
                        const jefatura = lineas.filter(Boolean).join(' · ');
                        return (
                            <tr key={emp.users_company_id} onClick={() => navigate(rutaDetalle(emp))}
                                title={`${nombrePropio(emp.nombre)} · CC ${emp.cedula} — ver el detalle de hoy`}>
                                <CeldaLogin emp={emp} />
                                <td className="ai-monitor-nombre">
                                    <span>
                                        <AvatarVista />
                                        <span>
                                            <Link to={rutaDetalle(emp)} onClick={(ev) => ev.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}
                                                aria-label={`Detalle de hoy de ${nombrePropio(emp.nombre)}`}>
                                                {(emp.nombre || '').toUpperCase()}
                                            </Link>
                                            <NovedadChip novedad={emp.novedad} />
                                            <span className="ai-monitor-sub">{primeraMayuscula(emp.cargo || '')} · CC {emp.cedula}</span>
                                        </span>
                                    </span>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{emp.centro_costo || SIN_CENTRO}</div>
                                    <span className="ai-monitor-sub" style={{ whiteSpace: 'nowrap' }}>{textoTurno(emp.turno)}</span>
                                    {jefatura && <span className="ai-monitor-sub" style={{ whiteSpace: 'nowrap' }}>{jefatura}</span>}
                                </td>
                                <td className="ai-monitor-centro" title={emp.asislock ? textoConexion(emp.asislock) : usaAsislock(emp) ? 'Sin registros de AsisLock hoy' : 'No usa AsisLock: marca por molinete o portal'}>
                                    <BadgeIngreso modalidad={emp.asislock?.modalidad} />
                                </td>
                                <td className="ai-monitor-centro">
                                    <Pastilla color={colorMonitor(est.clave)} punto>{est.label}</Pastilla>
                                    {otrasAlertas(emp).map((a) => (
                                        <span key={a} className="ai-monitor-sub" style={{ color: 'var(--warning)' }} title="Alerta del día">
                                            <AlertTriangle size={11} strokeWidth={2} style={{ verticalAlign: -1 }} /> {ALERTA_LABEL[a] || a}
                                        </span>
                                    ))}
                                </td>
                                <CeldaTiempoTotal total={totalDe(fila)} />
                                <CeldasEstado fila={fila} acumuladoDe={acumuladoDe} enEstadoDe={enEstadoDe} conColumnas={visibles.some((f) => usaAsislock(f.emp))} />
                            </tr>
                        );
                    })}
                </TablaVista>
            )}
        </div>
    );
};

export default EquipoAsistencia;
