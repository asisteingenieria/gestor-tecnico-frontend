import { useState, useEffect, useRef, useCallback } from 'react';
import { asistenciaService } from '../services/api';
import { escucharAsistencia, socketAsistenciaConectado } from '../utils/socketAsistencia';

const RESYNC_INTERVAL_MS = 60000;
// Sin socket (red que no deja pasar websockets) se consulta más seguido para no quedar atrás.
const RESYNC_SIN_SOCKET_MS = 15000;

// Segundos laborados exactos (el backend los manda desde 2026-10-26; antes solo minutos).
const segundosBase = (data) => data.segundos_trabajados ?? data.minutos_trabajados * 60;
// ¿Suma tiempo ahora? En curso, y en capacitación (cuenta como laborada).
const cuentaTiempo = (data) => data.cuenta_tiempo ?? data.estado === 'en_curso';
// La pausa se cuenta desde que empezó (pausa_activa.desde), no desde que se abrió la pantalla.
const segundosDesde = (iso, ahoraServidorMs) => Math.max(0, Math.floor((ahoraServidorMs - new Date(iso).getTime()) / 1000));

// Estado en vivo de "mi jornada de hoy": SOLO LECTURA al montar. La entrada la registra AsisLock
// (login biométrico), no abrir el monitor: por eso aquí se consulta el estado, no se marca entrada
// —si no, entrar a ver la traza arrancaba la jornada sin que el agente hubiera llegado—. Interpola
// el contador localmente cada segundo usando el offset contra el reloj del servidor (nunca el
// reloj del cliente) y resincroniza cada 60s, tras cada marcaje y al recuperar el foco.
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
        offsetRef.current = Date.now() - new Date(data.servidor_ahora).getTime();
        setMinutosTrabajados(data.minutos_trabajados);
        setSegundosTrabajadosHoy(segundosBase(data));
        setSegundosParaHabilitarSalida(data.segundos_para_habilitar_salida);
        const pausaSeg = data.pausa_activa ? segundosDesde(data.pausa_activa.desde, new Date(data.servidor_ahora).getTime()) : null;
        setPausaMinutosTranscurridos(pausaSeg === null ? null : Math.floor(pausaSeg / 60));
        setPausaSegundosTranscurridos(pausaSeg);
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

    // Al montar: consultar el estado de hoy (solo lectura). La entrada viene de AsisLock, no de
    // abrir esta pantalla, así que ver el monitor no arranca ni cuenta la jornada.
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data } = await asistenciaService.getMiJornadaHoy();
                aplicarJornada(data);
                setError(null);
            } catch (err) {
                setError(err.response?.data?.message || 'No se pudo cargar tu jornada');
            } finally {
                setLoading(false);
            }
        })();
    }, [aplicarJornada]);

    // Aviso en vivo del backend: cada cambio de jornada (login/logout o estado en AsisLock, o un
    // marcaje en el portal) recarga el estado sin que el agente tenga que refrescar la página.
    useEffect(() => escucharAsistencia('asistencia:mi-jornada', () => { resync(); }), [resync]);

    // Resync periódico: cada 60 s con socket; cada 15 s si el socket no está conectado.
    useEffect(() => {
        let ultimo = Date.now();
        const id = setInterval(() => {
            const cada = socketAsistenciaConectado() ? RESYNC_INTERVAL_MS : RESYNC_SIN_SOCKET_MS;
            if (Date.now() - ultimo >= cada && document.visibilityState === 'visible') {
                ultimo = Date.now();
                resync();
            }
        }, 5000);
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

            if (cuentaTiempo(actual)) {
                const segundos = segundosBase(actual) + transcurridoSeg;
                setMinutosTrabajados(Math.floor(segundos / 60));
                setSegundosTrabajadosHoy(segundos);
            }
            if (actual.segundos_para_habilitar_salida !== null) {
                setSegundosParaHabilitarSalida(Math.max(0, actual.segundos_para_habilitar_salida - transcurridoSeg));
            }
            if (actual.pausa_activa) {
                const pausaSeg = segundosDesde(actual.pausa_activa.desde, ahoraServidor);
                setPausaMinutosTranscurridos(Math.floor(pausaSeg / 60));
                setPausaSegundosTranscurridos(pausaSeg);
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
