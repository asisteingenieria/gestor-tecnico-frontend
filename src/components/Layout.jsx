import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useReturnedIncidents } from '../hooks/useReturnedIncidents';
import NotificationBell from './NotificationBell';
import AlertsDropdown from './AlertsDropdown';
import IntrusiveAlerts from './IntrusiveAlerts';
import ChatBox from './ChatBox';
import '../styles/hanny-theme.css';
import '../styles/ironman-theme.css';
import {
    Menu,
    X,
    Home,
    AlertTriangle,
    Users,
    Monitor,
    CheckCircle,
    Clock,
    Settings,
    LogOut,
    User,
    Heart,
    BarChart3,
    RotateCcw,
    FileText,
    Zap,
    History,
    Trophy,
    Palette
} from 'lucide-react';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [hearts, setHearts] = useState([]);
    const [sparks, setSparks] = useState([]);
    const { user, logout, isAdmin, isSupervisor, isCoordinador, isJefeOperaciones, isTechnician, isDisenador, canSupervise } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Detectar si es el usuario especial de Hanny
    const isHannyTheme = user?.username === 'hannycita10';
    // Detectar si es el usuario especial de David (Iron Man)
    const isIronManTheme = user?.username === 'davidlopez10';
    
    // Hook de notificaciones para técnicos
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        testNotificationSound
    } = useNotifications(user);

    // Hook para incidencias devueltas
    const { returnedCount } = useReturnedIncidents();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Crear efecto de corazoncito para Hanny
    const createHeart = (event) => {
        if (!isHannyTheme) return;

        const heart = {
            id: Date.now() + Math.random(),
            x: event.clientX,
            y: event.clientY,
        };

        setHearts(prev => [...prev, heart]);

        // Remover el corazón después de la animación
        setTimeout(() => {
            setHearts(prev => prev.filter(h => h.id !== heart.id));
        }, 1000);
    };

    // Crear efecto de chispas para Iron Man
    const createSpark = (event) => {
        if (!isIronManTheme) return;

        // Crear múltiples chispas con colores neón
        const newSparks = Array.from({ length: 3 }, (_, i) => ({
            id: Date.now() + Math.random() + i,
            x: event.clientX + (Math.random() - 0.5) * 20,
            y: event.clientY + (Math.random() - 0.5) * 20,
            color: i % 2 === 0 ? '#00E5FF' : '#E10600'
        }));

        setSparks(prev => [...prev, ...newSparks]);

        // Remover las chispas después de la animación
        setTimeout(() => {
            setSparks(prev => prev.filter(s => !newSparks.find(ns => ns.id === s.id)));
        }, 800);
    };

    // Efecto combinado para clics
    const handleThemeEffect = (event) => {
        createHeart(event);
        createSpark(event);
    };

    // Limpiar efectos al cambiar de usuario
    useEffect(() => {
        if (!isHannyTheme) {
            setHearts([]);
        }
        if (!isIronManTheme) {
            setSparks([]);
        }
    }, [isHannyTheme, isIronManTheme]);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'supervisor', 'coordinador', 'jefe_operaciones', 'technician', 'administrativo'] },
        
        // Incidencias
        { name: 'Crear Incidencia', href: '/incidents/create', icon: AlertTriangle, roles: ['admin', 'supervisor', 'coordinador', 'jefe_operaciones', 'administrativo'] },
        { name: 'Mis Casos Reportados', href: '/incidents/my-reports', icon: FileText, roles: ['supervisor', 'coordinador', 'jefe_operaciones', 'administrativo'] },
        { name: 'Incidencias Pendientes', href: '/incidents/pending', icon: Clock, roles: ['admin', 'technician', 'jefe_operaciones'] },
        { name: 'Mis Incidencias', href: '/incidents/my-incidents', icon: User, roles: ['technician'], showBadge: true },
        { name: 'En Supervisión', href: '/incidents/supervision', icon: Settings, roles: ['admin', 'supervisor', 'coordinador', 'jefe_operaciones', 'administrativo'] },
        { name: 'Mis Incidencias en Supervisión', href: '/incidents/my-supervision', icon: User, roles: ['jefe_operaciones'] },
        { name: 'Incidencias Devueltas', href: '/incidents/returned', icon: RotateCcw, roles: ['admin', 'supervisor', 'coordinador', 'jefe_operaciones', 'administrativo'], showBadge: true },
        { name: 'Historial Aprobadas', href: '/incidents/approved', icon: CheckCircle, roles: ['admin', 'supervisor', 'coordinador', 'jefe_operaciones', 'technician', 'administrativo'] },
        
        // Diseños
        { name: 'Diseños', href: '/disenos', icon: Palette, roles: ['admin', 'coordinador', 'supervisor', 'jefe_operaciones', 'administrativo', 'technician', 'disenador'] },
        { name: 'Diseños Completados', href: '/disenos/completados', icon: CheckCircle, roles: ['disenador', 'admin'] },

        // Gestión (solo admin)
        { name: 'Usuarios', href: '/users', icon: Users, roles: ['admin'] },
        { name: 'Estaciones', href: '/workstations', icon: Monitor, roles: ['admin'] },
        { name: 'Técnicos', href: '/tecnicos', icon: Trophy, roles: ['admin'] },
        { name: 'Analíticas', href: '/analytics', icon: BarChart3, roles: ['admin'] },
        { name: 'Historial Componentes', href: '/asset-history', icon: History, roles: ['admin'] },
    ];

    const filteredNavigation = navigation.filter(item => 
        item.roles.includes(user?.role)
    );

    const isActive = (href) => location.pathname === href;

    // Determinar clases de tema
    const getThemeClass = () => {
        if (isHannyTheme) return 'bg-gray-900 hanny-theme';
        if (isIronManTheme) return 'ironman-theme';
        return 'bg-gray-50';
    };

    const getSidebarClass = () => {
        if (isHannyTheme) return 'bg-gray-800';
        if (isIronManTheme) return 'border-r border-cyan-500/20';
        return 'bg-white';
    };

    const getTitleClass = () => {
        if (isHannyTheme) return 'text-purple-300';
        if (isIronManTheme) return 'text-cyan-400 ironman-glow';
        return 'text-gray-900';
    };

    const getTitle = () => {
        if (isHannyTheme) return '💜 Panel de Hanny';
        if (isIronManTheme) return 'J.A.R.V.I.S.';
        return 'Soporte Asiste ING.';
    };

    return (
        <div className={`h-screen flex ${getThemeClass()} relative`} style={isIronManTheme ? { backgroundColor: '#0B0F14' } : {}}>

            {/* Modal intrusivo de alertas */}
            {(isCoordinador || isJefeOperaciones || user?.role === 'administrativo') && (
                <IntrusiveAlerts />
            )}
            {/* Sidebar */}
            <div
                className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 ${getSidebarClass()} shadow-lg transform lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-300`}
                style={isIronManTheme ? { backgroundColor: '#0F172A' } : {}}
            >
                <div className={`flex items-center justify-between p-4 ${isHannyTheme ? 'border-gray-700' : isIronManTheme ? 'border-b border-cyan-500/20' : 'border-b'}`}>
                    <h1 className={`text-lg sm:text-xl font-bold ${getTitleClass()} truncate`}>
                    {getTitle()}
                    </h1>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className={`lg:hidden p-1 rounded-md ${isHannyTheme ? 'text-purple-400 hover:text-purple-300' : isIronManTheme ? 'text-cyan-400 hover:text-cyan-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Imagen Iron Man */}
                {isIronManTheme && (
                    <div className="ironman-avatar-container">
                        <img src="/man.jpg" alt="Iron Man" className="ironman-avatar" />
                    </div>
                )}

                <nav className="mt-5 px-2 space-y-1">
                    {filteredNavigation.map((item) => {
                        const Icon = item.icon;
                        const getNavActiveClass = () => {
                            if (isHannyTheme) return 'bg-purple-900 border-r-4 border-purple-500 text-purple-300';
                            if (isIronManTheme) return 'bg-cyan-900/30 border-r-4 border-cyan-400 text-cyan-400';
                            return 'bg-blue-50 border-r-4 border-blue-600 text-blue-700';
                        };
                        const getNavInactiveClass = () => {
                            if (isHannyTheme) return 'text-gray-300 hover:bg-gray-700 hover:text-purple-300';
                            if (isIronManTheme) return 'text-gray-400 hover:bg-cyan-900/20 hover:text-cyan-400';
                            return 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';
                        };
                        const getIconActiveClass = () => {
                            if (isHannyTheme) return 'text-purple-400';
                            if (isIronManTheme) return 'text-cyan-400';
                            return 'text-blue-500';
                        };
                        const getIconInactiveClass = () => {
                            if (isHannyTheme) return 'text-gray-400 group-hover:text-purple-400';
                            if (isIronManTheme) return 'text-gray-500 group-hover:text-cyan-400';
                            return 'text-gray-400 group-hover:text-gray-500';
                        };
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={(e) => {
                                    setSidebarOpen(false);
                                    handleThemeEffect(e);
                                }}
                                className={`${
                                    isActive(item.href) ? getNavActiveClass() : getNavInactiveClass()
                                } group flex items-center px-2 py-2 text-sm font-medium rounded-l-md transition-colors duration-200`}
                            >
                                <Icon
                                    className={`${
                                        isActive(item.href) ? getIconActiveClass() : getIconInactiveClass()
                                    } mr-3 h-5 w-5`}
                                />
                                <span className="flex-1">{item.name}</span>
                                {item.showBadge && (
                                    <>
                                        {/* Badge para técnicos (Mis Incidencias) */}
                                        {isTechnician && item.href === '/incidents/my-incidents' && unreadCount > 0 && (
                                            <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                        {/* Badge para incidencias devueltas (solo para no-admins) */}
                                        {item.href === '/incidents/returned' && returnedCount > 0 && !isAdmin && (
                                            <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                {returnedCount > 9 ? '9+' : returnedCount}
                                            </span>
                                        )}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User info and logout */}
                <div
                    className={`absolute bottom-0 w-full p-4 ${isHannyTheme ? 'border-gray-700 bg-gray-800' : isIronManTheme ? 'border-t border-cyan-500/20' : 'border-t bg-gray-50'}`}
                    style={isIronManTheme ? { backgroundColor: '#0F172A' } : {}}
                >
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            {isIronManTheme ? (
                                <div className="arc-reactor">
                                </div>
                            ) : (
                                <div className={`h-8 w-8 rounded-full ${isHannyTheme ? 'bg-purple-600' : 'bg-blue-500'} flex items-center justify-center`}>
                                    <span className="text-sm font-medium text-white">
                                        {isHannyTheme ? '💜' : (user?.fullName?.charAt(0) || 'U')}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="ml-3 flex-1">
                            <p className={`text-sm font-medium ${isHannyTheme ? 'text-purple-200' : isIronManTheme ? 'text-cyan-400' : 'text-gray-700'}`}>
                                {isIronManTheme ? 'Tony Stark' : (user?.fullName || 'Usuario')}
                            </p>
                            <p className={`text-xs ${isHannyTheme ? 'text-purple-400' : isIronManTheme ? 'text-gray-400' : 'text-gray-500'} capitalize`}>
                                {isHannyTheme ? '👑 Admin' : isIronManTheme ? '🦾 Iron Man' : (
                                    user?.role === 'admin' ? 'Administrador' :
                                    user?.role === 'supervisor' ? 'Supervisor' :
                                    user?.role === 'coordinador' ? 'Coordinador' :
                                    user?.role === 'jefe_operaciones' ? 'Jefe Operaciones' :
                                    user?.role === 'administrativo' ? 'Administrativo' :
                                    user?.role === 'disenador' ? 'Diseñador' :
                                    'Técnico'
                                )}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className={`ml-2 p-1 rounded-md ${isHannyTheme ? 'text-purple-400 hover:text-purple-300' : isIronManTheme ? 'text-cyan-400 hover:text-cyan-300' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Cerrar sesión"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Top bar */}
                <div
                    className={`${isHannyTheme ? 'bg-gray-800 shadow-sm border-gray-700' : isIronManTheme ? 'shadow-sm border-b border-cyan-500/20' : 'bg-white shadow-sm border-b'} px-4 py-3 lg:px-6`}
                    style={isIronManTheme ? { backgroundColor: '#0F172A' } : {}}
                >
                    <div className="flex items-center justify-between">
                        <button
                            onClick={(e) => {
                                setSidebarOpen(true);
                                handleThemeEffect(e);
                            }}
                            className={`lg:hidden p-1 rounded-md ${isHannyTheme ? 'text-purple-400 hover:text-purple-300' : isIronManTheme ? 'text-cyan-400 hover:text-cyan-300' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h2 className={`text-sm font-semibold ${isHannyTheme ? 'text-purple-200' : isIronManTheme ? 'text-cyan-400 ironman-glow' : 'text-gray-900'} sm:text-lg lg:text-xl truncate flex-1 lg:text-center`}>
                            {isHannyTheme ? '💜 Sistema de Soporte de Hanny 💜' : isIronManTheme ? 'STARK INDUSTRIES - Sistema de Soporte' : 'Call Center - Sistema de Soporte Técnico'}
                        </h2>
                        
                        <div className="flex items-center space-x-2">
                            {/* Alertas para coordinadores, jefes de operaciones y administrativos */}
                            {(isCoordinador || isJefeOperaciones || user?.role === 'administrativo') && (
                                <AlertsDropdown />
                            )}
                            
                            {/* Notification Bell for Technicians and Designers */}
                            {(isTechnician || isDisenador) && (
                                <NotificationBell
                                    notifications={notifications}
                                    unreadCount={unreadCount}
                                    markAsRead={markAsRead}
                                    markAllAsRead={markAllAsRead}
                                    clearNotifications={clearNotifications}
                                    testNotificationSound={testNotificationSound}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
            
            {/* Efectos de corazón para Hanny */}
            {isHannyTheme && hearts.map((heart) => (
                <div
                    key={heart.id}
                    className="fixed pointer-events-none z-50"
                    style={{
                        left: heart.x - 10,
                        top: heart.y - 10,
                        animation: 'heartFloat 1s ease-out forwards',
                    }}
                >
                    <Heart className="h-5 w-5 text-pink-500 fill-current" />
                </div>
            ))}

            {/* Efectos de chispas para Iron Man */}
            {isIronManTheme && sparks.map((spark) => (
                <div
                    key={spark.id}
                    className="fixed pointer-events-none z-50"
                    style={{
                        left: spark.x - 6,
                        top: spark.y - 6,
                        animation: 'techFloat 0.8s ease-out forwards',
                    }}
                >
                    <Zap className="h-4 w-4" style={{ color: spark.color, filter: 'drop-shadow(0 0 3px ' + spark.color + ')' }} />
                </div>
            ))}

            {/* Chat Box para usuarios anónimos */}
            <ChatBox />
        </div>
    );
};

export default Layout;