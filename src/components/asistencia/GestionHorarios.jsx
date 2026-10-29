import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, CalendarClock, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio } from '../../utils/formatoRRHH';

const DIAS_SEMANA = [
    { valor: 1, label: 'L' }, { valor: 2, label: 'M' }, { valor: 3, label: 'X' },
    { valor: 4, label: 'J' }, { valor: 5, label: 'V' }, { valor: 6, label: 'S' }, { valor: 7, label: 'D' }
];
const DIAS_LABEL_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const COLOR_TOKENS = ['hogar', 'tyt', 'tecnologia', 'operacion', 'movil'];

const PLANTILLA_VACIA = {
    nombre: '', hora_entrada: '08:00', hora_salida: '17:00',
    minutos_almuerzo: 60, hora_almuerzo_inicio: '12:30', tolerancia_entrada_min: 0, centro_costo_id: ''
};
const ASIGNACION_VACIA = { empleados: [], desde: '', hasta: '', dias_semana: [1, 2, 3, 4, 5], plantilla_id: '' };

// Un jefe tiene gente de varios centros de costo con horarios distintos: se asigna por centro.
// La clave agrupa también a quien no tiene centro de costo en su contrato.
const SIN_CENTRO = 'sin';
function claveCentro(id) { return id == null ? SIN_CENTRO : String(id); }

// Opciones de plantilla para un centro: primero las de ese centro, luego las generales y al final
// las de otros centros (se pueden usar igual, para los casos individuales).
function OpcionesPlantilla({ plantillas, centro }) {
    const opcion = (p, conCentro = false) => (
        <option key={p.idhorario_plantilla} value={p.idhorario_plantilla}>
            {p.nombre}{conCentro && p.centro_costo ? ` (${p.centro_costo})` : ''} · {hhmm(p.hora_entrada)}–{hhmm(p.hora_salida)}
        </option>
    );
    if (!centro || centro === SIN_CENTRO) return plantillas.map((p) => opcion(p, true));
    const delCentro = plantillas.filter((p) => claveCentro(p.centro_costo_id) === centro);
    const generales = plantillas.filter((p) => p.centro_costo_id == null);
    const otras = plantillas.filter((p) => p.centro_costo_id != null && claveCentro(p.centro_costo_id) !== centro);
    return (
        <>
            {delCentro.length > 0 && <optgroup label="De este centro de costo">{delCentro.map((p) => opcion(p))}</optgroup>}
            {generales.length > 0 && <optgroup label="Generales">{generales.map((p) => opcion(p))}</optgroup>}
            {otras.length > 0 && <optgroup label="De otros centros">{otras.map((p) => opcion(p, true))}</optgroup>}
        </>
    );
}

function colorDe(indice) {
    const key = COLOR_TOKENS[indice % COLOR_TOKENS.length];
    return { key, bg: `var(--cat-${key}-soft)`, ink: `var(--cat-${key})` };
}

function hhmm(t) { return t ? t.slice(0, 5) : ''; }

function lunesDe(fecha) {
    const d = new Date(fecha);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d;
}
function aIso(d) { return d.toISOString().slice(0, 10); }
function sumarDias(iso, n) {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return aIso(d);
}
function isoDow(iso) {
    const d = new Date(`${iso}T00:00:00Z`);
    return ((d.getUTCDay() + 6) % 7) + 1;
}

