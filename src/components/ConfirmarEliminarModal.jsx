import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { nombrePropio } from '../utils/formatoRRHH';

const ConfirmarEliminarModal = ({ isOpen, onClose, empleado, onConfirmar }) => {
    const [texto, setTexto] = useState('');
    const [eliminando, setEliminando] = useState(false);

    if (!isOpen || !empleado) return null;

    const cedula = empleado.numero_identificacion;
    const coincide = texto.trim() === cedula;

    const handleEliminar = async () => {
        if (!coincide) return;
        setEliminando(true);
        try {
            await onConfirmar(empleado.id);
            setTexto('');
        } finally {
            setEliminando(false);
        }
    };

    return (
        <div className="ai-overlay ai-scope" onClick={onClose}>
            <div className="ai-modal ai-modal--sm" onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon ai-modal-icon--danger">
                        <AlertTriangle size={20} strokeWidth={1.75} />
                    </span>
                    <div>
                        <h2 className="ai-modal-title">¿Eliminar a {nombrePropio(empleado.nombre_completo)}?</h2>
                        <p className="ai-modal-sub">Se eliminará su registro y se liberarán los activos asignados. Esta acción no se puede deshacer.</p>
                    </div>
                </div>
                <div className="ai-modal-body">
                    <div className="ai-field">
                        <label className="ai-label">Escribe <strong>{cedula}</strong> para confirmar</label>
                        <input
                            type="text"
                            className="ai-input"
                            placeholder="Número de identificación"
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
                <div className="ai-modal-foot">
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button
                        type="button"
                        className="ai-btn ai-btn--danger"
                        disabled={!coincide || eliminando}
                        onClick={handleEliminar}
                    >
                        {eliminando ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
                        Eliminar empleado
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmarEliminarModal;
