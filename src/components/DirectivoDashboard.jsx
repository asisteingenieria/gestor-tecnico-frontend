import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    RadialLinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import { Bar, Doughnut, Line, Pie, PolarArea } from 'react-chartjs-2';
import {
    Package,
    TrendingUp,
    Shield,
    Wrench,
    Archive,
    XCircle,
    CheckCircle,
    BarChart3,
    ClipboardList,
    Search,
    X,
    ChevronDown,
    ChevronUp,
    Download,
    RefreshCw,
    Eye,
    DollarSign,
    Building2,
    MapPin,
    User,
    Tag,
    Calendar,
    Cpu,
    HardDrive,
    Monitor,
    Globe,
    Hash,
    Truck,
    FileText
} from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    RadialLinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const PALETTE = [
    'rgba(16,185,129,0.8)', 'rgba(59,130,246,0.8)', 'rgba(245,158,11,0.8)',
    'rgba(239,68,68,0.8)', 'rgba(139,92,246,0.8)', 'rgba(236,72,153,0.8)',
    'rgba(20,184,166,0.8)', 'rgba(251,146,60,0.8)'
];
const PALETTE_BORDER = PALETTE.map(c => c.replace('0.8', '1'));

const CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 16, font: { size: 11 } }
        },
        tooltip: {
            backgroundColor: 'rgba(17,24,39,0.92)',
            titleColor: '#f9fafb',
            bodyColor: '#e5e7eb',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 8
        }
    }
};

const BAR_OPTIONS = {
    ...CHART_OPTIONS,
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } } }
    }
};

const LINE_OPTIONS = {
    ...CHART_OPTIONS,
    scales: {
        x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } }
    }
};

