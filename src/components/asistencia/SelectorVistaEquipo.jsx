import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, CalendarRange, ClipboardList, UserMinus } from 'lucide-react';
import { useBaseEquipo } from '../../utils/rutaEquipo';

// "Equipo" es una sola opción del menú con tres vistas: hoy (en vivo), el histórico mes a mes y las
// novedades de RRHH del equipo (asistencia.md §56), y los retiros de Claro para la Red Maestra (§59).
// El jefe las ve bajo /operaciones y el coordinador bajo /asistencia (§57).
const VISTAS = [
    { ruta: '/equipo', label: 'Hoy', icono: <Users size={14} strokeWidth={1.75} /> },
    { ruta: '/equipo/mes', label: 'Histórico', icono: <CalendarRange size={14} strokeWidth={1.75} /> },
    { ruta: '/equipo/novedades', label: 'Novedades', icono: <ClipboardList size={14} strokeWidth={1.75} /> },
    { ruta: '/equipo/retiros', label: 'Retiros', icono: <UserMinus size={14} strokeWidth={1.75} /> }
];

const SelectorVistaEquipo = () => {
    const base = useBaseEquipo();
    return (
        <div className="ai-seg" aria-label="Vista del equipo">
            {VISTAS.map(({ ruta, label, icono }) => (
                <NavLink key={ruta} to={`${base}${ruta}`} end className={({ isActive }) => (isActive ? 'is-active' : '')}>
                    {icono} {label}
                </NavLink>
            ))}
        </div>
    );
};

export default SelectorVistaEquipo;
