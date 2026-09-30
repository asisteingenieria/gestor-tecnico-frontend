import React, { useState, useEffect } from 'react';
import api, { userCompanyService } from '../services/api';
import { X, Save, UserX, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';

const fecha = (v) => (v ? String(v).substring(0, 10) : '');

const nombreDe = (lista, id) => {
    if (!id || !Array.isArray(lista)) return null;
    return lista.find(o => String(o.id) === String(id))?.nombre || null;
};

const FORM_VACIO = {
    fecha_retiro: '', fecha_ultima_conexion: '', tipo_retiro_id: '',
    motivo_retiro: '', justificacion: '', equipo_entregado: false,
    fecha_entrega_certificacion: ''
};

// Registra el retiro de un empleado (o muestra el ya registrado, con opción de
// reactivarlo). Campos de la hoja "Retiro empleado" del Excel de RRHH que ya se
// conocen del alta del empleado (Cliente, Identificación, Nombres, Modalidad,
// Analista encargado) se muestran de solo lectura — solo se piden los que
// realmente hacen falta: fecha de retiro, fecha última conexión, tipo/motivo de
// retiro, justificación, entrega de equipo y fecha de certificación laboral.
const RetiroModal = ({ isOpen, onClose, empleadoId, onSuccess }) => {
    const [empleado, setEmpleado] = useState(null);
    const [catalogos, setCatalogos] = useState({ tipos_retiro: [], modalidades: [], empleados: [] });
    const [retiroExistente, setRetiroExistente] = useState(null);
    const [form, setForm] = useState(FORM_VACIO);
    const [loadingData, setLoadingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmarReactivar, setConfirmarReactivar] = useState(false);

    useEffect(() => {
        if (!isOpen || !empleadoId) return;
        setConfirmarReactivar(false);
        const cargar = async () => {
            setLoadingData(true);
            try {
                const [empRes, catRes, retiroRes] = await Promise.all([
                    api.get(`/users-company/${empleadoId}`),
                    api.get('/users-company/catalogos'),
                    userCompanyService.getRetiro(empleadoId)
                ]);
                setEmpleado(empRes.data.empleado);
                setCatalogos(catRes.data.catalogos);
                const r = retiroRes.data.retiro;
                setRetiroExistente(r);
                setForm(r ? {
                    fecha_retiro: fecha(r.fecha_retiro),
                    fecha_ultima_conexion: fecha(r.fecha_ultima_conexion),
                    tipo_retiro_id: r.tipo_retiro_idtipo_retiro || '',
                    motivo_retiro: r.motivo_retiro || '',
                    justificacion: r.justificacion || '',
                    equipo_entregado: !!r.equipo_entregado,
                    fecha_entrega_certificacion: fecha(r.fecha_entrega_certificacion)
                } : FORM_VACIO);
                setError('');
            } catch (err) {
                console.error('Error al cargar datos de retiro:', err);
                setError('Error al cargar los datos del empleado');
            } finally {
                setLoadingData(false);
            }
        };
        cargar();
    }, [isOpen, empleadoId]);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // Tipo de retiro trae de la hoja "Causas finalizacion contrato" un Motivo emparejado
    // 1 a 1 (migracion 055): al elegir el tipo se sugiere el motivo, pero sigue siendo
    // editable. "Justificacion" solo aplica a "Renuncia Voluntaria" en la fuente -- se
    // oculta para el resto y se limpia el valor para no dejarlo guardado en silencio si
    // el usuario cambia de tipo despues de haberla llenado.
    const tipoRetiroSeleccionado = catalogos.tipos_retiro?.find(t => String(t.id) === String(form.tipo_retiro_id));
    const mostrarJustificacion = !!tipoRetiroSeleccionado?.requiere_justificacion;

    const handleTipoRetiroChange = (e) => {
        const id = e.target.value;
        const tipo = catalogos.tipos_retiro?.find(t => String(t.id) === String(id));
        setForm(prev => ({
            ...prev,
            tipo_retiro_id: id,
            motivo_retiro: tipo?.motivo_sugerido ?? prev.motivo_retiro,
            ...(tipo?.requiere_justificacion ? {} : { justificacion: '' })
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            fecha_retiro: form.fecha_retiro,
            fecha_ultima_conexion: form.fecha_ultima_conexion || null,
            tipo_retiro_id: form.tipo_retiro_id,
            motivo_retiro: form.motivo_retiro || null,
            justificacion: form.justificacion || null,
            equipo_entregado: form.equipo_entregado,
            fecha_entrega_certificacion: form.fecha_entrega_certificacion || null
        };

        try {
            if (retiroExistente) {
                await userCompanyService.actualizarRetiro(empleadoId, payload);
            } else {
                await userCompanyService.registrarRetiro(empleadoId, payload);
            }
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error al guardar el retiro:', err);
            setError(err.response?.data?.message || err.message || 'Error al guardar el retiro');
        } finally {
            setLoading(false);
        }
    };

    const handleReactivar = async () => {
        setLoading(true);
        setError('');
        try {
            await userCompanyService.reactivarEmpleado(empleadoId);
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error al reactivar empleado:', err);
            setError(err.response?.data?.message || err.message || 'Error al reactivar el empleado');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const contrato = empleado?.contrato;

    return (
        <div className="ai-overlay ai-scope" onClick={onClose}>
            <div className="ai-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><UserX size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h2 className="ai-modal-title">{retiroExistente ? 'Retiro del empleado' : 'Registrar retiro'}</h2>
                        <p className="ai-modal-sub">{empleado ? `${empleado.primer_nombre} ${empleado.primer_apellido}` : 'Cargando…'}</p>
                    </div>
                    <button className="ai-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                </div>

                {loadingData ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                        <Loader2 size={32} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="ai-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {error && (
                                <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', marginBottom: 16, width: '100%' }}>
                                    {error}
                                </div>
                            )}

                            <p className="ai-overline" style={{ marginBottom: 10 }}>Datos del empleado</p>
                            <div className="ai-form-grid">
                                <div className="ai-field">
                                    <label className="ai-label">Identificación</label>
                                    <p style={{ margin: 0, fontSize: 14 }}>{empleado?.tipo_identificacion_codigo} {empleado?.numero_identificacion}</p>
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Campaña · Cargo</label>
                                    <p style={{ margin: 0, fontSize: 14 }}>{[empleado?.campania_nombre, empleado?.cargo_nombre].filter(Boolean).join(' · ') || '—'}</p>
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Modalidad</label>
                                    <p style={{ margin: 0, fontSize: 14 }}>{nombreDe(catalogos.modalidades, contrato?.modalidad_idmodalidad) || '—'}</p>
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Analista encargado</label>
                                    <p style={{ margin: 0, fontSize: 14 }}>{catalogos.empleados?.find(e => String(e.id) === String(contrato?.analista_encargado_id))?.nombre_completo || '—'}</p>
                                </div>
                            </div>

                            <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Retiro</p>
                            <div className="ai-form-grid">
                                <div className="ai-field">
                                    <label className="ai-label">Fecha de retiro<em>*</em></label>
                                    <input type="date" name="fecha_retiro" value={form.fecha_retiro} onChange={onChange} required className="ai-input" />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Fecha última conexión</label>
                                    <input type="date" name="fecha_ultima_conexion" value={form.fecha_ultima_conexion} onChange={onChange} className="ai-input" />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Tipo de retiro<em>*</em></label>
                                    <select name="tipo_retiro_id" value={form.tipo_retiro_id} onChange={handleTipoRetiroChange} required className="ai-input">
                                        <option value="">Seleccionar…</option>
                                        {catalogos.tipos_retiro?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Motivo de retiro</label>
                                    <input type="text" name="motivo_retiro" value={form.motivo_retiro} onChange={onChange} className="ai-input" placeholder="Ej. Mejor oferta laboral" />
                                </div>
                                {mostrarJustificacion && (
                                    <div className="ai-field span-2">
                                        <label className="ai-label">Justificación<em>*</em></label>
                                        <textarea name="justificacion" value={form.justificacion} onChange={onChange} rows={2} required className="ai-input" style={{ height: 'auto', padding: '8px 12px' }} />
                                    </div>
                                )}
                                <div className="ai-field">
                                    <label className="ai-label">Fecha certificación laboral y cesantías</label>
                                    <input type="date" name="fecha_entrega_certificacion" value={form.fecha_entrega_certificacion} onChange={onChange} className="ai-input" />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Entrega de equipo</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                                        <input type="checkbox" name="equipo_entregado" checked={form.equipo_entregado} onChange={onChange} />
                                        Entregado
                                    </label>
                                    <p className="ai-help">Al marcarlo se liberan los recursos asignados (diadema, locker, carnet).</p>
                                </div>
                            </div>

                            {retiroExistente && (
                                <div className="ai-card" style={{ padding: 14, marginTop: 18, background: 'var(--warning-soft)', borderColor: 'transparent' }}>
                                    {!confirmarReactivar ? (
                                        <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setConfirmarReactivar(true)}>
                                            <RotateCcw size={16} strokeWidth={1.75} />
                                            Reactivar empleado
                                        </button>
                                    ) : (
                                        <div>
                                            <p style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 10px', fontSize: 13, color: 'var(--warning)' }}>
                                                <AlertTriangle size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
                                                Esto borra el retiro y vuelve el contrato a "activo". Los recursos que se hayan liberado (diadema, locker, carnet) no se reasignan solos.
                                            </p>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setConfirmarReactivar(false)} disabled={loading}>
                                                    Cancelar
                                                </button>
                                                <button type="button" className="ai-btn ai-btn--danger" onClick={handleReactivar} disabled={loading}>
                                                    {loading ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin" /> : <RotateCcw size={16} strokeWidth={1.75} />}
                                                    Confirmar reactivación
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="ai-modal-foot">
                            <button type="button" className="ai-btn ai-btn--secondary" onClick={onClose} disabled={loading}>
                                Cancelar
                            </button>
                            <button type="submit" className="ai-btn ai-btn--primary" disabled={loading}>
                                {loading ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin" /> : <Save size={16} strokeWidth={1.75} />}
                                {loading ? 'Guardando…' : retiroExistente ? 'Actualizar retiro' : 'Registrar retiro'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RetiroModal;
