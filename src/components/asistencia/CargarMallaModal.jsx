import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, X, Loader2, ChevronDown, ChevronRight, Upload, Download, AlertTriangle } from 'lucide-react';
import { asistenciaService } from '../../services/api';

// Carga de la malla de horarios en Excel (backend asistencia.md §55). El jefe sube el archivo tal
// como sale de tab_mallas_turnos_mes (Mallas1.xlsx); se aplica de hoy en adelante y solo a su equipo
// directo. Primero una vista previa (no escribe nada) y luego "Aplicar".

// Fecha de hoy en Bogotá y días después, 'YYYY-MM-DD', para el rango de la plantilla (§75).
const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const masDias = (iso, n) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

async function mensajeDeError(err, porDefecto) {
    const data = err?.response?.data;
    if (data instanceof Blob) {
        try { return JSON.parse(await data.text()).message || porDefecto; } catch { /* no era JSON */ }
    }
    return data?.message || porDefecto;
}

const OMITIDO_TEXTO = {
    retirado: 'Retirado en RRHH',
    antes_ingreso: 'Días antes de su ingreso',
    no_a_cargo: 'No está a tu cargo',
    no_encontrado: 'Cédula sin ficha en RRHH'
};

// 'YYYY-MM-DD' → 'mar 4 nov'. Mediodía local para que la zona horaria no corra el día.
const fechaCorta = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
const hora = (h) => String(h ?? '').slice(0, 5);
const semanaTexto = (d) => `${fechaCorta(d.semana_desde)} – ${fechaCorta(d.semana_hasta)}`;
// Filas del Excel de esa semana: "9 a 15" si son seguidas, si no la lista.
const filasTexto = (filas = []) => {
    if (filas.length === 0) return '—';
    const seguidas = filas.every((f, i) => i === 0 || f === filas[i - 1] + 1);
    return seguidas && filas.length > 1 ? `${filas[0]} a ${filas[filas.length - 1]}` : filas.join(', ');
};
// La modalidad viene de la columna "Modelo Trabajo" de la malla (§58); solo se señala la virtual.
const turnoTexto = (h) => (h.es_descanso
    ? `Descanso${h.notas && !['Libre', 'Descanso'].includes(h.notas) ? ` · ${h.notas}` : ''}`
    : `${hora(h.hora_entrada)}–${hora(h.hora_salida)}${h.modalidad === 'virtual' ? ' · Virtual' : ''}`);

function agruparPorPersona(horarios) {
    const mapa = new Map();
    for (const h of horarios) {
        const p = mapa.get(h.users_company_id) ?? { id: h.users_company_id, nombre: h.nombre, cedula: h.cedula, dias: [], nuevo: 0, reemplaza: 0, igual: 0, descansos: 0 };
        p.dias.push(h);
        p[h.estado]++;
        if (h.es_descanso) p.descansos++;
        mapa.set(h.users_company_id, p);
    }
    return [...mapa.values()]
        .map((p) => ({ ...p, desde: p.dias[0]?.fecha, hasta: p.dias[p.dias.length - 1]?.fecha }))
        .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''));
}

