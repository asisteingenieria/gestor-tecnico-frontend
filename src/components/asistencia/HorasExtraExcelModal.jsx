import React, { useState } from 'react';
import { FileSpreadsheet, X, Loader2, Upload, Download, AlertTriangle, Info } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { nombrePropio } from '../../utils/formatoRRHH';
import { etiquetaClase } from '../../utils/reporteHorasExtra';

// Solicitud de horas extra en Excel (backend asistencia.md §91): el jefe descarga la plantilla con su equipo directo,
// una fila por persona y día, llena Hora inicio, Hora fin y Motivo y la sube. Primero una vista previa (no guarda
// nada) y luego "Enviar". Todo o nada: con una fila con error no se envía ninguna. Topes legales en §91.1.

const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const masDias = (iso, n) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
const fechaCorta = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
const duracion = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
};

async function mensajeDeError(err, porDefecto) {
    const data = err?.response?.data;
    if (data instanceof Blob) {
        try { return JSON.parse(await data.text()).message || porDefecto; } catch { /* no era JSON */ }
    }
    return data?.message || porDefecto;
}

const Kpi = ({ label, valor, tono }) => (
    <div style={{ flex: '1 1 120px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <div className="ai-kpi-label">{label}</div>
        <div className="ai-kpi-value" style={{ fontSize: 22, color: tono }}>{valor}</div>
    </div>
);

const HorasExtraExcelModal = ({ onClose, onEnviada }) => {
    // Por defecto la última semana hasta hoy: lo más común es legalizar lo ya trabajado.
    const [desde, setDesde] = useState(() => masDias(hoyBogota(), -6));
    const [hasta, setHasta] = useState(hoyBogota);
    const [descargando, setDescargando] = useState(false);
    const [avisoPlantilla, setAvisoPlantilla] = useState(null);
    const [archivo, setArchivo] = useState(null);
    const [vista, setVista] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('enviar');

    const descargarPlantilla = async () => {
        setDescargando(true);
        setError(null);
        setAvisoPlantilla(null);
        try {
            const response = await asistenciaService.descargarPlantillaHorasExtra({ desde, hasta });
            const disposicion = response.headers?.['content-disposition'] || '';
            const nombre = disposicion.match(/filename="?([^"]+)"?/)?.[1] || `plantilla_horas_extra_${desde}_a_${hasta}.xlsx`;
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            a.click();
            URL.revokeObjectURL(url);
            const personas = response.headers?.['x-total-personas'];
            setAvisoPlantilla(`Se descargó la plantilla${personas ? ` con ${personas} personas` : ''}. Llena las horas extra y súbela aquí abajo.`);
        } catch (err) {
            setError(await mensajeDeError(err, 'No se pudo descargar la plantilla'));
        } finally {
            setDescargando(false);
        }
    };

    const revisar = async (file) => {
        setArchivo(file);
        setVista(null);
        setError(null);
        if (!file) return;
        setCargando(true);
        try {
            const { data } = await asistenciaService.previsualizarHorasExtraExcel(file);
            setVista(data);
            setTab(data.errores.length > 0 ? 'errores' : 'enviar');
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo leer el archivo');
        } finally {
            setCargando(false);
        }
    };

    const enviar = async () => {
        setEnviando(true);
        setError(null);
        try {
            const { data } = await asistenciaService.enviarHorasExtraExcel(archivo);
            onEnviada?.(data);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudieron enviar las horas extra');
            setEnviando(false);
        }
    };

    const r = vista?.resumen;
    const puedeEnviar = Boolean(vista?.puede_enviar);
    const TABS = vista ? [
        { id: 'enviar', label: 'A enviar', total: vista.solicitudes.length },
        { id: 'errores', label: 'Con errores', total: vista.errores.length },
        ...(vista.avisos?.length ? [{ id: 'avisos', label: 'Domingos', total: vista.avisos.length }] : [])
    ] : [];

    return (
        <div className="ai-overlay" onClick={() => !enviando && onClose()}>
            <div className="ai-modal" style={{ maxWidth: 980 }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><FileSpreadsheet size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h3 className="ai-modal-title">Solicitar horas extra en Excel</h3>
                        <p className="ai-modal-sub">Para todo tu equipo directo en un solo archivo. Le llegan a tu director como si las pidieras una por una.</p>
                    </div>
                    <button type="button" className="ai-icon-btn" onClick={onClose} disabled={enviando} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                </div>

                <div className="ai-modal-body ai-stack" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                    {!vista && (
                        <div style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>1. Descarga la plantilla de tu equipo</div>
                            <p className="ai-muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>
                                Una fila por persona y día, con su turno y las horas extra que ya tenga pedidas. Solo llenas Hora inicio, Hora fin y Motivo
                                en los días con hora extra; las demás filas se quedan vacías. Sirve para días pasados y futuros.
                            </p>
                            <div className="ai-row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div>
                                    <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Desde</label>
                                    <input type="date" className="ai-input" style={{ width: 160 }} value={desde} onChange={(e) => e.target.value && setDesde(e.target.value)} />
                                </div>
                                <div>
                                    <label className="ai-overline" style={{ display: 'block', marginBottom: 4 }}>Hasta</label>
                                    <input type="date" className="ai-input" style={{ width: 160 }} value={hasta} min={desde} max={masDias(desde, 61)} onChange={(e) => e.target.value && setHasta(e.target.value)} />
                                </div>
                                <button type="button" className="ai-btn ai-btn--secondary" onClick={descargarPlantilla} disabled={descargando || !desde || !hasta || hasta < desde}>
                                    {descargando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    {descargando ? 'Generando…' : 'Descargar plantilla'}
                                </button>
                            </div>
                            {avisoPlantilla && <p style={{ color: 'var(--success, #15803d)', fontSize: 12, margin: '8px 0 0' }}>{avisoPlantilla}</p>}
                            <p className="ai-muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
                                Límites legales: máximo 2 horas extra al día y 12 a la semana por persona, contando las ya pedidas.
                            </p>
                        </div>
                    )}

                    {!vista && <div style={{ fontWeight: 600, fontSize: 14 }}>2. Sube la plantilla llena</div>}
                    <label className="ai-row" style={{ justifyContent: 'center', gap: 8, padding: '14px 12px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: cargando || enviando ? 'default' : 'pointer' }}>
                        <Upload size={18} strokeWidth={1.75} />
                        <span style={{ fontSize: 14 }}>{archivo ? archivo.name : 'Selecciona el archivo .xlsx de horas extra…'}</span>
                        <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} disabled={cargando || enviando}
                            onChange={(e) => { revisar(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                    </label>

                    {cargando && (
                        <div className="ai-row" style={{ justifyContent: 'center', gap: 8, color: 'var(--ink-muted)' }}>
                            <Loader2 size={18} className="animate-spin" /> Revisando las horas extra…
                        </div>
                    )}
                    {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>}

                    {vista && (
                        <>
                            <div className="ai-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                                <Kpi label="Horas extra a enviar" valor={r.solicitudes} tono="var(--primary)" />
                                <Kpi label="Personas" valor={r.personas} />
                                <Kpi label="Tiempo total" valor={r.horas} />
                                <Kpi label="Filas con error" valor={r.errores} tono={r.errores > 0 ? 'var(--danger)' : undefined} />
                            </div>
                            {vista.autoaprobada
                                ? <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}>Como director, quedan aprobadas al enviarlas.</p>
                                : vista.aprobador && <p className="ai-muted" style={{ fontSize: 12, margin: 0 }}>Le llegan a {nombrePropio(vista.aprobador)} para aprobar.</p>}

                            {r.errores > 0 && (
                                <div className="ai-row" style={{ gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'color-mix(in srgb, var(--danger) 8%, transparent)', fontSize: 13 }}>
                                    <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                                    <div><strong>No se puede enviar.</strong> {r.errores} {r.errores === 1 ? 'fila tiene' : 'filas tienen'} error. Corrígelas en el Excel y vuelve a subirlo: no se envió nada.</div>
                                </div>
                            )}
                            {r.errores === 0 && r.solicitudes === 0 && (
                                <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>El archivo no trae horas extra: llena Hora inicio, Hora fin y Motivo en los días que las haya.</p>
                            )}

                            <div className="ai-tabs" style={{ padding: 0 }}>
                                {TABS.map((t) => (
                                    <button key={t.id} type="button" className={`ai-tab ${tab === t.id ? 'is-active' : ''}`} style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setTab(t.id)}>
                                        {t.label} <span className="ai-count">{t.total}</span>
                                    </button>
                                ))}
                            </div>

                            {tab === 'enviar' && (vista.solicitudes.length === 0 ? (
                                <p className="ai-muted" style={{ fontSize: 13 }}>No hay horas extra para enviar.</p>
                            ) : (
                                <table className="ai-table ai-table--dense">
                                    <thead><tr><th>Fila</th><th>Persona</th><th>Fecha</th><th>Franja</th><th>Tiempo</th><th>Clasificación</th></tr></thead>
                                    <tbody>
                                        {vista.solicitudes.map((s) => (
                                            <tr key={s.fila}>
                                                <td className="ai-num">{s.fila}</td>
                                                <td style={{ whiteSpace: 'normal' }}>{s.nombre}<div className="ai-muted" style={{ fontSize: 12 }}>{s.motivo}</div></td>
                                                <td className="ai-num" style={{ whiteSpace: 'nowrap' }}>{fechaCorta(s.fecha)}</td>
                                                <td className="ai-num">{s.hora_inicio}–{s.hora_fin}</td>
                                                <td className="ai-num">{duracion(s.minutos)}</td>
                                                <td style={{ whiteSpace: 'normal' }}>{s.tramos.map((t) => `${etiquetaClase(t.clase)} ${duracion(t.minutos)}`).join(' · ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ))}

                            {tab === 'errores' && (vista.errores.length === 0 ? (
                                <p className="ai-muted" style={{ fontSize: 13 }}>No hay filas con error.</p>
                            ) : (
                                <table className="ai-table ai-table--dense">
                                    <thead><tr><th>Fila</th><th>Persona</th><th>Fecha</th><th>Qué corregir</th></tr></thead>
                                    <tbody>
                                        {vista.errores.map((e) => (
                                            <tr key={`${e.fila}-${e.motivo}`}>
                                                <td className="ai-num">{e.fila}</td>
                                                <td style={{ whiteSpace: 'normal' }}>{e.nombre || '—'}<div className="ai-muted" style={{ fontSize: 12 }}>{e.cedula || ''}</div></td>
                                                <td className="ai-num" style={{ whiteSpace: 'nowrap' }}>{e.fecha ? fechaCorta(e.fecha) : '—'}</td>
                                                <td style={{ whiteSpace: 'normal', color: 'var(--danger)' }}>{e.motivo}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ))}

                            {tab === 'avisos' && (
                                <>
                                    <div className="ai-row" style={{ gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                                        <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                                        <span className="ai-muted">No impiden enviar: trabajar 3 o más domingos en el mes es trabajo dominical habitual y le corresponde un descanso compensatorio remunerado.</span>
                                    </div>
                                    <table className="ai-table ai-table--dense">
                                        <thead><tr><th>Persona</th><th>Mes</th><th>Domingos</th></tr></thead>
                                        <tbody>
                                            {vista.avisos.map((a) => (
                                                <tr key={`${a.users_company_id}-${a.mes}`}>
                                                    <td>{a.nombre}<div className="ai-muted" style={{ fontSize: 12 }}>{a.cedula}</div></td>
                                                    <td className="ai-num">{a.mes.split('-').reverse().join('/')}</td>
                                                    <td className="ai-num"><span className="ai-badge ai-badge--warning">{a.domingos}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}
                        </>
                    )}
                </div>

                <div className="ai-modal-foot">
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={onClose} disabled={enviando}>Cancelar</button>
                    <button type="button" className="ai-btn ai-btn--primary" onClick={enviar} disabled={!puedeEnviar || enviando || cargando}
                        title={vista && !puedeEnviar ? 'Corrige las filas con error para poder enviar' : undefined}>
                        {enviando ? 'Enviando…' : `Enviar ${r?.solicitudes ?? 0} horas extra`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HorasExtraExcelModal;
