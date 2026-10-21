import React from 'react';
import { Fingerprint } from 'lucide-react';
import { formatearHora12 } from '../../utils/tiempoAsistencia';
import { MODALIDAD_INGRESO, textoConexion } from '../../utils/asislock';

// Lo que AsisLock reporta de cada día (asistencia.md §29-§30): cómo entró la persona
// (`conectado_biometrico` del login), sus logins/logouts, IP y aplicativo. Es informativo:
// el tiempo laborado se calcula con los eventos de la jornada, no con esto.

const ACCION = {
    entrada: 'Abrió la jornada',
    reconexion: 'Reconexión',
    desconexion: 'Desconexión',
    salida: 'Salida'
};

const MOTIVO = {
    ya_conectado: 'Ya estaba conectado',
    ya_desconectado: 'Ya estaba desconectado',
    sin_entrada: 'Sin entrada ese día',
    jornada_finalizada: 'La jornada ya estaba cerrada',
    fuera_de_orden: 'Llegó fuera de orden',
    hora_futura: 'Hora en el futuro',
    demasiado_antiguo: 'Llegó con demasiado atraso',
    fecha_invalida: 'Fecha inválida',
    hora_invalida: 'Hora inválida',
    cedula_ambigua: 'Cédula repetida en RRHH'
};

export const BadgeIngreso = ({ modalidad, vacio = '—' }) => {
    const m = MODALIDAD_INGRESO[modalidad];
    if (!m) return <span className="ai-muted">{vacio}</span>;
    const { Icono } = m;
    return (
        <span className={`ai-badge ${m.clase}`} title={m.detalle}>
            <Icono size={12} strokeWidth={1.75} /> {m.label}
        </span>
    );
};

// Franja de Mi jornada: cómo entré hoy y mi estado en AsisLock.
export const ResumenAsislock = ({ resumen }) => {
    if (!resumen) return null;
    return (
        <div className="ai-row" style={{ gap: 10, flexWrap: 'wrap', fontSize: 13, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--surface-100)', border: '1px solid var(--border)' }}>
            <Fingerprint size={16} strokeWidth={1.75} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 600 }}>AsisLock</span>
            <BadgeIngreso modalidad={resumen.modalidad} vacio="Ingreso sin dato" />
            {resumen.primer_login && <span className="ai-muted">Primer login {formatearHora12(resumen.primer_login)}</span>}
            <span className="ai-muted">· {textoConexion(resumen)}</span>
        </div>
    );
};

function resultadoTexto(r) {
    if (r.resultado === 'registrado') return ACCION[r.accion] || r.accion || 'Registrado';
    return MOTIVO[r.motivo] || r.motivo || r.resultado;
}

// Tabla de la trazabilidad: cada login/logout que AsisLock reportó ese día.
export const RegistrosAsislock = ({ registros }) => {
    if (!registros?.length) return null;
    return (
        <div className="ai-panel">
            <div className="ai-panel-head">
                <h3 className="ai-panel-title">Registros de AsisLock</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="ai-table ai-table--dense">
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Evento</th>
                            <th>Ingreso</th>
                            <th>En la jornada</th>
                            <th>Aplicativo</th>
                            <th>IP local</th>
                            <th>IP pública</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registros.map((r, i) => (
                            <tr key={i}>
                                <td className="ai-num">{new Date(r.ocurrido_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                <td>{r.evento === 'login' ? 'Login' : 'Logout'}</td>
                                <td>
                                    {r.evento === 'login'
                                        ? <BadgeIngreso modalidad={r.modalidad} vacio={r.conectado_biometrico || '—'} />
                                        : <span className="ai-muted">—</span>}
                                </td>
                                <td>
                                    <span className={`ai-badge ${r.resultado === 'registrado' ? 'ai-badge--neutral' : 'ai-badge--warning'}`}>
                                        {resultadoTexto(r)}
                                    </span>
                                </td>
                                <td className="ai-muted">{r.aplicativo || '—'}</td>
                                <td className="ai-num ai-muted">{r.ip_local || '—'}</td>
                                <td className="ai-num ai-muted">{r.ip_publica || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
