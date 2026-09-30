import React, { useState } from 'react';
import { Coffee, Utensils, Loader2 } from 'lucide-react';
import { formatearHora12, formatearMinSeg } from '../../utils/tiempoAsistencia';

const TarjetaPausa = ({ jornada, pausaSegundosTranscurridos, onFinalizarPausa }) => {
    const [cargando, setCargando] = useState(false);
    const pausa = jornada.pausa_activa;
    if (!pausa) return null;

    const esAlmuerzo = pausa.tipo === 'almuerzo';
    const limiteMin = esAlmuerzo ? jornada.horario?.minutos_almuerzo : null;
    const transcurridosSeg = Math.max(0, pausaSegundosTranscurridos ?? pausa.minutosTranscurridos * 60);
    const restanteSeg = limiteMin != null ? limiteMin * 60 - transcurridosSeg : null;
    const enExceso = restanteSeg != null && restanteSeg < 0;
    const horaInicio = formatearHora12(pausa.desde);

    const ejecutar = async () => {
        setCargando(true);
        await onFinalizarPausa();
        setCargando(false);
    };

    return (
        <div className="ai-panel ai-clock ai-clock--pause" style={{ alignItems: 'center', textAlign: 'center', maxWidth: 460, margin: '0 auto' }}>
            <span className={`ai-badge ${esAlmuerzo ? 'ai-badge--warning' : 'ai-badge--info'}`}>
                {esAlmuerzo ? <Utensils size={14} strokeWidth={1.75} /> : <Coffee size={14} strokeWidth={1.75} />}
                {esAlmuerzo ? 'En almuerzo' : 'En baño'} desde {horaInicio}
            </span>

            <span className="ai-overline">{limiteMin != null ? 'TIEMPO RESTANTE' : 'TIEMPO EN PAUSA'}</span>

            <div className="ai-timer" style={{ fontSize: 72 }}>
                {restanteSeg != null
                    ? (enExceso ? `+${formatearMinSeg(-restanteSeg)}` : formatearMinSeg(restanteSeg))
                    : formatearMinSeg(transcurridosSeg)}
            </div>

            {enExceso && <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>de exceso</span>}

            <p className="ai-muted" style={{ fontSize: 13, margin: 0 }}>
                {esAlmuerzo && limiteMin != null
                    ? `Almuerzo de ${limiteMin} min · regresa antes de las ${horaInicio ? formatearHoraLimite(pausa.desde, limiteMin) : ''}`
                    : 'Si tardas más de lo habitual, quedará una alerta en tu trazabilidad.'}
            </p>

            {limiteMin != null && (
                <div className="ai-kpi-bar" style={{ width: '100%' }}>
                    <span style={{
                        width: `${Math.min(100, (transcurridosSeg / (limiteMin * 60)) * 100)}%`,
                        background: enExceso ? 'var(--danger)' : 'var(--warning)'
                    }}
                    />
                </div>
            )}

            <button
                type="button"
                className="ai-btn ai-btn--primary ai-btn--xl"
                onClick={ejecutar}
                disabled={cargando}
            >
                {cargando ? <Loader2 size={18} strokeWidth={1.75} className="animate-spin" /> : (esAlmuerzo ? <Utensils size={18} strokeWidth={1.75} /> : <Coffee size={18} strokeWidth={1.75} />)}
                {esAlmuerzo ? 'Terminar almuerzo y volver' : 'Volver del baño'}
            </button>
        </div>
    );
};

function formatearHoraLimite(desdeIso, minutos) {
    const limite = new Date(new Date(desdeIso).getTime() + minutos * 60000);
    return limite.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default TarjetaPausa;
