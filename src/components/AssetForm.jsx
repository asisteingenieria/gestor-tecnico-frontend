import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';
import { X, Upload, Calendar, Building, User, Tag, FileText, Save } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const AssetForm = ({ isOpen, onClose, activo = null, onSuccess }) => {
    const [formData, setFormData] = useState({
        numero_placa: '',
        centro_costes: 1,
        ubicacion: 'Claro',
        responsable: 'David Acero',
        proveedor: '',
        valor: '',
        fecha_compra: '',
        numero_social: '',
        poliza: '',
        aseguradora: '',
        garantia: 'No',
        fecha_vencimiento_garantia: '',
        orden_compra: '',
        clasificacion: 'Activo no productivo',
        clasificacion_activo_fijo: '',
        adjunto_archivo: null,
        // Campo Site
        site: 'Site A',
        // Campo Puesto
        puesto: '',
        // Campo Asignado
        asignado: '',
        // Nuevos campos dinámicos
        marca_modelo: '',
        numero_serie_fabricante: '',
        cpu_procesador: '',
        memoria_ram: '',
        almacenamiento: '',
        sistema_operativo: '',
        pulgadas: '',
        estado: 'funcional',
        agente_id: ''
    });

    const [responsables, setResponsables] = useState([]);
    const [agentes, setAgentes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');
    const [assetType, setAssetType] = useState('');

    const calcularTipo = (valor) => {
        if (valor === '' || valor === null || valor === undefined) return null;
        return parseFloat(valor) >= 400000 ? 'activo' : 'gasto';
    };

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        return dateStr.split('T')[0];
    };

    const ubicaciones = [
        'Claro', 'Obama', 'IT', 'Contratación', 'Reclutamiento', 'Selección', 'Finanzas'
    ];

    const clasificaciones = [
        'Activo productivo', 'Activo no productivo'
    ];

    const sites = [
        'Site A', 'Site B'
    ];

    const estados = [
        'funcional', 'en_reparacion', 'dado_de_baja', 'en_mantenimiento', 
        'disponible', 'asignado', 'fuera_de_servicio'
    ];

    // Función para detectar el tipo de activo basado en el número de placa
    // Patrón esperado: ECC-CPU-001 o ECC'CPU'001 (pistola códigos lee guión como comilla)
    const detectAssetType = (numeroPlaca) => {
        if (!numeroPlaca) return '';
        
        // Convertir a mayúsculas para comparación
        const placa = numeroPlaca.toUpperCase();
        
        // Detectar patrones con guión o comilla simple y consecutivo
        if (placa.match(/^ECC[-']CPU[-']\d+$/)) return 'ECC-CPU';
        if (placa.match(/^ECC[-']SER[-']\d+$/)) return 'ECC-SER';
        if (placa.match(/^ECC[-']MON[-']\d+$/)) return 'ECC-MON';
        if (placa.match(/^ECC[-']IMP[-']\d+$/)) return 'ECC-IMP';
        if (placa.match(/^ECC[-']POR[-']\d+$/)) return 'ECC-POR';
        if (placa.match(/^ECC[-']TV[-']\d+$/)) return 'ECC-TV';
        
        // También detectar mientras se está escribiendo (solo el prefijo)
        if (placa.startsWith('ECC-CPU') || placa.startsWith("ECC'CPU")) return 'ECC-CPU';
        if (placa.startsWith('ECC-SER') || placa.startsWith("ECC'SER")) return 'ECC-SER';
        if (placa.startsWith('ECC-MON') || placa.startsWith("ECC'MON")) return 'ECC-MON';
        if (placa.startsWith('ECC-IMP') || placa.startsWith("ECC'IMP")) return 'ECC-IMP';
        if (placa.startsWith('ECC-POR') || placa.startsWith("ECC'POR")) return 'ECC-POR';
        if (placa.startsWith('ECC-TV') || placa.startsWith("ECC'TV")) return 'ECC-TV';
        
        return 'OTHER';
    };

    // Función para determinar qué campos mostrar según el tipo
    const getFieldsForType = (type) => {
        const commonFields = ['marca_modelo', 'numero_serie_fabricante', 'estado'];
        
        switch (type) {
            case 'ECC-CPU':
            case 'ECC-SER':
            case 'ECC-POR':
                return [...commonFields, 'cpu_procesador', 'memoria_ram', 'almacenamiento', 'sistema_operativo'];
            case 'ECC-MON':
            case 'ECC-TV':
                return [...commonFields, 'pulgadas'];
            case 'ECC-IMP':
                return commonFields; // Solo marca, serie y estado
            default:
                return [];
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchResponsables();
            fetchAgentes();
            if (activo) {
                // Si estamos editando, cargar datos del activo
                setFormData({
                    numero_placa: activo.numero_placa || '',
                    centro_costes: activo.centro_costes || 1,
                    ubicacion: activo.ubicacion || '',
                    responsable: activo.responsable || '',
                    proveedor: activo.proveedor || '',
                    valor: activo.valor || '',
                    fecha_compra: formatDateForInput(activo.fecha_compra),
                    numero_social: activo.numero_social || '',
                    poliza: activo.poliza || '',
                    aseguradora: activo.aseguradora || '',
                    garantia: activo.garantia || 'No',
                    fecha_vencimiento_garantia: formatDateForInput(activo.fecha_vencimiento_garantia),
                    orden_compra: activo.orden_compra || '',
                    clasificacion: activo.clasificacion || '',
                    clasificacion_activo_fijo: activo.clasificacion_activo_fijo || '',
                    adjunto_archivo: null,
                    // Campo Site
                    site: activo.site || '',
                    // Campo Puesto
                    puesto: activo.puesto || '',
                    // Campo Asignado
                    asignado: activo.asignado || '',
                    // Nuevos campos dinámicos
                    marca_modelo: activo.marca_modelo || '',
                    numero_serie_fabricante: activo.numero_serie_fabricante || '',
                    cpu_procesador: activo.cpu_procesador || '',
                    memoria_ram: activo.memoria_ram || '',
                    almacenamiento: activo.almacenamiento || '',
                    sistema_operativo: activo.sistema_operativo || '',
                    pulgadas: activo.pulgadas || '',
                    estado: activo.estado || 'funcional',
                    agente_id: activo.agente_id || ''
                });
                setFileName(activo.adjunto_archivo || '');
                setAssetType(detectAssetType(activo.numero_placa));
            } else {
                // Si estamos creando, resetear formulario con valores por defecto
                setFormData({
                    numero_placa: '',
                    centro_costes: 1,
                    ubicacion: 'Claro',
                    responsable: 'David Acero',
                    proveedor: '',
                    valor: '',
                    fecha_compra: '',
                    numero_social: '',
                    poliza: '',
                    aseguradora: '',
                    garantia: 'No',
                    fecha_vencimiento_garantia: '',
                    orden_compra: '',
                    clasificacion: 'Activo no productivo',
                    clasificacion_activo_fijo: '',
                    adjunto_archivo: null,
                    // Campo Site
                    site: 'Site A',
                    // Campo Puesto
                    puesto: '',
                    // Campo Asignado
                    asignado: '',
                    // Nuevos campos dinámicos
                    marca_modelo: '',
                    numero_serie_fabricante: '',
                    cpu_procesador: '',
                    memoria_ram: '',
                    almacenamiento: '',
                    sistema_operativo: '',
                    pulgadas: '',
                    estado: 'funcional',
                    agente_id: ''
                });
                setFileName('');
                setAssetType('');
            }
            setError('');
        }
    }, [isOpen, activo]);

    const fetchResponsables = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/activos/responsables`);
            setResponsables(response.data.responsables);
        } catch (error) {
            console.error('Error al cargar responsables:', error);
        }
    };

    const fetchAgentes = async () => {
        try {
            const response = await api.get('/users-company');
            setAgentes(response.data.empleados);
        } catch (error) {
            console.error('Error al cargar agentes:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Si cambia el número de placa, detectar tipo de activo y establecer valor por defecto
        if (name === 'numero_placa') {
            const newType = detectAssetType(value);
            setAssetType(newType);
            
            // Establecer valor por defecto según el tipo de activo
            let defaultValue = '';
            if (newType === 'ECC-CPU') {
                defaultValue = '900000';
            } else if (newType === 'ECC-MON') {
                defaultValue = '500000';
            }
            
            // Solo actualizar el valor si está vacío o es el valor anterior por defecto
            setFormData(prev => {
                const currentValue = prev.valor;
                const shouldUpdateValue = !currentValue || 
                                        currentValue === '900000' || 
                                        currentValue === '500000' || 
                                        currentValue === '';
                
                return {
                    ...prev,
                    [name]: value,
                    ...(shouldUpdateValue && defaultValue ? { valor: defaultValue } : {})
                };
            });
            return; // Evitar la actualización duplicada del formData
        }

        // Si cambia la garantía a "No", limpiar fecha de vencimiento
        if (name === 'garantia' && value === 'No') {
            setFormData(prev => ({
                ...prev,
                fecha_vencimiento_garantia: ''
            }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                adjunto_archivo: file
            }));
            setFileName(file.name);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validaciones
            if (!formData.numero_placa || !formData.ubicacion || !formData.site || !formData.responsable || !formData.clasificacion) {
                throw new Error('Los campos número de placa, ubicación, site, responsable y clasificación son obligatorios');
            }

            if (formData.garantia === 'Si' && !formData.fecha_vencimiento_garantia) {
                throw new Error('La fecha de vencimiento de garantía es requerida cuando la garantía es "Sí"');
            }

            // Crear FormData para envío con archivo
            const submitData = new FormData();
            
            // Agregar todos los campos excepto el archivo
            Object.keys(formData).forEach(key => {
                if (key !== 'adjunto_archivo' && formData[key] !== '') {
                    submitData.append(key, formData[key]);
                }
            });

            // Agregar archivo si existe
            if (formData.adjunto_archivo) {
                submitData.append('adjunto_archivo', formData.adjunto_archivo);
            }

            let response;
            if (activo) {
                // Actualizar activo existente
                response = await axios.put(`${API_BASE_URL}/activos/${activo.id}`, submitData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                // Crear nuevo activo
                response = await axios.post(`${API_BASE_URL}/activos`, submitData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }

            if (response.data.success) {
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Error al guardar activo:', error);
            
            // Manejar error específico de placa duplicada
            if (error.response?.data?.type === 'DUPLICATE_PLATE') {
                setError(`❌ ${error.response.data.message}`);
            } else {
                setError(error.response?.data?.message || error.message || 'Error al guardar el activo');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {activo ? 'Editar Activo' : 'Crear Nuevo Activo'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            <div className="flex items-start">
                                <div className="flex-1">
                                    {error}
                                    {error.includes('ya existe en el sistema') && (
                                        <div className="mt-2 text-sm text-red-600">
                                            💡 <strong>Sugerencia:</strong> Verifica que no hayas ingresado este número de placa anteriormente, o modifica el número si es correcto.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Número de Placa */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Número de Placa *
                            </label>
                            <input
                                type="text"
                                name="numero_placa"
                                value={formData.numero_placa}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej: ECC-CPU-001, ECC'CPU'001, ECC-MON-001..."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Formatos: ECC-CPU-### o ECC'CPU'### (Computadoras), ECC-SER-### o ECC'SER'### (Servidores), 
                                ECC-MON-### o ECC'MON'### (Monitores), ECC-IMP-### o ECC'IMP'### (Impresoras), 
                                ECC-POR-### o ECC'POR'### (Portátiles), ECC-TV-### o ECC'TV'### (TVs)
                            </p>
                        </div>

                        {/* Campos dinámicos según el tipo de activo - MOVIDOS ARRIBA */}
                        {assetType && assetType !== 'OTHER' && (
                            <>
                                <div className="md:col-span-2">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                        <h3 className="text-lg font-medium text-blue-900 mb-2">
                                            Campos específicos para {assetType}
                                        </h3>
                                        <p className="text-sm text-blue-700">
                                            Los siguientes campos son específicos para este tipo de activo.
                                        </p>
                                    </div>
                                </div>

                                {/* Estado - Para todos los tipos */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Estado *
                                    </label>
                                    <select
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {estados.map(estado => (
                                            <option key={estado} value={estado}>
                                                {estado.replace('_', ' ').charAt(0).toUpperCase() + estado.replace('_', ' ').slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Marca y Modelo - Para todos los tipos */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Marca y Modelo *
                                    </label>
                                    <input
                                        type="text"
                                        name="marca_modelo"
                                        value={formData.marca_modelo}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ej. Dell OptiPlex 7080"
                                    />
                                </div>

                                {/* Número de Serie del Fabricante - Para todos los tipos */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Número de Serie del Fabricante *
                                    </label>
                                    <input
                                        type="text"
                                        name="numero_serie_fabricante"
                                        value={formData.numero_serie_fabricante}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Número de serie del fabricante"
                                    />
                                </div>

                                {/* Campos específicos para equipos de cómputo */}
                                {(['ECC-CPU', 'ECC-SER', 'ECC-POR'].includes(assetType)) && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                CPU / Procesador
                                            </label>
                                            <input
                                                type="text"
                                                name="cpu_procesador"
                                                value={formData.cpu_procesador}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Ej. Intel Core i5-10400 2.9GHz"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Memoria RAM
                                            </label>
                                            <input
                                                type="text"
                                                name="memoria_ram"
                                                value={formData.memoria_ram}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Ej. 16GB DDR4"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Disco Duro / Almacenamiento
                                            </label>
                                            <input
                                                type="text"
                                                name="almacenamiento"
                                                value={formData.almacenamiento}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Ej. SSD 512GB"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Sistema Operativo
                                            </label>
                                            <input
                                                type="text"
                                                name="sistema_operativo"
                                                value={formData.sistema_operativo}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Ej. Windows 11 Pro"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Campos específicos para monitores y TV */}
                                {(['ECC-MON', 'ECC-TV'].includes(assetType)) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pulgadas
                                        </label>
                                        <input
                                            type="text"
                                            name="pulgadas"
                                            value={formData.pulgadas}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Ej. 24 pulgadas"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Centro de Costes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Centro de Costes *
                            </label>
                            <select
                                name="centro_costes"
                                value={formData.centro_costes}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                    <option key={num} value={num}>{num}</option>
                                ))}
                            </select>
                        </div>

                        {/* Ubicación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ubicación *
                            </label>
                            <select
                                name="ubicacion"
                                value={formData.ubicacion}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Seleccione una ubicación</option>
                                {ubicaciones.map(ubicacion => (
                                    <option key={ubicacion} value={ubicacion}>{ubicacion}</option>
                                ))}
                            </select>
                        </div>

                        {/* Site */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Site *
                            </label>
                            <select
                                name="site"
                                value={formData.site}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Seleccione un site</option>
                                {sites.map(site => (
                                    <option key={site} value={site}>{site}</option>
                                ))}
                            </select>
                        </div>

                        {/* Puesto */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Puesto
                            </label>
                            <input
                                type="text"
                                name="puesto"
                                value={formData.puesto}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej: 001, 090, 106"
                                maxLength={50}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Número o identificación del puesto físico donde está ubicado el activo (opcional)
                            </p>
                        </div>

                        {/* Empresa (solo lectura) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Empresa
                            </label>
                            <input
                                type="text"
                                value="Asiste"
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                            />
                        </div>

                        {/* Responsable */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Responsable *
                            </label>
                            <select
                                name="responsable"
                                value={formData.responsable}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Seleccione un responsable</option>
                                {responsables.map(responsable => (
                                    <option key={responsable} value={responsable}>{responsable}</option>
                                ))}
                            </select>
                        </div>

                        {/* Asignado */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Asignado
                            </label>
                            <input
                                type="text"
                                name="asignado"
                                value={formData.asignado}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nombre de la persona asignada"
                                maxLength={100}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Persona específica a quien está asignado el activo para uso diario (opcional)
                            </p>
                        </div>

                        {/* Agente del Call Center */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Agente del Call Center
                            </label>
                            <select
                                name="agente_id"
                                value={formData.agente_id}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Sin agente asignado</option>
                                {agentes.map(agente => (
                                    <option key={agente.id} value={agente.id}>
                                        {agente.nombre_completo} — {agente.numero_identificacion}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Agente del call center al que está asignado este activo (opcional)
                            </p>
                        </div>

                        {/* Proveedor */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Proveedor
                            </label>
                            <input
                                type="text"
                                name="proveedor"
                                value={formData.proveedor}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nombre del proveedor"
                            />
                        </div>

                        {/* Valor del Activo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Valor del Activo (COP)
                            </label>
                            <input
                                type="number"
                                name="valor"
                                value={formData.valor}
                                onChange={handleInputChange}
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                            />
                            {formData.valor !== '' && (
                                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    calcularTipo(formData.valor) === 'activo'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-orange-100 text-orange-800'
                                }`}>
                                    {calcularTipo(formData.valor) === 'activo' ? 'Tipo: Activo (≥ $400.000)' : 'Tipo: Gasto (< $400.000)'}
                                </span>
                            )}
                        </div>

                        {/* Fecha de Compra */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha de Compra
                            </label>
                            <input
                                type="date"
                                name="fecha_compra"
                                value={formData.fecha_compra}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Número Social */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Número de Serie
                            </label>
                            <input
                                type="text"
                                name="numero_social"
                                value={formData.numero_social}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Número social del activo"
                            />
                        </div>

                        {/* Póliza */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Póliza
                            </label>
                            <input
                                type="text"
                                name="poliza"
                                value={formData.poliza}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Número de póliza (opcional)"
                            />
                        </div>

                        {/* Aseguradora */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Aseguradora
                            </label>
                            <input
                                type="text"
                                name="aseguradora"
                                value={formData.aseguradora}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nombre de la aseguradora (opcional)"
                            />
                        </div>

                        {/* Garantía */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Garantía *
                            </label>
                            <select
                                name="garantia"
                                value={formData.garantia}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="No">No</option>
                                <option value="Si">Sí</option>
                            </select>
                        </div>

                        {/* Fecha de Vencimiento de Garantía (solo si garantía es Sí) */}
                        {formData.garantia === 'Si' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de Vencimiento de Garantía *
                                </label>
                                <input
                                    type="date"
                                    name="fecha_vencimiento_garantia"
                                    value={formData.fecha_vencimiento_garantia}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}

                        {/* Orden de Compra */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Orden de Compra
                            </label>
                            <input
                                type="text"
                                name="orden_compra"
                                value={formData.orden_compra}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Número de orden de compra"
                            />
                        </div>

                        {/* Clasificación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Clasificación *
                            </label>
                            <select
                                name="clasificacion"
                                value={formData.clasificacion}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Seleccione una clasificación</option>
                                {clasificaciones.map(clasificacion => (
                                    <option key={clasificacion} value={clasificacion}>{clasificacion}</option>
                                ))}
                            </select>
                        </div>

                        {/* Clasificación de Activo Fijo */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Clasificación de Activo Fijo
                            </label>
                            <input
                                type="text"
                                name="clasificacion_activo_fijo"
                                value={formData.clasificacion_activo_fijo}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Descripción de la clasificación del activo fijo"
                            />
                        </div>


                        {/* Archivo Adjunto */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Archivo Adjunto (Imagen o PDF)
                            </label>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                    <Upload className="h-5 w-5 mr-2 text-gray-400" />
                                    Seleccionar archivo
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept="image/*,.pdf"
                                        className="hidden"
                                    />
                                </label>
                                {fileName && (
                                    <span className="text-sm text-gray-600">{fileName}</span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Formatos permitidos: JPG, PNG, GIF, WebP, PDF. Máximo 15MB.
                            </p>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
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
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {activo ? 'Actualizar' : 'Crear'} Activo
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssetForm;