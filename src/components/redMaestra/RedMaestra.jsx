import React, { useEffect, useMemo, useState } from 'react';
import { redMaestraService } from '../../services/api';
import Pagination from '../Pagination';
import { formatearFecha } from '../../utils/fecha';
import RedMaestraDrawer from './RedMaestraDrawer';
import CargueRedMaestraModal from './CargueRedMaestraModal';
import ListasRedMaestraModal from './ListasRedMaestraModal';
import IngresosRedMaestra from './IngresosRedMaestra';
import RetirosRedMaestra from './RetirosRedMaestra';
import { TIPOS_PERSONAL, documentoRM, plano } from './redMaestraUtils';
import { Network, Search, Download, Upload, ListChecks, RefreshCw, UserCheck, UserX, HelpCircle, Clock, Headphones, UserCog, FileStack, Users } from 'lucide-react';

/**
 * Red Maestra (RM) de Claro — solo el admin del Gestor (backend: claude/modulo recursoshumanos.md §52).
 * DOCUMENTO, CÉDULA, NOMBRE, CAMPAÑA y USUARIO SSFF vienen de la ficha de RRHH (solo lectura aquí);
 * el resto lo ingresa el admin en el panel de cada empleado o con el cargue de la plantilla en Excel.
 */

const PAGE_SIZES = [25, 50, 100];
const SIN_ESTADO = '__sin__';

const PESTANAS = { RM: 'rm', INGRESOS: 'ingresos', RETIROS: 'retiros' };

const ICONO_TIPO = { agente: Headphones, coordinador: UserCog, backoffice: FileStack, otro: Users };

function badgeEstadoRM(valor) {
    if (!valor) return { clase: 'ai-badge--neutral', texto: 'Sin estado' };
    const v = plano(valor);
    if (v.startsWith('inactivo')) return { clase: 'ai-badge--danger', texto: valor };
    if (v.startsWith('activo')) return { clase: 'ai-badge--success', texto: valor };
    return { clase: 'ai-badge--info', texto: valor };
}

function badgeRequerimiento(valor) {
    if (!valor) return null;
    const v = plano(valor);
    if (v.startsWith('finaliz')) return 'ai-badge--success';
    if (v.includes('rechaz') || v.includes('anulad')) return 'ai-badge--danger';
    return 'ai-badge--warning';
}

const esPendiente = (r) => r.req_numero && !plano(r.req_estado).startsWith('finaliz');

async function descargarBlob(respuesta, nombrePorDefecto) {
    const disposicion = respuesta.headers?.['content-disposition'] || '';
    const nombre = disposicion.match(/filename="?([^"]+)"?/)?.[1] || nombrePorDefecto;
    const url = URL.createObjectURL(respuesta.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
}

