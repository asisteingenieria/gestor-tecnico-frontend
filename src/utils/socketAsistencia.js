import io from 'socket.io-client';

// Un solo socket para las pantallas de asistencia. Al conectar (y al reconectar) se suscribe con
// el JWT a la sala de su ficha (y financiera a la de monitores); el backend avisa ahí cada
// cambio de jornada (AsisLock o portal) y la pantalla vuelve a pedir su estado a la API.
// Ver `asistencia:suscribir` en index.js.
let socket = null;
let tokenSuscrito = null;

function obtenerSocket() {
    if (!socket) {
        const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
        socket = io(base);
        socket.on('connect', () => {
            tokenSuscrito = localStorage.getItem('token');
            if (tokenSuscrito) socket.emit('asistencia:suscribir', tokenSuscrito);
        });
    } else if (socket.connected && localStorage.getItem('token') !== tokenSuscrito) {
        // Cambió la sesión sin recargar la página (logout + login de otra persona): reconectar
        // suelta las salas de la sesión anterior y se suscribe con la nueva.
        socket.disconnect().connect();
    }
    return socket;
}

// Devuelve la función para dejar de escuchar.
export function escucharAsistencia(evento, handler) {
    const s = obtenerSocket();
    s.on(evento, handler);
    return () => s.off(evento, handler);
}

// Cambios de jornada de OTROS empleados: al jefe le llegan los de su equipo (`asistencia:equipo`)
// y a financiera los de todos (`asistencia:monitor`). El handler recibe { tipo, usersCompanyId }.
// Con `esperaMs`, agrupa una ráfaga de avisos en una sola llamada (pantallas que recargan mucho).
export function escucharCambiosEmpleados(handler, esperaMs = 0) {
    let timer = null;
    const llamar = (datos) => {
        if (!esperaMs) {
            handler(datos);
            return;
        }
        clearTimeout(timer);
        timer = setTimeout(() => handler(datos), esperaMs);
    };
    const quitarEquipo = escucharAsistencia('asistencia:equipo', llamar);
    const quitarMonitor = escucharAsistencia('asistencia:monitor', llamar);
    return () => {
        clearTimeout(timer);
        quitarEquipo();
        quitarMonitor();
    };
}

export const socketAsistenciaConectado = () => Boolean(socket?.connected);
