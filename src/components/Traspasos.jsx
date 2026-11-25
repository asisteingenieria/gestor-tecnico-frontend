import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { traspasoService } from '../services/api';
import TraspasoForm from './TraspasoForm';
import Pagination from './Pagination';
import { nombrePropio } from '../utils/formatoRRHH';
import { SoportesResumen } from './SoportesDocumentales';
import { ArrowLeftRight, Plus, Edit3, Trash2, AlertCircle, ChevronDown, ChevronUp, FileCheck, BellRing, FileWarning, Bell } from 'lucide-react';
import { EncabezadoVista, Mosaicos, Mosaico, BarraFiltros, CampoBusqueda, PanelVista, Pastilla, AvatarVista, CargandoVista, VistaVacia, COLOR_ALERTA_TRASPASO, TONO } from './ui';

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

const ESTADO_ALERTA = {
    programada: { label: 'Programada', color: COLOR_ALERTA_TRASPASO.programada },
    enviada: { label: 'Enviada, sin leer', color: COLOR_ALERTA_TRASPASO.enviada },
    leida: { label: 'Leída', color: COLOR_ALERTA_TRASPASO.leida }
};

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
    const [alertas, setAlertas] = useState([]);

    useEffect(() => {
        fetchTraspasos();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    const fetchTraspasos = async () => {
        try {
            setLoading(true);
            const [response, alertasRes] = await Promise.all([
                traspasoService.getAll(),
                traspasoService.getAlertas().catch(() => ({ data: { alertas: [] } }))
            ]);
            setTraspasos(response.data.traspasos);
            setAlertas(alertasRes.data.alertas);
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
        (t.tipo_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.area_nueva_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.campania_nueva_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fmtFecha = (v) => v ? new Date(v).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—';
    const fmtMoneda = (v) => v == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

    const docsPendientes = filtered.filter(t => (Number(t.soportes_requeridos) || 0) > (Number(t.soportes_cargados) || 0)).length;
    const alertasSinLeer = alertas.filter(a => a.estado === 'enviada').length;

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
                <EncabezadoVista
                    icono={ArrowLeftRight}
                    titulo="Traspasos"
                    subtitulo="Encargos, ratificaciones, trabajo en casa y cambios de cargo o salario"
                >
                    <button type="button" onClick={handleCreate} className="ai-monitor-btn ai-monitor-btn--primario">
                        <Plus size={15} strokeWidth={2} /> Nuevo traspaso
                    </button>
                </EncabezadoVista>

                {error && <div style={{ marginBottom: 12 }}><Pastilla color={TONO.peligro} punto>{error}</Pastilla></div>}

                <Mosaicos>
                    <Mosaico color={TONO.info} icono={ArrowLeftRight} valor={filtered.length} label="Traspasos"
                        detalle={searchTerm ? `Según la búsqueda · ${traspasos.length} en total` : null} />
                    <Mosaico color={docsPendientes > 0 ? TONO.alerta : TONO.suave} icono={FileWarning} valor={docsPendientes} label="Con documentos pendientes" />
                    <Mosaico color={TONO.acento} icono={Bell} valor={alertas.length} label="Alertas" />
                    <Mosaico color={alertasSinLeer > 0 ? TONO.alerta : TONO.suave} icono={BellRing} valor={alertasSinLeer} label="Alertas sin leer" />
                </Mosaicos>

                {alertas.length > 0 && (
                    <PanelVista icono={BellRing} titulo={`Alertas · ${alertas.length}`}>
                        <div style={{ display: 'grid', gap: 8, padding: '12px 16px' }}>
                            {alertas.map(a => {
                                const estado = ESTADO_ALERTA[a.estado] || ESTADO_ALERTA.programada;
                                return (
                                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                                        <Pastilla color={estado.color} punto minWidth={150}>
                                            {estado.label}{a.estado === 'programada' ? ` · ${fmtFecha(a.fecha_alerta)}` : ''}
                                        </Pastilla>
                                        <span style={{ flex: 1, minWidth: 240 }}>{a.mensaje}</span>
                                        <span className="ai-muted">
                                            {a.destinatario_nombre ? `Para ${nombrePropio(a.destinatario_nombre)}` : 'Sin destinatario en el contrato'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </PanelVista>
                )}

                <BarraFiltros>
                    <CampoBusqueda value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por empleado, identificación, tipo, área o campaña nueva..." />
                </BarraFiltros>

                <div>
                    {loading ? (
                        <CargandoVista />
                    ) : filtered.length === 0 ? (
                        <VistaVacia icono={ArrowLeftRight}>
                            {searchTerm ? 'Ningún traspaso coincide con la búsqueda.' : 'No hay traspasos. Registra un nuevo traspaso para empezar.'}
                        </VistaVacia>
                    ) : (
                        <div className="ai-monitor-tabla-wrap" style={{ marginBottom: 12 }}>
                        <table className="ai-monitor-tabla ai-monitor-tabla--simple">
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}></th>
                                    <th>Empleado</th>
                                    <th>Tipo</th>
                                    <th>Fecha inicio</th>
                                    <th>Área → Nueva</th>
                                    <th>Cargo → Nuevo</th>
                                    <th>Salario → Nuevo</th>
                                    <th>Documentos</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((t) => {
                                    const isExpanded = expandedIds.has(t.idtraspaso);
                                    const documentos = Number(t.soportes_cargados) || 0;
                                    const requeridos = Number(t.soportes_requeridos) || 0;
                                    return (
                                        <React.Fragment key={t.idtraspaso}>
                                            <tr className="is-clicable" onClick={() => toggleExpand(t.idtraspaso)}>
                                                <td>
                                                    <button
                                                        onClick={(ev) => { ev.stopPropagation(); toggleExpand(t.idtraspaso); }}
                                                        className="ai-icon-btn"
                                                        aria-label={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </td>
                                                <td className="ai-monitor-nombre">
                                                    <span>
                                                        <AvatarVista />
                                                        <span>
                                                            {nombrePropio(t.empleado_nombre).toUpperCase()}
                                                            <span className="ai-monitor-sub">CC {t.empleado_identificacion}</span>
                                                        </span>
                                                    </span>
                                                </td>
                                                <td>
                                                    {t.tipo_nombre
                                                        ? <Pastilla color={TONO.info} punto>{t.tipo_nombre}</Pastilla>
                                                        : <span className="ai-muted">Sin tipo</span>}
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
                                                    <Pastilla color={requeridos === 0 ? TONO.suave : documentos >= requeridos ? TONO.exito : documentos > 0 ? TONO.alerta : TONO.peligro}>
                                                        <FileCheck size={12} /> {requeridos > 0 ? `${documentos}/${requeridos}` : '—'}
                                                    </Pastilla>
                                                </td>
                                                <td className="ai-td-actions" onClick={(ev) => ev.stopPropagation()}>
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
                                                    <td colSpan={9} style={{ background: 'var(--surface-0)', padding: 16 }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 20 }}>
                                                            <DetailField label="Tipo de contrato" value={t.tipo_contrato_anterior_nombre} />
                                                            <DetailField label="Ciudad donde labora" value={t.ciudad_anterior_nombre} />
                                                            <DetailField label="Fecha de ingreso" value={fmtFecha(t.fecha_ingreso_anterior)} />
                                                            <DetailField label="Fecha fin" value={fmtFecha(t.fecha_fin)} />
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
                                                                    <CompareRow label="Modalidad" before={t.modalidad_anterior_nombre} after={t.modalidad_nombre} />
                                                                    <CompareRow label="Cargo SSFF" before={t.cargo_ssff_anterior} after={t.cargo_ssff_nuevo} />
                                                                    <CompareRow label="Usuario SSFF" before={t.usuario_ssff_anterior} after={t.usuario_ssff_nuevo} />
                                                                    <CompareRow label="BNP (bono no prestacional)" before={fmtMoneda(t.bono_no_prestacional_anterior)} after={fmtMoneda(t.bono_no_prestacional_nuevo)} />
                                                                    <CompareRow label="Jefe de área" before={t.jefe_area_anterior_nombre} after={t.jefe_area_nuevo_nombre} />
                                                                    <CompareRow label="Jefe inmediato" before={t.jefe_inmediato_anterior_nombre} after={t.jefe_inmediato_nuevo_nombre} />
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        <p className="ai-overline" style={{ margin: '16px 0 8px' }}>Documentos</p>
                                                        <SoportesResumen
                                                            cargar={() => traspasoService.getSoportes(t.idtraspaso)}
                                                            descargar={(tipoSoporteId) => traspasoService.descargarSoporte(t.idtraspaso, tipoSoporteId)}
                                                            textoSinSoportes={t.tipo_nombre ? 'Este tipo de traspaso no requiere documentos.' : 'Traspaso sin tipo (registrado antes de la hoja TRASPASOS).'}
                                                        />

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
                        </div>
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
