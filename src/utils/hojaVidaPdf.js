import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    ALERTAS,
    CAMPO_HISTORIAL,
    ESTADO_SOLICITUD,
    NOMBRE_TIPO_ACTIVO,
    TIPO_MANTENIMIENTO,
    formatoFecha,
    textoAlerta,
    textoEstado
} from './mantenimientoActivos';

// Las fuentes base de jsPDF solo traen Latin-1: nada de flechas ni emojis en el texto.
const v = (x) => (x === null || x === undefined || x === '' ? '—' : String(x));

/**
 * Descarga la hoja de vida del equipo en PDF.
 * @param {object} hoja  respuesta de GET /api/activos-tecnico/:id/hoja-vida (data)
 * @param {string} generadoPor nombre del usuario que descarga
 */
export function descargarHojaVidaPdf(hoja, generadoPor) {
    const { activo, alerta, mantenimientos, traslados, cambios, solicitudesBaja } = hoja;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const ancho = doc.internal.pageSize.getWidth();
    const margen = 40;
    const verde = [5, 150, 105];

    // Encabezado
    doc.setFillColor(...verde);
    doc.rect(0, 0, ancho, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Hoja de vida del equipo', margen, 30);
    doc.setFontSize(12);
    doc.text(`${activo.numero_placa}  ·  ${NOMBRE_TIPO_ACTIVO[activo.tipo_activo] || v(activo.tipo_activo)}`, margen, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generado: ${formatoFecha(hoja.generadoEn)}${generadoPor ? `  ·  por ${generadoPor}` : ''}`, ancho - margen, 50, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    let y = 84;
    const titulo = (texto) => {
        if (y > doc.internal.pageSize.getHeight() - 80) {
            doc.addPage();
            y = 50;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...verde);
        doc.text(texto, margen, y);
        doc.setTextColor(0, 0, 0);
        y += 6;
    };
    const tabla = (opciones) => {
        autoTable(doc, {
            startY: y,
            margin: { left: margen, right: margen },
            styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' },
            headStyles: { fillColor: verde, textColor: 255 },
            ...opciones
        });
        y = doc.lastAutoTable.finalY + 20;
    };
    const vacio = (texto) => {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(texto, margen, y + 12);
        doc.setTextColor(0, 0, 0);
        y += 30;
    };

    // Datos del equipo + componentes actuales
    titulo('Datos del equipo');
    tabla({
        theme: 'plain',
        body: [
            ['Marca / modelo', v(activo.marca_modelo), 'Serie', v(activo.numero_serie_fabricante)],
            ['Ubicación', v(activo.ubicacion), 'Site', v(activo.site)],
            ['Puesto', v(activo.puesto), 'Asignado a', v(activo.asignado)],
            ['Responsable', v(activo.responsable), 'Estado', textoEstado(activo.estado)],
            ['Clasificación', v(activo.clasificacion), 'Fecha de compra', formatoFecha(activo.fecha_compra, false)]
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 95 }, 2: { fontStyle: 'bold', cellWidth: 95 } }
    });

    titulo('Componentes actuales');
    tabla({
        head: [['CPU / Procesador', 'Memoria RAM', 'Almacenamiento', 'Sistema operativo']],
        body: [[v(activo.cpu_procesador), v(activo.memoria_ram), v(activo.almacenamiento), v(activo.sistema_operativo)]]
    });

    // Estado del mantenimiento (alerta)
    if (alerta) {
        const a = ALERTAS[alerta.nivel] || ALERTAS.sin_registro;
        titulo('Estado del mantenimiento preventivo');
        doc.setFillColor(...a.rgb);
        doc.roundedRect(margen, y + 4, 120, 20, 4, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(a.label, margen + 60, y + 17, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(textoAlerta(alerta), margen + 132, y + 17);
        y += 44;
    }

    // Mantenimientos
    titulo(`Mantenimientos (${mantenimientos.length})`);
    if (mantenimientos.length === 0) {
        vacio('Sin mantenimientos registrados.');
    } else {
        tabla({
            head: [['Fecha', 'Tipo', 'Trabajo realizado', 'Componentes en ese momento', 'Realizado por']],
            body: mantenimientos.map((m) => [
                formatoFecha(m.fecha),
                TIPO_MANTENIMIENTO[m.tipo] || m.tipo,
                [m.tareas.join(', '), m.descripcion].filter(Boolean).join('\n') || '—',
                m.componentes
                    ? [m.componentes.cpu_procesador, m.componentes.memoria_ram, m.componentes.almacenamiento, m.componentes.sistema_operativo]
                        .filter(Boolean).join(' / ') || '—'
                    : '—',
                v(m.realizadoPor)
            ]),
            columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 62 }, 4: { cellWidth: 80 } }
        });
    }

    // Traslados
    titulo(`Traslados de puesto (${traslados.length})`);
    if (traslados.length === 0) {
        vacio('Sin traslados registrados.');
    } else {
        tabla({
            head: [['Fecha', 'Cambio', 'Antes', 'Después', 'Por']],
            body: traslados.map((t) => [formatoFecha(t.fecha), CAMPO_HISTORIAL[t.campo] || t.campo, v(t.valorAnterior), v(t.valorNuevo), v(t.modificadoPor)])
        });
    }

    // Cambios de componentes y estado
    titulo(`Cambios de componentes y estado (${cambios.length})`);
    if (cambios.length === 0) {
        vacio('Sin cambios registrados.');
    } else {
        tabla({
            head: [['Fecha', 'Campo', 'Antes', 'Después', 'Por']],
            body: cambios.map((c) => [
                formatoFecha(c.fecha),
                CAMPO_HISTORIAL[c.campo] || c.campo,
                c.campo === 'estado' ? textoEstado(c.valorAnterior) : v(c.valorAnterior),
                c.campo === 'estado' ? textoEstado(c.valorNuevo) : v(c.valorNuevo),
                v(c.modificadoPor)
            ])
        });
    }

    // Solicitudes de baja
    if (solicitudesBaja.length > 0) {
        titulo(`Solicitudes de baja (${solicitudesBaja.length})`);
        tabla({
            head: [['Fecha', 'Observación', 'Solicitó', 'Resultado', 'Resolvió', 'Comentario']],
            body: solicitudesBaja.map((s) => [
                formatoFecha(s.fechaSolicitud),
                v(s.motivo),
                v(s.solicitadoPor),
                ESTADO_SOLICITUD[s.estado] || s.estado,
                s.resueltoPor ? `${s.resueltoPor}\n${formatoFecha(s.fechaResolucion)}` : '—',
                v(s.comentario)
            ])
        });
    }

    // Pie de página
    const paginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text(`Gestor Técnico · Hoja de vida ${activo.numero_placa} · Página ${i} de ${paginas}`, ancho / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    }

    doc.save(`hoja-de-vida-${activo.numero_placa}.pdf`);
}
