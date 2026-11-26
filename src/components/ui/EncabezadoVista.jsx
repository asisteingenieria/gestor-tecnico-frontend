import React from 'react';

// Encabezado de las vistas con el diseño de Equipo (asistencia.md §70): ícono grande, título, subtítulo
// (con el punto verde "en vivo" si aplica) y las acciones en pastillas a la derecha (`children`).
const EncabezadoVista = ({ icono: Icono, titulo, subtitulo, enVivo = false, children }) => (
    <div className="ai-monitor-head">
        <div className="ai-monitor-titulo">
            {Icono && <Icono size={52} strokeWidth={1.6} aria-hidden="true" />}
            <div>
                <h1>{titulo}</h1>
                {(subtitulo || enVivo) && (
                    <p>
                        {subtitulo}
                        {enVivo && <>{subtitulo ? ' ·' : ''}<span className="ai-monitor-vivo" aria-hidden="true" /> en vivo</>}
                    </p>
                )}
            </div>
        </div>
        {children && <div className="ai-monitor-acciones">{children}</div>}
    </div>
);

export default EncabezadoVista;
