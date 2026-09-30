import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { asistenciaService } from '../../services/api';
import {
    Clock, Calendar, History, BarChart3, Users, CalendarClock, Clock3,
    Bell, ChevronDown, Moon, Sun, LogOut, Menu, X
} from 'lucide-react';
import asisteMarkWhite from '../../assets/asiste-ui/asiste-mark-white.png';

const iniciales = (nombre = '') => nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

const ROL_LABEL = {
    empleado: 'Empleado',
    director_operaciones: 'Director de Operaciones'
};

const AsistenciaLayout = () => {
    const { user, logout, isDirectorOperaciones } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [alertasEquipo, setAlertasEquipo] = useState(null);
    const [pendientesHorasExtra, setPendientesHorasExtra] = useState(null);
    const [horaActual, setHoraActual] = useState(() => formatearHoraBogota(new Date()));
    const [tema, setTema] = useState(() => {
        if (typeof document === 'undefined') return 'light';
        const guardado = localStorage.getItem('ai-theme');
        if (guardado) document.documentElement.dataset.theme = guardado;
        return guardado || document.documentElement.dataset.theme || 'light';
    });
    const menuRef = useRef(null);

    const base = isDirectorOperaciones ? '/operaciones' : '/asistencia';

    const navPersonal = [
        { to: base, label: 'Mi jornada', icon: Clock, end: true },
        { to: `${base}/horario`, label: 'Mi horario', icon: Calendar },
        { to: `${base}/trazabilidad`, label: 'Trazabilidad', icon: History },
        { to: `${base}/estadisticas`, label: 'Estadísticas', icon: BarChart3 },
        ...(!isDirectorOperaciones ? [{ to: `${base}/horas-extra`, label: 'Horas extra', icon: Clock3 }] : [])
    ];

    const navEquipo = isDirectorOperaciones ? [
        { to: `${base}/equipo`, label: 'Equipo hoy', icon: Users, count: alertasEquipo, alert: true },
        { to: `${base}/horarios`, label: 'Horarios', icon: CalendarClock },
        { to: `${base}/horas-extra`, label: 'Horas extra', icon: Clock3, count: pendientesHorasExtra }
    ] : [];

    useEffect(() => {
        if (!isDirectorOperaciones) return;
        asistenciaService.getEquipo()
            .then(({ data }) => {
                const conAlerta = data.filter((e) => e.estado === 'ausente' || e.alertas?.includes('llegada_tarde')).length;
                setAlertasEquipo(conAlerta);
            })
            .catch(() => setAlertasEquipo(null));
        asistenciaService.getBandejaHorasExtra({ estado: 'pendiente' })
            .then(({ data }) => setPendientesHorasExtra(data.length))
            .catch(() => setPendientesHorasExtra(null));
    }, [isDirectorOperaciones]);

    useEffect(() => {
        const id = setInterval(() => setHoraActual(formatearHoraBogota(new Date())), 30000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const cerrarFuera = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', cerrarFuera);
        return () => document.removeEventListener('mousedown', cerrarFuera);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleTema = () => {
        const siguiente = tema === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = siguiente;
        localStorage.setItem('ai-theme', siguiente);
        setTema(siguiente);
    };

    const nombreUsuario = user?.full_name || user?.fullName || '';
    const rolLabel = ROL_LABEL[user?.role] || '';

    const renderLink = ({ to, label, icon: Icon, end, count, alert }) => (
        <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) => `ai-topnav-link${isActive ? ' is-active' : ''}`}
        >
            <Icon className="ai-ic" size={16} strokeWidth={1.75} />
            <span className="ai-topnav-link-text">{label}</span>
            {count !== null && count !== undefined && (
                <span className={`ai-count${alert && count > 0 ? ' is-alert' : ''}`}>{count}</span>
            )}
        </NavLink>
    );

    return (
        <div className="ai-scope" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <nav className="ai-topnav">
                <NavLink to={base} className="ai-brand" style={{ textDecoration: 'none' }}>
                    <img src={asisteMarkWhite} alt="" style={{ width: 30, height: 'auto', display: 'block' }} />
                    <div>
                        <div className="ai-brand-name">ASISTE ING</div>
                        <div className="ai-brand-sub">Asistencia</div>
                    </div>
                </NavLink>

                <div className="ai-topnav-links" style={{ display: 'none' }} data-desktop-nav>
                    {navPersonal.map(renderLink)}
                    {navEquipo.length > 0 && (
                        <>
                            <span className="ai-topnav-sep" />
                            {navEquipo.map(renderLink)}
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="ai-icon-btn"
                    style={{ marginLeft: 'auto', display: 'none' }}
                    data-mobile-toggle
                    onClick={() => setMobileNavOpen((o) => !o)}
                    aria-label="Abrir menú"
                >
                    {mobileNavOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
                </button>

                <div className="ai-row" style={{ marginLeft: 'auto', gap: 8 }} data-topnav-actions>
                    <span className="ai-clock-chip">{horaActual}</span>
                    <button type="button" className="ai-icon-btn ai-bell" aria-label="Notificaciones">
                        <Bell size={18} strokeWidth={1.75} />
                    </button>

                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <button
                            type="button"
                            className="ai-user-menu"
                            style={{ background: 'transparent', borderColor: 'rgba(255,255,255,.18)', cursor: 'pointer' }}
                            onClick={() => setMenuOpen((o) => !o)}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                        >
                            <span className="ai-avatar ai-avatar--brand ai-avatar--sm">{iniciales(nombreUsuario)}</span>
                            <span style={{ textAlign: 'left', lineHeight: 1.2 }}>
                                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff' }}>{nombreUsuario}</span>
                                <span style={{ display: 'block', fontSize: 11, color: '#8fa9cc' }}>{rolLabel}</span>
                            </span>
                            <ChevronDown size={16} strokeWidth={1.75} style={{ color: '#8fa9cc' }} />
                        </button>

                        {menuOpen && (
                            <div
                                role="menu"
                                style={{
                                    position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, zIndex: 50,
                                    background: 'var(--surface-100)', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-pop)', padding: 4, color: 'var(--ink)'
                                }}
                            >
                                <button type="button" className="ai-nav-item" style={{ width: '100%', color: 'var(--ink-muted)' }} onClick={toggleTema}>
                                    {tema === 'dark' ? <Sun className="ai-ic" size={16} strokeWidth={1.75} /> : <Moon className="ai-ic" size={16} strokeWidth={1.75} />}
                                    Tema {tema === 'dark' ? 'claro' : 'oscuro'}
                                </button>
                                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                                <button
                                    type="button"
                                    className="ai-nav-item"
                                    style={{ width: '100%', color: 'var(--danger)' }}
                                    onClick={handleLogout}
                                >
                                    <LogOut className="ai-ic" size={16} strokeWidth={1.75} />
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {mobileNavOpen && (
                <div style={{ background: 'var(--sidebar-bg)', padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 4 }} data-mobile-nav>
                    {[...navPersonal, ...navEquipo].map(({ to, label, icon: Icon, end, count, alert }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            onClick={() => setMobileNavOpen(false)}
                            className={({ isActive }) => `ai-nav-item${isActive ? ' is-active' : ''}`}
                            style={{ color: 'var(--sidebar-ink)' }}
                        >
                            <Icon className="ai-ic" size={16} strokeWidth={1.75} />
                            {label}
                            {count !== null && count !== undefined && (
                                <span className={`ai-count${alert && count > 0 ? ' is-alert' : ''}`}>{count}</span>
                            )}
                        </NavLink>
                    ))}
                </div>
            )}

            <main style={{ flex: 1, background: 'var(--surface-0)' }}>
                <Outlet />
            </main>

            <style>{`
                [data-desktop-nav] { display: none; }
                [data-mobile-toggle] { display: none; }
                @media (min-width: 768px) {
                    [data-desktop-nav] { display: flex !important; }
                    [data-mobile-nav] { display: none !important; }
                }
                @media (max-width: 767px) {
                    [data-mobile-toggle] { display: inline-grid !important; }
                    [data-topnav-actions] { display: none !important; }
                }
                @media (min-width: 768px) and (max-width: 1279px) {
                    .ai-topnav-link-text { display: none; }
                }
            `}</style>
        </div>
    );
};

function formatearHoraBogota(fecha) {
    return fecha.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
}

export default AsistenciaLayout;
