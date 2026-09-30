import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES_DEFECTO = [10, 25, 50];

// Números de página con elipsis: 1 2 3 … N
function numerosPagina(totalPages, actual) {
    const nums = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) nums.push(i);
        return nums;
    }
    nums.push(1);
    if (actual > 3) nums.push('…');
    for (let i = Math.max(2, actual - 1); i <= Math.min(totalPages - 1, actual + 1); i++) nums.push(i);
    if (actual < totalPages - 2) nums.push('…');
    nums.push(totalPages);
    return nums;
}

/**
 * Pie de tabla "Opción C": "Mostrando X–Y de N" + números de página + selector de
 * filas por página. Exclusivo de las 4 tablas de RRHH (Empleados, Novedades, Traspasos,
 * Pasivo vacacional) — no se comparte con otros módulos.
 */
const Pagination = ({
    page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange,
    pageSizeOptions = PAGE_SIZES_DEFECTO, etiqueta = 'empleados'
}) => {
    if (totalItems === 0) return null;

    const paginaSegura = Math.min(page, totalPages);
    const inicio = (paginaSegura - 1) * pageSize + 1;
    const fin = Math.min(paginaSegura * pageSize, totalItems);

    return (
        <div className="ai-table-foot">
            <span>Mostrando {inicio}–{fin} de {totalItems} {etiqueta}</span>
            <div className="ai-row">
                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        style={{ height: 32, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-100)', color: 'var(--ink-muted)', fontSize: 13, padding: '0 6px' }}
                    >
                        {pageSizeOptions.map(s => <option key={s} value={s}>{s} filas</option>)}
                    </select>
                )}
                <div className="ai-pages">
                    <span style={{ cursor: paginaSegura > 1 ? 'pointer' : 'default', opacity: paginaSegura > 1 ? 1 : 0.4 }} onClick={() => paginaSegura > 1 && onPageChange(paginaSegura - 1)}>
                        <ChevronLeft size={16} strokeWidth={1.75} />
                    </span>
                    {numerosPagina(totalPages, paginaSegura).map((n, i) => n === '…' ? (
                        <span key={`e${i}`} style={{ cursor: 'default' }}>…</span>
                    ) : (
                        <span key={n} className={n === paginaSegura ? 'is-active' : ''} style={{ cursor: 'pointer' }} onClick={() => onPageChange(n)}>
                            {n}
                        </span>
                    ))}
                    <span style={{ cursor: paginaSegura < totalPages ? 'pointer' : 'default', opacity: paginaSegura < totalPages ? 1 : 0.4 }} onClick={() => paginaSegura < totalPages && onPageChange(paginaSegura + 1)}>
                        <ChevronRight size={16} strokeWidth={1.75} />
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
