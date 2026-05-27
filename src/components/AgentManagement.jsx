import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AgentForm from './AgentForm';
import {
    Users, Plus, Search, Edit3, Trash2,
    Package, AlertCircle, UserCheck, X, ClipboardList
} from 'lucide-react';

const AgentManagement = () => {
    const { isGestorActivos } = useAuth();
    const [agentes, setAgentes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedAgente, setSelectedAgente] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedAgenteForAssign, setSelectedAgenteForAssign] = useState(null);
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
        fetchAgentes();
    }, []);

    const fetchAgentes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/agentes');
            setAgentes(response.data.agentes);
            setError('');
        } catch (err) {
            console.error('Error al cargar agentes:', err);
            setError('Error al cargar los agentes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAgente = () => {
        setSelectedAgente(null);
        setShowCreateForm(true);
    };

    const handleEditAgente = (agente) => {
        setSelectedAgente(agente);
        setShowEditForm(true);
    };

    const handleFormSuccess = async () => {
        await fetchAgentes();
        setShowCreateForm(false);
        setShowEditForm(false);
    };

    const handleDeleteAgente = async (id) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este agente? Los activos asignados quedarán sin agente.')) return;
        try {
            await api.delete(`/agentes/${id}`);
            await fetchAgentes();
        } catch (err) {
            console.error('Error al eliminar agente:', err);
            setError('Error al eliminar el agente');
        }
    };

    const handleManageActivos = async (agente) => {
        setSelectedAgenteForAssign(agente);
        setAssignSearch('');
        setAssignError('');
        setShowAssignModal(true);
        await loadActivosModal(agente.id);
    };

    const loadActivosModal = async (agenteId) => {
        setAssignLoading(true);
        try {
            const [assignedRes, unassignedRes] = await Promise.all([
                api.get(`/agentes/${agenteId}/activos`),
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
            await api.put(`/agentes/${selectedAgenteForAssign.id}/activos/${activoId}`);
            await loadActivosModal(selectedAgenteForAssign.id);
            await fetchAgentes();
        } catch (err) {
            console.error('Error al asignar activo:', err);
            setAssignError('Error al asignar el activo');
        }
    };

    const handleUnassignActivo = async (activoId) => {
        try {
            await api.delete(`/agentes/${selectedAgenteForAssign.id}/activos/${activoId}`);
            await loadActivosModal(selectedAgenteForAssign.id);
            await fetchAgentes();
        } catch (err) {
            console.error('Error al desasignar activo:', err);
            setAssignError('Error al desasignar el activo');
        }
    };

    const filteredAgentes = agentes.filter(agente =>
        agente.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agente.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agente.cedula.includes(searchTerm) ||
        agente.campana.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalConActivos = agentes.filter(a => a.total_activos > 0).length;
    const totalActivos = agentes.reduce((sum, a) => sum + (a.total_activos || 0), 0);
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
                    <p className="mt-4 text-gray-600">Cargando agentes...</p>
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
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Agentes</h1>
                        <p className="text-gray-600">Registra y administra los agentes del call center</p>
                    </div>
                    <button
                        onClick={handleCreateAgente}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Nuevo Agente
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <Users className="h-8 w-8 text-indigo-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Agentes</p>
                            <p className="text-2xl font-bold text-gray-900">{agentes.length}</p>
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
            </div>

            {/* Search */}
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula o campaña..."
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaña</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activos</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAgentes.map((agente) => (
                                <tr key={agente.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {agente.nombres} {agente.apellidos}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {agente.cedula}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            {agente.campana}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            agente.total_activos > 0
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {agente.total_activos}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleManageActivos(agente)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Gestionar activos"
                                            >
                                                <ClipboardList className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEditAgente(agente)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="Editar agente"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAgente(agente.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Eliminar agente"
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

                {filteredAgentes.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay agentes</h3>
                        <p className="mt-1 text-sm text-gray-500">Comience creando un nuevo agente.</p>
                    </div>
                )}
            </div>

            <AgentForm
                isOpen={showCreateForm}
                onClose={() => setShowCreateForm(false)}
                agente={null}
                onSuccess={handleFormSuccess}
            />
            <AgentForm
                isOpen={showEditForm}
                onClose={() => setShowEditForm(false)}
                agente={selectedAgente}
                onSuccess={handleFormSuccess}
            />

            {/* Modal gestión de activos */}
            {showAssignModal && selectedAgenteForAssign && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Activos de {selectedAgenteForAssign.nombres} {selectedAgenteForAssign.apellidos}
                                </h2>
                                <p className="text-sm text-gray-500">{selectedAgenteForAssign.campana}</p>
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

                                {/* Activos asignados */}
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <Package className="h-4 w-4 text-indigo-600" />
                                        Activos asignados ({assignedActivos.length})
                                    </h3>
                                    {assignedActivos.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">Este agente no tiene activos asignados.</p>
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

                                {/* Buscar y asignar activos sin agente */}
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
