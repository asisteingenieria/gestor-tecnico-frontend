import React, { useEffect, useState } from 'react';
import api, { novedadRrhhService, traspasoService, userCompanyService } from '../services/api';
import { formatearFecha } from '../utils/fecha';
import { nombrePropio, iniciales, formatearTelefono, primeraMayuscula } from '../utils/formatoRRHH';
import {
    X, CreditCard, Mail, Phone, Briefcase, Wallet, Package, MapPin,
    HeartPulse, Landmark, UserPlus2, Syringe, Shirt, KeyRound,
    ArrowLeftRight, Edit3, Loader2, AlertCircle, Calendar, User, Users, Droplet, FileText, UserX
} from 'lucide-react';

const formatMoneda = (valor) => {
    if (valor === null || valor === undefined || valor === '') return null;
    const numero = Number(valor);
    return isNaN(numero) ? null : numero.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
};

const nombreDe = (lista, id, render) => {
    if (!id || !Array.isArray(lista)) return null;
    const item = lista.find(o => String(o.id) === String(id));
    if (!item) return null;
    return render ? render(item) : item.nombre;
};

const Dl = ({ icon: Icon, etiqueta, valor }) => {
    if (!valor) return null;
    return (
        <div className="ai-dl" style={{ marginBottom: 14 }}>
            <Icon className="ai-ic" size={16} strokeWidth={1.75} />
            <div>
                <dt>{etiqueta}</dt>
                <dd>{valor}</dd>
            </div>
        </div>
    );
};

const Overline = ({ children }) => (
    <p className="ai-overline" style={{ margin: '18px 0 10px' }}>{children}</p>
);

const TABS = ['Información', 'Activos', 'Novedades', 'Historial'];

