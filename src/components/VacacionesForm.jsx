import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { vacacionesService } from '../services/api';
import { X, Save, Plus, Trash2, CalendarClock } from 'lucide-react';

const fecha = (v) => (v ? String(v).substring(0, 10) : '');

const PERIODO_VACIO = { periodo_tomado: '', fecha_inicio: '', fecha_final: '' };

const VacacionesForm = ({ isOpen, onClose, vacaciones = null, onSuccess }) => {
    const [empleados, setEmpleados] = useState([]);
    const [empleadoId, setEmpleadoId] = useState('');
    const [contratoId, setContratoId] = useState('');
    const [form, setForm] = useState({
        fecha_corte: '', dias_trabajados: '', dias_acumulados: '',
        dias_tomados: '', dias_compensados: '', pasivo_vacacional: ''
    });
    const [periodos, setPeriodos] = useState([]);

    const [loadingData, setLoadingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargar = async () => {
            setLoadingData(true);
            try {
                const empRes = await api.get('/users-company');
                setEmpleados(empRes.data.empleados);

                if (vacaciones) {
                    setEmpleadoId(vacaciones.empleado_id || '');
                    setContratoId(vacaciones.contrato_idcontrato || '');
                    setForm({
                        fecha_corte: fecha(vacaciones.fecha_corte),
                        dias_trabajados: vacaciones.dias_trabajados ?? '',
                        dias_acumulados: vacaciones.dias_acumulados ?? '',
                        dias_tomados: vacaciones.dias_tomados ?? '',
                        dias_compensados: vacaciones.dias_compensados ?? '',
                        pasivo_vacacional: vacaciones.pasivo_vacacional ?? ''
                    });

                    const detalle = await vacacionesService.getById(vacaciones.idvacaciones);
                    setPeriodos((detalle.data.vacaciones.periodos || []).map(p => ({
                        periodo_tomado: p.periodo_tomado || '',
                        fecha_inicio: fecha(p.fecha_inicio),
                        fecha_final: fecha(p.fecha_final)
                    })));
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
    }, [vacaciones]);

    const onSelectEmpleado = (e) => {
        const id = e.target.value;
        setEmpleadoId(id);
        const emp = empleados.find(x => String(x.id) === String(id));
        setContratoId(emp?.idcontrato || '');
    };

    const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const addPeriodo = () => setPeriodos(prev => [...prev, { ...PERIODO_VACIO }]);
    const removePeriodo = (idx) => setPeriodos(prev => prev.filter((_, i) => i !== idx));
    const changePeriodo = (idx, campo, valor) => {
        setPeriodos(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!contratoId) {
            setError('Selecciona un empleado válido (con contrato activo)');
            setLoading(false);
            return;
        }

        const payload = {
            contrato_id: contratoId,
            fecha_corte: form.fecha_corte,
            dias_trabajados: form.dias_trabajados !== '' ? parseInt(form.dias_trabajados, 10) : 0,
            dias_acumulados: form.dias_acumulados !== '' ? parseFloat(form.dias_acumulados) : 0,
            dias_tomados: form.dias_tomados !== '' ? parseFloat(form.dias_tomados) : 0,
            dias_compensados: form.dias_compensados !== '' ? parseFloat(form.dias_compensados) : 0,
            pasivo_vacacional: form.pasivo_vacacional !== '' ? parseFloat(form.pasivo_vacacional) : null,
            periodos: periodos.filter(p => p.fecha_inicio)
        };

        try {
            let response;
            if (vacaciones) {
                response = await vacacionesService.update(vacaciones.idvacaciones, payload);
            } else {
                response = await vacacionesService.create(payload);
            }
            if (response.data.success) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error('Error al guardar vacaciones:', err);
            setError(err.response?.data?.message || err.message || 'Error al guardar el registro de vacaciones');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="ai-overlay ai-scope">
            <div className="ai-modal" style={{ maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }}>
                <div className="ai-modal-head">
                    <div className="ai-modal-icon"><CalendarClock size={20} /></div>
                    <div>
                        <h2 className="ai-modal-title">{vacaciones ? 'Editar pasivo vacacional' : 'Nuevo pasivo vacacional'}</h2>
                        <p className="ai-modal-sub">Días acumulados, tomados y compensados</p>
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
                                <p className="ai-overline">Empleado</p>
                                <div className="ai-field">
                                    <label className="ai-label">Empleado <em>*</em></label>
                                    <select value={empleadoId} onChange={onSelectEmpleado} required className="ai-input" disabled={!!vacaciones}>
                                        <option value="">Seleccionar...</option>
                                        {empleados.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.nombre_completo} — {emp.numero_identificacion}</option>
                                        ))}
                                    </select>
                                </div>

                                <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>Corte de vacaciones</p>
                                <div className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                    <div className="ai-field">
                                        <label className="ai-label">Fecha de corte <em>*</em></label>
                                        <input type="date" name="fecha_corte" value={form.fecha_corte} onChange={onChange} required className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Días trabajados</label>
                                        <input type="number" min="0" name="dias_trabajados" value={form.dias_trabajados} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Días acumulados</label>
                                        <input type="number" min="0" step="0.01" name="dias_acumulados" value={form.dias_acumulados} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Días tomados</label>
                                        <input type="number" min="0" step="0.01" name="dias_tomados" value={form.dias_tomados} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Días compensados</label>
                                        <input type="number" min="0" step="0.01" name="dias_compensados" value={form.dias_compensados} onChange={onChange} className="ai-input" />
                                    </div>
                                    <div className="ai-field">
                                        <label className="ai-label">Pasivo vacacional ($)</label>
                                        <input type="number" min="0" step="0.01" name="pasivo_vacacional" value={form.pasivo_vacacional} onChange={onChange} className="ai-input" />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                                    <p className="ai-overline">Periodos tomados</p>
                                    <button type="button" onClick={addPeriodo} className="ai-btn ai-btn--ghost ai-btn--sm">
                                        <Plus size={14} /> Agregar periodo
                                    </button>
                                </div>

                                {periodos.length === 0 ? (
                                    <p className="ai-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Sin periodos registrados.</p>
                                ) : (
                                    <div className="ai-stack" style={{ gap: 12 }}>
                                        {periodos.map((p, idx) => (
                                            <div key={idx} className="ai-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'end', background: 'var(--surface-0)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                                <div className="ai-field">
                                                    <label className="ai-label">Periodo</label>
                                                    <input type="text" value={p.periodo_tomado} onChange={(e) => changePeriodo(idx, 'periodo_tomado', e.target.value)} placeholder="Ej: 2025-2026" className="ai-input" />
                                                </div>
                                                <div className="ai-field">
                                                    <label className="ai-label">Fecha inicio</label>
                                                    <input type="date" value={p.fecha_inicio} onChange={(e) => changePeriodo(idx, 'fecha_inicio', e.target.value)} className="ai-input" />
                                                </div>
                                                <div className="ai-field">
                                                    <label className="ai-label">Fecha final</label>
                                                    <input type="date" value={p.fecha_final} onChange={(e) => changePeriodo(idx, 'fecha_final', e.target.value)} className="ai-input" />
                                                </div>
                                                <button type="button" onClick={() => removePeriodo(idx)} className="ai-btn ai-btn--secondary ai-btn--sm" style={{ color: 'var(--danger)' }}>
                                                    <Trash2 size={14} /> Quitar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

export default VacacionesForm;
