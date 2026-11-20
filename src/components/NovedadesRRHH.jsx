import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { novedadRrhhService } from '../services/api';
import NovedadForm from './NovedadForm';
import Pagination from './Pagination';
import { nombrePropio, iniciales, claseCampania, primeraMayuscula } from '../utils/formatoRRHH';
import NovedadDetalleModal from './NovedadDetalleModal';
import FiltroChip from './FiltroChip';
import { ClipboardList, Plus, Search, Edit3, Trash2, AlertCircle, FileCheck, FileText, Eye, Download, Loader2 } from 'lucide-react';

const PAGE_SIZE = 10;

// Filtros y descarga del consolidado (claude/modulo recursoshumanos.md §57). La descarga manda los mismos
// filtros al backend (utils/reporteNovedades.js), que los aplica igual, así que el Excel trae lo que se ve.
const CAMPOS_RANGO = [
    { valor: 'registro', etiqueta: 'Fecha de registro' },
    { valor: 'inicial', etiqueta: 'Fecha inicial' },
    { valor: 'final', etiqueta: 'Fecha final' }
];
const ETIQUETA_CAMPO_RANGO = Object.fromEntries(CAMPOS_RANGO.map(({ valor, etiqueta }) => [valor, etiqueta]));
// Estado de los soportes: el documento del expediente (098) trae los soportes juntos y cuenta como soportada.
const SOPORTES = [
    { valor: 'expediente', etiqueta: 'Documento del expediente' },
    { valor: 'completos', etiqueta: 'Soportes completos' },
    { valor: 'pendientes', etiqueta: 'Soportes pendientes' },
    { valor: 'no_requiere', etiqueta: 'No requiere soportes' }
];
const VALOR_SOPORTE = Object.fromEntries(SOPORTES.map(({ valor, etiqueta }) => [etiqueta, valor]));
const SIN_CAMPANIA = 'Sin campaña';
const SEPARADOR = '|';

