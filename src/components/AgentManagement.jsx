import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AgentForm from './AgentForm';
import {
    Users, Plus, Search, Edit3, Trash2,
    Package, AlertCircle, UserCheck, X, ClipboardList, DollarSign
} from 'lucide-react';

const AgentManagement = () => {
    const { isGestorActivos } = useAuth();
    const [empleados, setEmpleados] = useState([]);
    const [gastoTotal, setGastoTotal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedEmpleado, setSelectedEmpleado] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedEmpleadoForAssign, setSelectedEmpleadoForAssign] = useState(null);
    const [assignedActivos, setAssignedActivos] = useState([]);
    const [unassignedActivos, setUnassignedActivos] = useState([]);
    const [assignSearch, setAssignSearch] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignError, setAssignError] = useState('');

    if (!isGestorActivos) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600">Solo los gestores de activos pueden acceder a esta sección.</p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        fetchEmpleados();
        fetchGastoTotal();
    }, []);

    const fetchEmpleados = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users-company');
            setEmpleados(response.data.empleados);
            setError('');
        } catch (err) {
            console.error('Error al cargar empleados:', err);
            setError('Error al cargar los empleados');
        } finally {
            setLoading(false);
        }
    };

    const fetchGastoTotal = async () => {
        try {
            const response = await api.get('/users-company/gasto-total');
            setGastoTotal(response.data.gasto);
        } catch (err) {
            console.error('Error al cargar gasto total:', err);
        }
    };

    const handleCreateEmpleado = () => {
        setSelectedEmpleado(null);
        setShowCreateForm(true);
    };

    const handleEditEmpleado = (empleado) => {
        setSelectedEmpleado(empleado);
        setShowEditForm(true);
    };

    const handleFormSuccess = async () => {
        await fetchEmpleados();
        await fetchGastoTotal();
        setShowCreateForm(false);
        setShowEditForm(false);
    };

    const handleDeleteEmpleado = async (id) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este empleado? Los activos asignados quedarán sin empleado.')) return;
        try {
            await api.delete(`/users-company/${id}`);
            await fetchEmpleados();
            await fetchGastoTotal();
        } catch (err) {
            console.error('Error al eliminar empleado:', err);
            setError('Error al eliminar el empleado');
        }
    };

    const handleManageActivos = async (empleado) => {
        setSelectedEmpleadoForAssign(empleado);
        setAssignSearch('');
        setAssignError('');
        setShowAssignModal(true);
        await loadActivosModal(empleado.id);
    };

    const loadActivosModal = async (empleadoId) => {
        setAssignLoading(true);
        try {
            const [assignedRes, unassignedRes] = await Promise.all([
                api.get(`/users-company/${empleadoId}/activos`),
                api.get('/activos?sin_agente=true')
            ]);
            setAssignedActivos(assignedRes.data.activos);
            setUnassignedActivos(unassignedRes.data.activos);
            setAssignError('');
        } catch (err) {
            console.error('Error al cargar activos:', err);
            setAssignError('Error al cargar los activos');
        } finally {
            setAssignLoading(false);
        }
    };

    const handleAssignActivo = async (activoId) => {
        try {
            await api.put(`/users-company/${selectedEmpleadoForAssign.id}/activos/${activoId}`);
            await loadActivosModal(selectedEmpleadoForAssign.id);
            await fetchEmpleados();
        } catch (err) {
            console.error('Error al asignar activo:', err);
            setAssignError('Error al asignar el activo');
        }
    };

    const handleUnassignActivo = async (activoId) => {
        try {
            await api.delete(`/users-company/${selectedEmpleadoForAssign.id}/activos/${activoId}`);
            await loadActivosModal(selectedEmpleadoForAssign.id);
            await fetchEmpleados();
        } catch (err) {
            console.error('Error al desasignar activo:', err);
            setAssignError('Error al desasignar el activo');
        }
    };

    const formatSalario = (val) => {
        if (val == null) return '—';
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
    };

    const filteredEmpleados = empleados.filter(e =>
        (e.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.numero_identificacion || '').includes(searchTerm) ||
        (e.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.telefono || '').includes(searchTerm) ||
        (e.campania_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.cargo_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalConActivos = empleados.filter(e => e.total_activos > 0).length;
    const totalActivos = empleados.reduce((sum, e) => sum + (e.total_activos || 0), 0);
    const filteredUnassigned = unassignedActivos.filter(a =>
        a.numero_placa?.toLowerCase().includes(assignSearch.toLowerCase()) ||
        a.asignado?.toLowerCase().includes(assignSearch.toLowerCase()) ||
        a.tipo_activo?.toLowerCase().includes(assignSearch.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando empleados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Personal de la Empresa</h1>
                        <p className="text-gray-600">Registra y administra los empleados y sus activos asignados</p>
                    </div>
                    <button
                        onClick={handleCreateEmpleado}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Nuevo Empleado
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <Users className="h-8 w-8 text-indigo-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Empleados</p>
                            <p className="text-2xl font-bold text-gray-900">{empleados.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <UserCheck className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Con Activos Asignados</p>
                            <p className="text-2xl font-bold text-gray-900">{totalConActivos}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <Package className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Activos Asignados</p>
                            <p className="text-2xl font-bold text-gray-900">{totalActivos}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-emerald-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Gasto Mensual Personal</p>
                            <p className="text-lg font-bold text-gray-900">
                                {gastoTotal ? formatSalario(gastoTotal.gasto_mensual_total) : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, identificación, correo, campaña o cargo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identificación</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaña</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingreso</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activos</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredEmpleados.map((empleado) => (
                                <tr key={empleado.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {empleado.nombre_completo}
                                        </div>
                                        {empleado.email && (
                                            <div className="text-xs text-gray-400">{empleado.email}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <div>{empleado.numero_identificacion}</div>
                                        {empleado.tipo_identificacion_codigo && (
                                            <div className="text-xs text-gray-400">{empleado.tipo_identificacion_codigo}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {empleado.campania_nombre ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                {empleado.campania_nombre}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {empleado.cargo_nombre || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            empleado.estado_contrato_nombre === 'activo'
                                                ? 'bg-green-100 text-green-800'
                                                : ['retirado', 'inactivo'].includes(empleado.estado_contrato_nombre)
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {empleado.estado_contrato_nombre || 'sin contrato'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {empleado.telefono || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {empleado.fecha_ingreso
                                            ? new Date(empleado.fecha_ingreso).toLocaleDateString('es-CO')
                                            : '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                        {formatSalario(empleado.salario)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            empleado.total_activos > 0
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {empleado.total_activos}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleManageActivos(empleado)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Gestionar activos"
                                            >
                                                <ClipboardList className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEditEmpleado(empleado)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="Editar empleado"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteEmpleado(empleado.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Eliminar empleado"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredEmpleados.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay empleados</h3>
                        <p className="mt-1 text-sm text-gray-500">Comience registrando un nuevo empleado.</p>
                    </div>
                )}
            </div>

            {showCreateForm && (
                <AgentForm
                    isOpen={showCreateForm}
                    onClose={() => setShowCreateForm(false)}
                    agente={null}
                    onSuccess={handleFormSuccess}
                />
            )}
            {showEditForm && selectedEmpleado && (
                <AgentForm
                    isOpen={showEditForm}
                    onClose={() => setShowEditForm(false)}
                    agente={selectedEmpleado}
                    onSuccess={handleFormSuccess}
                />
            )}

            {/* Modal gestión de activos */}
            {showAssignModal && selectedEmpleadoForAssign && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Activos de {selectedEmpleadoForAssign.nombre_completo}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {selectedEmpleadoForAssign.tipo_identificacion_codigo} {selectedEmpleadoForAssign.numero_identificacion}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {assignLoading ? (
                            <div className="flex-1 flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {assignError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                        {assignError}
                                    </div>
                                )}

                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <Package className="h-4 w-4 text-indigo-600" />
                                        Activos asignados ({assignedActivos.length})
                                    </h3>
                                    {assignedActivos.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">Este empleado no tiene activos asignados.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignedActivos.map(a => (
                                                <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-sm font-medium text-gray-900">{a.numero_placa}</span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            a.tipo === 'activo' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {a.tipo || '—'}
                                                        </span>
                                                        {a.asignado && (
                                                            <span className="text-xs text-gray-500 truncate">{a.asignado}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnassignActivo(a.id)}
                                                        className="ml-3 text-red-500 hover:text-red-700 text-xs flex items-center gap-1 flex-shrink-0"
                                                        title="Quitar asignación"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                        Quitar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <Search className="h-4 w-4 text-indigo-600" />
                                        Agregar activo sin asignar
                                    </h3>
                                    <input
                                        type="text"
                                        placeholder="Buscar por placa, asignado o tipo..."
                                        value={assignSearch}
                                        onChange={(e) => setAssignSearch(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                    {filteredUnassigned.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">
                                            {unassignedActivos.length === 0
                                                ? 'No hay activos sin asignar disponibles.'
                                                : 'Sin resultados para esa búsqueda.'}
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto">
                                            {filteredUnassigned.map(a => (
                                                <div key={a.id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-sm font-medium text-gray-900">{a.numero_placa}</span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            a.tipo === 'activo' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {a.tipo || '—'}
                                                        </span>
                                                        {a.asignado && (
                                                            <span className="text-xs text-gray-500 truncate">{a.asignado}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleAssignActivo(a.id)}
                                                        className="ml-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded flex-shrink-0"
                                                    >
                                                        Asignar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentManagement;
