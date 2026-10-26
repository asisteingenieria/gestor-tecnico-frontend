import { Bath, Coffee, Utensils, GraduationCap } from 'lucide-react';

// Estados de pausa que llegan de AsisLock (asistencia.md §34). Baño, break y almuerzo descuentan
// del tiempo laborado; capacitación cuenta como laborada.
export const PAUSAS = {
    bano: { etiqueta: 'Baño', enEstado: 'En baño', terminar: 'Volver del baño', Icono: Bath, badge: 'ai-badge--info' },
    break: { etiqueta: 'Break', enEstado: 'En break', terminar: 'Terminar break', Icono: Coffee, badge: 'ai-badge--info' },
    almuerzo: { etiqueta: 'Almuerzo', enEstado: 'En almuerzo', terminar: 'Terminar almuerzo y volver', Icono: Utensils, badge: 'ai-badge--warning' },
    capacitacion: { etiqueta: 'Capacitación', enEstado: 'En capacitación', terminar: 'Terminar capacitación', Icono: GraduationCap, badge: 'ai-badge--success' }
};

export const datosPausa = (tipo) => PAUSAS[tipo] || { etiqueta: 'Pausa', enEstado: 'En pausa', terminar: 'Terminar pausa', Icono: Coffee, badge: 'ai-badge--info' };
