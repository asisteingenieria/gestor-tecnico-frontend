import React from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { Users, CalendarRange, ClipboardList, UserMinus, Palmtree } from 'lucide-react';
import { useBaseEquipo } from '../../utils/rutaEquipo';

// "Equipo" es una sola opción del menú con tres vistas: hoy (en vivo), el histórico mes a mes y las
// novedades de RRHH del equipo (asistencia.md §56), y los retiros de Claro para la Red Maestra (§59).
// El jefe las ve bajo /operaciones y el coordinador bajo /asistencia (§57).
const VISTAS = [
    { ruta: '/equipo', label: 'Hoy', icono: <Users size={14} strokeWidth={1.75} /> },
    { ruta: '/equipo/mes', label: 'Histórico', icono: <CalendarRange size={14} strokeWidth={1.75} /> },
    { ruta: '/equipo/novedades', label: 'Novedades', icono: <ClipboardList size={14} strokeWidth={1.75} /> },
    // Pasivo vacacional de su gente en días (claude/modulo recursoshumanos.md §58.6).
    { ruta: '/equipo/vacaciones', label: 'Vacaciones', icono: <Palmtree size={14} strokeWidth={1.75} /> },
    // Retiros solo para el jefe que gestiona (/operaciones); el coordinador no la ve (§61).
    { ruta: '/equipo/retiros', label: 'Retiros', icono: <UserMinus size={14} strokeWidth={1.75} />, soloGestion: true }
];

const SelectorVistaEquipo = () => {
    const base = useBaseEquipo();
    // La campaña elegida (§68) sigue al pasar de Hoy a Histórico; Novedades y Retiros son solo de su equipo.
    const [searchParams] = useSearchParams();
    const campania = searchParams.get('campania');
    const sufijo = (ruta) => (campania && (ruta === '/equipo' || ruta === '/equipo/mes') ? `?campania=${encodeURIComponent(campania)}` : '');
    return (
        <div className="ai-seg" aria-label="Vista del equipo">
            {VISTAS.filter((v) => !v.soloGestion || base === '/operaciones').map(({ ruta, label, icono }) => (
                <NavLink key={ruta} to={`${base}${ruta}${sufijo(ruta)}`} end className={({ isActive }) => (isActive ? 'is-active' : '')}>
                    {icono} {label}
                </NavLink>
            ))}
        </div>
    );
};

export default SelectorVistaEquipo;
