import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { novedadRrhhService } from '../services/api';
import NovedadForm from './NovedadForm';
import Pagination from './Pagination';
import { nombrePropio, iniciales, claseCampania, primeraMayuscula } from '../utils/formatoRRHH';
import { ClipboardList, Plus, Search, Edit3, Trash2, AlertCircle, FileCheck, ChevronDown, ChevronUp, Check, X as XIcon } from 'lucide-react';

const PAGE_SIZE = 10;

const DetailField = ({ label, value }) => (
    <div>
        <p className="ai-overline" style={{ marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 13, color: 'var(--ink)' }}>{value ?? '—'}</p>
    </div>
);

const SoporteBadge = ({ label, ok }) => (
    <span
        className={`ai-badge${ok ? ' ai-badge--success' : ''}`}
        style={!ok ? { background: 'var(--surface-200)', color: 'var(--ink-muted)' } : undefined}
    >
        {ok ? <Check size={12} /> : <XIcon size={12} />}
        {label}
    </span>
);

const NovedadesRRHH = () => {
    const { isRecursosHumanos } = useAuth();
    const [novedades, setNovedades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedNovedad, setSelectedNovedad] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);

    useEffect(() => {
        fetchNovedades();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    const fetchNovedades = async () => {
        try {
            setLoading(true);
            const response = await novedadRrhhService.getAll();
            setNovedades(response.data.novedades);
            setError('');
        } catch (err) {
            console.error('Error al cargar novedades:', err);
            setError('Error al cargar las novedades');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedNovedad(null);
        setShowCreateForm(true);
    };

    const handleEdit = (novedad) => {
        setSelectedNovedad(novedad);
        setShowEditForm(true);
    };

    const handleFormSuccess = async () => {
        await fetchNovedades();
        setShowCreateForm(false);
        setShowEditForm(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de que desea eliminar esta novedad?')) return;
        try {
            await novedadRrhhService.delete(id);
            await fetchNovedades();
        } catch (err) {
            console.error('Error al eliminar novedad:', err);
            setError('Error al eliminar la novedad');
        }
    };

    const filtered = novedades.filter(n =>
        (n.empleado_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.empleado_identificacion || '').includes(searchTerm) ||
        (n.tipo_novedad_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.campania_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fmtFecha = (v) => v ? new Date(v).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—';

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
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
                        <h1 className="ai-page-title">Consolidado de novedades</h1>
                        <p className="ai-page-sub">Incapacidades, licencias y demás novedades de RRHH por empleado</p>
                    </div>
                    <button onClick={handleCreate} className="ai-btn ai-btn--primary">
                        <Plus size={16} />
                        Nueva novedad
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
                                placeholder="Buscar por empleado, identificación, tipo de novedad o campaña..."
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
                            <ClipboardList size={36} style={{ margin: '0 auto 10px', color: 'var(--ink-subtle)' }} />
                            <p style={{ fontWeight: 600, margin: 0 }}>No hay novedades</p>
                            <p className="ai-muted" style={{ marginTop: 4 }}>Registra una nueva novedad para empezar.</p>
                        </div>
                    ) : (
                        <table className="ai-table ai-table--dense">
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}></th>
                                    <th>Empleado</th>
                                    <th>Campaña</th>
                                    <th>Novedad</th>
                                    <th>Inicial</th>
                                    <th>Final</th>
                                    <th>Días</th>
                                    <th>Soportes</th>
                                    <th>Responsable</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((n) => {
                                    const soportes = [n.tiene_documento_original, n.tiene_copia_documento, n.tiene_historia_clinica, n.tiene_runt, n.tiene_furips, n.tiene_soat].filter(Boolean).length;
                                    const chip = claseCampania(n.campania_nombre);
                                    const isExpanded = expandedIds.has(n.idnovedad_rrhh);
                                    return (
                                        <React.Fragment key={n.idnovedad_rrhh}>
                                            <tr>
                                                <td>
                                                    <button
                                                        onClick={() => toggleExpand(n.idnovedad_rrhh)}
                                                        className="ai-icon-btn"
                                                        aria-label={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div className="ai-person">
                                                        <span className="ai-avatar ai-avatar--sm ai-avatar--brand">{iniciales(n.empleado_nombre)}</span>
                                                        <div>
                                                            <div className="ai-person-name">{nombrePropio(n.empleado_nombre)}</div>
                                                            <div className="ai-person-sub">{n.empleado_identificacion}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {n.campania_nombre ? (
                                                        <span className={`ai-chip${chip ? ` ${chip}` : ''}`}>{primeraMayuscula(n.campania_nombre)}</span>
                                                    ) : <span className="ai-muted">—</span>}
                                                </td>
                                                <td>
                                                    <span className="ai-badge ai-badge--info">
                                                        <span className="ai-dot" />
                                                        {n.tipo_novedad_nombre}
                                                    </span>
                                                    {!!n.accidente_transito && (
                                                        <span className="ai-badge ai-badge--danger" style={{ marginLeft: 6 }}>
                                                            <span className="ai-dot" />
                                                            accidente tránsito
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="ai-muted">{fmtFecha(n.fecha_inicial)}</td>
                                                <td className="ai-muted">{fmtFecha(n.fecha_final)}</td>
                                                <td className="ai-num">{n.total_dias ?? '—'}</td>
                                                <td>
                                                    <span
                                                        className={`ai-badge${soportes > 0 ? ' ai-badge--success' : ''}`}
                                                        style={soportes === 0 ? { background: 'var(--surface-200)', color: 'var(--ink-muted)' } : undefined}
                                                    >
                                                        <FileCheck size={12} /> {soportes}/6
                                                    </span>
                                                </td>
                                                <td className="ai-muted">{n.responsable_nombre ? nombrePropio(n.responsable_nombre) : '—'}</td>
                                                <td className="ai-td-actions">
                                                    <div className="ai-row-actions">
                                                        <button onClick={() => handleEdit(n)} className="ai-icon-btn" aria-label="Editar">
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(n.idnovedad_rrhh)} className="ai-icon-btn ai-icon-btn--danger" aria-label="Eliminar">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={10} style={{ background: 'var(--surface-0)' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 16 }}>
                                                            <DetailField label="Cargo" value={n.cargo_nombre} />
                                                            <DetailField label="Centro de costo" value={n.centro_costo_nombre} />
                                                            <DetailField label="Fecha de retorno" value={fmtFecha(n.fecha_retorno)} />
                                                            <DetailField label="Fecha de recibido" value={fmtFecha(n.fecha_recibido)} />
                                                            <DetailField label="Fecha de reporte" value={fmtFecha(n.fecha_reporte)} />
                                                            <DetailField label="Origen de la incapacidad" value={n.origen_incapacidad} />
                                                        </div>
                                                        {(n.resumen_diagnostico || n.observaciones) && (
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16, marginBottom: 16 }}>
                                                                {n.resumen_diagnostico && <DetailField label="Diagnóstico" value={n.resumen_diagnostico} />}
                                                                {n.observaciones && <DetailField label="Observaciones" value={n.observaciones} />}
                                                            </div>
                                                        )}
                                                        <p className="ai-overline" style={{ marginBottom: 8 }}>Soportes documentales</p>
                                                        <div className="ai-row">
                                                            <SoporteBadge label="Documento original" ok={!!n.tiene_documento_original} />
                                                            <SoporteBadge label="Copia del documento" ok={!!n.tiene_copia_documento} />
                                                            <SoporteBadge label="Historia clínica" ok={!!n.tiene_historia_clinica} />
                                                            <SoporteBadge label="RUNT" ok={!!n.tiene_runt} />
                                                            <SoporteBadge label="FURIPS" ok={!!n.tiene_furips} />
                                                            <SoporteBadge label="SOAT" ok={!!n.tiene_soat} />
                                                        </div>
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
                        etiqueta="novedades"
                    />
                </div>
            </div>

            {showCreateForm && (
                <NovedadForm isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} novedad={null} onSuccess={handleFormSuccess} />
            )}
            {showEditForm && selectedNovedad && (
                <NovedadForm isOpen={showEditForm} onClose={() => setShowEditForm(false)} novedad={selectedNovedad} onSuccess={handleFormSuccess} />
            )}
        </div>
    );
};

export default NovedadesRRHH;
