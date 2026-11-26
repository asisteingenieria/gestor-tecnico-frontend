import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, History } from 'lucide-react';
import { asistenciaService, financieraService } from '../../services/api';
import { useBaseEquipo } from '../../utils/rutaEquipo';
import { nombrePropio, primeraMayuscula } from '../../utils/formatoRRHH';
import { formatearFecha } from '../../utils/fecha';
import { descargarCsv } from '../../utils/csv';
import { escucharCambiosEmpleados } from '../../utils/socketAsistencia';
import TrazabilidadView from './TrazabilidadView';
import { EncabezadoVista } from '../ui';

function hoyIso() {
    return new Date().toISOString().slice(0, 10);
}

function sumarDias(fechaIso, dias) {
    const [y, m, d] = fechaIso.split('-').map(Number);
    const fecha = new Date(Date.UTC(y, m - 1, d));
    fecha.setUTCDate(fecha.getUTCDate() + dias);
    return fecha.toISOString().slice(0, 10);
}

const ETIQUETAS_EVENTO = {
    entrada: 'Entrada', salida: 'Salida', inicio_bano: 'Inicio baño', fin_bano: 'Fin baño',
    inicio_almuerzo: 'Inicio almuerzo', fin_almuerzo: 'Fin almuerzo', inicio_break: 'Inicio break', fin_break: 'Fin break',
    inicio_capacitacion: 'Inicio capacitación', fin_capacitacion: 'Fin capacitación', inicio_extra: 'Inicio hora extra', fin_extra: 'Fin hora extra',
    inicio_desconexion: 'Desconexión (logout AsisLock)', fin_desconexion: 'Reconexión (login AsisLock)'
};

