import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Users, Search, History } from 'lucide-react';
import { financieraService } from '../../services/api';
import { nombrePropio, iniciales, primeraMayuscula } from '../../utils/formatoRRHH';

// Financiera ve la trazabilidad de asistencia de todos los empleados, agrupados por campaña
// (asistencia.md §32). Desde aquí se abre la trazabilidad diaria de cada uno.
const TrazabilidadPorCampania = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const campaniaId = searchParams.get('campania') || '';
    const [campanias, setCampanias] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        financieraService.getCampanias()
            .then(({ data }) => setCampanias(data))
            .catch((err) => setError(err.response?.data?.message || 'No se pudieron cargar las campañas'));
    }, []);

    useEffect(() => {
        if (!campaniaId) { setEmpleados([]); return; }
        setLoading(true);
        setError(null);
        financieraService.getEmpleados(campaniaId)
            .then(({ data }) => setEmpleados(data))
            .catch((err) => { setEmpleados([]); setError(err.response?.data?.message || 'No se pudieron cargar los empleados'); })
            .finally(() => setLoading(false));
    }, [campaniaId]);

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return empleados;
        return empleados.filter((e) => (e.nombre || '').toLowerCase().includes(q) || String(e.cedula || '').includes(q));
    }, [empleados, busqueda]);

    const campaniaActual = campanias.find((c) => String(c.idcampania) === campaniaId);

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Trazabilidad por campaña</h1>
                    <p className="ai-page-sub">Asistencia diaria de cualquier empleado activo</p>
                </div>
                <div className="ai-row">
                    <select
                        className="ai-input" style={{ width: 280 }} value={campaniaId}
                        onChange={(e) => setSearchParams(e.target.value ? { campania: e.target.value } : {})}
                        aria-label="Campaña"
                    >
                        <option value="">Elige una campaña…</option>
                        {campanias.map((c) => (
                            <option key={c.idcampania} value={c.idcampania}>{primeraMayuscula(c.nombre)} ({c.empleados})</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>}

            <div className="ai-panel">
                {!campaniaId ? (
                    <div className="ai-empty">
                        <Users size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                        <p>Elige una campaña para ver a sus empleados.</p>
                    </div>
                ) : loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                        <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                    </div>
                ) : (
                    <>
                        <div className="ai-panel-head">
                            <h3 className="ai-panel-title">{primeraMayuscula(campaniaActual?.nombre || 'Campaña')} · {empleados.length} empleado{empleados.length === 1 ? '' : 's'}</h3>
                            <div className="ai-input" style={{ maxWidth: 300 }}>
                                <Search size={16} strokeWidth={1.75} className="ai-ic" />
                                <input
                                    type="text" placeholder="Buscar por nombre o cédula" value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    style={{ border: 0, outline: 'none', flex: 1, background: 'transparent', color: 'var(--ink)', font: 'inherit' }}
                                />
                            </div>
                        </div>
                        {visibles.length === 0 ? (
                            <div className="ai-empty"><p>Nadie coincide con la búsqueda.</p></div>
                        ) : (
                            <table className="ai-table ai-table--dense">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Cargo</th>
                                        <th>Jefe de área</th>
                                        <th>Trazabilidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibles.map((e) => (
                                        <tr key={e.users_company_id}>
                                            <td>
                                                <span className="ai-row" style={{ gap: 10 }}>
                                                    <span className="ai-avatar">{iniciales(e.nombre)}</span>
                                                    <span>
                                                        <div style={{ fontWeight: 600 }}>{nombrePropio(e.nombre)}</div>
                                                        <div className="ai-muted" style={{ fontSize: 12 }}>CC {e.cedula}</div>
                                                    </span>
                                                </span>
                                            </td>
                                            <td>{primeraMayuscula(e.cargo || '') || <span className="ai-muted">—</span>}</td>
                                            <td>{e.jefe_area ? nombrePropio(e.jefe_area) : <span className="ai-muted">—</span>}</td>
                                            <td>
                                                <Link
                                                    to={`/recursos-humanos/trazabilidad/${e.users_company_id}`}
                                                    className="ai-icon-btn" title="Ver trazabilidad" aria-label={`Ver trazabilidad de ${e.nombre}`}
                                                >
                                                    <History size={16} strokeWidth={1.75} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default TrazabilidadPorCampania;
