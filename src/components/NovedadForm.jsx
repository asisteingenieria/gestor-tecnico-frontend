import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { novedadRrhhService } from '../services/api';
import ComboboxBuscable from './ComboboxBuscable';
import SoportesDocumentales from './SoportesDocumentales';
import { errorArchivoSoporte, abrirSoporte, subirSoportesPendientes } from '../utils/soportesRrhh';
import { primeraMayuscula } from '../utils/formatoRRHH';
import { X, Save, ClipboardList } from 'lucide-react';

const fecha = (v) => (v ? String(v).substring(0, 10) : '');

// Los checkboxes de soportes de la 039 (documento original, copia, historia clínica, RUNT,
// FURIPS, SOAT) ya no se muestran: los reemplazan los archivos de la hoja "Novedades" (069).
// Se conservan en el estado para que editar una novedad vieja no los ponga en 0.
const FLAGS_SOPORTE_VIEJOS = ['tiene_documento_original', 'tiene_copia_documento', 'tiene_historia_clinica', 'tiene_runt', 'tiene_furips', 'tiene_soat'];

// Responsable de una novedad: se sugieren las personas que pueden reportarla hoy, todas activas
// (sin retiro): su jefe inmediato, los coordinadores/jefes/team leaders de su campaña y su jefe y
// director de área. Un jefe retirado no se sugiere (hay fichas que aún apuntan a coordinadores que
// salieron; §50 de claude/modulo recursoshumanos.md). Se elige solo su jefe inmediato si está activo.
const CARGO_DE_COORDINACION = /^(COORDINADOR|JEFE|TEAM LEADER)/i;
const ordenCargo = (cargo) => (/^COORDINADOR/i.test(cargo) ? 0 : /^TEAM LEADER/i.test(cargo) ? 1 : 2);
const activo = (e) => e && !e.fecha_retiro;

function sugerenciasResponsable(empleado, empleados) {
    if (!empleado) return { opciones: [], automatico: null, jefeRetirado: null };
    const porId = new Map();
    const agregar = (persona, etiqueta) => {
        if (!activo(persona) || String(persona.id) === String(empleado.id)) return;
        if (porId.has(persona.id)) { porId.get(persona.id).etiquetas.push(etiqueta); return; }
        porId.set(persona.id, { id: persona.id, nombreCompleto: persona.nombre_completo, etiquetas: [etiqueta] });
    };
    const ficha = (id) => (id ? empleados.find(e => String(e.id) === String(id)) : null);

    const jefeInmediato = ficha(empleado.jefe_inmediato_id);
    agregar(jefeInmediato, 'Jefe inmediato');
    empleados
        .filter(e => empleado.campania_nombre && e.campania_nombre === empleado.campania_nombre && CARGO_DE_COORDINACION.test(e.cargo_nombre || ''))
        .sort((a, b) => ordenCargo(a.cargo_nombre) - ordenCargo(b.cargo_nombre) || a.nombre_completo.localeCompare(b.nombre_completo))
        .forEach(e => agregar(e, primeraMayuscula(e.cargo_nombre)));
    agregar(ficha(empleado.jefe_area_id), 'Jefe de área');
    agregar(ficha(empleado.director_area_id), 'Director de área');

    return {
        opciones: [...porId.values()].map(p => ({ id: p.id, nombre: `${p.nombreCompleto} — ${p.etiquetas.join(' · ')}` })),
        automatico: activo(jefeInmediato) ? jefeInmediato.id : null,
        jefeRetirado: jefeInmediato && !activo(jefeInmediato) ? jefeInmediato.nombre_completo : null
    };
}

