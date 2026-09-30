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
    minutos_almuerzo: 60, hora_almuerzo_inicio: '12:30', tolerancia_entrada_min: 5
};
const ASIGNACION_VACIA = { empleados: [], desde: '', hasta: '', dias_semana: [1, 2, 3, 4, 5], plantilla_id: '' };

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

    const [modalPlantilla, setModalPlantilla] = useState(null); // null | 'nueva' | plantilla obj
    const [formPlantilla, setFormPlantilla] = useState(PLANTILLA_VACIA);
    const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);

    const [modalAsignar, setModalAsignar] = useState(false);
    const [formAsignacion, setFormAsignacion] = useState(ASIGNACION_VACIA);
    const [buscarEmpleado, setBuscarEmpleado] = useState('');
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
            setEquipo(rEquipo.data);
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

    const equipoFiltrado = useMemo(() => {
        if (!busqueda.trim()) return equipo;
        const q = busqueda.trim().toLowerCase();
        return equipo.filter((e) => e.nombre.toLowerCase().includes(q));
    }, [equipo, busqueda]);

    // --- Plantillas ---
    const abrirNuevaPlantilla = () => { setFormPlantilla(PLANTILLA_VACIA); setModalPlantilla('nueva'); };
    const abrirEditarPlantilla = (p) => {
        setFormPlantilla({
            nombre: p.nombre, hora_entrada: hhmm(p.hora_entrada), hora_salida: hhmm(p.hora_salida),
            minutos_almuerzo: p.minutos_almuerzo, hora_almuerzo_inicio: hhmm(p.hora_almuerzo_inicio),
            tolerancia_entrada_min: p.tolerancia_entrada_min
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
            tolerancia_entrada_min: Number(formPlantilla.tolerancia_entrada_min)
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
    const toggleDia = (dia) => {
        setFormAsignacion((prev) => ({
            ...prev,
            dias_semana: prev.dias_semana.includes(dia) ? prev.dias_semana.filter((d) => d !== dia) : [...prev.dias_semana, dia]
        }));
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
                    <button type="button" className="ai-btn ai-btn--primary" onClick={() => setModalAsignar(true)}>
                        <CalendarClock size={16} strokeWidth={1.75} /> Asignar horario
                    </button>
                </div>
            </div>

            {mensaje && (
                <p style={{ color: mensaje.tipo === 'ok' ? 'var(--success)' : 'var(--danger)', fontSize: 13 }}>{mensaje.texto}</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
                <div className="ai-panel">
                    <div className="ai-panel-head"><h3 className="ai-panel-title">Plantillas de turno</h3></div>
                    <div className="ai-panel-body">
                        {plantillas.map((p, i) => {
                            const c = colorDe(i);
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
                        {plantillas.length === 0 && (
                            <div className="ai-empty">
                                <CalendarClock size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                                <p>Sin plantillas todavía.</p>
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
                                {equipoFiltrado.map((emp) => (
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
                                {equipoFiltrado.length === 0 && (
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
                                    <label className="ai-label">Plantilla <em>*</em></label>
                                    <select required className="ai-input" value={formAsignacion.plantilla_id} onChange={(e) => setFormAsignacion({ ...formAsignacion, plantilla_id: e.target.value })}>
                                        <option value="">Selecciona una plantilla</option>
                                        {plantillas.map((p) => <option key={p.idhorario_plantilla} value={p.idhorario_plantilla}>{p.nombre} · {hhmm(p.hora_entrada)}–{hhmm(p.hora_salida)}</option>)}
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
                                    <div className="ai-checklist">
                                        {equipo.filter((e) => !buscarEmpleado.trim() || e.nombre.toLowerCase().includes(buscarEmpleado.trim().toLowerCase())).map((emp) => (
                                            <label key={emp.users_company_id}>
                                                <input type="checkbox" checked={formAsignacion.empleados.includes(emp.users_company_id)} onChange={() => toggleEmpleado(emp.users_company_id)} />
                                                {nombrePropio(emp.nombre)}
                                            </label>
                                        ))}
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
                                <p className="ai-modal-sub">{celda.fecha}</p>
                            </div>
                            <button type="button" className="ai-icon-btn" onClick={() => setCelda(null)} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                        </div>
                        <div className="ai-modal-body ai-stack">
                            <div className="ai-field">
                                <label className="ai-label">Plantilla</label>
                                <select className="ai-input" value={celdaPlantillaId} onChange={(e) => setCeldaPlantillaId(e.target.value)}>
                                    <option value="">Selecciona una plantilla</option>
                                    {plantillas.map((p) => <option key={p.idhorario_plantilla} value={p.idhorario_plantilla}>{p.nombre} · {hhmm(p.hora_entrada)}–{hhmm(p.hora_salida)}</option>)}
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
