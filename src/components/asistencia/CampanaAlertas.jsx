import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { asistenciaService } from '../../services/api';
import { Bell, BellRing } from 'lucide-react';

const fmtFecha = (v) => (v ? new Date(v).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '');

// Campana del portal: alertas de traspasos dirigidas a mi ficha (migración 070) — al director
// de área, la evaluación de desempeño de un encargo; al jefe inmediato, el retorno de alguien
// del trabajo en casa. Se recargan al cambiar de pantalla; abrir una la marca como leída.
const CampanaAlertas = () => {
    const location = useLocation();
    const [alertas, setAlertas] = useState([]);
    const [abierta, setAbierta] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        asistenciaService.getMisAlertas()
            .then(({ data }) => setAlertas(Array.isArray(data) ? data : []))
            .catch(() => setAlertas([]));
    }, [location.pathname]);

    useEffect(() => {
        const cerrarFuera = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setAbierta(false);
        };
        document.addEventListener('mousedown', cerrarFuera);
        return () => document.removeEventListener('mousedown', cerrarFuera);
    }, []);

    const sinLeer = alertas.filter(a => !a.leida_en).length;

    const marcarLeida = (alerta) => {
        if (alerta.leida_en) return;
        asistenciaService.marcarAlertaLeida(alerta.idalerta_traspaso)
            .then(() => setAlertas(prev => prev.map(a => (a.idalerta_traspaso === alerta.idalerta_traspaso ? { ...a, leida_en: new Date().toISOString() } : a))))
            .catch(() => {});
    };

    return (
        <div style={{ position: 'relative' }} ref={ref}>
            <button
                type="button"
                className={`ai-icon-btn ai-bell${sinLeer > 0 ? ' ai-bell--con-alertas' : ''}`}
                aria-label={sinLeer > 0 ? `Notificaciones: ${sinLeer} sin leer` : 'Notificaciones'}
                aria-haspopup="menu"
                aria-expanded={abierta}
                onClick={() => setAbierta(o => !o)}
            >
                <Bell size={18} strokeWidth={1.75} />
            </button>
            {abierta && (
                <div
                    role="menu"
                    style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, maxHeight: 420, overflowY: 'auto', zIndex: 50,
                        background: 'var(--surface-100)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)', padding: 8, color: 'var(--ink)'
                    }}
                >
                    <p className="ai-overline" style={{ margin: '4px 8px 8px' }}>Notificaciones</p>
                    {alertas.length === 0 ? (
                        <p className="ai-muted" style={{ fontSize: 13, margin: '4px 8px 8px' }}>No tienes notificaciones.</p>
                    ) : alertas.map(a => (
                        <button
                            key={a.idalerta_traspaso}
                            type="button"
                            onClick={() => marcarLeida(a)}
                            style={{
                                display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '8px', border: 0, cursor: a.leida_en ? 'default' : 'pointer',
                                borderRadius: 'var(--radius-md)', background: a.leida_en ? 'transparent' : 'var(--primary-soft)', color: 'inherit', font: 'inherit', marginBottom: 4
                            }}
                            title={a.leida_en ? '' : 'Marcar como leída'}
                        >
                            <BellRing size={16} style={{ flex: 'none', marginTop: 2, color: a.leida_en ? 'var(--ink-subtle)' : 'var(--primary)' }} />
                            <span style={{ fontSize: 13 }}>
                                {a.mensaje}
                                <span className="ai-muted" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                                    {fmtFecha(a.fecha_alerta)}{a.leida_en ? ' · leída' : ''}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CampanaAlertas;
