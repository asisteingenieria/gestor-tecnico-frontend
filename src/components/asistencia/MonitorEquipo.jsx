import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, RefreshCw, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { escucharAsistencia } from '../../utils/socketAsistencia';
import { datosPausa } from '../../utils/pausasAsistencia';
import SelectorVistaEquipo from './SelectorVistaEquipo';

// Monitor del equipo del coordinador (jefe inmediato), al estilo del monitor de la planta telefónica:
// mosaicos con los totales y una tabla Hora Login · Nombre · Estado · Tiempo con la fila del color del
// estado. "Tiempo" es cuánto lleva en el estado actual; lo calcula el servidor (`segundos_en_estado`) y
// aquí solo sigue contando segundo a segundo desde la última carga.
const POLL_MS = 30000;

// Estado del monitor de cada persona: conectado, la pausa en que está, desconectado de AsisLock,
// finalizado, sin iniciar o ausente.
function estadoMonitor(emp) {
    if (emp.estado === 'en_curso') return { clave: 'conectado', label: 'Conectado', corre: true };
    if (emp.estado === 'en_pausa' && emp.pausa_activa) {
        const tipo = emp.pausa_activa.tipo;
        return { clave: tipo === 'capacitacion' ? 'capacitacion' : 'pausa', label: datosPausa(tipo).etiqueta, corre: true };
    }
    if (emp.estado === 'en_pausa') return { clave: 'desconectado', label: 'Desconectado', corre: true };
    if (emp.estado === 'finalizada') return { clave: 'finalizado', label: 'Finalizado', corre: false };
    if (emp.estado === 'ausente') return { clave: 'ausente', label: 'Ausente', corre: false };
    return { clave: 'sin_iniciar', label: 'Sin iniciar', corre: false };
}

// Mosaicos de arriba. `estados` = claves de estadoMonitor que cuenta cada uno; un clic filtra la tabla.
const MOSAICOS = [
    { id: 'en_turno', label: 'En turno', color: 'azul', estados: ['conectado', 'pausa', 'capacitacion', 'desconectado'] },
    { id: 'conectado', label: 'Conectados', color: 'verde', estados: ['conectado', 'capacitacion'] },
    { id: 'pausa', label: 'En pausa', color: 'amarillo', estados: ['pausa'] },
    { id: 'desconectado', label: 'Desconectados', color: 'naranja', estados: ['desconectado'] },
    { id: 'ausente', label: 'Ausentes', color: 'rojo', estados: ['ausente'] }
];

const ORDEN_ESTADO = { conectado: 0, capacitacion: 1, pausa: 2, desconectado: 3, sin_iniciar: 4, finalizado: 5, ausente: 6 };

// "08:01:46" en hora de Bogotá.
function hora24(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
}

