import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Loader2, RotateCcw, Link2, Send, ArrowRight, AlertTriangle, Plus, Stethoscope, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { contratacionHydraService } from '../../services/api';
import { nombrePropio } from '../../utils/formatoRRHH';
import { ESTADO_LOTE, mensajeError } from './seccionesUI';
import { EncabezadoVista, BarraFiltros, Pastilla, CargandoVista, VistaVacia, COLOR_LOTE, TONO } from '../ui';

const TABS = [
    { clave: 'lotes', label: 'Lotes recibidos', icono: Inbox },
    { clave: 'envios', label: 'Avisos a Hydra', icono: Send },
    { clave: 'mapeos', label: 'Equivalencias de catálogo', icono: Link2 }
];

const fmtFecha = (v) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '—');
const fmtInstante = (v) => (v ? new Date(v).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '—');

/**
 * Bandeja de contratación desde Hydra (reclutamiento): lotes de candidatos aprobados que
 * RRHH completa, verifica y registra como empleados. Ver conexionhydra.md en el backend.
 */
const ContratacionHydra = () => {
    const { isSst } = useAuth();
    const [tab, setTab] = useState('lotes');
    // SST (migración 089) solo marca exámenes médicos: no ve avisos ni equivalencias.
    const tabs = isSst ? TABS.slice(0, 1) : TABS;

    return (
        <div className="ai-scope">
            <div className="ai-content">
                <EncabezadoVista
                    icono={isSst ? Stethoscope : UserPlus}
                    titulo={isSst ? 'Exámenes médicos de contratación' : 'Contratación desde Hydra'}
                    subtitulo={isSst
                        ? 'Candidatos que envía Hydra a contratación: marca si asistieron a los exámenes médicos y si los aprobaron. Solo los aprobados se registran como empleados'
                        : 'Candidatos aprobados en reclutamiento: completa sus datos, verifica cada sección y regístralos como empleados. Solo se registran los que SST aprueba en exámenes médicos'}
                >
                    {tabs.length > 1 && (
                        <div className="ai-seg" role="tablist" aria-label="Sección">
                            {tabs.map(({ clave, label, icono }) => (
                                <span key={clave} role="tab" tabIndex={0} aria-selected={tab === clave} className={tab === clave ? 'is-active' : ''}
                                    style={{ cursor: 'pointer' }} onClick={() => setTab(clave)}
                                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setTab(clave); }}>
                                    {React.createElement(icono, { size: 14, strokeWidth: 1.9 })} {label}
                                </span>
                            ))}
                        </div>
                    )}
                </EncabezadoVista>

                {tab === 'lotes' && <Lotes />}
                {tab === 'envios' && <Envios />}
                {tab === 'mapeos' && <Mapeos />}
            </div>
        </div>
    );
};

const Cargando = () => <CargandoVista />;

const Vacio = ({ icono, titulo, texto }) => (
    <VistaVacia icono={icono}><strong style={{ color: 'var(--ink)' }}>{titulo}</strong><br />{texto}</VistaVacia>
);

// ------------------------------------------------------------------ lotes ----

const FILTROS_LOTE = [
    { valor: '', texto: 'Todos' },
    { valor: 'abierto', texto: 'En completitud' },
    { valor: 'listo', texto: 'Listos' },
    { valor: 'registrado', texto: 'Registrados' }
];

