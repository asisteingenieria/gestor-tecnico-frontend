import React, { useState } from 'react';
import { KeyRound, X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { userService } from '../../services/api';

// Restablecer la contraseña de una cuenta desde el panel del admin.
// `cuenta`: { tipo: 'usuario'|'cedula', id, nombre, usuario, cedula }.
// La contraseña vuelve a la cédula (por defecto) o a una temporal, y la cuenta queda con
// cambio obligatorio: al ingresar, el sistema le pide crear una nueva.
const RestablecerPasswordModal = ({ cuenta, onClose, onRestablecida }) => {
    const tieneCedula = Boolean(String(cuenta.cedula || '').trim());
    const [modo, setModo] = useState(tieneCedula ? 'cedula' : 'temporal');
    const [password, setPassword] = useState('');
    const [verPassword, setVerPassword] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [resultado, setResultado] = useState(null);

    const enviar = async (e) => {
        e.preventDefault();
        setError('');
        if (modo === 'temporal' && password.trim().length < 6) {
            setError('La contraseña temporal debe tener al menos 6 caracteres.');
            return;
        }
        try {
            setGuardando(true);
            const datos = modo === 'cedula' ? { modo } : { modo, password };
            const resp = cuenta.tipo === 'cedula'
                ? await userService.restablecerPasswordCuentaEmpleado(cuenta.id, datos)
                : await userService.restablecerPassword(cuenta.id, datos);
            setResultado({
                usuario: resp.data.usuario,
                password: modo === 'cedula' ? String(cuenta.cedula).trim() : password
            });
            onRestablecida?.();
        } catch (err) {
            setError(err.response?.data?.msg || 'No se pudo restablecer la contraseña');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-16 mx-auto p-5 border max-w-md shadow-lg rounded-md bg-white">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <KeyRound className="h-5 w-5 mr-2 text-amber-600" />
                        Restablecer contraseña
                    </h3>
                    <button onClick={() => onClose(Boolean(resultado))} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-4 rounded-md bg-gray-50 border border-gray-200 p-3 text-sm">
                    <p className="font-medium text-gray-900">{cuenta.nombre}</p>
                    <p className="text-gray-600">
                        Usuario: <span className="font-mono">{cuenta.usuario}</span>
                        {cuenta.tipo === 'cedula' && <span className="ml-2 text-xs text-gray-500">(entra con su cédula)</span>}
                    </p>
                </div>

                {resultado ? (
                    <div className="space-y-4">
                        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                            <p className="flex items-center font-medium mb-2">
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Contraseña restablecida
                            </p>
                            <p>Usuario: <span className="font-mono font-semibold">{resultado.usuario}</span></p>
                            <p>Contraseña: <span className="font-mono font-semibold">{resultado.password}</span></p>
                            <p className="mt-2">Al ingresar, el sistema le pedirá crear una contraseña nueva.</p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => onClose(true)}
                                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={enviar} className="space-y-3">
                        <label className={`flex items-start gap-2 rounded-md border p-3 ${tieneCedula ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${modo === 'cedula' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                            <input
                                type="radio"
                                name="modo"
                                className="mt-1"
                                checked={modo === 'cedula'}
                                disabled={!tieneCedula}
                                onChange={() => setModo('cedula')}
                            />
                            <span className="text-sm">
                                <strong>Volver a la cédula (por defecto)</strong>
                                <span className="block text-xs text-gray-500">
                                    {tieneCedula
                                        ? <>La contraseña queda igual a la cédula <span className="font-mono">{cuenta.cedula}</span>.</>
                                        : 'Esta cuenta no está vinculada a una ficha con cédula.'}
                                </span>
                            </span>
                        </label>

                        <label className={`flex items-start gap-2 rounded-md border p-3 cursor-pointer ${modo === 'temporal' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                            <input
                                type="radio"
                                name="modo"
                                className="mt-1"
                                checked={modo === 'temporal'}
                                onChange={() => setModo('temporal')}
                            />
                            <span className="text-sm flex-1">
                                <strong>Contraseña temporal</strong>
                                <span className="block text-xs text-gray-500">Escribe una contraseña para entregarle.</span>
                                {modo === 'temporal' && (
                                    <span className="relative block mt-2">
                                        <input
                                            type={verPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                            autoFocus
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setVerPassword(!verPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            aria-label={verPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                        >
                                            {verPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                                        </button>
                                    </span>
                                )}
                            </span>
                        </label>

                        <p className="text-xs text-gray-500">
                            En los dos casos, al ingresar se le pedirá cambiar la contraseña.
                        </p>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-2 text-sm text-red-700">{error}</div>
                        )}

                        <div className="flex justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => onClose(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={guardando}
                                className="flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                            >
                                <KeyRound className="h-4 w-4 mr-2" />
                                {guardando ? 'Restableciendo…' : 'Restablecer'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RestablecerPasswordModal;
