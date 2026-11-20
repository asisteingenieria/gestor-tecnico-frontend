import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { assetHistoryService } from '../services/api';
import HojaVidaModal from './HojaVidaModal';
import MantenimientoModal from './MantenimientoModal';
import { ALERTAS, textoAlerta } from '../utils/mantenimientoActivos';
import {
    Search,
    Cpu,
    HardDrive,
    Monitor,
    Server,
    Laptop,
    Printer,
    Tv,
    Save,
    AlertCircle,
    CheckCircle,
    RefreshCw,
    Edit3,
    X,
    Tag,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    User,
    Calendar,
    AlertTriangle,
    XCircle,
    Package,
    FileText,
    MapPin,
    Wrench
} from 'lucide-react';

const FILTROS_ALERTA = ['rojo', 'naranja', 'al_dia', 'sin_registro'];
const MIN_MOTIVO_BAJA = 10;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const TecnicoInventarioEdicion = () => {
    const [activos, setActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedActivo, setSelectedActivo] = useState(null);
    const [componentes, setComponentes] = useState([]);
    const [editingField, setEditingField] = useState(null);
    const [newValue, setNewValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingChange, setPendingChange] = useState(null);
    const [observaciones, setObservaciones] = useState([]);
    const [showObservaciones, setShowObservaciones] = useState(false);
    const [loadingObservaciones, setLoadingObservaciones] = useState(false);
    const [updatingEstado, setUpdatingEstado] = useState(false);
    const [filtroAlerta, setFiltroAlerta] = useState('');
    const [showMantenimiento, setShowMantenimiento] = useState(false);
    const [showHojaVida, setShowHojaVida] = useState(false);
    const [traslado, setTraslado] = useState(null); // { puesto, site } mientras el modal está abierto
    const [motivoBaja, setMotivoBaja] = useState(null); // texto mientras el modal de baja está abierto

    const conteoAlertas = useMemo(() => {
        const c = { rojo: 0, naranja: 0, al_dia: 0, sin_registro: 0 };
        activos.forEach((a) => { if (a.alerta_mantenimiento) c[a.alerta_mantenimiento.nivel] += 1; });
        return c;
    }, [activos]);

    const activosVisibles = filtroAlerta
        ? activos.filter((a) => a.alerta_mantenimiento?.nivel === filtroAlerta)
        : activos;
    const alertaSeleccionado = activos.find((a) => a.id === selectedActivo?.id)?.alerta_mantenimiento || null;

    // Cargar activos editables
    const fetchActivos = async (search = '') => {
        try {
            setLoading(true);
            const params = search ? `?numero_placa=${encodeURIComponent(search)}` : '';
            const response = await axios.get(`${API_BASE_URL}/activos-tecnico${params}`);
            setActivos(response.data.data || []);
        } catch (error) {
            console.error('Error al cargar activos:', error);
            setMessage({ type: 'error', text: 'Error al cargar los activos' });
        } finally {
            setLoading(false);
        }
    };

    // Cargar componentes de un activo
    const fetchComponentes = async (activoId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/activos-tecnico/${activoId}/componentes`);
            setSelectedActivo(response.data.activo);
            setComponentes(response.data.componentes);
            fetchObservaciones(activoId);
        } catch (error) {
            console.error('Error al cargar componentes:', error);
            setMessage({ type: 'error', text: 'Error al cargar los componentes del activo' });
        }
    };

    useEffect(() => {
        fetchActivos();
    }, []);

    // Buscar activos cuando cambia el término de búsqueda
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchActivos(searchTerm);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Obtener icono según tipo de activo
    const getAssetIcon = (tipoActivo) => {
        switch (tipoActivo) {
            case 'ECC-CPU': return <Monitor className="h-5 w-5 text-blue-500" />;
            case 'ECC-POR': return <Laptop className="h-5 w-5 text-purple-500" />;
            case 'ECC-SER': return <Server className="h-5 w-5 text-orange-500" />;
            case 'ECC-MON': return <Tv className="h-5 w-5 text-cyan-500" />;
            case 'ECC-IMP': return <Printer className="h-5 w-5 text-green-500" />;
            case 'ECC-TV':  return <Tv className="h-5 w-5 text-pink-500" />;
            default:        return <Package className="h-5 w-5 text-gray-500" />;
        }
    };

    // Obtener nombre amigable del tipo
    const getAssetTypeName = (tipoActivo) => {
        const names = {
            'ECC-CPU': 'Computadora',
            'ECC-POR': 'Portátil',
            'ECC-SER': 'Servidor',
            'ECC-MON': 'Monitor',
            'ECC-IMP': 'Impresora',
            'ECC-TV':  'Televisor',
            'OTHER':   'Otro'
        };
        return names[tipoActivo] || tipoActivo;
    };

    // Obtener icono del componente
    const getComponentIcon = (campo) => {
        switch (campo) {
            case 'cpu_procesador':
                return <Cpu className="h-4 w-4" />;
            case 'memoria_ram':
            case 'almacenamiento':
                return <HardDrive className="h-4 w-4" />;
            case 'sistema_operativo':
                return <Monitor className="h-4 w-4" />;
            case 'clasificacion':
                return <Tag className="h-4 w-4" />;
            default:
                return <Edit3 className="h-4 w-4" />;
        }
    };

    // Iniciar edición de un campo
    const startEditing = (campo, valorActual) => {
        setEditingField(campo);
        setNewValue(valorActual || '');
        setMessage({ type: '', text: '' });
    };

    // Cancelar edición
    const cancelEditing = () => {
        setEditingField(null);
        setNewValue('');
    };

    // Preparar para guardar (mostrar confirmación)
    const prepareToSave = () => {
        if (!newValue.trim()) {
            setMessage({ type: 'error', text: 'El valor no puede estar vacío' });
            return;
        }

        const componente = componentes.find(c => c.campo === editingField);
        if (componente && componente.valorActual === newValue.trim()) {
            setMessage({ type: 'error', text: 'El nuevo valor es igual al actual' });
            return;
        }

        setPendingChange({
            campo: editingField,
            label: componente?.label || editingField,
            valorAnterior: componente?.valorActual,
            valorNuevo: newValue.trim()
        });
        setShowConfirmModal(true);
    };

    // Guardar cambio
    const saveChange = async () => {
        if (!pendingChange) return;

        try {
            setSaving(true);
            const response = await axios.put(
                `${API_BASE_URL}/activos-tecnico/${selectedActivo.id}/componente`,
                {
                    campo: pendingChange.campo,
                    nuevoValor: pendingChange.valorNuevo
                }
            );

            setMessage({ type: 'success', text: response.data.msg });

            // Actualizar el componente localmente
            setComponentes(prev => prev.map(c =>
                c.campo === pendingChange.campo
                    ? { ...c, valorActual: pendingChange.valorNuevo }
                    : c
            ));

            // Actualizar la lista de activos
            setActivos(prev => prev.map(a =>
                a.id === selectedActivo.id
                    ? { ...a, [pendingChange.campo]: pendingChange.valorNuevo }
                    : a
            ));

            cancelEditing();
        } catch (error) {
            console.error('Error al guardar:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.msg || 'Error al guardar el cambio'
            });
        } finally {
            setSaving(false);
            setShowConfirmModal(false);
            setPendingChange(null);
        }
    };

    // Cargar observaciones de inventario
    const fetchObservaciones = async (activoId) => {
        try {
            setLoadingObservaciones(true);
            const response = await assetHistoryService.getObservaciones(activoId);
            setObservaciones(response.data.data || []);
        } catch (error) {
            console.error('Error al cargar observaciones:', error);
        } finally {
            setLoadingObservaciones(false);
        }
    };

    // Cambia el estado del activo (mantenimiento, bodega, funcional, pendiente_baja)
    const handleCambiarEstado = async (nuevoEstado) => {
        try {
            setUpdatingEstado(true);
            await assetHistoryService.actualizarEstadoMantenimiento(selectedActivo.id, nuevoEstado);
            setSelectedActivo(prev => ({ ...prev, estado: nuevoEstado }));
            setActivos(prev => prev.map(a => a.id === selectedActivo.id ? { ...a, estado: nuevoEstado } : a));
            const mensajes = {
                en_mantenimiento: 'Activo puesto en mantenimiento',
                funcional: 'Activo marcado como funcional',
                bodega: 'Activo enviado a bodega'
            };
            setMessage({ type: 'success', text: mensajes[nuevoEstado] || 'Estado actualizado' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.msg || 'Error al actualizar estado' });
        } finally {
            setUpdatingEstado(false);
        }
    };

    const actualizarActivoLocal = (cambios) => {
        setSelectedActivo((prev) => ({ ...prev, ...cambios }));
        setActivos((prev) => prev.map((a) => (a.id === selectedActivo.id ? { ...a, ...cambios } : a)));
    };

    // Mantenimiento guardado: refresca estado y alerta desde el servidor
    const handleMantenimientoGuardado = (respuesta) => {
        setShowMantenimiento(false);
        actualizarActivoLocal({ estado: respuesta.data.estado });
        setMessage({ type: 'success', text: respuesta.msg });
        fetchActivos(searchTerm);
    };

    const handleTrasladar = async () => {
        if (!traslado?.puesto?.trim()) return;
        try {
            setUpdatingEstado(true);
            const res = await assetHistoryService.trasladarPuesto(selectedActivo.id, traslado.puesto.trim(), traslado.site || '');
            actualizarActivoLocal({ puesto: res.data.data.puesto, site: res.data.data.site });
            setTraslado(null);
            setMessage({ type: 'success', text: res.data.msg });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.msg || 'Error al trasladar el equipo' });
        } finally {
            setUpdatingEstado(false);
        }
    };

    const handleSolicitarBaja = async () => {
        if ((motivoBaja || '').trim().length < MIN_MOTIVO_BAJA) return;
        try {
            setUpdatingEstado(true);
            const res = await assetHistoryService.solicitarBaja(selectedActivo.id, motivoBaja.trim());
            actualizarActivoLocal({ estado: 'pendiente_baja' });
            setMotivoBaja(null);
            setMessage({ type: 'success', text: res.data.msg });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.msg || 'Error al solicitar la baja' });
        } finally {
            setUpdatingEstado(false);
        }
    };

    const handleCancelarBaja = async () => {
        if (!window.confirm(`¿Cancelar la solicitud de baja de ${selectedActivo.numero_placa}?`)) return;
        try {
            setUpdatingEstado(true);
            const res = await assetHistoryService.cancelarSolicitudBaja(selectedActivo.id);
            actualizarActivoLocal({ estado: res.data.data.estado });
            setMessage({ type: 'success', text: res.data.msg });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.msg || 'Error al cancelar la solicitud' });
        } finally {
            setUpdatingEstado(false);
        }
    };

    // Formatear fecha
    const formatFecha = (fecha) => {
        return new Date(fecha).toLocaleString('es-CR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Edición de Componentes de Hardware</h1>
                <p className="text-gray-600">Busque activos por número de placa y edite sus componentes</p>
            </div>

            {/* Mensaje de estado */}
            {message.text && (
                <div className={`mb-4 p-4 rounded-lg flex items-center ${
                    message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}>
                    {message.type === 'error' ? (
                        <AlertCircle className="h-5 w-5 mr-2" />
                    ) : (
                        <CheckCircle className="h-5 w-5 mr-2" />
                    )}
                    {message.text}
                    <button
                        onClick={() => setMessage({ type: '', text: '' })}
                        className="ml-auto"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel de búsqueda y lista */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Buscar Activo</h2>

                    {/* Buscador */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por número de placa (ej: ECC-CPU-001, ECC-MON-001...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>

                    {/* Refrescar */}
                    <button
                        onClick={() => fetchActivos(searchTerm)}
                        className="mb-4 flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refrescar lista
                    </button>

                    {/* Alertas de mantenimiento preventivo (computadores, portátiles y servidores) */}
                    <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Mantenimiento preventivo (naranja: 3+ meses · rojo: 6+ meses)</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFiltroAlerta('')}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${filtroAlerta === '' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                Todos ({activos.length})
                            </button>
                            {FILTROS_ALERTA.map((nivel) => (
                                <button
                                    key={nivel}
                                    onClick={() => setFiltroAlerta(filtroAlerta === nivel ? '' : nivel)}
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ALERTAS[nivel].badge} ${filtroAlerta === nivel ? 'ring-2 ring-offset-1 ring-gray-500' : ''}`}
                                >
                                    <span className={`h-2 w-2 rounded-full mr-1.5 ${ALERTAS[nivel].punto}`} />
                                    {ALERTAS[nivel].corto} ({conteoAlertas[nivel]})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lista de activos */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                                <p className="mt-2 text-gray-500">Cargando activos...</p>
                            </div>
                        ) : activosVisibles.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Cpu className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                <p>No se encontraron activos</p>
                                <p className="text-sm">Busca por número de placa</p>
                            </div>
                        ) : (
                            activosVisibles.map((activo) => (
                                <button
                                    key={activo.id}
                                    onClick={() => fetchComponentes(activo.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                        selectedActivo?.id === activo.id
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        {getAssetIcon(activo.tipo_activo)}
                                        <div className="ml-3 flex-1">
                                            <div className="font-medium text-gray-900">{activo.numero_placa}</div>
                                            <div className="text-sm text-gray-500">
                                                {getAssetTypeName(activo.tipo_activo)} • {activo.ubicacion}
                                                {activo.puesto ? ` • Puesto ${activo.puesto}` : ''}
                                            </div>
                                        </div>
                                        {activo.alerta_mantenimiento && (
                                            <span
                                                title={textoAlerta(activo.alerta_mantenimiento)}
                                                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${ALERTAS[activo.alerta_mantenimiento.nivel].badge}`}
                                            >
                                                {ALERTAS[activo.alerta_mantenimiento.nivel].corto}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Panel de edición de componentes */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Componentes</h2>

                    {!selectedActivo ? (
                        <div className="text-center py-12 text-gray-500">
                            <Edit3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p>Seleccione un activo para editar sus componentes</p>
                        </div>
                    ) : (
                        <>
                            {/* Info del activo seleccionado */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex items-center mb-2">
                                    {getAssetIcon(selectedActivo.tipo_activo)}
                                    <span className="ml-2 font-semibold text-gray-900">
                                        {selectedActivo.numero_placa}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>Tipo:</strong> {getAssetTypeName(selectedActivo.tipo_activo)}</p>
                                    {selectedActivo.marca_modelo && (
                                        <p><strong>Marca/Modelo:</strong> {selectedActivo.marca_modelo}</p>
                                    )}
                                    <p><strong>Ubicación:</strong> {selectedActivo.ubicacion}</p>
                                    {selectedActivo.site && (
                                        <p><strong>Site:</strong> {selectedActivo.site}</p>
                                    )}
                                    <p><strong>Puesto:</strong> {selectedActivo.puesto || 'Sin puesto'}</p>
                                    {selectedActivo.asignado && (
                                        <p><strong>Asignado a:</strong> {selectedActivo.asignado}</p>
                                    )}
                                    <p>
                                        <strong>Estado:</strong>{' '}
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                            selectedActivo.estado === 'funcional' ? 'bg-green-100 text-green-800' :
                                            selectedActivo.estado === 'en_mantenimiento' ? 'bg-yellow-100 text-yellow-800' :
                                            selectedActivo.estado === 'en_reparacion' ? 'bg-orange-100 text-orange-800' :
                                            selectedActivo.estado === 'bodega' ? 'bg-indigo-100 text-indigo-800' :
                                            selectedActivo.estado === 'dado_de_baja' ? 'bg-red-100 text-red-800' :
                                            selectedActivo.estado === 'pendiente_baja' ? 'bg-amber-100 text-amber-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {selectedActivo.estado === 'pendiente_baja' ? 'Baja pendiente (admin)' : selectedActivo.estado || 'funcional'}
                                        </span>
                                    </p>
                                    {alertaSeleccionado && (
                                        <p className={`mt-2 px-2 py-1.5 rounded border text-xs ${ALERTAS[alertaSeleccionado.nivel].badge}`}>
                                            <strong>{ALERTAS[alertaSeleccionado.nivel].label}</strong> · {textoAlerta(alertaSeleccionado)}
                                        </p>
                                    )}
                                    {componentes.find(c => c.campo === 'clasificacion') && (
                                        <p>
                                            <strong>Clasificación:</strong>{' '}
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                                componentes.find(c => c.campo === 'clasificacion')?.valorActual === 'Activo productivo'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {componentes.find(c => c.campo === 'clasificacion')?.valorActual || 'No especificada'}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Hoja de vida y traslado de puesto */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button
                                    onClick={() => setShowHojaVida(true)}
                                    className="flex items-center justify-center px-3 py-2 border border-emerald-300 text-emerald-700 bg-white rounded-lg hover:bg-emerald-50 text-sm font-medium"
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Hoja de vida
                                </button>
                                <button
                                    onClick={() => setTraslado({ puesto: selectedActivo.puesto || '', site: selectedActivo.site || '' })}
                                    disabled={selectedActivo.estado === 'dado_de_baja'}
                                    className="flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                                >
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Cambiar de puesto
                                </button>
                            </div>

                            {/* Botones de mantenimiento */}
                            {selectedActivo.estado === 'en_mantenimiento' ? (
                                <button
                                    onClick={() => setShowMantenimiento(true)}
                                    className="w-full mb-4 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    <ClipboardList className="h-5 w-5 mr-2" />
                                    Finalizar Mantenimiento
                                </button>
                            ) : (
                                <>
                                <button
                                    onClick={() => handleCambiarEstado('en_mantenimiento')}
                                    disabled={updatingEstado || selectedActivo.estado === 'dado_de_baja' || selectedActivo.estado === 'bodega' || selectedActivo.estado === 'pendiente_baja'}
                                    className="w-full mb-4 flex items-center justify-center px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
                                >
                                    {updatingEstado ? (
                                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                    ) : (
                                        <ClipboardList className="h-5 w-5 mr-2" />
                                    )}
                                    Iniciar Mantenimiento
                                </button>
                                {!['dado_de_baja', 'pendiente_baja'].includes(selectedActivo.estado) && (
                                    <button
                                        onClick={() => setShowMantenimiento(true)}
                                        className="w-full -mt-2 mb-4 flex items-center justify-center px-4 py-2 border border-emerald-300 text-emerald-700 bg-white rounded-lg hover:bg-emerald-50 text-sm font-medium"
                                    >
                                        <Wrench className="h-4 w-4 mr-2" />
                                        Registrar mantenimiento ya realizado
                                    </button>
                                )}
                                </>
                            )}

                            {/* Botón de Bodega */}
                            {selectedActivo.estado === 'bodega' ? (
                                <button
                                    onClick={() => handleCambiarEstado('funcional')}
                                    disabled={updatingEstado}
                                    className="w-full mb-4 flex items-center justify-center px-4 py-2 border border-indigo-300 text-indigo-700 bg-white rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors text-sm font-medium"
                                >
                                    {updatingEstado ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Tag className="h-4 w-4 mr-2" />}
                                    Sacar de Bodega
                                </button>
                            ) : selectedActivo.estado !== 'dado_de_baja' && selectedActivo.estado !== 'en_mantenimiento' && selectedActivo.estado !== 'pendiente_baja' && (
                                <button
                                    onClick={() => handleCambiarEstado('bodega')}
                                    disabled={updatingEstado}
                                    className="w-full mb-4 flex items-center justify-center px-4 py-2 border border-indigo-300 text-indigo-700 bg-white rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors text-sm font-medium"
                                >
                                    {updatingEstado ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Tag className="h-4 w-4 mr-2" />}
                                    Enviar a Bodega
                                </button>
                            )}

                            {/* Solicitar / Cancelar baja */}
                            {selectedActivo.estado === 'pendiente_baja' ? (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-300 rounded-lg mb-2">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                        <span className="text-sm text-amber-800 font-medium">
                                            Baja solicitada — pendiente de aprobación del administrador
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleCancelarBaja}
                                        disabled={updatingEstado}
                                        className="w-full flex items-center justify-center px-4 py-2 border border-amber-400 text-amber-700 bg-white rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors text-sm font-medium"
                                    >
                                        {updatingEstado ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                                        Cancelar Solicitud de Baja
                                    </button>
                                </div>
                            ) : selectedActivo.estado !== 'dado_de_baja' && selectedActivo.estado !== 'en_mantenimiento' && selectedActivo.estado !== 'bodega' && (
                                <button
                                    onClick={() => setMotivoBaja('')}
                                    disabled={updatingEstado}
                                    className="w-full mb-4 flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 bg-white rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors text-sm font-medium"
                                >
                                    {updatingEstado ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                    Solicitar Dar de Baja
                                </button>
                            )}

                            {/* Historial de observaciones */}
                            {observaciones.length > 0 && (
                                <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setShowObservaciones(!showObservaciones)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-gray-700">
                                            Observaciones de mantenimiento ({observaciones.length})
                                        </span>
                                        {showObservaciones ? (
                                            <ChevronUp className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-gray-500" />
                                        )}
                                    </button>
                                    {showObservaciones && (
                                        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                                            {loadingObservaciones ? (
                                                <div className="text-center py-4">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                                                </div>
                                            ) : (
                                                observaciones.map((obs) => (
                                                    <div key={obs.id} className="px-4 py-3">
                                                        <div className="flex items-center text-xs text-gray-500 mb-1 space-x-3">
                                                            <span className="flex items-center">
                                                                <User className="h-3 w-3 mr-1" />
                                                                {obs.realizadoPor}
                                                            </span>
                                                            <span className="flex items-center">
                                                                <Calendar className="h-3 w-3 mr-1" />
                                                                {formatFecha(obs.fecha)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{obs.observaciones}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Lista de componentes editables */}
                            <div className="space-y-3">
                                {componentes.map((comp) => (
                                    <div key={comp.campo} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center text-gray-700">
                                                {getComponentIcon(comp.campo)}
                                                <span className="ml-2 font-medium">{comp.label}</span>
                                            </div>
                                            {editingField !== comp.campo && (
                                                <button
                                                    onClick={() => startEditing(comp.campo, comp.valorActual)}
                                                    className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center"
                                                >
                                                    <Edit3 className="h-4 w-4 mr-1" />
                                                    Editar
                                                </button>
                                            )}
                                        </div>

                                        {editingField === comp.campo ? (
                                            <div className="space-y-2">
                                                {comp.campo === 'clasificacion' ? (
                                                    <select
                                                        value={newValue}
                                                        onChange={(e) => setNewValue(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                        autoFocus
                                                    >
                                                        <option value="Activo productivo">Activo productivo</option>
                                                        <option value="Activo no productivo">Activo no productivo</option>
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={newValue}
                                                        onChange={(e) => setNewValue(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                        placeholder={`Nuevo valor para ${comp.label}`}
                                                        autoFocus
                                                    />
                                                )}
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={prepareToSave}
                                                        disabled={saving}
                                                        className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Guardar
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className={`${comp.valorActual ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                                                {comp.valorActual || 'No especificado'}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showMantenimiento && selectedActivo && (
                <MantenimientoModal
                    activo={selectedActivo}
                    onClose={() => setShowMantenimiento(false)}
                    onGuardado={handleMantenimientoGuardado}
                />
            )}

            {showHojaVida && selectedActivo && (
                <HojaVidaModal activoId={selectedActivo.id} onClose={() => setShowHojaVida(false)} />
            )}

            {/* Modal de traslado de puesto */}
            {traslado && selectedActivo && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Cambiar de puesto · {selectedActivo.numero_placa}</h3>
                            <button onClick={() => setTraslado(null)} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                            Puesto actual: <strong>{selectedActivo.puesto || 'Sin puesto'}</strong>
                            {selectedActivo.site ? ` (${selectedActivo.site})` : ''}
                        </p>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo puesto *</label>
                        <input
                            type="text"
                            value={traslado.puesto}
                            onChange={(e) => setTraslado((t) => ({ ...t, puesto: e.target.value }))}
                            maxLength={50}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-3"
                            placeholder="Ej: 106"
                            autoFocus
                        />
                        <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                        <select
                            value={traslado.site}
                            onChange={(e) => setTraslado((t) => ({ ...t, site: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="">Sin site</option>
                            <option value="Site A">Site A</option>
                            <option value="Site B">Site B</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-3">El traslado queda registrado en la hoja de vida con su nombre y la fecha.</p>
                        <div className="flex space-x-3 mt-4">
                            <button
                                onClick={handleTrasladar}
                                disabled={updatingEstado || !traslado.puesto.trim()}
                                className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {updatingEstado ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Guardar traslado
                            </button>
                            <button onClick={() => setTraslado(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de solicitud de baja con observación */}
            {motivoBaja !== null && selectedActivo && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Solicitar baja · {selectedActivo.numero_placa}</h3>
                            <button onClick={() => setMotivoBaja(null)} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                            La solicitud va al <strong>administrador</strong>, que la aprueba o la rechaza. Explique por qué se debe dar de baja el equipo.
                        </p>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observación *</label>
                        <textarea
                            value={motivoBaja}
                            onChange={(e) => setMotivoBaja(e.target.value)}
                            rows={5}
                            maxLength={2000}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400"
                            placeholder="Ej: board quemada, no enciende; no hay repuesto disponible..."
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1">Mínimo {MIN_MOTIVO_BAJA} caracteres.</p>
                        <div className="flex space-x-3 mt-4">
                            <button
                                onClick={handleSolicitarBaja}
                                disabled={updatingEstado || motivoBaja.trim().length < MIN_MOTIVO_BAJA}
                                className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {updatingEstado ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                Enviar solicitud
                            </button>
                            <button onClick={() => setMotivoBaja(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación */}
            {showConfirmModal && pendingChange && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Cambio</h3>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Campo:</strong> {pendingChange.label}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Valor anterior:</strong>{' '}
                                <span className="text-red-600">{pendingChange.valorAnterior || 'Sin valor'}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                                <strong>Nuevo valor:</strong>{' '}
                                <span className="text-green-600">{pendingChange.valorNuevo}</span>
                            </p>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            Este cambio quedará registrado en el historial del activo.
                        </p>

                        <div className="flex space-x-3">
                            <button
                                onClick={saveChange}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Confirmar
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setPendingChange(null);
                                }}
                                disabled={saving}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TecnicoInventarioEdicion;