const formatCurrency = (val) => {
    if (!val || val === 0) return '$0';
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val}`;
};

const TIPO_LABELS = {
    'ECC-CPU': 'CPU / Desktop',
    'ECC-POR': 'Portátil',
    'ECC-SER': 'Servidor',
    'ECC-MON': 'Monitor',
    'ECC-IMP': 'Impresora',
    'ECC-TV': 'TV / Pantalla',
    'OTHER': 'Otro'
};

const ESTADO_LABELS = {
    'funcional': 'Funcional',
    'en_mantenimiento': 'En mantenimiento',
    'bodega': 'Bodega',
    'dado_de_baja': 'Dado de baja'
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const DetailModal = ({ activo, onClose }) => {
    if (!activo) return null;

    const field = (label, value, icon) => {
        const Icon = icon;
        return (
            <div className="flex items-start space-x-2 py-2 border-b border-gray-100 last:border-0">
                {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-gray-800 break-words">{value || '—'}</p>
                </div>
            </div>
        );
    };

    const estadoBadge = (estado) => {
        const map = {
            funcional: 'bg-green-100 text-green-800',
            en_mantenimiento: 'bg-yellow-100 text-yellow-800',
            bodega: 'bg-gray-100 text-gray-700',
            dado_de_baja: 'bg-red-100 text-red-800'
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[estado] || 'bg-gray-100 text-gray-700'}`}>
                {ESTADO_LABELS[estado] || estado}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Package className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{activo.numero_placa}</h2>
                            <p className="text-sm text-gray-500">{TIPO_LABELS[activo.tipo_activo] || activo.tipo_activo}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {estadoBadge(activo.estado)}
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Identificación</h3>
                            {field('Número de placa', activo.numero_placa, Hash)}
                            {field('Número de serie', activo.numero_serie_fabricante, Hash)}
                            {field('Marca / Modelo', activo.marca_modelo, Package)}
                            {field('Tipo de activo', TIPO_LABELS[activo.tipo_activo] || activo.tipo_activo, Tag)}
                            {field('Pulgadas', activo.pulgadas, Monitor)}

                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">Componentes</h3>
                            {field('Procesador', activo.cpu_procesador, Cpu)}
                            {field('Memoria RAM', activo.memoria_ram, HardDrive)}
                            {field('Almacenamiento', activo.almacenamiento, HardDrive)}
                            {field('Sistema Operativo', activo.sistema_operativo, Globe)}
                        </div>

                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ubicación y Responsable</h3>
                            {field('Ubicación', activo.ubicacion, MapPin)}
                            {field('Site', activo.site, Building2)}
                            {field('Responsable', activo.responsable, User)}
                            {field('Asignado a', activo.asignado, User)}
                            {field('Puesto', activo.puesto, Tag)}
                            {field('Centro de costes', activo.centro_costes, Hash)}

                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">Información Financiera</h3>
                            {field('Clasificación', activo.clasificacion, Tag)}
                            {field('Valor', activo.valor ? `$${Number(activo.valor).toLocaleString('es-CO')}` : null, DollarSign)}
                            {field('Proveedor', activo.proveedor, Truck)}
                            {field('Orden de compra', activo.orden_compra, FileText)}
                            {field('Fecha de compra', activo.fecha_compra ? new Date(activo.fecha_compra).toLocaleDateString('es-CO') : null, Calendar)}
                            {field('Garantía', activo.garantia, Shield)}
                            {field('Vencimiento garantía', activo.fecha_vencimiento_garantia ? new Date(activo.fecha_vencimiento_garantia).toLocaleDateString('es-CO') : null, Calendar)}
                            {field('Aseguradora', activo.aseguradora, Shield)}
                            {field('Póliza', activo.poliza, FileText)}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const DirectivoDashboard = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(
        location.pathname.includes('/inventario') ? 'inventario' : 'dashboard'
    );

    useEffect(() => {
        setActiveTab(location.pathname.includes('/inventario') ? 'inventario' : 'dashboard');
    }, [location.pathname]);
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [activos, setActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedActivo, setSelectedActivo] = useState(null);

    // Filtros para la tabla
    const [filters, setFilters] = useState({
        ubicacion: '',
        tipo_activo: '',
        clasificacion: '',
        estado: '',
        garantia: '',
        site: ''
    });
    const [searchPlaca, setSearchPlaca] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [statsRes, chartRes, activosRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/inventario-directivo/stats`),
                axios.get(`${API_BASE_URL}/inventario-directivo/charts`),
                axios.get(`${API_BASE_URL}/inventario-directivo`)
            ]);
            setStats(statsRes.data.stats);
            setChartData(chartRes.data);
            setActivos(activosRes.data.activos || []);
        } catch (err) {
            console.error('Error cargando datos:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAll();
    };

    // ── Filtered activos ──────────────────────────────────────────────────────
    const filteredActivos = activos.filter(a => {
        if (searchPlaca && !a.numero_placa?.toLowerCase().includes(searchPlaca.toLowerCase())) return false;
        if (filters.ubicacion && a.ubicacion !== filters.ubicacion) return false;
        if (filters.tipo_activo && a.tipo_activo !== filters.tipo_activo) return false;
        if (filters.clasificacion && a.clasificacion !== filters.clasificacion) return false;
        if (filters.estado && (a.estado || 'funcional') !== filters.estado) return false;
        if (filters.garantia && a.garantia !== filters.garantia) return false;
        if (filters.site && a.site !== filters.site) return false;
        return true;
    });

    const clearFilters = () => {
        setFilters({ ubicacion: '', tipo_activo: '', clasificacion: '', estado: '', garantia: '', site: '' });
        setSearchPlaca('');
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length + (searchPlaca ? 1 : 0);

    // ── Export CSV ────────────────────────────────────────────────────────────
    const exportCSV = () => {
        const headers = ['Placa', 'Tipo', 'Site', 'Ubicación', 'Responsable', 'Asignado', 'Clasificación', 'Valor', 'Garantía', 'Estado', 'Proveedor'];
        const rows = filteredActivos.map(a => [
            a.numero_placa, TIPO_LABELS[a.tipo_activo] || a.tipo_activo, a.site, a.ubicacion,
            a.responsable, a.asignado, a.clasificacion,
            a.valor || '', a.garantia, ESTADO_LABELS[a.estado || 'funcional'] || a.estado,
            a.proveedor
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_directivo_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Build chart datasets ──────────────────────────────────────────────────
    const buildCharts = () => {
        if (!chartData) return {};

        // Barras apiladas: productivos vs no productivos por ubicación
        const ubicaciones = [...new Set(chartData.porUbicacionClasificacion.map(r => r.ubicacion))];
        const productivos = ubicaciones.map(u => {
            const row = chartData.porUbicacionClasificacion.find(r => r.ubicacion === u && r.clasificacion === 'Activo productivo');
            return row ? row.total : 0;
        });
        const noProductivos = ubicaciones.map(u => {
            const row = chartData.porUbicacionClasificacion.find(r => r.ubicacion === u && r.clasificacion === 'Activo no productivo');
            return row ? row.total : 0;
        });

        const barrasUbicacion = {
            labels: ubicaciones,
            datasets: [
                { label: 'Productivos', data: productivos, backgroundColor: 'rgba(16,185,129,0.8)', borderColor: 'rgba(16,185,129,1)', borderWidth: 2, borderRadius: 4 },
                { label: 'No Productivos', data: noProductivos, backgroundColor: 'rgba(245,158,11,0.8)', borderColor: 'rgba(245,158,11,1)', borderWidth: 2, borderRadius: 4 }
            ]
        };

        // Dona: por tipo de activo
        const tipoLabels = chartData.porTipo.map(r => TIPO_LABELS[r.tipo_activo] || r.tipo_activo);
        const tipoData = chartData.porTipo.map(r => r.total);
        const donaTipo = {
            labels: tipoLabels,
            datasets: [{ data: tipoData, backgroundColor: PALETTE.slice(0, tipoData.length), borderColor: PALETTE_BORDER.slice(0, tipoData.length), borderWidth: 2, cutout: '55%' }]
        };

        // Barras: valor por ubicación
        const valorLabels = chartData.valorPorUbicacion.map(r => r.ubicacion);
        const valorData = chartData.valorPorUbicacion.map(r => Number(r.valor_total));
        const barrasValor = {
            labels: valorLabels,
            datasets: [{
                label: 'Valor total ($)',
                data: valorData,
                backgroundColor: 'rgba(59,130,246,0.8)',
                borderColor: 'rgba(59,130,246,1)',
                borderWidth: 2,
                borderRadius: 4
            }]
        };

        // Pie: estado de activos
        const estadoLabels = chartData.porEstado.map(r => ESTADO_LABELS[r.estado] || r.estado);
        const estadoData = chartData.porEstado.map(r => r.total);
        const estadoColors = chartData.porEstado.map(r => {
            if (r.estado === 'funcional') return 'rgba(16,185,129,0.8)';
            if (r.estado === 'en_mantenimiento') return 'rgba(245,158,11,0.8)';
            if (r.estado === 'bodega') return 'rgba(156,163,175,0.8)';
            if (r.estado === 'dado_de_baja') return 'rgba(239,68,68,0.8)';
            return 'rgba(107,114,128,0.8)';
        });
        const pieEstado = {
            labels: estadoLabels,
            datasets: [{ data: estadoData, backgroundColor: estadoColors, borderColor: estadoColors.map(c => c.replace('0.8', '1')), borderWidth: 2 }]
        };

        // Polar: por proveedor
        const proveedorLabels = chartData.porProveedor.map(r => r.proveedor?.substring(0, 18) || 'N/A');
        const proveedorData = chartData.porProveedor.map(r => r.total);
        const polarProveedor = {
            labels: proveedorLabels,
            datasets: [{ data: proveedorData, backgroundColor: PALETTE.slice(0, proveedorData.length), borderColor: PALETTE_BORDER.slice(0, proveedorData.length), borderWidth: 2 }]
        };

        // Línea: adquisiciones por mes
        const mesLabels = chartData.porMes.map(r => {
            const [y, m] = r.mes.split('-');
            return new Date(y, m - 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
        });
        const mesData = chartData.porMes.map(r => r.total);
        const lineaMeses = {
            labels: mesLabels,
            datasets: [{
                label: 'Activos adquiridos',
                data: mesData,
                borderColor: 'rgba(139,92,246,1)',
                backgroundColor: 'rgba(139,92,246,0.1)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(139,92,246,1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        };

        return { barrasUbicacion, donaTipo, barrasValor, pieEstado, polarProveedor, lineaMeses };
    };

    const charts = buildCharts();

    // ── KPI cards ─────────────────────────────────────────────────────────────
    const kpiCards = stats ? [
        { title: 'Total Activos', value: stats.total, icon: Package, color: 'blue', sub: 'en inventario' },
        { title: 'Valor Total', value: formatCurrency(stats.valor_total), icon: DollarSign, color: 'emerald', sub: 'inventario valorado' },
        { title: 'Productivos', value: stats.activos_productivos, icon: CheckCircle, color: 'green', sub: 'activos en uso' },
        { title: 'Con Garantía', value: stats.con_garantia, icon: Shield, color: 'purple', sub: 'garantía vigente' },
        { title: 'En Mantenimiento', value: stats.en_mantenimiento, icon: Wrench, color: 'yellow', sub: 'en reparación' },
        { title: 'Dados de Baja', value: stats.dados_de_baja, icon: XCircle, color: 'red', sub: 'retirados' }
    ] : [];

    const colorMap = {
        blue: { bg: 'bg-blue-50', icon: 'text-blue-600', val: 'text-blue-700' },
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700' },
        green: { bg: 'bg-green-50', icon: 'text-green-600', val: 'text-green-700' },
        purple: { bg: 'bg-purple-50', icon: 'text-purple-600', val: 'text-purple-700' },
        yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', val: 'text-yellow-700' },
        red: { bg: 'bg-red-50', icon: 'text-red-600', val: 'text-red-700' }
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Cargando inventario...</p>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {activeTab === 'dashboard' ? 'Dashboard de Inventario' : 'Inventario Completo'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {activeTab === 'dashboard'
                                ? 'Resumen ejecutivo y análisis de activos'
                                : `${filteredActivos.length} activos ${activeFilterCount ? `(filtrados de ${activos.length})` : 'en total'}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                        {activeTab === 'inventario' && (
                            <button
                                onClick={exportCSV}
                                className="inline-flex items-center px-3 py-1.5 text-sm border border-transparent rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                            >
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                Exportar CSV
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 mt-4">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                        { id: 'inventario', label: 'Inventario', icon: ClipboardList }
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <Icon className="h-4 w-4 mr-1.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── TAB: DASHBOARD ──────────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
                <div className="p-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {kpiCards.map((card, i) => {
                            const Icon = card.icon;
                            const c = colorMap[card.color];
                            return (
                                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                    <div className={`inline-flex p-2 rounded-lg ${c.bg} mb-3`}>
                                        <Icon className={`h-5 w-5 ${c.icon}`} />
                                    </div>
                                    <p className={`text-2xl font-bold ${c.val}`}>{card.value}</p>
                                    <p className="text-xs font-medium text-gray-600 mt-0.5">{card.title}</p>
                                    <p className="text-xs text-gray-400">{card.sub}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Charts row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                                <BarChart3 className="h-4 w-4 text-emerald-600 mr-2" />
                                Activos por Ubicación (Clasificación)
                            </h3>
                            <div className="h-72">
                                {charts.barrasUbicacion && (
                                    <Bar
                                        data={charts.barrasUbicacion}
                                        options={{ ...BAR_OPTIONS, plugins: { ...BAR_OPTIONS.plugins, title: { display: false } } }}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                                <Package className="h-4 w-4 text-blue-600 mr-2" />
                                Distribución por Tipo de Activo
                            </h3>
                            <div className="h-72">
                                {charts.donaTipo && <Doughnut data={charts.donaTipo} options={CHART_OPTIONS} />}
                            </div>
                        </div>
                    </div>

                    {/* Charts row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                                <DollarSign className="h-4 w-4 text-blue-600 mr-2" />
                                Valor por Ubicación
                            </h3>
                            <div className="h-60">
                                {charts.barrasValor && (
                                    <Bar
                                        data={charts.barrasValor}
                                        options={{
                                            ...BAR_OPTIONS,
                                            plugins: {
                                                ...BAR_OPTIONS.plugins,
                                                tooltip: {
                                                    ...BAR_OPTIONS.plugins.tooltip,
                                                    callbacks: { label: ctx => `$${ctx.raw.toLocaleString('es-CO')}` }
                                                }
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                Estado del Inventario
                            </h3>
                            <div className="h-60">
                                {charts.pieEstado && <Pie data={charts.pieEstado} options={CHART_OPTIONS} />}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                                <Truck className="h-4 w-4 text-purple-600 mr-2" />
                                Top Proveedores
                            </h3>
                            <div className="h-60">
                                {charts.polarProveedor && <PolarArea data={charts.polarProveedor} options={CHART_OPTIONS} />}
                            </div>
                        </div>
                    </div>

                    {/* Charts row 3 - full width */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                            <TrendingUp className="h-4 w-4 text-purple-600 mr-2" />
                            Tendencia de Adquisiciones (últimos 12 meses)
                        </h3>
                        <div className="h-72">
                            {charts.lineaMeses && chartData?.porMes?.length > 0
                                ? <Line data={charts.lineaMeses} options={LINE_OPTIONS} />
                                : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No hay datos de adquisiciones en el último año</div>
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: INVENTARIO ─────────────────────────────────────────── */}
            {activeTab === 'inventario' && (
                <div className="p-6 space-y-4">
                    {/* Search + filters toggle */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="p-4 flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por número de placa..."
                                    value={searchPlaca}
                                    onChange={e => setSearchPlaca(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                                {searchPlaca && (
                                    <button onClick={() => setSearchPlaca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center px-4 py-2 text-sm border rounded-lg transition-colors ${
                                    showFilters || activeFilterCount > 0
                                        ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                                        : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50'
                                }`}
                            >
                                {showFilters ? <ChevronUp className="h-4 w-4 mr-1.5" /> : <ChevronDown className="h-4 w-4 mr-1.5" />}
                                Filtros {activeFilterCount > 0 && <span className="ml-1.5 bg-emerald-600 text-white text-xs rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
                            </button>
                            {activeFilterCount > 0 && (
                                <button onClick={clearFilters} className="inline-flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors">
                                    <X className="h-4 w-4 mr-1" />
                                    Limpiar
                                </button>
                            )}
                        </div>

                        {showFilters && (
                            <div className="border-t border-gray-100 px-4 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {[
                                    { key: 'ubicacion', label: 'Ubicación', options: ['Claro', 'Obama', 'IT', 'Contratación', 'Reclutamiento', 'Selección', 'Finanzas', 'Majority'] },
                                    { key: 'tipo_activo', label: 'Tipo', options: Object.entries(TIPO_LABELS).map(([v, l]) => ({ value: v, label: l })) },
                                    { key: 'clasificacion', label: 'Clasificación', options: ['Activo productivo', 'Activo no productivo'] },
                                    { key: 'estado', label: 'Estado', options: Object.entries(ESTADO_LABELS).map(([v, l]) => ({ value: v, label: l })) },
                                    { key: 'garantia', label: 'Garantía', options: ['Si', 'No'] },
                                    { key: 'site', label: 'Site', options: [...new Set(activos.map(a => a.site).filter(Boolean))] }
                                ].map(({ key, label, options }) => (
                                    <div key={key}>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                                        <select
                                            value={filters[key]}
                                            onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                                            className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                                        >
                                            <option value="">Todos</option>
                                            {options.map(opt => {
                                                const value = typeof opt === 'object' ? opt.value : opt;
                                                const label = typeof opt === 'object' ? opt.label : opt;
                                                return <option key={value} value={value}>{label}</option>;
                                            })}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        {['Placa', 'Tipo', 'Site', 'Ubicación', 'Responsable', 'Asignado', 'Clasificación', 'Valor', 'Garantía', 'Estado', ''].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredActivos.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="text-center py-12 text-gray-400">
                                                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                <p>No se encontraron activos</p>
                                            </td>
                                        </tr>
                                    ) : filteredActivos.map(a => {
                                        const estado = a.estado || 'funcional';
                                        const estadoStyle = {
                                            funcional: 'bg-green-100 text-green-800',
                                            en_mantenimiento: 'bg-yellow-100 text-yellow-800',
                                            bodega: 'bg-gray-100 text-gray-700',
                                            dado_de_baja: 'bg-red-100 text-red-800'
                                        }[estado] || 'bg-gray-100 text-gray-700';

                                        return (
                                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">{a.numero_placa}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{TIPO_LABELS[a.tipo_activo] || a.tipo_activo || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.site || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.ubicacion || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{a.responsable || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{a.asignado || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.clasificacion || '—'}</td>
                                                <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                                                    {a.valor ? `$${Number(a.valor).toLocaleString('es-CO')}` : '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${a.garantia === 'Si' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                                        {a.garantia === 'Si' ? 'Sí' : 'No'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoStyle}`}>
                                                        {ESTADO_LABELS[estado] || estado}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => setSelectedActivo(a)}
                                                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 mr-1" />
                                                        Ver
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {filteredActivos.length > 0 && (
                            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                                Mostrando {filteredActivos.length} de {activos.length} activos
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedActivo && (
                <DetailModal activo={selectedActivo} onClose={() => setSelectedActivo(null)} />
            )}
        </div>
    );
};

export default DirectivoDashboard;
