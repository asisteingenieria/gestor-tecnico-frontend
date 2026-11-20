import React, { useState } from 'react';
import { X, Save, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { assetHistoryService } from '../services/api';
import { TAREAS_PREVENTIVAS, esComputador } from '../utils/mantenimientoActivos';

const MIN_DESCRIPCION = 10;

/**
 * Registrar un mantenimiento:
 * - Preventivo (solo computadores): casillas pasta térmica / limpieza / formateo + observaciones opcionales.
 * - Correctivo: descripción obligatoria.
 * Si el equipo estaba "en mantenimiento", al guardar vuelve a "funcional" (lo hace el backend).
 */
const MantenimientoModal = ({ activo, onClose, onGuardado }) => {
    const permitePreventivo = esComputador(activo.tipo_activo);
    const [tipo, setTipo] = useState(permitePreventivo ? 'preventivo' : 'correctivo');
    const [tareas, setTareas] = useState({ pasta_termica: false, limpieza_componentes: false, formateo: false });
    const [descripcion, setDescripcion] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const finaliza = activo.estado === 'en_mantenimiento';
    const valido = tipo === 'preventivo'
        ? Object.values(tareas).some(Boolean)
        : descripcion.trim().length >= MIN_DESCRIPCION;

    const guardar = async () => {
        if (!valido) return;
        try {
            setGuardando(true);
            setError('');
            const datos = tipo === 'preventivo'
                ? { tipo, ...tareas, descripcion: descripcion.trim() || undefined }
                : { tipo, descripcion: descripcion.trim() };
            const res = await assetHistoryService.registrarMantenimiento(activo.id, datos);
            onGuardado(res.data);
        } catch (err) {
            setError(err.response?.data?.msg || 'No se pudo registrar el mantenimiento');
        } finally {
            setGuardando(false);
        }
    };

    const BotonTipo = ({ valor, icono, label, ayuda, deshabilitado }) => {
        const Icono = icono;
        return (
            <button
                type="button"
                onClick={() => setTipo(valor)}
                disabled={deshabilitado}
                className={`flex-1 text-left p-3 rounded-lg border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    tipo === valor ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'
                }`}
            >
                <span className="flex items-center font-medium text-gray-900"><Icono className="h-4 w-4 mr-2 text-emerald-600" />{label}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{ayuda}</span>
            </button>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {finaliza ? 'Finalizar mantenimiento' : 'Registrar mantenimiento'} · {activo.numero_placa}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex gap-3 mb-4">
                    <BotonTipo
                        valor="preventivo"
                        icono={ShieldCheck}
                        label="Preventivo"
                        ayuda={permitePreventivo ? 'Pasta térmica, limpieza, formateo' : 'Solo para computadores'}
                        deshabilitado={!permitePreventivo}
                    />
                    <BotonTipo valor="correctivo" icono={Wrench} label="Correctivo" ayuda="Reparación: describa qué se hizo" />
                </div>

                {tipo === 'preventivo' ? (
                    <>
                        <p className="text-sm font-medium text-gray-700 mb-2">¿Qué se le hizo al equipo?</p>
                        <div className="space-y-2 mb-4">
                            {TAREAS_PREVENTIVAS.map(({ campo, label }) => (
                                <label key={campo} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={tareas[campo]}
                                        onChange={(e) => setTareas((t) => ({ ...t, [campo]: e.target.checked }))}
                                        className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                    />
                                    <span className="ml-3 text-sm text-gray-800">{label}</span>
                                </label>
                            ))}
                        </div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Algo adicional que quiera dejar anotado..."
                        />
                    </>
                ) : (
                    <>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del mantenimiento correctivo *</label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={5}
                            maxLength={2000}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Qué falla tenía el equipo y qué se le hizo para repararlo..."
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1">Mínimo {MIN_DESCRIPCION} caracteres.</p>
                    </>
                )}

                <p className="text-xs text-gray-500 mt-3">
                    Queda registrado con su nombre, la fecha y los componentes actuales del equipo en la hoja de vida.
                    {finaliza && ' El equipo volverá a estado funcional.'}
                </p>

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                <div className="flex space-x-3 mt-4">
                    <button
                        onClick={guardar}
                        disabled={guardando || !valido}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {guardando ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {guardando ? 'Guardando...' : finaliza ? 'Guardar y finalizar' : 'Guardar mantenimiento'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={guardando}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MantenimientoModal;
