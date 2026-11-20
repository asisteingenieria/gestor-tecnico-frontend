import React, { useState } from 'react';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { userCompanyService } from '../services/api';

// Descarga en Excel de los empleados con toda su información (backend: GET /users-company/export/empleados,
// claude/modulo recursoshumanos.md §56). Solo RRHH y financiera. Los filtros se combinan: estado del contrato
// más reciente + rango de fechas sobre la fecha de ingreso, de retiro o de registro. El archivo trae los
// encabezados de la plantilla de cargue masivo, así que se puede volver a subir por "Cargar Excel".

const ESTADOS = [
    { valor: 'activo', etiqueta: 'Activos' },
    { valor: 'periodo_prueba', etiqueta: 'Periodo de prueba' },
    { valor: 'suspendido', etiqueta: 'Suspendidos' },
    { valor: 'inactivo', etiqueta: 'Inactivos' },
    { valor: 'retirado', etiqueta: 'Retirados' }
];

const CAMPOS_FECHA = [
    { valor: 'ingreso', etiqueta: 'Fecha de ingreso' },
    { valor: 'retiro', etiqueta: 'Fecha de retiro' },
    { valor: 'registro', etiqueta: 'Fecha de registro en el sistema' }
];

const ES_RETIRO = ['retirado', 'inactivo'];

// Si solo se eligen retirados/inactivos el rango va sobre la fecha de retiro; si no, sobre la de ingreso.
// El usuario puede cambiarlo; una vez lo cambia a mano, ya no se mueve solo.
const campoSugerido = (estados) =>
    estados.length > 0 && estados.every((e) => ES_RETIRO.includes(e)) ? 'retiro' : 'ingreso';

// El servidor responde los errores como JSON, pero la petición pide un blob.
async function mensajeDeError(err) {
    const data = err?.response?.data;
    if (data instanceof Blob) {
        try { return JSON.parse(await data.text()).message; } catch { /* no era JSON */ }
    }
    return data?.message || 'No se pudo descargar el Excel de empleados';
}

// `inicial`: los filtros de estado y fechas que hay en pantalla, para que la descarga salga igual a lo que se ve.
const DescargarEmpleadosModal = ({ isOpen, onClose, inicial = {} }) => {
    const [estados, setEstados] = useState(inicial.estados || []);
    const [campoFecha, setCampoFecha] = useState(inicial.campoFecha || campoSugerido(inicial.estados || []));
    const [campoManual, setCampoManual] = useState(Boolean(inicial.campoManual));
    const [desde, setDesde] = useState(inicial.desde || '');
    const [hasta, setHasta] = useState(inicial.hasta || '');
    const [descargando, setDescargando] = useState(false);
    const [error, setError] = useState('');
    const [resultado, setResultado] = useState('');

    if (!isOpen) return null;

    const alternarEstado = (valor) => {
        const siguiente = estados.includes(valor) ? estados.filter((e) => e !== valor) : [...estados, valor];
        setEstados(siguiente);
        if (!campoManual) setCampoFecha(campoSugerido(siguiente));
        setResultado('');
    };

    const rangoInvalido = desde && hasta && desde > hasta;

    const descargar = async () => {
        setError('');
        setResultado('');
        setDescargando(true);
        try {
            const params = {};
            if (estados.length) params.estados = estados.join(',');
            if (desde || hasta) {
                params.campoFecha = campoFecha;
                if (desde) params.desde = desde;
                if (hasta) params.hasta = hasta;
            }
            const response = await userCompanyService.exportarEmpleados(params);
            const disposicion = response.headers?.['content-disposition'] || '';
            const nombre = disposicion.match(/filename="?([^"]+)"?/)?.[1] || 'empleados.xlsx';
            const total = response.headers?.['x-total-empleados'];
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            a.click();
            URL.revokeObjectURL(url);
            setResultado(total != null ? `Se descargaron ${total} empleado${total === '1' ? '' : 's'}.` : 'Descarga lista.');
        } catch (err) {
            console.error('Error al descargar empleados:', err);
            setError(await mensajeDeError(err));
        } finally {
            setDescargando(false);
        }
    };

    const limpiar = () => {
        setEstados([]);
        setCampoFecha('ingreso');
        setCampoManual(false);
        setDesde('');
        setHasta('');
        setError('');
        setResultado('');
    };

    return (
        <div className="ai-overlay ai-scope" onClick={onClose}>
            <div className="ai-modal ai-modal--sm" onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon">
                        <FileSpreadsheet size={20} strokeWidth={1.75} />
                    </span>
                    <div>
                        <h2 className="ai-modal-title">Descargar empleados</h2>
                        <p className="ai-modal-sub">Excel con toda la información de cada empleado. Combina el estado con un rango de fechas; sin filtros descarga a todos.</p>
                    </div>
                </div>
                <div className="ai-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="ai-field">
                        <label className="ai-label">Estado</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                            {ESTADOS.map(({ valor, etiqueta }) => (
                                <label key={valor} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                                    <input
                                        type="checkbox"
                                        checked={estados.includes(valor)}
                                        onChange={() => alternarEstado(valor)}
                                        style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                                    />
                                    {etiqueta}
                                </label>
                            ))}
                        </div>
                        <p className="ai-muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {estados.length === 0 ? 'Todos los estados.' : 'Estado del contrato más reciente de cada empleado.'}
                        </p>
                    </div>

                    <div className="ai-field">
                        <label className="ai-label">Rango de fechas sobre</label>
                        <select
                            className="ai-input"
                            value={campoFecha}
                            onChange={(e) => { setCampoFecha(e.target.value); setCampoManual(true); setResultado(''); }}
                        >
                            {CAMPOS_FECHA.map(({ valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
                        </select>
                    </div>

                    <div className="ai-form-grid">
                        <div className="ai-field">
                            <label className="ai-label">Desde</label>
                            <input type="date" className="ai-input" value={desde} max={hasta || undefined}
                                onChange={(e) => { setDesde(e.target.value); setResultado(''); }} />
                        </div>
                        <div className="ai-field">
                            <label className="ai-label">Hasta</label>
                            <input type="date" className="ai-input" value={hasta} min={desde || undefined}
                                onChange={(e) => { setHasta(e.target.value); setResultado(''); }} />
                        </div>
                    </div>
                    {!desde && !hasta && (
                        <p className="ai-muted" style={{ fontSize: 12, marginTop: -8 }}>Sin fechas no se filtra por rango.</p>
                    )}
                    {rangoInvalido && <p style={{ color: 'var(--danger)', fontSize: 13 }}>La fecha "desde" no puede ser posterior a "hasta".</p>}
                    {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
                    {resultado && <p style={{ color: 'var(--success)', fontSize: 13 }}>{resultado}</p>}
                </div>
                <div className="ai-modal-foot">
                    <button type="button" className="ai-btn ai-btn--ghost" onClick={limpiar} disabled={descargando}>Limpiar</button>
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={onClose}>Cerrar</button>
                    <button type="button" className="ai-btn ai-btn--primary" onClick={descargar} disabled={descargando || rangoInvalido}>
                        {descargando ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin" /> : <Download size={16} strokeWidth={1.75} />}
                        {descargando ? 'Descargando…' : 'Descargar Excel'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DescargarEmpleadosModal;
