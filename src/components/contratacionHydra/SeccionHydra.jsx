import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Save, Loader2, AlertTriangle, Link2, CheckCircle2, Circle } from 'lucide-react';
import ComboboxBuscable from '../ComboboxBuscable';
import { contratacionHydraService } from '../../services/api';
import { formatearMiles, salariosReferencia, clienteDeCampania } from '../../utils/catalogosRRHH';
import {
    borradorDeSeccion, aplicarValoresPorDefecto, cuerpoDeBorrador, borradorCambio,
    ESTADO_SECCION, mensajeError
} from './seccionesUI';

/**
 * Una sección del checklist de contratación: sus campos, los valores de Hydra que no se
 * pudieron traducir, "Guardar" y el checkbox "Verificado".
 *
 * El backend decide si la sección está completa; aquí solo se muestra. El checkbox se
 * deshabilita mientras haya cambios sin guardar (se verifica lo guardado, no el borrador)
 * o mientras la sección tenga datos pendientes.
 */
const SeccionHydra = ({ seccion, evaluacion, candidato, catalogos, catalogosMapeo, editable, abierta, onToggle, onCandidato, onRecargar }) => {
    const base = useMemo(
        () => borradorDeSeccion(seccion, candidato.datos_empleado, catalogos),
        [seccion, candidato.datos_empleado, catalogos]
    );
    const [borrador, setBorrador] = useState(() => aplicarValoresPorDefecto(seccion, base, catalogos));
    const [guardando, setGuardando] = useState(false);
    const [verificando, setVerificando] = useState(false);
    const [error, setError] = useState(null);

    // Cuando el candidato cambia en el servidor (otra sección, un mapeo, un reenvío de
    // Hydra) se rehace el borrador desde lo guardado.
    useEffect(() => {
        setBorrador(aplicarValoresPorDefecto(seccion, base, catalogos));
    }, [base, seccion, catalogos]);

    const sucio = borradorCambio(borrador, base);
    const estado = ESTADO_SECCION[evaluacion.estado] ?? ESTADO_SECCION.pendiente;
    const problemasPorRuta = new Map(evaluacion.problemas.map(p => [p.ruta, p.mensaje]));
    const rutasSeccion = new Set(seccion.campos.map(c => c.ruta));
    const sinMapear = (candidato.sin_mapear || []).filter(s => rutasSeccion.has(s.ruta) && !base[s.ruta]);

    const cambiar = (campo, valor) => {
        setBorrador(prev => (campo.alCambiar ? campo.alCambiar(prev, valor, catalogos) : { ...prev, [campo.ruta]: valor }));
    };

    const guardar = async () => {
        setGuardando(true);
        setError(null);
        try {
            const { data } = await contratacionHydraService.guardarSeccion(candidato.id, seccion.clave, cuerpoDeBorrador(seccion, borrador));
            onCandidato(data.candidato);
        } catch (err) {
            setError(mensajeError(err, 'No se pudo guardar la sección'));
        } finally {
            setGuardando(false);
        }
    };

    const verificado = evaluacion.verificada && evaluacion.vigente;
    const puedeMarcar = editable && !sucio && (verificado || evaluacion.completa);

    const alternarVerificacion = async () => {
        setVerificando(true);
        setError(null);
        try {
            const { data } = await contratacionHydraService.marcarVerificacion(candidato.id, seccion.clave, !verificado);
            onCandidato(data.candidato);
        } catch (err) {
            setError(mensajeError(err, 'No se pudo cambiar la verificación'));
        } finally {
            setVerificando(false);
        }
    };

    return (
        <div className="ai-card" style={{ overflow: 'visible' }}>
            <button
                type="button"
                onClick={onToggle}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
                aria-expanded={abierta}
            >
                {verificado
                    ? <CheckCircle2 size={20} strokeWidth={1.75} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    : <Circle size={20} strokeWidth={1.75} style={{ color: 'var(--ink-subtle)', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{seccion.titulo}</div>
                    {evaluacion.problemas.length > 0 && (
                        <div className="ai-help is-error" style={{ marginTop: 2 }}>
                            {evaluacion.problemas.length} dato(s) pendiente(s)
                        </div>
                    )}
                    {evaluacion.verificada && !evaluacion.vigente && (
                        <div className="ai-help is-error" style={{ marginTop: 2 }}>Se editó después de verificarla: vuelve a verificar</div>
                    )}
                </div>
                <span className={`ai-badge ${estado.clase}`}><span className="ai-dot" />{estado.texto}</span>
                {abierta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {abierta && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                    {seccion.nota && <p className="ai-help" style={{ margin: '0 0 12px' }}>{seccion.nota}</p>}

                    {sinMapear.map(item => (
                        <ValorSinMapear
                            key={item.ruta}
                            item={item}
                            opciones={catalogosMapeo?.[item.catalogo] || []}
                            editable={editable}
                            onMapeado={onRecargar}
                        />
                    ))}

                    {seccion.clave === 'salario' && editable && (
                        <SueldoSugerido
                            candidato={candidato}
                            catalogos={catalogos}
                            valorActual={borrador['salario.salario']}
                            onUsar={(valor) => setBorrador(prev => ({ ...prev, 'salario.salario': valor }))}
                        />
                    )}

                    <div className="ai-form-grid">
                        {seccion.campos
                            .filter(campo => campo.tipo !== 'oculto' && (!campo.visible || campo.visible(borrador, catalogos)))
                            .map(campo => (
                                <Campo
                                    key={campo.ruta}
                                    campo={campo}
                                    valor={borrador[campo.ruta]}
                                    borrador={borrador}
                                    catalogos={catalogos}
                                    // El problema viene de la última evaluación del servidor: si el
                                    // campo ya se editó en el borrador, se oculta hasta guardar.
                                    error={String(borrador[campo.ruta] ?? '') === String(base[campo.ruta] ?? '') ? problemasPorRuta.get(campo.ruta) : undefined}
                                    deshabilitado={!editable}
                                    onCambiar={(valor) => cambiar(campo, valor)}
                                />
                            ))}
                    </div>

                    {/* Problemas que no corresponden a un campo visible (p. ej. reintegro). */}
                    {evaluacion.problemas
                        .filter(p => !seccion.campos.some(c => c.ruta === p.ruta && c.tipo !== 'oculto' && (!c.visible || c.visible(borrador, catalogos))))
                        .map(p => (
                            <div key={p.ruta + p.mensaje} className="ai-help is-error" style={{ marginTop: 10 }}>{p.mensaje}</div>
                        ))}

                    {error && (
                        <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', marginTop: 14, width: '100%', display: 'block' }}>
                            {error.mensaje}
                            {error.detalles.length > 0 && <ul style={{ margin: '6px 0 0 18px' }}>{error.detalles.map(d => <li key={d}>{d}</li>)}</ul>}
                        </div>
                    )}

                    {editable && (
                        <div className="ai-row" style={{ marginTop: 16, justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <label
                                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, cursor: puedeMarcar ? 'pointer' : 'not-allowed', opacity: puedeMarcar ? 1 : 0.6 }}
                                title={
                                    sucio ? 'Guarda los cambios antes de verificar'
                                        : !evaluacion.completa && !verificado ? 'Completa los datos pendientes para poder verificar'
                                            : undefined
                                }
                            >
                                <input
                                    type="checkbox"
                                    checked={verificado}
                                    disabled={!puedeMarcar || verificando}
                                    onChange={alternarVerificacion}
                                    style={{ width: 18, height: 18 }}
                                />
                                {verificando ? 'Guardando…' : 'Verificado por RRHH'}
                                {verificado && evaluacion.verificado_por && (
                                    <span className="ai-help">· {evaluacion.verificado_por}</span>
                                )}
                            </label>
                            <button type="button" className="ai-btn ai-btn--primary ai-btn--sm" onClick={guardar} disabled={!sucio || guardando}>
                                {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Guardar cambios
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Campo = ({ campo, valor, borrador, catalogos, error, deshabilitado, onCambiar }) => {
    const opciones = campo.opciones ? campo.opciones(borrador, catalogos) : (catalogos[campo.catalogo] || []);
    const render = campo.render || ((o) => o.nombre);
    const clase = `ai-field${campo.span2 ? ' span-2' : ''}${campo.etiquetaSalario ? ' ai-field--salario-source' : ''}`;
    const etiqueta = (
        <label className="ai-label">
            {campo.label}{campo.requerido && <em>*</em>}
            {campo.etiquetaSalario && <span className="ai-label-tag" title="Junto con el otro campo marcado, sugiere el salario">$ Salario</span>}
        </label>
    );
    const ayuda = error ? <span className="ai-help is-error">{error}</span> : null;

    if (campo.tipo === 'combobox') {
        // ComboboxBuscable ya trae su propio .ai-field y etiqueta.
        return (
            <div className={campo.span2 ? 'span-2' : undefined}>
                <ComboboxBuscable label={campo.label} required={campo.requerido} opciones={opciones} value={valor} onChange={(id) => onCambiar(id ? String(id) : '')} />
                {ayuda}
            </div>
        );
    }

    if (campo.tipo === 'check') {
        return (
            <div className={clase}>
                {etiqueta}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                    <input type="checkbox" checked={valor === true} disabled={deshabilitado} onChange={(e) => onCambiar(e.target.checked)} />
                    Aplica
                </label>
                {ayuda}
            </div>
        );
    }

    if (campo.tipo === 'select') {
        return (
            <div className={clase}>
                {etiqueta}
                <select className="ai-input" value={valor ?? ''} disabled={deshabilitado} onChange={(e) => onCambiar(e.target.value)}>
                    <option value="">{campo.requerido ? 'Seleccionar…' : 'Sin especificar'}</option>
                    {opciones.map(o => <option key={o.id} value={o.id}>{render(o)}</option>)}
                </select>
                {ayuda}
            </div>
        );
    }

    if (campo.tipo === 'moneda') {
        return (
            <div className={clase}>
                {etiqueta}
                <input
                    type="text"
                    inputMode="numeric"
                    className="ai-input"
                    value={formatearMiles(valor)}
                    disabled={deshabilitado}
                    placeholder="0"
                    onChange={(e) => onCambiar(e.target.value.replace(/\D/g, ''))}
                />
                {ayuda}
            </div>
        );
    }

    const tipoInput = { fecha: 'date', numero: 'number', email: 'email', tel: 'tel' }[campo.tipo] || 'text';
    return (
        <div className={clase}>
            {etiqueta}
            <input
                type={tipoInput}
                className="ai-input"
                value={valor ?? ''}
                disabled={deshabilitado}
                min={tipoInput === 'number' ? 0 : undefined}
                onChange={(e) => onCambiar(e.target.value)}
            />
            {ayuda}
        </div>
    );
};

/**
 * Valor que mandó Hydra y no existe (o es ambiguo) en Gestor. RRHH elige el equivalente y
 * se guarda como mapeo: el backend lo aplica a este candidato y a cualquier otro abierto
 * que traiga el mismo valor, y a los próximos lotes.
 */
const ValorSinMapear = ({ item, opciones, editable, onMapeado }) => {
    const [elegido, setElegido] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const guardar = async () => {
        setGuardando(true);
        setError('');
        try {
            await contratacionHydraService.guardarMapeo({ catalogo: item.catalogo, valor_hydra: item.valorHydra, id_gestor: Number(elegido) });
            onMapeado();
        } catch (err) {
            setError(mensajeError(err, 'No se pudo guardar el mapeo').mensaje);
            setGuardando(false);
        }
    };

    return (
        <div style={{ border: '1px solid var(--warning)', background: 'var(--warning-soft)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
                <div>
                    Hydra envió <strong>"{item.valorHydra}"</strong> ({item.catalogo.replaceAll('_', ' ')}) y no tiene un equivalente único en Gestor.
                    Elige cuál es: se recordará para los próximos candidatos.
                </div>
            </div>
            {editable && (
                <div className="ai-row" style={{ marginTop: 8, gap: 8 }}>
                    <select className="ai-input" style={{ flex: 1 }} value={elegido} onChange={(e) => setElegido(e.target.value)}>
                        <option value="">Elegir equivalente en Gestor…</option>
                        {opciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                    <button type="button" className="ai-btn ai-btn--secondary ai-btn--sm" disabled={!elegido || guardando} onClick={guardar}>
                        {guardando ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                        Usar y recordar
                    </button>
                </div>
            )}
            {error && <div className="ai-help is-error" style={{ marginTop: 6 }}>{error}</div>}
        </div>
    );
};

/** Sueldo de referencia por Cliente + Cargo del contrato ya guardado (hoja "Salarios"). */
const SueldoSugerido = ({ candidato, catalogos, valorActual, onUsar }) => {
    const contrato = candidato.datos_empleado.contrato || {};
    const clienteId = clienteDeCampania(catalogos.campanias, contrato.campania_id);
    const valores = salariosReferencia(catalogos.salarios_referencia, clienteId, contrato.cargo_id);
    if (valores.length === 0) return null;

    return (
        <div style={{ background: 'var(--primary-soft, var(--surface-200))', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: 14, fontSize: 13 }}>
            {valores.length === 1 ? 'Sueldo de referencia para el Cliente + Cargo del contrato:' : 'Hay varios sueldos de referencia para el Cliente + Cargo del contrato, elige uno:'}
            <div className="ai-row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                {valores.map(v => (
                    <button key={v} type="button" className="ai-btn ai-btn--secondary ai-btn--sm" disabled={String(valorActual) === v} onClick={() => onUsar(v)}>
                        $ {formatearMiles(v)}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SeccionHydra;
