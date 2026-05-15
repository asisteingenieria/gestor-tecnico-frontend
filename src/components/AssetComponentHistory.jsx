import React, { useState, useEffect, useCallback } from 'react';
import { assetHistoryService } from '../services/api';
import {
    Activity,
    Package,
    Users,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Download,
    Filter,
    X,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Search,
    ArrowRight,
    AlertCircle,
    History,
    ClipboardList,
    User,
    XCircle,
    ChevronDown,
    AlertTriangle,
    Archive,
    CheckCircle,
    Clock
} from 'lucide-react';

const FIELD_COLORS = {
    cpu_procesador: 'bg-blue-100 text-blue-800',
    memoria_ram: 'bg-purple-100 text-purple-800',
    almacenamiento: 'bg-orange-100 text-orange-800',
    sistema_operativo: 'bg-green-100 text-green-800',
    clasificacion: 'bg-teal-100 text-teal-800',
    estado: 'bg-red-100 text-red-800'
};

const FIELD_OPTIONS = [
    { value: 'cpu_procesador', label: 'CPU / Procesador' },
    { value: 'memoria_ram', label: 'Memoria RAM' },
    { value: 'almacenamiento', label: 'Almacenamiento' },
    { value: 'sistema_operativo', label: 'Sistema Operativo' },
    { value: 'clasificacion', label: 'Clasificación' }
];

