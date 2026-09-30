import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { novedadRrhhService } from '../services/api';
import { X, Save, ClipboardList } from 'lucide-react';

const fecha = (v) => (v ? String(v).substring(0, 10) : '');

const NovedadForm = ({ isOpen, onClose, novedad = null, onSuccess }) => {
    const [empleados, setEmpleados] = useState([]);
    const [tiposNovedad, setTiposNovedad] = useState([]);
    const [form, setForm] = useState({
        empleado_id: '', contrato_id: '', tipo_novedad_id: '', responsable_id: '',
        accidente_transito: false, fecha_inicial: '', fecha_final: '', fecha_retorno: '',
        total_dias: '', resumen_diagnostico: '', origen_incapacidad: '', observaciones: '',
        fecha_recibido: '', fecha_reporte: '',
        tiene_documento_original: false, tiene_copia_documento: false, tiene_historia_clinica: false,
        tiene_runt: false, tiene_furips: false, tiene_soat: false
    });
    const [loadingData, setLoadingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargar = async () => {
            setLoadingData(true);
            try {
                const [empRes, catRes] = await Promise.all([
                    api.get('/users-company'),
                    api.get('/users-company/catalogos')
                ]);
                setEmpleados(empRes.data.empleados);
                setTiposNovedad(catRes.data.catalogos.tipos_novedad || []);

                if (novedad) {
                    setForm({
                        empleado_id: novedad.empleado_id || '',
                        contrato_id: novedad.contrato_idcontrato || '',
                        tipo_novedad_id: novedad.tipo_novedad_idtipo_novedad || '',
                        responsable_id: novedad.responsable_id || '',
                        accidente_transito: !!novedad.accidente_transito,
                        fecha_inicial: fecha(novedad.fecha_inicial),
                        fecha_final: fecha(novedad.fecha_final),
                        fecha_retorno: fecha(novedad.fecha_retorno),
                        total_dias: novedad.total_dias ?? '',
                        resumen_diagnostico: novedad.resumen_diagnostico || '',
                        origen_incapacidad: novedad.origen_incapacidad || '',
                        observaciones: novedad.observaciones || '',
                        fecha_recibido: fecha(novedad.fecha_recibido),
                        fecha_reporte: fecha(novedad.fecha_reporte),
                        tiene_documento_original: !!novedad.tiene_documento_original,
                        tiene_copia_documento: !!novedad.tiene_copia_documento,
                        tiene_historia_clinica: !!novedad.tiene_historia_clinica,
                        tiene_runt: !!novedad.tiene_runt,
                        tiene_furips: !!novedad.tiene_furips,
                        tiene_soat: !!novedad.tiene_soat
                    });
                }
                setError('');
            } catch (err) {
                console.error('Error al cargar datos del formulario:', err);
                setError('Error al cargar los datos del formulario');
            } finally {
                setLoadingData(false);
            }
        };
        cargar();
    }, [novedad]);

    const onChangeEmpleado = (e) => {
        const empleadoId = e.target.value;
        const emp = empleados.find(x => String(x.id) === String(empleadoId));
        setForm(prev => ({ ...prev, empleado_id: empleadoId, contrato_id: emp?.idcontrato || '' }));
    };

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!form.contrato_id) {
            setError('Selecciona un empleado válido (con contrato activo)');
            setLoading(false);
            return;
        }

        const payload = {
            ...form,
            total_dias: form.total_dias !== '' ? parseInt(form.total_dias, 10) : null,
            responsable_id: form.responsable_id || null
        };

        try {
            let response;
            if (novedad) {
                response = await novedadRrhhService.update(novedad.idnovedad_rrhh, payload);
            } else {
                response = await novedadRrhhService.create(payload);
            }
            if (response.data.success) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error('Error al guardar novedad:', err);
            setError(err.response?.data?.message || err.message || 'Error al guardar la novedad');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const checkboxField = (label, name) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" name={name} checked={form[name]} onChange={onChange} />
            {label}
        </label>
    );

    return (
        <div className="ai-overlay ai-scope">
            <div className="ai-modal" style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }}>
                <div className="ai-modal-head">
                    <div className="ai-modal-icon"><ClipboardList size={20} /></div>
                    <div>
                        <h2 className="ai-modal-title">{novedad ? 'Editar novedad' : 'Nueva novedad'}</h2>
                        <p className="ai-modal-sub">Incapacidades, licencias y demás novedades de RRHH</p>
                    </div>
                    <button onClick={onClose} className="ai-icon-btn" aria-label="Cerrar"><X size={18} /></button>
                </div>

                {loadingData ? (
                    <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--primary)' }} />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="ai-modal-body">
                            {error && (
                                <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', marginBottom: 16, width: 'fit-content' }}>
                                    <span className="ai-dot" />
                                    {error}
                                </div>
                            )}

                            <div className="ai-stack">
                                <p className="ai-overline">Empleado y tipo</p>
                                <div className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                    <div className="ai-field">
                                        <label className="ai-label">Empleado <em>*</em></label>
                                        <select name="empleado_id" value={form.empleado_id} onChange={onChangeEmpleado} required className="ai-input" disabled={!!novedad}>
                                            <option value="">Seleccionar...</option>
                                            {empleados.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.nombre_completo} — {emp.numero_identificacion}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Tipo de novedad <em>*</em></label>
                                        <select name="tipo_novedad_id" value={form.tipo_novedad_id} onChange={onChange} required className="ai-input">
                                            <option value="">Seleccionar...</option>
                                            {tiposNovedad.map(t => (
                                                <option key={t.id} value={t.id}>[{t.categoria}] {t.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Responsable</label>
                                        <select name="responsable_id" value={form.responsable_id} onChange={onChange} className="ai-input">
                                            <option value="">Sin especificar</option>
                                            {empleados.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {checkboxField('Accidente de tránsito', 'accidente_transito')}

                                <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>Fechas</p>
                                <div className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha inicial <em>*</em></label>
                                        <input type="date" name="fecha_inicial" value={form.fecha_inicial} onChange={onChange} required className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha final</label>
                                        <input type="date" name="fecha_final" value={form.fecha_final} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha de retorno</label>
                                        <input type="date" name="fecha_retorno" value={form.fecha_retorno} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Total días</label>
                                        <input type="number" min="0" name="total_dias" value={form.total_dias} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha de recibido</label>
                                        <input type="date" name="fecha_recibido" value={form.fecha_recibido} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha de reporte</label>
                                        <input type="date" name="fecha_reporte" value={form.fecha_reporte} onChange={onChange} className="ai-input" />
                                    </div>
                                </div>

                                <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>Detalle</p>
                                <div className="ai-field">
                                    <label className="ai-label">Origen de la incapacidad</label>
                                    <input type="text" name="origen_incapacidad" value={form.origen_incapacidad} onChange={onChange} className="ai-input" />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Diagnóstico</label>
                                    <textarea name="resumen_diagnostico" value={form.resumen_diagnostico} onChange={onChange} rows={2} className="ai-input" style={{ height: 'auto', padding: '8px 12px' }} />
                                </div>
                                <div className="ai-field">
                                    <label className="ai-label">Observaciones</label>
                                    <textarea name="observaciones" value={form.observaciones} onChange={onChange} rows={2} className="ai-input" style={{ height: 'auto', padding: '8px 12px' }} />
                                </div>

                                <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>Soportes documentales</p>
                                <div className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                    {checkboxField('Documento original', 'tiene_documento_original')}
                                    {checkboxField('Copia del documento', 'tiene_copia_documento')}
                                    {checkboxField('Historia clínica', 'tiene_historia_clinica')}
                                    {checkboxField('RUNT', 'tiene_runt')}
                                    {checkboxField('FURIPS', 'tiene_furips')}
                                    {checkboxField('SOAT', 'tiene_soat')}
                                </div>
                            </div>
                        </div>

                        <div className="ai-modal-foot">
                            <button type="button" onClick={onClose} className="ai-btn ai-btn--secondary">Cancelar</button>
                            <button type="submit" disabled={loading} className="ai-btn ai-btn--primary">
                                <Save size={16} />
                                {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default NovedadForm;
