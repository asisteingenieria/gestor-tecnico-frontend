import React from 'react';
import { Timer } from 'lucide-react';
import { Pastilla } from '../ui';
import { COLUMNAS_ESTADO, colorMonitor, hhmmss, hora24, horaLoginDe, usaAsislock } from '../../utils/monitorAsistencia';
import { tardeExacto } from '../../utils/llegadaAsistencia';

// Celdas del monitor en vivo compartidas por MonitorEquipo (coordinador) y EquipoAsistencia (jefes y financiera).

// Hora del login con la pastilla roja "Tarde +mm:ss" si llegó tarde.
export const CeldaLogin = ({ emp }) => (
    <td className="ai-monitor-centro ai-monitor-login">
        {hora24(horaLoginDe(emp)) || '—'}
        {emp.minutos_tarde > 0 && (
            <span className="ai-monitor-tarde" title={`Llegó ${tardeExacto(emp.segundos_tarde, emp.minutos_tarde)} tarde a su turno de las ${(emp.turno?.hora_entrada || '').slice(0, 5)}`}>
                Tarde +{tardeExacto(emp.segundos_tarde, emp.minutos_tarde)}
            </span>
        )}
    </td>
);

export const CeldaTiempoTotal = ({ total }) => (
    <td className="ai-monitor-centro">
        {total != null
            ? <span className="ai-monitor-tiempo"><Timer size={16} strokeWidth={2} aria-hidden="true" />{hhmmss(total)}</span>
            : '—'}
    </td>
);

// Una celda por columna de COLUMNAS_ESTADO: el tiempo en curso en pastilla de color si está en ese estado,
// el acumulado del día y cuántas veces entró.
// Quien no usa AsisLock (staff, §83) no tiene pausas: una sola celda en lugar de seis guiones. Si en la tabla
// nadie usa AsisLock, las columnas ni se muestran (`conColumnas` en false).
export const CeldasEstado = ({ fila, acumuladoDe, enEstadoDe, conColumnas = true }) => {
    const { emp, est } = fila;
    if (!conColumnas) return null;
    if (!usaAsislock(emp)) {
        return (
            <td colSpan={COLUMNAS_ESTADO.length} className="ai-monitor-centro"
                title="Staff: no entra a AsisLock, así que no tiene break, baño, almuerzo, capacitación ni desconexiones">
                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>No usa AsisLock · marca por molinete o portal</span>
            </td>
        );
    }
    return COLUMNAS_ESTADO.map((c) => {
        const acum = acumuladoDe(fila, c);
        const activo = est.corre && c.claves.includes(est.clave);
        const veces = c.soloAcumulado ? 0 : (emp.veces_por_estado?.[c.id] || 0);
        const enCurso = activo && !c.soloAcumulado ? enEstadoDe(fila) : null;
        return (
            <td key={c.id} className="ai-monitor-centro">
                {activo && acum != null ? (
                    <Pastilla color={colorMonitor(c.id)} title={enCurso != null ? 'Desde que entró esta vez' : 'Acumulado del día'}>
                        {hhmmss(enCurso ?? acum)}
                    </Pastilla>
                ) : (acum || veces ? hhmmss(acum ?? 0) : '—')}
                {(enCurso != null || veces > 0) && (
                    <span className="ai-monitor-sub">
                        {enCurso != null && <>Acum. {hhmmss(acum)}</>}
                        {enCurso != null && veces > 0 && ' · '}
                        {veces > 0 && <>{veces} {veces === 1 ? 'vez' : 'veces'}</>}
                    </span>
                )}
            </td>
        );
    });
};
