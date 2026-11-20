import React, { useEffect, useState } from 'react';
import { X, Download, RefreshCw, Wrench, MapPin, History, XCircle, User, Calendar, AlertCircle } from 'lucide-react';
import { assetHistoryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { descargarHojaVidaPdf } from '../utils/hojaVidaPdf';
import {
    ALERTAS,
    CAMPO_HISTORIAL,
    ESTADO_SOLICITUD,
    NOMBRE_TIPO_ACTIVO,
    TIPO_MANTENIMIENTO,
    formatoFecha,
    textoAlerta,
    textoEstado
} from '../utils/mantenimientoActivos';

const Seccion = ({ icono, titulo, children }) => {
    const Icono = icono;
    return (
        <section className="mb-6">
            <h3 className="flex items-center text-sm font-semibold text-gray-800 mb-2">
                <Icono className="h-4 w-4 mr-2 text-emerald-600" />
                {titulo}
            </h3>
            {children}
        </section>
    );
};

const Vacio = ({ texto }) => <p className="text-sm text-gray-400 italic">{texto}</p>;

const Dato = ({ label, valor }) => (
    <div>
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="text-sm text-gray-900">{valor || '—'}</dd>
    </div>
);

const Quien = ({ nombre, fecha }) => (
    <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
        <span className="flex items-center"><User className="h-3 w-3 mr-1" />{nombre || '—'}</span>
        <span className="flex items-center"><Calendar className="h-3 w-3 mr-1" />{formatoFecha(fecha)}</span>
    </div>
);

/**
 * Hoja de vida de un equipo: datos, componentes, alerta, mantenimientos con quién los hizo,
 * traslados de puesto, cambios y solicitudes de baja. Botón para descargarla en PDF.
 */
const HojaVidaModal = ({ activoId, onClose }) => {
    const { user } = useAuth();
    const [hoja, setHoja] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelado = false;
        assetHistoryService.getHojaVida(activoId)
            .then((res) => { if (!cancelado) setHoja(res.data.data); })
            .catch((err) => { if (!cancelado) setError(err.response?.data?.msg || 'No se pudo cargar la hoja de vida'); });
        return () => { cancelado = true; };
    }, [activoId]);

    const alerta = hoja?.alerta;
    const estiloAlerta = alerta ? ALERTAS[alerta.nivel] : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Hoja de vida {hoja ? `· ${hoja.activo.numero_placa}` : ''}</h2>
                        {hoja && (
                            <p className="text-sm text-gray-500">
                                {NOMBRE_TIPO_ACTIVO[hoja.activo.tipo_activo] || hoja.activo.tipo_activo} · {textoEstado(hoja.activo.estado)}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => descargarHojaVidaPdf(hoja, user?.full_name || user?.fullName || user?.username)}
                            disabled={!hoja}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <Download className="h-4 w-4 mr-1.5" />
                            Descargar PDF
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Cerrar">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    {error ? (
                        <div className="flex items-center p-4 rounded-lg bg-red-50 text-red-700 text-sm">
                            <AlertCircle className="h-5 w-5 mr-2" />{error}
                        </div>
                    ) : !hoja ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />Cargando hoja de vida...
                        </div>
                    ) : (
                        <>
                            {alerta && (
                                <div className={`mb-6 flex flex-wrap items-center gap-3 p-3 rounded-lg border ${estiloAlerta.badge}`}>
                                    <span className="font-semibold text-sm">{estiloAlerta.label}</span>
                                    <span className="text-sm">{textoAlerta(alerta)}</span>
                                    {alerta.deRegistroAnterior && (
                                        <span className="text-xs opacity-80">(según una nota de mantenimiento anterior)</span>
                                    )}
                                </div>
                            )}

                            <Seccion icono={MapPin} titulo="Datos del equipo">
                                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 rounded-lg p-4">
                                    <Dato label="Marca / modelo" valor={hoja.activo.marca_modelo} />
                                    <Dato label="Serie" valor={hoja.activo.numero_serie_fabricante} />
                                    <Dato label="Ubicación" valor={hoja.activo.ubicacion} />
                                    <Dato label="Site" valor={hoja.activo.site} />
                                    <Dato label="Puesto" valor={hoja.activo.puesto} />
                                    <Dato label="Asignado a" valor={hoja.activo.asignado} />
                                    <Dato label="CPU / Procesador" valor={hoja.activo.cpu_procesador} />
                                    <Dato label="Memoria RAM" valor={hoja.activo.memoria_ram} />
                                    <Dato label="Almacenamiento" valor={hoja.activo.almacenamiento} />
                                    <Dato label="Sistema operativo" valor={hoja.activo.sistema_operativo} />
                                    <Dato label="Clasificación" valor={hoja.activo.clasificacion} />
                                    <Dato label="Fecha de compra" valor={hoja.activo.fecha_compra ? formatoFecha(hoja.activo.fecha_compra, false) : null} />
                                </dl>
                            </Seccion>

                            <Seccion icono={Wrench} titulo={`Mantenimientos (${hoja.mantenimientos.length})`}>
                                {hoja.mantenimientos.length === 0 ? <Vacio texto="Sin mantenimientos registrados." /> : (
                                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                                        {hoja.mantenimientos.map((m) => (
                                            <li key={m.id} className="px-4 py-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                                        m.tipo === 'preventivo' ? 'bg-emerald-100 text-emerald-800'
                                                            : m.tipo === 'correctivo' ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {TIPO_MANTENIMIENTO[m.tipo] || m.tipo}
                                                    </span>
                                                    <Quien nombre={m.realizadoPor} fecha={m.fecha} />
                                                </div>
                                                {m.tareas.length > 0 && (
                                                    <p className="text-sm text-gray-800">{m.tareas.join(' · ')}</p>
                                                )}
                                                {m.descripcion && <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.descripcion}</p>}
                                                {m.componentes && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Componentes: {[m.componentes.cpu_procesador, m.componentes.memoria_ram, m.componentes.almacenamiento, m.componentes.sistema_operativo].filter(Boolean).join(' / ') || '—'}
                                                        {m.puesto ? ` · Puesto ${m.puesto}` : ''}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Seccion>

                            <Seccion icono={MapPin} titulo={`Traslados de puesto (${hoja.traslados.length})`}>
                                {hoja.traslados.length === 0 ? <Vacio texto="Sin traslados registrados." /> : (
                                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                                        {hoja.traslados.map((t) => (
                                            <li key={t.id} className="px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-sm text-gray-800">
                                                    {CAMPO_HISTORIAL[t.campo]}: <span className="text-red-600">{t.valorAnterior || '—'}</span> → <span className="text-green-700">{t.valorNuevo || '—'}</span>
                                                </span>
                                                <Quien nombre={t.modificadoPor} fecha={t.fecha} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Seccion>

                            <Seccion icono={History} titulo={`Cambios de componentes y estado (${hoja.cambios.length})`}>
                                {hoja.cambios.length === 0 ? <Vacio texto="Sin cambios registrados." /> : (
                                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                                        {hoja.cambios.map((c) => (
                                            <li key={c.id} className="px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-sm text-gray-800">
                                                    {CAMPO_HISTORIAL[c.campo] || c.campo}:{' '}
                                                    <span className="text-red-600">{c.campo === 'estado' ? textoEstado(c.valorAnterior) : (c.valorAnterior || '—')}</span>
                                                    {' → '}
                                                    <span className="text-green-700">{c.campo === 'estado' ? textoEstado(c.valorNuevo) : (c.valorNuevo || '—')}</span>
                                                </span>
                                                <Quien nombre={c.modificadoPor} fecha={c.fecha} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Seccion>

                            {hoja.solicitudesBaja.length > 0 && (
                                <Seccion icono={XCircle} titulo={`Solicitudes de baja (${hoja.solicitudesBaja.length})`}>
                                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                                        {hoja.solicitudesBaja.map((s) => (
                                            <li key={s.id} className="px-4 py-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                                                        {ESTADO_SOLICITUD[s.estado] || s.estado}
                                                    </span>
                                                    <Quien nombre={s.solicitadoPor} fecha={s.fechaSolicitud} />
                                                </div>
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{s.motivo}</p>
                                                {s.resueltoPor && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {ESTADO_SOLICITUD[s.estado]} por {s.resueltoPor} el {formatoFecha(s.fechaResolucion)}
                                                        {s.comentario ? ` — "${s.comentario}"` : ''}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </Seccion>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HojaVidaModal;