function hhmmss(totalSegundos) {
    const s = Math.max(0, Math.floor(totalSegundos));
    const dos = (n) => String(n).padStart(2, '0');
    return `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
}

// El login de AsisLock si lo hay; si no, la entrada de la jornada (portal o molinete).
const horaLoginDe = (emp) => emp.asislock?.primer_login || emp.entrada_en || null;

const COLUMNAS = [
    { id: 'login', label: 'Hora Login', ancho: 120 },
    { id: 'nombre', label: 'Nombre' },
    { id: 'estado', label: 'Estado', ancho: 150 },
    { id: 'tiempo', label: 'Tiempo', ancho: 110 }
];

const MonitorEquipo = () => {
    const navigate = useNavigate();
    const [equipo, setEquipo] = useState([]);
    const [cargadoEn, setCargadoEn] = useState(null);
    const [ahora, setAhora] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [actualizando, setActualizando] = useState(false);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState({ col: 'nombre', asc: true });
    const pausadoRef = useRef(false);

    const cargar = useCallback(async (silencioso = false) => {
        if (silencioso) setActualizando(true);
        try {
            const { data } = await asistenciaService.getEquipo();
            setEquipo(data);
            setCargadoEn(Date.now());
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo cargar el equipo');
        } finally {
            setLoading(false);
            setActualizando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
        const onVisibility = () => { pausadoRef.current = document.visibilityState !== 'visible'; };
        document.addEventListener('visibilitychange', onVisibility);
        const id = setInterval(() => { if (!pausadoRef.current) cargar(true); }, POLL_MS);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
    }, [cargar]);

    // Cada cambio de jornada del equipo llega por socket y recarga (asistencia.md §43, §57).
    useEffect(() => escucharAsistencia('asistencia:equipo', () => { cargar(true); }), [cargar]);

    // Reloj de la columna Tiempo.
    useEffect(() => {
        const id = setInterval(() => setAhora(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const filas = useMemo(() => equipo.map((emp) => ({ emp, est: estadoMonitor(emp) })), [equipo]);

    const conteo = useMemo(() => {
        const c = {};
        for (const m of MOSAICOS) c[m.id] = filas.filter((f) => m.estados.includes(f.est.clave)).length;
        return c;
    }, [filas]);

    const transcurrido = cargadoEn ? (ahora - cargadoEn) / 1000 : 0;
    const segundosDe = useCallback(
        ({ emp, est }) => (est.corre && emp.segundos_en_estado != null ? emp.segundos_en_estado + transcurrido : null),
        [transcurrido]
    );

    const visibles = useMemo(() => {
        let lista = filas;
        const mosaico = MOSAICOS.find((m) => m.id === filtro);
        if (mosaico) lista = lista.filter((f) => mosaico.estados.includes(f.est.clave));
        const q = busqueda.trim().toLowerCase();
        if (q) lista = lista.filter(({ emp }) => (emp.nombre || '').toLowerCase().includes(q) || emp.cedula?.includes(q));
        const valor = {
            login: (f) => horaLoginDe(f.emp) || '9',
            nombre: (f) => (f.emp.nombre || '').toUpperCase(),
            estado: (f) => ORDEN_ESTADO[f.est.clave] ?? 9,
            tiempo: (f) => segundosDe(f) ?? -1
        }[orden.col];
        return [...lista].sort((a, b) => {
            const va = valor(a);
            const vb = valor(b);
            const cmp = typeof va === 'number' ? va - vb : va.localeCompare(vb);
            return (orden.asc ? cmp : -cmp) || (a.emp.nombre || '').localeCompare(b.emp.nombre || '');
        });
    }, [filas, filtro, busqueda, orden, segundosDe]);

    const ordenarPor = (col) => setOrden((o) => ({ col, asc: o.col === col ? !o.asc : true }));

    if (loading) {
        return (
            <div className="ai-content">
                <div className="ai-panel" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 size={24} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="ai-content">
            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Equipo</h1>
                    <p className="ai-page-sub">{equipo.length} persona{equipo.length === 1 ? '' : 's'} a tu cargo · en vivo</p>
                </div>
                <div className="ai-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <SelectorVistaEquipo />
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => cargar(true)}>
                        <RefreshCw size={14} strokeWidth={1.75} className={actualizando ? 'animate-spin' : ''} /> Actualizar
                    </button>
                </div>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

            <div className="ai-monitor-mosaicos">
                {MOSAICOS.map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        className={`ai-monitor-mosaico ai-monitor-mosaico--${m.color} ${filtro === m.id ? 'is-active' : ''}`}
                        onClick={() => setFiltro((f) => (f === m.id ? null : m.id))}
                        aria-pressed={filtro === m.id}
                        title={filtro === m.id ? 'Quitar el filtro' : `Ver solo: ${m.label.toLowerCase()}`}
                    >
                        <span className="ai-monitor-num">{conteo[m.id]}</span>
                        <span className="ai-monitor-lbl">{m.label}</span>
                    </button>
                ))}
            </div>

            <div className="ai-panel">
                <div className="ai-panel-body ai-row" style={{ gap: 12, flexWrap: 'wrap', paddingBottom: 12 }}>
                    <div className="ai-input" style={{ maxWidth: 320, flex: 1 }}>
                        <Search size={16} strokeWidth={1.75} className="ai-ic" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cédula"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ border: 0, outline: 'none', flex: 1, background: 'transparent', color: 'var(--ink)', font: 'inherit' }}
                        />
                    </div>
                    {filtro && (
                        <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" onClick={() => setFiltro(null)}>
                            Ver todos ({equipo.length})
                        </button>
                    )}
                </div>

                {visibles.length === 0 ? (
                    <div className="ai-empty">
                        <Users size={40} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)' }} />
                        <p>{equipo.length === 0 ? 'No tienes personas a cargo.' : 'Nadie coincide con este filtro.'}</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="ai-monitor-tabla">
                            <thead>
                                <tr>
                                    {COLUMNAS.map((c) => (
                                        <th key={c.id} style={{ width: c.ancho }} aria-sort={orden.col === c.id ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                                            <button type="button" onClick={() => ordenarPor(c.id)}>
                                                {c.label}
                                                {orden.col === c.id && (orden.asc
                                                    ? <ChevronUp size={13} strokeWidth={2} />
                                                    : <ChevronDown size={13} strokeWidth={2} />)}
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map((fila) => {
                                    const { emp, est } = fila;
                                    const segundos = segundosDe(fila);
                                    return (
                                        <tr
                                            key={emp.users_company_id}
                                            className={`ai-monitor-fila--${est.clave}`}
                                            onClick={() => navigate(`/asistencia/equipo/${emp.users_company_id}/trazabilidad`)}
                                            title={`${emp.nombre} · CC ${emp.cedula} — ver el detalle de hoy`}
                                        >
                                            <td className="ai-monitor-centro">{hora24(horaLoginDe(emp)) || '—'}</td>
                                            <td>{(emp.nombre || '').toUpperCase()}</td>
                                            <td className="ai-monitor-centro">{est.label}</td>
                                            <td className="ai-monitor-centro">{segundos != null ? hhmmss(segundos) : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonitorEquipo;
