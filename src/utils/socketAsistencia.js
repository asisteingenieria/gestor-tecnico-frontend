import io from 'socket.io-client';

// Un solo socket para las pantallas de asistencia. Al conectar (y al reconectar) se suscribe con
// el JWT a la sala de su ficha; el backend avisa ahí cada cambio de jornada (AsisLock o portal)
// y la pantalla vuelve a pedir su estado a la API. Ver `asistencia:suscribir` en index.js.
let socket = null;

function obtenerSocket() {
    if (!socket) {
        const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
        socket = io(base);
        socket.on('connect', () => {
            const token = localStorage.getItem('token');
            if (token) socket.emit('asistencia:suscribir', token);
        });
    }
    return socket;
}

// Devuelve la función para dejar de escuchar.
export function escucharAsistencia(evento, handler) {
    const s = obtenerSocket();
    s.on(evento, handler);
    return () => s.off(evento, handler);
}

export const socketAsistenciaConectado = () => Boolean(socket?.connected);
