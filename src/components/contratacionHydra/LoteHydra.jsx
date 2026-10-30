import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Loader2, UserCheck, Users, CheckCircle2, Clock, UserX, ArrowRight, AlertCircle, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api, { contratacionHydraService } from '../../services/api';
import { iniciales, nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import CandidatoHydraDrawer from './CandidatoHydraDrawer';
import RegistrarLoteModal from './RegistrarLoteModal';
import { SECCIONES_UI, ESTADO_CANDIDATO, ESTADO_LOTE, ESTADO_EXAMEN, mensajeError } from './seccionesUI';

const COLOR_SECCION = { completo: 'var(--success)', pendiente: 'var(--warning)', desactualizada: 'var(--danger)' };
const fmtFecha = (v) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '—');

/** Un lote enviado por Hydra: estado de cada candidato y registro del lote completo. */
const LoteHydra = () => {
    const { id } = useParams();
    // SST (migración 089) marca exámenes médicos: no edita datos ni registra.
    const { isSst } = useAuth();
    const [lote, setLote] = useState(null);
    const [candidatos, setCandidatos] = useState([]);
    const [catalogos, setCatalogos] = useState(null);
    const [catalogosMapeo, setCatalogosMapeo] = useState(null);
    const [error, setError] = useState('');
    const [abierto, setAbierto] = useState(null);
    const [registrando, setRegistrando] = useState(false);

    const cargarLote = useCallback(async () => {
        try {
            const { data } = await contratacionHydraService.getLote(id);
            setLote(data.lote);
            setCandidatos(data.candidatos);
            setError('');
        } catch (err) {
            setError(mensajeError(err, 'No se pudo cargar el lote').mensaje);
        }
    }, [id]);

    useEffect(() => {
        cargarLote();
        // SST no usa el checklist: no necesita (ni puede leer) los catálogos de RRHH.
        if (isSst) return;
        // Catálogos de RRHH (para los selectores) y opciones de mapeo, una sola vez.
        Promise.all([api.get('/users-company/catalogos'), contratacionHydraService.getCatalogosMapeo()])
            .then(([cat, mapeo]) => {
                setCatalogos(cat.data.catalogos);
                setCatalogosMapeo(mapeo.data.catalogos);
            })
            .catch(() => setError('No se pudieron cargar los catálogos'));
    }, [cargarLote, isSst]);

    const cuenta = (estados) => candidatos.filter(c => estados.includes(c.estado)).length;
    const estadoLote = lote ? (ESTADO_LOTE[lote.estado] ?? ESTADO_LOTE.abierto) : null;
    const pendientes = cuenta(['pendiente']);
    const enCurso = candidatos.filter(c => ['pendiente', 'listo'].includes(c.estado));
    const examenesPorResolver = enCurso.filter(c => c.examen_estado !== 'aprobado').length;

    return (
        <div className="ai-scope">
            <div className="ai-content">
                <div className="ai-crumbs">
                    <Link to="/recursos-humanos/contratacion-hydra" className="ai-link">Contratación Hydra</Link>
                    <ChevronRight size={14} />
                    <b>{lote?.nombre ?? 'Lote'}</b>
                </div>

                <div className="ai-page-head">
                    <div>
                        <h1 className="ai-page-title">{lote?.nombre ?? 'Cargando…'}</h1>
                        {lote && (
                            <p className="ai-page-sub">
                                {lote.lote_externo_id} · Ingreso sugerido {fmtFecha(lote.fecha_ingreso_sugerida)} · Recibido {new Date(lote.created_at).toLocaleDateString('es-CO')}
                            </p>
                        )}
                    </div>
                    {lote && (
                        <div className="ai-row" style={{ gap: 12 }}>
                            <span className={`ai-badge ${estadoLote.clase}`}><span className="ai-dot" />{estadoLote.texto}</span>
                            {lote.estado !== 'registrado' && !isSst && (
                                <button
                                    className="ai-btn ai-btn--primary"
                                    disabled={lote.estado !== 'listo'}
                                    onClick={() => setRegistrando(true)}
                                    title={lote.estado !== 'listo' ? 'Todos los candidatos deben estar listos —datos verificados y examen médico aprobado— (o fuera del lote) para registrar' : undefined}
                                >
                                    <UserCheck size={16} /> Registrar lote
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', width: 'fit-content' }}>
                        <span className="ai-dot" />{error}
                    </div>
                )}

                {lote && (
                    <div className="ai-kpi-strip">
                        <div><Users size={20} strokeWidth={1.75} style={{ color: 'var(--primary)' }} /><div><div className="ai-kpi-label">Candidatos</div><div className="ai-kpi-value">{candidatos.length}</div></div></div>
                        <div><CheckCircle2 size={20} strokeWidth={1.75} style={{ color: 'var(--success)' }} /><div><div className="ai-kpi-label">Listos</div><div className="ai-kpi-value">{cuenta(['listo', 'registrado'])}</div></div></div>
                        <div><Clock size={20} strokeWidth={1.75} style={{ color: 'var(--warning)' }} /><div><div className="ai-kpi-label">Pendientes</div><div className="ai-kpi-value">{pendientes}</div></div></div>
                        <div><Stethoscope size={20} strokeWidth={1.75} style={{ color: 'var(--warning)' }} /><div><div className="ai-kpi-label">Exámenes por resolver</div><div className="ai-kpi-value">{examenesPorResolver}</div></div></div>
                        <div><UserX size={20} strokeWidth={1.75} style={{ color: 'var(--ink-subtle)' }} /><div><div className="ai-kpi-label">Fuera del lote</div><div className="ai-kpi-value">{cuenta(['descartado', 'cancelado_hydra', 'no_apto'])}</div></div></div>
                    </div>
                )}

                {lote && lote.estado === 'abierto' && pendientes > 0 && (
                    <p className="ai-help" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={14} />
                        {isSst
                            ? `Hay ${examenesPorResolver} candidato(s) con exámenes médicos por resolver. Abre cada uno para marcar asistencia y resultado.`
                            : `El lote se registra completo: falta que ${pendientes} candidato(s) tengan las 7 secciones verificadas y el examen médico aprobado por SST, o sacarlos del lote.`}
                    </p>
                )}

                <div className="ai-card">
                    {!lote && !error ? (
                        <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        </div>
                    ) : (
                        <table className="ai-table ai-table--dense">
                            <thead>
                                <tr>
                                    <th>Candidato</th>
                                    <th>Cargo en Hydra</th>
                                    <th>Checklist</th>
                                    <th>Examen médico</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidatos.map(c => {
                                    const estado = ESTADO_CANDIDATO[c.estado] ?? ESTADO_CANDIDATO.pendiente;
                                    const examen = c.examen_estado ? ESTADO_EXAMEN[c.examen_estado] : null;
                                    return (
                                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setAbierto(c.id)}>
                                            <td>
                                                <div className="ai-person">
                                                    <span className="ai-avatar ai-avatar--sm ai-avatar--brand">{iniciales(c.nombre_completo)}</span>
                                                    <div>
                                                        <div className="ai-person-name">{nombrePropio(c.nombre_completo)}</div>
                                                        <div className="ai-person-sub">{c.tipo_identificacion} {c.numero_identificacion}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="ai-muted">{primeraMayuscula(c.cargo_hydra) || '—'}</td>
                                            <td>
                                                <div className="ai-row" style={{ gap: 4, alignItems: 'center' }}>
                                                    {SECCIONES_UI.map(s => {
                                                        const evaluacion = c.secciones.find(x => x.clave === s.clave);
                                                        return (
                                                            <span
                                                                key={s.clave}
                                                                title={`${s.titulo}: ${evaluacion?.estado ?? 'pendiente'}`}
                                                                style={{ width: 10, height: 10, borderRadius: 99, background: COLOR_SECCION[evaluacion?.estado] ?? 'var(--surface-200)', display: 'inline-block' }}
                                                            />
                                                        );
                                                    })}
                                                    <span className="ai-help" style={{ marginLeft: 6 }}>{c.secciones_completas}/{c.total_secciones}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {examen ? <span className={`ai-badge ${examen.clase}`}><span className="ai-dot" />{examen.texto}</span> : <span className="ai-help">No aplica</span>}
                                            </td>
                                            <td>
                                                <span className={`ai-badge ${estado.clase}`}><span className="ai-dot" />{estado.texto}</span>
                                                {c.reintegro_users_company_id && <span className="ai-badge ai-badge--danger" style={{ marginLeft: 6 }}>Reintegro</span>}
                                                {c.users_company_id && <div className="ai-help">Empleado #{c.users_company_id}</div>}
                                            </td>
                                            <td className="ai-td-actions">
                                                <button className="ai-icon-btn" aria-label="Abrir candidato"><ArrowRight size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {abierto && (catalogos || isSst) && (
                <CandidatoHydraDrawer
                    candidatoId={abierto}
                    sst={isSst}
                    catalogos={catalogos}
                    catalogosMapeo={catalogosMapeo}
                    onClose={() => setAbierto(null)}
                    onCambio={cargarLote}
                />
            )}

            {registrando && lote && (
                <RegistrarLoteModal
                    lote={lote}
                    onClose={() => setRegistrando(false)}
                    onRegistrado={async () => {
                        setRegistrando(false);
                        await cargarLote();
                    }}
                />
            )}
        </div>
    );
};

export default LoteHydra;
