import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, Download, RefreshCw, Search, UserMinus, UserX, Users } from 'lucide-react';
import { awareAgentesService } from '../services/api';

// Pestaña "Empleados activos" del técnico de inventario: cruce por cédula de los empleados de la
// compañía (Gestor/RRHH) con los usuarios activos de Aware (vía VoxPro).

const POR_PAGINA = 100;

const FILTROS = [
    { id: 'todos', label: 'Todos' },
    { id: 'ambos', label: 'Activos en ambos' },
    { id: 'aware_sin_compania', label: 'En Aware, no en la compañía' },
    { id: 'compania_sin_aware', label: 'En la compañía, sin Aware' },
];

const ESTADO_COMPANIA = {
    activo: { texto: 'Activo', clase: 'bg-emerald-100 text-emerald-800' },
    retirado: { texto: 'Retirado', clase: 'bg-red-100 text-red-800' },
    no_registrado: { texto: 'No registrado', clase: 'bg-amber-100 text-amber-800' },
    sin_contrato: { texto: 'Sin contrato', clase: 'bg-gray-100 text-gray-700' },
};

const sinTildes = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "Claro Hogar (AWARE_4)" → "Claro Hogar"; las fichas muestran la campaña y el detalle lleva el servidor.
const nombreCampania = (a) => a.campania.replace(/\s*\([^)]*\)\s*$/, '');

const textoAware = (f) => f.aware
    .map((a) => `${nombreCampania(a)}${a.es_agente ? '' : ` (rol ${a.rol_id})`}`)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(', ');

const Tarjeta = ({ icono, titulo, valor, color, activo, onClick }) => {
    const Icono = icono;
    return (
    <button
        type="button"
        onClick={onClick}
        className={`text-left bg-white rounded-lg shadow p-4 border-2 transition ${activo ? 'border-emerald-500' : 'border-transparent hover:border-gray-200'}`}
    >
        <div className="flex items-center">
            <Icono className={`h-8 w-8 ${color}`} />
            <div className="ml-3">
                <p className="text-sm text-gray-500">{titulo}</p>
                <p className="text-2xl font-semibold text-gray-900">{valor.toLocaleString('es-CO')}</p>
            </div>
        </div>
    </button>
    );
};

