import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { novedadRrhhService } from '../services/api';
import NovedadForm from './NovedadForm';
import Pagination from './Pagination';
import { nombrePropio, iniciales, claseCampania, primeraMayuscula } from '../utils/formatoRRHH';
import NovedadDetalleModal from './NovedadDetalleModal';
import { ClipboardList, Plus, Search, Edit3, Trash2, AlertCircle, FileCheck, FileText, Eye } from 'lucide-react';

const PAGE_SIZE = 10;

const NovedadesRRHH = () => {
    const { isRecursosHumanos } = useAuth();
    const [novedades, setNovedades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedNovedad, setSelectedNovedad] = useState(null);
    const [detalle, setDetalle] = useState(null);
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
                                    const soportes = Number(n.soportes_cargados) || 0;
                                    const requeridos = Number(n.soportes_requeridos) || 0;
                                    const chip = claseCampania(n.campania_nombre);
                                    return (
                                            <tr key={n.idnovedad_rrhh}>
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
                                                        className={`ai-badge${requeridos > 0 && soportes === requeridos ? ' ai-badge--success' : soportes > 0 ? ' ai-badge--warning' : ''}`}
                                                        style={soportes === 0 || requeridos === 0 ? { background: 'var(--surface-200)', color: 'var(--ink-muted)' } : undefined}
                                                    >
                                                        <FileCheck size={12} /> {requeridos > 0 ? `${soportes}/${requeridos}` : '—'}
                                                    </span>
                                                    {Number(n.documentos_expediente) > 0 && (
                                                        <span className="ai-badge ai-badge--info" style={{ marginLeft: 6 }} title="Documento del expediente enlazado a la novedad">
                                                            <FileText size={12} /> {n.documentos_expediente}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="ai-muted">{n.responsable_nombre ? nombrePropio(n.responsable_nombre) : '—'}</td>
                                                <td className="ai-td-actions">
                                                    <div className="ai-row-actions">
                                                        <button onClick={() => setDetalle(n)} className="ai-icon-btn" aria-label="Ver detalle" title="Ver detalle">
                                                            <Eye size={16} />
                                                        </button>
                                                        <button onClick={() => handleEdit(n)} className="ai-icon-btn" aria-label="Editar">
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(n.idnovedad_rrhh)} className="ai-icon-btn ai-icon-btn--danger" aria-label="Eliminar">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
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

            {detalle && <NovedadDetalleModal novedad={detalle} onClose={() => setDetalle(null)} />}
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
