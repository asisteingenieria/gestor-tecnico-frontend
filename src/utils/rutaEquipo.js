import { useLocation } from 'react-router-dom';

// Las pantallas de "Equipo" (hoy, histórico, novedades y trazabilidad) las usan el jefe de equipo, bajo
// /operaciones, y el coordinador (jefe inmediato), bajo /asistencia (asistencia.md §57). Los enlaces
// entre ellas se arman con la base de la ruta actual.
export function useBaseEquipo() {
    const { pathname } = useLocation();
    return pathname.startsWith('/asistencia') ? '/asistencia' : '/operaciones';
}
