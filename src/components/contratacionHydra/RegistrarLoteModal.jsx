import React, { useEffect, useState } from 'react';
import { UserCheck, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { contratacionHydraService } from '../../services/api';
import { nombrePropio } from '../../utils/formatoRRHH';
import { mensajeError } from './seccionesUI';

/**
 * Registro del lote como empleados. Siempre simula primero (el backend hace todo el registro
 * y lo revierte) y solo habilita "Registrar" si la simulación pasó: así RRHH ve todos los
 * problemas antes de tocar nada. El registro real es todo o nada.
 */
const RegistrarLoteModal = ({ lote, onClose, onRegistrado }) => {
    const [fase, setFase] = useState('simulando'); // simulando | simulado | error | registrando | registrado
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let vigente = true;
        contratacionHydraService.registrarLote(lote.idhydra_lote, { simular: true })
            .then(({ data }) => { if (vigente) { setResultado(data); setFase('simulado'); } })
            .catch((err) => { if (vigente) { setError(mensajeError(err, 'La simulación falló')); setFase('error'); } });
        return () => { vigente = false; };
    }, [lote.idhydra_lote]);

    const registrar = async () => {
        setFase('registrando');
        try {
            const { data } = await contratacionHydraService.registrarLote(lote.idhydra_lote);
            setResultado(data);
            setFase('registrado');
        } catch (err) {
            setError(mensajeError(err, 'No se pudo registrar el lote'));
            setFase('error');
        }
    };

    const cerrar = () => {
        if (fase === 'registrado') onRegistrado();
        else onClose();
    };

    return (
        <div className="ai-overlay ai-scope" onClick={fase === 'registrando' ? undefined : cerrar}>
            <div className="ai-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className={`ai-modal-icon${fase === 'error' ? ' ai-modal-icon--danger' : ''}`}>
                        {fase === 'error' ? <AlertTriangle size={20} strokeWidth={1.75} /> : <UserCheck size={20} strokeWidth={1.75} />}
                    </span>
                    <div>
                        <h2 className="ai-modal-title">
                            {fase === 'registrado' ? 'Lote registrado' : `Registrar "${lote.nombre}"`}
                        </h2>
                        <p className="ai-modal-sub">
                            {fase === 'registrado'
                                ? 'Los empleados ya existen en Gestor. Hydra recibirá el aviso y los marcará como contratados.'
                                : 'Se crean todos los empleados o ninguno. Primero se simula el registro para ver si hay problemas.'}
                        </p>
                    </div>
                </div>

                <div className="ai-modal-body" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    {(fase === 'simulando' || fase === 'registrando') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', justifyContent: 'center' }}>
                            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--primary)' }} />
                            {fase === 'simulando' ? 'Simulando el registro…' : 'Registrando empleados…'}
                        </div>
                    )}

                    {fase === 'error' && error && (
                        <div>
                            <p style={{ margin: '0 0 10px', fontWeight: 600 }}>{error.mensaje}</p>
                            {error.detalles.length > 0 && (
                                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'grid', gap: 6 }}>
                                    {error.detalles.map(d => <li key={d}>{d}</li>)}
                                </ul>
                            )}
                            <p className="ai-help" style={{ marginTop: 12 }}>Corrige los candidatos indicados (o descártalos) y vuelve a intentarlo.</p>
                        </div>
                    )}

                    {(fase === 'simulado' || fase === 'registrado') && resultado && (
                        <div>
                            <p style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                                <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                                {resultado.message}
                            </p>
                            <table className="ai-table ai-table--dense">
                                <thead><tr><th>Candidato</th>{fase === 'registrado' && <th>Empleado #</th>}</tr></thead>
                                <tbody>
                                    {resultado.empleados.map(e => (
                                        <tr key={e.id}>
                                            <td>{nombrePropio(e.nombre_completo)}</td>
                                            {fase === 'registrado' && <td className="ai-num">{e.users_company_id}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="ai-modal-foot">
                    {fase === 'registrado' ? (
                        <button type="button" className="ai-btn ai-btn--primary" onClick={cerrar}>Listo</button>
                    ) : (
                        <>
                            <button type="button" className="ai-btn ai-btn--secondary" onClick={cerrar} disabled={fase === 'registrando'}>
                                {fase === 'error' ? 'Cerrar' : 'Cancelar'}
                            </button>
                            {fase !== 'error' && (
                                <button type="button" className="ai-btn ai-btn--primary" onClick={registrar} disabled={fase !== 'simulado'}>
                                    {fase === 'registrando' ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                    Registrar {resultado?.empleados?.length ?? ''} empleado(s)
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegistrarLoteModal;
