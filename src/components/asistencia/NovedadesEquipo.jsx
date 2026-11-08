import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Download, Search, ClipboardList } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import SelectorVistaEquipo from './SelectorVistaEquipo';

// Historial de novedades de RRHH del equipo (asistencia.md §56): incapacidades, vacaciones, licencias y
// suspensiones de la gente que cuelga del jefe —coordinador, jefe de área o director—, incluidos los ya
// retirados. Solo lectura y sin diagnóstico ni documentos: eso queda en RRHH.
// El jefe de equipo la abre como tercera vista de "Equipo" (`vistaEquipo`); el coordinador, desde su menú.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// 'YYYY-MM-DD' → '3 nov 2026', sin pasar por Date para no correr el día por la zona horaria.
const fechaCorta = (f) => {
    if (!f) return '—';
    const [a, m, d] = f.split('-');
    return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`;
};

const ESTADOS = {
    en_curso: { label: 'En curso', clase: 'ai-badge--warning' },
    proxima: { label: 'Próxima', clase: 'ai-badge--info' },
    finalizada: { label: 'Finalizada', clase: 'ai-badge--neutral' }
};

const SOPORTES = {
    completos: { label: 'Completos', clase: 'ai-badge--success' },
    incompletos: { label: 'Incompletos', clase: 'ai-badge--warning' },
    pendientes: { label: 'Pendientes', clase: 'ai-badge--danger' },
    no_requiere: { label: 'No requiere', clase: 'ai-badge--neutral' }
};

const sinTildes = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const NovedadesEquipo = ({ vistaEquipo = false }) => {
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [novedades, setNovedades] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [tipo, setTipo] = useState('');
    const [estado, setEstado] = useState('');
    const [verRetirados, setVerRetirados] = useState(true);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (desde) params.desde = desde;
            if (hasta) params.hasta = hasta;
            const { data } = await asistenciaService.getNovedadesEquipo(params);
            setNovedades(data);
        } catch (err) {
            setNovedades(null);
            setError(err.response?.data?.message || 'No se pudieron cargar las novedades del equipo');
        } finally {
            setLoading(false);
        }
    }, [desde, hasta]);

    useEffect(() => { cargar(); }, [cargar]);

    const tipos = useMemo(() => {
        const mapa = new Map();
        (novedades ?? []).forEach((n) => mapa.set(n.tipo_novedad_id, n.tipo_novedad));
        return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [novedades]);

    const filtradas = useMemo(() => {
        const q = sinTildes(busqueda.trim());
        return (novedades ?? []).filter((n) =>
            (!tipo || String(n.tipo_novedad_id) === tipo)
            && (!estado || n.estado === estado)
            && (verRetirados || n.contrato_vigente)
            && (!q || sinTildes(n.empleado).includes(q) || String(n.cedula).includes(q))
        );
    }, [novedades, busqueda, tipo, estado, verRetirados]);

    const resumen = useMemo(() => ({
        total: filtradas.length,
        enCurso: filtradas.filter((n) => n.estado === 'en_curso').length,
        personas: new Set(filtradas.map((n) => n.empleado_id)).size,
        dias: filtradas.reduce((s, n) => s + (Number(n.total_dias) || 0), 0)
    }), [filtradas]);

    const exportar = () => {
        descargarCsv(
            'novedades_equipo.csv',
            ['Cédula', 'Empleado', 'Estado contrato', 'Cargo', 'Campaña', 'Centro de costo', 'Jefe inmediato',
                'Novedad', 'Origen', 'Desde', 'Hasta', 'Retorno', 'Días', 'Estado', 'Soportes', 'Observaciones'],
            filtradas.map((n) => [
                n.cedula, nombrePropio(n.empleado), n.contrato_vigente ? 'Activo' : 'Retirado', n.cargo || '',
                n.campania || '', n.centro_costo || '', nombrePropio(n.jefe_inmediato || ''), n.tipo_novedad,
                n.origen || '', n.fecha_inicial, n.fecha_final || '', n.fecha_retorno || '', n.total_dias ?? '',
                ESTADOS[n.estado]?.label || n.estado, SOPORTES[n.soportes]?.label || n.soportes, n.observaciones || ''
            ])
        );
    };

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Novedades del equipo</h1>
                    <p className="ai-page-sub">Incapacidades, vacaciones, licencias y suspensiones que registró RRHH para tu gente</p>
                </div>
                <div className="ai-row" style={{ flexWrap: 'wrap' }}>
                    {vistaEquipo && <SelectorVistaEquipo />}
                    <input type="date" className="ai-input" style={{ width: 160 }} value={desde} max={hasta || undefined}
                        onChange={(e) => setDesde(e.target.value)} aria-label="Desde" title="Desde" />
                    <input type="date" className="ai-input" style={{ width: 160 }} value={hasta} min={desde || undefined}
                        onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" title="Hasta" />
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={exportar} disabled={filtradas.length === 0}>
                        <Download size={14} strokeWidth={1.75} /> Exportar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            ) : !novedades ? (
                <div className="ai-panel ai-empty"><p style={{ color: 'var(--danger)' }}>{error}</p></div>
            ) : (
                <div className="ai-panel">
                    <div className="ai-panel-head" style={{ flexWrap: 'wrap', gap: 8 }}>
                        <h3 className="ai-panel-title">
                            {resumen.total} novedad{resumen.total === 1 ? '' : 'es'} · {resumen.personas} persona{resumen.personas === 1 ? '' : 's'}
                            {' · '}{resumen.dias} día{resumen.dias === 1 ? '' : 's'}
                            {resumen.enCurso > 0 && <span className="ai-badge ai-badge--warning" style={{ marginLeft: 8 }}>{resumen.enCurso} en curso hoy</span>}
                        </h3>
                        <div className="ai-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-subtle)' }} />
                                <input className="ai-input" style={{ paddingLeft: 30, width: 220 }} placeholder="Nombre o cédula"
                                    value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar" />
                            </div>
                            <select className="ai-input" style={{ width: 220 }} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de novedad">
                                <option value="">Todos los tipos</option>
                                {tipos.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                            </select>
                            <select className="ai-input" style={{ width: 175 }} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
                                <option value="">Todos los estados</option>
                                {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <label className="ai-row" style={{ gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                <input type="checkbox" checked={verRetirados} onChange={(e) => setVerRetirados(e.target.checked)} />
                                Incluir retirados
                            </label>
                        </div>
                    </div>

                    {filtradas.length === 0 ? (
                        <div className="ai-empty">
                            <ClipboardList size={36} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                            <p>{novedades.length === 0 ? 'Tu equipo no tiene novedades registradas en este periodo.' : 'Ninguna novedad coincide con los filtros.'}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ai-table ai-table--dense">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Campaña · C. costo · Cargo</th>
                                        <th>Novedad</th>
                                        <th>Fechas</th>
                                        <th className="ai-num">Días</th>
                                        <th>Estado</th>
                                        <th title="Soportes que RRHH tiene de la novedad">Soportes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtradas.map((n) => (
                                        <tr key={n.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>
                                                    {nombrePropio(n.empleado)}
                                                    {!n.contrato_vigente && <span className="ai-badge ai-badge--neutral" style={{ marginLeft: 6 }}>Retirado</span>}
                                                </div>
                                                <div className="ai-muted" style={{ fontSize: 12 }}>
                                                    CC {n.cedula}{n.jefe_inmediato ? ` · Coord. ${nombrePropio(n.jefe_inmediato)}` : ''}
                                                </div>
                                            </td>
                                            <td className="ai-muted" style={{ fontSize: 12 }}>
                                                {[n.campania, n.centro_costo, n.cargo].filter(Boolean).map(primeraMayuscula).join(' · ') || '—'}
                                            </td>
                                            <td style={{ maxWidth: 260 }}>
                                                <div>{n.tipo_novedad}</div>
                                                {(n.origen || n.observaciones) && (
                                                    <div className="ai-muted" style={{ fontSize: 12 }}>
                                                        {[n.origen && primeraMayuscula(n.origen), n.observaciones].filter(Boolean).join(' · ')}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                                                {fechaCorta(n.fecha_inicial)}
                                                {n.fecha_final && n.fecha_final !== n.fecha_inicial && <> → {fechaCorta(n.fecha_final)}</>}
                                                {n.fecha_retorno && <div className="ai-muted" style={{ fontSize: 12 }}>Retorna {fechaCorta(n.fecha_retorno)}</div>}
                                            </td>
                                            <td className="ai-num">{n.total_dias ?? '—'}</td>
                                            <td><span className={`ai-badge ${ESTADOS[n.estado]?.clase || ''}`}>{ESTADOS[n.estado]?.label || n.estado}</span></td>
                                            <td><span className={`ai-badge ${SOPORTES[n.soportes]?.clase || ''}`}>{SOPORTES[n.soportes]?.label || n.soportes}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NovedadesEquipo;
