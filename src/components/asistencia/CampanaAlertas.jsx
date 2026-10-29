import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { asistenciaService } from '../../services/api';
import { escucharAsistencia } from '../../utils/socketAsistencia';
import { Bell, BellRing, CalendarClock, CheckCheck } from 'lucide-react';

// Las alertas de traspasos traen una fecha (DATE); las notificaciones, un instante.
const fmtDia = (v) => (v ? new Date(v).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '');
const fmtInstante = (v) => (v
    ? new Date(v).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '');

// Campana del portal. Junta dos fuentes, todas dirigidas a mi ficha (o a mi usuario, financiera):
// - alertas de traspasos (migración 070): evaluación del encargo al director de área y retorno del
//   trabajo en casa al jefe inmediato;
// - notificaciones de asistencia (084): solicitudes de cambio de turno y su respuesta (asistencia.md §50).
// Recarga al cambiar de pantalla y en vivo con el aviso `asistencia:notificacion` del socket. Abrir
// una la marca como leída; la de un cambio de turno lleva a la pantalla de cambios de turno.
const CampanaAlertas = ({ rutaCambiosTurno }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [abierta, setAbierta] = useState(false);
    const ref = useRef(null);

    const cargar = useCallback(() => {
        Promise.allSettled([asistenciaService.getMisAlertas(), asistenciaService.getMisNotificaciones()])
            .then(([alertas, notificaciones]) => {
                const deAlertas = alertas.status === 'fulfilled' && Array.isArray(alertas.value.data)
                    ? alertas.value.data.map((a) => ({
                        key: `t${a.idalerta_traspaso}`, origen: 'traspaso', id: a.idalerta_traspaso, mensaje: a.mensaje,
                        cuando: fmtDia(a.fecha_alerta), orden: a.fecha_alerta, leida_en: a.leida_en
                    }))
                    : [];
                const deNotificaciones = notificaciones.status === 'fulfilled' && Array.isArray(notificaciones.value.data)
                    ? notificaciones.value.data.map((n) => ({
                        key: `n${n.idnotificacion_asistencia}`, origen: 'asistencia', id: n.idnotificacion_asistencia, mensaje: n.mensaje,
                        cuando: fmtInstante(n.creada_en), orden: n.creada_en, leida_en: n.leida_en, cambioTurno: Boolean(n.solicitud_cambio_turno_id)
                    }))
                    : [];
                const todas = [...deAlertas, ...deNotificaciones]
                    .sort((a, b) => (Boolean(a.leida_en) - Boolean(b.leida_en)) || String(b.orden).localeCompare(String(a.orden)));
                setItems(todas);
            });
    }, []);

    useEffect(() => { cargar(); }, [cargar, location.pathname]);
    useEffect(() => escucharAsistencia('asistencia:notificacion', cargar), [cargar]);

    useEffect(() => {
        const cerrarFuera = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setAbierta(false);
        };
        document.addEventListener('mousedown', cerrarFuera);
        return () => document.removeEventListener('mousedown', cerrarFuera);
    }, []);

    const sinLeer = items.filter((i) => !i.leida_en).length;

    const marcarLeidaLocal = (key) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, leida_en: new Date().toISOString() } : i)));

    const abrir = (item) => {
        if (!item.leida_en) {
            const peticion = item.origen === 'traspaso'
                ? asistenciaService.marcarAlertaLeida(item.id)
                : asistenciaService.marcarNotificacionLeida(item.id);
            peticion.then(() => marcarLeidaLocal(item.key)).catch(() => {});
        }
        if (item.cambioTurno && rutaCambiosTurno) {
            setAbierta(false);
            navigate(rutaCambiosTurno);
        }
    };

    const marcarTodas = () => {
        const alertasSinLeer = items.filter((i) => !i.leida_en && i.origen === 'traspaso');
        Promise.allSettled([
            asistenciaService.marcarTodasNotificacionesLeidas(),
            ...alertasSinLeer.map((a) => asistenciaService.marcarAlertaLeida(a.id))
        ]).then(cargar);
    };

    return (
        <div style={{ position: 'relative' }} ref={ref}>
            <button
                type="button"
                className={`ai-icon-btn ai-bell${sinLeer > 0 ? ' ai-bell--con-alertas' : ''}`}
                aria-label={sinLeer > 0 ? `Notificaciones: ${sinLeer} sin leer` : 'Notificaciones'}
                aria-haspopup="menu"
                aria-expanded={abierta}
                onClick={() => setAbierta((o) => !o)}
            >
                <Bell size={18} strokeWidth={1.75} />
            </button>
            {abierta && (
                <div
                    role="menu"
                    style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360, maxHeight: 440, overflowY: 'auto', zIndex: 50,
                        background: 'var(--surface-100)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)', padding: 8, color: 'var(--ink)'
                    }}
                >
                    <div className="ai-row" style={{ justifyContent: 'space-between', margin: '4px 8px 8px' }}>
                        <p className="ai-overline" style={{ margin: 0 }}>Notificaciones</p>
                        {sinLeer > 0 && (
                            <button type="button" className="ai-btn ai-btn--sm ai-btn--secondary" onClick={marcarTodas}>
                                <CheckCheck size={14} strokeWidth={1.75} /> Marcar todas
                            </button>
                        )}
                    </div>
                    {items.length === 0 ? (
                        <p className="ai-muted" style={{ fontSize: 13, margin: '4px 8px 8px' }}>No tienes notificaciones.</p>
                    ) : items.map((i) => {
                        const Icono = i.cambioTurno ? CalendarClock : BellRing;
                        const clicable = !i.leida_en || (i.cambioTurno && rutaCambiosTurno);
                        return (
                            <button
                                key={i.key}
                                type="button"
                                onClick={() => abrir(i)}
                                style={{
                                    display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '8px', border: 0, cursor: clicable ? 'pointer' : 'default',
                                    borderRadius: 'var(--radius-md)', background: i.leida_en ? 'transparent' : 'var(--primary-soft)', color: 'inherit', font: 'inherit', marginBottom: 4
                                }}
                                title={i.cambioTurno && rutaCambiosTurno ? 'Ver cambios de turno' : (i.leida_en ? '' : 'Marcar como leída')}
                            >
                                <Icono size={16} style={{ flex: 'none', marginTop: 2, color: i.leida_en ? 'var(--ink-subtle)' : 'var(--primary)' }} />
                                <span style={{ fontSize: 13 }}>
                                    {i.mensaje}
                                    <span className="ai-muted" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                                        {i.cuando}{i.leida_en ? ' · leída' : ''}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CampanaAlertas;
