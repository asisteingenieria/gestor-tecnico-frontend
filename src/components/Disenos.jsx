import React, { useState, useEffect, useRef } from 'react';
import { disenoService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Palette,
    Plus,
    Eye,
    CheckCircle,
    Clock,
    User,
    UserCheck,
    Trash2,
    X,
    Upload,
    Image,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    RotateCcw,
    Calendar,
    FilterX,
    Download,
    File,
    FileImage,
    FileText,
    Paperclip,
    Timer,
    AlarmClock,
    AlertTriangle,
    Pencil,
    Check,
    ChevronLeft,
    ChevronRight,
    History,
    RefreshCw,
    PauseCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001';

const ESTADO_CONFIG = {
    pendiente:   { label: 'Pendiente',    bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400' },
    en_progreso: { label: 'En Progreso',  bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
    en_espera:   { label: 'En Espera',    bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
    completado:  { label: 'Completado',   bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
    devuelto:    { label: 'Devuelto',     bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-400' }
};

const EstadoBadge = ({ estado }) => {
    const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const isImageFile = (filename) =>
    IMAGE_EXTS.includes(filename?.split('.').pop()?.toLowerCase());

const ImageGrid = ({ imagenes, onDelete, canDelete, onImageClick }) => {
    if (!imagenes || imagenes.length === 0) return null;
    const imageOnlyList = imagenes.filter(img => isImageFile(img.filename));
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {imagenes.map(img => {
                const imgIdx = imageOnlyList.findIndex(im => im.id === img.id);
                return (
                <div key={img.id} className="relative group">
                    {isImageFile(img.filename) ? (
                        <button
                            type="button"
                            onClick={() => onImageClick?.(imgIdx)}
                            className="block h-20 w-20 rounded-lg border border-gray-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                            <img
                                src={`${API_BASE}/api/files/disenos/${img.filename}`}
                                alt="adjunto"
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-colors flex items-center justify-center">
                                <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </button>
                    ) : (
                        <a
                            href={`${API_BASE}/api/files/disenos/${img.filename}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col items-center justify-center h-20 w-20 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors gap-1 px-1"
                        >
                            <File className="h-6 w-6 text-gray-400" />
                            <span className="text-gray-500 text-center leading-tight" style={{ fontSize: '9px', wordBreak: 'break-all', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {img.filename.split('_').slice(2).join('_') || img.filename}
                            </span>
                        </a>
                    )}
                    {canDelete && (
                        <button
                            onClick={() => onDelete(img.id)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                );
            })}
        </div>
    );
};

// ── Lightbox de imágenes ──────────────────────────────────────────────────────
const Lightbox = ({ images, startIndex, onClose, urlBuilder, labelBuilder }) => {
    const [current, setCurrent] = useState(startIndex);
    const getUrl = urlBuilder || (img => `${API_BASE}/api/files/disenos/${img.filename}`);
    const getLabel = labelBuilder || (img => img.filename.replace(/^\d+_\d+_/, ''));

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft')  setCurrent(i => Math.max(0, i - 1));
            if (e.key === 'ArrowRight') setCurrent(i => Math.min(images.length - 1, i + 1));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [images.length, onClose]);

    const img = images[current];

    return (
        <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col select-none">
            {/* Barra superior */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
                <span className="text-gray-300 text-sm font-medium">
                    {current + 1} / {images.length}
                </span>
                <p className="text-white text-sm truncate max-w-xs hidden sm:block">{getLabel(img)}</p>
                <div className="flex items-center gap-3">
                    <a
                        href={getUrl(img)}
                        download
                        className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
                        title="Descargar imagen"
                    >
                        <Download className="h-4 w-4" />
                        Descargar
                    </a>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors ml-2">
                        <X className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Área de imagen con flechas */}
            <div className="flex-1 flex items-center min-h-0">
                <button
                    onClick={() => setCurrent(i => Math.max(0, i - 1))}
                    disabled={current === 0}
                    className="shrink-0 px-3 sm:px-5 h-full flex items-center text-white disabled:opacity-20 hover:bg-white/5 transition-colors"
                >
                    <ChevronLeft className="h-10 w-10" />
                </button>

                <div className="flex-1 h-full flex items-center justify-center p-2 min-w-0">
                    <img
                        key={img.filename}
                        src={getUrl(img)}
                        alt=""
                        className="max-h-full max-w-full object-contain rounded"
                        style={{ userSelect: 'none' }}
                    />
                </div>

                <button
                    onClick={() => setCurrent(i => Math.min(images.length - 1, i + 1))}
                    disabled={current === images.length - 1}
                    className="shrink-0 px-3 sm:px-5 h-full flex items-center text-white disabled:opacity-20 hover:bg-white/5 transition-colors"
                >
                    <ChevronRight className="h-10 w-10" />
                </button>
            </div>

            {/* Tiras de miniaturas */}
            {images.length > 1 && (
                <div className="shrink-0 flex gap-2 px-4 py-3 overflow-x-auto">
                    {images.map((im, i) => (
                        <button
                            key={im.id}
                            onClick={() => setCurrent(i)}
                            className={`shrink-0 h-14 w-14 rounded overflow-hidden border-2 transition-colors ${
                                i === current ? 'border-purple-400' : 'border-transparent opacity-50 hover:opacity-80'
                            }`}
                        >
                            <img
                                src={getUrl(im)}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Modal Crear / Editar ──────────────────────────────────────────────────────
const DisenoFormModal = ({ onClose, onSaved, initial = null }) => {
    const [nombre, setNombre] = useState(initial?.nombre || '');
    const [descripcion, setDescripcion] = useState(initial?.descripcion || '');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef();

    const addFiles = (e) => {
        const incoming = Array.from(e.target.files);
        setFiles(prev => {
            const names = new Set(prev.map(f => f.name + f.size));
            return [...prev, ...incoming.filter(f => !names.has(f.name + f.size))];
        });
        e.target.value = '';
    };

    const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

    const submit = async (e) => {
        e.preventDefault();
        if (!nombre.trim() || !descripcion.trim()) {
            setError('Nombre y descripción son requeridos');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('nombre', nombre.trim());
            fd.append('descripcion', descripcion.trim());
            files.forEach(f => fd.append('imagenes', f));
            if (initial) {
                await disenoService.update(initial.id, fd);
            } else {
                await disenoService.create(fd);
            }
            onSaved();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar el diseño');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Palette className="h-5 w-5 text-purple-600" />
                        {initial ? 'Editar Diseño' : 'Nueva Solicitud de Diseño'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Ej. Banner redes sociales, Flyer evento..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                            rows={5}
                            placeholder="Describe con detalle qué diseño necesitas, colores, estilo, medidas, referencias, etc."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                        />
                    </div>

                    {/* Adjuntos */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Archivos de referencia
                                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                            </label>
                            {files.length > 0 && (
                                <span className="text-xs text-gray-500">{files.length} archivo{files.length > 1 ? 's' : ''}</span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 w-full text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                        >
                            <Upload className="h-4 w-4" />
                            Agregar imágenes, documentos, ZIP… (cualquier tipo)
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={addFiles}
                        />
                        <p className="text-xs text-gray-400 mt-1">Puedes agregar varias tandas. Máx. 20 MB por archivo.</p>

                        {/* Lista de archivos seleccionados */}
                        {files.length > 0 && (
                            <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-56 overflow-y-auto">
                                {files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-2">
                                        {f.type.startsWith('image/') ? (
                                            <img
                                                src={URL.createObjectURL(f)}
                                                alt=""
                                                className="h-9 w-9 object-cover rounded border shrink-0"
                                            />
                                        ) : (
                                            <div className="h-9 w-9 flex items-center justify-center bg-gray-100 rounded border shrink-0">
                                                <FileTypeIcon mimetype={f.type} className="h-5 w-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-700 truncate">{f.name}</p>
                                            <p className="text-xs text-gray-400">{formatBytes(f.size)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(i)}
                                            className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-60"
                        >
                            {loading ? 'Guardando...' : initial ? 'Actualizar' : 'Enviar Solicitud'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Modal Asignar Diseñador ───────────────────────────────────────────────────
const AsignarModal = ({ diseno, onClose, onSaved }) => {
    const [disenadores, setDisenadores] = useState([]);
    const [selected, setSelected] = useState(diseno.disenador_id || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        disenoService.getDisenadores()
            .then(r => setDisenadores(r.data.data || []))
            .catch(() => {});
    }, []);

    const submit = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            await disenoService.assign(diseno.id, selected);
            onSaved();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al asignar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                        Asignar Diseñador
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-600">Solicitud: <span className="font-medium">{diseno.nombre}</span></p>
                    <select
                        value={selected}
                        onChange={e => setSelected(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Seleccionar diseñador...</option>
                        {disenadores.map(d => (
                            <option key={d.id} value={d.id}>{d.full_name}</option>
                        ))}
                    </select>
                    {disenadores.length === 0 && (
                        <p className="text-xs text-gray-400">No hay usuarios con rol diseñador registrados.</p>
                    )}
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button
                            onClick={submit}
                            disabled={!selected || loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                        >
                            {loading ? 'Asignando...' : 'Asignar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Modal Devolver Diseño ─────────────────────────────────────────────────────
const ReturnModal = ({ diseno, onClose, onReturned }) => {
    const [nota, setNota] = useState('');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef();

    const addFiles = (e) => {
        const incoming = Array.from(e.target.files);
        setFiles(prev => {
            const names = new Set(prev.map(f => f.name + f.size));
            return [...prev, ...incoming.filter(f => !names.has(f.name + f.size))];
        });
        e.target.value = '';
    };

    const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

    const submit = async () => {
        if (!nota.trim()) {
            setError('Debes escribir una nota explicando la devolución');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('nota', nota.trim());
            files.forEach(f => fd.append('imagenes', f));
            await disenoService.return(diseno.id, fd);
            onReturned();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al devolver el diseño');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-orange-500" />
                        Devolver diseño
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-600">
                        Solicitud: <span className="font-medium">{diseno.nombre}</span>
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ¿Qué debe corregirse? <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={nota}
                            onChange={e => setNota(e.target.value)}
                            rows={4}
                            placeholder="Explica con detalle qué no está bien o qué cambios necesitas..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
                        />
                    </div>

                    {/* Reemplazar imágenes de referencia (opcional) */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Actualizar imágenes de referencia
                                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                            </label>
                            {files.length > 0 && diseno.imagenes?.length > 0 && (
                                <span className="text-xs text-orange-600 font-medium">
                                    Reemplazará {diseno.imagenes.length} imagen{diseno.imagenes.length !== 1 ? 'es' : ''} actual{diseno.imagenes.length !== 1 ? 'es' : ''}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 w-full text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors"
                        >
                            <Upload className="h-4 w-4" />
                            {files.length > 0
                                ? `${files.length} archivo${files.length > 1 ? 's' : ''} seleccionado${files.length > 1 ? 's' : ''}`
                                : 'Adjuntar nuevas imágenes de referencia…'}
                        </button>
                        <input ref={fileRef} type="file" multiple className="hidden" onChange={addFiles} />
                        {files.length > 0 && (
                            <>
                                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Las imágenes actuales serán reemplazadas al confirmar.
                                </p>
                                <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-2">
                                            {f.type.startsWith('image/') ? (
                                                <img src={URL.createObjectURL(f)} alt="" className="h-8 w-8 object-cover rounded border shrink-0" />
                                            ) : (
                                                <div className="h-8 w-8 flex items-center justify-center bg-gray-100 rounded border shrink-0">
                                                    <FileTypeIcon mimetype={f.type} className="h-4 w-4 text-gray-400" />
                                                </div>
                                            )}
                                            <p className="flex-1 text-sm text-gray-700 truncate">{f.name}</p>
                                            <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button
                            onClick={submit}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-60"
                        >
                            {loading ? 'Devolviendo...' : 'Devolver diseño'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Helper icono según mimetype ───────────────────────────────────────────────
const FileTypeIcon = ({ mimetype, className }) => {
    if (mimetype?.startsWith('image/')) return <FileImage className={className} />;
    if (mimetype === 'application/pdf') return <FileText className={className} />;
    return <File className={className} />;
};

const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const BOGOTA_OFFSET_MS = -5 * 3600000; // UTC-5, sin horario de verano

const formatDatetime = (dateStr) =>
    new Date(dateStr).toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });

const formatElapsed = (fromDate) => {
    const diffMs = Date.now() - new Date(fromDate).getTime();
    const totalMins = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMins / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days > 0) return `${days}d ${hours}h`;
    if (totalHours > 0) return `${totalHours}h ${totalMins % 60}m`;
    return totalMins <= 0 ? 'Ahora mismo' : `${totalMins}m`;
};

const formatOverdue = (fecha) => {
    const diffMs = Date.now() - new Date(fecha).getTime();
    const totalMins = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMins / 60);
    const days = Math.floor(totalHours / 24);
    if (days > 0) return `${days}d ${totalHours % 24}h`;
    if (totalHours > 0) return `${totalHours}h ${totalMins % 60}m`;
    return `${totalMins}m`;
};

const formatTimeUntil = (fecha) => {
    const diffMs = new Date(fecha).getTime() - Date.now();
    const totalMins = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMins / 60);
    const days = Math.floor(totalHours / 24);
    if (days > 0) return `${days}d ${totalHours % 24}h`;
    if (totalHours > 0) return `${totalHours}h ${totalMins % 60}m`;
    return `${totalMins}m`;
};

const toDatetimeLocal = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    // Resta 5 horas (UTC-5 Bogotá) sin depender del timezone del navegador
    return new Date(d.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 16);
};

// Hook que fuerza un re-render cada minuto para recalcular contadores
const useMinuteTick = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(id);
    }, []);
};

// Componente de tiempo transcurrido con actualización automática cada minuto
const ElapsedTime = ({ from }) => {
    const [label, setLabel] = useState(() => formatElapsed(from));
    useEffect(() => {
        const id = setInterval(() => setLabel(formatElapsed(from)), 60000);
        return () => clearInterval(id);
    }, [from]);
    return <span>{label}</span>;
};

// ── Modal Detalle ─────────────────────────────────────────────────────────────
const DisenoDetailModal = ({
    diseno, onClose, onComplete, onReturn, onDeleteImagen,
    canComplete, canReturn, canDeleteImagen,
    onUploadEntrega, onDeleteEntrega, canUploadEntrega,
    onReplaceEntregas,
    onToggleEspera, canToggleEspera,
    onSetFechaEstimada, canSetFechaEstimada,
    onDownloadAll, onDownloadAllEntregas
}) => {
    useMinuteTick();
    const [desc, setDescExpanded] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [togglingEspera, setTogglingEspera] = useState(false);
    const [uploadingEntrega, setUploadingEntrega] = useState(false);
    const [replacingEntregas, setReplacingEntregas] = useState(false);
    const [entregaError, setEntregaError] = useState('');
    const [editingFecha, setEditingFecha] = useState(false);
    const [fechaInput, setFechaInput] = useState(() => toDatetimeLocal(diseno.fecha_estimada));
    const [savingFecha, setSavingFecha] = useState(false);
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [downloadingEntregas, setDownloadingEntregas] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [lightboxEntregaIndex, setLightboxEntregaIndex] = useState(null);
    const [devoluciones, setDevoluciones] = useState([]);
    const [activeTab, setActiveTab] = useState('detalle');
    const entregaRef = useRef();
    const replaceEntregaRef = useRef();

    useEffect(() => {
        disenoService.getDevoluciones(diseno.id)
            .then(r => setDevoluciones(r.data.data || []))
            .catch(() => {});
    }, [diseno.id]);

    const imageFiles = (diseno.imagenes || []).filter(img => isImageFile(img.filename));
    const imageEntregas = (diseno.entregas || []).filter(a => isImageFile(a.filename));
    const nonImageEntregas = (diseno.entregas || []).filter(a => !isImageFile(a.filename));

    const handleDownloadAll = async () => {
        setDownloadingAll(true);
        try { await onDownloadAll(); }
        catch { /* error manejado en el padre */ }
        finally { setDownloadingAll(false); }
    };

    const handleDownloadAllEntregas = async () => {
        setDownloadingEntregas(true);
        try { await onDownloadAllEntregas(); }
        catch { /* error manejado en el padre */ }
        finally { setDownloadingEntregas(false); }
    };
    const longDesc = diseno.descripcion?.length > 300;

    const isAtrasado = diseno.fecha_estimada &&
        new Date(diseno.fecha_estimada) < new Date() &&
        diseno.estado !== 'completado';
    const isActive = ['en_progreso', 'devuelto'].includes(diseno.estado);

    const handleSaveFecha = async () => {
        setSavingFecha(true);
        try {
            // Trata el input como hora Bogotá (UTC-5) y convierte a UTC explícitamente
            const isoUTC = fechaInput
                ? new Date(new Date(fechaInput + ':00Z').getTime() - BOGOTA_OFFSET_MS).toISOString()
                : null;
            await onSetFechaEstimada(isoUTC);
            setEditingFecha(false);
        } catch {
            // error shown by parent
        } finally {
            setSavingFecha(false);
        }
    };

    const handleComplete = async () => {
        setCompleting(true);
        try { await onComplete(diseno.id); }
        finally { setCompleting(false); }
    };

    const handleToggleEspera = async () => {
        setTogglingEspera(true);
        try { await onToggleEspera(diseno); }
        finally { setTogglingEspera(false); }
    };

    const handleEntregaFiles = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setUploadingEntrega(true);
        setEntregaError('');
        const fd = new FormData();
        files.forEach(f => fd.append('archivos', f));
        try {
            await onUploadEntrega(fd);
        } catch (err) {
            setEntregaError(err.response?.data?.message || 'Error al subir archivos');
        } finally {
            setUploadingEntrega(false);
            e.target.value = '';
        }
    };

    const handleReplaceEntregaFiles = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        if (!confirm(`¿Reemplazar TODOS los archivos de entrega actuales (${diseno.entregas?.length || 0}) con los ${files.length} nuevos?`)) {
            e.target.value = '';
            return;
        }
        setReplacingEntregas(true);
        setEntregaError('');
        const fd = new FormData();
        files.forEach(f => fd.append('archivos', f));
        try {
            await onReplaceEntregas(fd);
        } catch (err) {
            setEntregaError(err.response?.data?.message || 'Error al reemplazar archivos');
        } finally {
            setReplacingEntregas(false);
            e.target.value = '';
        }
    };

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-0 shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 truncate pr-4">
                        <Palette className="h-5 w-5 text-purple-600 shrink-0" />
                        {diseno.nombre}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="h-5 w-5" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b shrink-0 px-5 mt-3">
                    <button
                        onClick={() => setActiveTab('detalle')}
                        className={`py-2.5 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'detalle'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Detalle
                    </button>
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={`py-2.5 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                            activeTab === 'historial'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <History className="h-3.5 w-3.5" />
                        Historial de devoluciones
                        {devoluciones.length > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                activeTab === 'historial'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-600'
                            }`}>
                                {devoluciones.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content scrollable */}
                <div className="overflow-y-auto flex-1">

                    {/* ── Pestaña Detalle ── */}
                    {activeTab === 'detalle' && (
                        <div className="p-5 space-y-5">
                            {/* Estado y alerta de atraso */}
                            <div className="flex flex-wrap gap-2 items-center justify-between">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <EstadoBadge estado={diseno.estado} />
                                    {isAtrasado && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                            <AlertTriangle className="h-3.5 w-3.5" /> Atrasado
                                        </span>
                                    )}
                                </div>
                                {/* Switch pausar — solo diseñador asignado */}
                                {canToggleEspera && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                            {diseno.estado === 'en_espera' ? 'Pausada' : 'Pausar'}
                                        </span>
                                        <button
                                            onClick={handleToggleEspera}
                                            disabled={togglingEspera}
                                            title={diseno.estado === 'en_espera' ? 'Reanudar solicitud' : 'Poner en espera'}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                                                diseno.estado === 'en_espera' ? 'bg-gray-400' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                                                diseno.estado === 'en_espera' ? 'translate-x-4' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Bloque de tiempos */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        Solicitado: <span className="font-medium text-gray-700">{formatDatetime(diseno.created_at)}</span>
                                    </span>
                                    {isActive && (
                                        <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                                            <Timer className="h-3.5 w-3.5" />
                                            <ElapsedTime from={diseno.created_at} /> en proceso
                                        </span>
                                    )}
                                </div>
                                {isAtrasado ? (
                                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-red-700">Entrega atrasada</p>
                                            <p className="text-xs text-red-600 mt-0.5">Estimado: {formatDatetime(diseno.fecha_estimada)}</p>
                                            <p className="text-xs text-red-600">Atrasado por: <span className="font-medium">{formatOverdue(diseno.fecha_estimada)}</span></p>
                                        </div>
                                    </div>
                                ) : diseno.fecha_estimada ? (
                                    <div className="flex items-center gap-1.5 text-xs text-green-700">
                                        <AlarmClock className="h-3.5 w-3.5" />
                                        Entrega estimada: <span className="font-medium">{formatDatetime(diseno.fecha_estimada)}</span>
                                        {diseno.estado !== 'completado' && (
                                            <span className="text-gray-400">· faltan {formatTimeUntil(diseno.fecha_estimada)}</span>
                                        )}
                                    </div>
                                ) : null}
                                {canSetFechaEstimada && !editingFecha && (
                                    <button onClick={() => setEditingFecha(true)} className="flex items-center gap-1.5 text-xs text-purple-600 hover:underline">
                                        <Pencil className="h-3 w-3" />
                                        {diseno.fecha_estimada ? 'Cambiar fecha estimada' : 'Establecer fecha estimada'}
                                    </button>
                                )}
                                {canSetFechaEstimada && editingFecha && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <input
                                            type="datetime-local"
                                            value={fechaInput}
                                            onChange={e => setFechaInput(e.target.value)}
                                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <button onClick={handleSaveFecha} disabled={savingFecha} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60">
                                            <Check className="h-3.5 w-3.5" />
                                            {savingFecha ? 'Guardando...' : 'Guardar'}
                                        </button>
                                        <button onClick={() => { setEditingFecha(false); setFechaInput(toDatetimeLocal(diseno.fecha_estimada)); }} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Personas */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-0.5">Solicitante</p>
                                    <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                                        <User className="h-4 w-4 text-gray-400" />
                                        {diseno.solicitante_nombre || 'Sin nombre'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-0.5">Diseñador</p>
                                    <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                                        <UserCheck className="h-4 w-4 text-gray-400" />
                                        {diseno.disenador_nombre || <span className="text-gray-400 font-normal">Sin asignar</span>}
                                    </p>
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1.5">Descripción</h3>
                                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {longDesc && !desc ? <>{diseno.descripcion.slice(0, 300)}...</> : diseno.descripcion}
                                </div>
                                {longDesc && (
                                    <button onClick={() => setDescExpanded(!desc)} className="mt-1 text-xs text-purple-600 hover:underline flex items-center gap-1">
                                        {desc ? <><ChevronUp className="h-3.5 w-3.5" /> Ver menos</> : <><ChevronDown className="h-3.5 w-3.5" /> Ver más</>}
                                    </button>
                                )}
                            </div>

                            {/* Archivos de referencia */}
                            {diseno.imagenes?.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                            <Paperclip className="h-4 w-4 text-gray-400" />
                                            Archivos de referencia ({diseno.imagenes.length})
                                            {imageFiles.length > 0 && (
                                                <span className="text-xs font-normal text-gray-400">· {imageFiles.length} imagen{imageFiles.length > 1 ? 'es' : ''}</span>
                                            )}
                                        </h3>
                                        <button onClick={handleDownloadAll} disabled={downloadingAll} className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium disabled:opacity-60 transition-colors">
                                            <Download className="h-3.5 w-3.5" />
                                            {downloadingAll ? 'Descargando...' : 'Descargar todo'}
                                        </button>
                                    </div>
                                    <ImageGrid imagenes={diseno.imagenes} onDelete={onDeleteImagen} canDelete={canDeleteImagen} onImageClick={setLightboxIndex} />
                                </div>
                            )}

                            {/* Archivos de entrega */}
                            {(diseno.entregas?.length > 0 || canUploadEntrega) && (
                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                            <Paperclip className="h-4 w-4 text-purple-500" />
                                            Archivos entregados
                                            {diseno.entregas?.length > 0 && (
                                                <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{diseno.entregas.length}</span>
                                            )}
                                        </h3>
                                        {diseno.entregas?.length > 0 && (
                                            <button onClick={handleDownloadAllEntregas} disabled={downloadingEntregas} className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium disabled:opacity-60 transition-colors">
                                                <Download className="h-3.5 w-3.5" />
                                                {downloadingEntregas ? 'Descargando...' : 'Descargar todo'}
                                            </button>
                                        )}
                                    </div>

                                    {diseno.entregas?.length > 0 ? (
                                        <>
                                            {imageEntregas.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {imageEntregas.map((archivo, idx) => (
                                                        <div key={archivo.id} className="relative group">
                                                            <button type="button" onClick={() => setLightboxEntregaIndex(idx)} className="block h-20 w-20 rounded-lg border border-gray-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-purple-400">
                                                                <img src={`${API_BASE}/api/files/disenos/entregas/${archivo.filename}`} alt={archivo.original_name} className="h-full w-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-colors flex items-center justify-center">
                                                                    <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </button>
                                                            {canUploadEntrega && (
                                                                <button onClick={() => onDeleteEntrega(archivo.id)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {nonImageEntregas.length > 0 && (
                                                <ul className="space-y-2">
                                                    {nonImageEntregas.map(archivo => (
                                                        <li key={archivo.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                                                            <FileTypeIcon mimetype={archivo.mimetype} className="h-5 w-5 text-purple-400 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-gray-800 truncate font-medium">{archivo.original_name}</p>
                                                                <p className="text-xs text-gray-400">{formatBytes(archivo.size)}</p>
                                                            </div>
                                                            <a href={`${API_BASE}/api/files/disenos/entregas/${archivo.filename}`} download={archivo.original_name} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors" title="Descargar">
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                            {canUploadEntrega && (
                                                                <button onClick={() => onDeleteEntrega(archivo.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar archivo">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">Aún no se han subido archivos de entrega.</p>
                                    )}

                                    {canUploadEntrega && (
                                        <div className="space-y-2">
                                            {entregaError && (
                                                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                                    {entregaError}
                                                </div>
                                            )}
                                            <button type="button" onClick={() => entregaRef.current?.click()} disabled={uploadingEntrega || replacingEntregas} className="flex items-center gap-2 border-2 border-dashed border-purple-300 rounded-lg px-4 py-3 w-full text-sm text-purple-600 hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-60">
                                                <Upload className="h-4 w-4" />
                                                {uploadingEntrega ? 'Subiendo...' : 'Agregar archivos de entrega (imágenes, PDF, AI, PSD, ZIP…)'}
                                            </button>
                                            <input ref={entregaRef} type="file" multiple className="hidden" onChange={handleEntregaFiles} />
                                            {diseno.entregas?.length > 0 && (
                                                <>
                                                    <button type="button" onClick={() => replaceEntregaRef.current?.click()} disabled={replacingEntregas || uploadingEntrega} className="flex items-center gap-2 border-2 border-dashed border-red-200 rounded-lg px-4 py-3 w-full text-sm text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-60">
                                                        <RefreshCw className="h-4 w-4" />
                                                        {replacingEntregas ? 'Reemplazando...' : 'Reemplazar todas las entregas (elimina las actuales)'}
                                                    </button>
                                                    <input ref={replaceEntregaRef} type="file" multiple className="hidden" onChange={handleReplaceEntregaFiles} />
                                                    <p className="text-xs text-red-400 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Reemplazar borra permanentemente todos los archivos anteriores del servidor.
                                                    </p>
                                                </>
                                            )}
                                            <p className="text-xs text-gray-400">Cualquier tipo de archivo · máx. 100 MB por archivo · máx. 10 archivos</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Acciones */}
                            {(canComplete || canReturn) && (
                                <div className="pt-2 border-t flex flex-col gap-2">
                                    {canComplete && ['en_progreso', 'devuelto'].includes(diseno.estado) && (
                                        <button onClick={handleComplete} disabled={completing} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
                                            <CheckCircle className="h-4 w-4" />
                                            {completing ? 'Marcando...' : 'Marcar como Completado'}
                                        </button>
                                    )}
                                    {canReturn && diseno.estado === 'completado' && (
                                        <button onClick={() => onReturn(diseno)} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
                                            <RotateCcw className="h-4 w-4" />
                                            Devolver al diseñador
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Pestaña Historial ── */}
                    {activeTab === 'historial' && (
                        <div className="p-5">
                            {devoluciones.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <History className="h-10 w-10 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">Sin devoluciones registradas</p>
                                    <p className="text-xs mt-1">Este diseño no ha sido devuelto aún.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xs text-gray-500">
                                        {devoluciones.length} devolución{devoluciones.length > 1 ? 'es' : ''} registrada{devoluciones.length > 1 ? 's' : ''}
                                    </p>
                                    {devoluciones.map(d => (
                                        <div key={d.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                                    <RotateCcw className="h-3 w-3" />
                                                    Devolución #{d.numero_devolucion}
                                                </span>
                                                <span className="text-xs text-gray-400 shrink-0">{formatDatetime(d.created_at)}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                Por: <span className="font-medium text-gray-700">{d.solicitante_nombre}</span>
                                            </p>
                                            <p className="text-sm text-orange-900 whitespace-pre-wrap leading-relaxed">{d.nota}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>

        {/* Lightbox archivos de referencia */}
        {lightboxIndex !== null && imageFiles.length > 0 && (
            <Lightbox images={imageFiles} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
        )}
        {/* Lightbox entregas */}
        {lightboxEntregaIndex !== null && imageEntregas.length > 0 && (
            <Lightbox
                images={imageEntregas}
                startIndex={lightboxEntregaIndex}
                onClose={() => setLightboxEntregaIndex(null)}
                urlBuilder={a => `${API_BASE}/api/files/disenos/entregas/${a.filename}`}
                labelBuilder={a => a.original_name}
            />
        )}
        </>
    );
};

// ── Tarjeta de diseño ─────────────────────────────────────────────────────────
const DisenoCard = ({ diseno, onView, onAssign, onDelete, isAdminOrCoord, onToggleEspera, canToggleEspera }) => {
    const [toggling, setToggling] = useState(false);
    useMinuteTick();
    const isAtrasado = diseno.fecha_estimada &&
        new Date(diseno.fecha_estimada) < new Date() &&
        diseno.estado !== 'completado';
    const isActive = ['en_progreso', 'devuelto'].includes(diseno.estado);
    const isEnEspera = diseno.estado === 'en_espera';

    const handleToggle = async (e) => {
        e.stopPropagation();
        setToggling(true);
        try { await onToggleEspera(diseno); }
        finally { setToggling(false); }
    };

    return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3 ${isAtrasado ? 'border-red-300' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">{diseno.nombre}</h3>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <EstadoBadge estado={diseno.estado} />
                {isAtrasado && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertTriangle className="h-3 w-3" /> Atrasado
                    </span>
                )}
            </div>
        </div>

        {/* Switch pausar/reanudar — solo para el diseñador asignado */}
        {canToggleEspera && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-600 flex items-center gap-1.5">
                    <PauseCircle className="h-3.5 w-3.5 text-gray-400" />
                    {isEnEspera ? 'En espera (pausada)' : 'Pausar solicitud'}
                </span>
                <button
                    onClick={handleToggle}
                    disabled={toggling}
                    title={isEnEspera ? 'Reanudar → en progreso' : 'Pausar solicitud'}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                        isEnEspera ? 'bg-gray-400' : 'bg-gray-200'
                    }`}
                >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                        isEnEspera ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                </button>
            </div>
        )}

        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed flex-1">{diseno.descripcion}</p>

        {diseno.estado === 'devuelto' && diseno.devolucion_nota && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-800">
                <span className="font-medium flex items-center gap-1 mb-0.5">
                    <RotateCcw className="h-3 w-3" /> Motivo de devolución:
                </span>
                <p className="line-clamp-2">{diseno.devolucion_nota}</p>
            </div>
        )}

        {/* Tiempos */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDatetime(diseno.created_at)}
            </span>
            {isActive && (
                <span className="flex items-center gap-1 text-blue-500 font-medium">
                    <Timer className="h-3.5 w-3.5" />
                    <ElapsedTime from={diseno.created_at} />
                    <span className="font-normal text-blue-400">en proceso</span>
                </span>
            )}
            {diseno.fecha_estimada && !isAtrasado && diseno.estado !== 'completado' && (
                <span className="flex items-center gap-1 text-green-600">
                    <AlarmClock className="h-3.5 w-3.5" />
                    Entrega en {formatTimeUntil(diseno.fecha_estimada)}
                </span>
            )}
            {diseno.estado === 'completado' && (
                <>
                    {diseno.fecha_estimada && (
                        <span className="flex items-center gap-1 text-gray-400">
                            <AlarmClock className="h-3.5 w-3.5" />
                            Est: {formatDatetime(diseno.fecha_estimada)}
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-green-700 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Entregado el {formatDatetime(diseno.updated_at)}
                    </span>
                </>
            )}
            {isAtrasado && (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                    <AlarmClock className="h-3.5 w-3.5" />
                    Atrasado {formatOverdue(diseno.fecha_estimada)}
                </span>
            )}
        </div>

        <div className="flex items-center gap-3">
            {diseno.imagenes?.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Image className="h-3.5 w-3.5" />
                    {diseno.imagenes.length} imagen{diseno.imagenes.length > 1 ? 'es' : ''}
                </span>
            )}
            {diseno.entregas_count > 0 && (
                <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                    <Paperclip className="h-3.5 w-3.5" />
                    {diseno.entregas_count} entregado{diseno.entregas_count > 1 ? 's' : ''}
                </span>
            )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
            <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {diseno.solicitante_nombre || '—'}
            </span>
            {diseno.disenador_nombre ? (
                <span className="flex items-center gap-1 text-blue-600">
                    <UserCheck className="h-3.5 w-3.5" />
                    {diseno.disenador_nombre}
                </span>
            ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Sin asignar
                </span>
            )}
        </div>

        <div className="flex gap-2">
            <button
                onClick={() => onView(diseno)}
                className="flex-1 text-xs py-1.5 px-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
            >
                <Eye className="h-3.5 w-3.5" />
                Ver detalle
            </button>
            {isAdminOrCoord && (
                <>
                    <button
                        onClick={() => onAssign(diseno)}
                        title="Asignar diseñador"
                        className="p-1.5 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                        <UserCheck className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(diseno)}
                        title="Eliminar"
                        className="p-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </>
            )}
        </div>
    </div>
    );
};

// ── Vista principal ───────────────────────────────────────────────────────────
const FILTROS = [
    { key: '', label: 'Todos' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'en_progreso', label: 'En Progreso' },
    { key: 'en_espera', label: 'En Espera' },
    { key: 'devuelto', label: 'Devueltos' }
];

const Disenos = ({ defaultFiltro = '' }) => {
    const { user, isAdmin, isCoordinador, isDisenador } = useAuth();
    const isAdminOrCoord = isCoordinador;

    const [disenos, setDisenos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState(defaultFiltro);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [detailDiseno, setDetailDiseno] = useState(null);
    const [asignarDiseno, setAsignarDiseno] = useState(null);
    const [returnDiseno, setReturnDiseno] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filtro) params.estado = filtro;
            if (fechaDesde) params.fecha_desde = fechaDesde;
            if (fechaHasta) params.fecha_hasta = fechaHasta;
            const res = await disenoService.getAll(params);
            setDisenos(res.data.data || []);
        } catch (err) {
            console.error('Error cargando diseños:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setFiltro(defaultFiltro); }, [defaultFiltro]);

    useEffect(() => { load(); }, [filtro, fechaDesde, fechaHasta]);

    // Refresco automático del servidor cada 5 minutos para mantener datos actualizados
    useEffect(() => {
        const id = setInterval(load, 5 * 60000);
        return () => clearInterval(id);
    }, [filtro, fechaDesde, fechaHasta]);

    const limpiarFechas = () => {
        setFechaDesde('');
        setFechaHasta('');
    };

    const handleComplete = async (id) => {
        try {
            await disenoService.complete(id);
            const updated = await disenoService.getById(id);
            setDetailDiseno(updated.data.data);
            load();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al completar');
        }
    };

    const handleDeleteImagen = async (imagenId) => {
        if (!confirm('¿Eliminar esta imagen?')) return;
        try {
            await disenoService.deleteImagen(detailDiseno.id, imagenId);
            const updated = await disenoService.getById(detailDiseno.id);
            setDetailDiseno(updated.data.data);
            load();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al eliminar imagen');
        }
    };

    const handleView = async (diseno) => {
        try {
            const res = await disenoService.getById(diseno.id);
            setDetailDiseno(res.data.data);
        } catch {
            setDetailDiseno(diseno);
        }
    };

    const handleDelete = async (diseno) => {
        if (!confirm(`¿Eliminar la solicitud "${diseno.nombre}"?`)) return;
        try {
            await disenoService.delete(diseno.id);
            load();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al eliminar');
        }
    };

    const handleDownloadAll = async () => {
        const res = await disenoService.downloadImagenes(detailDiseno.id);
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${detailDiseno.nombre}_referencias.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadAllEntregas = async () => {
        const res = await disenoService.downloadEntregas(detailDiseno.id);
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${detailDiseno.nombre}_entregas.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSetFechaEstimada = async (fecha) => {
        try {
            await disenoService.setFechaEstimada(detailDiseno.id, fecha);
            const updated = await disenoService.getById(detailDiseno.id);
            setDetailDiseno(updated.data.data);
            load();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al guardar la fecha');
            throw err;
        }
    };

    const handleUploadEntrega = async (formData) => {
        await disenoService.uploadEntrega(detailDiseno.id, formData);
        const updated = await disenoService.getById(detailDiseno.id);
        setDetailDiseno(updated.data.data);
        load();
    };

    const handleReplaceEntregas = async (formData) => {
        await disenoService.replaceEntregas(detailDiseno.id, formData);
        const updated = await disenoService.getById(detailDiseno.id);
        setDetailDiseno(updated.data.data);
        load();
    };

    const handleDeleteEntrega = async (archivoId) => {
        if (!confirm('¿Eliminar este archivo de entrega?')) return;
        try {
            await disenoService.deleteEntrega(detailDiseno.id, archivoId);
            const updated = await disenoService.getById(detailDiseno.id);
            setDetailDiseno(updated.data.data);
            load();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al eliminar archivo');
        }
    };

    const canComplete = (d) =>
        isDisenador && d.disenador_id === user?.id;

    const canReturn = (d) =>
        !isAdmin && !isDisenador && d.solicitante_id === user?.id;

    const canDeleteImg = (d) =>
        !isAdmin && !isDisenador && d.solicitante_id === user?.id;

    const canUploadEntrega = (d) =>
        isDisenador && d.disenador_id === user?.id;

    const canSetFechaEstimada = (d) =>
        isDisenador && d.disenador_id === user?.id;

    const canToggleEspera = (d) =>
        isDisenador && d.disenador_id === user?.id && ['en_progreso', 'en_espera'].includes(d.estado);

    const handleToggleEspera = async (diseno) => {
        try {
            await disenoService.toggleEspera(diseno.id);
            if (detailDiseno?.id === diseno.id) {
                const updated = await disenoService.getById(diseno.id);
                setDetailDiseno(updated.data.data);
            }
            load();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al cambiar estado');
        }
    };

    const handleReturn = (d) => {
        setDetailDiseno(null);
        setReturnDiseno(d);
    };

    // Contadores por estado
    const counts = FILTROS.slice(1).reduce((acc, f) => {
        acc[f.key] = disenos.filter(d => d.estado === f.key).length;
        return acc;
    }, {});

    const isCompletadosPage = defaultFiltro === 'completado';

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {isCompletadosPage
                            ? <><CheckCircle className="h-7 w-7 text-green-600" /> Diseños Completados</>
                            : <><Palette className="h-7 w-7 text-purple-600" /> Diseños</>
                        }
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {isCompletadosPage
                            ? `${disenos.length} solicitud${disenos.length !== 1 ? 'es' : ''} completada${disenos.length !== 1 ? 's' : ''}`
                            : 'Solicitudes y gestión de diseños gráficos'
                        }
                    </p>
                </div>
                {!isAdmin && !isCompletadosPage && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors self-start sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva Solicitud
                    </button>
                )}
            </div>

            {/* Tarjetas de resumen — solo en la página principal */}
            {!isCompletadosPage && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Pendientes', count: counts.pendiente, color: 'yellow', icon: Clock },
                        { label: 'En Progreso', count: counts.en_progreso, color: 'blue', icon: UserCheck },
                        { label: 'En Espera', count: counts.en_espera, color: 'gray', icon: PauseCircle },
                        { label: 'Devueltos', count: counts.devuelto, color: 'orange', icon: RotateCcw }
                    ].map(({ label, count, color, icon: Icon }) => (
                        <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-4`}>
                            <div className="flex items-center justify-between">
                                <p className={`text-xs font-medium text-${color}-700`}>{label}</p>
                                <Icon className={`h-4 w-4 text-${color}-500`} />
                            </div>
                            <p className={`text-2xl font-bold text-${color}-800 mt-1`}>{count}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filtros — pestañas de estado solo en página principal; fechas en ambas */}
            <div className="space-y-3">
                {!isCompletadosPage && (
                    <div className="flex gap-2 flex-wrap">
                        {FILTROS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFiltro(f.key)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                    filtro === f.key
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {f.label}
                                {f.key && counts[f.key] > 0 && (
                                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filtro === f.key ? 'bg-purple-500' : 'bg-gray-100 text-gray-600'}`}>
                                        {counts[f.key]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-500">Desde</span>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={e => setFechaDesde(e.target.value)}
                            max={fechaHasta || undefined}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Hasta</span>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={e => setFechaHasta(e.target.value)}
                            min={fechaDesde || undefined}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    {(fechaDesde || fechaHasta) && (
                        <button
                            onClick={limpiarFechas}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
                            title="Limpiar filtro de fechas"
                        >
                            <FilterX className="h-4 w-4" />
                            Limpiar fechas
                        </button>
                    )}
                </div>
            </div>

            {/* Contenido */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-full" />
                            <div className="h-3 bg-gray-100 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : disenos.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Palette className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-base font-medium">No hay solicitudes de diseño</p>
                    {!isAdmin && (
                        <p className="text-sm mt-1">
                            <button onClick={() => setShowForm(true)} className="text-purple-600 hover:underline">
                                Crea la primera solicitud
                            </button>
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {disenos.map(d => (
                        <DisenoCard
                            key={d.id}
                            diseno={d}
                            isAdminOrCoord={isAdminOrCoord}
                            onView={handleView}
                            onAssign={setAsignarDiseno}
                            onDelete={handleDelete}
                            onToggleEspera={handleToggleEspera}
                            canToggleEspera={canToggleEspera(d)}
                        />
                    ))}
                </div>
            )}

            {/* Modales */}
            {showForm && (
                <DisenoFormModal
                    onClose={() => setShowForm(false)}
                    onSaved={() => { setShowForm(false); load(); }}
                />
            )}

            {detailDiseno && (
                <DisenoDetailModal
                    diseno={detailDiseno}
                    onClose={() => setDetailDiseno(null)}
                    onComplete={handleComplete}
                    onReturn={handleReturn}
                    onDeleteImagen={handleDeleteImagen}
                    canComplete={canComplete(detailDiseno)}
                    canReturn={canReturn(detailDiseno)}
                    canDeleteImagen={canDeleteImg(detailDiseno)}
                    onUploadEntrega={handleUploadEntrega}
                    onDeleteEntrega={handleDeleteEntrega}
                    canUploadEntrega={canUploadEntrega(detailDiseno)}
                    onReplaceEntregas={handleReplaceEntregas}
                    onToggleEspera={handleToggleEspera}
                    canToggleEspera={canToggleEspera(detailDiseno)}
                    onSetFechaEstimada={handleSetFechaEstimada}
                    canSetFechaEstimada={canSetFechaEstimada(detailDiseno)}
                    onDownloadAll={handleDownloadAll}
                    onDownloadAllEntregas={handleDownloadAllEntregas}
                />
            )}

            {returnDiseno && (
                <ReturnModal
                    diseno={returnDiseno}
                    onClose={() => setReturnDiseno(null)}
                    onReturned={() => { setReturnDiseno(null); load(); }}
                />
            )}

            {asignarDiseno && (
                <AsignarModal
                    diseno={asignarDiseno}
                    onClose={() => setAsignarDiseno(null)}
                    onSaved={() => { setAsignarDiseno(null); load(); }}
                />
            )}
        </div>
    );
};

export default Disenos;
