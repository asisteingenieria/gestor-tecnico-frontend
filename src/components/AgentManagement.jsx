import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AgentForm from './AgentForm';
import EmpleadoDrawer from './EmpleadoDrawer';
import RetiroModal from './RetiroModal';
import ConfirmarEliminarModal from './ConfirmarEliminarModal';
import ImportEmpleadosModal from './ImportEmpleadosModal';
import Pagination from './Pagination';
import { nombrePropio, iniciales, claseCampania, formatearTelefono, primeraMayuscula } from '../utils/formatoRRHH';
import {
    Users, Plus, Search, Edit3, Trash2, Eye,
    Package, AlertCircle, UserCheck, Wallet,
    Upload, Filter, ChevronDown, LayoutGrid, List
} from 'lucide-react';

const PAGE_SIZES = [20, 25, 50];

const formatSalario = (val) => {
    if (val == null) return '—';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
};

const estadoBadge = (estado) => {
    if (estado === 'activo') return { clase: 'ai-badge--success', texto: 'Activo' };
    if (['retirado', 'inactivo'].includes(estado)) return { clase: 'ai-badge--danger', texto: primeraMayuscula(estado || '') };
    if (!estado) return { clase: 'ai-badge--info', texto: 'Sin contrato' };
    return { clase: 'ai-badge--warning', texto: primeraMayuscula(estado) };
};

