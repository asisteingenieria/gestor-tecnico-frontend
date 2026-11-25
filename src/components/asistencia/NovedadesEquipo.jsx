import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, ClipboardList, CalendarClock, CalendarCheck, CalendarDays, Users, Hourglass } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { descargarCsv } from '../../utils/csv';
import SelectorVistaEquipo from './SelectorVistaEquipo';
import {
    EncabezadoVista, Mosaicos, Mosaico, BarraFiltros, CampoBusqueda, Pastilla, CargandoVista, VistaVacia,
    TONO, colorTipoNovedad
} from '../ui';

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
    en_curso: { label: 'En curso', color: TONO.alerta },
    proxima: { label: 'Próxima', color: TONO.info },
    finalizada: { label: 'Finalizada', color: TONO.neutro }
};

const SOPORTES = {
    completos: { label: 'Completos', color: TONO.exito },
    incompletos: { label: 'Incompletos', color: TONO.alerta },
    pendientes: { label: 'Pendientes', color: TONO.peligro },
    no_requiere: { label: 'No requiere', color: TONO.neutro }
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
        proximas: filtradas.filter((n) => n.estado === 'proxima').length,
        finalizadas: filtradas.filter((n) => n.estado === 'finalizada').length,
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

    const filtrarEstado = (e) => setEstado((actual) => (actual === e ? '' : e));

    return (
        <div className="ai-content">
            <EncabezadoVista
                icono={ClipboardList}
                titulo="Novedades del equipo"
                subtitulo="Incapacidades, vacaciones, licencias y suspensiones que registró RRHH para tu gente"
            >
                {vistaEquipo && <SelectorVistaEquipo />}
                <input type="date" className="ai-monitor-btn ai-monitor-mes" value={desde} max={hasta || undefined}
                    onChange={(e) => setDesde(e.target.value)} aria-label="Desde" title="Desde" />
                <input type="date" className="ai-monitor-btn ai-monitor-mes" value={hasta} min={desde || undefined}
                    onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" title="Hasta" />
                <button type="button" className="ai-monitor-btn" onClick={exportar} disabled={filtradas.length === 0}>
                    <Download size={15} strokeWidth={2} /> Exportar
                </button>
            </EncabezadoVista>

            {loading ? (
                <CargandoVista />
            ) : !novedades ? (
                <VistaVacia error>{error}</VistaVacia>
            ) : (
                <>
                    <Mosaicos>
                        <Mosaico color={TONO.info} icono={ClipboardList} valor={resumen.total} label="Novedades" />
                        <Mosaico color={TONO.alerta} icono={Hourglass} valor={resumen.enCurso} label="En curso hoy"
                            activo={estado === 'en_curso'} onClick={() => filtrarEstado('en_curso')} />
                        <Mosaico color={TONO.acento} icono={CalendarClock} valor={resumen.proximas} label="Próximas"
                            activo={estado === 'proxima'} onClick={() => filtrarEstado('proxima')} />
                        <Mosaico color={TONO.neutro} icono={CalendarCheck} valor={resumen.finalizadas} label="Finalizadas"
                            activo={estado === 'finalizada'} onClick={() => filtrarEstado('finalizada')} />
                        <Mosaico color={TONO.suave} icono={Users} valor={resumen.personas} label="Personas" />
                        <Mosaico color={TONO.cian} icono={CalendarDays} valor={resumen.dias} label="Días" />
                    </Mosaicos>

                    <BarraFiltros>
                        <CampoBusqueda value={busqueda} onChange={setBusqueda} />
                        <select className="ai-input ai-monitor-select" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de novedad">
                            <option value="">Todos los tipos</option>
                            {tipos.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                        </select>
                        <select className="ai-input ai-monitor-select" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
                            <option value="">Todos los estados</option>
                            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <label className="ai-row" style={{ gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--mon-ink)' }}>
                            <input type="checkbox" checked={verRetirados} onChange={(e) => setVerRetirados(e.target.checked)} />
                            Incluir retirados
                        </label>
                    </BarraFiltros>

                    {filtradas.length === 0 ? (
                        <VistaVacia icono={ClipboardList}>
                            {novedades.length === 0 ? 'Tu equipo no tiene novedades registradas en este periodo.' : 'Ninguna novedad coincide con los filtros.'}
                        </VistaVacia>
                    ) : (
                        <div className="ai-monitor-tabla-wrap">
                            <table className="ai-monitor-tabla ai-monitor-tabla--simple">
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
                                                <div style={{ fontWeight: 700 }}>
                                                    {nombrePropio(n.empleado)}
                                                    {!n.contrato_vigente && <> <Pastilla color={TONO.peligro}>Retirado</Pastilla></>}
                                                </div>
                                                <span className="ai-monitor-sub">
                                                    CC {n.cedula}{n.jefe_inmediato ? ` · Coord. ${nombrePropio(n.jefe_inmediato)}` : ''}
                                                </span>
                                            </td>
                                            <td className="ai-muted" style={{ fontSize: 12 }}>
                                                {[n.campania, n.centro_costo, n.cargo].filter(Boolean).map(primeraMayuscula).join(' · ') || '—'}
                                            </td>
                                            <td style={{ maxWidth: 280 }}>
                                                <Pastilla color={colorTipoNovedad(n.tipo_novedad)} punto>{n.tipo_novedad}</Pastilla>
                                                {(n.origen || n.observaciones) && (
                                                    <span className="ai-monitor-sub">
                                                        {[n.origen && primeraMayuscula(n.origen), n.observaciones].filter(Boolean).join(' · ')}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                                                {fechaCorta(n.fecha_inicial)}
                                                {n.fecha_final && n.fecha_final !== n.fecha_inicial && <> → {fechaCorta(n.fecha_final)}</>}
                                                {n.fecha_retorno && <span className="ai-monitor-sub">Retorna {fechaCorta(n.fecha_retorno)}</span>}
                                            </td>
                                            <td className="ai-num" style={{ fontWeight: 700 }}>{n.total_dias ?? '—'}</td>
                                            <td><Pastilla color={ESTADOS[n.estado]?.color || TONO.neutro} punto>{ESTADOS[n.estado]?.label || n.estado}</Pastilla></td>
                                            <td><Pastilla color={SOPORTES[n.soportes]?.color || TONO.neutro}>{SOPORTES[n.soportes]?.label || n.soportes}</Pastilla></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default NovedadesEquipo;
