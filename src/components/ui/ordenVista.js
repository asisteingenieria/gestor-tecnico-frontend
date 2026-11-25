// Siguiente orden al tocar una columna de TablaVista: la misma invierte, otra empieza ascendente.
export const siguienteOrden = (col) => (o) => ({ col, asc: o.col === col ? !o.asc : true });
