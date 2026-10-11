import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2, UserX, AlertTriangle, CreditCard, Phone, HeartPulse, MapPin, Briefcase, ShieldCheck } from 'lucide-react';
import { contratacionHydraService } from '../../services/api';
import { iniciales, nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import SeccionHydra from './SeccionHydra';
import DescartarCandidatoModal from './DescartarCandidatoModal';
import { SECCIONES_UI, ESTADO_CANDIDATO, mensajeError } from './seccionesUI';

const TABS = ['Checklist', 'Datos de Hydra'];
const EDITABLES = ['pendiente', 'listo'];

/**
 * Panel lateral de un candidato que llegó de Hydra: el checklist de 7 secciones (completar
 * y verificar) y, aparte, lo que envió Hydra tal cual, para comparar.
 */
const CandidatoHydraDrawer = ({ candidatoId, catalogos, catalogosMapeo, onClose, onCambio }) => {
    const [candidato, setCandidato] = useState(null);
    const [error, setError] = useState('');
    const [tab, setTab] = useState(TABS[0]);
    const [abierta, setAbierta] = useState(null);
    const [descartando, setDescartando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const { data } = await contratacionHydraService.getCandidato(candidatoId);
            setCandidato(data.candidato);
            setError('');
            // Abre la primera sección que no esté completa.
            setAbierta(prev => prev ?? data.candidato.secciones.find(s => s.estado !== 'completo')?.clave ?? null);
        } catch (err) {
            setError(mensajeError(err, 'No se pudo cargar el candidato').mensaje);
        }
    }, [candidatoId]);

    useEffect(() => { cargar(); }, [cargar]);

    const alActualizar = (nuevo) => {
        setCandidato(nuevo);
        onCambio();
    };

    const recargar = async () => {
        await cargar();
        onCambio();
    };

    const editable = candidato && EDITABLES.includes(candidato.estado);
    const estado = candidato ? (ESTADO_CANDIDATO[candidato.estado] ?? ESTADO_CANDIDATO.pendiente) : null;

    return (
        <div className="ai-overlay ai-scope" style={{ position: 'fixed', inset: 0, zIndex: 50, justifyContent: 'flex-end', padding: 0 }} onClick={onClose}>
            <div className="ai-drawer" style={{ width: 'min(760px, 100vw)' }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-drawer-hero">
                    <button className="ai-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                    <span className="ai-avatar">{iniciales(candidato?.nombre_completo || '')}</span>
                    <h2 style={{ font: '600 18px var(--font-display)', color: '#fff', margin: '12px 0 2px' }}>
                        {candidato ? nombrePropio(candidato.nombre_completo) : 'Cargando…'}
                    </h2>
                    {candidato && (
                        <p style={{ margin: 0, color: 'rgba(255,255,255,.85)', fontSize: 14 }}>
                            {candidato.tipo_identificacion} {candidato.numero_identificacion}
                            {candidato.cargo_hydra && ` · ${primeraMayuscula(candidato.cargo_hydra)}`}
                        </p>
                    )}
                    {candidato && (
                        <div className="ai-row" style={{ marginTop: 10, gap: 8 }}>
                            <span className={`ai-badge ${estado.clase}`} style={{ background: '#fff' }}><span className="ai-dot" />{estado.texto}</span>
                            <span className="ai-chip" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
                                {candidato.secciones_completas}/{candidato.total_secciones} secciones verificadas
                            </span>
                        </div>
                    )}
                </div>

                <div className="ai-tabs">
                    {TABS.map(t => (
                        <button key={t} type="button" className={`ai-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)} style={{ background: 'transparent', border: 0, cursor: 'pointer' }}>
                            {t}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', background: 'var(--surface-0)' }}>
                    {error && <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', marginBottom: 14 }}>{error}</div>}

                    {!candidato && !error && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        </div>
                    )}

                    {candidato && candidato.reintegro_users_company_id && (
                        <div style={{ border: '1px solid var(--danger)', background: 'var(--danger-soft)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
                            <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <strong>Reintegro:</strong> esta identificación ya existe como empleado en Gestor.
                                Descarta al candidato aquí y gestiónalo desde Empleados → Retiro → Reactivar.
                            </div>
                        </div>
                    )}

                    {candidato && !editable && (
                        <div className="ai-help" style={{ marginBottom: 14 }}>
                            Este candidato está "{estado.texto.toLowerCase()}" y ya no se puede modificar.
                            {candidato.motivo_descarte && ` Motivo: ${candidato.motivo_descarte}`}
                        </div>
                    )}

                    {candidato && tab === 'Checklist' && (
                        <div className="ai-stack" style={{ gap: 12 }}>
                            {SECCIONES_UI.map(seccion => {
                                const evaluacion = candidato.secciones.find(s => s.clave === seccion.clave);
                                if (!evaluacion) return null;
                                return (
                                    <SeccionHydra
                                        key={seccion.clave}
                                        seccion={seccion}
                                        evaluacion={evaluacion}
                                        candidato={candidato}
                                        catalogos={catalogos}
                                        catalogosMapeo={catalogosMapeo}
                                        editable={editable}
                                        abierta={abierta === seccion.clave}
                                        onToggle={() => setAbierta(a => (a === seccion.clave ? null : seccion.clave))}
                                        onCandidato={alActualizar}
                                        onRecargar={recargar}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {candidato && tab === 'Datos de Hydra' && <DatosHydra datos={candidato.datos_hydra} version={candidato.version_hydra} />}
                </div>

                {candidato && editable && (
                    <div className="ai-modal-foot" style={{ borderTop: '1px solid var(--border)' }}>
                        <span className="ai-help">Lo que no vaya a firmar contrato, descártalo para poder registrar el resto del lote.</span>
                        <button type="button" className="ai-btn ai-btn--danger ai-btn--sm" onClick={() => setDescartando(true)}>
                            <UserX size={14} /> Descartar candidato
                        </button>
                    </div>
                )}
            </div>

            {descartando && (
                <DescartarCandidatoModal
                    candidato={candidato}
                    onClose={() => setDescartando(false)}
                    onDescartado={async () => {
                        setDescartando(false);
                        await recargar();
                    }}
                />
            )}
        </div>
    );
};

const Dato = ({ icono: Icono, titulo, filas }) => {
    const visibles = filas.filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (visibles.length === 0) return null;
    return (
        <div className="ai-card" style={{ padding: 16 }}>
            <p className="ai-overline" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icono size={14} strokeWidth={1.75} /> {titulo}
            </p>
            <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '6px 12px', margin: 0, fontSize: 13 }}>
                {visibles.map(([etiqueta, valor]) => (
                    <React.Fragment key={etiqueta}>
                        <dt style={{ color: 'var(--ink-subtle)' }}>{etiqueta}</dt>
                        <dd style={{ margin: 0 }}>{String(valor)}</dd>
                    </React.Fragment>
                ))}
            </dl>
        </div>
    );
};

/** Lo que envió Hydra, sin traducir: sirve para comparar con lo que quedó en el checklist. */
const DatosHydra = ({ datos, version }) => {
    const d = datos || {};
    const nombres = d.nombres || {};
    const fmt = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : null);
    return (
        <div className="ai-stack" style={{ gap: 12 }}>
            <p className="ai-help" style={{ margin: 0 }}>
                Valores tal como los envió Hydra (versión {version}). Los catálogos llegan por código; el checklist muestra cómo se tradujeron.
            </p>
            <Dato icono={CreditCard} titulo="Identificación" filas={[
                ['Documento', [d.identificacion?.tipo, d.identificacion?.numero].filter(Boolean).join(' ')],
                ['Nombre', [nombres.primer_nombre, nombres.segundo_nombre, nombres.primer_apellido, nombres.segundo_apellido].filter(Boolean).join(' ')],
                ['Fecha de nacimiento', d.personal?.fecha_nacimiento],
                ['Género', d.personal?.genero],
                ['Estado civil', d.personal?.estado_civil],
                ['Grupo sanguíneo', d.personal?.grupo_sanguineo]
            ]} />
            <Dato icono={Phone} titulo="Contacto" filas={[
                ['Correo', d.contacto?.email],
                ['Celular', d.contacto?.celular]
            ]} />
            <Dato icono={MapPin} titulo="Residencia y emergencia" filas={[
                ['Dirección', d.direccion?.direccion],
                ['Barrio', d.direccion?.barrio],
                ['Contacto de emergencia', d.contacto_emergencia?.nombre],
                ['Teléfono', d.contacto_emergencia?.telefono],
                ['Parentesco', d.contacto_emergencia?.parentesco]
            ]} />
            <Dato icono={HeartPulse} titulo="Seguridad social" filas={[
                ['EPS', d.seguridad_social?.eps],
                ['AFP', d.seguridad_social?.afp],
                ['Talla de camisa', d.dotacion?.talla_camisa]
            ]} />
            <Dato icono={Briefcase} titulo="Proceso en Hydra" filas={[
                ['Cliente', d.proceso?.cliente],
                ['Cargo', d.proceso?.cargo],
                ['Aprobado en decisión final', fmt(d.proceso?.aprobado_final_en)]
            ]} />
            <Dato icono={ShieldCheck} titulo="Consentimiento de datos" filas={[
                ['Fecha', d.consentimiento?.fecha],
                ['Ciudad', d.consentimiento?.ciudad]
            ]} />
        </div>
    );
};

export default CandidatoHydraDrawer;
