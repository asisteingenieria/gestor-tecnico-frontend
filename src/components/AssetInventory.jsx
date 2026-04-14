import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';
import AssetDetailModal from './AssetDetailModal';
import AssetForm from './AssetForm';
import {
    Package,
    Search,
    Filter,
    Calendar,
    Download,
    Eye,
    Edit,
    FileText,
    AlertCircle,
    RefreshCw,
    HardDrive
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const AssetInventory = () => {
    const { user, isGestorActivos } = useAuth();
    const [activos, setActivos] = useState([]);
    const [filteredActivos, setFilteredActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedActivo, setSelectedActivo] = useState(null);

    // Filtros
    const [filters, setFilters] = useState({
        numeroPlaca: '',
        fechaInicio: '',
        fechaFin: '',
        numeroSerie: '',
        proveedor: '',
        ordenCompra: '',
        ubicacion: '',
        clasificacion: '',
        garantia: '',
        site: '',
        estado: '',
        tipoActivo: '',
        puesto: '',
        responsable: '',
        asignado: ''
    });

    // Si no es gestor de activos, mostrar mensaje de acceso denegado
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
        fetchActivos();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [activos, filters]);

    const fetchActivos = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/activos`);
            setActivos(response.data.activos);
            setError('');
        } catch (error) {
            console.error('Error al cargar activos:', error);
            setError('Error al cargar el inventario');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...activos];

        // Filtro por número de placa
        if (filters.numeroPlaca) {
            filtered = filtered.filter(activo => 
                activo.numero_placa && 
                activo.numero_placa.toLowerCase().includes(filters.numeroPlaca.toLowerCase())
            );
        }

        // Filtro por fecha de compra (rango)
        if (filters.fechaInicio) {
            filtered = filtered.filter(activo => 
                activo.fecha_compra && activo.fecha_compra >= filters.fechaInicio
            );
        }

        if (filters.fechaFin) {
            filtered = filtered.filter(activo => 
                activo.fecha_compra && activo.fecha_compra <= filters.fechaFin
            );
        }

        // Filtro por número de serie
        if (filters.numeroSerie) {
            filtered = filtered.filter(activo => 
                activo.numero_social && 
                activo.numero_social.toLowerCase().includes(filters.numeroSerie.toLowerCase())
            );
        }

        // Filtro por proveedor
        if (filters.proveedor) {
            filtered = filtered.filter(activo => 
                activo.proveedor && 
                activo.proveedor.toLowerCase().includes(filters.proveedor.toLowerCase())
            );
        }

        // Filtro por orden de compra
        if (filters.ordenCompra) {
            filtered = filtered.filter(activo => 
                activo.orden_compra && 
                activo.orden_compra.toLowerCase().includes(filters.ordenCompra.toLowerCase())
            );
        }

        // Filtro por ubicación
        if (filters.ubicacion) {
            filtered = filtered.filter(activo => activo.ubicacion === filters.ubicacion);
        }

        // Filtro por clasificación
        if (filters.clasificacion) {
            filtered = filtered.filter(activo => activo.clasificacion === filters.clasificacion);
        }

        // Filtro por garantía
        if (filters.garantia) {
            filtered = filtered.filter(activo => activo.garantia === filters.garantia);
        }

        // Filtro por site
        if (filters.site) {
            filtered = filtered.filter(activo => activo.site === filters.site);
        }

        // Filtro por estado
        if (filters.estado) {
            filtered = filtered.filter(activo => activo.estado === filters.estado);
        }

        // Filtro por tipo de activo
        if (filters.tipoActivo) {
            filtered = filtered.filter(activo => {
                const numeroPlaca = activo.numero_placa || '';
                const placa = numeroPlaca.toUpperCase();
                if (filters.tipoActivo === 'ECC-CPU') return placa.startsWith('ECC-CPU');
                if (filters.tipoActivo === 'ECC-SER') return placa.startsWith('ECC-SER');
                if (filters.tipoActivo === 'ECC-MON') return placa.startsWith('ECC-MON');
                if (filters.tipoActivo === 'ECC-IMP') return placa.startsWith('ECC-IMP');
                if (filters.tipoActivo === 'ECC-POR') return placa.startsWith('ECC-POR');
                if (filters.tipoActivo === 'ECC-TV') return placa.startsWith('ECC-TV');
                return true;
            });
        }

        // Filtro por puesto
        if (filters.puesto) {
            filtered = filtered.filter(activo => 
                activo.puesto && 
                activo.puesto.toLowerCase().includes(filters.puesto.toLowerCase())
            );
        }

        // Filtro por responsable
        if (filters.responsable) {
            filtered = filtered.filter(activo => 
                activo.responsable && 
                activo.responsable.toLowerCase().includes(filters.responsable.toLowerCase())
            );
        }

        // Filtro por asignado
        if (filters.asignado) {
            filtered = filtered.filter(activo => 
                activo.asignado && 
                activo.asignado.toLowerCase().includes(filters.asignado.toLowerCase())
            );
        }

        setFilteredActivos(filtered);
    };

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            numeroPlaca: '',
            fechaInicio: '',
            fechaFin: '',
            numeroSerie: '',
            proveedor: '',
            ordenCompra: '',
            ubicacion: '',
            clasificacion: '',
            garantia: '',
            site: '',
            estado: '',
            tipoActivo: '',
            puesto: '',
            responsable: '',
            asignado: ''
        });
    };

    const exportToCSV = () => {
        if (filteredActivos.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        const headers = [
            'Número de Placa',
            'Centro de Costes',
            'Site',
            'Ubicación',
            'Responsable',
            'Asignado',
            'Proveedor',
            'Fecha de Compra',
            'Número de Serie',
            'Puesto',
            'Clasificación',
            'Garantía',
            'Fecha Venc. Garantía',
            'Orden de Compra'
        ];

        const csvContent = [
            headers.join(','),
            ...filteredActivos.map(activo => [
                activo.numero_placa,
                activo.centro_costes,
                activo.site || '',
                activo.ubicacion,
                activo.responsable,
                activo.asignado || '',
                activo.proveedor || '',
                activo.fecha_compra || '',
                activo.numero_social || '',
                activo.puesto || '',
                activo.clasificacion,
                activo.garantia,
                activo.fecha_vencimiento_garantia || '',
                activo.orden_compra || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventario_activos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Función para clasificar el tipo de disco
    const clasificarTipoDisco = (almacenamiento) => {
        if (!almacenamiento) return 'Sin especificar';

        const storage = almacenamiento.toUpperCase();

        if (storage.includes('SSD') || storage.includes('SÓLIDO') || storage.includes('SOLIDO') ||
            storage.includes('NVME') || storage.includes('M.2') || storage.includes('SOLID STATE')) {
            return 'SSD';
        }

        if (storage.includes('HDD') || storage.includes('MECÁNICO') || storage.includes('MECANICO') ||
            storage.includes('DISCO DURO') || storage.includes('HARD DRIVE') || storage.includes('RPM')) {
            return 'HDD';
        }

        return 'Sin clasificar';
    };

    // Exportar CPUs con RAM y Almacenamiento a Excel
    const exportCPUStorageToExcel = () => {
        // Filtrar solo CPUs
        const cpus = activos.filter(activo => {
            const placa = (activo.numero_placa || '').toUpperCase();
            return placa.startsWith('ECC-CPU') || placa.startsWith("ECC'CPU");
        });

        if (cpus.length === 0) {
            alert('No hay CPUs registradas en el inventario');
            return;
        }

        // Clasificar cada CPU
        const cpusConTipo = cpus.map(cpu => ({
            ...cpu,
            tipoDisco: clasificarTipoDisco(cpu.almacenamiento)
        }));

        // Estadísticas
        const totalSSD = cpusConTipo.filter(c => c.tipoDisco === 'SSD').length;
        const totalHDD = cpusConTipo.filter(c => c.tipoDisco === 'HDD').length;
        const totalSinClasificar = cpusConTipo.filter(c => c.tipoDisco === 'Sin clasificar' || c.tipoDisco === 'Sin especificar').length;

        // Stats por ubicación
        const ubicaciones = [...new Set(cpusConTipo.map(c => c.ubicacion).filter(Boolean))].sort();
        const statsPorUbicacion = ubicaciones.map(ub => {
            const cpusUb = cpusConTipo.filter(c => c.ubicacion === ub);
            return {
                ubicacion: ub,
                total: cpusUb.length,
                ssd: cpusUb.filter(c => c.tipoDisco === 'SSD').length,
                hdd: cpusUb.filter(c => c.tipoDisco === 'HDD').length
            };
        });

        // Stats por Site
        const sites = [...new Set(cpusConTipo.map(c => c.site).filter(Boolean))].sort();
        const statsPorSite = sites.map(site => {
            const cpusSite = cpusConTipo.filter(c => c.site === site);
            return {
                site,
                total: cpusSite.length,
                ssd: cpusSite.filter(c => c.tipoDisco === 'SSD').length,
                hdd: cpusSite.filter(c => c.tipoDisco === 'HDD').length
            };
        });

        // Stats por RAM
        const tiposRAM = [...new Set(cpusConTipo.map(c => c.memoria_ram || 'Sin especificar'))].sort();
        const statsPorRAM = tiposRAM.map(ram => ({
            ram,
            cantidad: cpusConTipo.filter(c => (c.memoria_ram || 'Sin especificar') === ram).length
        }));

        const fechaReporte = new Date().toLocaleDateString('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Crear workbook
        const wb = XLSX.utils.book_new();

        // ========== HOJA 1: RESUMEN ==========
        const resumenData = [
            ['REPORTE DE CPUs - RAM Y ALMACENAMIENTO'],
            [''],
            ['Fecha de generación:', fechaReporte],
            ['Total de equipos:', cpus.length],
            [''],
            [''],
            ['RESUMEN POR MEMORIA RAM'],
            ['RAM', 'Cantidad', 'Porcentaje'],
            ...statsPorRAM.map(s => [s.ram, s.cantidad, cpus.length > 0 ? `${((s.cantidad/cpus.length)*100).toFixed(1)}%` : '0%']),
            [''],
            [''],
            ['RESUMEN POR TIPO DE DISCO'],
            ['Tipo', 'Cantidad', 'Porcentaje'],
            ['SSD (Disco Sólido)', totalSSD, cpus.length > 0 ? `${((totalSSD/cpus.length)*100).toFixed(1)}%` : '0%'],
            ['HDD (Disco Mecánico)', totalHDD, cpus.length > 0 ? `${((totalHDD/cpus.length)*100).toFixed(1)}%` : '0%'],
            ['Sin clasificar', totalSinClasificar, cpus.length > 0 ? `${((totalSinClasificar/cpus.length)*100).toFixed(1)}%` : '0%'],
            [''],
            [''],
            ['DISTRIBUCIÓN POR UBICACIÓN'],
            ['Ubicación', 'Total', 'SSD', 'HDD'],
            ...statsPorUbicacion.map(s => [s.ubicacion, s.total, s.ssd, s.hdd]),
            [''],
            [''],
            ['DISTRIBUCIÓN POR SITE'],
            ['Site', 'Total', 'SSD', 'HDD'],
            ...statsPorSite.map(s => [s.site, s.total, s.ssd, s.hdd])
        ];

        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

        // Anchos de columna para Resumen
        wsResumen['!cols'] = [
            { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // ========== HOJA 2: DETALLE DE EQUIPOS ==========
        const cpusOrdenados = [...cpusConTipo].sort((a, b) => {
            const ubicacionCompare = (a.ubicacion || '').localeCompare(b.ubicacion || '');
            if (ubicacionCompare !== 0) return ubicacionCompare;
            return (a.tipoDisco || '').localeCompare(b.tipoDisco || '');
        });

        const detalleData = [
            ['DETALLE DE EQUIPOS'],
            [''],
            ['#', 'Placa', 'Ubicación', 'Site', 'Puesto', 'Asignado', 'RAM', 'Almacenamiento', 'Tipo Disco'],
            ...cpusOrdenados.map((cpu, i) => [
                i + 1,
                cpu.numero_placa || '',
                cpu.ubicacion || '',
                cpu.site || '',
                cpu.puesto || '',
                cpu.asignado || '',
                cpu.memoria_ram || '',
                cpu.almacenamiento || '',
                cpu.tipoDisco
            ])
        ];

        const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);

        // Anchos de columna para Detalle
        wsDetalle['!cols'] = [
            { wch: 5 },   // #
            { wch: 18 },  // Placa
            { wch: 15 },  // Ubicación
            { wch: 10 },  // Site
            { wch: 10 },  // Puesto
            { wch: 25 },  // Asignado
            { wch: 15 },  // RAM
            { wch: 20 },  // Almacenamiento
            { wch: 15 }   // Tipo Disco
        ];

        XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Equipos');

        // ========== HOJA 3: SOLO SSD ==========
        const cpusSSD = cpusOrdenados.filter(c => c.tipoDisco === 'SSD');
        const ssdData = [
            ['EQUIPOS CON DISCO SSD (SÓLIDO)'],
            [''],
            [`Total: ${cpusSSD.length} equipos`],
            [''],
            ['#', 'Placa', 'Ubicación', 'Site', 'Puesto', 'Asignado', 'RAM', 'Almacenamiento'],
            ...cpusSSD.map((cpu, i) => [
                i + 1,
                cpu.numero_placa || '',
                cpu.ubicacion || '',
                cpu.site || '',
                cpu.puesto || '',
                cpu.asignado || '',
                cpu.memoria_ram || '',
                cpu.almacenamiento || ''
            ])
        ];

        const wsSSD = XLSX.utils.aoa_to_sheet(ssdData);
        wsSSD['!cols'] = [
            { wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 10 },
            { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, wsSSD, 'SSD');

        // ========== HOJA 4: SOLO HDD ==========
        const cpusHDD = cpusOrdenados.filter(c => c.tipoDisco === 'HDD');
        const hddData = [
            ['EQUIPOS CON DISCO HDD (MECÁNICO)'],
            [''],
            [`Total: ${cpusHDD.length} equipos`],
            [''],
            ['#', 'Placa', 'Ubicación', 'Site', 'Puesto', 'Asignado', 'RAM', 'Almacenamiento'],
            ...cpusHDD.map((cpu, i) => [
                i + 1,
                cpu.numero_placa || '',
                cpu.ubicacion || '',
                cpu.site || '',
                cpu.puesto || '',
                cpu.asignado || '',
                cpu.memoria_ram || '',
                cpu.almacenamiento || ''
            ])
        ];

        const wsHDD = XLSX.utils.aoa_to_sheet(hddData);
        wsHDD['!cols'] = [
            { wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 10 },
            { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, wsHDD, 'HDD');

        // Descargar archivo
        XLSX.writeFile(wb, `Reporte_CPUs_RAM_Disco_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleViewActivo = (activo) => {
        setSelectedActivo(activo);
        setShowDetailModal(true);
    };

    const handleEditActivo = (activo) => {
        setSelectedActivo(activo);
        setShowEditModal(true);
    };

    const handleEditSuccess = () => {
        setShowEditModal(false);
        setSelectedActivo(null);
        // Recargar la lista de activos
        fetchActivos();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando inventario...</p>
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
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventario de Activos</h1>
                        <p className="text-gray-600">
                            Visualiza y filtra el inventario completo de activos de la empresa
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filtros
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </button>
                        <button
                            onClick={exportCPUStorageToExcel}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                            title="Exportar reporte de CPUs con RAM y tipo de disco (SSD/HDD)"
                        >
                            <HardDrive className="h-4 w-4 mr-2" />
                            CPUs RAM/Disco
                        </button>
                        <button
                            onClick={fetchActivos}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            {showFilters && (
                <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Filtros de Búsqueda</h3>
                        <button
                            onClick={clearFilters}
                            className="text-sm text-indigo-600 hover:text-indigo-500"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Número de Placa */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número de Placa
                            </label>
                            <input
                                type="text"
                                value={filters.numeroPlaca}
                                onChange={(e) => handleFilterChange('numeroPlaca', e.target.value)}
                                placeholder="ECC-CPU-001, ECC'CPU'001..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Fecha Inicio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha Compra (Desde)
                            </label>
                            <input
                                type="date"
                                value={filters.fechaInicio}
                                onChange={(e) => handleFilterChange('fechaInicio', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Fecha Fin */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha Compra (Hasta)
                            </label>
                            <input
                                type="date"
                                value={filters.fechaFin}
                                onChange={(e) => handleFilterChange('fechaFin', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Número de Serie */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número de Serie
                            </label>
                            <input
                                type="text"
                                value={filters.numeroSerie}
                                onChange={(e) => handleFilterChange('numeroSerie', e.target.value)}
                                placeholder="Buscar por número de serie..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Proveedor */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Proveedor
                            </label>
                            <input
                                type="text"
                                value={filters.proveedor}
                                onChange={(e) => handleFilterChange('proveedor', e.target.value)}
                                placeholder="Buscar por proveedor..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Orden de Compra */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Orden de Compra
                            </label>
                            <input
                                type="text"
                                value={filters.ordenCompra}
                                onChange={(e) => handleFilterChange('ordenCompra', e.target.value)}
                                placeholder="Buscar por orden de compra..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Ubicación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ubicación
                            </label>
                            <select
                                value={filters.ubicacion}
                                onChange={(e) => handleFilterChange('ubicacion', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Todas las ubicaciones</option>
                                <option value="Claro">Claro</option>
                                <option value="Obama">Obama</option>
                                <option value="IT">IT</option>
                                <option value="Contratación">Contratación</option>
                                <option value="Reclutamiento">Reclutamiento</option>
                                <option value="Selección">Selección</option>
                                <option value="Finanzas">Finanzas</option>
                            </select>
                        </div>

                        {/* Clasificación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Clasificación
                            </label>
                            <select
                                value={filters.clasificacion}
                                onChange={(e) => handleFilterChange('clasificacion', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Todas las clasificaciones</option>
                                <option value="Activo productivo">Activo productivo</option>
                                <option value="Activo no productivo">Activo no productivo</option>
                            </select>
                        </div>

                        {/* Garantía */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Garantía
                            </label>
                            <select
                                value={filters.garantia}
                                onChange={(e) => handleFilterChange('garantia', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Todas</option>
                                <option value="Si">Con garantía</option>
                                <option value="No">Sin garantía</option>
                            </select>
                        </div>

                        {/* Site */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Site
                            </label>
                            <select
                                value={filters.site}
                                onChange={(e) => handleFilterChange('site', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Todos los sites</option>
                                <option value="Site A">Site A</option>
                                <option value="Site B">Site B</option>
                            </select>
                        </div>

                        {/* Estado */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estado
                            </label>
                            <select
                                value={filters.estado}
                                onChange={(e) => handleFilterChange('estado', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Todos los estados</option>
                                <option value="funcional">Funcional</option>
                                <option value="en_reparacion">En reparación</option>
                                <option value="dado_de_baja">Dado de baja</option>
                                <option value="en_mantenimiento">En mantenimiento</option>
                                <option value="disponible">Disponible</option>
                                <option value="asignado">Asignado</option>
                                <option value="fuera_de_servicio">Fuera de servicio</option>
                            </select>
                        </div>

                        {/* Tipo de Activo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de Activo
                            </label>
                            <select
                                value={filters.tipoActivo}
                                onChange={(e) => handleFilterChange('tipoActivo', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Todos los tipos</option>
                                <option value="ECC-CPU">Computadoras (ECC-CPU)</option>
                                <option value="ECC-SER">Servidores (ECC-SER)</option>
                                <option value="ECC-MON">Monitores (ECC-MON)</option>
                                <option value="ECC-IMP">Impresoras (ECC-IMP)</option>
                                <option value="ECC-POR">Portátiles (ECC-POR)</option>
                                <option value="ECC-TV">Televisores (ECC-TV)</option>
                            </select>
                        </div>

                        {/* Puesto */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Puesto
                            </label>
                            <input
                                type="text"
                                value={filters.puesto}
                                onChange={(e) => handleFilterChange('puesto', e.target.value)}
                                placeholder="001, 090, 106..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Responsable */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Responsable
                            </label>
                            <input
                                type="text"
                                value={filters.responsable}
                                onChange={(e) => handleFilterChange('responsable', e.target.value)}
                                placeholder="Buscar por responsable..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Asignado */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Asignado
                            </label>
                            <input
                                type="text"
                                value={filters.asignado}
                                onChange={(e) => handleFilterChange('asignado', e.target.value)}
                                placeholder="Buscar por asignado..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <Package className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                        <div className="ml-3 min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">Total Mostrado</p>
                            <p className="font-bold text-gray-900 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl overflow-hidden whitespace-nowrap">{filteredActivos.length}</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex flex-col">
                        <p className="text-sm font-medium text-gray-500 mb-2">Con Garantía</p>
                        <p className="font-bold text-gray-900 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl overflow-hidden whitespace-nowrap">
                            {filteredActivos.filter(a => a.garantia === 'Si').length}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-start">
                        <Package className="h-8 w-8 text-blue-600 flex-shrink-0" />
                        <div className="ml-3 min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">Productivos</p>
                            <p className="text-xl font-bold text-gray-900 break-words">
                                {filteredActivos.filter(a => a.clasificacion === 'Activo productivo').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-start">
                        <Calendar className="h-8 w-8 text-orange-600 flex-shrink-0" />
                        <div className="ml-3 min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">Con Fecha Compra</p>
                            <p className="text-xl font-bold text-gray-900 break-words">
                                {filteredActivos.filter(a => a.fecha_compra).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Tabla de inventario */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Activo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ubicación
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Responsable
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Asignado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Puesto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    N° Serie
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Clasificación
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredActivos.map((activo) => (
                                <tr key={activo.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {activo.numero_placa}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Centro: {activo.centro_costes}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {activo.ubicacion}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {activo.responsable}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {activo.asignado || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {activo.puesto || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {activo.numero_social || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            activo.clasificacion === 'Activo productivo' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {activo.clasificacion}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleViewActivo(activo)}
                                                className="text-green-600 hover:text-green-900"
                                                title="Ver detalles completos"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEditActivo(activo)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="Editar activo"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredActivos.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay activos</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {activos.length === 0 
                                ? 'No hay activos registrados en el inventario.'
                                : 'No se encontraron activos que coincidan con los filtros aplicados.'
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Asset Detail Modal */}
            <AssetDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                activo={selectedActivo}
            />

            {/* Asset Edit Modal */}
            <AssetForm
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedActivo(null);
                }}
                activo={selectedActivo}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
};

export default AssetInventory;