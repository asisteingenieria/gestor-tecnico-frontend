import React from 'react';
import { primeraMayuscula } from '../../utils/formatoRRHH';
import { TODAS } from '../../hooks/useAlcanceEquipo';

// Filtro de campaña de "Equipo" para quien ve todas las campañas (backend asistencia.md §68).
// La primera opción es su equipo, que es lo que ve al entrar.
const FiltroCampaniaEquipo = ({ alcance, campanias, onChange, incluirTodas = true }) => (
    <select
        className="ai-input" style={{ width: 'auto', maxWidth: 260 }}
        value={!incluirTodas && alcance === TODAS ? '' : alcance}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Campaña"
    >
        <option value="">Mi equipo</option>
        {incluirTodas && <option value={TODAS}>Todas las campañas</option>}
        {campanias.map((c) => (
            <option key={c.idcampania} value={String(c.idcampania)}>{primeraMayuscula(c.nombre)} ({c.empleados})</option>
        ))}
    </select>
);

export default FiltroCampaniaEquipo;
