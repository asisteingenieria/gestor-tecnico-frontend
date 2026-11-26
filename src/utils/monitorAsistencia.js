import { Wifi, Coffee, Bath, Utensils, GraduationCap, Unplug } from 'lucide-react';
import { datosPausa } from './pausasAsistencia';
import { etiquetaNovedad, noAsistioPorNovedad } from './novedadesAsistencia';

// Lógica del monitor en vivo (asistencia.md §70), compartida por el Equipo del coordinador (MonitorEquipo) y el
// de jefes y financiera (EquipoAsistencia). Los tiempos los calcula el servidor (`segundos_en_jornada`,
// `segundos_en_estado`, `segundos_por_estado`, `veces_por_estado`); la pantalla solo sigue contando desde la
// última carga (hook useTiemposEnVivo).

const PAUSAS_CONOCIDAS = ['break', 'bano', 'almuerzo', 'capacitacion'];

// Estado fino de cada persona: conectado, la pausa en que está, desconectado de AsisLock, finalizado,
// novedad, descanso, ausente, no ha llegado o sin iniciar. `corre` = su tiempo sigue contando.
export function estadoMonitor(emp) {
    if (emp.estado === 'en_curso') return { clave: 'conectado', label: 'Conectado', corre: true };
    if (emp.estado === 'en_pausa' && emp.pausa_activa) {
        // Cada pausa de AsisLock con su clave (break, bano, almuerzo, capacitacion); una desconocida, 'pausa'.
        const tipo = emp.pausa_activa.tipo;
        return { clave: PAUSAS_CONOCIDAS.includes(tipo) ? tipo : 'pausa', label: datosPausa(tipo).etiqueta, corre: true };
    }
    if (emp.estado === 'en_pausa') return { clave: 'desconectado', label: 'Desconectado', corre: true };
    if (emp.estado === 'finalizada') return { clave: 'finalizado', label: 'Finalizado', corre: false };
    // Novedad de RRHH que cubre hoy (incapacidad, vacaciones, licencia…, §71): ni ausente ni "No ha llegado".
    if (noAsistioPorNovedad(emp)) return { clave: 'novedad', label: etiquetaNovedad(emp.novedad.tipo), corre: false };
    // Día de descanso de su malla (§73): no es "Sin iniciar". Si trabaja igual, sale en su estado real.
    if (emp.turno?.es_descanso && emp.estado === 'pendiente') return { clave: 'descanso', label: 'Descanso', corre: false };
    if (emp.estado === 'ausente') return { clave: 'ausente', label: 'Ausente', corre: false };
    // Sin entrada con su turno ya empezado (lo decide el servidor, §62); si no, aún no le toca, descansa o no tiene horario.
    if (emp.no_ha_llegado) return { clave: 'no_llego', label: 'No ha llegado', corre: false };
    return { clave: 'sin_iniciar', label: 'Sin iniciar', corre: false };
}

// Color (clase .ai-st--*) de cada clave de estadoMonitor.
const COLOR_DE = { pausa: 'break', ausente: 'no_llego' };
export const colorMonitor = (clave) => COLOR_DE[clave] || clave;

export const ORDEN_MONITOR = { conectado: 0, capacitacion: 1, break: 2, pausa: 2, bano: 3, almuerzo: 4, desconectado: 5, no_llego: 6, ausente: 6, novedad: 7, descanso: 8, sin_iniciar: 9, finalizado: 10 };

// Columnas por estado. `claves` = las de estadoMonitor que corren en esa columna. Mientras la persona está en
// una pausa, su columna cuenta desde que entró esta vez (con el acumulado del día debajo); fuera de ella muestra
// el acumulado del día y cuántas veces entró. Tiempo disponible es siempre el acumulado conectado.
export const COLUMNAS_ESTADO = [
    { id: 'conectado', label: 'Tiempo disponible', icono: Wifi, claves: ['conectado'], soloAcumulado: true },
    { id: 'break', label: 'Break', icono: Coffee, claves: ['break', 'pausa'] },
    { id: 'bano', label: 'Baño', icono: Bath, claves: ['bano'] },
    { id: 'almuerzo', label: 'Almuerzo', icono: Utensils, claves: ['almuerzo'] },
    { id: 'capacitacion', label: 'Capacitación', icono: GraduationCap, claves: ['capacitacion'] },
    { id: 'desconectado', label: 'Desconectado', icono: Unplug, claves: ['desconectado'] }
];

// "08:01:46" en hora de Bogotá.
export function hora24(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
}

export function hhmmss(totalSegundos) {
    const s = Math.max(0, Math.floor(totalSegundos));
    const dos = (n) => String(n).padStart(2, '0');
    return `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
}

// El login de AsisLock si lo hay; si no, la entrada de la jornada (portal o molinete).
export const horaLoginDe = (emp) => emp.asislock?.primer_login || emp.entrada_en || null;
