import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { userCompanyService } from '../services/api';
import {
    X, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2, Download, File
} from 'lucide-react';

const PASO = { SELECCION: 'seleccion', PREVIEW: 'preview', RESULTADO: 'resultado' };

// Mismo orden posicional que espera utils/importEmpleadosExcel.js en el backend (COL.*),
// tal como viene en la hoja "TOTAL PERSONAL" real. Ver asistencia.md / RRHH bulk import.
const ENCABEZADOS_PLANTILLA = [
    'Estado', 'Cliente', 'Tipo De Identificación', 'Identificación', 'Tipo De Identificación', 'Identificación',
    'Tipo De Identificación', 'Identificación', 'Fecha De Expedición', 'Lugar Expedicion Identificación',
    'Primer Nombre', 'Segundo Nombre', 'Primer Apellido', 'Segundo Apellido', 'Nombre Propio', 'Genero', 'Rh',
    'Tipo De Contrato', 'Ciudad Donde Labora', 'Oleada', 'Fecha De Ingreso', 'Area', 'Campaña',
    'Nombre_Centro_Costo', 'Codigo_Centro_Costo', 'Cargo en SSFF', 'Usuario Ssff', 'Cargo', 'Salario',
    'Bono No Prestacional', 'Bono Cafeteria', 'Director de Área', 'Jefe de Área', 'Jefe Inmediato',
    'Fecha De Nacimiento', 'Ciudad De Nacimiento', 'Tipo De Dirección', 'Dirección', 'Barrio', 'Telefono',
    'E-Mail', 'Estado Civil', 'Numero de hijos', 'Contacto De Emergencia', 'Parentesco',
    'Telefono Contacto de Emergencia', 'Tipo De Cuenta', 'Numero De Cuenta', 'Numero de cuenta Correcta',
    'Fecha Fin Periodo De Prueba', 'Fecha Fin Contrato', 'Arl', 'Fecha De Afiliación Arl', 'TarifaArl', 'Eps',
    'Fecha Afiliación Eps', 'Fecha de Traslado', 'Traslado EPS', 'Afp', 'Fecha D eAfiliacion Afp',
    'FechadeTraslado', 'TrasladoAFP', 'Fondo Cesantias', 'Fecha Afiliacion Fondo De Cesantias',
    'Fecha de Traslado', 'Traslado Cesantias', 'Caja De Compensación', 'Fecha De Afiliación A Caja',
    'Vacuna Covid19 Tipo De Vacuna', 'Primera Dosis', 'Segunda Dosis', 'Estado', 'Modalidad', 'Fecha De Retiro',
    'Fecha Ultima Conexión', 'Tipo De Retiro', 'Motivo De Retiro', 'Justificacion', 'Entrega De Equipo',
    'Serial Diadema', 'Locker', 'RUT', 'Piso', 'Carnet', 'Observaciones',
    'Fecha Entrega Certificación Laboral Y Cesantias', 'Analista Encargado', 'DOTACIÓN', 'TALLA CAMISA',
    'TALLA PANTALON', 'TALLA CALZADO',
    // Campos nuevos (migración 050 / Excel de nómina) — se detectan por nombre de
    // columna en cualquier posición, no por índice fijo como el resto de esta lista.
    // Ver utils/importEmpleadosExcel.js::CAMPOS_NUEVOS_POR_NOMBRE en el backend.
    'Empresa', 'Clase', 'Periodo Pago', 'Clasificación Dian', 'Tipo Sena', 'Tipo Cotizante',
    'Subtipo De Cotizante', 'Declarante', 'Libreta Militar No.'
];

const descargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([ENCABEZADOS_PLANTILLA]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TOTAL PERSONAL');
    XLSX.writeFile(wb, 'plantilla_empleados.xlsx');
};