/** Chip de filtro con popover de checkboxes (Campaña / Estado / Cargo). */
const FiltroChip = ({ etiqueta, opciones, seleccion, onChange }) => {
    const [abierto, setAbierto] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);
    const menuRef = useRef(null);

    // El menú se saca a un portal en <body> porque .ai-card (el contenedor de la tabla)
    // tiene overflow oculto para recortar las esquinas redondeadas — con pocos resultados
    // filtrados la tarjeta se encoge y el menú (incluido el botón "Limpiar") quedaba
    // cortado en vez de flotar por encima de la tabla.
    useEffect(() => {
        const cerrarFuera = (e) => {
            if (btnRef.current?.contains(e.target)) return;
            if (menuRef.current?.contains(e.target)) return;
            setAbierto(false);
        };
        // capture:true porque la página no tiene un único contenedor con scroll — pero
        // eso también dispara el scroll interno del propio menú (overflowY: auto), así
        // que hay que ignorar los eventos que se originan dentro de él.
        const cerrarAlScrollear = (e) => {
            if (menuRef.current?.contains(e.target)) return;
            setAbierto(false);
        };
        document.addEventListener('mousedown', cerrarFuera);
        window.addEventListener('scroll', cerrarAlScrollear, true);
        window.addEventListener('resize', cerrarAlScrollear);
        return () => {
            document.removeEventListener('mousedown', cerrarFuera);
            window.removeEventListener('scroll', cerrarAlScrollear, true);
            window.removeEventListener('resize', cerrarAlScrollear);
        };
    }, []);

    const activo = seleccion.size > 0;
    const resumen = activo
        ? `${etiqueta}: ${seleccion.size === 1 ? [...seleccion][0] : `${seleccion.size} seleccionadas`}`
        : `${etiqueta}: Todas`;

    const toggle = (valor) => {
        const next = new Set(seleccion);
        if (next.has(valor)) next.delete(valor); else next.add(valor);
        onChange(next);
    };

    const abrir = () => {
        if (!abierto && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setCoords({ top: r.bottom + 6, left: r.left });
        }
        setAbierto(o => !o);
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                ref={btnRef}
                type="button"
                className={`ai-filter${activo ? ' is-on' : ''}`}
                onClick={abrir}
            >
                <Filter size={14} strokeWidth={1.75} />
                {resumen}
                <ChevronDown size={14} strokeWidth={1.75} />
            </button>
            {abierto && createPortal(
                <div
                    ref={menuRef}
                    role="menu"
                    style={{
                        position: 'fixed', top: coords.top, left: coords.left, minWidth: 200, zIndex: 1000,
                        background: 'var(--surface-100)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)', padding: 8,
                        maxHeight: '60vh', overflowY: 'auto'
                    }}
                >
                    {opciones.length === 0 && (
                        <p className="ai-muted" style={{ fontSize: 13, padding: '4px 6px' }}>Sin opciones</p>
                    )}
                    {opciones.map((op) => (
                        <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', fontSize: 13, color: 'var(--ink)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={seleccion.has(op)} onChange={() => toggle(op)} />
                            {op}
                        </label>
                    ))}
                    {activo && (
                        <button
                            type="button"
                            className="ai-btn ai-btn--ghost ai-btn--sm"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                            onClick={() => onChange(new Set())}
                        >
                            Limpiar
                        </button>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

const AgentManagement = () => {
    const { isRecursosHumanos } = useAuth();
    const [empleados, setEmpleados] = useState([]);
    const [gastoTotal, setGastoTotal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedEmpleado, setSelectedEmpleado] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [perfilEmpleadoId, setPerfilEmpleadoId] = useState(null);
    const [retiroEmpleadoId, setRetiroEmpleadoId] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [empleadoAEliminar, setEmpleadoAEliminar] = useState(null);
    const [vista, setVista] = useState('tabla');
    const [filtroCampanias, setFiltroCampanias] = useState(new Set());
    const [filtroEstados, setFiltroEstados] = useState(new Set());
    const [filtroCargos, setFiltroCargos] = useState(new Set());
    const [filtroAnalistas, setFiltroAnalistas] = useState(new Set());

    useEffect(() => {
        fetchEmpleados();
        fetchGastoTotal();
    }, []);

    // Búsqueda con debounce de 300ms
    useEffect(() => {
        const t = setTimeout(() => setSearchTerm(searchInput), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, filtroCampanias, filtroEstados, filtroCargos, filtroAnalistas, pageSize]);

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

    const handleConfirmarEliminar = async (id) => {
        try {
            await api.delete(`/users-company/${id}`);
            await fetchEmpleados();
            await fetchGastoTotal();
            setEmpleadoAEliminar(null);
        } catch (err) {
            console.error('Error al eliminar empleado:', err);
            setError('Error al eliminar el empleado');
        }
    };

    const opcionesCampania = useMemo(
        () => [...new Set(empleados.map(e => e.campania_nombre).filter(Boolean))].sort(),
        [empleados]
    );
    const opcionesEstado = useMemo(
        () => [...new Set(empleados.map(e => estadoBadge(e.estado_contrato_nombre).texto))].sort(),
        [empleados]
    );
    const opcionesCargo = useMemo(
        () => [...new Set(empleados.map(e => e.cargo_nombre).filter(Boolean))].sort(),
        [empleados]
    );
    const opcionesAnalista = useMemo(
        () => [...new Set(empleados.map(e => e.analista_encargado_nombre).filter(Boolean))].sort(),
        [empleados]
    );

    const filteredEmpleados = empleados.filter(e => {
        const coincideTexto = !searchTerm || [
            e.nombre_completo, e.numero_identificacion, e.email, e.telefono, e.campania_nombre, e.cargo_nombre
        ].some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase()));
        const coincideCampania = filtroCampanias.size === 0 || filtroCampanias.has(e.campania_nombre);
        const coincideEstado = filtroEstados.size === 0 || filtroEstados.has(estadoBadge(e.estado_contrato_nombre).texto);
        const coincideCargo = filtroCargos.size === 0 || filtroCargos.has(e.cargo_nombre);
        const coincideAnalista = filtroAnalistas.size === 0 || filtroAnalistas.has(e.analista_encargado_nombre);
        return coincideTexto && coincideCampania && coincideEstado && coincideCargo && coincideAnalista;
    });

    const totalConActivos = empleados.filter(e => e.total_activos > 0).length;
    const totalActivos = empleados.reduce((sum, e) => sum + (e.total_activos || 0), 0);

    const totalPages = Math.max(1, Math.ceil(filteredEmpleados.length / pageSize));
    const paginaSegura = Math.min(page, totalPages);
    const paginatedEmpleados = filteredEmpleados.slice((paginaSegura - 1) * pageSize, paginaSegura * pageSize);

    const limpiarFiltros = () => {
        setSearchInput('');
        setFiltroCampanias(new Set());
        setFiltroEstados(new Set());
        setFiltroCargos(new Set());
        setFiltroAnalistas(new Set());
    };

    const hayFiltrosActivos = searchTerm || filtroCampanias.size > 0 || filtroEstados.size > 0 || filtroCargos.size > 0 || filtroAnalistas.size > 0;

    if (!isRecursosHumanos) {
        return (
            <div className="ai-scope" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="ai-card" style={{ padding: 32, textAlign: 'center' }}>
                    <AlertCircle className="mx-auto" size={48} strokeWidth={1.75} style={{ color: 'var(--danger)', marginBottom: 12 }} />
                    <h2 style={{ font: '600 20px var(--font-display)', color: 'var(--ink)', margin: '0 0 6px' }}>Acceso denegado</h2>
                    <p className="ai-muted">Solo Recursos Humanos puede acceder a esta sección.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-scope">
            <div className="ai-content">
                <div className="ai-page-head">
                    <div>
                        <h1 className="ai-page-title">Personal de la empresa</h1>
                        <p className="ai-page-sub">Registra y administra los empleados y sus activos asignados</p>
                    </div>
                    <div className="ai-row">
                        <div className="ai-seg">
                            <span className={vista === 'tabla' ? 'is-active' : ''} onClick={() => setVista('tabla')} style={{ cursor: 'pointer' }}>
                                <List size={14} strokeWidth={1.75} /> Tabla
                            </span>
                            <span className={vista === 'tarjetas' ? 'is-active' : ''} onClick={() => setVista('tarjetas')} style={{ cursor: 'pointer' }}>
                                <LayoutGrid size={14} strokeWidth={1.75} /> Tarjetas
                            </span>
                        </div>
                        <button onClick={() => setShowImportModal(true)} className="ai-btn ai-btn--secondary">
                            <Upload size={16} strokeWidth={1.75} />
                            Cargar Excel
                        </button>
                        <button onClick={handleCreateEmpleado} className="ai-btn ai-btn--primary">
                            <Plus size={16} strokeWidth={1.75} />
                            Nuevo empleado
                        </button>
                    </div>
                </div>

                <div className="ai-kpi-strip">
                    <div>
                        <span className="ai-kpi-icon"><Users size={18} strokeWidth={1.75} /></span>
                        <div>
                            <p className="ai-kpi-label">Total empleados</p>
                            <p className="ai-kpi-value ai-num">{empleados.length}</p>
                        </div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><UserCheck size={18} strokeWidth={1.75} /></span>
                        <div>
                            <p className="ai-kpi-label">Con activos asignados</p>
                            <p className="ai-kpi-value ai-num">{totalConActivos}</p>
                        </div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><Package size={18} strokeWidth={1.75} /></span>
                        <div>
                            <p className="ai-kpi-label">Total activos asignados</p>
                            <p className="ai-kpi-value ai-num">{totalActivos}</p>
                        </div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><Wallet size={18} strokeWidth={1.75} /></span>
                        <div>
                            <p className="ai-kpi-label">Gasto mensual en personal</p>
                            <p className="ai-kpi-value ai-num">{gastoTotal ? formatSalario(gastoTotal.gasto_mensual_total) : '—'}</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px' }}>
                        {error}
                    </div>
                )}

                <div className="ai-card">
                    <div className="ai-toolbar">
                        <div className="ai-search" style={{ flex: 1 }}>
                            <Search size={16} strokeWidth={1.75} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, identificación, correo, campaña o cargo…"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, font: 'inherit', color: 'var(--ink)' }}
                            />
                        </div>
                        <FiltroChip etiqueta="Campaña" opciones={opcionesCampania} seleccion={filtroCampanias} onChange={setFiltroCampanias} />
                        <FiltroChip etiqueta="Estado" opciones={opcionesEstado} seleccion={filtroEstados} onChange={setFiltroEstados} />
                        <FiltroChip etiqueta="Cargo" opciones={opcionesCargo} seleccion={filtroCargos} onChange={setFiltroCargos} />
                        <FiltroChip etiqueta="Analista" opciones={opcionesAnalista} seleccion={filtroAnalistas} onChange={setFiltroAnalistas} />
                    </div>

                    {loading ? (
                        <div>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-200)' }} />
                                    <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--surface-200)', maxWidth: 220 }} />
                                    <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--surface-200)', maxWidth: 120 }} />
                                    <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--surface-200)', maxWidth: 90 }} />
                                </div>
                            ))}
                        </div>
                    ) : filteredEmpleados.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                            <Users size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)', margin: '0 auto 12px' }} />
                            <p style={{ font: '600 14px var(--font-sans)', color: 'var(--ink)' }}>No hay empleados que coincidan con los filtros</p>
                            {hayFiltrosActivos && (
                                <button className="ai-btn ai-btn--ghost ai-btn--sm" style={{ marginTop: 12 }} onClick={limpiarFiltros}>
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    ) : vista === 'tarjetas' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, padding: 16 }}>
                            {paginatedEmpleados.map((empleado) => {
                                const est = estadoBadge(empleado.estado_contrato_nombre);
                                return (
                                    <div key={empleado.id} className="ai-card" style={{ padding: 16 }}>
                                        <div className="ai-person" style={{ marginBottom: 10 }}>
                                            <span className="ai-avatar">{iniciales(empleado.nombre_completo)}</span>
                                            <div style={{ minWidth: 0 }}>
                                                <div className="ai-person-name" style={{ whiteSpace: 'normal' }}>{nombrePropio(empleado.nombre_completo)}</div>
                                                <div className="ai-person-sub">{primeraMayuscula(empleado.cargo_nombre || '')}</div>
                                            </div>
                                        </div>
                                        <div className="ai-row" style={{ marginBottom: 12 }}>
                                            {empleado.campania_nombre && (
                                                <span className={`ai-chip ${claseCampania(empleado.campania_nombre) || ''}`}>{empleado.campania_nombre}</span>
                                            )}
                                            <span className={`ai-badge ${est.clase}`}><span className="ai-dot" />{est.texto}</span>
                                        </div>
                                        <div className="ai-row" style={{ justifyContent: 'flex-end' }}>
                                            <button className="ai-icon-btn" aria-label="Ver perfil" onClick={() => setPerfilEmpleadoId(empleado.id)}><Eye size={16} strokeWidth={1.75} /></button>
                                            <button className="ai-icon-btn" aria-label="Editar empleado" onClick={() => handleEditEmpleado(empleado)}><Edit3 size={16} strokeWidth={1.75} /></button>
                                            <button className="ai-icon-btn ai-icon-btn--danger" aria-label="Eliminar empleado" onClick={() => setEmpleadoAEliminar(empleado)}><Trash2 size={16} strokeWidth={1.75} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <table className="ai-table ai-table--dense">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Identificación</th>
                                    <th>Campaña</th>
                                    <th>Cargo</th>
                                    <th>Estado</th>
                                    <th>Teléfono</th>
                                    <th className="ai-td-actions">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedEmpleados.map((empleado) => {
                                    const est = estadoBadge(empleado.estado_contrato_nombre);
                                    const chipCampania = claseCampania(empleado.campania_nombre);
                                    return (
                                        <tr key={empleado.id}>
                                            <td>
                                                <div className="ai-person">
                                                    <span className="ai-avatar">{iniciales(empleado.nombre_completo)}</span>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div className="ai-person-name">{nombrePropio(empleado.nombre_completo)}</div>
                                                        {empleado.email && <div className="ai-person-sub">{empleado.email}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="ai-num">{empleado.numero_identificacion}</div>
                                                {empleado.tipo_identificacion_codigo && <div className="ai-person-sub">{empleado.tipo_identificacion_codigo}</div>}
                                            </td>
                                            <td>
                                                {empleado.campania_nombre ? (
                                                    <span className={`ai-chip ${chipCampania || ''}`} style={!chipCampania ? { background: 'var(--surface-200)', color: 'var(--ink-muted)' } : undefined}>
                                                        {empleado.campania_nombre}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td>{empleado.cargo_nombre ? primeraMayuscula(empleado.cargo_nombre) : '—'}</td>
                                            <td><span className={`ai-badge ${est.clase}`}><span className="ai-dot" />{est.texto}</span></td>
                                            <td className="ai-num">{empleado.telefono ? formatearTelefono(empleado.telefono) : '—'}</td>
                                            <td className="ai-td-actions">
                                                <div className="ai-row-actions">
                                                    <button className="ai-icon-btn" aria-label="Ver perfil" title="Ver perfil" onClick={() => setPerfilEmpleadoId(empleado.id)}>
                                                        <Eye size={16} strokeWidth={1.75} />
                                                    </button>
                                                    <button className="ai-icon-btn" aria-label="Editar empleado" title="Editar empleado" onClick={() => handleEditEmpleado(empleado)}>
                                                        <Edit3 size={16} strokeWidth={1.75} />
                                                    </button>
                                                    <button className="ai-icon-btn ai-icon-btn--danger" aria-label="Eliminar empleado" title="Eliminar empleado" onClick={() => setEmpleadoAEliminar(empleado)}>
                                                        <Trash2 size={16} strokeWidth={1.75} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {!loading && (
                        <Pagination
                            page={paginaSegura}
                            totalPages={totalPages}
                            totalItems={filteredEmpleados.length}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                            pageSizeOptions={PAGE_SIZES}
                            etiqueta="empleados"
                        />
                    )}
                </div>
            </div>

            {perfilEmpleadoId && (
                <EmpleadoDrawer
                    isOpen={!!perfilEmpleadoId}
                    onClose={() => setPerfilEmpleadoId(null)}
                    empleadoId={perfilEmpleadoId}
                    onEditar={(empleado) => {
                        setPerfilEmpleadoId(null);
                        handleEditEmpleado(empleado);
                    }}
                    onRetiro={(id) => {
                        setPerfilEmpleadoId(null);
                        setRetiroEmpleadoId(id);
                    }}
                />
            )}

            {retiroEmpleadoId && (
                <RetiroModal
                    isOpen={!!retiroEmpleadoId}
                    onClose={() => setRetiroEmpleadoId(null)}
                    empleadoId={retiroEmpleadoId}
                    onSuccess={handleFormSuccess}
                />
            )}

            <ConfirmarEliminarModal
                isOpen={!!empleadoAEliminar}
                onClose={() => setEmpleadoAEliminar(null)}
                empleado={empleadoAEliminar}
                onConfirmar={handleConfirmarEliminar}
            />

            {showImportModal && (
                <ImportEmpleadosModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onImportado={handleFormSuccess}
                />
            )}

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
        </div>
    );
};

export default AgentManagement;
