import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { asistenciaService } from '../../services/api';
import { formatearFecha } from '../../utils/fecha';
import { descargarCsv } from '../../utils/csv';
import TrazabilidadView from './TrazabilidadView';

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
    inicio_almuerzo: 'Inicio almuerzo', fin_almuerzo: 'Fin almuerzo', inicio_extra: 'Inicio hora extra', fin_extra: 'Fin hora extra'
};

const TrazabilidadEmpleado = () => {
    const { empleadoId } = useParams();
    const [fecha, setFecha] = useState(hoyIso());
    const [datos, setDatos] = useState(null);
    const [horario, setHorario] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const inputFechaRef = useRef(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [{ data: trazabilidad }, { data: horarios }] = await Promise.all([
                    asistenciaService.getTrazabilidadDe(empleadoId, fecha),
                    asistenciaService.getHorarios({ empleadoId, desde: fecha, hasta: fecha })
                ]);
                setDatos(trazabilidad);
                setHorario(horarios?.[0] || null);
            } catch (err) {
                setDatos(null);
                setHorario(null);
                setError(err.response?.data?.message || 'No se pudo cargar la trazabilidad');
            } finally {
                setLoading(false);
            }
        })();
    }, [empleadoId, fecha]);

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
            <Link to="/operaciones/equipo" className="ai-link">
                <ArrowLeft size={14} strokeWidth={1.75} /> Volver al equipo
            </Link>

            <div className="ai-page-head">
                <div>
                    <h1 className="ai-page-title">Trazabilidad del empleado</h1>
                    <p className="ai-page-sub">{formatearFecha(fecha, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="ai-row">
                    <div className="ai-datenav">
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
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setFecha(hoyIso())}>Hoy</button>
                    <button type="button" className="ai-btn ai-btn--secondary" onClick={exportar} disabled={!datos}>
                        <Download size={16} strokeWidth={1.75} /> Exportar
                    </button>
                </div>
            </div>

            <TrazabilidadView datos={datos} loading={loading} error={error} horario={horario} esHoy={fecha === hoyIso()} />
        </div>
    );
};

export default TrazabilidadEmpleado;
