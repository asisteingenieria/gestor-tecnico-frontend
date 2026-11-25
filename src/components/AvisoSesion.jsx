import React, { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { AVISO_ANTES_MS, irAlLoginPorVencimiento, vencimientoSesion } from '../utils/sesion';

// Aviso de vencimiento de la sesión (asistencia.md §81). Revisa cada segundo, así que también reacciona al
// volver de una suspensión del PC o de una pestaña en segundo plano: si ya venció, saca al login en el acto.
// Faltando 10 minutos muestra el aviso con la cuenta regresiva; se puede cerrar, pero al vencer igual sale.
// Vive aparte del AuthContext para que su contador no vuelva a pintar toda la aplicación cada segundo.

const mmss = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const horaLocal = (ms) => new Date(ms).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

const AvisoSesion = ({ activo }) => {
    const [restante, setRestante] = useState(null);
    const [vence, setVence] = useState(null);
    const [cerrado, setCerrado] = useState(false);

    useEffect(() => {
        if (!activo) return undefined;
        setCerrado(false);
        const revisar = () => {
            const v = vencimientoSesion();
            if (!v) return;
            const r = v - Date.now();
            if (r <= 0) { irAlLoginPorVencimiento(); return; }
            setVence(v);
            setRestante(r);
        };
        revisar();
        const intervalo = setInterval(revisar, 1000);
        // Al volver a la pestaña o despertar el PC, sin esperar al siguiente segundo.
        const alVolver = () => { if (document.visibilityState === 'visible') revisar(); };
        document.addEventListener('visibilitychange', alVolver);
        window.addEventListener('focus', revisar);
        // Si en otra pestaña se cerró la sesión (o se abrió otra), esta se pone al día.
        const alCambiarOtraPestana = (e) => {
            if (e.key === 'token' && !e.newValue) {
                // Cerró sesión en otra pestaña o le venció allá: si no venció, al login sin el aviso de vencida.
                const v = Number(e.storageArea?.getItem('token_vence')) || 0;
                if (v && v <= Date.now()) irAlLoginPorVencimiento();
                else if (window.location.pathname !== '/login') window.location.replace('/login');
            }
            if (e.key === 'token_vence') { setCerrado(false); revisar(); }
        };
        window.addEventListener('storage', alCambiarOtraPestana);
        return () => {
            clearInterval(intervalo);
            document.removeEventListener('visibilitychange', alVolver);
            window.removeEventListener('focus', revisar);
            window.removeEventListener('storage', alCambiarOtraPestana);
        };
    }, [activo]);

    if (!activo || cerrado || restante == null || restante > AVISO_ANTES_MS) return null;

    return (
        <div
            role="alert"
            style={{
                position: 'fixed', right: 20, bottom: 20, zIndex: 1000, maxWidth: 380,
                display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px',
                borderRadius: 12, background: '#0f2b5b', color: '#fff',
                boxShadow: '0 10px 30px rgba(15,43,91,.35)', fontFamily: 'var(--font-sans)'
            }}
        >
            <Clock size={22} style={{ flex: 'none', marginTop: 2, color: '#fbbf24' }} />
            <div style={{ flex: 1, fontSize: 13.5, lineHeight: '19px' }}>
                <strong style={{ display: 'block', fontSize: 14.5, marginBottom: 2 }}>
                    Tu sesión vence en {mmss(restante)}
                </strong>
                A las {horaLocal(vence)} volverás a la pantalla de ingreso. Guarda ahora lo que estés registrando;
                lo que no esté guardado se pierde.
            </div>
            <button
                type="button"
                onClick={() => setCerrado(true)}
                aria-label="Cerrar aviso"
                title="Cerrar aviso"
                style={{ flex: 'none', border: 0, background: 'transparent', color: '#dbe7f7', cursor: 'pointer', padding: 2 }}
            >
                <X size={18} />
            </button>
        </div>
    );
};

export default AvisoSesion;
