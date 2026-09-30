import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vacacionesService } from '../services/api';
import VacacionesForm from './VacacionesForm';
import Pagination from './Pagination';
import { nombrePropio, iniciales } from '../utils/formatoRRHH';
import { CalendarClock, Plus, Search, Edit3, Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const PAGE_SIZE = 10;

const DetailField = ({ label, value }) => (
    <div>
        <p className="ai-overline" style={{ marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 13, color: 'var(--ink)' }}>{value ?? '—'}</p>
    </div>
);

const PasivoVacacional = () => {
    const { isRecursosHumanos } = useAuth();
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedRegistro, setSelectedRegistro] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [periodosPorRegistro, setPeriodosPorRegistro] = useState({});
    const [loadingPeriodos, setLoadingPeriodos] = useState(new Set());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);

    useEffect(() => {
        fetchRegistros();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    const fetchRegistros = async () => {
        try {
            setLoading(true);
            const response = await vacacionesService.getAll();
            setRegistros(response.data.vacaciones);
            setError('');
        } catch (err) {
            console.error('Error al cargar pasivo vacacional:', err);
            setError('Error al cargar el pasivo vacacional');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedRegistro(null);
        setShowCreateForm(true);
    };

    const handleEdit = (registro) => {
        setSelectedRegistro(registro);
        setShowEditForm(true);
    };

    const handleFormSuccess = async () => {
        await fetchRegistros();
        setShowCreateForm(false);
        setShowEditForm(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este registro de vacaciones?')) return;
        try {
            await vacacionesService.delete(id);
            await fetchRegistros();
        } catch (err) {
            console.error('Error al eliminar registro de vacaciones:', err);
            setError('Error al eliminar el registro de vacaciones');
        }
    };

    const filtered = registros.filter(r =>
        (r.empleado_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.empleado_identificacion || '').includes(searchTerm) ||
        (r.campania_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fmtFecha = (v) => v ? new Date(v).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—';
    const fmtMoneda = (v) => v == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const toggleExpand = async (registro) => {
        const id = registro.idvacaciones;
        const isExpanded = expandedIds.has(id);

        setExpandedIds(prev => {
            const next = new Set(prev);
            if (isExpanded) next.delete(id); else next.add(id);
            return next;
        });

        if (!isExpanded && !periodosPorRegistro[id]) {
            setLoadingPeriodos(prev => new Set(prev).add(id));
            try {
                const response = await vacacionesService.getById(id);
                setPeriodosPorRegistro(prev => ({ ...prev, [id]: response.data.vacaciones.periodos || [] }));
            } catch (err) {
                console.error('Error al cargar periodos:', err);
            } finally {
                setLoadingPeriodos(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }
    };

    if (!isRecursosHumanos) {
        return (
            <div className="ai-scope">
                <div className="ai-content" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div className="ai-card" style={{ padding: 32, textAlign: 'center', maxWidth: 360 }}>
                        <AlertCircle size={40} style={{ margin: '0 auto 12px', color: 'var(--danger)' }} />
                        <h2 style={{ font: '600 20px/28px var(--font-display)', margin: '0 0 6px' }}>Acceso denegado</h2>
                        <p className="ai-muted">Solo Recursos Humanos puede acceder a esta sección.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-scope">
            <div className="ai-content">
                <div className="ai-page-head">
                    <div>
                        <h1 className="ai-page-title">Pasivo vacacional</h1>
                        <p className="ai-page-sub">Días acumulados, tomados y compensados por empleado</p>
                    </div>
                    <button onClick={handleCreate} className="ai-btn ai-btn--primary">
                        <Plus size={16} />
                        Nuevo corte
                    </button>
                </div>

                {error && (
                    <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', width: 'fit-content' }}>
                        <span className="ai-dot" />
                        {error}
                    </div>
                )}

                <div className="ai-card">
                    <div className="ai-toolbar">
                        <div className="ai-search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por empleado, identificación o campaña..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, font: 'inherit', color: 'inherit' }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--primary)' }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <CalendarClock size={36} style={{ margin: '0 auto 10px', color: 'var(--ink-subtle)' }} />
                            <p style={{ fontWeight: 600, margin: 0 }}>No hay registros</p>
                            <p className="ai-muted" style={{ marginTop: 4 }}>Registra un corte de vacaciones para empezar.</p>
                        </div>
                    ) : (
                        <table className="ai-table ai-table--dense">
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}></th>
                                    <th>Empleado</th>
                                    <th>Fecha de corte</th>
                                    <th>Días trabajados</th>
                                    <th>Acumulados</th>
                                    <th>Tomados</th>
                                    <th>Compensados</th>
                                    <th>Pasivo</th>
                                    <th>Periodos</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((r) => {
                                    const isExpanded = expandedIds.has(r.idvacaciones);
                                    return (
                                        <React.Fragment key={r.idvacaciones}>
                                            <tr>
                                                <td>
                                                    <button
                                                        onClick={() => toggleExpand(r)}
                                                        className="ai-icon-btn"
                                                        aria-label={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div className="ai-person">
                                                        <span className="ai-avatar ai-avatar--sm ai-avatar--brand">{iniciales(r.empleado_nombre)}</span>
                                                        <div>
                                                            <div className="ai-person-name">{nombrePropio(r.empleado_nombre)}</div>
                                                            <div className="ai-person-sub">{r.empleado_identificacion}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="ai-muted">{fmtFecha(r.fecha_corte)}</td>
                                                <td className="ai-num">{r.dias_trabajados}</td>
                                                <td className="ai-num">{r.dias_acumulados}</td>
                                                <td className="ai-num">{r.dias_tomados}</td>
                                                <td className="ai-num">{r.dias_compensados}</td>
                                                <td className="ai-num" style={{ fontWeight: 600 }}>{fmtMoneda(r.pasivo_vacacional)}</td>
                                                <td>
                                                    <span className="ai-badge ai-badge--info">
                                                        <span className="ai-dot" />
                                                        {r.total_periodos}
                                                    </span>
                                                </td>
                                                <td className="ai-td-actions">
                                                    <div className="ai-row-actions">
                                                        <button onClick={() => handleEdit(r)} className="ai-icon-btn" aria-label="Editar">
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(r.idvacaciones)} className="ai-icon-btn ai-icon-btn--danger" aria-label="Eliminar">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={10} style={{ background: 'var(--surface-0)' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 20 }}>
                                                            <DetailField label="Cargo" value={r.cargo_nombre} />
                                                            <DetailField label="Campaña" value={r.campania_nombre} />
                                                            <DetailField label="Centro de costo" value={r.centro_costo_nombre} />
                                                        </div>

                                                        <p className="ai-overline" style={{ marginBottom: 8 }}>Periodos tomados</p>
                                                        {loadingPeriodos.has(r.idvacaciones) ? (
                                                            <div className="ai-row ai-muted" style={{ fontSize: 13 }}>
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'var(--primary)' }} />
                                                                Cargando periodos...
                                                            </div>
                                                        ) : (periodosPorRegistro[r.idvacaciones] || []).length === 0 ? (
                                                            <p className="ai-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Sin periodos registrados.</p>
                                                        ) : (
                                                            <div className="ai-card">
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                                    <thead>
                                                                        <tr style={{ background: 'var(--surface-200)', borderBottom: '1px solid var(--border)' }}>
                                                                            <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, color: 'var(--ink-muted)' }}>Periodo</th>
                                                                            <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, color: 'var(--ink-muted)' }}>Fecha inicio</th>
                                                                            <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, color: 'var(--ink-muted)' }}>Fecha final</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {periodosPorRegistro[r.idvacaciones].map(p => (
                                                                            <tr key={p.idperiodo_vacacional} style={{ borderTop: '1px solid var(--border)' }}>
                                                                                <td style={{ padding: '8px 16px' }}>{p.periodo_tomado || '—'}</td>
                                                                                <td className="ai-muted" style={{ padding: '8px 16px' }}>{fmtFecha(p.fecha_inicio)}</td>
                                                                                <td className="ai-muted" style={{ padding: '8px 16px' }}>{fmtFecha(p.fecha_final)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        totalItems={filtered.length}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                        etiqueta="registros"
                    />
                </div>
            </div>

            {showCreateForm && (
                <VacacionesForm isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} vacaciones={null} onSuccess={handleFormSuccess} />
            )}
            {showEditForm && selectedRegistro && (
                <VacacionesForm isOpen={showEditForm} onClose={() => setShowEditForm(false)} vacaciones={selectedRegistro} onSuccess={handleFormSuccess} />
            )}
        </div>
    );
};

export default PasivoVacacional;