const Kpi = ({ label, valor, tono }) => (
    <div style={{ flex: '1 1 120px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <div className="ai-kpi-label">{label}</div>
        <div className="ai-kpi-value" style={{ fontSize: 22, color: tono }}>{valor}</div>
    </div>
);

const CargarMallaModal = ({ onClose, onAplicada }) => {
    const [archivo, setArchivo] = useState(null);
    const [vista, setVista] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [aplicando, setAplicando] = useState(false);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('aplicar');
    const [abiertos, setAbiertos] = useState(() => new Set());
    // Plantilla con el equipo directo (§75): por defecto hoy y los 6 días siguientes.
    const [desde, setDesde] = useState(hoyBogota);
    const [hasta, setHasta] = useState(() => masDias(hoyBogota(), 6));
    const [descargando, setDescargando] = useState(false);
    const [avisoPlantilla, setAvisoPlantilla] = useState(null);

    const descargarPlantilla = async () => {
        setDescargando(true);
        setError(null);
        setAvisoPlantilla(null);
        try {
            const response = await asistenciaService.descargarPlantillaMalla({ desde, hasta });
            const disposicion = response.headers?.['content-disposition'] || '';
            const nombre = disposicion.match(/filename="?([^"]+)"?/)?.[1] || `plantilla_malla_${desde}_a_${hasta}.xlsx`;
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            a.click();
            URL.revokeObjectURL(url);
            const personas = response.headers?.['x-total-personas'];
            setAvisoPlantilla(`Se descargó la plantilla${personas ? ` con ${personas} personas` : ''}. Llena los horarios y súbela aquí abajo.`);
        } catch (err) {
            setError(await mensajeDeError(err, 'No se pudo descargar la plantilla'));
        } finally {
            setDescargando(false);
        }
    };

    const personas = useMemo(() => agruparPorPersona(vista?.horarios ?? []), [vista]);
    const conCambios = personas.filter((p) => p.nuevo + p.reemplaza > 0).length;

    const revisar = async (file) => {
        setArchivo(file);
        setVista(null);
        setError(null);
        if (!file) return;
        setCargando(true);
        try {
            const { data } = await asistenciaService.previsualizarMalla(file);
            setVista(data);
            // Si alguna persona no cuadra las 42 h o el descanso (§90), eso es lo primero que hay que ver.
            setTab(data.desajustes_semana?.length > 0 ? 'semanas'
                : data.resumen.a_aplicar > 0 || data.horarios.length > 0 ? 'aplicar' : data.errores.length > 0 ? 'errores' : 'omitidos');
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo leer el archivo');
        } finally {
            setCargando(false);
        }
    };

    const aplicar = async () => {
        setAplicando(true);
        setError(null);
        try {
            const { data } = await asistenciaService.aplicarMalla(archivo);
            onAplicada?.(data);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo aplicar la malla');
            setAplicando(false);
        }
    };

    const alternar = (id) => setAbiertos((prev) => {
        const s = new Set(prev);
        if (s.has(id)) s.delete(id); else s.add(id);
        return s;
    });

    const r = vista?.resumen;
    const desajustes = vista?.desajustes_semana ?? [];
    const sinValidar = vista?.semanas_sin_validar ?? [];
    // Un backend anterior no manda `puede_aplicar`: cuenta como sí.
    const puedeAplicar = vista?.puede_aplicar !== false;
    const TABS = vista ? [
        ...(desajustes.length > 0 ? [{ id: 'semanas', label: 'No cuadran 42 h / descanso', total: desajustes.length }] : []),
        { id: 'aplicar', label: 'Tu equipo', total: personas.length },
        { id: 'omitidos', label: 'Omitidos', total: vista.omitidos.length },
        { id: 'errores', label: 'Con errores', total: r.errores },
        ...(sinValidar.length > 0 ? [{ id: 'sin_validar', label: 'Semanas sin validar', total: sinValidar.length }] : [])
    ] : [];

    return (
        <div className="ai-overlay" onClick={() => !aplicando && onClose()}>
            <div className="ai-modal" style={{ maxWidth: 980 }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><FileSpreadsheet size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h3 className="ai-modal-title">Cargar malla de horarios</h3>
                        <p className="ai-modal-sub">
                            El Excel de la malla tal como lo exportas. Se aplica de hoy en adelante, solo a tu equipo directo, y reemplaza el turno que ya tuvieran esos días.
                        </p>
                    </div>
                    <button type="button" className="ai-icon-btn" onClick={onClose} disabled={aplicando} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                </div>

                <div className="ai-modal-body ai-stack" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                    {!vista && (
                        <div style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>1. Descarga la plantilla de tu equipo</div>
                            <p className="ai-muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>
                                Trae la cédula, el nombre, el cargo y el centro de costo de cada persona de tu equipo directo, una fila por día.
                                Solo llenas Entrada, Salida, Almuerzo y el Modelo Trabajo (Presencial o Trabajo en casa). Si ya tenían horario, viene precargado.
                            </p>
                            <div className="ai-row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div>
                                    <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Desde</label>
                                    <input type="date" className="ai-input" style={{ width: 160 }} value={desde} min={hoyBogota()}
                                        onChange={(e) => e.target.value && setDesde(e.target.value)} />
                                </div>
                                <div>
                                    <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Hasta</label>
                                    <input type="date" className="ai-input" style={{ width: 160 }} value={hasta} min={desde} max={masDias(desde, 61)}
                                        onChange={(e) => e.target.value && setHasta(e.target.value)} />
                                </div>
                                <button type="button" className="ai-btn ai-btn--secondary" onClick={descargarPlantilla} disabled={descargando || !desde || !hasta || hasta < desde}>
                                    {descargando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    {descargando ? 'Generando…' : 'Descargar plantilla'}
                                </button>
                            </div>
                            {avisoPlantilla && <p style={{ color: 'var(--success, #15803d)', fontSize: 12, margin: '8px 0 0' }}>{avisoPlantilla}</p>}
                        </div>
                    )}

                    {!vista && <div style={{ fontWeight: 600, fontSize: 14 }}>2. Sube la malla llena</div>}
                    <label className="ai-drop" style={{ cursor: 'pointer', padding: vista ? '14px' : undefined }}>
                        <Upload size={22} strokeWidth={1.75} />
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{archivo ? archivo.name : 'Selecciona el archivo .xlsx de la malla'}</span>
                        {!vista && (
                            <span style={{ fontSize: 12 }}>
                                La plantilla de arriba, o la 01_Mallas_Operacion: Fecha, Cédula, Entrada, Salida, Almuerzo y Modelo Trabajo (las demás columnas son informativas).
                                Para un descanso deja Entrada y Salida vacías y pon en Novedad DESCANSO (o INC, VACACIONES, RETIRO, SUSPENSION, LNR o LR si es otra ausencia).
                                Las filas sin horario ni novedad no se cargan. Los turnos que no tengan plantilla se guardan como plantillas tuyas.
                            </span>
                        )}
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                            disabled={cargando || aplicando}
                            onChange={(e) => { revisar(e.target.files?.[0] ?? null); e.target.value = ''; }}
                        />
                    </label>

                    {cargando && (
                        <div className="ai-row" style={{ justifyContent: 'center', gap: 8, color: 'var(--ink-muted)' }}>
                            <Loader2 size={18} className="animate-spin" /> Revisando la malla…
                        </div>
                    )}
                    {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>}

                    {vista && (
                        <>
                            <div className="ai-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                                <Kpi label="Horarios a aplicar" valor={r.a_aplicar} tono="var(--primary)" />
                                <Kpi label="Personas con cambios" valor={conCambios} />
                                <Kpi label="Ya estaban iguales" valor={r.igual} />
                                <Kpi label="Días pasados (no se cargan)" valor={r.pasado} />
                                <Kpi label="Otras personas (omitidas)" valor={vista.omitidos.length} />
                                <Kpi label="Filas con error" valor={r.errores} tono={r.errores > 0 ? 'var(--danger)' : undefined} />
                            </div>
                            {r.sin_diligenciar > 0 && (
                                <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}>
                                    {r.sin_diligenciar} filas sin horario ni novedad no se cargan: esos días quedan como estaban.
                                </p>
                            )}

                            {!puedeAplicar && (
                                <div className="ai-row" style={{ gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'color-mix(in srgb, var(--danger) 8%, transparent)', fontSize: 13 }}>
                                    <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                                    <div>
                                        <strong>No se puede cargar la malla.</strong> {new Set(desajustes.map((d) => d.users_company_id)).size} de tu equipo no
                                        {new Set(desajustes.map((d) => d.users_company_id)).size === 1 ? ' cumple' : ' cumplen'} las 42 horas semanales o el día de descanso.
                                        Cada persona debe sumar exactamente 42 h por semana (lunes a domingo, sin el almuerzo) y tener al menos un descanso.
                                        Corrige las filas de la pestaña "No cuadran" y vuelve a subir el archivo. No se cargó nada.
                                    </div>
                                </div>
                            )}

                            {vista.plantillas_nuevas?.length > 0 && (
                                <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                                    <strong>Se crearán {vista.plantillas_nuevas.length} plantillas nuevas</strong>
                                    <span className="ai-muted"> para los turnos que no tenías guardados:</span>
                                    <div className="ai-row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                        {vista.plantillas_nuevas.map((p) => <span key={p.nombre} className="ai-badge ai-badge--info">{p.nombre}</span>)}
                                    </div>
                                </div>
                            )}

                            <div className="ai-tabs" style={{ padding: 0 }}>
                                {TABS.map((t) => (
                                    <button key={t.id} type="button" className={`ai-tab ${tab === t.id ? 'is-active' : ''}`} style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setTab(t.id)}>
                                        {t.label} <span className="ai-count">{t.total}</span>
                                    </button>
                                ))}
                            </div>

                            {tab === 'aplicar' && (
                                personas.length === 0 ? (
                                    <p className="ai-muted" style={{ fontSize: 13 }}>Ninguna persona de tu equipo directo tiene días de hoy en adelante en este archivo.</p>
                                ) : (
                                    <table className="ai-table ai-table--dense">
                                        <thead>
                                            <tr><th /><th>Persona</th><th>Días</th><th>Nuevos</th><th>Reemplaza</th><th>Sin cambio</th><th>Descansos</th></tr>
                                        </thead>
                                        <tbody>
                                            {personas.map((p) => (
                                                <React.Fragment key={p.id}>
                                                    <tr style={{ cursor: 'pointer' }} onClick={() => alternar(p.id)}>
                                                        <td style={{ width: 24 }}>{abiertos.has(p.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                                                        <td>{p.nombre}<div className="ai-muted" style={{ fontSize: 12 }}>{p.cedula}</div></td>
                                                        <td className="ai-num ai-muted">{fechaCorta(p.desde)} – {fechaCorta(p.hasta)}</td>
                                                        <td className="ai-num">{p.nuevo || '—'}</td>
                                                        <td className="ai-num">{p.reemplaza ? <span className="ai-badge ai-badge--warning">{p.reemplaza}</span> : '—'}</td>
                                                        <td className="ai-num ai-muted">{p.igual || '—'}</td>
                                                        <td className="ai-num ai-muted">{p.descansos || '—'}</td>
                                                    </tr>
                                                    {abiertos.has(p.id) && (
                                                        <tr>
                                                            <td />
                                                            <td colSpan={6}>
                                                                <div className="ai-row" style={{ flexWrap: 'wrap', gap: 6, padding: '4px 0 8px' }}>
                                                                    {p.dias.map((d) => (
                                                                        <span
                                                                            key={d.fecha}
                                                                            className={`ai-badge ${d.estado === 'reemplaza' ? 'ai-badge--warning' : d.es_descanso ? 'ai-badge--neutral' : d.estado === 'igual' ? 'ai-badge--neutral' : 'ai-badge--info'}`}
                                                                            title={[
                                                                                d.plantilla ? `Plantilla: ${d.plantilla}` : null,
                                                                                d.anterior ? `Antes: ${turnoTexto(d.anterior)}` : null,
                                                                                d.estado === 'igual' ? 'Sin cambio' : null
                                                                            ].filter(Boolean).join(' · ') || undefined}
                                                                        >
                                                                            {fechaCorta(d.fecha)} · {turnoTexto(d)}
                                                                            {d.estado === 'reemplaza' && d.anterior && <> (antes {turnoTexto(d.anterior)})</>}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            )}

                            {tab === 'semanas' && (
                                <>
                                    <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>
                                        Las horas se cuentan de lunes a domingo, sin el almuerzo. Los días de la semana que no vienen en el archivo se toman del horario que ya tenía la persona.
                                    </p>
                                    <table className="ai-table ai-table--dense">
                                        <thead><tr><th>Filas del Excel</th><th>Persona · qué corregir</th><th>Semana</th><th>Horas</th><th>Descansos</th></tr></thead>
                                        <tbody>
                                            {desajustes.map((d) => (
                                                <tr key={`${d.users_company_id}-${d.semana_desde}`}>
                                                    <td className="ai-num" style={{ whiteSpace: 'nowrap' }}>{filasTexto(d.filas)}</td>
                                                    <td style={{ whiteSpace: 'normal' }}>
                                                        {d.nombre || '—'} <span className="ai-muted" style={{ fontSize: 12 }}>· {d.cedula}</span>
                                                        {d.problemas.map((t) => <div key={t} style={{ color: 'var(--danger)', fontSize: 12 }}>{t}</div>)}
                                                    </td>
                                                    <td className="ai-num" style={{ whiteSpace: 'nowrap' }}>{semanaTexto(d)}</td>
                                                    <td className="ai-num"><span className="ai-badge ai-badge--danger">{d.horas}</span></td>
                                                    <td className="ai-num">{d.dias_descanso || <span className="ai-badge ai-badge--danger">0</span>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {tab === 'sin_validar' && (
                                <>
                                    <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>
                                        Estas semanas no se revisan: les faltan días sin horario (inicio o fin del mes, un ingreso a mitad de semana) o tienen una novedad. No impiden cargar la malla.
                                    </p>
                                    <table className="ai-table ai-table--dense">
                                        <thead><tr><th>Filas del Excel</th><th>Persona</th><th>Semana</th><th>Por qué</th></tr></thead>
                                        <tbody>
                                            {sinValidar.map((d) => (
                                                <tr key={`${d.users_company_id}-${d.semana_desde}`}>
                                                    <td className="ai-num" style={{ whiteSpace: 'nowrap' }}>{filasTexto(d.filas)}</td>
                                                    <td style={{ whiteSpace: 'normal' }}>{d.nombre || '—'}<div className="ai-muted" style={{ fontSize: 12 }}>{d.cedula}</div></td>
                                                    <td className="ai-num" style={{ whiteSpace: 'nowrap' }}>{semanaTexto(d)}</td>
                                                    <td className="ai-muted" style={{ whiteSpace: 'normal' }}>{d.motivo}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {tab === 'omitidos' && (
                                vista.omitidos.length === 0 ? (
                                    <p className="ai-muted" style={{ fontSize: 13 }}>Todas las personas del archivo son de tu equipo.</p>
                                ) : (
                                    <>
                                        <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>
                                            Estas personas están en el archivo pero no se les asigna nada: no son de tu equipo directo o no tienen ficha en RRHH.
                                        </p>
                                        <table className="ai-table ai-table--dense">
                                            <thead><tr><th>Persona</th><th>Cédula</th><th>Motivo</th><th>Días en el archivo</th></tr></thead>
                                            <tbody>
                                                {vista.omitidos.map((o) => (
                                                    <tr key={o.cedula}>
                                                        <td>{o.nombre || '—'}</td>
                                                        <td className="ai-num">{o.cedula}</td>
                                                        <td><span className={`ai-badge ${o.estado === 'no_encontrado' || o.estado === 'retirado' ? 'ai-badge--warning' : 'ai-badge--neutral'}`}>{OMITIDO_TEXTO[o.estado]}</span></td>
                                                        <td className="ai-num ai-muted">{o.dias}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                )
                            )}

                            {tab === 'errores' && (
                                vista.errores.length === 0 ? (
                                    <p className="ai-muted" style={{ fontSize: 13 }}>No hay filas con errores.</p>
                                ) : (
                                    <>
                                        <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>Estas filas no se cargan. Corrígelas en el Excel y vuelve a subirlo.</p>
                                        <table className="ai-table ai-table--dense">
                                            <thead><tr><th>Fila</th><th>Persona</th><th>Fecha</th><th>Motivo</th></tr></thead>
                                            <tbody>
                                                {vista.errores.map((e) => (
                                                    <tr key={`${e.fila}-${e.motivo}`}>
                                                        <td className="ai-num">{e.fila}</td>
                                                        <td>{e.nombre || '—'}<div className="ai-muted" style={{ fontSize: 12 }}>{e.cedula || ''}</div></td>
                                                        <td className="ai-num">{e.fecha ? fechaCorta(e.fecha) : '—'}</td>
                                                        <td>{e.motivo}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                )
                            )}
                        </>
                    )}
                </div>

                <div className="ai-modal-foot">
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={onClose} disabled={aplicando}>Cancelar</button>
                    <button type="button" className="ai-btn ai-btn--primary" onClick={aplicar} disabled={!vista || !puedeAplicar || r.a_aplicar === 0 || aplicando || cargando}
                        title={vista && !puedeAplicar ? 'Hay personas que no cumplen las 42 h semanales o el día de descanso' : undefined}>
                        {aplicando ? 'Aplicando…' : `Aplicar ${r?.a_aplicar ?? 0} horarios`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CargarMallaModal;
