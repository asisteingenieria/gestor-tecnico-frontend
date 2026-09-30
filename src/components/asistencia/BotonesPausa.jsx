import React, { useState } from 'react';
import { Coffee, Utensils, LogOut, Loader2 } from 'lucide-react';

function formatearCuentaRegresiva(segundos) {
    const total = Math.max(0, segundos || 0);
    const minutos = Math.floor(total / 60);
    const restoSegundos = total % 60;
    return `${minutos}:${String(restoSegundos).padStart(2, '0')}`;
}

const BotonesPausa = ({ jornada, segundosParaHabilitarSalida, onIniciarPausa, onMarcarSalida }) => {
    const [cargando, setCargando] = useState(null);

    if (!jornada || jornada.estado === 'pendiente' || jornada.estado === 'finalizada' || jornada.pausa_activa) return null;

    const ejecutar = async (nombre, fn) => {
        setCargando(nombre);
        await fn();
        setCargando(null);
    };

    return (
        <>
            <div className="ai-pauses">
                <button
                    type="button"
                    className="ai-pause"
                    onClick={() => ejecutar('bano', () => onIniciarPausa('bano'))}
                    disabled={cargando !== null}
                >
                    <span className="ai-kpi-icon">
                        {cargando === 'bano' ? <Loader2 size={18} strokeWidth={1.75} className="animate-spin" /> : <Coffee size={18} strokeWidth={1.75} />}
                    </span>
                    <span>
                        <b>Baño</b>
                        <small>{jornada.minutos_pausa_bano || 0} min hoy</small>
                    </span>
                </button>
                <button
                    type="button"
                    className="ai-pause"
                    onClick={() => ejecutar('almuerzo', () => onIniciarPausa('almuerzo'))}
                    disabled={cargando !== null}
                >
                    <span className="ai-kpi-icon">
                        {cargando === 'almuerzo' ? <Loader2 size={18} strokeWidth={1.75} className="animate-spin" /> : <Utensils size={18} strokeWidth={1.75} />}
                    </span>
                    <span>
                        <b>Almuerzo</b>
                        <small>
                            {jornada.minutos_pausa_almuerzo || 0}
                            {jornada.horario?.minutos_almuerzo != null && ` / ${jornada.horario.minutos_almuerzo}`} min
                        </small>
                    </span>
                </button>
            </div>

            <button
                type="button"
                className="ai-btn ai-btn--navy ai-btn--xl"
                onClick={() => ejecutar('salida', onMarcarSalida)}
                disabled={cargando !== null || !jornada.puede_marcar_salida}
            >
                {cargando === 'salida' ? <Loader2 size={18} strokeWidth={1.75} className="animate-spin" /> : <LogOut size={18} strokeWidth={1.75} />}
                {jornada.puede_marcar_salida
                    ? 'Marcar salida'
                    : `Salida disponible en ${formatearCuentaRegresiva(segundosParaHabilitarSalida)}`}
            </button>
        </>
    );
};

export default BotonesPausa;
