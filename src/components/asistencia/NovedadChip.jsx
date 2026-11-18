import React from 'react';
import { ClipboardList } from 'lucide-react';
import { etiquetaNovedad, tituloNovedad } from '../../utils/novedadesAsistencia';

// Distintivo de "tiene una novedad de RRHH" junto al nombre (Hoy e Histórico, asistencia.md §71). El tipo
// completo y las fechas van en el title; nada de diagnóstico.
const NovedadChip = ({ novedad, texto, titulo }) => {
    if (!novedad && !texto) return null;
    return (
        <span className="ai-nov-chip" title={titulo || (novedad ? tituloNovedad(novedad) : texto)}>
            <ClipboardList size={12} strokeWidth={2.2} aria-hidden="true" />
            {texto || etiquetaNovedad(novedad.tipo)}
        </span>
    );
};

export default NovedadChip;
