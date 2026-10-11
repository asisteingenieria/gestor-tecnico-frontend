import React, { useState } from 'react';
import { UserX, Loader2 } from 'lucide-react';
import { contratacionHydraService } from '../../services/api';
import { nombrePropio } from '../../utils/formatoRRHH';
import { mensajeError } from './seccionesUI';

/** Descartar exige motivo: Gestor se lo informa a Hydra. */
const DescartarCandidatoModal = ({ candidato, onClose, onDescartado }) => {
    const [motivo, setMotivo] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const confirmar = async () => {
        setGuardando(true);
        setError('');
        try {
            await contratacionHydraService.descartar(candidato.id, motivo.trim());
            onDescartado();
        } catch (err) {
            setError(mensajeError(err, 'No se pudo descartar').mensaje);
            setGuardando(false);
        }
    };

    return (
        <div className="ai-overlay ai-scope" style={{ zIndex: 60 }} onClick={onClose}>
            <div className="ai-modal ai-modal--sm" onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon ai-modal-icon--danger"><UserX size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h2 className="ai-modal-title">¿Descartar a {nombrePropio(candidato.nombre_completo)}?</h2>
                        <p className="ai-modal-sub">No se registrará como empleado y Hydra recibirá el motivo. Deja de contar para el lote.</p>
                    </div>
                </div>
                <div className="ai-modal-body">
                    <div className="ai-field">
                        <label className="ai-label">Motivo<em>*</em></label>
                        <textarea
                            className="ai-input"
                            style={{ height: 88, paddingTop: 8, resize: 'vertical' }}
                            maxLength={255}
                            placeholder="Ej. No se presentó a firmar el contrato"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {error && <div className="ai-help is-error" style={{ marginTop: 8 }}>{error}</div>}
                </div>
                <div className="ai-modal-foot">
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button type="button" className="ai-btn ai-btn--danger" disabled={!motivo.trim() || guardando} onClick={confirmar}>
                        {guardando ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                        Descartar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DescartarCandidatoModal;
