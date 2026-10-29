import React from 'react';
import { CELDA } from '../../utils/llegadaAsistencia';

// Cuadrito de llegada de un día (colores en utils/llegadaAsistencia.js).
const CuadroLlegada = ({ clase, size = 16, title }) => (
    <i title={title} style={{
        display: 'inline-block', flex: 'none', width: size, height: size, borderRadius: 3,
        background: clase ? CELDA[clase].bg : 'transparent', border: clase ? 'none' : '1px dashed var(--border)'
    }} />
);

export default CuadroLlegada;
