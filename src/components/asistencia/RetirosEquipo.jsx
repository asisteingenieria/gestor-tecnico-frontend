import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, UserMinus, Check, AlertTriangle } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { avisarCambioContadores } from '../../utils/eventosAsistencia';
import SelectorVistaEquipo from './SelectorVistaEquipo';

// Retiros de Claro del equipo (asistencia.md §59): cuando RRHH retira a alguien de Claro, sus jefes —
// coordinador (jefe inmediato), jefe de área y gestor— registran aquí la fecha en que lo retiraron de la
// Red Maestra. El admin del Gestor ve esa fecha en su módulo Red Maestra. Mientras falte, el retiro queda
// pendiente y el portal muestra la alerta.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// 'YYYY-MM-DD' → '3 nov 2026', sin pasar por Date para no correr el día por la zona horaria.
const fechaCorta = (f) => {
    if (!f) return '—';
    const [a, m, d] = f.split('-');
    return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`;
};

const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const sinTildes = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const FilaRetiro = ({ r, onGuardado }) => {
    const [fecha, setFecha] = useState(r.fecha_retiro_rm || '');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { setFecha(r.fecha_retiro_rm || ''); }, [r.fecha_retiro_rm]);

    const cambiado = fecha !== (r.fecha_retiro_rm || '');
    const guardar = async () => {
        try {
            setGuardando(true);
            setError('');
            const { data } = await asistenciaService.registrarRetiroRm(r.empleado_id, fecha);
            onGuardado(data);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo guardar la fecha');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <tr>
            <td>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{nombrePropio(r.empleado)}</div>
                <div className="ai-person-sub">{r.cedula}</div>
            </td>
            <td style={{ fontSize: 13 }}>
                <div>{[r.campania, r.centro_costo].filter(Boolean).join(' · ') || '—'}</div>
                <div className="ai-person-sub">{r.cargo ? primeraMayuscula(r.cargo) : ''}{r.jefe_inmediato ? ` · Coord.: ${nombrePropio(r.jefe_inmediato)}` : ''}</div>
            </td>
            <td>
                <div className="ai-num">{fechaCorta(r.fecha_retiro)}</div>
                {r.tipo_retiro && <div className="ai-person-sub">{r.tipo_retiro}</div>}
            </td>
            <td>
                <div className="ai-row" style={{ gap: 6 }}>
                    <input type="date" className="ai-input" style={{ width: 160, height: 34 }} value={fecha}
                        min={r.fecha_ingreso || undefined} max={hoyBogota()}
                        onChange={(e) => setFecha(e.target.value)} aria-label={`Retiro Red Maestra de ${r.empleado}`} />
                    {cambiado && (
                        <button type="button" className="ai-btn ai-btn--primary ai-btn--sm" onClick={guardar} disabled={guardando}>
                            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2} />} Guardar
                        </button>
                    )}
                </div>
                {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{error}</div>}
                {!cambiado && r.retiro_rm_registrado_por && <div className="ai-person-sub" style={{ marginTop: 2 }}>Registró {nombrePropio(r.retiro_rm_registrado_por)}</div>}
            </td>
            <td>
                {r.pendiente
                    ? <span className="ai-badge ai-badge--warning"><span className="ai-dot" />Pendiente</span>
                    : <span className="ai-badge ai-badge--success"><span className="ai-dot" />Registrado</span>}
            </td>
        </tr>
    );
};

const RetirosEquipo = ({ vistaEquipo = false }) => {
    const [retiros, setRetiros] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [soloPendientes, setSoloPendientes] = useState(true);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await asistenciaService.getRetirosEquipo();
            setRetiros(data);
        } catch (err) {
            setRetiros(null);
            setError(err.response?.data?.message || 'No se pudieron cargar los retiros del equipo');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const pendientes = (retiros ?? []).filter((r) => r.pendiente).length;
    const filtrados = useMemo(() => {
        const q = sinTildes(busqueda.trim());
        return (retiros ?? []).filter((r) =>
            (!soloPendientes || r.pendiente)
            && (!q || sinTildes(r.empleado || '').includes(q) || String(r.cedula).includes(q))
        );
    }, [retiros, busqueda, soloPendientes]);

    // Reemplaza la fila guardada sin recargar (con "Solo pendientes", la registrada sale de la lista)
    // y avisa al menú para que actualice la alerta de pendientes.
    const alGuardar = (actualizado) => {
        setRetiros((prev) => prev.map((r) => (r.empleado_id === actualizado.empleado_id ? actualizado : r)));
        avisarCambioContadores();
    };

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Retiros del equipo</h1>
                    <p className="ai-page-sub">Gente de Claro que RRHH retiró: registra la fecha en que la retiraste de la Red Maestra</p>
                </div>
                <div className="ai-row" style={{ flexWrap: 'wrap' }}>
                    {vistaEquipo && <SelectorVistaEquipo />}
                </div>
            </div>

            {pendientes > 0 && (
                <div className="ai-badge ai-badge--warning" style={{ height: 'auto', padding: '10px 14px', whiteSpace: 'normal', display: 'flex', gap: 8 }}>
                    <AlertTriangle size={16} strokeWidth={1.75} />
                    Tienes {pendientes} retiro{pendientes === 1 ? '' : 's'} sin fecha de retiro en la Red Maestra.
                </div>
            )}

            {loading ? (
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            ) : !retiros ? (
                <div className="ai-panel ai-empty"><p style={{ color: 'var(--danger)' }}>{error}</p></div>
            ) : (
                <div className="ai-panel">
                    <div className="ai-panel-head" style={{ flexWrap: 'wrap', gap: 8 }}>
                        <h3 className="ai-panel-title">
                            {retiros.length} retirado{retiros.length === 1 ? '' : 's'} de Claro · {pendientes} pendiente{pendientes === 1 ? '' : 's'}
                        </h3>
                        <div className="ai-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-subtle)' }} />
                                <input className="ai-input" style={{ paddingLeft: 30, width: 220 }} placeholder="Nombre o cédula"
                                    value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar" />
                            </div>
                            <label className="ai-row" style={{ gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
                                Solo pendientes
                            </label>
                        </div>
                    </div>

                    {filtrados.length === 0 ? (
                        <div className="ai-empty">
                            <UserMinus size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                            <p>{retiros.length === 0 ? 'No hay retiros de Claro en tu equipo.' : soloPendientes ? 'No tienes retiros pendientes. ¡Al día!' : 'Ningún retiro coincide con la búsqueda.'}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ai-table ai-table--dense">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Campaña · Cargo</th>
                                        <th>Retiro RRHH</th>
                                        <th>Retiro Red Maestra</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map((r) => <FilaRetiro key={r.empleado_id} r={r} onGuardado={alGuardar} />)}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RetirosEquipo;