const EmpleadoDrawer = ({ isOpen, onClose, empleadoId, onEditar, onRetiro }) => {
    const [tab, setTab] = useState('Información');
    const [empleado, setEmpleado] = useState(null);
    const [catalogos, setCatalogos] = useState(null);
    const [activos, setActivos] = useState([]);
    const [novedades, setNovedades] = useState(null);
    const [traspasos, setTraspasos] = useState(null);
    const [retiro, setRetiro] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !empleadoId) return;
        setTab('Información');
        let cancelado = false;

        const cargar = async () => {
            try {
                setLoading(true);
                setError('');
                const [empRes, catRes, actRes, retiroRes] = await Promise.all([
                    api.get(`/users-company/${empleadoId}`),
                    api.get('/users-company/catalogos'),
                    api.get(`/users-company/${empleadoId}/activos`),
                    userCompanyService.getRetiro(empleadoId).catch(() => ({ data: { retiro: null } }))
                ]);
                if (cancelado) return;
                setEmpleado(empRes.data.empleado);
                setCatalogos(catRes.data.catalogos);
                setActivos(actRes.data.activos || []);
                setRetiro(retiroRes.data.retiro || null);

                const contratoId = empRes.data.empleado?.contrato?.idcontrato;
                if (contratoId) {
                    const [novRes, trasRes] = await Promise.all([
                        novedadRrhhService.getAll({ contrato_id: contratoId }).catch(() => ({ data: { novedades: [] } })),
                        traspasoService.getAll({ contrato_id: contratoId }).catch(() => ({ data: { traspasos: [] } }))
                    ]);
                    if (cancelado) return;
                    setNovedades(novRes.data.novedades || []);
                    setTraspasos(trasRes.data.traspasos || []);
                } else {
                    setNovedades([]);
                    setTraspasos([]);
                }
            } catch (err) {
                if (cancelado) return;
                console.error('Error al cargar el detalle del empleado:', err);
                setError('No se pudo cargar la información del empleado');
            } finally {
                if (!cancelado) setLoading(false);
            }
        };

        cargar();
        return () => { cancelado = true; };
    }, [isOpen, empleadoId]);

    useEffect(() => {
        if (!isOpen) return;
        const cerrarConEscape = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', cerrarConEscape);
        return () => window.removeEventListener('keydown', cerrarConEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const contrato = empleado?.contrato || null;
    const salario = empleado?.salario_actual || null;
    const segSocial = empleado?.seguridad_social || {};
    const cuenta = empleado?.cuenta_bancaria || null;
    const direccion = empleado?.direccion || null;
    const contacto = empleado?.contacto_emergencia || null;
    const vacunacion = empleado?.vacunacion || null;
    const dotaciones = empleado?.dotaciones || [];
    const recursosAsignados = empleado?.recursos_asignados || [];
    const cat = catalogos || {};

    const estado = empleado?.estado_contrato_nombre;
    const estadoClase = estado === 'activo' ? 'ai-badge--success' : ['retirado', 'inactivo'].includes(estado) ? 'ai-badge--danger' : 'ai-badge--warning';

    return (
        <div className="ai-overlay ai-scope" style={{ position: 'fixed', inset: 0, zIndex: 50, justifyContent: 'flex-end', padding: 0 }} onClick={onClose}>
            <div className="ai-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="ai-drawer-hero">
                    <button className="ai-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                    <span className="ai-avatar">{iniciales(empleado?.nombre_completo || '')}</span>
                    <h2 style={{ font: '600 18px var(--font-display)', color: '#fff', margin: '12px 0 2px' }}>
                        {empleado ? nombrePropio(empleado.nombre_completo) : 'Cargando…'}
                    </h2>
                    {empleado?.cargo_nombre && <p style={{ margin: 0, color: 'rgba(255,255,255,.85)', fontSize: 14 }}>{primeraMayuscula(empleado.cargo_nombre)}</p>}
                    <div className="ai-row" style={{ marginTop: 10 }}>
                        {empleado?.campania_nombre && <span className="ai-chip" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>{empleado.campania_nombre}</span>}
                        {estado && <span className={`ai-badge ${estadoClase}`} style={{ background: '#fff' }}><span className="ai-dot" />{primeraMayuscula(estado)}</span>}
                    </div>
                </div>

                <div className="ai-tabs">
                    {TABS.map(t => (
                        <button key={t} type="button" className={`ai-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)} style={{ background: 'transparent', border: 0, cursor: 'pointer' }}>
                            {t}
                            {t === 'Activos' && <span className="ai-count">{activos.length}</span>}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                            <Loader2 size={28} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <AlertCircle size={32} strokeWidth={1.75} style={{ color: 'var(--danger)', margin: '0 auto 8px' }} />
                            <p style={{ color: 'var(--ink)', fontSize: 14 }}>{error}</p>
                        </div>
                    ) : tab === 'Información' ? (
                        <div>
                            <Overline>Datos personales</Overline>
                            <Dl icon={CreditCard} etiqueta="Identificación" valor={`${empleado.tipo_identificacion_codigo || ''} ${empleado.numero_identificacion}`.trim()} />
                            {empleado.numero_identificacion_secundaria && (
                                <Dl icon={CreditCard} etiqueta="Identificación secundaria" valor={empleado.numero_identificacion_secundaria} />
                            )}
                            <Dl icon={CreditCard} etiqueta="RUT" valor={empleado.rut} />
                            <Dl icon={CreditCard} etiqueta="Libreta militar" valor={empleado.libreta_militar_numero} />
                            <Dl icon={FileText} etiqueta="Declarante de renta" valor={empleado.declarante_renta ? 'Sí' : null} />
                            <Dl icon={Calendar} etiqueta="Fecha de nacimiento" valor={formatearFecha(empleado.fecha_nacimiento)} />
                            <Dl icon={User} etiqueta="Género" valor={empleado.genero_nombre} />
                            <Dl icon={HeartPulse} etiqueta="Estado civil" valor={empleado.estado_civil_nombre} />
                            <Dl icon={Droplet} etiqueta="Grupo sanguíneo" valor={empleado.grupo_sanguineo_nombre} />
                            <Dl icon={Users} etiqueta="Número de hijos" valor={empleado.numero_hijos != null ? String(empleado.numero_hijos) : null} />
                            <Dl icon={MapPin} etiqueta="Ciudad de nacimiento" valor={empleado.ciudad_nacimiento_nombre} />
                            <Dl icon={MapPin} etiqueta="Ciudad de expedición" valor={empleado.ciudad_expedicion_nombre} />
                            <Dl icon={Calendar} etiqueta="Fecha de expedición" valor={formatearFecha(empleado.fecha_expedicion)} />
                            <Dl icon={KeyRound} etiqueta="Usuario SSFF" valor={empleado.usuario_ssff} />
                            <Dl icon={Mail} etiqueta="Correo" valor={empleado.email} />
                            <Dl icon={Phone} etiqueta="Teléfono" valor={empleado.telefono ? formatearTelefono(empleado.telefono) : null} />

                            {direccion && (
                                <>
                                    <Overline>Dirección</Overline>
                                    <Dl icon={MapPin} etiqueta={nombreDe(cat.tipos_direccion, direccion.tipo_direccion_idtipo_direccion) || 'Dirección'} valor={[direccion.direccion, direccion.barrio, nombreDe(cat.ciudades, direccion.ciudad_idciudad)].filter(Boolean).join(' · ') || null} />
                                    <Dl icon={MapPin} etiqueta="Zona" valor={nombreDe(cat.zonas_direccion, direccion.zona_direccion_id)} />
                                    <Dl icon={MapPin} etiqueta="Tipo de vivienda" valor={nombreDe(cat.tipos_vivienda, direccion.tipo_vivienda_id)} />
                                </>
                            )}

                            <Overline>Laboral</Overline>
                            <Dl icon={Briefcase} etiqueta="Campaña · Cargo" valor={[empleado.campania_nombre, empleado.cargo_nombre ? primeraMayuscula(empleado.cargo_nombre) : null].filter(Boolean).join(' · ') || null} />
                            <Dl icon={Briefcase} etiqueta="Cargo en SSFF" valor={contrato?.cargo_ssff} />
                            <Dl icon={Briefcase} etiqueta="Área · Centro de costo" valor={[nombreDe(cat.areas, contrato?.area_idarea), nombreDe(cat.centros_costo, contrato?.centro_costo_idcentro_costo, o => `${o.codigo} - ${o.nombre}`)].filter(Boolean).join(' · ') || null} />
                            <Dl icon={Briefcase} etiqueta="Modalidad · Oleada" valor={[nombreDe(cat.modalidades, contrato?.modalidad_idmodalidad), nombreDe(cat.oleadas, contrato?.oleada_idoleada)].filter(Boolean).join(' · ') || null} />
                            <Dl icon={MapPin} etiqueta="Sede · Piso" valor={[nombreDe(cat.ciudades, contrato?.ciudad_idciudad), contrato?.piso].filter(Boolean).join(' · ') || null} />
                            <Dl icon={Briefcase} etiqueta="Ingreso · Contrato" valor={contrato?.fecha_ingreso ? `${formatearFecha(contrato.fecha_ingreso)} · ${nombreDe(cat.tipos_contrato, contrato?.tipo_contrato_idtipo_contrato) || ''}`.trim() : null} />
                            <Dl icon={Calendar} etiqueta="Fin periodo de prueba" valor={formatearFecha(contrato?.fecha_fin_periodo_prueba)} />
                            <Dl icon={Calendar} etiqueta="Fin de contrato" valor={formatearFecha(contrato?.fecha_fin_contrato)} />
                            <Dl icon={UserPlus2} etiqueta="Jefe inmediato" valor={nombreDe(cat.empleados, contrato?.jefe_inmediato_id, o => o.nombre_completo)} />
                            <Dl icon={UserPlus2} etiqueta="Jefe de área" valor={nombreDe(cat.empleados, contrato?.jefe_area_id, o => o.nombre_completo)} />
                            <Dl icon={UserPlus2} etiqueta="Director de área" valor={nombreDe(cat.empleados, contrato?.director_area_id, o => o.nombre_completo)} />
                            <Dl icon={UserPlus2} etiqueta="Analista encargado" valor={nombreDe(cat.empleados, contrato?.analista_encargado_id, o => o.nombre_completo)} />
                            <Dl icon={Calendar} etiqueta="Certificación laboral y cesantías" valor={formatearFecha(contrato?.fecha_entrega_certificacion_laboral)} />
                            <Dl icon={Briefcase} etiqueta="Empresa" valor={nombreDe(cat.empresas, contrato?.empresa_id)} />
                            <Dl icon={Briefcase} etiqueta="Clase · Periodo de pago" valor={[nombreDe(cat.clases_contrato, contrato?.clase_contrato_id), nombreDe(cat.periodos_pago, contrato?.periodo_pago_id)].filter(Boolean).join(' · ') || null} />
                            <Dl icon={FileText} etiqueta="Clasificación Dian" valor={nombreDe(cat.clasificaciones_dian, contrato?.clasificacion_dian_id)} />
                            <Dl icon={FileText} etiqueta="Tipo Sena" valor={nombreDe(cat.tipos_sena, contrato?.tipo_sena_id)} />
                            <Dl icon={FileText} etiqueta="Cotizante" valor={[nombreDe(cat.tipos_cotizante, contrato?.tipo_cotizante_id), nombreDe(cat.subtipos_cotizante, contrato?.subtipo_cotizante_id)].filter(Boolean).join(' · ') || null} />
                            <Dl icon={Shirt} etiqueta="Dotación" valor={contrato && contrato.aplica_dotacion !== undefined ? (contrato.aplica_dotacion ? 'Aplica' : 'No aplica') : null} />
                            <Dl icon={FileText} etiqueta="Observaciones" valor={contrato?.observaciones} />

                            <Overline>Salario</Overline>
                            <Dl icon={Wallet} etiqueta="Salario básico" valor={formatMoneda(salario?.salario)} />
                            <Dl icon={Wallet} etiqueta="Bono no prestacional" valor={formatMoneda(salario?.bono_no_prestacional)} />
                            <Dl icon={Wallet} etiqueta="Bono cafetería" valor={formatMoneda(salario?.bono_cafeteria)} />

                            {(segSocial.eps_id || segSocial.arl_id || segSocial.afp_id || segSocial.cesantias_id || segSocial.caja_id) && (
                                <>
                                    <Overline>Seguridad social</Overline>
                                    <Dl icon={HeartPulse} etiqueta="EPS" valor={[nombreDe(cat.entidades_eps, segSocial.eps_id), formatearFecha(segSocial.eps_fecha_afiliacion)].filter(Boolean).join(' · ') || null} />
                                    <Dl icon={HeartPulse} etiqueta="ARL" valor={[nombreDe(cat.entidades_arl, segSocial.arl_id), segSocial.tarifa_arl ? `${segSocial.tarifa_arl}%` : null, formatearFecha(segSocial.arl_fecha_afiliacion)].filter(Boolean).join(' · ') || null} />
                                    <Dl icon={HeartPulse} etiqueta="AFP" valor={[nombreDe(cat.entidades_afp, segSocial.afp_id), formatearFecha(segSocial.afp_fecha_afiliacion)].filter(Boolean).join(' · ') || null} />
                                    <Dl icon={HeartPulse} etiqueta="Cesantías" valor={[nombreDe(cat.entidades_cesantias, segSocial.cesantias_id), formatearFecha(segSocial.cesantias_fecha_afiliacion)].filter(Boolean).join(' · ') || null} />
                                    <Dl icon={HeartPulse} etiqueta="Caja de compensación" valor={[nombreDe(cat.entidades_caja, segSocial.caja_id), formatearFecha(segSocial.caja_fecha_afiliacion)].filter(Boolean).join(' · ') || null} />
                                </>
                            )}

                            {cuenta && (
                                <>
                                    <Overline>Cuenta bancaria</Overline>
                                    <Dl icon={Landmark} etiqueta={nombreDe(cat.bancos, cuenta.banco_idbanco) || 'Banco'} valor={cuenta.numero_cuenta} />
                                    <Dl icon={Landmark} etiqueta="Tipo de cuenta" valor={nombreDe(cat.tipos_cuenta, cuenta.tipo_cuenta_idtipo_cuenta)} />
                                </>
                            )}

                            {contacto && (
                                <>
                                    <Overline>Contacto de emergencia</Overline>
                                    <Dl icon={Phone} etiqueta={`${contacto.nombre} (${nombreDe(cat.parentescos, contacto.parentesco_idparentesco) || '—'})`} valor={contacto.telefono} />
                                </>
                            )}

                            {vacunacion && (
                                <>
                                    <Overline>Vacunación COVID-19</Overline>
                                    <Dl icon={Syringe} etiqueta={vacunacion.tipo_vacuna_nombre || 'Vacunado'} valor={[formatearFecha(vacunacion.primera_dosis_fecha), formatearFecha(vacunacion.segunda_dosis_fecha)].filter(Boolean).join(' · ') || '—'} />
                                </>
                            )}

                            {dotaciones.length > 0 && (
                                <>
                                    <Overline>Dotación</Overline>
                                    {dotaciones.map(d => (
                                        <Dl
                                            key={d.iddotacion}
                                            icon={Shirt}
                                            etiqueta={formatearFecha(d.fecha_entrega) || 'Entrega sin fecha'}
                                            valor={[d.talla_camisa && `Camisa ${d.talla_camisa}`, d.talla_pantalon && `Pantalón ${d.talla_pantalon}`, d.talla_calzado && `Calzado ${d.talla_calzado}`, d.observaciones].filter(Boolean).join(' · ') || '—'}
                                        />
                                    ))}
                                </>
                            )}

                            {recursosAsignados.length > 0 && (
                                <>
                                    <Overline>Recursos asignados</Overline>
                                    {recursosAsignados.map(r => (
                                        <Dl
                                            key={r.idasignacion_recurso}
                                            icon={KeyRound}
                                            etiqueta={primeraMayuscula(r.tipo_recurso_nombre)}
                                            valor={[r.identificador, formatearFecha(r.fecha_entrega)].filter(Boolean).join(' · ') || 'Entregado'}
                                        />
                                    ))}
                                </>
                            )}

                            {retiro && (
                                <>
                                    <Overline>Retiro</Overline>
                                    <Dl icon={UserX} etiqueta={retiro.tipo_retiro_nombre} valor={formatearFecha(retiro.fecha_retiro)} />
                                    <Dl icon={Calendar} etiqueta="Última conexión" valor={formatearFecha(retiro.fecha_ultima_conexion)} />
                                    <Dl icon={FileText} etiqueta="Motivo" valor={retiro.motivo_retiro} />
                                    <Dl icon={FileText} etiqueta="Justificación" valor={retiro.justificacion} />
                                    <Dl icon={Package} etiqueta="Entrega de equipo" valor={retiro.equipo_entregado ? 'Entregado' : null} />
                                    <Dl icon={Calendar} etiqueta="Certificación laboral y cesantías" valor={formatearFecha(retiro.fecha_entrega_certificacion)} />
                                </>
                            )}
                        </div>
                    ) : tab === 'Activos' ? (
                        activos.length === 0 ? (
                            <p className="ai-muted" style={{ fontSize: 14 }}>Este empleado no tiene activos asignados.</p>
                        ) : (
                            <div className="ai-stack">
                                {activos.map((activo) => (
                                    <div key={activo.id} className="ai-dl">
                                        <Package className="ai-ic" size={16} strokeWidth={1.75} />
                                        <div>
                                            <dt>{activo.tipo_activo || activo.tipo || 'Activo'}</dt>
                                            <dd>{activo.numero_placa} · Serial {activo.numero_serie_fabricante || '—'}</dd>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : tab === 'Novedades' ? (
                        (novedades || []).length === 0 ? (
                            <p className="ai-muted" style={{ fontSize: 14 }}>Sin novedades registradas.</p>
                        ) : (
                            <div className="ai-stack">
                                {novedades.map((n) => (
                                    <div key={n.idnovedad_rrhh} className="ai-dl">
                                        <AlertCircle className="ai-ic" size={16} strokeWidth={1.75} />
                                        <div>
                                            <dt>{n.tipo_novedad_nombre}</dt>
                                            <dd>{formatearFecha(n.fecha_inicial)}{n.fecha_final ? ` – ${formatearFecha(n.fecha_final)}` : ''}</dd>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        (traspasos || []).length === 0 ? (
                            <p className="ai-muted" style={{ fontSize: 14 }}>Sin traspasos registrados.</p>
                        ) : (
                            <div className="ai-stack">
                                {traspasos.map((t) => (
                                    <div key={t.idtraspaso} className="ai-dl">
                                        <ArrowLeftRight className="ai-ic" size={16} strokeWidth={1.75} />
                                        <div>
                                            <dt>{formatearFecha(t.fecha_inicio)}</dt>
                                            <dd>{[t.area_nueva_nombre, t.cargo_nuevo_nombre].filter(Boolean).join(' · ') || 'Traspaso registrado'}</dd>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                <div className="ai-modal-foot">
                    <button type="button" className="ai-btn ai-btn--secondary" disabled title="Próximamente">
                        <ArrowLeftRight size={16} strokeWidth={1.75} />
                        Traspasar
                    </button>
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={() => onRetiro?.(empleadoId)} disabled={!empleado}>
                        <UserX size={16} strokeWidth={1.75} />
                        {retiro ? 'Ver retiro' : 'Registrar retiro'}
                    </button>
                    <button type="button" className="ai-btn ai-btn--primary" onClick={() => onEditar?.(empleado)} disabled={!empleado}>
                        <Edit3 size={16} strokeWidth={1.75} />
                        Editar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmpleadoDrawer;
