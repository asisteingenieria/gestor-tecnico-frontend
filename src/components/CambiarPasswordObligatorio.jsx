import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Primer ingreso con la contraseña inicial (la cédula): Gestor no deja continuar hasta
// cambiarla. El backend bloquea el resto de la API mientras tanto. Ver asistencia.md §19.
const CambiarPasswordObligatorio = () => {
    const { user, changePassword, logout } = useAuth();
    const navigate = useNavigate();
    const [actual, setActual] = useState('');
    const [nueva, setNueva] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [error, setError] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const nombre = user?.fullName || user?.full_name || '';

    const enviar = async (e) => {
        e.preventDefault();
        setError(null);
        if (nueva.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.');
        if (nueva !== confirmacion) return setError('La confirmación no coincide con la nueva contraseña.');

        setGuardando(true);
        const resultado = await changePassword(actual, nueva);
        setGuardando(false);
        if (!resultado.success) return setError(resultado.message);
        navigate('/', { replace: true });
    };

    return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 16px', background: 'var(--surface-50, #f4f6fa)' }}>
            <form className="ai-panel" onSubmit={enviar} style={{ width: '100%', maxWidth: 420, padding: 28, display: 'grid', gap: 18 }}>
                <div style={{ display: 'grid', gap: 6 }}>
                    <span className="ai-kpi-icon" style={{ width: 40, height: 40 }}><KeyRound size={20} strokeWidth={1.75} /></span>
                    <h1 style={{ margin: 0, fontSize: 20 }}>Crea tu contraseña</h1>
                    <p className="ai-muted" style={{ margin: 0, fontSize: 14 }}>
                        {nombre ? `${nombre}, es` : 'Es'} tu primer ingreso. Tu contraseña actual es tu número de cédula;
                        cámbiala por una que solo tú conozcas para continuar.
                    </p>
                </div>

                <div className="ai-field">
                    <label className="ai-label" htmlFor="pwd-actual">Contraseña actual (tu cédula)</label>
                    <input id="pwd-actual" className="ai-input" type="password" autoComplete="current-password"
                        value={actual} onChange={(e) => setActual(e.target.value)} required />
                </div>
                <div className="ai-field">
                    <label className="ai-label" htmlFor="pwd-nueva">Nueva contraseña</label>
                    <input id="pwd-nueva" className="ai-input" type="password" autoComplete="new-password" minLength={6}
                        value={nueva} onChange={(e) => setNueva(e.target.value)} required />
                    <small className="ai-muted">Mínimo 6 caracteres y distinta de tu cédula.</small>
                </div>
                <div className="ai-field">
                    <label className="ai-label" htmlFor="pwd-confirmacion">Confirma la nueva contraseña</label>
                    <input id="pwd-confirmacion" className="ai-input" type="password" autoComplete="new-password"
                        value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} required />
                </div>

                {error && (
                    <div className="ai-row" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                        <AlertCircle size={16} strokeWidth={1.75} />
                        <span style={{ fontSize: 13 }}>{error}</span>
                    </div>
                )}

                <button type="submit" className="ai-btn ai-btn--navy" disabled={guardando}>
                    {guardando ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin" /> : null}
                    Guardar y continuar
                </button>
                <button type="button" className="ai-btn ai-btn--ghost" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
                    <LogOut size={16} strokeWidth={1.75} /> Cerrar sesión
                </button>
            </form>
        </div>
    );
};

export default CambiarPasswordObligatorio;
