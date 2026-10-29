import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, CalendarRange } from 'lucide-react';

// "Equipo" es una sola opción del menú con dos vistas: hoy (en vivo) y el histórico mes a mes.
const VISTAS = [
    { to: '/operaciones/equipo', label: 'Hoy', icono: <Users size={14} strokeWidth={1.75} /> },
    { to: '/operaciones/equipo/mes', label: 'Histórico', icono: <CalendarRange size={14} strokeWidth={1.75} /> }
];

const SelectorVistaEquipo = () => (
    <div className="ai-seg" aria-label="Vista del equipo">
        {VISTAS.map(({ to, label, icono }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'is-active' : '')}>
                {icono} {label}
            </NavLink>
        ))}
    </div>
);

export default SelectorVistaEquipo;
