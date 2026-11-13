import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { redMaestraService } from '../../services/api';
import { formatearFecha } from '../../utils/fecha';
import { UserMinus, Loader2, Search, Check } from 'lucide-react';
import { documentoRM, plano, hoyBogota } from './redMaestraUtils';

/**
 * Retirados de Claro (RRHH registró su retiro) y la fecha de su retiro en la Red Maestra, que registran sus
 * jefes desde el portal de asistencia (Equipo → Retiros) o el admin aquí. Pendiente = sin esa fecha.
 * Backend: claude/modulo recursoshumanos.md §53 y asistencia.md §59.
 */

const CeldaFechaRm = ({ fila, onGuardado }) => {
    const [valor, setValor] = useState(fila.fecha_retiro_rm || '');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { setValor(fila.fecha_retiro_rm || ''); }, [fila.fecha_retiro_rm]);

    const cambiado = valor !== (fila.fecha_retiro_rm || '');
    const guardar = async () => {
        try {
            setGuardando(true);
            setError('');
            await redMaestraService.guardarRetiroRm(fila.id, valor);
            onGuardado();
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <div className="ai-row" style={{ gap: 6 }}>
                <input type="date" className="ai-input" style={{ width: 150, height: 34 }} value={valor}
                    min={fila.fecha_ingreso || undefined} max={hoyBogota()}
                    onChange={(e) => setValor(e.target.value)} aria-label="Fecha de retiro en Red Maestra" />
                {cambiado && (
                    <button className="ai-icon-btn ai-icon-btn--outline" onClick={guardar} disabled={guardando} aria-label="Guardar fecha" title="Guardar">
                        {guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2} />}
                    </button>
                )}
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{error}</div>}
            {fila.retiro_rm_registrado_por && !cambiado && (
                <div className="ai-person-sub" style={{ marginTop: 2 }}>por {fila.retiro_rm_registrado_por}</div>
            )}
        </div>
    );
};

const RetirosRedMaestra = ({ onAbrir, version, onCambio }) => {
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    // Por defecto todos: así el admin ve la fecha que registró el jefe (con quién la puso), no solo los pendientes (§64).
    const [soloPendientes, setSoloPendientes] = useState(false);
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');

    const cargar = useCallback(async ({ silencioso = false } = {}) => {
        try {
            if (!silencioso) setLoading(true);
            const params = {};
            if (desde) params.desde = desde;
            if (hasta) params.hasta = hasta;
            const { data } = await redMaestraService.retiros(params);
            setDatos(data.data || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudieron cargar los retiros');
        } finally {
            setLoading(false);
        }
    }, [desde, hasta]);

    useEffect(() => { cargar(); }, [cargar, version]);

    const pendientes = datos.filter((r) => r.pendiente).length;
    const filas = useMemo(() => {
        const q = plano(busqueda.trim());
        return datos.filter((r) =>
            (!soloPendientes || r.pendiente)
            && (!q || [r.nombre, r.cedula, r.campania, r.jefe_inmediato, r.jefe_area].some((v) => plano(v).includes(q)))
        );
    }, [datos, busqueda, soloPendientes]);

    const alGuardar = () => { cargar({ silencioso: true }); onCambio?.(); };

    return (
        <div className="ai-card">
            <div className="ai-toolbar" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                    <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Retirados desde</label>
                    <input type="date" className="ai-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
                </div>
                <div>
                    <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Hasta</label>
                    <input type="date" className="ai-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                </div>
                <div className="ai-search" style={{ flex: 1, minWidth: 220 }}>
                    <Search size={16} strokeWidth={1.75} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula, campaña o jefe…"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, font: 'inherit', color: 'var(--ink)' }}
                    />
                </div>
                <label className="ai-row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
                    Solo pendientes de retiro en RM ({pendientes})
                </label>
            </div>

            {error && <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', margin: '0 16px 12px' }}>{error}</div>}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" /></div>
            ) : filas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <UserMinus size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)', margin: '0 auto 12px' }} />
                    <p style={{ font: '600 14px var(--font-sans)', color: 'var(--ink)' }}>
                        {soloPendientes ? 'No hay retiros pendientes de registrar en la Red Maestra' : 'No hay retiros de Claro en ese rango'}
                    </p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="ai-table ai-table--dense">
                        <thead>
                            <tr>
                                <th>Documento</th>
                                <th>Nombre completo</th>
                                <th>Campaña</th>
                                <th>Jefes</th>
                                <th>Retiro RRHH</th>
                                <th>Estado RM</th>
                                <th>Retiro Red Maestra</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((r) => (
                                <tr key={r.id} onClick={() => onAbrir(r.id)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div className="ai-num">{r.cedula}</div>
                                        <div className="ai-person-sub">{documentoRM(r.tipo_documento)}</div>
                                    </td>
                                    <td>
                                        <div className="ai-person-name">{r.nombre}</div>
                                        {r.cargo && <div className="ai-person-sub">{r.cargo}</div>}
                                    </td>
                                    <td>
                                        <div>{r.campania || '—'}</div>
                                        {r.centro_costo && <div className="ai-person-sub">{r.centro_costo}</div>}
                                    </td>
                                    <td style={{ fontSize: 13 }}>
                                        <div>{r.jefe_inmediato ? `Coord.: ${r.jefe_inmediato}` : '—'}</div>
                                        {r.jefe_area && <div className="ai-person-sub">Área: {r.jefe_area}</div>}
                                    </td>
                                    <td>
                                        <div className="ai-num">{formatearFecha(r.fecha_retiro)}</div>
                                        {r.tipo_retiro && <div className="ai-person-sub">{r.tipo_retiro}</div>}
                                    </td>
                                    <td>{r.estado_rm ? <span className="ai-badge ai-badge--neutral">{r.estado_rm}</span> : <span className="ai-muted">—</span>}</td>
                                    <td>
                                        <CeldaFechaRm fila={r} onGuardado={alGuardar} />
                                        {r.pendiente && <span className="ai-badge ai-badge--warning" style={{ marginTop: 4 }}>Pendiente</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default RetirosRedMaestra;
