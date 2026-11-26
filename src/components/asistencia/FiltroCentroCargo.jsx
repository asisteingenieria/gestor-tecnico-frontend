import React from 'react';
import { primeraMayuscula } from '../../utils/formatoRRHH';
import { SIN_CARGO } from '../../hooks/useFiltroCentroCargo';

// Selectores de centro de costo y cargo de las vistas de Equipo (jefes, coordinador y financiera, asistencia.md §85).
// El estado vive en hooks/useFiltroCentroCargo.js.

/** Los dos selectores. Cada uno aparece si en el equipo hay más de un valor o ya hay uno elegido. */
export const SelectoresCentroCargo = ({ filtro, className = 'ai-input ai-monitor-select', style }) => {
    const { centro, cargo, setCentro, setCargo, centros, cargos, totalCentros, totalCargos, hayVariosCentros, hayVariosCargos } = filtro;
    return (
        <>
            {(hayVariosCentros || centro) && (
                <select className={className} style={style} value={centro} onChange={(e) => setCentro(e.target.value)} aria-label="Centro de costo">
                    <option value="">Todos los centros de costo ({totalCentros})</option>
                    {centros.map(([nombre, total]) => <option key={nombre} value={nombre}>{nombre} ({total})</option>)}
                </select>
            )}
            {(hayVariosCargos || cargo) && (
                <select className={className} style={style} value={cargo} onChange={(e) => setCargo(e.target.value)} aria-label="Cargo">
                    <option value="">Todos los cargos ({totalCargos})</option>
                    {cargos.map(([nombre, total]) => (
                        <option key={nombre} value={nombre}>{nombre === SIN_CARGO ? nombre : primeraMayuscula(nombre)} ({total})</option>
                    ))}
                </select>
            )}
        </>
    );
};
