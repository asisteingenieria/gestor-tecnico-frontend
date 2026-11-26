import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, UserCheck, Users, CheckCircle2, Clock, UserX, ArrowRight, AlertCircle, Stethoscope, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api, { contratacionHydraService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import CandidatoHydraDrawer from './CandidatoHydraDrawer';
import RegistrarLoteModal from './RegistrarLoteModal';
import { SECCIONES_UI, ESTADO_CANDIDATO, ESTADO_LOTE, ESTADO_EXAMEN, mensajeError } from './seccionesUI';
import { EncabezadoVista, Mosaicos, Mosaico, Pastilla, AvatarVista, CargandoVista, COLOR_LOTE, COLOR_CANDIDATO, COLOR_EXAMEN, TONO } from '../ui';

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

                <EncabezadoVista
                    icono={Inbox}
                    titulo={lote?.nombre ?? 'Cargando…'}
                    subtitulo={lote ? `${lote.lote_externo_id} · Ingreso sugerido ${fmtFecha(lote.fecha_ingreso_sugerida)} · Recibido ${new Date(lote.created_at).toLocaleDateString('es-CO')}` : ''}
                >
                    {lote && <Pastilla color={COLOR_LOTE[lote.estado] || TONO.neutro} punto>{estadoLote.texto}</Pastilla>}
                    {lote && lote.estado !== 'registrado' && !isSst && (
                        <button
                            type="button"
                            className="ai-monitor-btn ai-monitor-btn--primario"
                            disabled={lote.estado !== 'listo'}
                            onClick={() => setRegistrando(true)}
                            title={lote.estado !== 'listo' ? 'Todos los candidatos deben estar listos —datos verificados y examen médico aprobado— (o fuera del lote) para registrar' : undefined}
                        >
                            <UserCheck size={15} strokeWidth={2} /> Registrar lote
                        </button>
                    )}
                </EncabezadoVista>

                {error && <div style={{ marginBottom: 12 }}><Pastilla color={TONO.peligro} punto>{error}</Pastilla></div>}

                {lote && (
                    <Mosaicos>
                        <Mosaico color={TONO.info} icono={Users} valor={candidatos.length} label="Candidatos" />
                        <Mosaico color={TONO.exito} icono={CheckCircle2} valor={cuenta(['listo', 'registrado'])} label="Listos" />
                        <Mosaico color={pendientes > 0 ? TONO.alerta : TONO.suave} icono={Clock} valor={pendientes} label="Pendientes" />
                        <Mosaico color={examenesPorResolver > 0 ? TONO.novedad : TONO.suave} icono={Stethoscope} valor={examenesPorResolver} label="Exámenes por resolver" />
                        <Mosaico color={TONO.neutro} icono={UserX} valor={cuenta(['descartado', 'cancelado_hydra', 'no_apto'])} label="Fuera del lote" />
                    </Mosaicos>
                )}

                {lote && lote.estado === 'abierto' && pendientes > 0 && (
                    <p className="ai-help" style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={14} />
                        {isSst
                            ? `Hay ${examenesPorResolver} candidato(s) con exámenes médicos por resolver. Abre cada uno para marcar asistencia y resultado.`
                            : `El lote se registra completo: falta que ${pendientes} candidato(s) tengan las 7 secciones verificadas y el examen médico aprobado por SST, o sacarlos del lote.`}
                    </p>
                )}

                <div>
                    {!lote && !error ? (
                        <CargandoVista />
                    ) : (
                        <div className="ai-monitor-tabla-wrap">
                        <table className="ai-monitor-tabla ai-monitor-tabla--simple">
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
                                        <tr key={c.id} className="is-clicable" onClick={() => setAbierto(c.id)}>
                                            <td className="ai-monitor-nombre">
                                                <span>
                                                    <AvatarVista />
                                                    <span>
                                                        {nombrePropio(c.nombre_completo).toUpperCase()}
                                                        <span className="ai-monitor-sub">{c.tipo_identificacion} {c.numero_identificacion}</span>
                                                    </span>
                                                </span>
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
                                                {examen ? <Pastilla color={COLOR_EXAMEN[c.examen_estado] || TONO.neutro} punto>{examen.texto}</Pastilla> : <span className="ai-help">No aplica</span>}
                                            </td>
                                            <td>
                                                <Pastilla color={COLOR_CANDIDATO[c.estado] || TONO.neutro} punto>{estado.texto}</Pastilla>
                                                {c.reintegro_users_company_id && <span style={{ marginLeft: 6 }}><Pastilla color={TONO.peligro}>Reintegro</Pastilla></span>}
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
                        </div>
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