const RedMaestra = () => {
    const [registros, setRegistros] = useState([]);
    const [opciones, setOpciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [error, setError] = useState('');
    const [descargando, setDescargando] = useState(false);

    const [busqueda, setBusqueda] = useState('');
    const [fCampania, setFCampania] = useState('');
    const [fEstadoRM, setFEstadoRM] = useState('');
    const [fGestor, setFGestor] = useState('');
    const [fPendientes, setFPendientes] = useState(false);
    const [fTipo, setFTipo] = useState('');
    const [pestana, setPestana] = useState(PESTANAS.RM);
    const [retirosPendientes, setRetirosPendientes] = useState(null);
    // Sube con cada recarga para que las pestañas de ingresos y retiros vuelvan a pedir sus datos.
    const [version, setVersion] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

    const [abierto, setAbierto] = useState(null); // users_company_id del panel
    const [mostrarCargue, setMostrarCargue] = useState(false);
    const [mostrarListas, setMostrarListas] = useState(false);

    const cargar = async ({ silencioso = false } = {}) => {
        try {
            silencioso ? setRefrescando(true) : setLoading(true);
            const [lista, ops, retiros] = await Promise.all([
                redMaestraService.listar(), redMaestraService.getOpciones(), redMaestraService.retiros()
            ]);
            setRegistros(lista.data.data || []);
            setOpciones(ops.data.data || []);
            setRetirosPendientes((retiros.data.data || []).filter((r) => r.pendiente).length);
            setVersion((v) => v + 1);
            setError('');
        } catch (err) {
            console.error('Error al cargar la Red Maestra:', err);
            setError(err.response?.data?.message || 'No se pudo cargar la Red Maestra');
        } finally {
            setLoading(false);
            setRefrescando(false);
        }
    };

    useEffect(() => { cargar(); }, []);
    useEffect(() => { setPage(1); }, [busqueda, fCampania, fEstadoRM, fGestor, fPendientes, fTipo, pageSize]);

    // Totales del personal vigente de Claro por tipo (por el cargo del contrato).
    const totalesTipo = useMemo(() => {
        const vigentes = registros.filter((r) => r.es_claro_vigente);
        const t = { total: vigentes.length };
        Object.keys(TIPOS_PERSONAL).forEach((k) => { t[k] = vigentes.filter((r) => r.tipo_personal === k).length; });
        return t;
    }, [registros]);

    const campanias = useMemo(
        () => [...new Set(registros.map((r) => r.campania).filter(Boolean))].sort(),
        [registros]
    );
    const estadosRM = useMemo(
        () => opciones.filter((o) => o.campo === 'estado_rm').map((o) => o.valor),
        [opciones]
    );

    const filtrados = useMemo(() => {
        const q = plano(busqueda.trim());
        return registros.filter((r) => {
            if (q && ![r.nombre, r.cedula, r.usuario_ssff, r.req_numero, r.centro_costo].some((v) => plano(v).includes(q))) return false;
            if (fCampania && r.campania !== fCampania) return false;
            if (fEstadoRM === SIN_ESTADO ? r.estado_rm : (fEstadoRM && r.estado_rm !== fEstadoRM)) return false;
            if (fGestor === 'vigente' && !r.es_claro_vigente) return false;
            if (fGestor === 'no_vigente' && r.es_claro_vigente) return false;
            if (fPendientes && !esPendiente(r)) return false;
            if (fTipo && r.tipo_personal !== fTipo) return false;
            return true;
        });
    }, [registros, busqueda, fCampania, fEstadoRM, fGestor, fPendientes, fTipo]);

    const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
    const paginaSegura = Math.min(page, totalPages);
    const visibles = filtrados.slice((paginaSegura - 1) * pageSize, paginaSegura * pageSize);

    const kpis = useMemo(() => ({
        total: registros.length,
        activos: registros.filter((r) => plano(r.estado_rm).startsWith('activo')).length,
        inactivos: registros.filter((r) => plano(r.estado_rm).startsWith('inactivo')).length,
        sinEstado: registros.filter((r) => !r.estado_rm).length,
        pendientes: registros.filter(esPendiente).length
    }), [registros]);

    const hayFiltros = busqueda || fCampania || fEstadoRM || fGestor || fPendientes || fTipo;
    const limpiarFiltros = () => { setBusqueda(''); setFCampania(''); setFEstadoRM(''); setFGestor(''); setFPendientes(false); setFTipo(''); };

    const descargar = async () => {
        try {
            setDescargando(true);
            await descargarBlob(await redMaestraService.exportar(), 'red_maestra.xlsx');
        } catch (err) {
            console.error('Error al descargar la Red Maestra:', err);
            setError('No se pudo descargar el Excel de la Red Maestra');
        } finally {
            setDescargando(false);
        }
    };

    // El panel devuelve la ficha actualizada: se refleja en la fila sin recargar toda la lista.
    const alGuardar = () => cargar({ silencioso: true });

    return (
        <div className="ai-scope">
            <div className="ai-content">
                <div className="ai-page-head">
                    <div>
                        <h1 className="ai-page-title">Red Maestra · Claro</h1>
                        <p className="ai-page-sub">Estado de cada agente de Claro en la Red Maestra y sus requerimientos</p>
                    </div>
                    <div className="ai-row">
                        <button onClick={() => cargar({ silencioso: true })} className="ai-btn ai-btn--secondary" disabled={refrescando} title="Actualizar la lista">
                            <RefreshCw size={16} strokeWidth={1.75} className={refrescando ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => setMostrarListas(true)} className="ai-btn ai-btn--secondary" title="Valores de las listas desplegables">
                            <ListChecks size={16} strokeWidth={1.75} /> Listas
                        </button>
                        <button onClick={() => setMostrarCargue(true)} className="ai-btn ai-btn--secondary">
                            <Upload size={16} strokeWidth={1.75} /> Cargar Excel
                        </button>
                        <button onClick={descargar} className="ai-btn ai-btn--primary" disabled={descargando}>
                            <Download size={16} strokeWidth={1.75} /> {descargando ? 'Descargando…' : 'Descargar Excel'}
                        </button>
                    </div>
                </div>

                {/* Personal vigente de Claro por tipo (cargo del contrato). Clic = filtra la tabla. */}
                <div className="ai-kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                    <div>
                        <span className="ai-kpi-icon"><Users size={18} strokeWidth={1.75} /></span>
                        <div><p className="ai-kpi-label">Personal vigente de Claro</p><p className="ai-kpi-value ai-num">{totalesTipo.total}</p></div>
                    </div>
                    {Object.entries(TIPOS_PERSONAL).map(([clave, t]) => {
                        const Icono = ICONO_TIPO[clave];
                        const activo = fTipo === clave;
                        return (
                            <div key={clave} role="button" tabIndex={0} title={`Ver solo ${t.plural.toLowerCase()}`}
                                onClick={() => { setFTipo(activo ? '' : clave); setPestana(PESTANAS.RM); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setFTipo(activo ? '' : clave); setPestana(PESTANAS.RM); } }}
                                style={{ cursor: 'pointer', boxShadow: activo ? 'inset 0 -2px 0 var(--primary)' : undefined }}>
                                <span className="ai-kpi-icon"><Icono size={18} strokeWidth={1.75} /></span>
                                <div><p className="ai-kpi-label">{t.plural}</p><p className="ai-kpi-value ai-num">{totalesTipo[clave]}</p></div>
                            </div>
                        );
                    })}
                </div>

                <div className="ai-tabs" role="tablist" style={{ borderBottom: '1px solid var(--border)' }}>
                    <button type="button" role="tab" className={`ai-tab${pestana === PESTANAS.RM ? ' is-active' : ''}`} onClick={() => setPestana(PESTANAS.RM)}>
                        Red Maestra <span className="ai-count">{registros.length}</span>
                    </button>
                    <button type="button" role="tab" className={`ai-tab${pestana === PESTANAS.INGRESOS ? ' is-active' : ''}`} onClick={() => setPestana(PESTANAS.INGRESOS)}>
                        Nuevos ingresos
                    </button>
                    <button type="button" role="tab" className={`ai-tab${pestana === PESTANAS.RETIROS ? ' is-active' : ''}`} onClick={() => setPestana(PESTANAS.RETIROS)}>
                        Retiros {retirosPendientes > 0 && <span className="ai-count is-alert" title="Pendientes de registrar el retiro en la Red Maestra">{retirosPendientes}</span>}
                    </button>
                </div>

                {pestana === PESTANAS.INGRESOS && <IngresosRedMaestra onAbrir={setAbierto} version={version} />}
                {pestana === PESTANAS.RETIROS && <RetirosRedMaestra onAbrir={setAbierto} version={version} onCambio={() => cargar({ silencioso: true })} />}

                {pestana === PESTANAS.RM && (<>
                <div className="ai-kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                    <div>
                        <span className="ai-kpi-icon"><Network size={18} strokeWidth={1.75} /></span>
                        <div><p className="ai-kpi-label">Agentes en la RM</p><p className="ai-kpi-value ai-num">{kpis.total}</p></div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><UserCheck size={18} strokeWidth={1.75} /></span>
                        <div><p className="ai-kpi-label">Activo RM</p><p className="ai-kpi-value ai-num" style={{ color: 'var(--success)' }}>{kpis.activos}</p></div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><UserX size={18} strokeWidth={1.75} /></span>
                        <div><p className="ai-kpi-label">Inactivo RM</p><p className="ai-kpi-value ai-num" style={{ color: 'var(--danger)' }}>{kpis.inactivos}</p></div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><HelpCircle size={18} strokeWidth={1.75} /></span>
                        <div><p className="ai-kpi-label">Sin estado RM</p><p className="ai-kpi-value ai-num">{kpis.sinEstado}</p></div>
                    </div>
                    <div>
                        <span className="ai-kpi-icon"><Clock size={18} strokeWidth={1.75} /></span>
                        <div><p className="ai-kpi-label">Requerimientos sin finalizar</p><p className="ai-kpi-value ai-num" style={{ color: 'var(--warning)' }}>{kpis.pendientes}</p></div>
                    </div>
                </div>

                {error && (
                    <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px' }}>{error}</div>
                )}

                <div className="ai-card">
                    <div className="ai-toolbar" style={{ flexWrap: 'wrap' }}>
                        <div className="ai-search" style={{ flex: 1, minWidth: 220 }}>
                            <Search size={16} strokeWidth={1.75} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, cédula, usuario SSFF, requerimiento o centro de costo…"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, font: 'inherit', color: 'var(--ink)' }}
                            />
                        </div>
                        <select className="ai-input" style={{ width: 'auto' }} value={fCampania} onChange={(e) => setFCampania(e.target.value)} aria-label="Campaña">
                            <option value="">Todas las campañas</option>
                            {campanias.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="ai-input" style={{ width: 'auto' }} value={fEstadoRM} onChange={(e) => setFEstadoRM(e.target.value)} aria-label="Estado RM">
                            <option value="">Todo estado RM</option>
                            {estadosRM.map((v) => <option key={v} value={v}>{v}</option>)}
                            <option value={SIN_ESTADO}>Sin estado RM</option>
                        </select>
                        <select className="ai-input" style={{ width: 'auto' }} value={fGestor} onChange={(e) => setFGestor(e.target.value)} aria-label="Estado en el Gestor">
                            <option value="">Vigentes y no vigentes</option>
                            <option value="vigente">Vigentes en Claro</option>
                            <option value="no_vigente">Retirados u otro cliente</option>
                        </select>
                        <select className="ai-input" style={{ width: 'auto' }} value={fTipo} onChange={(e) => setFTipo(e.target.value)} aria-label="Tipo de personal">
                            <option value="">Todo el personal</option>
                            {Object.entries(TIPOS_PERSONAL).map(([k, t]) => <option key={k} value={k}>{t.plural}</option>)}
                        </select>
                        <label className="ai-row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-muted)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={fPendientes} onChange={(e) => setFPendientes(e.target.checked)} />
                            Requerimiento sin finalizar
                        </label>
                    </div>

                    {loading ? (
                        <div>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--surface-200)', maxWidth: 240 }} />
                                    <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--surface-200)', maxWidth: 120 }} />
                                    <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--surface-200)', maxWidth: 90 }} />
                                </div>
                            ))}
                        </div>
                    ) : filtrados.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                            <Network size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)', margin: '0 auto 12px' }} />
                            <p style={{ font: '600 14px var(--font-sans)', color: 'var(--ink)' }}>No hay agentes que coincidan con los filtros</p>
                            {hayFiltros && (
                                <button className="ai-btn ai-btn--ghost ai-btn--sm" style={{ marginTop: 12 }} onClick={limpiarFiltros}>Limpiar filtros</button>
                            )}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ai-table ai-table--dense">
                                <thead>
                                    <tr>
                                        <th>Documento</th>
                                        <th>Nombre completo</th>
                                        <th>Campaña</th>
                                        <th>Usuario SSFF</th>
                                        <th>Novedades</th>
                                        <th>Estado agente</th>
                                        <th>Cargo RM</th>
                                        <th>Estado RM</th>
                                        <th>Último requerimiento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibles.map((r) => {
                                        const est = badgeEstadoRM(r.estado_rm);
                                        const claseReq = badgeRequerimiento(r.req_estado);
                                        return (
                                            <tr key={r.id} onClick={() => setAbierto(r.id)} style={{ cursor: 'pointer' }} title="Ver y editar la Red Maestra de este agente">
                                                <td>
                                                    <div className="ai-num">{r.cedula}</div>
                                                    <div className="ai-person-sub">{documentoRM(r.tipo_documento)}</div>
                                                </td>
                                                <td>
                                                    <div className="ai-person-name">{r.nombre}</div>
                                                    {r.es_claro_vigente && r.cargo && (
                                                        <div className="ai-person-sub">{r.cargo}</div>
                                                    )}
                                                    {!r.es_claro_vigente && (
                                                        <div className="ai-person-sub" style={{ color: 'var(--danger)' }}>
                                                            {r.estado_contrato !== 'activo' && r.estado_contrato !== 'periodo_prueba' ? `En el Gestor: ${r.estado_contrato}` : `Ahora en ${r.cliente || 'otro cliente'}`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div>{r.campania || '—'}</div>
                                                    {r.centro_costo && <div className="ai-person-sub">{r.centro_costo}</div>}
                                                </td>
                                                <td className="ai-num">{r.usuario_ssff || <span className="ai-muted">Sin registrar</span>}</td>
                                                <td style={{ maxWidth: 200 }}>
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.novedades || ''}>{r.novedades || '—'}</div>
                                                </td>
                                                <td>{r.estado_agente || '—'}</td>
                                                <td>{r.cargo_rm || '—'}</td>
                                                <td><span className={`ai-badge ${est.clase}`}><span className="ai-dot" />{est.texto}</span></td>
                                                <td>
                                                    {r.req_numero ? (
                                                        <>
                                                            <div className="ai-num">{r.req_numero}</div>
                                                            <div className="ai-person-sub">
                                                                {[formatearFecha(r.req_fecha_envio), r.req_observacion].filter(Boolean).join(' · ')}
                                                                {r.total_requerimientos > 1 && ` · ${r.total_requerimientos} en total`}
                                                            </div>
                                                            {r.req_estado && <span className={`ai-badge ${claseReq}`} style={{ marginTop: 4 }}>{r.req_estado}</span>}
                                                        </>
                                                    ) : <span className="ai-muted">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && filtrados.length > 0 && (
                        <Pagination
                            page={paginaSegura}
                            totalPages={totalPages}
                            totalItems={filtrados.length}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                            pageSizeOptions={PAGE_SIZES}
                            etiqueta="agentes"
                        />
                    )}
                </div>
                </>)}
            </div>

            {abierto && (
                <RedMaestraDrawer
                    empleadoId={abierto}
                    opciones={opciones}
                    onClose={() => setAbierto(null)}
                    onGuardado={alGuardar}
                />
            )}
            {mostrarCargue && (
                <CargueRedMaestraModal
                    onClose={() => setMostrarCargue(false)}
                    onCargado={() => cargar({ silencioso: true })}
                />
            )}
            {mostrarListas && (
                <ListasRedMaestraModal
                    onClose={() => setMostrarListas(false)}
                    onCambio={() => cargar({ silencioso: true })}
                />
            )}
        </div>
    );
};

export default RedMaestra;
