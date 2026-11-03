import React from 'react';

// Pasos por el molinete de un día (staff: STAFF, ADMINISTRATIVO, TECNOLOGIA — backend asistencia.md §54).
// La primera marcación es la entrada; las intermedias son cruces, que NO descuentan tiempo.

const ACCION_TEXTO = {
    // La primera marcación del día abre la jornada, sea por el lector de entrada o el de salida.
    entrada: 'Primera marcación',
    salida: 'Salida de la jornada',
    cruce: 'Cruce intermedio',
    entrada_extra: 'Inicio hora extra',
    fin_extra: 'Fin hora extra'
};

const MOTIVO_TEXTO = {
    jornada_finalizada: 'Después de la salida',
    empleado_no_encontrado: 'Cédula sin ficha en RRHH',
    cedula_ambigua: 'Cédula repetida en RRHH',
    fuera_de_orden: 'Fuera de orden',
    hora_futura: 'Hora futura',
    demasiado_antiguo: 'Demasiado antigua',
    hora_invalida: 'Hora inválida'
};

const SENTIDO_TEXTO = { entrada: 'Entrada', salida: 'Salida', desconocido: '—' };

const textoResultado = (m) => (m.resultado === 'registrado'
    ? ACCION_TEXTO[m.accion] || m.accion
    : MOTIVO_TEXTO[m.motivo] || m.motivo || m.resultado);

const MarcacionesMolinete = ({ molinete }) => {
    if (!molinete?.marcaciones?.length) return null;
    return (
        <div className="ai-panel">
            <div className="ai-panel-head">
                <h3 className="ai-panel-title">Marcaciones del molinete</h3>
                {molinete.resumen && (
                    <span className="ai-muted" style={{ fontSize: 12 }}>
                        {molinete.resumen.total} pasos · {molinete.resumen.cruces_intermedios} cruces intermedios (no descuentan tiempo)
                    </span>
                )}
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="ai-table ai-table--dense">
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Lector</th>
                            <th>En la jornada</th>
                        </tr>
                    </thead>
                    <tbody>
                        {molinete.marcaciones.map((m, i) => (
                            <tr key={i}>
                                <td className="ai-num">{new Date(m.ocurrido_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                <td>
                                    {SENTIDO_TEXTO[m.sentido] || m.sentido}
                                    {m.lector && <span className="ai-muted" style={{ marginLeft: 6, fontSize: 12 }}>{m.lector}</span>}
                                </td>
                                <td>
                                    <span className={`ai-badge ${m.resultado === 'registrado' ? 'ai-badge--neutral' : 'ai-badge--warning'}`}>
                                        {textoResultado(m)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MarcacionesMolinete;