const ImportEmpleadosModal = ({ isOpen, onClose, onImportado }) => {
    const [paso, setPaso] = useState(PASO.SELECCION);
    const [archivo, setArchivo] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [arrastrando, setArrastrando] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [resultado, setResultado] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const cerrarConEscape = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', cerrarConEscape);
        return () => window.removeEventListener('keydown', cerrarConEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const reiniciar = () => {
        setPaso(PASO.SELECCION);
        setArchivo(null);
        setError('');
        setPreview(null);
        setResultado(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleCerrar = () => {
        const huboImportacion = !!resultado;
        reiniciar();
        onClose();
        if (huboImportacion) onImportado();
    };

    const procesarArchivo = async (file) => {
        if (!file) return;
        setArchivo(file);
        setError('');
        setCargando(true);
        try {
            const fd = new FormData();
            fd.append('archivo', file);
            const { data } = await userCompanyService.previewImportExcel(fd);
            setPreview(data);
            setPaso(PASO.PREVIEW);
        } catch (err) {
            console.error('Error al previsualizar el Excel:', err);
            setError(err.response?.data?.message || 'No se pudo leer el archivo. Verifica que sea el Excel correcto.');
        } finally {
            setCargando(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setArrastrando(false);
        procesarArchivo(e.dataTransfer.files?.[0]);
    };

    const handleConfirmar = async () => {
        if (!archivo) return;
        setCargando(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('archivo', archivo);
            const { data } = await userCompanyService.commitImportExcel(fd);
            setResultado(data);
            setPaso(PASO.RESULTADO);
        } catch (err) {
            console.error('Error al confirmar la importación:', err);
            setError(err.response?.data?.message || 'No se pudo completar la importación.');
        } finally {
            setCargando(false);
        }
    };

    const totalCatalogosNuevos = (obj) => Object.values(obj || {}).reduce((acc, arr) => acc + arr.length, 0);
    const totalAImportar = preview ? preview.a_crear + preview.a_actualizar : 0;

    return (
        <div className="ai-overlay ai-scope" onClick={onClose}>
            <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><FileSpreadsheet size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h2 className="ai-modal-title">Cargar empleados desde Excel</h2>
                        <p className="ai-modal-sub">Usa la plantilla para evitar errores de columnas</p>
                    </div>
                    <button className="ai-icon-btn" onClick={handleCerrar} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                </div>

                <div className="ai-modal-body">
                    {error && (
                        <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', width: '100%', marginBottom: 16 }}>
                            <AlertTriangle size={14} strokeWidth={1.75} />
                            {error}
                        </div>
                    )}

                    {paso === PASO.SELECCION && (
                        <div
                            className="ai-drop"
                            style={arrastrando ? { borderColor: 'var(--primary)', background: 'var(--primary-soft)' } : undefined}
                            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                            onDragLeave={() => setArrastrando(false)}
                            onDrop={handleDrop}
                        >
                            <span className="ai-modal-icon">
                                {cargando ? <Loader2 size={22} strokeWidth={1.75} className="animate-spin" /> : <Upload size={22} strokeWidth={1.75} />}
                            </span>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)' }}>
                                {cargando ? 'Leyendo archivo…' : (
                                    <>Arrastra tu archivo aquí o <button type="button" onClick={() => inputRef.current?.click()} style={{ background: 'none', border: 0, padding: 0, color: 'var(--primary)', font: 'inherit', cursor: 'pointer' }}>selecciónalo</button></>
                                )}
                            </p>
                            <p className="ai-help">.xlsx o .csv · máximo 15 MB</p>
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => procesarArchivo(e.target.files?.[0])}
                                className="hidden"
                                style={{ display: 'none' }}
                            />
                        </div>
                    )}

                    {paso === PASO.PREVIEW && preview && (
                        <div className="ai-stack">
                            <div className="ai-file">
                                <span className="ai-modal-icon" style={{ width: 36, height: 36 }}><File size={16} strokeWidth={1.75} /></span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{archivo?.name}</p>
                                    <p className="ai-help" style={{ margin: 0 }}>{preview.total_filas} filas · {preview.errores?.length || 0} con errores</p>
                                </div>
                            </div>

                            <div className="ai-kpi-strip">
                                <div>
                                    <div>
                                        <p className="ai-kpi-label">Filas en el archivo</p>
                                        <p className="ai-kpi-value ai-num">{preview.total_filas}</p>
                                    </div>
                                </div>
                                <div>
                                    <div>
                                        <p className="ai-kpi-label">Empleados nuevos</p>
                                        <p className="ai-kpi-value ai-num" style={{ color: 'var(--success)' }}>{preview.a_crear}</p>
                                    </div>
                                </div>
                                <div>
                                    <div>
                                        <p className="ai-kpi-label">A actualizar</p>
                                        <p className="ai-kpi-value ai-num" style={{ color: 'var(--primary)' }}>{preview.a_actualizar}</p>
                                    </div>
                                </div>
                            </div>

                            {totalCatalogosNuevos(preview.catalogos_nuevos) > 0 && (
                                <div className="ai-card" style={{ padding: 14 }}>
                                    <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                                        Catálogos nuevos que se crearían ({totalCatalogosNuevos(preview.catalogos_nuevos)})
                                    </p>
                                    <div style={{ maxHeight: 140, overflowY: 'auto', fontSize: 13, color: 'var(--ink-muted)' }}>
                                        {Object.entries(preview.catalogos_nuevos).map(([tabla, valores]) => (
                                            <div key={tabla}><strong style={{ color: 'var(--ink)' }}>{tabla}</strong>: {valores.length} nuevo(s)</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(preview.errores?.length > 0) && (
                                <div className="ai-card" style={{ padding: 14, background: 'var(--danger-soft)', borderColor: 'transparent' }}>
                                    <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: 'var(--danger)' }}>
                                        Filas con error ({preview.errores.length}) — no se importarán
                                    </p>
                                    <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 13, color: 'var(--danger)' }}>
                                        {preview.errores.map((e, i) => <div key={i}>Fila {e.fila} ({e.nombre}): {e.mensaje}</div>)}
                                    </div>
                                </div>
                            )}

                            {(preview.advertencias?.length > 0) && (
                                <div className="ai-card" style={{ padding: 14, background: 'var(--warning-soft)', borderColor: 'transparent' }}>
                                    <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: 'var(--warning)' }}>
                                        Advertencias ({preview.advertencias.length})
                                    </p>
                                    <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 13, color: 'var(--warning)' }}>
                                        {preview.advertencias.map((a, i) => <div key={i}>{a}</div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {paso === PASO.RESULTADO && resultado && (
                        <div className="ai-stack">
                            <div className="ai-kpi-strip">
                                <div>
                                    <div>
                                        <p className="ai-kpi-label">Creados</p>
                                        <p className="ai-kpi-value ai-num" style={{ color: 'var(--success)' }}>{resultado.creados}</p>
                                    </div>
                                </div>
                                <div>
                                    <div>
                                        <p className="ai-kpi-label">Actualizados</p>
                                        <p className="ai-kpi-value ai-num" style={{ color: 'var(--primary)' }}>{resultado.actualizados}</p>
                                    </div>
                                </div>
                                <div>
                                    <div>
                                        <p className="ai-kpi-label">Con error</p>
                                        <p className="ai-kpi-value ai-num" style={{ color: 'var(--danger)' }}>{resultado.con_error}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="ai-card" style={{ maxHeight: 260, overflowY: 'auto' }}>
                                {resultado.resultados.map((r) => (
                                    <div key={r.fila} className="ai-row" style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                                        {r.accion === 'error'
                                            ? <XCircle size={16} strokeWidth={1.75} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                                            : <CheckCircle2 size={16} strokeWidth={1.75} style={{ color: 'var(--success)', flexShrink: 0 }} />}
                                        <span className="ai-muted" style={{ width: 56, flexShrink: 0 }}>Fila {r.fila}</span>
                                        <span style={{ flex: 1, color: 'var(--ink)' }}>{r.nombre}</span>
                                        <span style={{ color: r.accion === 'error' ? 'var(--danger)' : 'var(--ink-muted)' }}>
                                            {r.accion === 'error' ? r.mensaje : r.accion}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {(resultado.advertencias?.length > 0) && (
                                <div className="ai-card" style={{ padding: 14, background: 'var(--warning-soft)', borderColor: 'transparent' }}>
                                    <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: 'var(--warning)' }}>
                                        Advertencias ({resultado.advertencias.length})
                                    </p>
                                    <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 13, color: 'var(--warning)' }}>
                                        {resultado.advertencias.map((a, i) => <div key={i}>{a}</div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="ai-modal-foot">
                    {paso === PASO.SELECCION && (
                        <>
                            <button type="button" className="ai-btn ai-btn--ghost" onClick={descargarPlantilla}>
                                <Download size={16} strokeWidth={1.75} />
                                Descargar plantilla
                            </button>
                            <button type="button" className="ai-btn ai-btn--secondary" onClick={handleCerrar} style={{ marginLeft: 'auto' }}>
                                Cancelar
                            </button>
                        </>
                    )}
                    {paso === PASO.PREVIEW && (
                        <>
                            <button type="button" className="ai-btn ai-btn--secondary" onClick={reiniciar}>
                                Elegir otro archivo
                            </button>
                            <button
                                type="button"
                                className="ai-btn ai-btn--primary"
                                onClick={handleConfirmar}
                                disabled={cargando || totalAImportar === 0}
                            >
                                {cargando && <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />}
                                Importar {totalAImportar} empleados
                            </button>
                        </>
                    )}
                    {paso === PASO.RESULTADO && (
                        <button type="button" className="ai-btn ai-btn--primary" onClick={handleCerrar} style={{ marginLeft: 'auto' }}>
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportEmpleadosModal;