const GestionHorarios = () => {
    const [plantillas, setPlantillas] = useState([]);
    const [equipo, setEquipo] = useState([]);
    const [horariosSemana, setHorariosSemana] = useState([]);
    const [semanaInicio, setSemanaInicio] = useState(() => aIso(lunesDe(new Date())));
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [centroFiltro, setCentroFiltro] = useState('');

    const [modalPlantilla, setModalPlantilla] = useState(null); // null | 'nueva' | plantilla obj
    const [formPlantilla, setFormPlantilla] = useState(PLANTILLA_VACIA);
    const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);

    const [modalAsignar, setModalAsignar] = useState(false);
    const [formAsignacion, setFormAsignacion] = useState(ASIGNACION_VACIA);
    const [buscarEmpleado, setBuscarEmpleado] = useState('');
    const [centroAsignar, setCentroAsignar] = useState('');
    const [asignando, setAsignando] = useState(false);

    const [celda, setCelda] = useState(null); // { empleado, fecha, existente }
    const [celdaPlantillaId, setCeldaPlantillaId] = useState('');
    const [guardandoCelda, setGuardandoCelda] = useState(false);

    const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(semanaInicio, i)), [semanaInicio]);

    const cargarSemana = async (inicio) => {
        const { data } = await asistenciaService.getHorarios({ desde: inicio, hasta: sumarDias(inicio, 6) });
        setHorariosSemana(data);
    };

    const cargarTodo = async () => {
        setLoading(true);
        try {
            const [rPlantillas, rEquipo] = await Promise.all([
                asistenciaService.getPlantillas(),
                asistenciaService.getEquipo()
            ]);
            setPlantillas(rPlantillas.data);
            // /equipo trae todo el árbol del director (§51); horarios solo asigna a su gente directa.
            setEquipo(rEquipo.data.filter((e) => e.directo !== false));
            await cargarSemana(semanaInicio);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo cargar la información' });
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { cargarTodo(); }, []);
    useEffect(() => { if (!loading) cargarSemana(semanaInicio); }, [semanaInicio]); // eslint-disable-line react-hooks/exhaustive-deps

    const conteoPorPlantilla = useMemo(() => {
        const mapa = {};
        horariosSemana.forEach((h) => {
            if (!h.horario_plantilla_id) return;
            mapa[h.horario_plantilla_id] = mapa[h.horario_plantilla_id] || new Set();
            mapa[h.horario_plantilla_id].add(h.users_company_id);
        });
        return mapa;
    }, [horariosSemana]);

    const mapaCeldas = useMemo(() => {
        const mapa = {};
        horariosSemana.forEach((h) => { mapa[`${h.users_company_id}_${h.fecha.slice(0, 10)}`] = h; });
        return mapa;
    }, [horariosSemana]);

    // Centros de costo del equipo con su conteo, ordenados por nombre (sin centro al final).
    const centros = useMemo(() => {
        const mapa = new Map();
        equipo.forEach((e) => {
            const clave = claveCentro(e.centro_costo_id);
            const actual = mapa.get(clave) || { clave, nombre: e.centro_costo || 'Sin centro de costo', campania: e.campania, total: 0 };
            actual.total += 1;
            mapa.set(clave, actual);
        });
        return [...mapa.values()].sort((a, b) => (a.clave === SIN_CENTRO) - (b.clave === SIN_CENTRO) || a.nombre.localeCompare(b.nombre));
    }, [equipo]);
    const nombreCentro = (clave) => centros.find((c) => c.clave === clave)?.nombre || '';

    // Agrupa una lista del equipo por centro de costo, en el orden de `centros`.
    const agruparPorCentro = (lista) => centros
        .map((c) => ({ ...c, empleados: lista.filter((e) => claveCentro(e.centro_costo_id) === c.clave) }))
        .filter((g) => g.empleados.length > 0);

    const q = busqueda.trim().toLowerCase();
    const gruposSemana = agruparPorCentro(equipo.filter((e) => (!centroFiltro || claveCentro(e.centro_costo_id) === centroFiltro)
        && (!q || (e.nombre || '').toLowerCase().includes(q))));

    // Con un centro filtrado, el panel muestra las plantillas de ese centro y las generales.
    const plantillasVisibles = centroFiltro
        ? plantillas.filter((p) => p.centro_costo_id == null || claveCentro(p.centro_costo_id) === centroFiltro)
        : plantillas;

    // --- Plantillas ---
    const abrirNuevaPlantilla = () => {
        // Con un centro filtrado, la plantilla nueva nace para ese centro.
        setFormPlantilla({ ...PLANTILLA_VACIA, centro_costo_id: centroFiltro && centroFiltro !== SIN_CENTRO ? centroFiltro : '' });
        setModalPlantilla('nueva');
    };
    const abrirEditarPlantilla = (p) => {
        setFormPlantilla({
            nombre: p.nombre, hora_entrada: hhmm(p.hora_entrada), hora_salida: hhmm(p.hora_salida),
            minutos_almuerzo: p.minutos_almuerzo, hora_almuerzo_inicio: hhmm(p.hora_almuerzo_inicio),
            tolerancia_entrada_min: p.tolerancia_entrada_min,
            centro_costo_id: p.centro_costo_id != null ? String(p.centro_costo_id) : ''
        });
        setModalPlantilla(p);
    };

    const guardarPlantilla = async (e) => {
        e.preventDefault();
        setGuardandoPlantilla(true);
        setMensaje(null);
        const payload = {
            nombre: formPlantilla.nombre,
            hora_entrada: `${formPlantilla.hora_entrada}:00`,
            hora_salida: `${formPlantilla.hora_salida}:00`,
            hora_almuerzo_inicio: formPlantilla.hora_almuerzo_inicio ? `${formPlantilla.hora_almuerzo_inicio}:00` : null,
            minutos_almuerzo: Number(formPlantilla.minutos_almuerzo),
            tolerancia_entrada_min: Number(formPlantilla.tolerancia_entrada_min),
            centro_costo_id: formPlantilla.centro_costo_id ? Number(formPlantilla.centro_costo_id) : null
        };
        try {
            if (modalPlantilla === 'nueva') {
                await asistenciaService.crearPlantilla(payload);
                setMensaje({ tipo: 'ok', texto: 'Plantilla creada.' });
            } else {
                await asistenciaService.actualizarPlantilla(modalPlantilla.idhorario_plantilla, payload);
                setMensaje({ tipo: 'ok', texto: 'Plantilla actualizada.' });
            }
            setModalPlantilla(null);
            cargarTodo();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo guardar la plantilla' });
        } finally {
            setGuardandoPlantilla(false);
        }
    };

    const eliminarPlantilla = async (id) => {
        try {
            await asistenciaService.eliminarPlantilla(id);
            cargarTodo();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo eliminar la plantilla' });
        }
    };

    // --- Asignación masiva ---
    const toggleEmpleado = (id) => {
        setFormAsignacion((prev) => ({
            ...prev,
            empleados: prev.empleados.includes(id) ? prev.empleados.filter((e) => e !== id) : [...prev.empleados, id]
        }));
    };
    // "Seleccionar todos" actúa sobre lo que muestra el buscador: sin búsqueda, todo el equipo.
    const toggleTodos = (visibles) => {
        const ids = visibles.map((emp) => emp.users_company_id);
        setFormAsignacion((prev) => {
            const todosMarcados = ids.length > 0 && ids.every((id) => prev.empleados.includes(id));
            return {
                ...prev,
                empleados: todosMarcados
                    ? prev.empleados.filter((id) => !ids.includes(id))
                    : [...new Set([...prev.empleados, ...ids])]
            };
        });
    };
    const toggleDia = (dia) => {
        setFormAsignacion((prev) => ({
            ...prev,
            dias_semana: prev.dias_semana.includes(dia) ? prev.dias_semana.filter((d) => d !== dia) : [...prev.dias_semana, dia]
        }));
    };

    const textoBusqueda = buscarEmpleado.trim().toLowerCase();
    const empleadosVisibles = equipo.filter((e) => (!centroAsignar || claveCentro(e.centro_costo_id) === centroAsignar)
        && (!textoBusqueda || (e.nombre || '').toLowerCase().includes(textoBusqueda)));
    const gruposAsignar = agruparPorCentro(empleadosVisibles);

    const abrirAsignar = () => {
        setFormAsignacion(ASIGNACION_VACIA);
        setBuscarEmpleado('');
        setCentroAsignar(centroFiltro);
        setModalAsignar(true);
    };
    // Al cambiar de centro se limpia la selección: se asigna un centro, con su plantilla, a la vez.
    const cambiarCentroAsignar = (clave) => {
        setCentroAsignar(clave);
        setFormAsignacion((prev) => ({ ...prev, empleados: [], plantilla_id: '' }));
    };

    const asignar = async (e) => {
        e.preventDefault();
        setAsignando(true);
        setMensaje(null);
        try {
            const { data } = await asistenciaService.asignarHorarios({
                empleados: formAsignacion.empleados,
                desde: formAsignacion.desde,
                hasta: formAsignacion.hasta,
                dias_semana: formAsignacion.dias_semana,
                plantilla_id: Number(formAsignacion.plantilla_id)
            });
            setMensaje({ tipo: 'ok', texto: `${data.horarios_creados ?? ''} horario(s) asignado(s).` });
            setFormAsignacion(ASIGNACION_VACIA);
            setModalAsignar(false);
            cargarSemana(semanaInicio);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo asignar el horario' });
        } finally {
            setAsignando(false);
        }
    };

    // --- Celda individual ---
    const abrirCelda = (empleado, fecha) => {
        const existente = mapaCeldas[`${empleado.users_company_id}_${fecha}`] || null;
        setCelda({ empleado, fecha, existente });
        setCeldaPlantillaId(existente?.horario_plantilla_id ? String(existente.horario_plantilla_id) : '');
    };

    const guardarCelda = async () => {
        if (!celda || !celdaPlantillaId) return;
        setGuardandoCelda(true);
        try {
            await asistenciaService.asignarHorarios({
                empleados: [celda.empleado.users_company_id],
                desde: celda.fecha,
                hasta: celda.fecha,
                dias_semana: [isoDow(celda.fecha)],
                plantilla_id: Number(celdaPlantillaId)
            });
            setCelda(null);
            cargarSemana(semanaInicio);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo asignar el turno' });
        } finally {
            setGuardandoCelda(false);
        }
    };

    const marcarDescanso = async () => {
        if (!celda?.existente) return;
        setGuardandoCelda(true);
        try {
            await asistenciaService.actualizarHorario(celda.existente.idhorario_asignado, { es_descanso: true });
            setCelda(null);
            cargarSemana(semanaInicio);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo marcar el descanso' });
        } finally {
            setGuardandoCelda(false);
        }
    };

    const eliminarCelda = async () => {
        if (!celda?.existente) return;
        setGuardandoCelda(true);
        try {
            await asistenciaService.eliminarHorario(celda.existente.idhorario_asignado);
            setCelda(null);
            cargarSemana(semanaInicio);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo eliminar el turno' });
        } finally {
            setGuardandoCelda(false);
        }
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
                    <h1 className="ai-page-title">Horarios del equipo</h1>
                    <p className="ai-page-sub">Plantillas de turno y asignación semanal</p>
                </div>
                <div className="ai-row">
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={abrirNuevaPlantilla}>
                        <Plus size={16} strokeWidth={1.75} /> Nueva plantilla
                    </button>
                    <button type="button" className="ai-btn ai-btn--primary" onClick={abrirAsignar}>
                        <CalendarClock size={16} strokeWidth={1.75} /> Asignar horario
                    </button>
                </div>
            </div>

            {mensaje && (
                <p style={{ color: mensaje.tipo === 'ok' ? 'var(--success)' : 'var(--danger)', fontSize: 13 }}>{mensaje.texto}</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
                <div className="ai-panel">
                    <div className="ai-panel-head">
                        <h3 className="ai-panel-title">Plantillas de turno</h3>
                        {centroFiltro && <span className="ai-muted" style={{ fontSize: 12 }}>{nombreCentro(centroFiltro)} y generales</span>}
                    </div>
                    <div className="ai-panel-body">
                        {plantillasVisibles.map((p) => {
                            const c = colorDe(plantillas.indexOf(p));
                            const entradaMin = Number(hhmm(p.hora_entrada).split(':')[0]) * 60 + Number(hhmm(p.hora_entrada).split(':')[1]);
                            const salidaMin = Number(hhmm(p.hora_salida).split(':')[0]) * 60 + Number(hhmm(p.hora_salida).split(':')[1]);
                            const cruza = salidaMin <= entradaMin;
                            const anchoMin = cruza ? 1440 - entradaMin : salidaMin - entradaMin;
                            const personas = conteoPorPlantilla[p.idhorario_plantilla]?.size || 0;
                            return (
                                <div key={p.idhorario_plantilla} className="ai-shift">
                                    <div className="ai-shift-row">
                                        <span className="ai-swatch" style={{ background: c.ink }} />
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre}</span>
                                        <span className="ai-row ai-row-actions" style={{ gap: 2 }}>
                                            <button type="button" className="ai-icon-btn" onClick={() => abrirEditarPlantilla(p)} aria-label="Editar"><Pencil size={14} strokeWidth={1.75} /></button>
                                            <button type="button" className="ai-icon-btn ai-icon-btn--danger" onClick={() => eliminarPlantilla(p.idhorario_plantilla)} aria-label="Eliminar"><Trash2 size={14} strokeWidth={1.75} /></button>
                                        </span>
                                    </div>
                                    <span className="ai-badge ai-badge--neutral" style={{ alignSelf: 'flex-start', height: 20, fontSize: 11 }}>{p.centro_costo || 'General'}</span>
                                    <span className="ai-muted" style={{ fontSize: 13 }}>{hhmm(p.hora_entrada)} – {hhmm(p.hora_salida)}{cruza ? ' (cruza medianoche)' : ''}</span>
                                    <div className="ai-shift-bar">
                                        <span style={{ left: `${(entradaMin / 1440) * 100}%`, width: `${(anchoMin / 1440) * 100}%`, background: c.ink }} />
                                    </div>
                                    <span className="ai-muted" style={{ fontSize: 12 }}>
                                        Almuerzo {p.minutos_almuerzo} min{p.hora_almuerzo_inicio ? ` a las ${hhmm(p.hora_almuerzo_inicio)}` : ''} · Tolerancia {p.tolerancia_entrada_min} min · {personas} persona{personas === 1 ? '' : 's'} esta semana
                                    </span>
                                </div>
                            );
                        })}
                        {plantillasVisibles.length === 0 && (
                            <div className="ai-empty">
                                <CalendarClock size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                                <p>{centroFiltro ? 'Sin plantillas para este centro de costo.' : 'Sin plantillas todavía.'}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="ai-panel">
                    <div className="ai-panel-head" style={{ flexWrap: 'wrap', gap: 12 }}>
                        <div className="ai-datenav">
                            <button type="button" className="ai-icon-btn" onClick={() => setSemanaInicio((s) => sumarDias(s, -7))} aria-label="Semana anterior"><ChevronLeft size={16} strokeWidth={1.75} /></button>
                            <b>{DIAS_LABEL_CORTO[0]} {dias[0].slice(8, 10)} – {DIAS_LABEL_CORTO[6]} {dias[6].slice(8, 10)} {dias[6].slice(0, 4)}</b>
                            <button type="button" className="ai-icon-btn" onClick={() => setSemanaInicio((s) => sumarDias(s, 7))} aria-label="Semana siguiente"><ChevronRight size={16} strokeWidth={1.75} /></button>
                        </div>
                        <select className="ai-input" style={{ maxWidth: 260, height: 34 }} value={centroFiltro} onChange={(e) => setCentroFiltro(e.target.value)} aria-label="Centro de costo">
                            <option value="">Todos los centros de costo ({equipo.length})</option>
                            {centros.map((c) => <option key={c.clave} value={c.clave}>{c.nombre} ({c.total})</option>)}
                        </select>
                        <div className="ai-input" style={{ maxWidth: 220, height: 34 }}>
                            <Search size={14} strokeWidth={1.75} className="ai-ic" />
                            <input
                                type="text" placeholder="Buscar empleado" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                                style={{ border: 0, outline: 'none', flex: 1, background: 'transparent', color: 'var(--ink)', font: 'inherit' }}
                            />
                        </div>
                        <div className="ai-legend">
                            {plantillas.slice(0, 5).map((p, i) => {
                                const c = colorDe(i);
                                return <span key={p.idhorario_plantilla}><i style={{ background: c.ink }} /> {p.nombre}</span>;
                            })}
                        </div>
                    </div>
                    <div className="ai-panel-body" style={{ overflowX: 'auto', paddingTop: 0 }}>
                        <table className="ai-week">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    {dias.map((fecha, i) => (
                                        <th key={fecha}>{DIAS_LABEL_CORTO[i]}<small>{fecha.slice(8, 10)}/{fecha.slice(5, 7)}</small></th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {gruposSemana.map((grupo) => (
                                    <React.Fragment key={grupo.clave}>
                                    <tr>
                                        <td colSpan={8} style={{ background: 'var(--primary-soft)', color: 'var(--primary-soft-ink)', fontWeight: 700, fontSize: 12 }}>
                                            {grupo.nombre}{grupo.campania ? ` · ${grupo.campania}` : ''} · {grupo.empleados.length} persona{grupo.empleados.length === 1 ? '' : 's'}
                                        </td>
                                    </tr>
                                    {grupo.empleados.map((emp) => (
                                    <tr key={emp.users_company_id}>
                                        <td style={{ fontWeight: 600 }}>{nombrePropio(emp.nombre)}</td>
                                        {dias.map((fecha) => {
                                            const h = mapaCeldas[`${emp.users_company_id}_${fecha}`];
                                            const esHoy = fecha === aIso(new Date());
                                            if (!h) {
                                                return (
                                                    <td key={fecha} className={esHoy ? 'is-today' : ''}>
                                                        <button type="button" className="ai-sh ai-sh--off" style={{ cursor: 'pointer', width: '100%' }} onClick={() => abrirCelda(emp, fecha)}>—</button>
                                                    </td>
                                                );
                                            }
                                            if (h.es_descanso) {
                                                return (
                                                    <td key={fecha} className={esHoy ? 'is-today' : ''}>
                                                        <button type="button" className="ai-sh ai-sh--off" style={{ cursor: 'pointer', width: '100%' }} onClick={() => abrirCelda(emp, fecha)}>Descanso</button>
                                                    </td>
                                                );
                                            }
                                            const idx = plantillas.findIndex((p) => p.idhorario_plantilla === h.horario_plantilla_id);
                                            const c = colorDe(idx >= 0 ? idx : 0);
                                            const nombrePlantilla = plantillas.find((p) => p.idhorario_plantilla === h.horario_plantilla_id)?.nombre || 'Turno';
                                            return (
                                                <td key={fecha} className={esHoy ? 'is-today' : ''}>
                                                    <button
                                                        type="button" className="ai-sh" style={{ cursor: 'pointer', width: '100%', background: c.bg, color: c.ink, border: 0 }}
                                                        onClick={() => abrirCelda(emp, fecha)}
                                                    >
                                                        {nombrePlantilla}
                                                        <small>{hhmm(h.hora_entrada)}–{hhmm(h.hora_salida)}</small>
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    ))}
                                    </React.Fragment>
                                ))}
                                {gruposSemana.length === 0 && (
                                    <tr><td colSpan={8} className="ai-muted" style={{ textAlign: 'center', padding: 20 }}>Nadie coincide con la búsqueda.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {modalPlantilla && (
                <div className="ai-overlay" onClick={() => setModalPlantilla(null)}>
                    <div className="ai-modal ai-modal--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="ai-modal-head">
                            <span className="ai-modal-icon"><CalendarClock size={20} strokeWidth={1.75} /></span>
                            <div><h3 className="ai-modal-title">{modalPlantilla === 'nueva' ? 'Nueva plantilla' : 'Editar plantilla'}</h3></div>
                            <button type="button" className="ai-icon-btn" onClick={() => setModalPlantilla(null)} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                        </div>
                        <form onSubmit={guardarPlantilla}>
                            <div className="ai-modal-body ai-form-grid">
                                <div className="ai-field span-2">
                                    <label className="ai-label">Nombre <em>*</em></label>
                                    <input required className="ai-input" value={formPlantilla.nombre} onChange={(e) => setFormPlantilla({ ...formPlantilla, nombre: e.target.value })} />
                                </div>
                                <div className="ai-field span-2">
                                    <label className="ai-label">Centro de costo</label>
                                    <select className="ai-input" value={formPlantilla.centro_costo_id} onChange={(e) => setFormPlantilla({ ...formPlantilla, centro_costo_id: e.target.value })}>
                                        <option value="">General (cualquier centro de costo)</option>
                                        {centros.filter((c) => c.clave !== SIN_CENTRO).map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
                                        {/* Un centro que ya no está en el equipo sigue visible al editar. */}
                                        {modalPlantilla !== 'nueva' && modalPlantilla.centro_costo_id != null && !centros.some((c) => c.clave === String(modalPlantilla.centro_costo_id)) && (
                                            <option value={String(modalPlantilla.centro_costo_id)}>{modalPlantilla.centro_costo}</option>
                                        )}
                                    </select>
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Entrada <em>*</em></label>
                                    <input type="time" required className="ai-input" value={formPlantilla.hora_entrada} onChange={(e) => setFormPlantilla({ ...formPlantilla, hora_entrada: e.target.value })} />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Salida <em>*</em></label>
                                    <input type="time" required className="ai-input" value={formPlantilla.hora_salida} onChange={(e) => setFormPlantilla({ ...formPlantilla, hora_salida: e.target.value })} />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Almuerzo (min)</label>
                                    <input type="number" min="0" className="ai-input" value={formPlantilla.minutos_almuerzo} onChange={(e) => setFormPlantilla({ ...formPlantilla, minutos_almuerzo: e.target.value })} />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Hora almuerzo</label>
                                    <input type="time" className="ai-input" value={formPlantilla.hora_almuerzo_inicio} onChange={(e) => setFormPlantilla({ ...formPlantilla, hora_almuerzo_inicio: e.target.value })} />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Tolerancia (min)</label>
                                    <input type="number" min="0" className="ai-input" value={formPlantilla.tolerancia_entrada_min} onChange={(e) => setFormPlantilla({ ...formPlantilla, tolerancia_entrada_min: e.target.value })} />
                                </div>
                            </div>
                            <div className="ai-modal-foot">
                                <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setModalPlantilla(null)}>Cancelar</button>
                                <button type="submit" className="ai-btn ai-btn--primary" disabled={guardandoPlantilla}>{guardandoPlantilla ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalAsignar && (
                <div className="ai-overlay" onClick={() => setModalAsignar(false)}>
                    <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ai-modal-head">
                            <span className="ai-modal-icon"><CalendarClock size={20} strokeWidth={1.75} /></span>
                            <div><h3 className="ai-modal-title">Asignar horario</h3><p className="ai-modal-sub">Sobrescribe turnos existentes en ese rango.</p></div>
                            <button type="button" className="ai-icon-btn" onClick={() => setModalAsignar(false)} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                        </div>
                        <form onSubmit={asignar}>
                            <div className="ai-modal-body ai-stack">
                                <div className="ai-field">
                                    <label className="ai-label">Centro de costo</label>
                                    <select className="ai-input" value={centroAsignar} onChange={(e) => cambiarCentroAsignar(e.target.value)}>
                                        <option value="">Todos los centros de costo ({equipo.length})</option>
                                        {centros.map((c) => <option key={c.clave} value={c.clave}>{c.nombre} ({c.total})</option>)}
                                    </select>
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Plantilla <em>*</em></label>
                                    <select required className="ai-input" value={formAsignacion.plantilla_id} onChange={(e) => setFormAsignacion({ ...formAsignacion, plantilla_id: e.target.value })}>
                                        <option value="">Selecciona una plantilla</option>
                                        <OpcionesPlantilla plantillas={plantillas} centro={centroAsignar} />
                                    </select>
                                </div>
                                <div className="ai-form-grid">
                                    <div className="ai-field">
                                        <label className="ai-label">Desde <em>*</em></label>
                                        <input type="date" required className="ai-input" value={formAsignacion.desde} onChange={(e) => setFormAsignacion({ ...formAsignacion, desde: e.target.value })} />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Hasta <em>*</em></label>
                                        <input type="date" required className="ai-input" value={formAsignacion.hasta} min={formAsignacion.desde} onChange={(e) => setFormAsignacion({ ...formAsignacion, hasta: e.target.value })} />
                                    </div>
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Días de la semana</label>
                                    <div className="ai-days">
                                        {DIAS_SEMANA.map((d) => (
                                            <span key={d.valor} className={formAsignacion.dias_semana.includes(d.valor) ? 'is-on' : ''} style={{ cursor: 'pointer' }} onClick={() => toggleDia(d.valor)}>{d.label}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Empleados <em>*</em> ({formAsignacion.empleados.length} seleccionados)</label>
                                    <input className="ai-input" placeholder="Buscar..." value={buscarEmpleado} onChange={(e) => setBuscarEmpleado(e.target.value)} style={{ marginBottom: 6 }} />
                                    {(() => {
                                        const visibles = empleadosVisibles;
                                        const marcados = visibles.filter((emp) => formAsignacion.empleados.includes(emp.users_company_id)).length;
                                        if (visibles.length === 0) return null;
                                        return (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 6, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={marcados === visibles.length}
                                                    ref={(el) => { if (el) el.indeterminate = marcados > 0 && marcados < visibles.length; }}
                                                    onChange={() => toggleTodos(visibles)}
                                                />
                                                {buscarEmpleado.trim()
                                                    ? `Seleccionar los ${visibles.length} de la búsqueda`
                                                    : centroAsignar ? `Seleccionar todo ${nombreCentro(centroAsignar)} (${visibles.length})` : `Seleccionar todos (${visibles.length})`}
                                            </label>
                                        );
                                    })()}
                                    <div className="ai-checklist">
                                        {gruposAsignar.map((grupo) => {
                                            const marcadosGrupo = grupo.empleados.filter((emp) => formAsignacion.empleados.includes(emp.users_company_id)).length;
                                            const variosCentros = gruposAsignar.length > 1;
                                            return (
                                                <React.Fragment key={grupo.clave}>
                                                    {/* Con varios centros a la vista, cada uno tiene su "seleccionar todo". */}
                                                    {variosCentros && (
                                                        <label style={{ fontWeight: 700, fontSize: 12, marginTop: 6 }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={marcadosGrupo === grupo.empleados.length}
                                                                ref={(el) => { if (el) el.indeterminate = marcadosGrupo > 0 && marcadosGrupo < grupo.empleados.length; }}
                                                                onChange={() => toggleTodos(grupo.empleados)}
                                                            />
                                                            {grupo.nombre} ({grupo.empleados.length})
                                                        </label>
                                                    )}
                                                    {grupo.empleados.map((emp) => (
                                                        <label key={emp.users_company_id} style={variosCentros ? { paddingLeft: 20 } : undefined}>
                                                            <input type="checkbox" checked={formAsignacion.empleados.includes(emp.users_company_id)} onChange={() => toggleEmpleado(emp.users_company_id)} />
                                                            {nombrePropio(emp.nombre)}
                                                        </label>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="ai-modal-foot">
                                <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setModalAsignar(false)}>Cancelar</button>
                                <button type="submit" className="ai-btn ai-btn--primary" disabled={asignando || formAsignacion.empleados.length === 0}>
                                    {asignando ? 'Asignando...' : `Asignar a ${formAsignacion.empleados.length} persona${formAsignacion.empleados.length === 1 ? '' : 's'}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {celda && (
                <div className="ai-overlay" onClick={() => setCelda(null)}>
                    <div className="ai-modal ai-modal--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="ai-modal-head">
                            <span className="ai-modal-icon"><CalendarClock size={20} strokeWidth={1.75} /></span>
                            <div>
                                <h3 className="ai-modal-title">{nombrePropio(celda.empleado.nombre)}</h3>
                                <p className="ai-modal-sub">{celda.fecha}{celda.empleado.centro_costo ? ` · ${celda.empleado.centro_costo}` : ''}</p>
                            </div>
                            <button type="button" className="ai-icon-btn" onClick={() => setCelda(null)} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                        </div>
                        <div className="ai-modal-body ai-stack">
                            <div className="ai-field">
                                <label className="ai-label">Plantilla</label>
                                <select className="ai-input" value={celdaPlantillaId} onChange={(e) => setCeldaPlantillaId(e.target.value)}>
                                    <option value="">Selecciona una plantilla</option>
                                    <OpcionesPlantilla plantillas={plantillas} centro={claveCentro(celda.empleado.centro_costo_id)} />
                                </select>
                            </div>
                        </div>
                        <div className="ai-modal-foot" style={{ flexWrap: 'wrap' }}>
                            {celda.existente && (
                                <>
                                    <button type="button" className="ai-btn ai-btn--secondary" onClick={eliminarCelda} disabled={guardandoCelda}>Eliminar</button>
                                    <button type="button" className="ai-btn ai-btn--secondary" onClick={marcarDescanso} disabled={guardandoCelda}>Marcar descanso</button>
                                </>
                            )}
                            <button type="button" className="ai-btn ai-btn--primary" onClick={guardarCelda} disabled={guardandoCelda || !celdaPlantillaId} style={{ marginLeft: 'auto' }}>
                                {guardandoCelda ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionHorarios;
