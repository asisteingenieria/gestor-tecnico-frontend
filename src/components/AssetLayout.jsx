import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Menu,
    X,
    Package,
    Plus,
    ClipboardList,
    BarChart3,
    FileText,
    LogOut,
    User,
    Users
} from 'lucide-react';

const AssetLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navigationItems = [
        {
            name: 'Ingresar Activos',
            href: '/activos',
            icon: Plus,
            current: location.pathname === '/activos'
        },
        {
            name: 'Crear desde Script',
            href: '/activos/script-parser',
            icon: FileText,
            current: location.pathname === '/activos/script-parser'
        },
        {
            name: 'Inventario',
            href: '/activos/inventario',
            icon: ClipboardList,
            current: location.pathname === '/activos/inventario'
        },
        {
            name: 'Análisis y Gráficos',
            href: '/activos/charts',
            icon: BarChart3,
            current: location.pathname === '/activos/charts'
        },
        {
            name: 'Agentes',
            href: '/activos/agentes',
            icon: Users,
            current: location.pathname === '/activos/agentes'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile menu */}
            <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
                <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                        <button
                            type="button"
                            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-6 w-6 text-white" />
                        </button>
                    </div>
                    
                    {/* Mobile sidebar content */}
                    <div className="flex-shrink-0 flex items-center px-4">
                        <Package className="h-8 w-8 text-indigo-600" />
                        <span className="ml-2 text-xl font-bold text-gray-900">Gestión de Activos</span>
                    </div>
                    
                    <div className="mt-5 flex-1 h-0 overflow-y-auto">
                        <nav className="px-2 space-y-1">
                            {navigationItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`${
                                        item.current
                                            ? 'bg-indigo-100 text-indigo-900'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon
                                        className={`${
                                            item.current ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                                        } mr-4 flex-shrink-0 h-6 w-6`}
                                    />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
                    <div className="flex items-center flex-shrink-0 px-4">
                        <Package className="h-8 w-8 text-indigo-600" />
                        <span className="ml-2 text-xl font-bold text-gray-900">Gestión de Activos</span>
                    </div>
                    
                    <div className="mt-5 flex-grow flex flex-col">
                        <nav className="flex-1 px-2 pb-4 space-y-1">
                            {navigationItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`${
                                        item.current
                                            ? 'bg-indigo-100 text-indigo-900'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                                >
                                    <item.icon
                                        className={`${
                                            item.current ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                                        } mr-3 flex-shrink-0 h-6 w-6`}
                                    />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="md:pl-64 flex flex-col flex-1">
                {/* Top nav */}
                <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
                    <button
                        type="button"
                        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    
                    <div className="flex-1 px-4 flex justify-between">
                        <div className="flex-1 flex">
                            {/* Breadcrumb or page title can go here */}
                        </div>
                        
                        <div className="ml-4 flex items-center md:ml-6">
                            {/* User menu */}
                            <div className="relative">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center">
                                        <User className="h-8 w-8 text-gray-400" />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-700">{user?.full_name || user?.fullName}</div>
                                            <div className="text-xs text-gray-500">Gestor de Activos</div>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={handleLogout}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AssetLayout;