const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const AssetComponentHistory = () => {
    const [stats, setStats] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingTable, setLoadingTable] = useState(false);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        usuario: '',
        campo: '',
        fechaInicio: '',
        fechaFin: '',
        numeroPlaca: ''
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalAsset, setModalAsset] = useState(null);
    const [modalHistorial, setModalHistorial] = useState([]);
    const [modalObservaciones, setModalObservaciones] = useState([]);
    const [loadingModal, setLoadingModal] = useState(false);
    const [noProductivos, setNoProductivos] = useState([]);
    const [loadingNoProductivos, setLoadingNoProductivos] = useState(false);
    const [showNoProductivos, setShowNoProductivos] = useState(true);
    const [bajaModalOpen, setBajaModalOpen] = useState(false);
    const [bajaAsset, setBajaAsset] = useState(null);
    const [processingBaja, setProcessingBaja] = useState(false);
    const [enBodega, setEnBodega] = useState([]);
    const [loadingEnBodega, setLoadingEnBodega] = useState(false);
    const [showEnBodega, setShowEnBodega] = useState(true);
    const [pendientesBaja, setPendientesBaja] = useState([]);
    const [loadingPendientesBaja, setLoadingPendientesBaja] = useState(false);
    const [showPendientesBaja, setShowPendientesBaja] = useState(true);
    const [processingBajaId, setProcessingBajaId] = useState(null);
    const [bodegaFilters, setBodegaFilters] = useState({
        numeroPlaca: '',
        tipoActivo: '',
        ubicacion: '',
        fechaInicio: '',
        fechaFin: '',
        enviadoPor: ''
    });
    const [showBodegaFilters, setShowBodegaFilters] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const res = await assetHistoryService.getStats();
            setStats(res.data.stats);
        } catch (err) {
            console.error('Error al cargar stats:', err);
            setError('Error al cargar las estadísticas');
        }
    }, []);

    const fetchNoProductivos = useCallback(async () => {
        try {
            setLoadingNoProductivos(true);
            const res = await assetHistoryService.getNoProductivos();
            setNoProductivos(res.data.data || []);
        } catch (err) {
            console.error('Error al cargar no productivos:', err);
        } finally {
            setLoadingNoProductivos(false);
        }
    }, []);

    const fetchEnBodega = useCallback(async () => {
        try {
            setLoadingEnBodega(true);
            const res = await assetHistoryService.getEnBodega();
            setEnBodega(res.data.data || []);
        } catch (err) {
            console.error('Error al cargar activos en bodega:', err);
        } finally {
            setLoadingEnBodega(false);
        }
    }, []);

    const fetchPendientesBaja = useCallback(async () => {
        try {
            setLoadingPendientesBaja(true);
            const res = await assetHistoryService.getPendientesBaja();
            setPendientesBaja(res.data.data || []);
        } catch (err) {
            console.error('Error al cargar solicitudes de baja:', err);
        } finally {
            setLoadingPendientesBaja(false);
        }
    }, []);

    const fetchHistorial = useCallback(async (offset = 0) => {
        try {
            setLoadingTable(true);
            const params = { limit: 50, offset };
            if (filters.usuario) params.usuario = filters.usuario;
            if (filters.campo) params.campo = filters.campo;
            if (filters.fechaInicio) params.fechaInicio = filters.fechaInicio;
            if (filters.fechaFin) params.fechaFin = filters.fechaFin;
            if (filters.numeroPlaca) params.numeroPlaca = filters.numeroPlaca;

            const res = await assetHistoryService.getFiltered(params);
            setHistorial(res.data.data);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Error al cargar historial:', err);
            setError('Error al cargar el historial');
        } finally {
            setLoadingTable(false);
        }
    }, [filters]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchStats(), fetchHistorial(0), fetchNoProductivos(), fetchEnBodega(), fetchPendientesBaja()]);
            setLoading(false);
        };
        loadData();
    }, []);

    useEffect(() => {
        fetchHistorial(0);
    }, [filters]);

    const handleRefresh = async () => {
        setLoading(true);
        setError(null);
        await Promise.all([fetchStats(), fetchHistorial(0), fetchNoProductivos(), fetchEnBodega(), fetchPendientesBaja()]);
        setLoading(false);
    };

    const handleDarDeBaja = async () => {
        if (!bajaAsset) return;
        try {
            setProcessingBaja(true);
            await assetHistoryService.darDeBaja(bajaAsset.id);
            setBajaModalOpen(false);
            setBajaAsset(null);
            await fetchNoProductivos();
        } catch (err) {
            console.error('Error al dar de baja:', err);
            alert(err.response?.data?.msg || 'Error al dar de baja el activo');
        } finally {
            setProcessingBaja(false);
        }
    };

    const handleAprobarSolicitudBaja = async (activo) => {
        if (!window.confirm(`¿Confirma dar de baja definitivamente el activo ${activo.numeroPlaca}? Esta acción es irreversible.`)) return;
        try {
            setProcessingBajaId(activo.id);
            await assetHistoryService.darDeBaja(activo.id);
            await fetchPendientesBaja();
            await fetchNoProductivos();
        } catch (err) {
            console.error('Error al aprobar baja:', err);
            alert(err.response?.data?.msg || 'Error al aprobar la baja');
        } finally {
            setProcessingBajaId(null);
        }
    };

    const handleRechazarSolicitudBaja = async (activo) => {
        if (!window.confirm(`¿Rechazar la solicitud de baja de ${activo.numeroPlaca}? El activo volverá a estado funcional.`)) return;
        try {
            setProcessingBajaId(activo.id);
            await assetHistoryService.rechazarSolicitudBaja(activo.id);
            await fetchPendientesBaja();
        } catch (err) {
            console.error('Error al rechazar solicitud:', err);
            alert(err.response?.data?.msg || 'Error al rechazar la solicitud');
        } finally {
            setProcessingBajaId(null);
        }
    };

    const handleClearFilters = () => {
        setFilters({ usuario: '', campo: '', fechaInicio: '', fechaFin: '', numeroPlaca: '' });
    };

    const handlePrevPage = () => {
        const newOffset = Math.max(0, pagination.offset - pagination.limit);
        fetchHistorial(newOffset);
    };

    const handleNextPage = () => {
        const newOffset = pagination.offset + pagination.limit;
        if (newOffset < pagination.total) {
            fetchHistorial(newOffset);
        }
    };

    const exportCSV = () => {
        if (historial.length === 0) return;
        const headers = ['Fecha', 'Placa', 'Tipo Activo', 'Componente', 'Valor Anterior', 'Valor Nuevo', 'Modificado Por'];
        const rows = historial.map(h => [
            formatDate(h.fecha),
            h.numeroPlaca || '',
            h.tipoActivo || '',
            h.campoLabel || h.campo,
            h.valorAnterior || '',
            h.valorNuevo || '',
            h.modificadoPor || ''
        ]);
        const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historial_componentes_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleOpenAssetModal = async (activoId, numeroPlaca, tipoActivo) => {
        setModalAsset({ id: activoId, numeroPlaca, tipoActivo });
        setModalOpen(true);
        setLoadingModal(true);
        try {
            const [histRes, obsRes] = await Promise.all([
                assetHistoryService.getByAsset(activoId),
                assetHistoryService.getObservaciones(activoId)
            ]);
            setModalHistorial(histRes.data.historial || []);
            setModalObservaciones(obsRes.data.data || []);
        } catch (err) {
            console.error('Error al cargar historial del activo:', err);
            setModalHistorial([]);
            setModalObservaciones([]);
        } finally {
            setLoadingModal(false);
        }
    };

    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const hasActiveFilters = Object.values(filters).some(v => v !== '');

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600 text-lg">Cargando historial de componentes...</span>
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                <p className="text-red-600 text-lg mb-4">{error}</p>
                <button onClick={handleRefresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Historial de Componentes</h1>
                    <p className="text-sm text-gray-500 mt-1">Registro de todas las modificaciones de hardware realizadas por técnicos</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refrescar
                    </button>
                    <button
                        onClick={exportCSV}
                        disabled={historial.length === 0}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="h-4 w-4 mr-1" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                                <Activity className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Cambios</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3">
                                <Package className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Activos Modificados</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.activosUnicos.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Usuarios Activos</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.usuariosUnicos.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-amber-100 rounded-lg p-3">
                                {stats.ultimos7dias >= stats.previos7dias ? (
                                    <TrendingUp className="h-6 w-6 text-amber-600" />
                                ) : (
                                    <TrendingDown className="h-6 w-6 text-amber-600" />
                                )}
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Últimos 7 días</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.ultimos7dias}</p>
                                <p className="text-xs text-gray-400">
                                    vs {stats.previos7dias} semana anterior
                                    {stats.previos7dias > 0 && (
                                        <span className={stats.ultimos7dias >= stats.previos7dias ? 'text-green-500 ml-1' : 'text-red-500 ml-1'}>
                                            ({stats.ultimos7dias >= stats.previos7dias ? '+' : ''}{Math.round(((stats.ultimos7dias - stats.previos7dias) / stats.previos7dias) * 100)}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Panels */}
            {stats && (stats.porUsuario.length > 0 || stats.porCampo.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Changes by User */}
                    {stats.porUsuario.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Cambios por Usuario</h3>
                            <div className="space-y-3">
                                {stats.porUsuario.map((u) => {
                                    const maxCantidad = stats.porUsuario[0]?.cantidad || 1;
                                    const percentage = (u.cantidad / maxCantidad) * 100;
                                    return (
                                        <div key={u.id} className="flex items-center gap-3">
                                            <div className="w-32 text-sm text-gray-700 truncate font-medium" title={u.nombre}>{u.nombre}</div>
                                            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                                                <div
                                                    className="bg-blue-500 h-5 rounded-full flex items-center justify-end pr-2 transition-all"
                                                    style={{ width: `${Math.max(percentage, 8)}%` }}
                                                >
                                                    <span className="text-xs text-white font-medium">{u.cantidad}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Changes by Component */}
                    {stats.porCampo.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Cambios por Componente</h3>
                            <div className="space-y-3">
                                {stats.porCampo.map((c) => (
                                    <div key={c.campo} className="flex items-center justify-between">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${FIELD_COLORS[c.campo] || 'bg-gray-100 text-gray-800'}`}>
                                            {c.label}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900">{c.cantidad}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Solicitudes de Baja Pendientes */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-amber-300">
                <button
                    onClick={() => setShowPendientesBaja(!showPendientesBaja)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 hover:bg-amber-50 rounded-xl"
                >
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        <span className="text-base font-semibold">Solicitudes de Baja Pendientes</span>
                        {pendientesBaja.length > 0 ? (
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                                {pendientesBaja.length} pendiente{pendientesBaja.length !== 1 ? 's' : ''}
                            </span>
                        ) : (
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                Sin solicitudes
                            </span>
                        )}
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showPendientesBaja ? 'rotate-180' : ''}`} />
                </button>
                {showPendientesBaja && (
                    <div className="border-t border-amber-200">
                        {loadingPendientesBaja ? (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="h-5 w-5 text-amber-400 animate-spin" />
                                <span className="ml-2 text-gray-500 text-sm">Cargando...</span>
                            </div>
                        ) : pendientesBaja.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle className="h-10 w-10 mx-auto text-green-300 mb-2" />
                                <p className="text-gray-500 text-sm">No hay solicitudes de baja pendientes</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-amber-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca / Modelo</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clasificación</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitado por</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha solicitud</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {pendientesBaja.map((activo) => (
                                            <tr key={activo.id} className="hover:bg-amber-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {activo.numeroPlaca}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {activo.tipoActivo}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {activo.ubicacion || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate" title={activo.marcaModelo}>
                                                    {activo.marcaModelo || '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        activo.clasificacion === 'Activo productivo'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                        {activo.clasificacion || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {activo.solicitadoPor || '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {activo.fechaSolicitud ? formatDate(activo.fechaSolicitud) : '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenAssetModal(activo.id, activo.numeroPlaca, activo.tipoActivo)}
                                                            className="inline-flex items-center px-2.5 py-1.5 border border-blue-300 rounded-lg text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                                                        >
                                                            <History className="h-3.5 w-3.5 mr-1" />
                                                            Historial
                                                        </button>
                                                        <button
                                                            onClick={() => handleAprobarSolicitudBaja(activo)}
                                                            disabled={processingBajaId === activo.id}
                                                            className="inline-flex items-center px-2.5 py-1.5 border border-red-300 rounded-lg text-xs font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 transition-colors"
                                                        >
                                                            {processingBajaId === activo.id ? (
                                                                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                                                            ) : (
                                                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                                            )}
                                                            Aprobar Baja
                                                        </button>
                                                        <button
                                                            onClick={() => handleRechazarSolicitudBaja(activo)}
                                                            disabled={processingBajaId === activo.id}
                                                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                                        >
                                                            {processingBajaId === activo.id ? (
                                                                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                                                            ) : (
                                                                <X className="h-3.5 w-3.5 mr-1" />
                                                            )}
                                                            Rechazar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Activos No Productivos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <button
                    onClick={() => setShowNoProductivos(!showNoProductivos)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl"
                >
                    <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-base font-semibold">Activos No Productivos</span>
                        {noProductivos.length > 0 && (
                            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                {noProductivos.length}
                            </span>
                        )}
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showNoProductivos ? 'rotate-180' : ''}`} />
                </button>
                {showNoProductivos && (
                    <div className="border-t border-gray-100">
                        {loadingNoProductivos ? (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
                                <span className="ml-2 text-gray-500 text-sm">Cargando...</span>
                            </div>
                        ) : noProductivos.length === 0 ? (
                            <div className="text-center py-8">
                                <Package className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-500 text-sm">No hay activos clasificados como no productivos</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicacion</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca / Modelo</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clasificado por</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {noProductivos.map((activo) => (
                                            <tr key={activo.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {activo.numeroPlaca}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {activo.tipoActivo}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {activo.ubicacion || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={activo.marcaModelo}>
                                                    {activo.marcaModelo || '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {activo.estado === 'dado_de_baja' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            Dado de baja
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            {activo.estado || 'funcional'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {activo.clasificadoPor || '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {activo.fechaClasificacion ? formatDate(activo.fechaClasificacion) : '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenAssetModal(activo.id, activo.numeroPlaca, activo.tipoActivo)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-blue-300 rounded-lg text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                                                        >
                                                            <History className="h-3.5 w-3.5 mr-1" />
                                                            Ver Historial
                                                        </button>
                                                        {activo.estado !== 'dado_de_baja' && (
                                                            <button
                                                                onClick={() => { setBajaAsset(activo); setBajaModalOpen(true); }}
                                                                className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-lg text-xs font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                                                Dar de Baja
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Activos en Bodega */}
            {(() => {
                const ubicacionesBodega = [...new Set(enBodega.map(a => a.ubicacion).filter(Boolean))].sort();
                const tecnicosBodega = [...new Set(enBodega.map(a => a.enviadoPor).filter(Boolean))].sort();
                const hasActiveBodegaFilters = Object.values(bodegaFilters).some(v => v !== '');

                const bodegaFiltrada = enBodega.filter(a => {
                    if (bodegaFilters.numeroPlaca && !a.numeroPlaca?.toLowerCase().includes(bodegaFilters.numeroPlaca.toLowerCase())) return false;
                    if (bodegaFilters.tipoActivo && a.tipoActivo !== bodegaFilters.tipoActivo) return false;
                    if (bodegaFilters.ubicacion && a.ubicacion !== bodegaFilters.ubicacion) return false;
                    if (bodegaFilters.enviadoPor && a.enviadoPor !== bodegaFilters.enviadoPor) return false;
                    if (bodegaFilters.fechaInicio && a.fechaBodega && new Date(a.fechaBodega) < new Date(bodegaFilters.fechaInicio)) return false;
                    if (bodegaFilters.fechaFin && a.fechaBodega && new Date(a.fechaBodega) > new Date(bodegaFilters.fechaFin + 'T23:59:59')) return false;
                    return true;
                });

                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <button
                            onClick={() => setShowEnBodega(!showEnBodega)}
                            className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                            <div className="flex items-center gap-2">
                                <Archive className="h-5 w-5 text-indigo-500" />
                                <span className="text-base font-semibold">Activos en Bodega</span>
                                {enBodega.length > 0 && (
                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                        {hasActiveBodegaFilters ? `${bodegaFiltrada.length} / ${enBodega.length}` : enBodega.length}
                                    </span>
                                )}
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${showEnBodega ? 'rotate-180' : ''}`} />
                        </button>

                        {showEnBodega && (
                            <div className="border-t border-gray-100">
                                {/* Filtros */}
                                <div className="px-5 py-3 border-b border-gray-100">
                                    <button
                                        onClick={() => setShowBodegaFilters(!showBodegaFilters)}
                                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                                    >
                                        <Filter className="h-4 w-4" />
                                        Filtros
                                        {hasActiveBodegaFilters && (
                                            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">Activos</span>
                                        )}
                                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showBodegaFilters ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showBodegaFilters && (
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Placa</label>
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: ECC-CPU-001"
                                                        value={bodegaFilters.numeroPlaca}
                                                        onChange={e => setBodegaFilters(f => ({ ...f, numeroPlaca: e.target.value }))}
                                                        className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                                                <select
                                                    value={bodegaFilters.tipoActivo}
                                                    onChange={e => setBodegaFilters(f => ({ ...f, tipoActivo: e.target.value }))}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    <option value="">Todos</option>
                                                    <option value="ECC-CPU">ECC-CPU</option>
                                                    <option value="ECC-POR">ECC-POR</option>
                                                    <option value="ECC-SER">ECC-SER</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Ubicación</label>
                                                <select
                                                    value={bodegaFilters.ubicacion}
                                                    onChange={e => setBodegaFilters(f => ({ ...f, ubicacion: e.target.value }))}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    <option value="">Todas</option>
                                                    {ubicacionesBodega.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Enviado por</label>
                                                <select
                                                    value={bodegaFilters.enviadoPor}
                                                    onChange={e => setBodegaFilters(f => ({ ...f, enviadoPor: e.target.value }))}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    <option value="">Todos</option>
                                                    {tecnicosBodega.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha desde</label>
                                                <input
                                                    type="date"
                                                    value={bodegaFilters.fechaInicio}
                                                    onChange={e => setBodegaFilters(f => ({ ...f, fechaInicio: e.target.value }))}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha hasta</label>
                                                <input
                                                    type="date"
                                                    value={bodegaFilters.fechaFin}
                                                    onChange={e => setBodegaFilters(f => ({ ...f, fechaFin: e.target.value }))}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            {hasActiveBodegaFilters && (
                                                <div className="xl:col-span-6">
                                                    <button
                                                        onClick={() => setBodegaFilters({ numeroPlaca: '', tipoActivo: '', ubicacion: '', fechaInicio: '', fechaFin: '', enviadoPor: '' })}
                                                        className="inline-flex items-center text-sm text-red-600 hover:text-red-700"
                                                    >
                                                        <X className="h-4 w-4 mr-1" />
                                                        Limpiar filtros
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {loadingEnBodega ? (
                                    <div className="flex items-center justify-center py-8">
                                        <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
                                        <span className="ml-2 text-gray-500 text-sm">Cargando...</span>
                                    </div>
                                ) : bodegaFiltrada.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Archive className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                                        <p className="text-gray-500 text-sm">
                                            {hasActiveBodegaFilters ? 'No hay resultados con los filtros aplicados' : 'No hay activos en bodega'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca / Modelo</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enviado por</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {bodegaFiltrada.map((activo) => (
                                                    <tr key={activo.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{activo.numeroPlaca}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{activo.tipoActivo}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{activo.ubicacion || '—'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={activo.marcaModelo}>{activo.marcaModelo || '—'}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{activo.enviadoPor || '—'}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{activo.fechaBodega ? formatDate(activo.fechaBodega) : '—'}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <button
                                                                onClick={() => handleOpenAssetModal(activo.id, activo.numeroPlaca, activo.tipoActivo)}
                                                                className="inline-flex items-center px-3 py-1.5 border border-blue-300 rounded-lg text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                                                            >
                                                                <History className="h-3.5 w-3.5 mr-1" />
                                                                Ver Historial
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl"
                >
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtros
                        {hasActiveFilters && (
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">Activos</span>
                        )}
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
                </button>
                {showFilters && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={filters.fechaInicio}
                                    onChange={(e) => setFilters(f => ({ ...f, fechaInicio: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={filters.fechaFin}
                                    onChange={(e) => setFilters(f => ({ ...f, fechaFin: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
                                <select
                                    value={filters.usuario}
                                    onChange={(e) => setFilters(f => ({ ...f, usuario: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Todos</option>
                                    {stats?.porUsuario?.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Componente</label>
                                <select
                                    value={filters.campo}
                                    onChange={(e) => setFilters(f => ({ ...f, campo: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Todos</option>
                                    {FIELD_OPTIONS.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Buscar Placa</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Ej: BCCR-123"
                                        value={filters.numeroPlaca}
                                        onChange={(e) => setFilters(f => ({ ...f, numeroPlaca: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="mt-3 inline-flex items-center text-sm text-red-600 hover:text-red-700"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loadingTable ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                        <span className="ml-2 text-gray-500">Cargando...</span>
                    </div>
                ) : historial.length === 0 ? (
                    <div className="text-center py-16">
                        <History className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 text-lg font-medium">No se encontraron registros</p>
                        <p className="text-gray-400 text-sm mt-1">
                            {hasActiveFilters ? 'Intenta ajustar los filtros de búsqueda' : 'Aún no hay cambios de componentes registrados'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Componente</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anterior</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nuevo</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modificado Por</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {historial.map((h) => (
                                        <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                    {formatDate(h.fecha)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleOpenAssetModal(h.activoId, h.numeroPlaca, h.tipoActivo)}
                                                    className="text-left hover:underline"
                                                >
                                                    <div className="text-sm font-medium text-blue-600 hover:text-blue-800">{h.numeroPlaca || '—'}</div>
                                                    <div className="text-xs text-gray-500">{h.tipoActivo || ''}</div>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${FIELD_COLORS[h.campo] || 'bg-gray-100 text-gray-800'}`}>
                                                    {h.campoLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate" title={h.valorAnterior || 'Sin valor'}>
                                                {h.valorAnterior || <span className="text-gray-300 italic">Sin valor</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium max-w-[200px] truncate" title={h.valorNuevo}>
                                                {h.valorNuevo}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                {h.modificadoPor}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <p className="text-sm text-gray-600">
                                Mostrando {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} de {pagination.total.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={pagination.offset === 0}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Anterior
                                </button>
                                <span className="text-sm text-gray-500">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={pagination.offset + pagination.limit >= pagination.total}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Siguiente
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de confirmación Dar de Baja */}
            {bajaModalOpen && bajaAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50" onClick={() => { if (!processingBaja) { setBajaModalOpen(false); setBajaAsset(null); } }} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="px-6 py-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Confirmar Dar de Baja</h2>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-1">
                                <p className="text-sm"><span className="font-medium text-gray-700">Placa:</span> <span className="text-gray-900">{bajaAsset.numeroPlaca}</span></p>
                                <p className="text-sm"><span className="font-medium text-gray-700">Tipo:</span> <span className="text-gray-900">{bajaAsset.tipoActivo}</span></p>
                                {bajaAsset.marcaModelo && <p className="text-sm"><span className="font-medium text-gray-700">Marca/Modelo:</span> <span className="text-gray-900">{bajaAsset.marcaModelo}</span></p>}
                                {bajaAsset.ubicacion && <p className="text-sm"><span className="font-medium text-gray-700">Ubicacion:</span> <span className="text-gray-900">{bajaAsset.ubicacion}</span></p>}
                            </div>
                            <p className="text-sm text-gray-600">
                                ¿Esta seguro de dar de baja este equipo? Esta accion es irreversible.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => { setBajaModalOpen(false); setBajaAsset(null); }}
                                disabled={processingBaja}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDarDeBaja}
                                disabled={processingBaja}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {processingBaja ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Dar de Baja
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de historial por activo */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Historial de {modalAsset?.numeroPlaca || 'Activo'}
                                </h2>
                                <p className="text-sm text-gray-500">{modalAsset?.tipoActivo}</p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {loadingModal ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
                                    <span className="ml-2 text-gray-500">Cargando historial...</span>
                                </div>
                            ) : modalHistorial.length === 0 ? (
                                <div className="text-center py-12">
                                    <History className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                                    <p className="text-gray-500">No hay cambios registrados para este activo</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500">
                                        {modalHistorial.length} cambio{modalHistorial.length !== 1 ? 's' : ''} registrado{modalHistorial.length !== 1 ? 's' : ''}
                                    </p>
                                    {modalHistorial.map((cambio) => (
                                        <div
                                            key={cambio.id}
                                            className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${FIELD_COLORS[cambio.campo] || 'bg-gray-100 text-gray-800'}`}>
                                                    {cambio.campoLabel}
                                                </span>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Calendar className="h-3 w-3 mr-1" />
                                                    {formatDate(cambio.fecha)}
                                                </div>
                                            </div>

                                            <div className="flex items-center text-sm mt-2">
                                                <span className="text-gray-500 line-through">
                                                    {cambio.valorAnterior || 'Sin valor'}
                                                </span>
                                                <ArrowRight className="h-4 w-4 mx-2 text-gray-400 flex-shrink-0" />
                                                <span className="text-gray-900 font-medium">
                                                    {cambio.valorNuevo}
                                                </span>
                                            </div>

                                            <div className="flex items-center text-xs text-gray-500 mt-2">
                                                <Users className="h-3 w-3 mr-1" />
                                                Modificado por: {cambio.modificadoPor}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Observaciones de Mantenimiento en el modal */}
                        {!loadingModal && modalObservaciones.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                    <ClipboardList className="h-4 w-4 mr-2 text-emerald-600" />
                                    Observaciones de Mantenimiento ({modalObservaciones.length})
                                </h3>
                                <div className="space-y-3 max-h-48 overflow-y-auto">
                                    {modalObservaciones.map((obs) => (
                                        <div key={obs.id} className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                            <div className="flex items-center text-xs text-gray-500 mb-1 space-x-3">
                                                <span className="flex items-center">
                                                    <User className="h-3 w-3 mr-1" />
                                                    {obs.realizadoPor}
                                                </span>
                                                <span className="flex items-center">
                                                    <Calendar className="h-3 w-3 mr-1" />
                                                    {formatDate(obs.fecha)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{obs.observaciones}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Modal Footer */}
                        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetComponentHistory;
