import React, { useEffect, useState } from 'react';
import { redMaestraService } from '../../services/api';
import { ListChecks, X, Plus, Check, Edit3, Loader2 } from 'lucide-react';

/**
 * Valores de las listas desplegables de la Red Maestra (estado agente, cargo RM, estado RM,
 * observación y estado del requerimiento). No se borran: se desactivan, así los registros que
 * ya los usan los conservan.
 */
const ListasRedMaestraModal = ({ onClose, onCambio }) => {
    const [opciones, setOpciones] = useState([]);
    const [campos, setCampos] = useState([]);
    const [campo, setCampo] = useState('');
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [nuevo, setNuevo] = useState('');
    const [editando, setEditando] = useState(null); // { id, valor }
    const [hubo, setHubo] = useState(false);

    const cargar = async () => {
        try {
            const { data } = await redMaestraService.getOpciones();
            setOpciones(data.data || []);
            setCampos(data.campos || []);
            setCampo((actual) => actual || data.campos?.[0]?.campo || '');
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudieron cargar las listas');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const cerrar = () => {
        if (hubo) onCambio?.();
        onClose();
    };

    const ejecutar = async (accion) => {
        try {
            setError('');
            await accion();
            setHubo(true);
            await cargar();
            return true;
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo guardar');
            return false;
        }
    };

    const agregar = async (e) => {
        e.preventDefault();
        if (!nuevo.trim()) return;
        if (await ejecutar(() => redMaestraService.crearOpcion({ campo, valor: nuevo }))) setNuevo('');
    };

    const renombrar = async (e) => {
        e.preventDefault();
        if (await ejecutar(() => redMaestraService.actualizarOpcion(editando.id, { valor: editando.valor }))) setEditando(null);
    };

    const delCampo = opciones.filter((o) => o.campo === campo);

    return (
        <div className="ai-overlay ai-scope" onClick={cerrar}>
            <div className="ai-modal" style={{ width: 'min(640px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><ListChecks size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h2 className="ai-modal-title">Listas de la Red Maestra</h2>
                        <p className="ai-modal-sub">Los valores que se eligen en cada agente. Un valor en uso no se borra: se desactiva.</p>
                    </div>
                    <button className="ai-icon-btn" onClick={cerrar} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                </div>

                <div className="ai-modal-body ai-stack">
                    {error && <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', whiteSpace: 'normal' }}>{error}</div>}

                    <div className="ai-tabs" style={{ flexWrap: 'wrap' }}>
                        {campos.map((c) => (
                            <button key={c.campo} type="button" className={`ai-tab${c.campo === campo ? ' is-active' : ''}`}
                                onClick={() => { setCampo(c.campo); setEditando(null); }}>
                                {c.etiqueta}
                            </button>
                        ))}
                    </div>

                    {cargando ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 size={22} className="animate-spin" /></div>
                    ) : (
                        <div>
                            {delCampo.map((o) => (
                                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                                    {editando?.id === o.id ? (
                                        <form onSubmit={renombrar} className="ai-row" style={{ flex: 1, gap: 6 }}>
                                            <input className="ai-input" autoFocus value={editando.valor} maxLength={120}
                                                onChange={(e) => setEditando({ ...editando, valor: e.target.value })} style={{ flex: 1 }} />
                                            <button type="submit" className="ai-icon-btn" aria-label="Guardar"><Check size={16} strokeWidth={1.75} /></button>
                                            <button type="button" className="ai-icon-btn" aria-label="Cancelar" onClick={() => setEditando(null)}><X size={16} strokeWidth={1.75} /></button>
                                        </form>
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, color: o.activo ? 'var(--ink)' : 'var(--ink-subtle)', textDecoration: o.activo ? 'none' : 'line-through' }}>{o.valor}</span>
                                            <span className="ai-help">{o.usos} {o.usos === 1 ? 'uso' : 'usos'}</span>
                                            <button className="ai-icon-btn" aria-label="Renombrar" title="Renombrar (cambia en todos los registros)" onClick={() => setEditando({ id: o.id, valor: o.valor })}>
                                                <Edit3 size={15} strokeWidth={1.75} />
                                            </button>
                                            <button className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => ejecutar(() => redMaestraService.actualizarOpcion(o.id, { activo: !o.activo }))}>
                                                {o.activo ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                            <form onSubmit={agregar} className="ai-row" style={{ gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                <input className="ai-input" placeholder="Nuevo valor" value={nuevo} maxLength={120} onChange={(e) => setNuevo(e.target.value)} style={{ flex: 1 }} />
                                <button type="submit" className="ai-btn ai-btn--secondary" disabled={!nuevo.trim()}>
                                    <Plus size={15} strokeWidth={1.75} /> Agregar
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <div className="ai-modal-foot">
                    <button type="button" className="ai-btn ai-btn--primary" onClick={cerrar} style={{ marginLeft: 'auto' }}>Listo</button>
                </div>
            </div>
        </div>
    );
};

export default ListasRedMaestraModal;
