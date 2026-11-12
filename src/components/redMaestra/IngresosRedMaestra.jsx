import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { redMaestraService } from '../../services/api';
import { formatearFecha } from '../../utils/fecha';
import { UserPlus, Loader2, Search } from 'lucide-react';
import { TIPOS_PERSONAL, documentoRM, plano } from './redMaestraUtils';

/**
 * Historial de registros nuevos de RRHH en Claro (backend claude/modulo recursoshumanos.md §53): las fichas
 * que RRHH creó en el rango, para tramitar su ingreso en la Red Maestra. Por defecto, los últimos 30 días.
 * "Sin requerimiento" = todavía no tiene ningún requerimiento registrado en la RM.
 */

// Instante UTC → "12 nov 2026, 3:40 p. m." en hora de Bogotá.
const fmtRegistro = (v) => (v ? new Date(v).toLocaleString('es-CO', {
    timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
}) : '—');

const IngresosRedMaestra = ({ onAbrir, version }) => {
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [soloSinReq, setSoloSinReq] = useState(false);

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (desde) params.desde = desde;
            if (hasta) params.hasta = hasta;
            const { data } = await redMaestraService.ingresos(params);
            setDatos(data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudieron cargar los nuevos ingresos');
        } finally {
            setLoading(false);
        }
    }, [desde, hasta]);

    useEffect(() => { cargar(); }, [cargar, version]);

    const filas = useMemo(() => {
        const q = plano(busqueda.trim());
        return (datos?.data || []).filter((r) =>
            (!soloSinReq || !r.total_requerimientos)
            && (!q || [r.nombre, r.cedula, r.usuario_ssff, r.campania, r.cargo].some((v) => plano(v).includes(q)))
        );
    }, [datos, busqueda, soloSinReq]);

    const sinRequerimiento = (datos?.data || []).filter((r) => !r.total_requerimientos).length;

    return (
        <div className="ai-card">
            <div className="ai-toolbar" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                    <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Registrados desde</label>
                    <input type="date" className="ai-input" value={desde || datos?.desde || ''} onChange={(e) => setDesde(e.target.value)} />
                </div>
                <div>
                    <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Hasta</label>
                    <input type="date" className="ai-input" value={hasta || datos?.hasta || ''} onChange={(e) => setHasta(e.target.value)} />
                </div>
                <div className="ai-search" style={{ flex: 1, minWidth: 220 }}>
                    <Search size={16} strokeWidth={1.75} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula, campaña o cargo…"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, font: 'inherit', color: 'var(--ink)' }}
                    />
                </div>
                <label className="ai-row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={soloSinReq} onChange={(e) => setSoloSinReq(e.target.checked)} />
                    Sin requerimiento ({sinRequerimiento})
                </label>
            </div>

            {error && <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', margin: '0 16px 12px' }}>{error}</div>}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" /></div>
            ) : filas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <UserPlus size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)', margin: '0 auto 12px' }} />
                    <p style={{ font: '600 14px var(--font-sans)', color: 'var(--ink)' }}>No hay registros nuevos de Claro en ese rango</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="ai-table ai-table--dense">
                        <thead>
                            <tr>
                                <th>Registrado en RRHH</th>
                                <th>Documento</th>
                                <th>Nombre completo</th>
                                <th>Tipo</th>
                                <th>Campaña</th>
                                <th>Usuario SSFF</th>
                                <th>Ingreso</th>
                                <th>Red Maestra</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((r) => (
                                <tr key={r.id} onClick={() => onAbrir(r.id)} style={{ cursor: 'pointer' }} title="Ver y editar la Red Maestra de este agente">
                                    <td className="ai-num">{fmtRegistro(r.registrado_en)}</td>
                                    <td>
                                        <div className="ai-num">{r.cedula}</div>
                                        <div className="ai-person-sub">{documentoRM(r.tipo_documento)}</div>
                                    </td>
                                    <td>
                                        <div className="ai-person-name">{r.nombre}</div>
                                        {r.estado_contrato !== 'activo' && <div className="ai-person-sub">En el Gestor: {r.estado_contrato}</div>}
                                    </td>
                                    <td>{TIPOS_PERSONAL[r.tipo_personal]?.singular || '—'}</td>
                                    <td>
                                        <div>{r.campania || '—'}</div>
                                        {r.centro_costo && <div className="ai-person-sub">{r.centro_costo}</div>}
                                    </td>
                                    <td className="ai-num">{r.usuario_ssff || <span className="ai-muted">Sin registrar</span>}</td>
                                    <td className="ai-num">{formatearFecha(r.fecha_ingreso) || '—'}</td>
                                    <td>
                                        {r.total_requerimientos
                                            ? <span className="ai-badge ai-badge--success">{r.estado_rm || 'Con requerimiento'}</span>
                                            : <span className="ai-badge ai-badge--warning">Sin requerimiento</span>}
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

export default IngresosRedMaestra;
