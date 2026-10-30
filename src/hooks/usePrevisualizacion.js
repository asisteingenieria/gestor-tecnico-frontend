import { useCallback, useEffect, useState } from 'react';

/**
 * Previsualizar un documento en un modal en vez de abrirlo en otra pestaña.
 * `abrir(clave, documento, descargar)` baja el archivo (blob, con la sesión) y lo muestra;
 * `documento` lleva { nombre, nombre_original, mime, tamano_bytes }. `abriendo` es la
 * clave que se está bajando, para el spinner del botón.
 */
export function usePrevisualizacion() {
    const [vista, setVista] = useState(null); // { documento, url }
    const [abriendo, setAbriendo] = useState(null);
    const [error, setError] = useState('');

    // El blob vive solo mientras el modal está abierto.
    useEffect(() => () => { if (vista) URL.revokeObjectURL(vista.url); }, [vista]);

    const abrir = useCallback(async (clave, documento, descargar) => {
        setAbriendo(clave);
        setError('');
        try {
            const { data } = await descargar();
            const url = URL.createObjectURL(new Blob([data], { type: documento.mime }));
            setVista({ documento, url });
        } catch {
            setError('No se pudo abrir el documento');
        } finally {
            setAbriendo(null);
        }
    }, []);

    const cerrar = useCallback(() => setVista(null), []);

    return { vista, abriendo, error, abrir, cerrar };
}

export default usePrevisualizacion;
