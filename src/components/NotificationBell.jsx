import React, { useState } from 'react';
import { Bell, X, Check, Trash2, Volume2, Palette } from 'lucide-react';

const NotificationBell = ({ notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, testNotificationSound }) => {
    const [isOpen, setIsOpen] = useState(false);

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora mismo';
        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours}h`;
        return `Hace ${days}d`;
    };

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full"
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notifications Dropdown */}
            {isOpen && (
                <>
                    {/* Overlay */}
                    <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                        <div className="p-4">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Notificaciones
                                </h3>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={testNotificationSound}
                                        className="text-xs text-green-600 hover:text-green-800 flex items-center"
                                        title="Probar sonido de notificación"
                                    >
                                        <Volume2 className="h-3 w-3 mr-1" />
                                        Test Sonido
                                    </button>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                        >
                                            <Check className="h-3 w-3 mr-1" />
                                            Marcar todas
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={clearNotifications}
                                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Limpiar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Notifications List */}
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-6">
                                        <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No hay notificaciones</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                    notification.read
                                                        ? 'bg-gray-50 border-gray-200'
                                                        : notification.type === 'diseno'
                                                            ? 'bg-purple-50 border-purple-200'
                                                            : 'bg-blue-50 border-blue-200'
                                                }`}
                                                onClick={() => {
                                                    if (!notification.read) markAsRead(notification.id);
                                                }}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            {notification.type === 'diseno'
                                                                ? <Palette className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                                                : <Bell className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                            }
                                                            <h4 className={`text-sm font-medium ${
                                                                notification.read ? 'text-gray-700' : 'text-gray-900'
                                                            }`}>
                                                                {notification.title}
                                                            </h4>
                                                            {!notification.read && (
                                                                <div className={`w-2 h-2 rounded-full shrink-0 ${
                                                                    notification.type === 'diseno' ? 'bg-purple-500' : 'bg-blue-500'
                                                                }`} />
                                                            )}
                                                        </div>
                                                        <p className={`text-sm mt-1 ${
                                                            notification.read ? 'text-gray-500' : 'text-gray-600'
                                                        }`}>
                                                            {notification.message}
                                                        </p>
                                                        {notification.type === 'diseno' && notification.diseno?.descripcion && (
                                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                                                {notification.diseno.descripcion}
                                                            </p>
                                                        )}
                                                        {notification.type !== 'diseno' && notification.incident && (
                                                            <p className="text-xs text-gray-400 mt-1 truncate">
                                                                {notification.incident.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                                        {formatTimeAgo(notification.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 text-center">
                                        Se verifican nuevas notificaciones cada 30 segundos
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;