import React from 'react';
import { ChevronUp, ChevronDown, User } from 'lucide-react';

// Tabla con el diseño de Equipo (asistencia.md §70): encabezado azul marino con ícono por columna, filas
// alternas, filas de grupo y fila de total. Las filas (`children`, el <tbody>) las arma cada vista.
//
// - `columnas`: [{ id, label, icono?, title? }]. Pon ícono solo en las columnas clave de las tablas anchas.
// - `orden` + `onOrdenar(id)`: con ellos el encabezado ordena (`orden` = { col, asc }); sin ellos es fijo.
// - `fija`: las filas no son clicables (sin cursor de mano).
// - `pie`: las celdas de la fila de total (<td>…</td>), dentro del <tfoot>.
const TablaVista = ({ columnas, orden, onOrdenar, fija = false, pie, children }) => (
    <div className="ai-monitor-tabla-wrap">
        <table className={`ai-monitor-tabla${fija ? ' ai-monitor-tabla--fija' : ''}`}>
            <thead>
                <tr>
                    {columnas.map((c) => {
                        const Icono = c.icono;
                        const etiqueta = <>{Icono && <Icono size={17} strokeWidth={1.9} aria-hidden="true" />}{c.label}</>;
                        if (!onOrdenar || c.ordenable === false) {
                            return <th key={c.id} title={c.title}><span className="ai-monitor-th">{etiqueta}</span></th>;
                        }
                        const activa = orden?.col === c.id;
                        return (
                            <th key={c.id} title={c.title} aria-sort={activa ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                                <button type="button" onClick={() => onOrdenar(c.id)}>
                                    {etiqueta}
                                    {activa && (orden.asc
                                        ? <ChevronUp size={14} strokeWidth={2.4} />
                                        : <ChevronDown size={14} strokeWidth={2.4} />)}
                                </button>
                            </th>
                        );
                    })}
                </tr>
            </thead>
            <tbody>{children}</tbody>
            {pie && <tfoot><tr>{pie}</tr></tfoot>}
        </table>
    </div>
);

// Fila de grupo (centro de costo, cargo…) que ocupa todo el ancho, con la cantidad al lado.
export const FilaGrupo = ({ colSpan, nombre, cantidad, sufijo = '' }) => (
    <tr className="ai-monitor-fila-grupo">
        <td colSpan={colSpan} className="ai-monitor-grupo">
            {nombre}
            {cantidad != null && <span className="ai-monitor-grupo-n"> · {cantidad}{sufijo}</span>}
        </td>
    </tr>
);

// Avatar redondo de la columna de nombre.
export const AvatarVista = ({ icono = User }) => (
    <i className="ai-monitor-avatar" aria-hidden="true">{React.createElement(icono, { size: 16, strokeWidth: 2.4 })}</i>
);

export default TablaVista;