const EmpleadosAware = () => {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [campania, setCampania] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [pagina, setPagina] = useState(1);

    const cargar = async (refrescar = false) => {
        setCargando(true);
        setError('');
        try {
            const res = await awareAgentesService.getCruce(refrescar);
            setDatos(res.data.data);
        } catch (err) {
            setError(err.response?.data?.msg || 'No se pudo cargar el cruce con Aware');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar();
    }, []);

    useEffect(() => {
        setPagina(1);
    }, [filtro, campania, busqueda]);

    const campanias = useMemo(() => {
        if (!datos) return [];
        const set = new Set();
        datos.filas.forEach((f) => f.aware.forEach((a) => set.add(nombreCampania(a))));
        return [...set].sort((a, b) => a.localeCompare(b, 'es'));
    }, [datos]);

    const filtradas = useMemo(() => {
        if (!datos) return [];
        const q = sinTildes(busqueda.trim());
        return datos.filas.filter((f) => {
            if (filtro !== 'todos' && f.categoria !== filtro) return false;
            if (campania && !f.aware.some((a) => nombreCampania(a) === campania)) return false;
            if (q && !sinTildes(f.nombre).includes(q) && !sinTildes(f.nombre_aware).includes(q) && !f.cedula.includes(q)) return false;
            return true;
        });
    }, [datos, filtro, campania, busqueda]);

    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
    const visibles = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    const descargarExcel = () => {
        const filas = filtradas.map((f) => ({
            Cedula: f.cedula,
            Nombre: f.nombre,
            'Estado en la compania': ESTADO_COMPANIA[f.estado_compania]?.texto || f.estado_compania,
            'Campana (compania)': f.campania_compania || '',
            'Cargo (compania)': f.cargo_compania || '',
            'Activo en Aware': f.aware.length > 0 ? 'Si' : 'No',
            'Campanas en Aware': textoAware(f),
            'Nombre en Aware': f.nombre_aware || '',
        }));
        const ws = XLSX.utils.json_to_sheet(filas);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
        const fecha = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `empleados_compania_aware_${filtro}_${fecha}.xlsx`);
    };

    const fuentesCaidas = datos?.fuentes?.filter((f) => !f.ok) || [];

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Empleados activos</h2>
                    <p className="text-sm text-gray-500">
                        Quién está activo en la compañía y quién en Aware, cruzado por cédula.
                        {datos?.generado_en && ` Datos de Aware del ${new Date(datos.generado_en).toLocaleString('es-CO')}.`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => cargar(true)}
                        disabled={cargando}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${cargando ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                    <button
                        type="button"
                        onClick={descargarExcel}
                        disabled={!datos || filtradas.length === 0}
                        className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">{error}</div>
            )}

            {fuentesCaidas.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 text-sm flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>
                        No se pudo consultar {fuentesCaidas.map((f) => f.nombre).join(', ')}. Quienes estén solo en
                        esos servidores aparecen como "sin Aware".
                    </span>
                </div>
            )}

            {cargando && !datos && (
                <div className="flex flex-col items-center py-16 text-gray-500">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3" />
                    Consultando Aware…
                </div>
            )}

            {datos && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Tarjeta icono={Users} titulo="Activos en la compañía" valor={datos.resumen.activos_compania} color="text-blue-500"
                            activo={filtro === 'todos'} onClick={() => setFiltro('todos')} />
                        <Tarjeta icono={CheckCircle2} titulo="Activos en ambos" valor={datos.resumen.ambos} color="text-emerald-500"
                            activo={filtro === 'ambos'} onClick={() => setFiltro('ambos')} />
                        <Tarjeta icono={UserX} titulo="En Aware, no en la compañía" valor={datos.resumen.aware_sin_compania} color="text-red-500"
                            activo={filtro === 'aware_sin_compania'} onClick={() => setFiltro('aware_sin_compania')} />
                        <Tarjeta icono={UserMinus} titulo="En la compañía, sin Aware" valor={datos.resumen.compania_sin_aware} color="text-amber-500"
                            activo={filtro === 'compania_sin_aware'} onClick={() => setFiltro('compania_sin_aware')} />
                    </div>

                    <div className="bg-white rounded-lg shadow">
                        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar por nombre o cédula"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <select
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                                className="border border-gray-300 rounded-md text-sm py-2 px-3"
                            >
                                {FILTROS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                            </select>
                            <select
                                value={campania}
                                onChange={(e) => setCampania(e.target.value)}
                                className="border border-gray-300 rounded-md text-sm py-2 px-3"
                            >
                                <option value="">Todas las campañas de Aware</option>
                                {campanias.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500">Cédula</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500">Compañía</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500">Aware</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {visibles.map((f) => {
                                        const estado = ESTADO_COMPANIA[f.estado_compania] || ESTADO_COMPANIA.sin_contrato;
                                        return (
                                            <tr key={f.cedula} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-mono text-gray-700 whitespace-nowrap">{f.cedula}</td>
                                                <td className="px-4 py-2">
                                                    <div className="text-gray-900">{f.nombre}</div>
                                                    {f.nombre_aware && sinTildes(f.nombre_aware) !== sinTildes(f.nombre) && (
                                                        <div className="text-xs text-gray-400">En Aware: {f.nombre_aware}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${estado.clase}`}>{estado.texto}</span>
                                                    {(f.campania_compania || f.cargo_compania) && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {[f.campania_compania, f.cargo_compania].filter(Boolean).join(' · ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {f.aware.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {f.aware.map((a) => (
                                                                <span
                                                                    key={`${a.folder}-${a.rol_id}`}
                                                                    title={a.campania}
                                                                    className={`inline-flex px-2 py-0.5 rounded text-xs ${a.es_agente ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                                                                >
                                                                    {nombreCampania(a)}{!a.es_agente && ` · rol ${a.rol_id}`}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Sin usuario activo</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {visibles.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-10 text-center text-gray-500">No hay empleados con estos filtros.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                            <span>{filtradas.length.toLocaleString('es-CO')} empleados</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                    disabled={pagina === 1}
                                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
                                >
                                    Anterior
                                </button>
                                <span>{pagina} / {totalPaginas}</span>
                                <button
                                    type="button"
                                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                                    disabled={pagina === totalPaginas}
                                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">
                        En Aware, el rol 2 es el de agente; los usuarios con otro rol (supervisores, administradores) se marcan con su número de rol.
                    </p>
                </>
            )}
        </div>
    );
};

export default EmpleadosAware;
