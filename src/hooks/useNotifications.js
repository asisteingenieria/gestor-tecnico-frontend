import { useState, useEffect, useRef } from 'react';
import { incidentService, disenoService } from '../services/api';

export const useNotifications = (user) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const lastCheckRef = useRef(new Date());
    const intervalRef = useRef(null);

    const getNotifiedDisenoIds = () => {
        try { return new Set(JSON.parse(sessionStorage.getItem('notifiedDisenoIds') || '[]')); }
        catch { return new Set(); }
    };
    const saveNotifiedDisenoId = (id) => {
        try {
            const ids = getNotifiedDisenoIds();
            ids.add(id);
            sessionStorage.setItem('notifiedDisenoIds', JSON.stringify([...ids]));
        } catch {}
    };

    // Solicitar permisos de notificación del navegador y preparar audio
    useEffect(() => {
        if (user && (user.role === 'technician' || user.role === 'disenador')) {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }

            const enableAudio = async () => {
                initAudio();
                try {
                    if (audioRef.current) {
                        audioRef.current.volume = 0.01;
                        await audioRef.current.play();
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                        audioRef.current.volume = 0.7;
                        audioEnabledRef.current = true;
                    }
                } catch {}
                
                // Remover los listeners
                document.removeEventListener('click', enableAudio, true);
                document.removeEventListener('touchstart', enableAudio, true);
                document.removeEventListener('keydown', enableAudio, true);
            };
            
            // Agregar listeners para múltiples tipos de interacción
            document.addEventListener('click', enableAudio, { capture: true, once: true });
            document.addEventListener('touchstart', enableAudio, { capture: true, once: true });
            document.addEventListener('keydown', enableAudio, { capture: true, once: true });
            
            return () => {
                document.removeEventListener('click', enableAudio, true);
                document.removeEventListener('touchstart', enableAudio, true);
                document.removeEventListener('keydown', enableAudio, true);
            };
        }
    }, [user]);

    // Función para mostrar notificación del navegador
    const showBrowserNotification = (incident) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const title = incident.status === 'en_proceso' ? 'Nueva incidencia asignada' : 'Nueva incidencia pendiente';
            const notification = new Notification(title, {
                body: `Estación: ${incident.station_code}\nTipo: ${getFailureTypeLabel(incident.failure_type)}\nDescripción: ${incident.description.substring(0, 100)}${incident.description.length > 100 ? '...' : ''}`,
                icon: '/vite.svg', // Puedes cambiar esto por tu logo
                badge: '/vite.svg',
                tag: `incident-${incident.id}`,
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                // Opcional: navegar a la página de mis incidencias
                notification.close();
            };

            // Auto cerrar después de 10 segundos
            setTimeout(() => notification.close(), 10000);
        }
    };

    // Audio para notificaciones
    const audioRef = useRef(null);
    const audioEnabledRef = useRef(false);

    const initAudio = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio('/notification.mp3');
            audioRef.current.volume = 0.7;
            audioRef.current.preload = 'auto';
        }
    };

    const playNotificationSound = async () => {
        if (!audioEnabledRef.current) return;
        try {
            initAudio();
            if (!audioRef.current) return;
            audioRef.current.currentTime = 0;
            await audioRef.current.play();
        } catch {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 800;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } catch {}
        }
    };

    const getFailureTypeLabel = (type) => {
        const labels = {
            'pantalla': 'Pantalla',
            'perifericos': 'Periféricos', 
            'internet': 'Internet',
            'software': 'Software',
            'otro': 'Otro'
        };
        return labels[type] || type;
    };

    const checkForNewIncidents = async () => {
        if (!user || user.role !== 'technician') return;

        try {
            // Obtener tanto mis incidencias como las pendientes
            const [myIncidentsResponse, pendingIncidentsResponse] = await Promise.all([
                incidentService.getMyIncidents(),
                incidentService.getAll({ status: 'pendiente' })
            ]);
            
            const myIncidents = myIncidentsResponse.data;
            const pendingIncidents = pendingIncidentsResponse.data;
            
            // Filtrar mis incidencias nuevas (asignadas después de la última verificación)
            const newAssignedIncidents = myIncidents.filter(incident => {
                const incidentDate = new Date(incident.updated_at);
                return incidentDate > lastCheckRef.current && incident.status === 'en_proceso';
            });

            // Filtrar incidencias pendientes nuevas (creadas después de la última verificación)
            const newPendingIncidents = pendingIncidents.filter(incident => {
                const incidentDate = new Date(incident.created_at);
                return incidentDate > lastCheckRef.current;
            });

            // Combinar ambos tipos de incidencias nuevas
            const allNewIncidents = [...newAssignedIncidents, ...newPendingIncidents];

            if (allNewIncidents.length > 0) {
                const newNotifications = allNewIncidents.map(incident => ({
                    id: `incident-${incident.id}-${Date.now()}`,
                    incidentId: incident.id,
                    title: incident.status === 'en_proceso' ? 'Nueva incidencia asignada' : 'Nueva incidencia pendiente',
                    message: `${incident.station_code} - ${getFailureTypeLabel(incident.failure_type)}`,
                    timestamp: new Date(),
                    read: false,
                    incident: incident
                }));

                setNotifications(prev => [...newNotifications, ...prev].slice(0, 10)); // Mantener solo las últimas 10
                setUnreadCount(prev => prev + newNotifications.length);

                // Mostrar notificaciones del navegador y sonido
                allNewIncidents.forEach(incident => {
                    showBrowserNotification(incident);
                });
                
                if (allNewIncidents.length > 0) {
                    playNotificationSound();
                }
            }

            lastCheckRef.current = new Date();
        } catch (error) {
            console.error('Error verificando nuevas incidencias:', error);
        }
    };

    // Configurar polling cada 30 segundos para técnicos
    useEffect(() => {
        if (user && user.role === 'technician') {
            checkForNewIncidents();
            intervalRef.current = setInterval(checkForNewIncidents, 30000);
            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
    }, [user]);

    // Verificar nuevos diseños asignados para diseñadores
    const checkForNewDisenos = async () => {
        if (!user || user.role !== 'disenador') return;

        try {
            const res = await disenoService.getAll({ estado: 'en_progreso' });
            const disenos = res.data.data || [];

            const notifiedIds = getNotifiedDisenoIds();
            const newDisenos = disenos.filter(d =>
                d.disenador_id === user.id && !notifiedIds.has(d.id)
            );

            if (newDisenos.length > 0) {
                newDisenos.forEach(d => saveNotifiedDisenoId(d.id));

                const newNotifications = newDisenos.map(d => ({
                    id: `diseno-${d.id}-${Date.now()}`,
                    disenoId: d.id,
                    title: 'Diseño asignado',
                    message: d.nombre,
                    timestamp: new Date(),
                    read: false,
                    type: 'diseno',
                    diseno: d
                }));

                setNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
                setUnreadCount(prev => prev + newNotifications.length);

                newDisenos.forEach(d => {
                    if ('Notification' in window && Notification.permission === 'granted') {
                        const notif = new Notification('Nuevo diseño asignado', {
                            body: `Se te asignó: ${d.nombre}\n${d.descripcion?.substring(0, 100) || ''}`,
                            icon: '/vite.svg',
                            tag: `diseno-${d.id}`,
                            requireInteraction: true
                        });
                        setTimeout(() => notif.close(), 10000);
                    }
                });

                playNotificationSound();
            }

            lastCheckRef.current = new Date();
        } catch (error) {
            console.error('Error verificando nuevos diseños:', error);
        }
    };

    // Configurar polling cada 30 segundos para diseñadores
    useEffect(() => {
        if (user && user.role === 'disenador') {
            checkForNewDisenos();
            const id = setInterval(checkForNewDisenos, 30000);
            return () => clearInterval(id);
        }
    }, [user]);

    // Marcar notificación como leída
    const markAsRead = (notificationId) => {
        setNotifications(prev => 
            prev.map(notification => 
                notification.id === notificationId 
                    ? { ...notification, read: true }
                    : notification
            )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    // Marcar todas como leídas
    const markAllAsRead = () => {
        setNotifications(prev => 
            prev.map(notification => ({ ...notification, read: true }))
        );
        setUnreadCount(0);
    };

    // Limpiar notificaciones
    const clearNotifications = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        checkForNewIncidents,
        testNotificationSound: playNotificationSound
    };
};