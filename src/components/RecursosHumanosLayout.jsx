import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { novedadRrhhService, contratacionHydraService } from '../services/api';
import { iniciales } from '../utils/formatoRRHH';
import {
    Users, ClipboardList, ArrowLeftRight, CalendarDays, UserPlus, Clock, FileSpreadsheet, History,
    BarChart3, Search, Bell, ChevronDown, User, Moon, Sun, LogOut, Menu, X
} from 'lucide-react';
import asisteMarkWhite from '../assets/asiste-ui/asiste-mark-white.png';

const NAV_ITEMS = [
    { to: '/recursos-humanos', label: 'Empleados', icon: Users, end: true },
    { to: '/recursos-humanos/contratacion-hydra', label: 'Contratación Hydra', icon: UserPlus, countKey: 'contratacion' },
    { to: '/recursos-humanos/novedades', label: 'Novedades', icon: ClipboardList, countKey: 'novedades' },
    { to: '/recursos-humanos/traspasos', label: 'Traspasos', icon: ArrowLeftRight },
    { to: '/recursos-humanos/vacaciones', label: 'Pasivo vacacional', icon: CalendarDays },
    // Su propia asistencia (asistencia.md §19): RRHH no tiene cuenta de empleado aparte.
    { to: '/asistencia', label: 'Mi asistencia', icon: Clock }
];

// Financiera ve todo lo de RRHH y además los reportes de horas extras de los jefes y la
// trazabilidad de asistencia por campaña (asistencia.md §32).
const NAV_FINANCIERA = [
    { to: '/recursos-humanos/reportes-horas-extra', label: 'Horas extra', icon: FileSpreadsheet },
    { to: '/recursos-humanos/asistencia-mensual', label: 'Asistencia mensual', icon: BarChart3 },
    { to: '/recursos-humanos/trazabilidad', label: 'Trazabilidad', icon: History }
];

const RecursosHumanosLayout = () => {
    const { user, logout, isFinanciera } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [totalNovedades, setTotalNovedades] = useState(null);
    // Lotes de Hydra que todavía requieren trabajo de RRHH (en completitud o listos).
    const [lotesAbiertos, setLotesAbiertos] = useState(null);
    const [tema, setTema] = useState(() => (typeof document !== 'undefined' && document.documentElement.dataset.theme) || 'light');
    const menuRef = useRef(null);

    useEffect(() => {
        novedadRrhhService.getAll()
            .then(({ data }) => setTotalNovedades(data.novedades?.length ?? null))
            .catch(() => setTotalNovedades(null));
        contratacionHydraService.getLotes()
            .then(({ data }) => setLotesAbiertos(data.lotes.filter(l => l.estado === 'abierto' || l.estado === 'listo').length))
            .catch(() => setLotesAbiertos(null));
    }, []);

    const contadores = { novedades: totalNovedades, contratacion: lotesAbiertos || null };
    const navItems = isFinanciera
        ? [...NAV_ITEMS.slice(0, -1), ...NAV_FINANCIERA, NAV_ITEMS[NAV_ITEMS.length - 1]]
        : NAV_ITEMS;

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

    return (
        <div className="ai-scope" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <nav className="ai-topnav">
                <NavLink to="/recursos-humanos" className="ai-brand" style={{ textDecoration: 'none' }}>
                    <img src={asisteMarkWhite} alt="" style={{ width: 30, height: 'auto', display: 'block' }} />
                    <div>
                        <div className="ai-brand-name">ASISTE ING</div>
                        <div className="ai-brand-sub">Gestión Humana</div>
                    </div>
                </NavLink>

                <div className="ai-topnav-links" style={{ display: 'none' }} data-desktop-nav>
                    {navItems.map(({ to, label, icon: Icon, end, countKey }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) => `ai-topnav-link${isActive ? ' is-active' : ''}`}
                        >
                            <Icon className="ai-ic" size={16} strokeWidth={1.75} />
                            <span className="ai-topnav-link-text">{label}</span>
                            {countKey && contadores[countKey] != null && (
                                <span className="ai-count">{contadores[countKey]}</span>
                            )}
                        </NavLink>
                    ))}
                </div>

                <button
                    type="button"
                    className="ai-icon-btn"
                    style={{ marginLeft: 'auto', display: 'none' }}
                    data-mobile-toggle
                    onClick={() => setMobileNavOpen(o => !o)}
                    aria-label="Abrir menú"
                >
                    {mobileNavOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
                </button>

                <div className="ai-row" style={{ marginLeft: 'auto', gap: 4 }} data-topnav-actions>
                    <button type="button" className="ai-icon-btn" aria-label="Buscar" title="Buscar (Ctrl K)">
                        <Search size={18} strokeWidth={1.75} />
                    </button>
                    <button type="button" className="ai-icon-btn ai-bell" aria-label="Notificaciones">
                        <Bell size={18} strokeWidth={1.75} />
                    </button>

                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <button
                            type="button"
                            className="ai-user-menu"
                            style={{ background: 'transparent', borderColor: 'rgba(255,255,255,.18)', cursor: 'pointer' }}
                            onClick={() => setMenuOpen(o => !o)}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                        >
                            <span className="ai-avatar ai-avatar--brand ai-avatar--sm">{iniciales(nombreUsuario)}</span>
                            <span style={{ textAlign: 'left', lineHeight: 1.2 }}>
                                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff' }}>{nombreUsuario}</span>
                                <span style={{ display: 'block', fontSize: 11, color: '#8fa9cc' }}>{isFinanciera ? 'Financiera' : 'Recursos Humanos'}</span>
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
                                <button type="button" className="ai-nav-item" style={{ width: '100%', color: 'var(--ink-muted)' }}>
                                    <User className="ai-ic" size={16} strokeWidth={1.75} />
                                    Mi perfil
                                </button>
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
                    {navItems.map(({ to, label, icon: Icon, end, countKey }) => (
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
                            {countKey && contadores[countKey] != null && (
                                <span className="ai-count">{contadores[countKey]}</span>
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
                @media (min-width: 768px) and (max-width: 1099px) {
                    .ai-topnav-link-text { display: none; }
                }
            `}</style>
        </div>
    );
};

export default RecursosHumanosLayout;
