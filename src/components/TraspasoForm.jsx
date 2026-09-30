import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { traspasoService } from '../services/api';
import { X, Save, ArrowLeftRight } from 'lucide-react';

const fecha = (v) => (v ? String(v).substring(0, 10) : '');
const val = (v) => (v === undefined || v === null ? '' : v);

const CATALOGOS_VACIOS = { areas: [], campanias: [], centros_costo: [], cargos: [], modalidades: [], empleados: [] };

const ESTADO_VACIO = {
    area_id: '', campania_id: '', centro_costo_id: '', cargo_id: '',
    cargo_ssff: '', usuario_ssff: '', salario: '', bono_no_prestacional: '', bono_cafeteria: '',
    jefe_area_id: '', jefe_inmediato_id: ''
};

const TraspasoForm = ({ isOpen, onClose, traspaso = null, onSuccess }) => {
    const [empleados, setEmpleados] = useState([]);
    const [catalogos, setCatalogos] = useState(CATALOGOS_VACIOS);
    const [empleadoId, setEmpleadoId] = useState('');
    const [contratoId, setContratoId] = useState('');

    const [general, setGeneral] = useState({
        estado: '', fecha_inicio: '', fecha_fin: '', ratificacion: false, observaciones: '',
        modalidad_id: '', fecha_inicio_trabajo_casa: '', fecha_fin_trabajo_casa: '', diadema: '', equipo_computo: ''
    });
    const [anterior, setAnterior] = useState(ESTADO_VACIO);
    const [nuevo, setNuevo] = useState(ESTADO_VACIO);

    const [loadingData, setLoadingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargar = async () => {
            setLoadingData(true);
            try {
                const [empRes, catRes] = await Promise.all([
                    api.get('/users-company'),
                    api.get('/users-company/catalogos')
                ]);
                setEmpleados(empRes.data.empleados);
                setCatalogos(catRes.data.catalogos);

                if (traspaso) {
                    setEmpleadoId(traspaso.empleado_id || '');
                    setContratoId(traspaso.contrato_idcontrato || '');
                    setGeneral({
                        estado: traspaso.estado || '',
                        fecha_inicio: fecha(traspaso.fecha_inicio),
                        fecha_fin: fecha(traspaso.fecha_fin),
                        ratificacion: !!traspaso.ratificacion,
                        observaciones: traspaso.observaciones || '',
                        modalidad_id: traspaso.modalidad_idmodalidad || '',
                        fecha_inicio_trabajo_casa: fecha(traspaso.fecha_inicio_trabajo_casa),
                        fecha_fin_trabajo_casa: fecha(traspaso.fecha_fin_trabajo_casa),
                        diadema: traspaso.diadema || '',
                        equipo_computo: traspaso.equipo_computo || ''
                    });
                    setAnterior({
                        area_id: val(traspaso.area_anterior_id), campania_id: val(traspaso.campania_anterior_id),
                        centro_costo_id: val(traspaso.centro_costo_anterior_id), cargo_id: val(traspaso.cargo_anterior_id),
                        cargo_ssff: traspaso.cargo_ssff_anterior || '', usuario_ssff: traspaso.usuario_ssff_anterior || '',
                        salario: val(traspaso.salario_anterior), bono_no_prestacional: val(traspaso.bono_no_prestacional_anterior),
                        bono_cafeteria: val(traspaso.bono_cafeteria_anterior),
                        jefe_area_id: val(traspaso.jefe_area_anterior_id), jefe_inmediato_id: val(traspaso.jefe_inmediato_anterior_id)
                    });
                    setNuevo({
                        area_id: val(traspaso.area_nueva_id), campania_id: val(traspaso.campania_nueva_id),
                        centro_costo_id: val(traspaso.centro_costo_nuevo_id), cargo_id: val(traspaso.cargo_nuevo_id),
                        cargo_ssff: traspaso.cargo_ssff_nuevo || '', usuario_ssff: traspaso.usuario_ssff_nuevo || '',
                        salario: val(traspaso.salario_nuevo), bono_no_prestacional: val(traspaso.bono_no_prestacional_nuevo),
                        bono_cafeteria: val(traspaso.bono_cafeteria_nuevo),
                        jefe_area_id: val(traspaso.jefe_area_nuevo_id), jefe_inmediato_id: val(traspaso.jefe_inmediato_nuevo_id)
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
    }, [traspaso]);

    const onSelectEmpleado = async (e) => {
        const id = e.target.value;
        setEmpleadoId(id);
        if (!id) {
            setContratoId('');
            setAnterior(ESTADO_VACIO);
            setNuevo(ESTADO_VACIO);
            return;
        }
        try {
            const res = await api.get(`/users-company/${id}`);
            const emp = res.data.empleado;
            setContratoId(emp.contrato?.idcontrato || '');

            const snapshot = {
                area_id: val(emp.contrato?.area_idarea), campania_id: val(emp.contrato?.campania_idcampania),
                centro_costo_id: val(emp.contrato?.centro_costo_idcentro_costo), cargo_id: val(emp.contrato?.cargo_idcargo),
                cargo_ssff: '', usuario_ssff: emp.usuario_ssff || '',
                salario: val(emp.salario_actual?.salario), bono_no_prestacional: val(emp.salario_actual?.bono_no_prestacional),
                bono_cafeteria: val(emp.salario_actual?.bono_cafeteria),
                jefe_area_id: val(emp.contrato?.jefe_area_id), jefe_inmediato_id: val(emp.contrato?.jefe_inmediato_id)
            };
            setAnterior(snapshot);
            setNuevo(snapshot); // el usuario edita desde aca lo que cambio
        } catch (err) {
            console.error('Error al cargar empleado:', err);
            setError('Error al cargar los datos actuales del empleado');
        }
    };

    const onChangeGeneral = (e) => {
        const { name, value, type, checked } = e.target;
        setGeneral(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    const onChangeAnterior = (e) => setAnterior(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const onChangeNuevo = (e) => setNuevo(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!contratoId) {
            setError('Selecciona un empleado válido (con contrato activo)');
            setLoading(false);
            return;
        }

        const payload = {
            contrato_id: contratoId,
            estado: general.estado || null,
            fecha_inicio: general.fecha_inicio,
            fecha_fin: general.fecha_fin || null,
            ratificacion: general.ratificacion,
            observaciones: general.observaciones || null,
            modalidad_idmodalidad: general.modalidad_id || null,
            fecha_inicio_trabajo_casa: general.fecha_inicio_trabajo_casa || null,
            fecha_fin_trabajo_casa: general.fecha_fin_trabajo_casa || null,
            diadema: general.diadema || null,
            equipo_computo: general.equipo_computo || null,

            area_anterior_id: anterior.area_id || null, campania_anterior_id: anterior.campania_id || null,
            centro_costo_anterior_id: anterior.centro_costo_id || null, cargo_anterior_id: anterior.cargo_id || null,
            cargo_ssff_anterior: anterior.cargo_ssff || null, usuario_ssff_anterior: anterior.usuario_ssff || null,
            salario_anterior: anterior.salario || null, bono_no_prestacional_anterior: anterior.bono_no_prestacional || null,
            bono_cafeteria_anterior: anterior.bono_cafeteria || null,
            jefe_area_anterior_id: anterior.jefe_area_id || null, jefe_inmediato_anterior_id: anterior.jefe_inmediato_id || null,

            area_nueva_id: nuevo.area_id || null, campania_nueva_id: nuevo.campania_id || null,
            centro_costo_nuevo_id: nuevo.centro_costo_id || null, cargo_nuevo_id: nuevo.cargo_id || null,
            cargo_ssff_nuevo: nuevo.cargo_ssff || null, usuario_ssff_nuevo: nuevo.usuario_ssff || null,
            salario_nuevo: nuevo.salario || null, bono_no_prestacional_nuevo: nuevo.bono_no_prestacional || null,
            bono_cafeteria_nuevo: nuevo.bono_cafeteria || null,
            jefe_area_nuevo_id: nuevo.jefe_area_id || null, jefe_inmediato_nuevo_id: nuevo.jefe_inmediato_id || null
        };

        try {
            let response;
            if (traspaso) {
                response = await traspasoService.update(traspaso.idtraspaso, payload);
            } else {
                response = await traspasoService.create(payload);
            }
            if (response.data.success) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error('Error al guardar traspaso:', err);
            setError(err.response?.data?.message || err.message || 'Error al guardar el traspaso');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const bloqueEstado = (estado, onChangeEstado, titulo) => (
        <div>
            <p className="ai-overline" style={{ marginBottom: 12 }}>{titulo}</p>
            <div className="ai-stack" style={{ gap: 12 }}>
                <div className="ai-field">
                    <label className="ai-label">Área</label>
                    <select name="area_id" value={estado.area_id} onChange={onChangeEstado} className="ai-input">
                        <option value="">Sin especificar</option>
                        {catalogos.areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                </div>
                <div className="ai-field">
                    <label className="ai-label">Campaña</label>
                    <select name="campania_id" value={estado.campania_id} onChange={onChangeEstado} className="ai-input">
                        <option value="">Sin especificar</option>
                        {catalogos.campanias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="ai-field">
                    <label className="ai-label">Centro de costo</label>
                    <select name="centro_costo_id" value={estado.centro_costo_id} onChange={onChangeEstado} className="ai-input">
                        <option value="">Sin especificar</option>
                        {catalogos.centros_costo.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                    </select>
                </div>
                <div className="ai-field">
                    <label className="ai-label">Cargo</label>
                    <select name="cargo_id" value={estado.cargo_id} onChange={onChangeEstado} className="ai-input">
                        <option value="">Sin especificar</option>
                        {catalogos.cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="ai-field">
                    <label className="ai-label">Cargo SSFF</label>
                    <input type="text" name="cargo_ssff" value={estado.cargo_ssff} onChange={onChangeEstado} className="ai-input" />
                </div>
                <div className="ai-field">
                    <label className="ai-label">Usuario SSFF</label>
                    <input type="text" name="usuario_ssff" value={estado.usuario_ssff} onChange={onChangeEstado} className="ai-input" />
                </div>
                <div className="ai-field">
                    <label className="ai-label">Salario</label>
                    <input type="number" min="0" step="0.01" name="salario" value={estado.salario} onChange={onChangeEstado} className="ai-input" />
                </div>
                <div className="ai-field">
                    <label className="ai-label">Bono no prestacional</label>
                    <input type="number" min="0" step="0.01" name="bono_no_prestacional" value={estado.bono_no_prestacional} onChange={onChangeEstado} className="ai-input" />
                </div>
                <div className="ai-field">
                    <label className="ai-label">Bono cafetería</label>
                    <input type="number" min="0" step="0.01" name="bono_cafeteria" value={estado.bono_cafeteria} onChange={onChangeEstado} className="ai-input" />
                </div>
                <div className="ai-field">
                    <label className="ai-label">Jefe de área</label>
                    <select name="jefe_area_id" value={estado.jefe_area_id} onChange={onChangeEstado} className="ai-input">
                        <option value="">Sin especificar</option>
                        {catalogos.empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>)}
                    </select>
                </div>
                <div className="ai-field">
                    <label className="ai-label">Jefe inmediato</label>
                    <select name="jefe_inmediato_id" value={estado.jefe_inmediato_id} onChange={onChangeEstado} className="ai-input">
                        <option value="">Sin especificar</option>
                        {catalogos.empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );

    return (
        <div className="ai-overlay ai-scope">
            <div className="ai-modal" style={{ maxWidth: 960, maxHeight: '92vh', overflowY: 'auto' }}>
                <div className="ai-modal-head">
                    <div className="ai-modal-icon"><ArrowLeftRight size={20} /></div>
                    <div>
                        <h2 className="ai-modal-title">{traspaso ? 'Editar traspaso' : 'Nuevo traspaso'}</h2>
                        <p className="ai-modal-sub">Cambios de área, cargo, campaña o salario</p>
                    </div>
                    <button onClick={onClose} className="ai-icon-btn" aria-label="Cerrar"><X size={18} /></button>
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
                                <p className="ai-overline">Empleado</p>
                                <div className="ai-field">
                                    <label className="ai-label">Empleado <em>*</em></label>
                                    <select value={empleadoId} onChange={onSelectEmpleado} required className="ai-input" disabled={!!traspaso}>
                                        <option value="">Seleccionar...</option>
                                        {empleados.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.nombre_completo} — {emp.numero_identificacion}</option>
                                        ))}
                                    </select>
                                    <p className="ai-help">Al seleccionar, se precarga el estado "Anterior" con los datos actuales del contrato.</p>
                                </div>

                                <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>Datos generales</p>
                                <div className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                    <div className="ai-field">
                                        <label className="ai-label">Estado</label>
                                        <input type="text" name="estado" value={general.estado} onChange={onChangeGeneral} className="ai-input" placeholder="Ej: aprobado" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha inicio <em>*</em></label>
                                        <input type="date" name="fecha_inicio" value={general.fecha_inicio} onChange={onChangeGeneral} required className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha fin</label>
                                        <input type="date" name="fecha_fin" value={general.fecha_fin} onChange={onChangeGeneral} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Modalidad</label>
                                        <select name="modalidad_id" value={general.modalidad_id} onChange={onChangeGeneral} className="ai-input">
                                            <option value="">Sin especificar</option>
                                            {catalogos.modalidades.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Trabajo en casa - inicio</label>
                                        <input type="date" name="fecha_inicio_trabajo_casa" value={general.fecha_inicio_trabajo_casa} onChange={onChangeGeneral} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Trabajo en casa - fin</label>
                                        <input type="date" name="fecha_fin_trabajo_casa" value={general.fecha_fin_trabajo_casa} onChange={onChangeGeneral} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Diadema</label>
                                        <input type="text" name="diadema" value={general.diadema} onChange={onChangeGeneral} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Equipo de cómputo</label>
                                        <input type="text" name="equipo_computo" value={general.equipo_computo} onChange={onChangeGeneral} className="ai-input" />
                                    </div>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                    <input type="checkbox" name="ratificacion" checked={general.ratificacion} onChange={onChangeGeneral} />
                                    Ratificación
                                </label>
                                <div className="ai-field">
                                    <label className="ai-label">Observaciones</label>
                                    <textarea name="observaciones" value={general.observaciones} onChange={onChangeGeneral} rows={2} className="ai-input" style={{ height: 'auto', padding: '8px 12px' }} />
                                </div>

                                <div className="ai-form-grid" style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                    {bloqueEstado(anterior, onChangeAnterior, 'Estado anterior')}
                                    {bloqueEstado(nuevo, onChangeNuevo, 'Estado nuevo')}
                                </div>
                            </div>
                        </div>

                        <div className="ai-modal-foot">
                            <button type="button" onClick={onClose} className="ai-btn ai-btn--secondary">Cancelar</button>
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
