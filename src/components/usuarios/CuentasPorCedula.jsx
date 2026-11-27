import React, { useEffect, useState } from 'react';
import { Search, KeyRound, Contact } from 'lucide-react';
import { userService } from '../../services/api';
import RestablecerPasswordModal from './RestablecerPasswordModal';

// Cuentas por cédula (cuenta_empleado): empleados, coordinadores, jefes y directores que
// entran con su cédula. No salen en la lista de usuarios del sistema, por eso se buscan aquí
// para restablecerles la contraseña.
const formatoFecha = (valor) => {
    if (!valor) return 'Nunca';
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
};

const CuentasPorCedula = () => {
    const [texto, setTexto] = useState('');
    const [cuentas, setCuentas] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState('');
    const [seleccionada, setSeleccionada] = useState(null);

    const buscar = async (q) => {
        if (q.trim().length < 3) {
            setCuentas([]);
            return;
        }
        try {
            setBuscando(true);
            setError('');
            const resp = await userService.buscarCuentasEmpleado(q.trim());
            setCuentas(resp.data.cuentas || []);
        } catch (err) {
            setError(err.response?.data?.msg || 'No se pudo buscar');
        } finally {
            setBuscando(false);
        }
    };

    // Busca mientras se escribe, con una pausa corta para no consultar en cada tecla.
    useEffect(() => {
        const t = setTimeout(() => buscar(texto), 350);
        return () => clearTimeout(t);
    }, [texto]);

    return (
        <div className="space-y-4">
            <div className="bg-white shadow rounded-lg p-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="search"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        placeholder="Buscar por cédula o nombre (mínimo 3 caracteres)…"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    Empleados, coordinadores, jefes y directores que ingresan con su número de cédula.
                </p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>}

            <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
                {texto.trim().length < 3 ? (
                    <p className="text-center text-gray-500 py-8">Escribe la cédula o el nombre de la persona.</p>
                ) : buscando ? (
                    <p className="text-center text-gray-500 py-8">Buscando…</p>
                ) : cuentas.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Ninguna cuenta por cédula coincide con la búsqueda.</p>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">{cuentas.length} cuenta(s){cuentas.length === 50 ? ' — se muestran las primeras 50, afina la búsqueda' : ''}</p>
                        {cuentas.map((c) => {
                            const retirado = ['retirado', 'inactivo'].includes(String(c.estado_contrato || '').toLowerCase()) || !c.estado_contrato;
                            return (
                                <div key={c.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center flex-wrap gap-2">
                                            <Contact className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium text-gray-900">{c.nombre_completo}</span>
                                            <span className="text-sm text-gray-500 font-mono">{c.usuario}</span>
                                            {c.debe_cambiar_password ? (
                                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Debe cambiar contraseña</span>
                                            ) : null}
                                            {retirado && (
                                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                                                    Contrato {c.estado_contrato || 'sin contrato'}: no puede ingresar
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {c.cargo || 'Sin cargo'} · Último ingreso: {formatoFecha(c.ultimo_ingreso)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSeleccionada({ tipo: 'cedula', id: c.id, nombre: c.nombre_completo, usuario: c.usuario, cedula: c.usuario })}
                                        className="inline-flex items-center px-3 py-1 border border-amber-300 text-sm font-medium rounded-md text-amber-700 bg-white hover:bg-amber-50"
                                    >
                                        <KeyRound className="h-4 w-4 mr-1" />
                                        Restablecer contraseña
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {seleccionada && (
                <RestablecerPasswordModal
                    cuenta={seleccionada}
                    onClose={() => setSeleccionada(null)}
                    onRestablecida={() => buscar(texto)}
                />
            )}
        </div>
    );
};

export default CuentasPorCedula;
