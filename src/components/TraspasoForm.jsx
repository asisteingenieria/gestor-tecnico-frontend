import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { traspasoService } from '../services/api';
import ComboboxBuscable from './ComboboxBuscable';
import SoportesDocumentales from './SoportesDocumentales';
import { errorArchivoSoporte, abrirSoporte, subirSoportesPendientes } from '../utils/soportesRrhh';
import { jefesCandidatos, conValorActual } from '../utils/catalogosRRHH';
import {
    CAMPOS_NUEVOS_POR_TIPO, OBLIGATORIOS_POR_TIPO, CAMPOS_ACTUALES, etiquetaCampo,
    TIPOS_CON_EVALUACION, DIAS_AVISO_RETORNO, restarDias
} from '../utils/traspasos';
import { X, Save, ArrowLeftRight, BellRing } from 'lucide-react';

const fecha = (v) => (v ? String(v).substring(0, 10) : '');
const val = (v) => (v === undefined || v === null ? '' : v);
const fechaCorta = (f) => (f ? f.split('-').reverse().join('/') : '');

const CATALOGOS_VACIOS = {
    areas: [], campanias: [], centros_costo: [], cargos: [], modalidades: [], empleados: [], tipos_contrato: [],
    ciudades: [], jefes_area: [], jefes_inmediatos: [], tipos_traspaso: [], tipos_soporte_traspaso: []
};

const NUEVOS = [...new Set(Object.values(CAMPOS_NUEVOS_POR_TIPO).flat())];
const vacio = (campos) => Object.fromEntries(campos.map(c => [c, '']));

// Campos que la hoja no pide pero que existen en la tabla (039): se conservan al editar.
const OCULTOS = ['estado', 'bono_cafeteria_anterior', 'bono_cafeteria_nuevo'];

// Datos actuales del empleado (GET /users-company/:id) → "Información actual".
function actualDesdeEmpleado(emp) {
    const c = emp.contrato || {};
    return {
        tipo_contrato_anterior_id: val(c.tipo_contrato_idtipo_contrato),
        ciudad_anterior_id: val(c.ciudad_idciudad),
        fecha_ingreso_anterior: fecha(c.fecha_ingreso),
        area_anterior_id: val(c.area_idarea),
        campania_anterior_id: val(c.campania_idcampania),
        centro_costo_anterior_id: val(c.centro_costo_idcentro_costo),
        cargo_ssff_anterior: c.cargo_ssff || '',
        usuario_ssff_anterior: emp.usuario_ssff || '',
        cargo_anterior_id: val(c.cargo_idcargo),
        salario_anterior: val(emp.salario_actual?.salario),
        bono_no_prestacional_anterior: val(emp.salario_actual?.bono_no_prestacional),
        jefe_area_anterior_id: val(c.jefe_area_id),
        jefe_inmediato_anterior_id: val(c.jefe_inmediato_id),
        modalidad_anterior_id: val(c.modalidad_idmodalidad)
    };
}

// "Información nueva" arranca igual a la actual (se edita lo que cambia).
function nuevoDesdeActual(a) {
    return {
        ...vacio(NUEVOS),
        cargo_nuevo_id: a.cargo_anterior_id,
        area_nueva_id: a.area_anterior_id,
        campania_nueva_id: a.campania_anterior_id,
        centro_costo_nuevo_id: a.centro_costo_anterior_id,
        cargo_ssff_nuevo: a.cargo_ssff_anterior,
        usuario_ssff_nuevo: a.usuario_ssff_anterior,
        jefe_area_nuevo_id: a.jefe_area_anterior_id,
        jefe_inmediato_nuevo_id: a.jefe_inmediato_anterior_id,
        modalidad_idmodalidad: a.modalidad_anterior_id
    };
}

