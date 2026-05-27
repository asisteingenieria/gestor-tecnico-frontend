import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Save } from 'lucide-react';

const AgentForm = ({ isOpen, onClose, agente = null, onSuccess }) => {
    const [formData, setFormData] = useState({
        cedula: '',
        nombres: '',
        apellidos: '',
        campana: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const CAMPANAS = ['Claro', 'Obama', 'Reclutamiento'];

    useEffect(() => {
        if (isOpen) {
            if (agente) {
                setFormData({
                    cedula: agente.cedula || '',
                    nombres: agente.nombres || '',
                    apellidos: agente.apellidos || '',
                    campana: agente.campana || ''
                });
            } else {
                setFormData({ cedula: '', nombres: '', apellidos: '', campana: '' });
            }
            setError('');
        }
    }, [isOpen, agente]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;
            if (agente) {
                response = await api.put(`/agentes/${agente.id}`, formData);
            } else {
                response = await api.post('/agentes', formData);
            }

            if (response.data.success) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error('Error al guardar agente:', err);
            if (err.response?.data?.type === 'DUPLICATE_CEDULA') {
                setError(`❌ ${err.response.data.message}`);
            } else {
                setError(err.response?.data?.message || err.message || 'Error al guardar el agente');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {agente ? 'Editar Agente' : 'Nuevo Agente'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cédula *
                            </label>
                            <input
                                type="text"
                                name="cedula"
                                value={formData.cedula}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Número de cédula"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombres *
                            </label>
                            <input
                                type="text"
                                name="nombres"
                                value={formData.nombres}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Nombres del agente"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Apellidos *
                            </label>
                            <input
                                type="text"
                                name="apellidos"
                                value={formData.apellidos}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Apellidos del agente"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Campaña *
                            </label>
                            <select
                                name="campana"
                                value={formData.campana}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Seleccionar campaña...</option>
                                {CAMPANAS.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
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
                                    {agente ? 'Actualizar' : 'Crear'} Agente
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgentForm;
