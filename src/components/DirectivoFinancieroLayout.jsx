import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Menu,
    X,
    BarChart3,
    ClipboardList,
    LogOut,
    User,
    TrendingUp,
    Building2
} from 'lucide-react';

const DirectivoFinancieroLayout = () => {
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
            name: 'Dashboard',
            href: '/directivo',
            icon: BarChart3,
            current: location.pathname === '/directivo'
        },
        {
            name: 'Inventario',
            href: '/directivo/inventario',
            icon: ClipboardList,
            current: location.pathname === '/directivo/inventario'
        }
    ];

    const SidebarContent = () => (
        <>
            <div className="flex items-center flex-shrink-0 px-4 py-5">
                <div className="flex items-center">
                    <div className="p-2 bg-emerald-600 rounded-lg">
                        <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-3">
                        <span className="text-base font-bold text-gray-900 leading-tight block">Área Financiera</span>
                        <span className="text-xs text-gray-500">Inventario</span>
                    </div>
                </div>
            </div>

            <div className="mt-2 flex-grow flex flex-col">
                <nav className="flex-1 px-3 pb-4 space-y-1">
                    {navigationItems.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`${
                                item.current
                                    ? 'bg-emerald-50 text-emerald-800 border-r-4 border-emerald-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            } group flex items-center px-3 py-2.5 text-sm font-medium rounded-l-md transition-colors`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon
                                className={`${
                                    item.current ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-500'
                                } mr-3 flex-shrink-0 h-5 w-5`}
                            />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="px-3 pb-4">
                    <div className="flex items-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                        <TrendingUp className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <div className="ml-2">
                            <p className="text-xs font-medium text-emerald-800">Modo lectura</p>
                            <p className="text-xs text-emerald-600">Solo visualización</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                            <button
                                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <X className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        <SidebarContent />
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <div className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0">
                <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
                    <SidebarContent />
                </div>
            </div>

            {/* Main content */}
            <div className="md:pl-60 flex flex-col flex-1">
                <div className="sticky top-0 z-10 flex-shrink-0 flex h-14 bg-white shadow-sm border-b border-gray-200">
                    <button
                        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none md:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <div className="flex-1 px-4 flex justify-end items-center">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <User className="h-4 w-4 text-emerald-700" />
                                </div>
                                <div className="ml-2 hidden sm:block">
                                    <p className="text-sm font-medium text-gray-700">{user?.full_name || user?.fullName}</p>
                                    <p className="text-xs text-gray-500">Directivo Financiero</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                <LogOut className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    </div>
                </div>

                <main className="flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DirectivoFinancieroLayout;
