// Aviso para que AsistenciaLayout recargue los contadores del menú ("Equipo hoy", "Horas
// extra") cuando una pantalla cambia algo que los afecta sin cambiar de ruta.
const EVENTO_CONTADORES = 'asistencia:contadores';

export function avisarCambioContadores() {
    window.dispatchEvent(new Event(EVENTO_CONTADORES));
}

export function alCambiarContadores(fn) {
    window.addEventListener(EVENTO_CONTADORES, fn);
    return () => window.removeEventListener(EVENTO_CONTADORES, fn);
}
