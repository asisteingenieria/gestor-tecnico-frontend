import React, { useEffect, useMemo, useState } from 'react';
import { redMaestraService } from '../../services/api';
import { formatearFecha } from '../../utils/fecha';
import { descargarCsv } from '../../utils/csv';
import { UserCheck, Loader2, Search, Download } from 'lucide-react';
import { documentoRM, plano } from './redMaestraUtils';

/**
 * Fechas de retiro en la Red Maestra que pusieron los jefes (p. ej. Kevin Buitrago) desde su portal de
 * asistencia (Equipo → Retiros): qué empleado, qué fecha y quién la puso y cuándo. Solo consulta; para
 * corregir una fecha se usa la pestaña Retiros. Backend: RedMaestra.retiros (registrado_por_jefe),
 * asistencia.md §65.
 */

// Cuándo la registró el jefe, en hora de Bogotá (la BD guarda en UTC).
function fechaHoraBogota(valor) {
    if (!valor) return null;
    const texto = typeof valor === 'string' && !/[zZ]|[+-]\d\d:?\d\d$/.test(valor) ? `${valor.replace(' ', 'T')}Z` : valor;
    return new Date(texto).toLocaleString('es-CO', {
        timeZone: 'America/Bogota', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
}

const FechasJefesRedMaestra = ({ onAbrir, version }) => {
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [jefe, setJefe] = useState('');

    useEffect(() => {
        let vigente = true;
        setLoading(true);
        redMaestraService.retiros()
            .then(({ data }) => {
                if (!vigente) return;
                setDatos((data.data || []).filter((r) => r.registrado_por_jefe));
                setError('');
            })
            .catch((err) => vigente && setError(err.response?.data?.message || 'No se pudieron cargar las fechas de los jefes'))
            .finally(() => vigente && setLoading(false));
        return () => { vigente = false; };
    }, [version]);

    // Jefes que han registrado fechas, con cuántas cada uno.
    const jefes = useMemo(() => {
        const conteo = new Map();
        for (const r of datos) conteo.set(r.retiro_rm_registrado_por, (conteo.get(r.retiro_rm_registrado_por) || 0) + 1);
        return [...conteo.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)));
    }, [datos]);

    // Lo más reciente primero.
    const filas = useMemo(() => {
        const q = plano(busqueda.trim());
        return datos
            .filter((r) => (!jefe || r.retiro_rm_registrado_por === jefe)
                && (!q || [r.nombre, r.cedula, r.campania, r.retiro_rm_registrado_por].some((v) => plano(v).includes(q))))
            .sort((a, b) => String(b.retiro_rm_registrado_en || '').localeCompare(String(a.retiro_rm_registrado_en || '')));
    }, [datos, busqueda, jefe]);

    const exportar = () => descargarCsv(
        'fechas_retiro_rm_jefes.csv',
        ['Documento', 'Nombre', 'Campaña', 'Cargo', 'Retiro RRHH', 'Fecha retiro Red Maestra', 'Registrada por', 'Registrada el'],
        filas.map((r) => [
            r.cedula, r.nombre, r.campania || '', r.cargo || '', r.fecha_retiro || '', r.fecha_retiro_rm || '',
            r.retiro_rm_registrado_por || '', fechaHoraBogota(r.retiro_rm_registrado_en) || ''
        ])
    );

    return (
        <div className="ai-card">
            <div className="ai-toolbar" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="ai-search" style={{ flex: 1, minWidth: 220 }}>
                    <Search size={16} strokeWidth={1.75} />
                    <input
                        type="text"
                        placeholder="Buscar por empleado, cédula, campaña o jefe…"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, font: 'inherit', color: 'var(--ink)' }}
                    />
                </div>
                <select className="ai-input" style={{ maxWidth: 300 }} value={jefe} onChange={(e) => setJefe(e.target.value)} aria-label="Jefe que registró">
                    <option value="">Todos los jefes ({datos.length})</option>
                    {jefes.map(([nombre, total]) => <option key={nombre} value={nombre}>{nombre} ({total})</option>)}
                </select>
                <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportar} disabled={filas.length === 0}>
                    <Download size={14} strokeWidth={1.75} /> Exportar
                </button>
            </div>

            {error && <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', margin: '0 16px 12px' }}>{error}</div>}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" /></div>
            ) : filas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <UserCheck size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)', margin: '0 auto 12px' }} />
                    <p style={{ font: '600 14px var(--font-sans)', color: 'var(--ink)' }}>
                        {datos.length === 0 ? 'Ningún jefe ha registrado todavía una fecha de retiro en la Red Maestra' : 'Nadie coincide con este filtro'}
                    </p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="ai-table ai-table--dense">
                        <thead>
                            <tr>
                                <th>Documento</th>
                                <th>Empleado</th>
                                <th>Campaña</th>
                                <th>Retiro RRHH</th>
                                <th>Fecha retiro Red Maestra</th>
                                <th>Registrada por</th>
                                <th>Registrada el</th>
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
                                    <td>
                                        <div className="ai-num">{formatearFecha(r.fecha_retiro)}</div>
                                        {r.tipo_retiro && <div className="ai-person-sub">{r.tipo_retiro}</div>}
                                    </td>
                                    <td><span className="ai-num" style={{ fontWeight: 600 }}>{formatearFecha(r.fecha_retiro_rm)}</span></td>
                                    <td>{r.retiro_rm_registrado_por}</td>
                                    <td className="ai-num" style={{ whiteSpace: 'nowrap' }}>{fechaHoraBogota(r.retiro_rm_registrado_en) || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FechasJefesRedMaestra;
