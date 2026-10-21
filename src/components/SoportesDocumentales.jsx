import React, { useState, useEffect } from 'react';
import { ACCEPT_SOPORTE, tamanoLegible, abrirSoporte } from '../utils/soportesRrhh';
import { Upload, FileText, Eye, Trash2, Check, X as XIcon } from 'lucide-react';

/**
 * Sección "Soportes documentales" de los formularios de RRHH (novedades, traspasos): muestra solo
 * los soportes que aplican al tipo elegido, cada uno con Cargar / Ver / Reemplazar / Eliminar, y
 * aparte los ya cargados que dejaron de aplicar (si se cambió el tipo).
 *
 * Props:
 *  - tipoElegido: bool — si aún no hay tipo, muestra `textoSinTipo`.
 *  - aplican: [{ id, nombre }] — tipos de soporte del tipo elegido.
 *  - guardados: lo que devuelve el backend en `soportes` ({ tipo_soporte_id, id, nombre, nombre_original, tamano, aplica }).
 *  - archivos: { [tipoSoporteId]: File } — elegidos, se suben al guardar.
 *  - onElegir(tipoSoporteId, File), onQuitar(tipoSoporteId), onVer(tipoSoporteId), onEliminar({ tipo_soporte_id, nombre }).
 */
const SoportesDocumentales = ({
    titulo = 'Soportes documentales', tipoElegido, aplican, guardados, archivos,
    onElegir, onQuitar, onVer, onEliminar,
    textoSinTipo = 'Elige el tipo para ver qué soportes aplican.',
    textoSinSoportes = 'Este tipo no requiere soportes.'
}) => {
    const guardadoDe = (tipoSoporteId) => guardados.find(s => String(s.tipo_soporte_id) === String(tipoSoporteId) && s.id);
    const sobrantes = guardados.filter(s => s.id && !aplican.some(a => String(a.id) === String(s.tipo_soporte_id)));
    const cargados = aplican.filter(s => guardadoDe(s.id) || archivos[s.id]).length;

    const botonArchivo = (tipoSoporteId, texto) => (
        <label className="ai-btn ai-btn--secondary" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            {texto}
            <input
                type="file"
                accept={ACCEPT_SOPORTE}
                style={{ display: 'none' }}
                onChange={(e) => { onElegir(tipoSoporteId, e.target.files?.[0]); e.target.value = ''; }}
            />
        </label>
    );

    const fila = (soporte) => {
        const guardado = guardadoDe(soporte.id);
        const pendiente = archivos[soporte.id];
        return (
            <div
                key={soporte.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{soporte.nombre}</div>
                    <div className="ai-muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pendiente
                            ? <>Se cargará al guardar: {pendiente.name} · {tamanoLegible(pendiente.size)}</>
                            : guardado
                                ? <><Check size={12} style={{ verticalAlign: -2 }} /> {guardado.nombre_original} · {tamanoLegible(guardado.tamano)}</>
                                : 'Pendiente — PDF o imagen'}
                    </div>
                </div>
                {pendiente ? (
                    <button type="button" onClick={() => onQuitar(soporte.id)} className="ai-btn ai-btn--secondary">Quitar</button>
                ) : guardado ? (
                    <>
                        <button type="button" onClick={() => onVer(soporte.id)} className="ai-icon-btn" aria-label={`Ver ${soporte.nombre}`}><Eye size={16} /></button>
                        {botonArchivo(soporte.id, 'Reemplazar')}
                        <button type="button" onClick={() => onEliminar({ tipo_soporte_id: soporte.id, nombre: soporte.nombre })} className="ai-icon-btn ai-icon-btn--danger" aria-label={`Eliminar ${soporte.nombre}`}><Trash2 size={16} /></button>
                    </>
                ) : botonArchivo(soporte.id, 'Cargar')}
            </div>
        );
    };

    return (
        <>
            <p className="ai-overline" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                {titulo}{tipoElegido && aplican.length > 0 ? ` · ${cargados} de ${aplican.length}` : ''}
            </p>
            {!tipoElegido ? (
                <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>{textoSinTipo}</p>
            ) : aplican.length === 0 ? (
                <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>{textoSinSoportes}</p>
            ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                    {aplican.map(fila)}
                </div>
            )}
            {sobrantes.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                    <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}>Cargados antes, ya no aplican a este tipo:</p>
                    {sobrantes.map(s => (
                        <div key={s.tipo_soporte_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <FileText size={16} style={{ color: 'var(--ink-subtle)' }} />
                            <div style={{ flex: 1, fontSize: 13 }}>{s.nombre} <span className="ai-muted">· {s.nombre_original}</span></div>
                            <button type="button" onClick={() => onVer(s.tipo_soporte_id)} className="ai-icon-btn" aria-label={`Ver ${s.nombre}`}><Eye size={16} /></button>
                            <button type="button" onClick={() => onEliminar(s)} className="ai-icon-btn ai-icon-btn--danger" aria-label={`Eliminar ${s.nombre}`}><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

/**
 * Resumen de solo lectura para el detalle de una fila (tablas de novedades y traspasos): los
 * soportes que aplican, en verde los cargados (se abren con un clic: la descarga va con el token,
 * no hay URL pública) y en gris los pendientes.
 *  - cargar(): promesa con { data: { soportes } }; descargar(tipoSoporteId): promesa con el blob.
 */
export const SoportesResumen = ({ cargar, descargar, textoSinSoportes = 'Este tipo no requiere soportes.' }) => {
    const [soportes, setSoportes] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        cargar()
            .then(({ data }) => setSoportes(data.soportes))
            .catch(() => setError('No se pudieron cargar los soportes'));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- se carga una vez al abrir el detalle
    }, []);

    const abrir = (tipoSoporteId) => abrirSoporte(() => descargar(tipoSoporteId)).catch(() => setError('No se pudo abrir el soporte'));

    if (error) return <p className="ai-muted" style={{ fontSize: 13 }}>{error}</p>;
    if (!soportes) return <p className="ai-muted" style={{ fontSize: 13 }}>Cargando…</p>;
    const aplican = soportes.filter(s => Number(s.aplica) === 1);
    if (aplican.length === 0) return <p className="ai-muted" style={{ fontSize: 13 }}>{textoSinSoportes}</p>;
    return (
        <div className="ai-row">
            {aplican.map(s => s.id ? (
                <button key={s.tipo_soporte_id} type="button" onClick={() => abrir(s.tipo_soporte_id)} className="ai-badge ai-badge--success" style={{ cursor: 'pointer', border: 0 }} title={s.nombre_original}>
                    <Check size={12} /> {s.nombre}
                </button>
            ) : (
                <span key={s.tipo_soporte_id} className="ai-badge" style={{ background: 'var(--surface-200)', color: 'var(--ink-muted)' }}>
                    <XIcon size={12} /> {s.nombre}
                </span>
            ))}
        </div>
    );
};

export default SoportesDocumentales;
