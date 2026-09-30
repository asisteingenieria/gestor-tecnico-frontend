import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { traspasoService } from '../services/api';
import TraspasoForm from './TraspasoForm';
import Pagination from './Pagination';
import { nombrePropio, iniciales } from '../utils/formatoRRHH';
import { ArrowLeftRight, Plus, Search, Edit3, Trash2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const PAGE_SIZE = 10;

const DetailField = ({ label, value }) => (
    <div>
        <p className="ai-overline" style={{ marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 13, color: 'var(--ink)' }}>{value ?? '—'}</p>
    </div>
);

const CompareRow = ({ label, before, after }) => (
    <tr>
        <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-muted)', fontWeight: 500 }}>{label}</td>
        <td className="ai-muted">{before ?? '—'}</td>
        <td style={{ fontWeight: 500 }}>{after ?? '—'}</td>
    </tr>
);

const Traspasos = () => {
    const { isRecursosHumanos } = useAuth();
    const [traspasos, setTraspasos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedTraspaso, setSelectedTraspaso] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);

    useEffect(() => {
        fetchTraspasos();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    const fetchTraspasos = async () => {
        try {
            setLoading(true);
            const response = await traspasoService.getAll();
            setTraspasos(response.data.traspasos);
            setError('');
        } catch (err) {
            console.error('Error al cargar traspasos:', err);
            setError('Error al cargar los traspasos');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedTraspaso(null);
        setShowCreateForm(true);
    };

    const handleEdit = (traspaso) => {
        setSelectedTraspaso(traspaso);
        setShowEditForm(true);
    };

    const handleFormSuccess = async () => {
        await fetchTraspasos();
        setShowCreateForm(false);
        setShowEditForm(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este traspaso?')) return;
        try {
            await traspasoService.delete(id);
            await fetchTraspasos();
        } catch (err) {
            console.error('Error al eliminar traspaso:', err);
            setError('Error al eliminar el traspaso');
        }
    };

    const filtered = traspasos.filter(t =>
        (t.empleado_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.empleado_identificacion || '').includes(searchTerm) ||
        (t.area_nueva_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.campania_nueva_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fmtFecha = (v) => v ? new Date(v).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—';
    const fmtMoneda = (v) => v == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

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
                        <h1 className="ai-page-title">Traspasos</h1>
                        <p className="ai-page-sub">Cambios de área, cargo, campaña o salario de un empleado</p>
                    </div>
                    <button onClick={handleCreate} className="ai-btn ai-btn--primary">
                        <Plus size={16} />
                        Nuevo traspaso
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
                                placeholder="Buscar por empleado, identificación, área o campaña nueva..."
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
                            <ArrowLeftRight size={36} style={{ margin: '0 auto 10px', color: 'var(--ink-subtle)' }} />
                            <p style={{ fontWeight: 600, margin: 0 }}>No hay traspasos</p>
                            <p className="ai-muted" style={{ marginTop: 4 }}>Registra un nuevo traspaso para empezar.</p>
                        </div>
                    ) : (
                        <table className="ai-table ai-table--dense">
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}></th>
                                    <th>Empleado</th>
                                    <th>Fecha inicio</th>
                                    <th>Área → Nueva</th>
                                    <th>Cargo → Nuevo</th>
                                    <th>Salario → Nuevo</th>
                                    <th>Ratificación</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((t) => {
                                    const isExpanded = expandedIds.has(t.idtraspaso);
                                    return (
                                        <React.Fragment key={t.idtraspaso}>
                                            <tr>
                                                <td>
                                                    <button
                                                        onClick={() => toggleExpand(t.idtraspaso)}
                                                        className="ai-icon-btn"
                                                        aria-label={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div className="ai-person">
                                                        <span className="ai-avatar ai-avatar--sm ai-avatar--brand">{iniciales(t.empleado_nombre)}</span>
                                                        <div>
                                                            <div className="ai-person-name">{nombrePropio(t.empleado_nombre)}</div>
                                                            <div className="ai-person-sub">{t.empleado_identificacion}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="ai-muted">{fmtFecha(t.fecha_inicio)}</td>
                                                <td className="ai-muted">
                                                    {t.area_anterior_nombre || '—'} → <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{t.area_nueva_nombre || '—'}</span>
                                                </td>
                                                <td className="ai-muted">
                                                    {t.cargo_anterior_nombre || '—'} → <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{t.cargo_nuevo_nombre || '—'}</span>
                                                </td>
                                                <td className="ai-muted">
                                                    {fmtMoneda(t.salario_anterior)} → <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{fmtMoneda(t.salario_nuevo)}</span>
                                                </td>
                                                <td>
                                                    {t.ratificacion ? (
                                                        <span className="ai-badge ai-badge--success">
                                                            <CheckCircle2 size={12} /> Sí
                                                        </span>
                                                    ) : (
                                                        <span className="ai-badge" style={{ background: 'var(--surface-200)', color: 'var(--ink-muted)' }}>No</span>
                                                    )}
                                                </td>
                                                <td className="ai-td-actions">
                                                    <div className="ai-row-actions">
                                                        <button onClick={() => handleEdit(t)} className="ai-icon-btn" aria-label="Editar">
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(t.idtraspaso)} className="ai-icon-btn ai-icon-btn--danger" aria-label="Eliminar">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={8} style={{ background: 'var(--surface-0)' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 20 }}>
                                                            <DetailField label="Estado" value={t.estado} />
                                                            <DetailField label="Fecha fin" value={fmtFecha(t.fecha_fin)} />
                                                            <DetailField label="Modalidad" value={t.modalidad_nombre} />
                                                            <DetailField label="Centro de costo → Nuevo" value={<>{t.centro_costo_anterior_nombre || '—'} → {t.centro_costo_nuevo_nombre || '—'}</>} />
                                                            <DetailField label="Trabajo en casa - inicio" value={fmtFecha(t.fecha_inicio_trabajo_casa)} />
                                                            <DetailField label="Trabajo en casa - fin" value={fmtFecha(t.fecha_fin_trabajo_casa)} />
                                                            <DetailField label="Diadema" value={t.diadema} />
                                                            <DetailField label="Equipo de cómputo" value={t.equipo_computo} />
                                                        </div>

                                                        <p className="ai-overline" style={{ marginBottom: 8 }}>Comparación anterior / nuevo</p>
                                                        <div className="ai-card" style={{ padding: '0 16px', overflowX: 'auto' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                                <thead>
                                                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                                        <th style={{ padding: '8px 0', textAlign: 'left', fontSize: 11, color: 'var(--ink-muted)' }}></th>
                                                                        <th style={{ padding: '8px 0', textAlign: 'left', fontSize: 11, color: 'var(--ink-muted)' }}>Anterior</th>
                                                                        <th style={{ padding: '8px 0', textAlign: 'left', fontSize: 11, color: 'var(--ink-muted)' }}>Nuevo</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <CompareRow label="Campaña" before={t.campania_anterior_nombre} after={t.campania_nueva_nombre} />
                                                                    <CompareRow label="Cargo SSFF" before={t.cargo_ssff_anterior} after={t.cargo_ssff_nuevo} />
                                                                    <CompareRow label="Usuario SSFF" before={t.usuario_ssff_anterior} after={t.usuario_ssff_nuevo} />
                                                                    <CompareRow label="Bono no prestacional" before={fmtMoneda(t.bono_no_prestacional_anterior)} after={fmtMoneda(t.bono_no_prestacional_nuevo)} />
                                                                    <CompareRow label="Bono cafetería" before={fmtMoneda(t.bono_cafeteria_anterior)} after={fmtMoneda(t.bono_cafeteria_nuevo)} />
                                                                    <CompareRow label="Jefe de área" before={t.jefe_area_anterior_nombre} after={t.jefe_area_nuevo_nombre} />
                                                                    <CompareRow label="Jefe inmediato" before={t.jefe_inmediato_anterior_nombre} after={t.jefe_inmediato_nuevo_nombre} />
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {t.observaciones && (
                                                            <div style={{ marginTop: 16 }}>
                                                                <DetailField label="Observaciones" value={t.observaciones} />
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
                        etiqueta="traspasos"
                    />
                </div>
            </div>

            {showCreateForm && (
                <TraspasoForm isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} traspaso={null} onSuccess={handleFormSuccess} />
            )}
            {showEditForm && selectedTraspaso && (
                <TraspasoForm isOpen={showEditForm} onClose={() => setShowEditForm(false)} traspaso={selectedTraspaso} onSuccess={handleFormSuccess} />
            )}
        </div>
    );
};

export default Traspasos;
