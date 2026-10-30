import React, { useState } from 'react';
import { Stethoscope, CheckCircle2, XCircle, CalendarX, CalendarCheck, Loader2, ArrowRightCircle, Ban } from 'lucide-react';
import { contratacionHydraService } from '../../services/api';
import { ESTADO_EXAMEN, mensajeError } from './seccionesUI';

const fmtInstante = (v) => (v ? new Date(v).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '');

// Cada evento de la traza (migración 089): los cuatro de SST y la decisión de selección en Hydra.
const EVENTO = {
    asistio: { texto: 'Asistió a los exámenes médicos', icono: CalendarCheck, color: 'var(--success)' },
    no_asistio: { texto: 'No asistió a los exámenes médicos', icono: CalendarX, color: 'var(--warning)' },
    aprobado: { texto: 'Aprobó los exámenes médicos', icono: CheckCircle2, color: 'var(--success)' },
    no_aprobado: { texto: 'No aprobó los exámenes médicos', icono: XCircle, color: 'var(--danger)' },
    continuidad: { texto: 'Selección dio continuidad: se reagenda la cita', icono: ArrowRightCircle, color: 'var(--primary)' },
    no_continuidad: { texto: 'Selección no dio continuidad al proceso', icono: Ban, color: 'var(--danger)' }
};

// Qué puede marcar SST según el estado del examen, y si la nota es obligatoria.
const ACCIONES = {
    asistio: { texto: 'Asistió', clase: 'ai-btn--primary', nota: 'opcional', placeholder: 'Observación (opcional)' },
    no_asistio: { texto: 'No asistió', clase: 'ai-btn--secondary', nota: 'opcional', placeholder: 'Motivo de la inasistencia, si se sabe (opcional)' },
    aprobado: { texto: 'Aprobó', clase: 'ai-btn--primary', nota: 'opcional', placeholder: 'Observación (opcional)' },
    no_aprobado: { texto: 'No aprobó', clase: 'ai-btn--danger', nota: 'obligatoria', placeholder: '¿Por qué no aprobó los exámenes médicos?' }
};

const ACCIONES_POR_ESTADO = {
    pendiente: ['asistio', 'no_asistio'],
    no_asistio: ['asistio', 'no_asistio'],
    reagendado: ['asistio', 'no_asistio'],
    asistio: ['aprobado', 'no_aprobado']
};

const AYUDA = {
    pendiente: 'SST debe marcar si el candidato asistió a los exámenes médicos.',
    no_asistio: 'Se le informó a selección (Hydra), que decide si da continuidad al proceso. Si se le reagenda la cita, vuelve a marcar la asistencia: la inasistencia queda en la traza.',
    reagendado: 'Selección dio continuidad y se reagendó la cita. Marca la asistencia cuando se presente.',
    asistio: 'Asistió. Falta marcar si aprobó los exámenes médicos.',
    aprobado: 'Aprobado por SST: RRHH ya puede registrarlo como empleado cuando sus datos estén completos.',
    no_aprobado: 'No aprobó: no continúa en el proceso. Se le informó a selección (Hydra).'
};

/**
 * Exámenes médicos de un candidato de Hydra (SST, migración 089): estado, acciones de SST y
 * la traza completa. RRHH ve lo mismo sin acciones.
 *
 * `onCambio(respuesta)` recibe lo que devuelve el backend al marcar.
 */
