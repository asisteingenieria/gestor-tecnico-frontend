// Vencimiento de la sesión (JWT). El backend firma 10 h para las cuentas de `users` y 5 h para las de
// empleado (asistencia.md §81). El frontend avisa 10 min antes y, al vencer, saca al login en ese momento.
//
// El vencimiento se guarda en hora LOCAL del navegador: al recibir el token se toma su duración
// (exp − iat) y se suma a Date.now(). Así no importa si el reloj del PC está corrido respecto al servidor.

const CLAVE_VENCE = 'token_vence';
export const AVISO_ANTES_MS = 10 * 60 * 1000;

function payloadDe(token) {
    try {
        const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(parte.padEnd(parte.length + ((4 - (parte.length % 4)) % 4), '=')));
    } catch {
        return null;
    }
}

/** Guarda el token y su vencimiento local. Llamar cada vez que llega un token nuevo. */
export function guardarSesion(token) {
    localStorage.setItem('token', token);
    const p = payloadDe(token);
    if (p?.exp && p?.iat) localStorage.setItem(CLAVE_VENCE, String(Date.now() + (p.exp - p.iat) * 1000));
    else localStorage.removeItem(CLAVE_VENCE);
}

export function borrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem(CLAVE_VENCE);
}

/** Milisegundos (epoch local) en que vence la sesión, o null si no hay token o no trae `exp`. */
export function vencimientoSesion() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const guardado = Number(localStorage.getItem(CLAVE_VENCE));
    if (guardado > 0) return guardado;
    // Sesiones abiertas antes de este cambio: no tienen el vencimiento local, se usa `exp` tal cual.
    const p = payloadDe(token);
    return p?.exp ? p.exp * 1000 : null;
}

/** Saca al login en el acto, con el aviso de sesión vencida. */
export function irAlLoginPorVencimiento() {
    borrarSesion();
    if (window.location.pathname !== '/login') window.location.replace('/login?sesion=vencida');
}
