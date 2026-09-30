import { useState, useEffect, useRef, useCallback } from 'react';
import { asistenciaService } from '../services/api';

const RESYNC_INTERVAL_MS = 60000;

// Estado en vivo de "mi jornada de hoy": marca entrada al montar (idempotente), interpola
// el contador localmente cada segundo usando el offset contra el reloj del servidor (nunca
// el reloj del cliente) y resincroniza cada 60s, tras cada marcaje y al recuperar el foco.
export function useJornada() {
    const [jornada, setJornada] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [minutosTrabajados, setMinutosTrabajados] = useState(0);
    const [segundosTrabajadosHoy, setSegundosTrabajadosHoy] = useState(0);
    const [segundosParaHabilitarSalida, setSegundosParaHabilitarSalida] = useState(null);
    const [pausaMinutosTranscurridos, setPausaMinutosTranscurridos] = useState(null);
    const [pausaSegundosTranscurridos, setPausaSegundosTranscurridos] = useState(null);

    const offsetRef = useRef(0); // Date.now() - servidor_ahora, en ms
    const jornadaRef = useRef(null);

    const aplicarJornada = useCallback((data) => {
        jornadaRef.current = data;
        setJornada(data);
        setMinutosTrabajados(data.minutos_trabajados);
        setSegundosTrabajadosHoy(data.minutos_trabajados * 60);
        setSegundosParaHabilitarSalida(data.segundos_para_habilitar_salida);
        setPausaMinutosTranscurridos(data.pausa_activa?.minutosTranscurridos ?? null);
        setPausaSegundosTranscurridos(data.pausa_activa ? data.pausa_activa.minutosTranscurridos * 60 : null);
        offsetRef.current = Date.now() - new Date(data.servidor_ahora).getTime();
    }, []);

    const resync = useCallback(async () => {
        try {
            const { data } = await asistenciaService.getMiJornadaHoy();
            aplicarJornada(data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo cargar tu jornada');
        }
    }, [aplicarJornada]);

    // Al montar: marcar entrada (idempotente) para arrancar/recuperar la jornada de hoy
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data } = await asistenciaService.marcarEntrada();
                aplicarJornada(data);
                setError(null);
            } catch (err) {
                setError(err.response?.data?.message || 'No se pudo marcar tu entrada');
            } finally {
                setLoading(false);
            }
        })();
    }, [aplicarJornada]);

    // Resync periódico cada 60s
    useEffect(() => {
        const id = setInterval(resync, RESYNC_INTERVAL_MS);
        return () => clearInterval(id);
    }, [resync]);

    // Resync inmediato al recuperar el foco de la pestaña
    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState === 'visible') resync();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [resync]);

    // Tick de 1s: solo interpola localmente, nunca llama a la API
    useEffect(() => {
        const id = setInterval(() => {
            const actual = jornadaRef.current;
            if (!actual) return;

            const ahoraServidor = Date.now() - offsetRef.current;
            const baseServidor = new Date(actual.servidor_ahora).getTime();
            const transcurridoSeg = Math.max(0, Math.floor((ahoraServidor - baseServidor) / 1000));

            if (actual.estado === 'en_curso') {
                setMinutosTrabajados(actual.minutos_trabajados + Math.floor(transcurridoSeg / 60));
                setSegundosTrabajadosHoy(actual.minutos_trabajados * 60 + transcurridoSeg);
            }
            if (actual.segundos_para_habilitar_salida !== null) {
                setSegundosParaHabilitarSalida(Math.max(0, actual.segundos_para_habilitar_salida - transcurridoSeg));
            }
            if (actual.pausa_activa) {
                setPausaMinutosTranscurridos(actual.pausa_activa.minutosTranscurridos + Math.floor(transcurridoSeg / 60));
                setPausaSegundosTranscurridos(actual.pausa_activa.minutosTranscurridos * 60 + transcurridoSeg);
            }
        }, 1000);
        return () => clearInterval(id);
    }, []);

    const ejecutarAccion = useCallback(async (accion) => {
        setError(null);
        try {
            const { data } = await accion();
            aplicarJornada(data);
            return { success: true };
        } catch (err) {
            const message = err.response?.data?.message || 'Ocurrió un error';
            setError(message);
            return { success: false, message };
        }
    }, [aplicarJornada]);

    const iniciarPausa = useCallback(
        (tipo) => ejecutarAccion(() => asistenciaService.iniciarPausa(tipo)),
        [ejecutarAccion]
    );
    const finalizarPausa = useCallback(
        () => ejecutarAccion(() => asistenciaService.finalizarPausa()),
        [ejecutarAccion]
    );
    const marcarSalida = useCallback(
        () => ejecutarAccion(() => asistenciaService.marcarSalida()),
        [ejecutarAccion]
    );

    return {
        jornada,
        loading,
        error,
        minutosTrabajados,
        segundosTrabajadosHoy,
        segundosParaHabilitarSalida,
        pausaMinutosTranscurridos,
        pausaSegundosTranscurridos,
        iniciarPausa,
        finalizarPausa,
        marcarSalida,
        resync
    };
}