const estadoSoportes = (n) => {
    if (Number(n.documentos_expediente) > 0) return 'expediente';
    const requeridos = Number(n.soportes_requeridos) || 0;
    if (requeridos === 0) return 'no_requiere';
    return (Number(n.soportes_cargados) || 0) >= requeridos ? 'completos' : 'pendientes';
};
// Día 'YYYY-MM-DD': las fechas de la novedad son DATE (medianoche UTC); el registro es un instante UTC → día de Bogotá.
const diaDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
};
const diaBogota = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};
const diaDelRango = (n, campo) => (
    campo === 'inicial' ? diaDate(n.fecha_inicial) : campo === 'final' ? diaDate(n.fecha_final) : diaBogota(n.created_at)
);
const fmtRegistro = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d) ? '—' : d.toLocaleString('es-CO', {
        timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

// El servidor responde los errores como JSON, pero la petición pide un blob.
async function mensajeDeError(err) {
    const data = err?.response?.data;
    if (data instanceof Blob) {
        try { return JSON.parse(await data.text()).message; } catch { /* no era JSON */ }
    }
    return data?.message || 'No se pudo descargar el Excel de novedades';
}

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
    const [filtroTipos, setFiltroTipos] = useState(new Set());
    const [filtroCampanias, setFiltroCampanias] = useState(new Set());
    const [filtroSoportes, setFiltroSoportes] = useState(new Set());
    const [rangoCampo, setRangoCampo] = useState('registro');
    const [rangoDesde, setRangoDesde] = useState('');
    const [rangoHasta, setRangoHasta] = useState('');
    const [descargando, setDescargando] = useState(false);
    const [avisoDescarga, setAvisoDescarga] = useState('');

    useEffect(() => {
        fetchNovedades();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, filtroTipos, filtroCampanias, filtroSoportes, rangoCampo, rangoDesde, rangoHasta]);

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

    const opcionesTipo = useMemo(
        () => [...new Set(novedades.map(n => n.tipo_novedad_nombre).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
        [novedades]
    );
    const opcionesCampania = useMemo(
        () => [...new Set(novedades.map(n => n.campania_nombre || SIN_CAMPANIA))].sort((a, b) => a.localeCompare(b, 'es')),
        [novedades]
    );

    const busqueda = searchTerm.trim();
    const hayRango = Boolean(rangoDesde || rangoHasta);
    const rangoInvalido = Boolean(rangoDesde && rangoHasta && rangoDesde > rangoHasta);
    const soportesElegidos = [...filtroSoportes].map(e => VALOR_SOPORTE[e]);

    const filtered = novedades.filter(n => {
        const q = busqueda.toLowerCase();
        if (q && !(
            (n.empleado_nombre || '').toLowerCase().includes(q) ||
            String(n.empleado_identificacion || '').includes(busqueda) ||
            (n.tipo_novedad_nombre || '').toLowerCase().includes(q) ||
            (n.campania_nombre || '').toLowerCase().includes(q)
        )) return false;
        if (filtroTipos.size && !filtroTipos.has(n.tipo_novedad_nombre)) return false;
        if (filtroCampanias.size && !filtroCampanias.has(n.campania_nombre || SIN_CAMPANIA)) return false;
        if (soportesElegidos.length && !soportesElegidos.includes(estadoSoportes(n))) return false;
        if (hayRango && !rangoInvalido) {
            const dia = diaDelRango(n, rangoCampo);
            if (!dia || (rangoDesde && dia < rangoDesde) || (rangoHasta && dia > rangoHasta)) return false;
        }
        return true;
    });

    const hayFiltros = Boolean(busqueda) || filtroTipos.size > 0 || filtroCampanias.size > 0 || filtroSoportes.size > 0 || hayRango;
    const limpiarFiltros = () => {
        setSearchTerm('');
        setFiltroTipos(new Set());
        setFiltroCampanias(new Set());
        setFiltroSoportes(new Set());
        setRangoCampo('registro');
        setRangoDesde('');
        setRangoHasta('');
    };

    // Descarga lo que se ve: los mismos filtros van al backend, que los aplica con la misma regla.
    const descargarExcel = async () => {
        setAvisoDescarga('');
        setError('');
        setDescargando(true);
        try {
            const params = {};
            if (busqueda) params.q = busqueda;
            if (filtroTipos.size) params.tipos = [...filtroTipos].join(SEPARADOR);
            if (filtroCampanias.size) params.campanias = [...filtroCampanias].join(SEPARADOR);
            if (soportesElegidos.length) params.soportes = soportesElegidos.join(',');
            if (hayRango) {
                params.campoFecha = rangoCampo;
                if (rangoDesde) params.desde = rangoDesde;
                if (rangoHasta) params.hasta = rangoHasta;
            }
            const response = await novedadRrhhService.exportar(params);
            const disposicion = response.headers?.['content-disposition'] || '';
            const nombre = disposicion.match(/filename="?([^"]+)"?/)?.[1] || 'novedades.xlsx';
            const total = response.headers?.['x-total-novedades'];
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            a.click();
            URL.revokeObjectURL(url);
            setAvisoDescarga(total != null ? `Se descargaron ${total} novedad${total === '1' ? '' : 'es'}.` : 'Descarga lista.');
        } catch (err) {
            console.error('Error al descargar novedades:', err);
            setError(await mensajeDeError(err));
        } finally {
            setDescargando(false);
        }
    };

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
                    <div className="ai-row" style={{ gap: 8 }}>
                        <button
                            onClick={descargarExcel}
                            className="ai-btn ai-btn--secondary"
                            disabled={descargando || rangoInvalido}
                            title="Excel con las novedades que se ven en la tabla, con los filtros aplicados"
                        >
                            {descargando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            {descargando ? 'Descargando…' : 'Descargar Excel'}
                        </button>
                        <button onClick={handleCreate} className="ai-btn ai-btn--primary">
                            <Plus size={16} />
                            Nueva novedad
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', width: 'fit-content' }}>
                        <span className="ai-dot" />
                        {error}
                    </div>
                )}

                {avisoDescarga && (
                    <div className="ai-badge ai-badge--success" style={{ height: 'auto', padding: '10px 14px', width: 'fit-content' }}>
                        <span className="ai-dot" />
                        {avisoDescarga}
                    </div>
                )}

                <div className="ai-card">
                    <div className="ai-toolbar">
                        <div className="ai-search" style={{ flex: 1 }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por empleado, identificación, tipo de novedad o campaña..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, font: 'inherit', color: 'inherit' }}
                            />
                        </div>
                        <FiltroChip etiqueta="Tipo" opciones={opcionesTipo} seleccion={filtroTipos} onChange={setFiltroTipos} />
                        <FiltroChip etiqueta="Campaña" opciones={opcionesCampania} seleccion={filtroCampanias} onChange={setFiltroCampanias} />
                        <FiltroChip etiqueta="Soportes" opciones={SOPORTES.map(s => s.etiqueta)} seleccion={filtroSoportes} onChange={setFiltroSoportes} />
                    </div>

                    <div className="ai-row" style={{ gap: 18, flexWrap: 'wrap', padding: '0 16px 12px', alignItems: 'flex-end' }}>
                        <div>
                            <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Rango sobre</label>
                            <select className="ai-input" value={rangoCampo} onChange={(e) => setRangoCampo(e.target.value)}>
                                {CAMPOS_RANGO.map(({ valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Desde</label>
                            <input type="date" className="ai-input" value={rangoDesde} max={rangoHasta || undefined} onChange={(e) => setRangoDesde(e.target.value)} />
                        </div>
                        <div>
                            <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Hasta</label>
                            <input type="date" className="ai-input" value={rangoHasta} min={rangoDesde || undefined} onChange={(e) => setRangoHasta(e.target.value)} />
                        </div>
                        {hayFiltros && (
                            <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={limpiarFiltros}>
                                Limpiar filtros
                            </button>
                        )}
                        {hayFiltros && !rangoInvalido && (
                            <span className="ai-muted" style={{ fontSize: 13, paddingBottom: 8 }}>
                                <strong className="ai-num">{filtered.length}</strong> de {novedades.length} novedades
                                {hayRango ? ` con ${ETIQUETA_CAMPO_RANGO[rangoCampo].toLowerCase()} en el rango` : ''}
                            </span>
                        )}
                        {rangoInvalido && (
                            <span style={{ color: 'var(--danger)', fontSize: 13, paddingBottom: 8 }}>La fecha Desde no puede ser posterior a Hasta</span>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--primary)' }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <ClipboardList size={36} style={{ margin: '0 auto 10px', color: 'var(--ink-subtle)' }} />
                            <p style={{ fontWeight: 600, margin: 0 }}>No hay novedades</p>
                            <p className="ai-muted" style={{ marginTop: 4 }}>
                                {hayFiltros ? 'Ninguna novedad coincide con los filtros.' : 'Registra una nueva novedad para empezar.'}
                            </p>
                        </div>
                    ) : (
                        <table className="ai-table ai-table--dense">
                            <thead>
                                <tr>
                                    <th>Registrada</th>
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
                                                <td className="ai-muted ai-num" style={{ whiteSpace: 'nowrap' }}>{fmtRegistro(n.created_at)}</td>
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
                                                    {/* Con documento del expediente (cargue masivo, 098), que trae los soportes juntos,
                                                        la novedad cuenta como soportada aunque no tenga cada soporte por separado. */}
                                                    {Number(n.documentos_expediente) > 0 ? (
                                                        <span className="ai-badge ai-badge--success" title="Documento del expediente enlazado a la novedad (incluye los soportes)">
                                                            <FileText size={12} /> Expediente
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={`ai-badge${requeridos > 0 && soportes === requeridos ? ' ai-badge--success' : soportes > 0 ? ' ai-badge--warning' : ''}`}
                                                            style={soportes === 0 || requeridos === 0 ? { background: 'var(--surface-200)', color: 'var(--ink-muted)' } : undefined}
                                                        >
                                                            <FileCheck size={12} /> {requeridos > 0 ? `${soportes}/${requeridos}` : '—'}
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