// empleadoInicialId: abre un traspaso nuevo con el empleado ya elegido (desde el drawer del empleado).
const TraspasoForm = ({ isOpen, onClose, traspaso = null, onSuccess, empleadoInicialId = null }) => {
    const [empleados, setEmpleados] = useState([]);
    const [catalogos, setCatalogos] = useState(CATALOGOS_VACIOS);
    const [empleadoId, setEmpleadoId] = useState('');
    const [contratoId, setContratoId] = useState('');
    const [jefatura, setJefatura] = useState({}); // contrato vigente: director/jefes, para el aviso de alertas
    const [tipoId, setTipoId] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [ocultos, setOcultos] = useState(vacio(OCULTOS));
    const [actual, setActual] = useState(vacio(CAMPOS_ACTUALES));
    const [nuevo, setNuevo] = useState(vacio(NUEVOS));

    // Id del traspaso ya guardado: el que se edita, o el recién creado si falló la carga de algún
    // documento (así un segundo "Guardar" lo actualiza en vez de crear otro).
    const [traspasoId, setTraspasoId] = useState(traspaso?.idtraspaso || null);
    const [soportesGuardados, setSoportesGuardados] = useState([]);
    const [archivos, setArchivos] = useState({});
    const [huboCambios, setHuboCambios] = useState(false);
    const [aviso, setAviso] = useState('');

    const [loadingData, setLoadingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const cargarJefatura = async (id) => {
        const { data } = await api.get(`/users-company/${id}`);
        const c = data.empleado.contrato || {};
        setJefatura({ director_area_id: c.director_area_id, jefe_area_id: c.jefe_area_id, jefe_inmediato_id: c.jefe_inmediato_id });
        return data.empleado;
    };

    useEffect(() => {
        const cargar = async () => {
            setLoadingData(true);
            try {
                const [empRes, catRes, sopRes] = await Promise.all([
                    api.get('/users-company'),
                    api.get('/users-company/catalogos'),
                    traspaso ? traspasoService.getSoportes(traspaso.idtraspaso) : Promise.resolve(null)
                ]);
                setEmpleados(empRes.data.empleados);
                setCatalogos({ ...CATALOGOS_VACIOS, ...catRes.data.catalogos });
                setSoportesGuardados(sopRes?.data.soportes || []);
                setError('');

                if (traspaso) {
                    setEmpleadoId(traspaso.empleado_id || '');
                    setContratoId(traspaso.contrato_idcontrato || '');
                    setTipoId(val(traspaso.tipo_traspaso_id));
                    setObservaciones(traspaso.observaciones || '');
                    setOcultos(Object.fromEntries(OCULTOS.map(c => [c, val(traspaso[c])])));
                    setActual(Object.fromEntries(CAMPOS_ACTUALES.map(c => [c, c.startsWith('fecha') ? fecha(traspaso[c]) : val(traspaso[c])])));
                    setNuevo(Object.fromEntries(NUEVOS.map(c => [c, c.startsWith('fecha') ? fecha(traspaso[c]) : val(traspaso[c])])));
                    if (traspaso.empleado_id) await cargarJefatura(traspaso.empleado_id);
                } else if (empleadoInicialId) {
                    await onSelectEmpleado(empleadoInicialId);
                }
            } catch (err) {
                console.error('Error al cargar datos del formulario:', err);
                setError('Error al cargar los datos del formulario');
            } finally {
                setLoadingData(false);
            }
        };
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- se carga una vez al abrir el formulario
    }, [traspaso, empleadoInicialId]);

    const onSelectEmpleado = async (id) => {
        setEmpleadoId(id);
        if (!id) {
            setContratoId('');
            setJefatura({});
            setActual(vacio(CAMPOS_ACTUALES));
            setNuevo(vacio(NUEVOS));
            return;
        }
        try {
            const emp = await cargarJefatura(id);
            setContratoId(emp.contrato?.idcontrato || '');
            const snapshot = actualDesdeEmpleado(emp);
            setActual(snapshot);
            setNuevo(nuevoDesdeActual(snapshot));
            setOcultos(prev => ({ ...prev, bono_cafeteria_anterior: val(emp.salario_actual?.bono_cafeteria) }));
        } catch (err) {
            console.error('Error al cargar empleado:', err);
            setError('Error al cargar los datos actuales del empleado');
        }
    };

    const tiposOpciones = catalogos.tipos_traspaso.filter(t => Number(t.vigente) === 1 || String(t.id) === String(tipoId));
    const tipoElegido = catalogos.tipos_traspaso.find(t => String(t.id) === String(tipoId));
    const codigo = tipoElegido?.codigo;
    const camposNuevos = codigo ? CAMPOS_NUEVOS_POR_TIPO[codigo] : [];
    const obligatorios = codigo ? OBLIGATORIOS_POR_TIPO[codigo] : [];
    const soportesQueAplican = tipoElegido
        ? catalogos.tipos_soporte_traspaso.filter(s => tipoElegido.soportes.includes(Number(s.id)))
        : [];

    const nombreEmpleado = (id) => catalogos.empleados.find(e => String(e.id) === String(id))?.nombre_completo;

    // ---- Documentos ----
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
    const quitarPendiente = (tipoSoporteId) => setArchivos(prev => {
        const siguiente = { ...prev };
        delete siguiente[tipoSoporteId];
        return siguiente;
    });
    const verSoporte = async (tipoSoporteId) => {
        try {
            await abrirSoporte(() => traspasoService.descargarSoporte(traspasoId, tipoSoporteId));
        } catch (err) {
            console.error('Error al abrir documento:', err);
            setError('No se pudo abrir el documento');
        }
    };
    const eliminarSoporte = async (soporte) => {
        if (!window.confirm(`¿Eliminar el archivo de "${soporte.nombre}"?`)) return;
        try {
            const { data } = await traspasoService.eliminarSoporte(traspasoId, soporte.tipo_soporte_id);
            setSoportesGuardados(data.soportes);
            setHuboCambios(true);
        } catch (err) {
            console.error('Error al eliminar documento:', err);
            setError(err.response?.data?.message || 'No se pudo eliminar el documento');
        }
    };

    const reenviarRecordatorio = async () => {
        try {
            await traspasoService.reenviarAlertaEvaluacion(traspasoId);
            setAviso('Recordatorio enviado al director.');
            setHuboCambios(true);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo enviar el recordatorio');
        }
    };

    const cerrar = () => (huboCambios ? onSuccess() : onClose());

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setAviso('');
        if (!contratoId) {
            setError('Selecciona un empleado válido (con contrato activo)');
            return;
        }
        setLoading(true);

        const nulos = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]));
        const payload = {
            contrato_id: contratoId,
            tipo_traspaso_id: tipoId,
            observaciones: observaciones || null,
            ...nulos(ocultos),
            ...nulos(actual),
            ...nulos(nuevo)
        };

        let id = traspasoId;
        try {
            if (id) {
                await traspasoService.update(id, payload);
            } else {
                const { data } = await traspasoService.create(payload);
                id = data.traspaso.id;
                setTraspasoId(id);
            }
            setHuboCambios(true);
        } catch (err) {
            console.error('Error al guardar traspaso:', err);
            setError(err.response?.data?.message || err.message || 'Error al guardar el traspaso');
            setLoading(false);
            return;
        }

        // Los documentos se suben después de guardar (necesitan el id del traspaso).
        const { fallidos, subidos, ultimos } = await subirSoportesPendientes(
            soportesQueAplican, archivos, (tipoSoporteId, archivo) => traspasoService.subirSoporte(id, tipoSoporteId, archivo)
        );
        subidos.forEach(quitarPendiente);
        setLoading(false);
        if (fallidos.length > 0) {
            if (ultimos) setSoportesGuardados(ultimos);
            setError(`El traspaso se guardó, pero estos documentos no se cargaron: ${fallidos.join(' · ')}`);
            return;
        }
        onSuccess();
    };

    if (!isOpen) return null;

    // ---- Campos ----
    const empleadosConNombre = catalogos.empleados.map(e => ({ ...e, nombre: e.nombre_completo }));
    const opcionesDe = (nombre, estado, esNuevo) => {
        let lista = null;
        if (/^area/.test(nombre)) lista = catalogos.areas;
        else if (/^campania/.test(nombre)) lista = catalogos.campanias;
        else if (/^centro_costo/.test(nombre)) lista = catalogos.centros_costo.map(c => ({ ...c, nombre: c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre }));
        else if (/^cargo_(nuevo|anterior)_id$/.test(nombre)) lista = catalogos.cargos;
        else if (/^modalidad/.test(nombre)) lista = catalogos.modalidades;
        else if (nombre === 'tipo_contrato_anterior_id') lista = catalogos.tipos_contrato;
        // Jefes nuevos: los que ya lo son en la campaña/cargo nuevos (como en el alta de empleados).
        else if (/^jefe_area/.test(nombre)) lista = esNuevo ? jefesCandidatos(catalogos.jefes_area, estado.campania_nueva_id, estado.cargo_nuevo_id) : empleadosConNombre;
        else if (/^jefe_inmediato/.test(nombre)) lista = esNuevo ? jefesCandidatos(catalogos.jefes_inmediatos, estado.campania_nueva_id, estado.cargo_nuevo_id) : empleadosConNombre;
        if (!lista) return null;
        const conNombre = lista.map(o => ({ ...o, nombre: o.nombre ?? o.nombre_completo }));
        return /^jefe/.test(nombre) ? conValorActual(conNombre, empleadosConNombre, estado[nombre]) : conNombre;
    };

    const campo = (nombre, estado, setEstado, esNuevo) => {
        const etiqueta = etiquetaCampo(nombre, codigo);
        const requerido = esNuevo && obligatorios.includes(nombre);
        const onChange = (e) => setEstado(prev => ({ ...prev, [nombre]: e.target.value }));

        if (nombre === 'ciudad_anterior_id') {
            return (
                <ComboboxBuscable
                    key={nombre}
                    label={etiqueta}
                    opciones={catalogos.ciudades}
                    value={estado[nombre]}
                    onChange={(id) => setEstado(prev => ({ ...prev, [nombre]: id }))}
                />
            );
        }
        const opciones = opcionesDe(nombre, estado, esNuevo);
        let control;
        if (opciones) {
            control = (
                <select name={nombre} value={estado[nombre]} onChange={onChange} required={requerido} className="ai-input">
                    <option value="">Sin especificar</option>
                    {opciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
            );
        } else if (nombre.startsWith('fecha')) {
            control = <input type="date" name={nombre} value={estado[nombre]} onChange={onChange} required={requerido} className="ai-input" />;
        } else if (/salario|bono/.test(nombre)) {
            control = <input type="number" min="0" step="0.01" name={nombre} value={estado[nombre]} onChange={onChange} required={requerido} className="ai-input" />;
        } else {
            control = <input type="text" name={nombre} value={estado[nombre]} onChange={onChange} required={requerido} className="ai-input" />;
        }
        return (
            <div key={nombre} className="ai-field">
                <label className="ai-label">{etiqueta}{requerido && <em> *</em>}</label>
                {control}
            </div>
        );
    };

    // ---- Aviso de alertas ----
    const alertaEvaluacion = TIPOS_CON_EVALUACION.includes(codigo);
    const directorId = jefatura.director_area_id || jefatura.jefe_area_id;
    const formatoEvaluacionCargado = soportesGuardados.some(s => s.codigo === 'FORMATO_EVALUACION' && s.id);
    const jefeRetornoId = nuevo.jefe_inmediato_nuevo_id || jefatura.jefe_inmediato_id;
    const fechaAvisoRetorno = restarDias(nuevo.fecha_fin_trabajo_casa, DIAS_AVISO_RETORNO);
    const estiloAviso = { height: 'auto', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', whiteSpace: 'normal' };

    let avisoAlerta = null;
    if (alertaEvaluacion) {
        avisoAlerta = (
            <div className="ai-badge ai-badge--info" style={estiloAviso}>
                <BellRing size={14} />
                <span style={{ flex: 1 }}>
                    {formatoEvaluacionCargado
                        ? 'El formato de evaluación ya está cargado: no hay recordatorio pendiente.'
                        : directorId
                            ? <>{traspasoId ? 'Se avisó' : 'Al guardar se avisará'} a <strong>{nombreEmpleado(directorId)}</strong> (director de área) en el portal de asistencia para que haga la evaluación de desempeño del encargo. El aviso sigue activo hasta que se cargue el formato de evaluación.</>
                            : 'El empleado no tiene director ni jefe de área en su contrato: no hay a quién enviarle el recordatorio.'}
                </span>
                {traspasoId && !formatoEvaluacionCargado && directorId && (
                    <button type="button" onClick={reenviarRecordatorio} className="ai-btn ai-btn--secondary">Reenviar recordatorio</button>
                )}
            </div>
        );
    } else if (codigo === 'TRABAJO_CASA' && nuevo.fecha_fin_trabajo_casa) {
        avisoAlerta = (
            <div className="ai-badge ai-badge--info" style={estiloAviso}>
                <BellRing size={14} />
                <span style={{ flex: 1 }}>
                    {jefeRetornoId
                        ? <>El <strong>{fechaCorta(fechaAvisoRetorno)}</strong> (una semana antes del retorno, el {fechaCorta(nuevo.fecha_fin_trabajo_casa)}) se avisará a <strong>{nombreEmpleado(jefeRetornoId)}</strong> (jefe inmediato) en el portal de asistencia. También aparece en "Alertas" de Traspasos.</>
                        : <>El {fechaCorta(fechaAvisoRetorno)} aparecerá la alerta de retorno en "Alertas" de Traspasos (el empleado no tiene jefe inmediato a quien avisarle).</>}
                </span>
            </div>
        );
    }

    return (
        <div className="ai-overlay ai-scope">
            <div className="ai-modal" style={{ maxWidth: 960, maxHeight: '92vh', overflowY: 'auto' }}>
                <div className="ai-modal-head">
                    <div className="ai-modal-icon"><ArrowLeftRight size={20} /></div>
                    <div>
                        <h2 className="ai-modal-title">{traspaso ? 'Editar traspaso' : 'Nuevo traspaso'}</h2>
                        <p className="ai-modal-sub">Encargos, ratificaciones, trabajo en casa y cambios de cargo o salario</p>
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
                                <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', marginBottom: 16, width: 'fit-content', whiteSpace: 'normal' }}>
                                    <span className="ai-dot" />
                                    {error}
                                </div>
                            )}
                            {aviso && (
                                <div className="ai-badge ai-badge--success" style={{ height: 'auto', padding: '10px 14px', marginBottom: 16, width: 'fit-content' }}>
                                    <span className="ai-dot" />
                                    {aviso}
                                </div>
                            )}

                            <div className="ai-stack">
                                <p className="ai-overline">Empleado y tipo de traspaso</p>
                                <div className="ai-form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                                    <ComboboxBuscable
                                        label="Empleado"
                                        opciones={empleados.map(emp => ({ id: emp.id, nombre: `${emp.nombre_completo} — ${emp.numero_identificacion}` }))}
                                        value={empleadoId}
                                        onChange={onSelectEmpleado}
                                        placeholder="Nombre o cédula…"
                                        required
                                        disabled={!!traspaso || !!empleadoInicialId}
                                        unidad="empleados"
                                    />
                                    <div className="ai-field">
                                        <label className="ai-label">Tipo de traspaso <em>*</em></label>
                                        <select value={tipoId} onChange={(e) => setTipoId(e.target.value)} required className="ai-input">
                                            <option value="">Seleccionar...</option>
                                            {tiposOpciones.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>Información actual</p>
                                {!empleadoId ? (
                                    <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>Elige el empleado: se carga con los datos actuales de su contrato.</p>
                                ) : (
                                    <div className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                        {CAMPOS_ACTUALES.map(c => campo(c, actual, setActual, false))}
                                    </div>
                                )}

                                <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                                    Información nueva{tipoElegido ? ` · ${tipoElegido.nombre}` : ''}
                                </p>
                                {!tipoElegido ? (
                                    <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>Elige el tipo de traspaso para ver qué hay que llenar.</p>
                                ) : (
                                    <div className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                        {camposNuevos.map(c => campo(c, nuevo, setNuevo, true))}
                                    </div>
                                )}
                                {avisoAlerta}

                                <div className="ai-field">
                                    <label className="ai-label">Observaciones</label>
                                    <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="ai-input" style={{ height: 'auto', padding: '8px 12px' }} />
                                </div>

                                <SoportesDocumentales
                                    titulo="Documentos"
                                    tipoElegido={!!tipoElegido}
                                    aplican={soportesQueAplican}
                                    guardados={soportesGuardados}
                                    archivos={archivos}
                                    onElegir={elegirArchivo}
                                    onQuitar={quitarPendiente}
                                    onVer={verSoporte}
                                    onEliminar={eliminarSoporte}
                                    textoSinTipo="Elige el tipo de traspaso para ver qué documentos aplican."
                                    textoSinSoportes="Este tipo de traspaso no requiere documentos."
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

export default TraspasoForm;
