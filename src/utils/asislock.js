import { Building2, Home, Fingerprint, MousePointerClick, UserCog } from 'lucide-react';
import { formatearHora12 } from './tiempoAsistencia';

// Cómo entró la persona según AsisLock (`conectado_biometrico` del login, asistencia.md §29).
export const MODALIDAD_INGRESO = {
    presencial: {
        label: 'Presencial',
        detalle: 'Puso la huella en el biométrico y cruzó el molinete',
        Icono: Building2,
        clase: 'ai-badge--success'
    },
    teletrabajo: {
        label: 'Teletrabajo',
        detalle: 'Se conectó en AsisLock sin pasar por el molinete',
        Icono: Home,
        clase: 'ai-badge--info'
    },
    // No viene de AsisLock: la jornada la abrió el molinete (asistencia.md §89).
    biometrico: {
        label: 'Biométrico',
        detalle: 'Entró solo con el biométrico del molinete, sin AsisLock',
        Icono: Fingerprint,
        clase: 'ai-badge--neutral'
    },
    portal: {
        label: 'Portal',
        detalle: 'Abrió la jornada desde Mi jornada en el portal',
        Icono: MousePointerClick,
        clase: 'ai-badge--neutral'
    },
    manual: {
        label: 'Manual',
        detalle: 'La entrada la registró su jefe a mano',
        Icono: UserCog,
        clase: 'ai-badge--warning'
    }
};

// Sin AsisLock, con qué se abrió la jornada (`origen` del evento de entrada).
const INGRESO_POR_ORIGEN = { molinete: 'biometrico', empleado: 'portal', director: 'manual' };

/**
 * Clave de MODALIDAD_INGRESO para una persona de Equipo hoy: la de AsisLock o, sin ella, cómo se abrió la jornada
 * (biométrico del molinete, portal o manual del jefe). El staff —Tecnología, RRHH…— nunca entra por AsisLock (§89).
 */
export const modalidadIngreso = (emp) => emp?.asislock?.modalidad || INGRESO_POR_ORIGEN[emp?.origen_entrada] || null;

// Estado de conexión en AsisLock en una línea: "Conectado desde 7:58 a. m." / "Desconectado desde…".
export function textoConexion(resumen) {
    if (!resumen?.ultimo_evento) return null;
    return `${resumen.conectado ? 'Conectado' : 'Desconectado'} desde ${formatearHora12(resumen.ultimo_evento.ocurrido_en)}`;
}
