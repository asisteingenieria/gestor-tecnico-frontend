import { Building2, Home } from 'lucide-react';
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
    }
};

// Estado de conexión en AsisLock en una línea: "Conectado desde 7:58 a. m." / "Desconectado desde…".
export function textoConexion(resumen) {
    if (!resumen?.ultimo_evento) return null;
    return `${resumen.conectado ? 'Conectado' : 'Desconectado'} desde ${formatearHora12(resumen.ultimo_evento.ocurrido_en)}`;
}