const ExamenesMedicos = ({ candidato, puedeMarcar, onCambio }) => {
    const [accion, setAccion] = useState(null);
    const [nota, setNota] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const examen = candidato.examen_estado;
    const estado = examen ? (ESTADO_EXAMEN[examen] ?? ESTADO_EXAMEN.pendiente) : null;
    const enCurso = ['pendiente', 'listo'].includes(candidato.estado);
    const acciones = puedeMarcar && enCurso ? (ACCIONES_POR_ESTADO[examen] ?? []) : [];
    const traza = candidato.examenes ?? [];

    const elegir = (clave) => {
        setAccion(clave);
        setNota('');
        setError('');
    };

    const confirmar = async () => {
        setGuardando(true);
        setError('');
        try {
            const { data } = await contratacionHydraService.marcarExamen(candidato.id, accion, nota.trim() || undefined);
            setAccion(null);
            setNota('');
            onCambio(data);
        } catch (err) {
            setError(mensajeError(err, 'No se pudo guardar la marca').mensaje);
        } finally {
            setGuardando(false);
        }
    };

    const notaObligatoria = accion && ACCIONES[accion].nota === 'obligatoria';

    return (
        <div className="ai-stack" style={{ gap: 12 }}>
            <div className="ai-card" style={{ padding: 16 }}>
                <div className="ai-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <p className="ai-overline" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Stethoscope size={14} strokeWidth={1.75} /> Exámenes médicos
                    </p>
                    {estado && <span className={`ai-badge ${estado.clase}`}><span className="ai-dot" />{estado.texto}</span>}
                </div>
                <p className="ai-help" style={{ margin: 0 }}>
                    {examen ? AYUDA[examen] : 'Este candidato llegó antes del control de exámenes médicos de SST.'}
                </p>

                {acciones.length > 0 && !accion && (
                    <div className="ai-row" style={{ gap: 8, marginTop: 14 }}>
                        {acciones.map(clave => (
                            <button key={clave} type="button" className={`ai-btn ai-btn--sm ${ACCIONES[clave].clase}`} onClick={() => elegir(clave)}>
                                {ACCIONES[clave].texto}
                            </button>
                        ))}
                    </div>
                )}

                {accion && (
                    <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                        <div className="ai-field">
                            <label className="ai-label">
                                Marcar "{ACCIONES[accion].texto.toLowerCase()}" · nota {notaObligatoria ? <em>*</em> : '(opcional)'}
                            </label>
                            <textarea
                                className="ai-input"
                                style={{ height: 80, paddingTop: 8, resize: 'vertical' }}
                                maxLength={1000}
                                placeholder={ACCIONES[accion].placeholder}
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {(accion === 'no_asistio' || accion === 'no_aprobado') && (
                            <p className="ai-help" style={{ margin: '8px 0 0' }}>
                                {accion === 'no_asistio'
                                    ? 'Se le avisará a selección (Hydra) para que decida si da continuidad.'
                                    : 'El candidato sale del proceso y se le informará a selección (Hydra). No se puede deshacer.'}
                            </p>
                        )}
                        {error && <div className="ai-help is-error" style={{ marginTop: 8 }}>{error}</div>}
                        <div className="ai-row" style={{ gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                            <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => setAccion(null)} disabled={guardando}>Cancelar</button>
                            <button
                                type="button"
                                className={`ai-btn ai-btn--sm ${accion === 'no_aprobado' ? 'ai-btn--danger' : 'ai-btn--primary'}`}
                                disabled={guardando || (notaObligatoria && !nota.trim())}
                                onClick={confirmar}
                            >
                                {guardando && <Loader2 size={14} className="animate-spin" />} Confirmar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="ai-card" style={{ padding: 16 }}>
                <p className="ai-overline" style={{ marginBottom: 10 }}>Trazabilidad</p>
                {traza.length === 0 ? (
                    <p className="ai-help" style={{ margin: 0 }}>Todavía no hay marcas.</p>
                ) : (
                    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }} className="ai-stack">
                        {traza.map((t, i) => {
                            const e = EVENTO[t.evento] ?? { texto: t.evento, icono: Stethoscope, color: 'var(--ink-subtle)' };
                            const Icono = e.icono;
                            return (
                                <li key={t.id} style={{ display: 'flex', gap: 10, fontSize: 13, paddingBottom: i < traza.length - 1 ? 10 : 0, borderBottom: i < traza.length - 1 ? '1px dashed var(--border)' : 0 }}>
                                    <Icono size={16} style={{ color: e.color, flexShrink: 0, marginTop: 2 }} />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600 }}>{e.texto}</div>
                                        {t.nota && <div style={{ marginTop: 2 }}>{t.nota}</div>}
                                        <div style={{ color: 'var(--ink-subtle)', marginTop: 2 }}>
                                            {t.origen === 'hydra' ? 'Selección (Hydra)' : 'SST'}{t.marcado_por ? ` · ${t.marcado_por}` : ''} · {fmtInstante(t.creado_en)}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </div>
    );
};

export default ExamenesMedicos;
