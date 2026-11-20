import React, { useEffect, useState } from 'react';
import { pasivoVacacionalService } from '../services/api';
import { nombrePropio } from '../utils/formatoRRHH';
import { SlidersHorizontal, X, Loader2, AlertCircle, History } from 'lucide-react';

// Ajuste del saldo inicial del pasivo vacacional, solo financiera (claude/modulo recursoshumanos.md §58.2).
// Edita lo que el cálculo toma como punto de partida: fecha de corte y días disfrutados y compensados a esa fecha.
// Desde la fecha de corte el sistema sigue sumando las novedades de Vacaciones, igual que con el Excel.

const fmtFecha = (iso) => {
    if (!iso) return '—';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
};
const fmtFechaHora = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
};
const fmtDias = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 }));

const AjusteSaldoPasivo = ({ fila, fechaCalculo, onClose, onGuardado }) => {
    const [form, setForm] = useState({
        fecha_corte: fila.con_corte ? fila.fecha_corte : fechaCalculo,
        dias_disfrutados: fila.con_corte ? String(fila.saldo_disfrutados_corte ?? 0) : String(fila.dias_disfrutados ?? 0),
        dias_compensados: fila.con_corte ? String(fila.saldo_compensados_corte ?? 0) : String(fila.dias_compensados ?? 0),
        nota: ''
    });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [ajustes, setAjustes] = useState(null);

    useEffect(() => {
        pasivoVacacionalService.ajustes(fila.users_company_id)
            .then((r) => setAjustes(r.data.ajustes || []))
            .catch(() => setAjustes([]));
    }, [fila.users_company_id]);

    const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setError('');
        try {
            await pasivoVacacionalService.ajustarSaldo(fila.users_company_id, form);
            onGuardado();
        } catch (err) {
            setError(err?.response?.data?.message || 'No se pudo guardar el ajuste');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="ai-overlay ai-scope">
            <div className="ai-modal" style={{ maxWidth: 620, maxHeight: '92vh', overflowY: 'auto' }}>
                <div className="ai-modal-head">
                    <div className="ai-modal-icon"><SlidersHorizontal size={20} /></div>
                    <div style={{ flex: 1 }}>
                        <h2 className="ai-modal-title">Ajustar saldo del pasivo</h2>
                        <p className="ai-modal-sub">{nombrePropio(fila.nombre)} · {fila.numero_identificacion} · ingreso {fmtFecha(fila.fecha_ingreso)}</p>
                    </div>
                    <button type="button" className="ai-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
                </div>

                <form onSubmit={guardar}>
                    <div className="ai-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}>
                            Saldo actual: {fila.con_corte
                                ? <>{fila.origen_saldo === 'financiera' ? 'ajustado por financiera' : 'Excel de Gestión Humana'} al {fmtFecha(fila.fecha_corte)}: {fmtDias(fila.saldo_disfrutados_corte)} disfrutados y {fmtDias(fila.saldo_compensados_corte)} compensados.</>
                                : <>no venía en el Excel de corte; hoy el pasivo es el acumulado menos las novedades de Vacaciones del sistema.</>}
                            {' '}Indique los días disfrutados y compensados <strong>hasta la fecha de corte</strong>; las novedades de Vacaciones
                            posteriores a esa fecha se siguen sumando solas.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                            <div className="ai-field">
                                <label className="ai-label">Fecha de corte <em>*</em></label>
                                <input type="date" name="fecha_corte" value={form.fecha_corte || ''} onChange={onChange} required className="ai-input" />
                            </div>
                            <div className="ai-field">
                                <label className="ai-label">Disfrutados al corte <em>*</em></label>
                                <input type="number" min="0" step="0.01" name="dias_disfrutados" value={form.dias_disfrutados} onChange={onChange} required className="ai-input" />
                            </div>
                            <div className="ai-field">
                                <label className="ai-label">Compensados al corte <em>*</em></label>
                                <input type="number" min="0" step="0.01" name="dias_compensados" value={form.dias_compensados} onChange={onChange} required className="ai-input" />
                            </div>
                        </div>
                        <div className="ai-field">
                            <label className="ai-label">Motivo del ajuste <em>*</em></label>
                            <textarea name="nota" value={form.nota} onChange={onChange} rows={2} maxLength={500} required minLength={5}
                                placeholder="Ej.: revisado con Gestión Humana, tomó 15 días en 2025"
                                className="ai-input" style={{ height: 'auto', padding: '8px 12px' }} />
                        </div>
                        {error && (
                            <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', width: 'fit-content' }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <div>
                            <p className="ai-overline" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                                <History size={14} /> Ajustes anteriores
                            </p>
                            {ajustes === null ? (
                                <p className="ai-muted" style={{ fontSize: 12 }}>Cargando…</p>
                            ) : ajustes.length === 0 ? (
                                <p className="ai-muted" style={{ fontSize: 12 }}>Sin ajustes de financiera.</p>
                            ) : (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {ajustes.map((a) => (
                                        <li key={a.id} style={{ fontSize: 12 }}>
                                            <strong>{fmtFechaHora(a.created_at)}</strong> · {a.usuario || 'financiera'}: corte {fmtFecha(a.fecha_corte)},
                                            {' '}{fmtDias(a.dias_disfrutados)} disfrutados, {fmtDias(a.dias_compensados)} compensados
                                            {a.fecha_corte_antes
                                                ? <span className="ai-muted"> (antes: {fmtFecha(a.fecha_corte_antes)}, {fmtDias(a.dias_disfrutados_antes)} / {fmtDias(a.dias_compensados_antes)})</span>
                                                : <span className="ai-muted"> (antes: sin saldo)</span>}
                                            <div className="ai-muted">{a.nota}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="ai-modal-foot">
                        <button type="button" className="ai-btn ai-btn--ghost" onClick={onClose} disabled={guardando}>Cancelar</button>
                        <button type="submit" className="ai-btn ai-btn--primary" disabled={guardando}>
                            {guardando && <Loader2 size={16} className="animate-spin" />}
                            {guardando ? 'Guardando…' : 'Guardar ajuste'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AjusteSaldoPasivo;