const NovedadForm = ({ isOpen, onClose, novedad = null, onSuccess }) => {
    const [empleados, setEmpleados] = useState([]);
    const [tiposNovedad, setTiposNovedad] = useState([]);
    const [tiposSoporte, setTiposSoporte] = useState([]);
    const [form, setForm] = useState({
        empleado_id: '', contrato_id: '', tipo_novedad_id: '', responsable_id: '',
        accidente_transito: false, fecha_inicial: '', fecha_final: '', fecha_retorno: '',
        total_dias: '', resumen_diagnostico: '', origen_incapacidad: '', observaciones: '',
        fecha_recibido: '', fecha_reporte: '',
        ...Object.fromEntries(FLAGS_SOPORTE_VIEJOS.map(f => [f, false]))
    });
    // Id de la novedad ya guardada: la que se edita, o la recién creada si falló la carga de
    // algún soporte (así un segundo "Guardar" la actualiza en vez de crear otra).
    const [novedadId, setNovedadId] = useState(novedad?.idnovedad_rrhh || null);
    const [soportesGuardados, setSoportesGuardados] = useState([]);
    const [archivos, setArchivos] = useState({}); // tipo_soporte_id -> File por subir
    const [huboCambios, setHuboCambios] = useState(false);
    const [responsableEntreTodos, setResponsableEntreTodos] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargar = async () => {
            setLoadingData(true);
            try {
                const [empRes, catRes, sopRes] = await Promise.all([
                    api.get('/users-company'),
                    api.get('/users-company/catalogos'),
                    novedad ? novedadRrhhService.getSoportes(novedad.idnovedad_rrhh) : Promise.resolve(null)
                ]);
                setEmpleados(empRes.data.empleados);
                setTiposNovedad(catRes.data.catalogos.tipos_novedad || []);
                setTiposSoporte(catRes.data.catalogos.tipos_soporte_novedad || []);
                setSoportesGuardados(sopRes?.data.soportes || []);

                if (novedad) {
                    setForm({
                        empleado_id: novedad.empleado_id || '',
                        contrato_id: novedad.contrato_idcontrato || '',
                        tipo_novedad_id: novedad.tipo_novedad_idtipo_novedad || '',
                        responsable_id: novedad.responsable_id || '',
                        accidente_transito: !!novedad.accidente_transito,
                        fecha_inicial: fecha(novedad.fecha_inicial),
                        fecha_final: fecha(novedad.fecha_final),
                        fecha_retorno: fecha(novedad.fecha_retorno),
                        total_dias: novedad.total_dias ?? '',
                        resumen_diagnostico: novedad.resumen_diagnostico || '',
                        origen_incapacidad: novedad.origen_incapacidad || '',
                        observaciones: novedad.observaciones || '',
                        fecha_recibido: fecha(novedad.fecha_recibido),
                        fecha_reporte: fecha(novedad.fecha_reporte),
                        ...Object.fromEntries(FLAGS_SOPORTE_VIEJOS.map(f => [f, !!novedad[f]]))
                    });
                }
                setError('');
            } catch (err) {
                console.error('Error al cargar datos del formulario:', err);
                setError('Error al cargar los datos del formulario');
            } finally {
                setLoadingData(false);
            }
        };
        cargar();
    }, [novedad]);

    // El empleado se busca escribiendo su nombre o su cédula (son ~400: un <select> no sirve).
    const opcionesEmpleado = empleados.map(emp => ({
        id: emp.id,
        nombre: `${emp.nombre_completo} — ${emp.numero_identificacion}`
    }));

    const empleadoElegido = empleados.find(x => String(x.id) === String(form.empleado_id));
    const { opciones: jefes, jefeRetirado } = sugerenciasResponsable(empleadoElegido, empleados);
    const opcionesTodos = empleados.map(emp => ({ id: emp.id, nombre: `${emp.nombre_completo} — ${emp.numero_identificacion}` }));
    // Solo sus jefes, salvo que pida buscar entre todos o que no tenga jefes registrados. Si la
    // novedad ya tiene otro responsable (al editar), se conserva en la lista.
    const soloJefes = !responsableEntreTodos && jefes.length > 0;
    const opcionesResponsable = soloJefes
        ? [...jefes, ...opcionesTodos.filter(o => String(o.id) === String(form.responsable_id) && !jefes.some(j => String(j.id) === String(o.id)))]
        : opcionesTodos;

    const onChangeEmpleado = (empleadoId) => {
        const emp = empleados.find(x => String(x.id) === String(empleadoId));
        const { automatico } = sugerenciasResponsable(emp, empleados);
        setResponsableEntreTodos(false);
        setForm(prev => ({ ...prev, empleado_id: empleadoId, contrato_id: emp?.idcontrato || '', responsable_id: automatico || '' }));
    };

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // Solo los tipos de la hoja "Novedades" (069), más el ya guardado si no lo es.
    const tiposOpciones = tiposNovedad.filter(t => Number(t.vigente) === 1 || String(t.id) === String(form.tipo_novedad_id));
    const tipoElegido = tiposNovedad.find(t => String(t.id) === String(form.tipo_novedad_id));
    const soportesQueAplican = tipoElegido
        ? tiposSoporte.filter(s => tipoElegido.soportes.includes(Number(s.id)))
        : [];

    const elegirArchivo = (tipoSoporteId, archivo) => {
        if (!archivo) return;
        const problema = errorArchivoSoporte(archivo);
        if (problema) {
            setError(`${archivo.name}: ${problema}`);
            return;
        }
        setError('');
        setArchivos(prev => ({ ...prev, [tipoSoporteId]: archivo }));
    };

    const quitarPendiente = (tipoSoporteId) => {
        setArchivos(prev => {
            const siguiente = { ...prev };
            delete siguiente[tipoSoporteId];
            return siguiente;
        });
    };

    const verSoporte = async (tipoSoporteId) => {
        try {
            await abrirSoporte(() => novedadRrhhService.descargarSoporte(novedadId, tipoSoporteId));
        } catch (err) {
            console.error('Error al abrir soporte:', err);
            setError('No se pudo abrir el soporte');
        }
    };

    const eliminarSoporte = async (soporte) => {
        if (!window.confirm(`¿Eliminar el archivo de "${soporte.nombre}"?`)) return;
        try {
            const { data } = await novedadRrhhService.eliminarSoporte(novedadId, soporte.tipo_soporte_id);
            setSoportesGuardados(data.soportes);
            setHuboCambios(true);
        } catch (err) {
            console.error('Error al eliminar soporte:', err);
            setError(err.response?.data?.message || 'No se pudo eliminar el soporte');
        }
    };

    const cerrar = () => (huboCambios ? onSuccess() : onClose());

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!form.contrato_id) {
            setError('Selecciona un empleado válido (con contrato activo)');
            setLoading(false);
            return;
        }

        const payload = {
            ...form,
            total_dias: form.total_dias !== '' ? parseInt(form.total_dias, 10) : null,
            responsable_id: form.responsable_id || null
        };

        let id = novedadId;
        try {
            if (id) {
                await novedadRrhhService.update(id, payload);
            } else {
                const { data } = await novedadRrhhService.create(payload);
                id = data.novedad.id;
                setNovedadId(id);
            }
            setHuboCambios(true);
        } catch (err) {
            console.error('Error al guardar novedad:', err);
            setError(err.response?.data?.message || err.message || 'Error al guardar la novedad');
            setLoading(false);
            return;
        }

        // Los soportes se suben uno por uno después de guardar la novedad (necesitan su id).
        // Solo los que aplican al tipo elegido; si alguno falla, el modal sigue abierto con los
        // pendientes para reintentar.
        const { fallidos, subidos, ultimos } = await subirSoportesPendientes(
            soportesQueAplican, archivos, (tipoSoporteId, archivo) => novedadRrhhService.subirSoporte(id, tipoSoporteId, archivo)
        );
        subidos.forEach(quitarPendiente);
        setLoading(false);

        if (fallidos.length > 0) {
            if (ultimos) setSoportesGuardados(ultimos);
            setError(`La novedad se guardó, pero estos soportes no se cargaron: ${fallidos.join(' · ')}`);
            return;
        }
        onSuccess();
    };

    if (!isOpen) return null;

    const checkboxField = (label, name) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" name={name} checked={form[name]} onChange={onChange} />
            {label}
        </label>
    );

    return (
        <div className="ai-overlay ai-scope">
            <div className="ai-modal" style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }}>
                <div className="ai-modal-head">
                    <div className="ai-modal-icon"><ClipboardList size={20} /></div>
                    <div>
                        <h2 className="ai-modal-title">{novedad ? 'Editar novedad' : 'Nueva novedad'}</h2>
                        <p className="ai-modal-sub">Incapacidades, licencias y demás novedades de RRHH</p>
                    </div>
                    <button onClick={cerrar} className="ai-icon-btn" aria-label="Cerrar"><X size={18} /></button>
                </div>

                {loadingData ? (
                    <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--primary)' }} />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="ai-modal-body">
                            {error && (
                                <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', marginBottom: 16, width: 'fit-content' }}>
                                    <span className="ai-dot" />
                                    {error}
                                </div>
                            )}

                            <div className="ai-stack">
                                <p className="ai-overline">Empleado y tipo</p>
                                <div className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                    <ComboboxBuscable
                                        label="Empleado"
                                        opciones={opcionesEmpleado}
                                        value={form.empleado_id}
                                        onChange={onChangeEmpleado}
                                        placeholder="Nombre o cédula…"
                                        required
                                        disabled={!!novedad}
                                        unidad="empleados"
                                    />
                                    <div className="ai-field">
                                        <label className="ai-label">Tipo de novedad <em>*</em></label>
                                        <select name="tipo_novedad_id" value={form.tipo_novedad_id} onChange={onChange} required className="ai-input">
                                            <option value="">Seleccionar...</option>
                                            {tiposOpciones.map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <ComboboxBuscable
                                            label="Responsable"
                                            opciones={opcionesResponsable}
                                            value={form.responsable_id}
                                            onChange={(id) => setForm(prev => ({ ...prev, responsable_id: id || '' }))}
                                            placeholder={soloJefes ? 'Coordinadores y jefes…' : 'Nombre o cédula…'}
                                            unidad="empleados"
                                        />
                                        {jefeRetirado && !form.responsable_id && (
                                            <p className="ai-muted" style={{ fontSize: 12, marginTop: 4 }}>
                                                Su jefe inmediato en la ficha ({primeraMayuscula(jefeRetirado)}) está retirado: elige a su coordinador actual.
                                            </p>
                                        )}
                                        {jefes.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setResponsableEntreTodos(v => !v)}
                                                className="ai-btn ai-btn--ghost ai-btn--sm"
                                                style={{ marginTop: 4, paddingLeft: 0 }}
                                            >
                                                {soloJefes ? 'Buscar entre todos los empleados' : 'Ver solo los sugeridos'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {checkboxField('Accidente de tránsito', 'accidente_transito')}

                                <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>Fechas</p>
                                <div className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha inicial <em>*</em></label>
                                        <input type="date" name="fecha_inicial" value={form.fecha_inicial} onChange={onChange} required className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha final</label>
                                        <input type="date" name="fecha_final" value={form.fecha_final} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha de retorno</label>
                                        <input type="date" name="fecha_retorno" value={form.fecha_retorno} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Total días</label>
                                        <input type="number" min="0" name="total_dias" value={form.total_dias} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha de recibido</label>
                                        <input type="date" name="fecha_recibido" value={form.fecha_recibido} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha de reporte</label>
                                        <input type="date" name="fecha_reporte" value={form.fecha_reporte} onChange={onChange} className="ai-input" />
                                    </div>
                                </div>

                                <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>Detalle</p>
                                <div className="ai-field">
                                    <label className="ai-label">Origen de la incapacidad</label>
                                    <input type="text" name="origen_incapacidad" value={form.origen_incapacidad} onChange={onChange} className="ai-input" />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Diagnóstico</label>
                                    <textarea name="resumen_diagnostico" value={form.resumen_diagnostico} onChange={onChange} rows={2} className="ai-input" style={{ height: 'auto', padding: '8px 12px' }} />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Observaciones</label>
                                    <textarea name="observaciones" value={form.observaciones} onChange={onChange} rows={2} className="ai-input" style={{ height: 'auto', padding: '8px 12px' }} />
                                </div>

                                <SoportesDocumentales
                                    tipoElegido={!!tipoElegido}
                                    aplican={soportesQueAplican}
                                    guardados={soportesGuardados}
                                    archivos={archivos}
                                    onElegir={elegirArchivo}
                                    onQuitar={quitarPendiente}
                                    onVer={verSoporte}
                                    onEliminar={eliminarSoporte}
                                    textoSinTipo="Elige el tipo de novedad para ver qué soportes aplican."
                                    textoSinSoportes="Este tipo de novedad no requiere soportes."
                                />
                            </div>
                        </div>

                        <div className="ai-modal-foot">
                            <button type="button" onClick={cerrar} className="ai-btn ai-btn--secondary">Cancelar</button>
                            <button type="submit" disabled={loading} className="ai-btn ai-btn--primary">
                                <Save size={16} />
                                {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default NovedadForm;