const Lotes = () => {
    const navigate = useNavigate();
    const [lotes, setLotes] = useState(null);
    const [filtro, setFiltro] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setLotes(null);
        contratacionHydraService.getLotes(filtro ? { estado: filtro } : {})
            .then(({ data }) => setLotes(data.lotes))
            .catch((err) => setError(mensajeError(err, 'No se pudieron cargar los lotes').mensaje));
    }, [filtro]);

    return (
        <>
            <BarraFiltros>
                <div className="ai-seg">
                    {FILTROS_LOTE.map(f => (
                        <span key={f.valor} className={filtro === f.valor ? 'is-active' : ''} onClick={() => setFiltro(f.valor)} style={{ cursor: 'pointer' }}>
                            {f.texto}
                        </span>
                    ))}
                </div>
            </BarraFiltros>
            {error && <p className="ai-help is-error" style={{ padding: '0 16px' }}>{error}</p>}
            {!lotes && !error ? <Cargando /> : lotes?.length === 0 ? (
                <Vacio icono={Inbox} titulo="No hay lotes" texto="Cuando Selección envíe candidatos desde Hydra aparecerán aquí." />
            ) : lotes && (
                <div className="ai-monitor-tabla-wrap" style={{ marginBottom: 12 }}>
                <table className="ai-monitor-tabla ai-monitor-tabla--simple">
                    <thead>
                        <tr>
                            <th>Lote</th>
                            <th>Ingreso sugerido</th>
                            <th>Avance</th>
                            <th>Exámenes médicos</th>
                            <th>Estado</th>
                            <th>Recibido</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {lotes.map(l => {
                            const activos = l.total - l.fuera_del_lote;
                            const hechos = l.listos + l.registrados;
                            const pct = activos > 0 ? Math.round((hechos / activos) * 100) : 0;
                            const estado = { ...(ESTADO_LOTE[l.estado] ?? ESTADO_LOTE.abierto), color: COLOR_LOTE[l.estado] || TONO.neutro };
                            return (
                                <tr key={l.idhydra_lote} className="is-clicable" onClick={() => navigate(`/recursos-humanos/contratacion-hydra/${l.idhydra_lote}`)}>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{l.nombre}</div>
                                        <div className="ai-monitor-sub">{l.lote_externo_id}</div>
                                    </td>
                                    <td className="ai-muted">{fmtFecha(l.fecha_ingreso_sugerida)}</td>
                                    <td>
                                        <span className="ai-mini-progress"><span style={{ width: `${pct}%` }} /></span>
                                        <span className="ai-help">{hechos}/{activos} listos{l.fuera_del_lote > 0 ? ` · ${l.fuera_del_lote} fuera` : ''}</span>
                                    </td>
                                    <td>
                                        {l.examenes_pendientes > 0 ? (
                                            <Pastilla color={TONO.alerta} title="Candidatos en curso sin el examen aprobado por SST">
                                                <Stethoscope size={12} /> {l.examenes_pendientes} por resolver
                                            </Pastilla>
                                        ) : <span className="ai-help">Al día</span>}
                                        {l.examenes_no_asistio > 0 && <div className="ai-help">{l.examenes_no_asistio} no asistió</div>}
                                    </td>
                                    <td><Pastilla color={estado?.color || TONO.neutro} punto>{estado?.texto}</Pastilla></td>
                                    <td className="ai-muted">{fmtInstante(l.created_at)}</td>
                                    <td className="ai-td-actions"><button className="ai-icon-btn" aria-label="Abrir lote"><ArrowRight size={16} /></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            )}
        </>
    );
};

// ----------------------------------------------------------------- envíos ----

const TIPO_ENVIO = { candidato_registrado: 'Contratado', candidato_descartado: 'Descartado' };
const ESTADO_ENVIO = {
    pendiente: { color: TONO.alerta, texto: 'Pendiente' },
    enviado: { color: TONO.exito, texto: 'Entregado' },
    fallido: { color: TONO.peligro, texto: 'Fallido' }
};

const Envios = () => {
    const [datos, setDatos] = useState(null);
    const [filtro, setFiltro] = useState('');
    const [error, setError] = useState('');
    const [reintentando, setReintentando] = useState(null);

    const cargar = useCallback(() => {
        contratacionHydraService.getEnvios(filtro ? { estado: filtro } : {})
            .then(({ data }) => setDatos(data))
            .catch((err) => setError(mensajeError(err, 'No se pudieron cargar los avisos').mensaje));
    }, [filtro]);

    useEffect(() => { setDatos(null); cargar(); }, [cargar]);

    const reintentar = async (id) => {
        setReintentando(id);
        try {
            await contratacionHydraService.reintentarEnvio(id);
            cargar();
        } catch (err) {
            setError(mensajeError(err, 'No se pudo reintentar').mensaje);
        } finally {
            setReintentando(null);
        }
    };

    return (
        <>
            <BarraFiltros>
                <div className="ai-seg">
                    {[['', 'Todos'], ['pendiente', 'Pendientes'], ['fallido', 'Fallidos'], ['enviado', 'Entregados']].map(([v, t]) => (
                        <span key={v} className={filtro === v ? 'is-active' : ''} onClick={() => setFiltro(v)} style={{ cursor: 'pointer' }}>{t}</span>
                    ))}
                </div>
            </BarraFiltros>
            {datos && !datos.configurado && (
                <div style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--warning-soft)', fontSize: 13, display: 'flex', gap: 8 }}>
                    <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
                    El canal hacia Hydra no está configurado en este servidor: los avisos se acumulan como pendientes y saldrán cuando se configure.
                </div>
            )}
            {error && <p className="ai-help is-error" style={{ padding: '0 16px' }}>{error}</p>}
            {!datos && !error ? <Cargando /> : datos?.envios.length === 0 ? (
                <Vacio icono={Send} titulo="Sin avisos" texto="Al registrar o descartar candidatos, Gestor le avisa a Hydra. Aquí se ve si llegó." />
            ) : datos && (
                <div className="ai-monitor-tabla-wrap" style={{ marginBottom: 12 }}>
                <table className="ai-monitor-tabla ai-monitor-tabla--simple">
                    <thead>
                        <tr><th>Candidato</th><th>Aviso</th><th>Estado</th><th>Intentos</th><th>Último error</th><th>Creado</th><th></th></tr>
                    </thead>
                    <tbody>
                        {datos.envios.map(e => {
                            const estado = ESTADO_ENVIO[e.estado];
                            return (
                                <tr key={e.idhydra_envio_saliente}>
                                    <td style={{ fontWeight: 700 }}>{e.nombre_completo ? nombrePropio(e.nombre_completo) : `#${e.hydra_candidato_externo_id}`}</td>
                                    <td>{TIPO_ENVIO[e.tipo] ?? e.tipo}</td>
                                    <td><Pastilla color={estado?.color || TONO.neutro} punto>{estado?.texto}</Pastilla></td>
                                    <td className="ai-num">{e.intentos}</td>
                                    <td className="ai-muted" style={{ maxWidth: 280, whiteSpace: 'normal' }}>{e.ultimo_error || '—'}</td>
                                    <td className="ai-muted">{fmtInstante(e.created_at)}</td>
                                    <td className="ai-td-actions">
                                        {e.estado === 'fallido' && (
                                            <button className="ai-btn ai-btn--secondary ai-btn--sm" disabled={reintentando === e.idhydra_envio_saliente} onClick={() => reintentar(e.idhydra_envio_saliente)}>
                                                <RotateCcw size={14} /> Reintentar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            )}
        </>
    );
};

// ---------------------------------------------------------------- mapeos ----

const NOMBRE_CATALOGO = {
    tipo_identificacion: 'Tipo de documento', genero: 'Género', estado_civil: 'Estado civil',
    grupo_sanguineo: 'Grupo sanguíneo', eps: 'EPS', afp: 'AFP', parentesco: 'Parentesco',
    cargo: 'Cargo', tipo_direccion: 'Tipo de dirección'
};

const Mapeos = () => {
    const [mapeos, setMapeos] = useState(null);
    const [opciones, setOpciones] = useState({});
    const [nuevo, setNuevo] = useState({ catalogo: '', valor_hydra: '', id_gestor: '' });
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    const cargar = useCallback(() => {
        contratacionHydraService.getMapeos().then(({ data }) => setMapeos(data.mapeos)).catch(() => setMapeos([]));
    }, []);

    useEffect(() => {
        cargar();
        contratacionHydraService.getCatalogosMapeo().then(({ data }) => setOpciones(data.catalogos)).catch(() => {});
    }, [cargar]);

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setMensaje(null);
        try {
            const { data } = await contratacionHydraService.guardarMapeo({ ...nuevo, id_gestor: Number(nuevo.id_gestor) });
            setMensaje({ ok: true, texto: `Equivalencia guardada. Se completaron ${data.candidatos_actualizados} candidato(s) abiertos.` });
            setNuevo({ catalogo: '', valor_hydra: '', id_gestor: '' });
            cargar();
        } catch (err) {
            setMensaje({ ok: false, texto: mensajeError(err, 'No se pudo guardar').mensaje });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div>
            <BarraFiltros>
            <p className="ai-help" style={{ margin: 0 }}>
                Hydra envía sus catálogos por código. Cuando un valor no existe en Gestor o coincide con más de uno
                (por ejemplo "Sura EPS" con "SURA" y "EPS Sura"), aquí se define a cuál corresponde. Normalmente se crean desde el
                propio candidato; esta lista sirve para revisarlas o corregirlas.
            </p>
            </BarraFiltros>

            <form onSubmit={guardar} className="ai-form-grid ai-monitor-barra" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'end', display: 'grid' }}>
                <div className="ai-field">
                    <label className="ai-label">Catálogo</label>
                    <select className="ai-input" required value={nuevo.catalogo} onChange={(e) => setNuevo({ catalogo: e.target.value, valor_hydra: nuevo.valor_hydra, id_gestor: '' })}>
                        <option value="">Seleccionar…</option>
                        {Object.keys(opciones).map(c => <option key={c} value={c}>{NOMBRE_CATALOGO[c] ?? c}</option>)}
                    </select>
                </div>
                <div className="ai-field">
                    <label className="ai-label">Valor que envía Hydra</label>
                    <input className="ai-input" required maxLength={150} value={nuevo.valor_hydra} onChange={(e) => setNuevo({ ...nuevo, valor_hydra: e.target.value })} placeholder="Ej. Sura EPS" />
                </div>
                <div className="ai-field">
                    <label className="ai-label">Equivale en Gestor a</label>
                    <select className="ai-input" required value={nuevo.id_gestor} onChange={(e) => setNuevo({ ...nuevo, id_gestor: e.target.value })} disabled={!nuevo.catalogo}>
                        <option value="">Seleccionar…</option>
                        {(opciones[nuevo.catalogo] || []).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                </div>
                <button type="submit" className="ai-btn ai-btn--primary" disabled={guardando}>
                    {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Guardar
                </button>
            </form>
            {mensaje && <p className={`ai-help${mensaje.ok ? '' : ' is-error'}`}>{mensaje.texto}</p>}

            {!mapeos ? <Cargando /> : mapeos.length === 0 ? (
                <Vacio icono={Link2} titulo="Sin equivalencias" texto="Todavía no se ha definido ninguna." />
            ) : (
                <div className="ai-monitor-tabla-wrap" style={{ marginBottom: 12 }}>
                <table className="ai-monitor-tabla ai-monitor-tabla--simple">
                    <thead><tr><th>Catálogo</th><th>Valor en Hydra</th><th>Equivale en Gestor</th><th>Definido por</th></tr></thead>
                    <tbody>
                        {mapeos.map(m => (
                            <tr key={m.idhydra_mapeo_catalogo}>
                                <td>{NOMBRE_CATALOGO[m.catalogo] ?? m.catalogo}</td>
                                <td><strong>{m.valor_hydra}</strong></td>
                                <td>{m.nombre_gestor ?? `#${m.id_gestor}`}</td>
                                <td className="ai-muted">{m.creado_por_nombre ?? '—'} · {fmtInstante(m.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
    );
};

export default ContratacionHydra;