// `financiera`: la ve el rol financiera desde la trazabilidad por campaña (asistencia.md §32), con
// su propio endpoint, que trae también el empleado y su horario y no exige que sea de su equipo.
const TrazabilidadEmpleado = ({ financiera = false }) => {
    const baseEquipo = useBaseEquipo();
    const { empleadoId } = useParams();
    const [searchParams] = useSearchParams();
    // Permite abrir una fecha concreta (p. ej. desde el calendario mensual del equipo).
    const [fecha, setFecha] = useState(() => {
        const f = searchParams.get('fecha');
        return /^\d{4}-\d{2}-\d{2}$/.test(f || '') && f <= hoyIso() ? f : hoyIso();
    });
    const [datos, setDatos] = useState(null);
    const [horario, setHorario] = useState(null);
    const [empleado, setEmpleado] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const inputFechaRef = useRef(null);
    // Recarga en vivo: cada aviso de un cambio de jornada de ESTE empleado sube la versión y se
    // vuelve a pedir la traza sin el spinner (la del jefe y la de financiera/admin).
    const [version, setVersion] = useState(0);
    const silenciosoRef = useRef(false);

    // El jefe: la traza no trae el empleado, así que su nombre, cédula y campaña salen de la lista del equipo.
    useEffect(() => {
        if (financiera) return;
        let vivo = true;
        asistenciaService.getEquipo()
            .then(({ data }) => {
                const p = (Array.isArray(data) ? data : []).find((x) => String(x.users_company_id) === String(empleadoId));
                if (vivo && p) setEmpleado({ nombre: p.nombre, cedula: p.cedula, campania: p.campania, centro_costo: p.centro_costo });
            })
            .catch(() => {});
        return () => { vivo = false; };
    }, [empleadoId, financiera]);

    useEffect(() => escucharCambiosEmpleados(({ usersCompanyId } = {}) => {
        if (String(usersCompanyId) !== String(empleadoId)) return;
        silenciosoRef.current = true;
        setVersion((v) => v + 1);
    }), [empleadoId]);

    useEffect(() => {
        (async () => {
            const silencioso = silenciosoRef.current;
            silenciosoRef.current = false;
            if (!silencioso) setLoading(true);
            setError(null);
            try {
                if (financiera) {
                    const { data } = await financieraService.getTrazabilidad(empleadoId, fecha);
                    setEmpleado(data.empleado);
                    setHorario(data.horario);
                    if (data.jornada) {
                        setDatos(data);
                    } else {
                        setDatos(null);
                        setError('No hay jornada registrada para esa fecha');
                    }
                    return;
                }
                // El horario del día viene en la respuesta: GET /horarios es solo de quien gestiona y el
                // coordinador o el director (con gente de sus jefes) no lo pueden pedir (§57).
                const { data: trazabilidad } = await asistenciaService.getTrazabilidadDe(empleadoId, fecha);
                setDatos(trazabilidad);
                setHorario(trazabilidad.horario || null);
            } catch (err) {
                setDatos(null);
                setHorario(null);
                setError(err.response?.data?.message || 'No se pudo cargar la trazabilidad');
            } finally {
                setLoading(false);
            }
        })();
    }, [empleadoId, fecha, financiera, version]);

    const exportar = () => {
        if (!datos) return;
        const filas = datos.eventos.map((ev) => [
            new Date(ev.ocurrido_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            ETIQUETAS_EVENTO[ev.tipo] || ev.tipo,
            ev.origen,
            ev.nota || ''
        ]);
        descargarCsv(`trazabilidad_${empleadoId}_${fecha}.csv`, ['Hora', 'Evento', 'Registrado desde', 'Nota'], filas);
    };

    return (
        <div className="ai-content">
            {/* Financiera llega desde "Asistencia en vivo" (§47) o desde el reporte mensual. */}
            {financiera && searchParams.get('origen') === 'en-vivo' ? (
                <Link to="/recursos-humanos/asistencia-en-vivo" className="ai-link">
                    <ArrowLeft size={14} strokeWidth={1.75} /> Volver a asistencia en vivo
                </Link>
            ) : (
                <Link
                    to={financiera ? `/recursos-humanos/asistencia-mensual?periodo=${fecha.slice(0, 7)}${empleado?.idcampania ? `&campania=${empleado.idcampania}` : ''}` : `${baseEquipo}/equipo${searchParams.get('campania') ? `?campania=${encodeURIComponent(searchParams.get('campania'))}` : ''}`}
                    className="ai-link"
                >
                    <ArrowLeft size={14} strokeWidth={1.75} /> {financiera ? 'Volver al reporte' : 'Volver al equipo'}
                </Link>
            )}

            <EncabezadoVista
                icono={History}
                titulo={empleado ? nombrePropio(empleado.nombre) : 'Trazabilidad del empleado'}
                subtitulo={[
                    empleado && `CC ${empleado.cedula}${empleado.campania ? ` · ${primeraMayuscula(empleado.campania)}` : ''}${empleado.centro_costo ? ` · ${empleado.centro_costo}` : ''}`,
                    formatearFecha(fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                    // El turno programado del día, con el nombre de su plantilla (§46).
                    horario
                        ? (horario.es_descanso
                            ? (horario.es_libre ? 'Turno: libre' : 'Turno: descanso')
                            : `Turno ${horario.plantilla ? `${horario.plantilla} ` : ''}${horario.hora_entrada.slice(0, 5)}–${horario.hora_salida.slice(0, 5)}`)
                        : 'Sin horario ese día'
                ].filter(Boolean).join(' · ')}
                enVivo={fecha === hoyIso()}
            >
                <div className="ai-datenav" style={{ background: 'var(--surface-100)', borderRadius: 10, border: '1px solid var(--border)', padding: '0 4px', height: 34 }}>
                    <button type="button" className="ai-icon-btn" onClick={() => setFecha((f) => sumarDias(f, -1))} aria-label="Día anterior">
                        <ChevronLeft size={16} strokeWidth={1.75} />
                    </button>
                    <b style={{ cursor: 'pointer' }} onClick={() => inputFechaRef.current?.showPicker?.() ?? inputFechaRef.current?.click()}>
                        {formatearFecha(fecha, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </b>
                    <input
                        ref={inputFechaRef}
                        type="date"
                        value={fecha}
                        max={hoyIso()}
                        onChange={(e) => setFecha(e.target.value)}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                    />
                    <button
                        type="button"
                        className="ai-icon-btn"
                        onClick={() => setFecha((f) => sumarDias(f, 1))}
                        disabled={fecha >= hoyIso()}
                        aria-label="Día siguiente"
                    >
                        <ChevronRight size={16} strokeWidth={1.75} />
                    </button>
                </div>
                <button type="button" className="ai-monitor-btn" onClick={() => setFecha(hoyIso())}>Hoy</button>
                <button type="button" className="ai-monitor-btn" onClick={exportar} disabled={!datos}>
                    <Download size={15} strokeWidth={2} /> Exportar
                </button>
            </EncabezadoVista>

            <TrazabilidadView datos={datos} loading={loading} error={error} horario={horario} esHoy={fecha === hoyIso()} />
        </div>
    );
};

export default TrazabilidadEmpleado;
