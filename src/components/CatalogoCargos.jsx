import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Plus, Search, Edit3, Trash2, X, AlertTriangle, Loader2, Building2 } from 'lucide-react';
import { cargoService } from '../services/api';
import { formatearMiles } from '../utils/catalogosRRHH';

// Catálogo de cargos para RRHH y financiera (claude/modulo recursoshumanos.md §61). Antes no había pantalla:
// un cargo nuevo solo entraba por SQL y el cargue masivo rechazaba el archivo si el cargo no existía.
// Cada cargo lleva sus clientes con el sueldo de referencia: el formulario de empleados filtra los cargos
// por cliente con esa lista, así que un cargo sin el cliente no aparece al elegir ese cliente.

const FILTROS = [
    { clave: 'todos', label: 'Todos' },
    { clave: 'sin_clientes', label: 'Sin clientes' },
    { clave: 'sin_uso', label: 'Sin empleados' }
];

const pesos = (v) => `$ ${formatearMiles(v)}`;

const CatalogoCargos = () => {
    const [cargos, setCargos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [editando, setEditando] = useState(null); // null | 'nuevo' | cargo
    const [eliminando, setEliminando] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const { data } = await cargoService.listar();
            setCargos(data.cargos);
            setClientes(data.clientes);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudieron cargar los cargos');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return cargos.filter((c) => {
            if (filtro === 'sin_clientes' && c.referencias.length) return false;
            if (filtro === 'sin_uso' && c.contratos_total) return false;
            if (!q) return true;
            return c.nombre.toLowerCase().includes(q)
                || c.referencias.some((r) => r.cliente_nombre.toLowerCase().includes(q));
        });
    }, [cargos, busqueda, filtro]);

    const conteo = {
        todos: cargos.length,
        sin_clientes: cargos.filter((c) => !c.referencias.length).length,
        sin_uso: cargos.filter((c) => !c.contratos_total).length
    };

    const alGuardar = (mensaje) => {
        setEditando(null);
        setAviso(mensaje);
        cargar();
    };

    return (
        <div className="ai-scope">
            <div className="ai-content">
                <div className="ai-page-head">
                    <div>
                        <h1 className="ai-page-title">Cargos</h1>
                        <p className="ai-page-sub">
                            Catálogo de cargos y sus clientes con el sueldo de referencia. El formulario y el cargue masivo de
                            empleados usan esta lista.
                        </p>
                    </div>
                    <button type="button" onClick={() => { setAviso(''); setEditando('nuevo'); }} className="ai-btn ai-btn--primary">
                        <Plus size={16} /> Nuevo cargo
                    </button>
                </div>

                {error && <Mensaje tipo="danger">{error}</Mensaje>}
                {aviso && <Mensaje tipo="success" onCerrar={() => setAviso('')}>{aviso}</Mensaje>}

                <div className="ai-card">
                    <div className="ai-toolbar">
                        <div className="ai-search" style={{ maxWidth: 380 }}>
                            <Search size={16} />
                            <input
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar cargo o cliente"
                                style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, color: 'var(--ink)', font: 'inherit' }}
                            />
                        </div>
                        <div className="ai-seg">
                            {FILTROS.map((f) => (
                                <span
                                    key={f.clave}
                                    role="button"
                                    tabIndex={0}
                                    className={filtro === f.clave ? 'is-active' : ''}
                                    onClick={() => setFiltro(f.clave)}
                                    onKeyDown={(e) => e.key === 'Enter' && setFiltro(f.clave)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {f.label} <span className="ai-count">{conteo[f.clave]}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {cargando ? (
                        <div className="ai-empty"><Loader2 className="animate-spin" size={22} /> Cargando cargos…</div>
                    ) : visibles.length === 0 ? (
                        <div className="ai-empty">
                            <div className="ai-modal-icon"><Briefcase size={22} /></div>
                            {cargos.length ? 'Ningún cargo coincide con la búsqueda.' : 'Todavía no hay cargos.'}
                        </div>
                    ) : (
                        <table className="ai-table">
                            <thead>
                                <tr>
                                    <th>Cargo</th>
                                    <th>Clientes y sueldo de referencia</th>
                                    <th style={{ textAlign: 'right' }}>Empleados activos</th>
                                    <th className="ai-td-actions" />
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map((c) => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                                        <td style={{ whiteSpace: 'normal' }}>
                                            {c.referencias.length ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {c.referencias.map((r) => (
                                                        <span key={r.id} className="ai-badge ai-badge--info" title={`${r.cliente_nombre}: ${pesos(r.salario)}`}>
                                                            {r.cliente_nombre} · {pesos(r.salario)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="ai-badge ai-badge--warning" title="No aparece al elegir un cliente que tenga cargos asignados">
                                                    Sin clientes
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }} className="ai-num">
                                            {c.contratos_activos}
                                            {c.contratos_total > c.contratos_activos && (
                                                <span className="ai-muted" style={{ fontSize: 12 }}> · {c.contratos_total} en total</span>
                                            )}
                                        </td>
                                        <td className="ai-td-actions">
                                            <div className="ai-row-actions">
                                                <button type="button" className="ai-icon-btn" title="Editar" onClick={() => { setAviso(''); setEditando(c); }}>
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="ai-icon-btn ai-icon-btn--danger"
                                                    title={c.contratos_total || c.traspasos ? 'No se puede eliminar: lo usan empleados o traspasos' : 'Eliminar'}
                                                    disabled={Boolean(c.contratos_total || c.traspasos)}
                                                    style={c.contratos_total || c.traspasos ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                                                    onClick={() => setEliminando(c)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {editando && (
                <FormularioCargo
                    cargo={editando === 'nuevo' ? null : editando}
                    clientes={clientes}
                    onCerrar={() => setEditando(null)}
                    onGuardado={alGuardar}
                />
            )}
            {eliminando && (
                <ConfirmarEliminarCargo
                    cargo={eliminando}
                    onCerrar={() => setEliminando(null)}
                    onEliminado={(m) => { setEliminando(null); setAviso(m); cargar(); }}
                />
            )}
        </div>
    );
};

const Mensaje = ({ tipo, children, onCerrar }) => (
    <div className={`ai-badge ai-badge--${tipo}`} style={{ height: 'auto', padding: '10px 14px', width: 'fit-content', maxWidth: '100%' }}>
        <span className="ai-dot" />
        <span>{children}</span>
        {onCerrar && (
            <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0, marginLeft: 4 }}>
                <X size={14} />
            </button>
        )}
    </div>
);

const filaVacia = () => ({ clave: Math.random().toString(36).slice(2), cliente_id: '', salario: '' });

const FormularioCargo = ({ cargo, clientes, onCerrar, onGuardado }) => {
    const [nombre, setNombre] = useState(cargo?.nombre || '');
    const [filas, setFilas] = useState(() => (cargo?.referencias?.length
        ? cargo.referencias.map((r) => ({ clave: String(r.id), cliente_id: String(r.cliente_id), salario: formatearMiles(r.salario) }))
        : [filaVacia()]));
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [parecidos, setParecidos] = useState(null);

    const cambiarFila = (clave, campo, valor) => {
        setParecidos(null);
        setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, [campo]: valor } : f)));
    };

    const guardar = async (confirmarParecido = false) => {
        setError('');
        // Las filas en blanco (sin cliente ni sueldo) se ignoran; las incompletas las valida el servidor.
        const referencias = filas
            .filter((f) => f.cliente_id || String(f.salario).trim())
            .map((f) => ({ cliente_id: f.cliente_id, salario: String(f.salario).replace(/\D/g, '') }));
        const cuerpo = { nombre, referencias, confirmar_parecido: confirmarParecido };
        setGuardando(true);
        try {
            const { data } = cargo ? await cargoService.actualizar(cargo.id, cuerpo) : await cargoService.crear(cuerpo);
            onGuardado(data.message);
        } catch (err) {
            const d = err.response?.data;
            if (d?.codigo === 'CARGO_PARECIDO') setParecidos(d.parecidos || []);
            else setError(d?.message || 'No se pudo guardar el cargo');
        } finally {
            setGuardando(false);
        }
    };

    const enUso = cargo && cargo.contratos_total > 0;

    return (
        // Sin cerrar al hacer clic fuera: perdería lo escrito. Se cierra con Cancelar o la X.
        <div className="ai-overlay ai-scope">
            <div className="ai-modal" style={{ maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }}>
                <div className="ai-modal-head">
                    <div className="ai-modal-icon"><Briefcase size={20} /></div>
                    <div>
                        <h2 className="ai-modal-title">{cargo ? 'Editar cargo' : 'Nuevo cargo'}</h2>
                        <p className="ai-modal-sub">El nombre se guarda en mayúsculas, como el resto del catálogo</p>
                    </div>
                    <button type="button" className="ai-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
                </div>

                <form className="ai-modal-body" onSubmit={(e) => { e.preventDefault(); guardar(false); }} style={{ display: 'grid', gap: 16 }}>
                    <label className="ai-field">
                        <span className="ai-label">Nombre del cargo <em>*</em></span>
                        <input
                            className="ai-input"
                            value={nombre}
                            maxLength={80}
                            onChange={(e) => { setNombre(e.target.value); setParecidos(null); }}
                            placeholder="Ej.: AUXILIAR DE NÓMINA"
                            autoFocus
                        />
                        {enUso && (
                            <span className="ai-help">
                                Lo tienen {cargo.contratos_total} contrato{cargo.contratos_total === 1 ? '' : 's'}: si lo renombras, el nombre
                                cambia también en sus fichas.
                            </span>
                        )}
                    </label>

                    <div>
                        <p className="ai-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Building2 size={15} /> Clientes y sueldo de referencia
                        </p>
                        <p className="ai-help" style={{ marginBottom: 10 }}>
                            Al registrar un empleado, el cargo solo aparece en los clientes de esta lista y el sueldo se sugiere con
                            este valor. Un mismo cliente puede tener varios sueldos.
                        </p>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {filas.map((f) => (
                                <div key={f.clave} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
                                    <select className="ai-input" value={f.cliente_id} onChange={(e) => cambiarFila(f.clave, 'cliente_id', e.target.value)} aria-label="Cliente">
                                        <option value="">Elige el cliente</option>
                                        {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                    <input
                                        className="ai-input ai-num"
                                        inputMode="numeric"
                                        value={f.salario}
                                        onChange={(e) => cambiarFila(f.clave, 'salario', formatearMiles(e.target.value.replace(/\D/g, '')))}
                                        placeholder="Sueldo, ej.: 1.423.500"
                                        aria-label="Sueldo de referencia"
                                    />
                                    <button
                                        type="button"
                                        className="ai-icon-btn ai-icon-btn--danger"
                                        title="Quitar"
                                        onClick={() => setFilas((fs) => (fs.length > 1 ? fs.filter((x) => x.clave !== f.clave) : [filaVacia()]))}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" style={{ marginTop: 8 }} onClick={() => setFilas((fs) => [...fs, filaVacia()])}>
                            <Plus size={14} /> Agregar cliente
                        </button>
                    </div>

                    {parecidos && (
                        <div style={{ display: 'flex', gap: 10, padding: 12, borderRadius: 10, background: 'var(--warning-soft)', color: 'var(--ink)' }}>
                            <AlertTriangle size={18} style={{ color: 'var(--warning)', flex: 'none', marginTop: 1 }} />
                            <div style={{ fontSize: 13 }}>
                                Ya existe un cargo parecido: <strong>{parecidos.map((p) => p.nombre).join(', ')}</strong>. Si es el mismo,
                                usa ese en vez de crear otro.
                                <div style={{ marginTop: 8 }}>
                                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" disabled={guardando} onClick={() => guardar(true)}>
                                        Es distinto, guardar de todos modos
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <p className="ai-help is-error" style={{ fontSize: 13 }}>{error}</p>}

                    <div className="ai-modal-foot" style={{ margin: '0 -24px -24px' }}>
                        <button type="button" className="ai-btn ai-btn--secondary" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="ai-btn ai-btn--primary" disabled={guardando || !nombre.trim()}>
                            {guardando && <Loader2 size={16} className="animate-spin" />}
                            {cargo ? 'Guardar cambios' : 'Crear cargo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ConfirmarEliminarCargo = ({ cargo, onCerrar, onEliminado }) => {
    const [eliminando, setEliminando] = useState(false);
    const [error, setError] = useState('');

    const eliminar = async () => {
        setEliminando(true);
        setError('');
        try {
            const { data } = await cargoService.eliminar(cargo.id);
            onEliminado(data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo eliminar el cargo');
            setEliminando(false);
        }
    };

    return (
        <div className="ai-overlay ai-scope" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
            <div className="ai-modal ai-modal--sm">
                <div className="ai-modal-head">
                    <div className="ai-modal-icon ai-modal-icon--danger"><Trash2 size={20} /></div>
                    <div>
                        <h2 className="ai-modal-title">Eliminar cargo</h2>
                        <p className="ai-modal-sub">Se borra {cargo.nombre} y sus sueldos de referencia. No se puede deshacer.</p>
                    </div>
                </div>
                {error && <p className="ai-help is-error" style={{ padding: '0 24px 12px', fontSize: 13 }}>{error}</p>}
                <div className="ai-modal-foot">
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={onCerrar}>Cancelar</button>
                    <button type="button" className="ai-btn ai-btn--danger" onClick={eliminar} disabled={eliminando}>
                        {eliminando && <Loader2 size={16} className="animate-spin" />} Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CatalogoCargos;
