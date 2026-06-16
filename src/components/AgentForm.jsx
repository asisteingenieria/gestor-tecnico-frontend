import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Save } from 'lucide-react';

const CATALOGOS_VACIOS = {
    tipos_identificacion: [],
    estados_civiles: [],
    grupos_sanguineos: [],
    generos: [],
    ciudades: [],
    campanias: [],
    areas: [],
    centros_costo: [],
    cargos: [],
    tipos_contrato: [],
    modalidades: [],
    oleadas: [],
    estados_contrato: [],
    entidades_eps: [],
    entidades_arl: [],
    entidades_afp: [],
    entidades_cesantias: [],
    entidades_caja: [],
    bancos: [],
    tipos_cuenta: [],
    tipos_direccion: [],
    parentescos: [],
    empleados: []
};

const fecha = (v) => (v ? String(v).substring(0, 10) : '');

const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const sectionClass = "text-sm font-semibold text-indigo-700 uppercase tracking-wider pt-4 border-t border-gray-100";

const AgentForm = ({ isOpen, onClose, agente = null, onSuccess }) => {
    const [personal, setPersonal] = useState({
        tipo_identificacion_id: '',
        numero_identificacion: '',
        fecha_expedicion: '',
        ciudad_expedicion_id: '',
        primer_nombre: '',
        segundo_nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        fecha_nacimiento: '',
        ciudad_nacimiento_id: '',
        numero_hijos: 0,
        estado_civil_id: '',
        grupo_sanguineo_id: '',
        genero_id: '',
        email: '',
        telefono: '',
        usuario_ssff: ''
    });
    const [contrato, setContrato] = useState({
        campania_id: '',
        area_id: '',
        centro_costo_id: '',
        cargo_id: '',
        tipo_contrato_id: '',
        modalidad_id: '',
        oleada_id: '',
        ciudad_id: '',
        estado_contrato_id: '',
        jefe_inmediato_id: '',
        fecha_ingreso: '',
        fecha_fin_periodo_prueba: '',
        fecha_fin_contrato: '',
        observaciones: ''
    });
    const [salario, setSalario] = useState({ salario: '', bono_no_prestacional: '', bono_cafeteria: '' });
    const [segSocial, setSegSocial] = useState({ eps_id: '', arl_id: '', afp_id: '', cesantias_id: '', caja_id: '', tarifa_arl: '' });
    const [cuenta, setCuenta] = useState({ banco_id: '', tipo_cuenta_id: '', numero_cuenta: '' });
    const [direccion, setDireccion] = useState({ tipo_direccion_id: '', direccion: '', barrio: '', ciudad_id: '' });
    const [contactoEmergencia, setContactoEmergencia] = useState({ nombre: '', telefono: '', parentesco_id: '' });

    const [catalogos, setCatalogos] = useState(CATALOGOS_VACIOS);
    const [loadingData, setLoadingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargar = async () => {
            setLoadingData(true);
            try {
                const catRes = await api.get('/users-company/catalogos');
                setCatalogos(catRes.data.catalogos);

                if (agente) {
                    const empRes = await api.get(`/users-company/${agente.id}`);
                    const e = empRes.data.empleado;

                    setPersonal({
                        tipo_identificacion_id: e.tipo_identificacion_idtipo_identificacion || '',
                        numero_identificacion: e.numero_identificacion || '',
                        fecha_expedicion: fecha(e.fecha_expedicion),
                        ciudad_expedicion_id: e.ciudad_expedicion_id || '',
                        primer_nombre: e.primer_nombre || '',
                        segundo_nombre: e.segundo_nombre || '',
                        primer_apellido: e.primer_apellido || '',
                        segundo_apellido: e.segundo_apellido || '',
                        fecha_nacimiento: fecha(e.fecha_nacimiento),
                        ciudad_nacimiento_id: e.ciudad_nacimiento_id || '',
                        numero_hijos: e.numero_hijos ?? 0,
                        estado_civil_id: e.estado_civil_idestado_civil || '',
                        grupo_sanguineo_id: e.grupo_sanguineo_idgrupo_sanguineo || '',
                        genero_id: e.genero_idgenero || '',
                        email: e.email || '',
                        telefono: e.telefono || '',
                        usuario_ssff: e.usuario_ssff || ''
                    });
                    if (e.contrato) {
                        setContrato({
                            campania_id: e.contrato.campania_idcampania || '',
                            area_id: e.contrato.area_idarea || '',
                            centro_costo_id: e.contrato.centro_costo_idcentro_costo || '',
                            cargo_id: e.contrato.cargo_idcargo || '',
                            tipo_contrato_id: e.contrato.tipo_contrato_idtipo_contrato || '',
                            modalidad_id: e.contrato.modalidad_idmodalidad || '',
                            oleada_id: e.contrato.oleada_idoleada || '',
                            ciudad_id: e.contrato.ciudad_idciudad || '',
                            estado_contrato_id: e.contrato.estado_contrato_idestado_contrato || '',
                            jefe_inmediato_id: e.contrato.jefe_inmediato_id || '',
                            fecha_ingreso: fecha(e.contrato.fecha_ingreso),
                            fecha_fin_periodo_prueba: fecha(e.contrato.fecha_fin_periodo_prueba),
                            fecha_fin_contrato: fecha(e.contrato.fecha_fin_contrato),
                            observaciones: e.contrato.observaciones || ''
                        });
                    }
                    if (e.salario_actual) {
                        setSalario({
                            salario: e.salario_actual.salario ?? '',
                            bono_no_prestacional: e.salario_actual.bono_no_prestacional ?? '',
                            bono_cafeteria: e.salario_actual.bono_cafeteria ?? ''
                        });
                    }
                    if (e.seguridad_social) {
                        setSegSocial({
                            eps_id: e.seguridad_social.eps_id || '',
                            arl_id: e.seguridad_social.arl_id || '',
                            afp_id: e.seguridad_social.afp_id || '',
                            cesantias_id: e.seguridad_social.cesantias_id || '',
                            caja_id: e.seguridad_social.caja_id || '',
                            tarifa_arl: e.seguridad_social.tarifa_arl ?? ''
                        });
                    }
                    if (e.cuenta_bancaria) {
                        setCuenta({
                            banco_id: e.cuenta_bancaria.banco_idbanco || '',
                            tipo_cuenta_id: e.cuenta_bancaria.tipo_cuenta_idtipo_cuenta || '',
                            numero_cuenta: e.cuenta_bancaria.numero_cuenta || ''
                        });
                    }
                    if (e.direccion) {
                        setDireccion({
                            tipo_direccion_id: e.direccion.tipo_direccion_idtipo_direccion || '',
                            direccion: e.direccion.direccion || '',
                            barrio: e.direccion.barrio || '',
                            ciudad_id: e.direccion.ciudad_idciudad || ''
                        });
                    }
                    if (e.contacto_emergencia) {
                        setContactoEmergencia({
                            nombre: e.contacto_emergencia.nombre || '',
                            telefono: e.contacto_emergencia.telefono || '',
                            parentesco_id: e.contacto_emergencia.parentesco_idparentesco || ''
                        });
                    }
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
    }, [agente]);

    const onChange = (setter) => (e) => {
        const { name, value } = e.target;
        setter(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            ...personal,
            numero_hijos: personal.numero_hijos !== '' ? parseInt(personal.numero_hijos, 10) : 0,
            contrato,
            salario: {
                salario: salario.salario !== '' ? parseFloat(salario.salario) : null,
                bono_no_prestacional: salario.bono_no_prestacional !== '' ? parseFloat(salario.bono_no_prestacional) : 0,
                bono_cafeteria: salario.bono_cafeteria !== '' ? parseFloat(salario.bono_cafeteria) : 0
            },
            seguridad_social: segSocial,
            cuenta_bancaria: cuenta,
            direccion,
            contacto_emergencia: contactoEmergencia
        };

        try {
            let response;
            if (agente) {
                response = await api.put(`/users-company/${agente.id}`, payload);
            } else {
                response = await api.post('/users-company', payload);
            }

            if (response.data.success) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error('Error al guardar empleado:', err);
            if (err.response?.data?.type === 'DUPLICATE_IDENTIFICACION') {
                setError(`❌ ${err.response.data.message}`);
            } else {
                setError(err.response?.data?.message || err.message || 'Error al guardar el empleado');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectField = (label, name, value, handler, options, { required = false, render = (o) => o.nombre } = {}) => (
        <div>
            <label className={labelClass}>{label}{required && ' *'}</label>
            <select name={name} value={value} onChange={handler} required={required} className={inputClass}>
                <option value="">{required ? 'Seleccionar...' : 'Sin especificar'}</option>
                {options.map(o => <option key={o.id} value={o.id}>{render(o)}</option>)}
            </select>
        </div>
    );

    const textField = (label, name, value, handler, { required = false, type = 'text', placeholder = '', min, step } = {}) => (
        <div>
            <label className={labelClass}>{label}{required && ' *'}</label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={handler}
                required={required}
                min={min}
                step={step}
                placeholder={placeholder}
                className={inputClass}
            />
        </div>
    );

    const empleadosJefe = catalogos.empleados.filter(emp => !agente || emp.id !== agente.id);

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {agente ? 'Editar Empleado' : 'Nuevo Empleado'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {loadingData ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6">
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* ============ IDENTIFICACIÓN ============ */}
                            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">Identificación</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {selectField('Tipo', 'tipo_identificacion_id', personal.tipo_identificacion_id, onChange(setPersonal), catalogos.tipos_identificacion, { required: true, render: o => `${o.nombre} (${o.codigo})` })}
                                {textField('Número', 'numero_identificacion', personal.numero_identificacion, onChange(setPersonal), { required: true, placeholder: 'Número de identificación' })}
                                {textField('Fecha de expedición', 'fecha_expedicion', personal.fecha_expedicion, onChange(setPersonal), { type: 'date' })}
                                {selectField('Ciudad de expedición', 'ciudad_expedicion_id', personal.ciudad_expedicion_id, onChange(setPersonal), catalogos.ciudades)}
                            </div>

                            {/* ============ DATOS PERSONALES ============ */}
                            <h3 className={sectionClass}>Datos personales</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {textField('Primer nombre', 'primer_nombre', personal.primer_nombre, onChange(setPersonal), { required: true })}
                                {textField('Segundo nombre', 'segundo_nombre', personal.segundo_nombre, onChange(setPersonal))}
                                {textField('Primer apellido', 'primer_apellido', personal.primer_apellido, onChange(setPersonal), { required: true })}
                                {textField('Segundo apellido', 'segundo_apellido', personal.segundo_apellido, onChange(setPersonal))}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {textField('Fecha de nacimiento', 'fecha_nacimiento', personal.fecha_nacimiento, onChange(setPersonal), { type: 'date' })}
                                {selectField('Ciudad de nacimiento', 'ciudad_nacimiento_id', personal.ciudad_nacimiento_id, onChange(setPersonal), catalogos.ciudades)}
                                {selectField('Género', 'genero_id', personal.genero_id, onChange(setPersonal), catalogos.generos)}
                                {selectField('Estado civil', 'estado_civil_id', personal.estado_civil_id, onChange(setPersonal), catalogos.estados_civiles)}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {selectField('Grupo sanguíneo', 'grupo_sanguineo_id', personal.grupo_sanguineo_id, onChange(setPersonal), catalogos.grupos_sanguineos)}
                                {textField('Número de hijos', 'numero_hijos', personal.numero_hijos, onChange(setPersonal), { type: 'number', min: 0 })}
                                {textField('Correo electrónico', 'email', personal.email, onChange(setPersonal), { type: 'email', placeholder: 'correo@empresa.com' })}
                                {textField('Teléfono', 'telefono', personal.telefono, onChange(setPersonal), { type: 'tel', placeholder: 'Ej: 3001234567' })}
                            </div>

                            {/* ============ DIRECCIÓN ============ */}
                            <h3 className={sectionClass}>Dirección</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {selectField('Tipo de dirección', 'tipo_direccion_id', direccion.tipo_direccion_id, onChange(setDireccion), catalogos.tipos_direccion)}
                                {textField('Dirección', 'direccion', direccion.direccion, onChange(setDireccion), { placeholder: 'Ej: Cra 10 # 20-30' })}
                                {textField('Barrio', 'barrio', direccion.barrio, onChange(setDireccion))}
                                {selectField('Ciudad', 'ciudad_id', direccion.ciudad_id, onChange(setDireccion), catalogos.ciudades)}
                            </div>

                            {/* ============ CONTRATO ============ */}
                            <h3 className={sectionClass}>Contrato</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {selectField('Campaña', 'campania_id', contrato.campania_id, onChange(setContrato), catalogos.campanias, { required: true, render: o => `${o.nombre} (${o.cliente_nombre})` })}
                                {selectField('Área', 'area_id', contrato.area_id, onChange(setContrato), catalogos.areas, { required: true })}
                                {selectField('Centro de costo', 'centro_costo_id', contrato.centro_costo_id, onChange(setContrato), catalogos.centros_costo, { required: true, render: o => `${o.codigo} — ${o.nombre}` })}
                                {selectField('Cargo', 'cargo_id', contrato.cargo_id, onChange(setContrato), catalogos.cargos, { required: true })}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {selectField('Tipo de contrato', 'tipo_contrato_id', contrato.tipo_contrato_id, onChange(setContrato), catalogos.tipos_contrato, { required: true })}
                                {selectField('Modalidad', 'modalidad_id', contrato.modalidad_id, onChange(setContrato), catalogos.modalidades, { required: true })}
                                {selectField('Oleada', 'oleada_id', contrato.oleada_id, onChange(setContrato), catalogos.oleadas, { required: true })}
                                {selectField('Ciudad de trabajo', 'ciudad_id', contrato.ciudad_id, onChange(setContrato), catalogos.ciudades, { required: true })}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {textField('Fecha de ingreso', 'fecha_ingreso', contrato.fecha_ingreso, onChange(setContrato), { type: 'date', required: true })}
                                {textField('Fin periodo de prueba', 'fecha_fin_periodo_prueba', contrato.fecha_fin_periodo_prueba, onChange(setContrato), { type: 'date' })}
                                {textField('Fin de contrato', 'fecha_fin_contrato', contrato.fecha_fin_contrato, onChange(setContrato), { type: 'date' })}
                                {selectField('Estado del contrato', 'estado_contrato_id', contrato.estado_contrato_id, onChange(setContrato), catalogos.estados_contrato)}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectField('Jefe inmediato', 'jefe_inmediato_id', contrato.jefe_inmediato_id, onChange(setContrato), empleadosJefe, { render: o => o.nombre_completo })}
                                {textField('Observaciones', 'observaciones', contrato.observaciones, onChange(setContrato))}
                            </div>

                            {/* ============ SALARIO ============ */}
                            <h3 className={sectionClass}>Salario</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {textField('Salario mensual', 'salario', salario.salario, onChange(setSalario), { type: 'number', required: true, min: 0, step: '0.01', placeholder: '0.00' })}
                                {textField('Bono no prestacional', 'bono_no_prestacional', salario.bono_no_prestacional, onChange(setSalario), { type: 'number', min: 0, step: '0.01', placeholder: '0.00' })}
                                {textField('Bono cafetería', 'bono_cafeteria', salario.bono_cafeteria, onChange(setSalario), { type: 'number', min: 0, step: '0.01', placeholder: '0.00' })}
                            </div>

                            {/* ============ SEGURIDAD SOCIAL ============ */}
                            <h3 className={sectionClass}>Seguridad social</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {selectField('EPS', 'eps_id', segSocial.eps_id, onChange(setSegSocial), catalogos.entidades_eps)}
                                {selectField('ARL', 'arl_id', segSocial.arl_id, onChange(setSegSocial), catalogos.entidades_arl)}
                                {textField('Tarifa ARL (%)', 'tarifa_arl', segSocial.tarifa_arl, onChange(setSegSocial), { type: 'number', min: 0, step: '0.00001', placeholder: 'Ej: 0.522' })}
                                {selectField('Fondo de pensiones (AFP)', 'afp_id', segSocial.afp_id, onChange(setSegSocial), catalogos.entidades_afp)}
                                {selectField('Fondo de cesantías', 'cesantias_id', segSocial.cesantias_id, onChange(setSegSocial), catalogos.entidades_cesantias)}
                                {selectField('Caja de compensación', 'caja_id', segSocial.caja_id, onChange(setSegSocial), catalogos.entidades_caja)}
                            </div>

                            {/* ============ CUENTA BANCARIA ============ */}
                            <h3 className={sectionClass}>Cuenta bancaria</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {selectField('Banco', 'banco_id', cuenta.banco_id, onChange(setCuenta), catalogos.bancos)}
                                {selectField('Tipo de cuenta', 'tipo_cuenta_id', cuenta.tipo_cuenta_id, onChange(setCuenta), catalogos.tipos_cuenta)}
                                {textField('Número de cuenta', 'numero_cuenta', cuenta.numero_cuenta, onChange(setCuenta), { placeholder: 'Número de cuenta' })}
                            </div>

                            {/* ============ CONTACTO DE EMERGENCIA ============ */}
                            <h3 className={sectionClass}>Contacto de emergencia</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {textField('Nombre', 'nombre', contactoEmergencia.nombre, onChange(setContactoEmergencia), { placeholder: 'Nombre completo' })}
                                {textField('Teléfono', 'telefono', contactoEmergencia.telefono, onChange(setContactoEmergencia), { type: 'tel', placeholder: 'Ej: 3001234567' })}
                                {selectField('Parentesco', 'parentesco_id', contactoEmergencia.parentesco_id, onChange(setContactoEmergencia), catalogos.parentescos)}
                            </div>

                            {/* ============ OTROS ============ */}
                            <h3 className={sectionClass}>Otros</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {textField('Usuario SSFF', 'usuario_ssff', personal.usuario_ssff, onChange(setPersonal), { placeholder: 'Usuario en SuccessFactors' })}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        {agente ? 'Actualizar' : 'Crear'} Empleado
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AgentForm;
