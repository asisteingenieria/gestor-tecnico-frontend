import axios from 'axios';

// Configuración dinámica de la URL de la API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Interceptor para agregar el token automáticamente
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        if (error.response?.status === 403 && error.response?.data?.codigo === 'CAMBIO_PASSWORD_REQUERIDO'
            && window.location.pathname !== '/cambiar-password') {
            window.location.href = '/cambiar-password';
        }
        return Promise.reject(error);
    }
);

// === SERVICIOS DE USUARIOS ===
export const userService = {
    getTechnicians: () => api.get('/users/technicians'),
    getCoordinators: () => api.get('/users/coordinators'),
    getAll: () => api.get('/users'),
    getUsers: () => api.get('/users'), // Alias para compatibilidad
    getById: (id) => api.get(`/users/${id}`),
    create: (userData) => api.post('/users', userData),
    update: (id, userData) => api.put(`/users/${id}`, userData),
    delete: (id) => api.delete(`/users/${id}`)
};

// === SERVICIOS DE ESTACIONES DE TRABAJO ===
export const workstationService = {
    getAll: () => api.get('/workstations'),
    getCatalog: (params = {}) => api.get('/workstations/catalog', { params }),
    getStats: () => api.get('/workstations/stats'),
    getHistory: (id) => api.get(`/workstations/${id}/history`),
    getById: (id) => api.get(`/workstations/${id}`),
    create: (stationData) => api.post('/workstations', stationData),
    update: (id, stationData) => api.put(`/workstations/${id}`, stationData),
    delete: (id) => api.delete(`/workstations/${id}`)
};

// === SERVICIOS DE INCIDENCIAS ===
export const incidentService = {
    getAll: (params = {}) => api.get('/incidents', { params }),
    getMyIncidents: () => api.get('/incidents/my-incidents'),
    getMyReports: () => api.get('/incidents/my-reports'),
    getPending: (params = {}) => api.get('/incidents/pending', { params }),
    getInSupervision: (params = {}) => api.get('/incidents/supervision', { params }),
    getApproved: (params = {}) => api.get('/incidents/approved', { params }),
    getReturnedIncidents: () => api.get('/incidents/returned'),
    getById: (id) => api.get(`/incidents/${id}`),
    getHistory: (id) => api.get(`/incidents/${id}/history`),
    getAttachments: (id) => api.get(`/incidents/${id}/attachments`),
    getStatsBySede: () => api.get('/incidents/stats/by-sede'),
    getTechniciansStatus: () => api.get('/incidents/stats/technicians'),
    getTechniciansRanking: () => api.get('/incidents/stats/technicians-ranking'),
    getCoordinatorsRanking: () => api.get('/incidents/stats/coordinators-ranking'),
    exportOldIncidents: (limit = 10) => api.get(`/incidents/export/old-incidents?limit=${limit}`),
    create: (incidentData) => api.post('/incidents', incidentData),
    createWithFiles: (formData) => api.post('/incidents/with-files', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }),
    assignTechnician: (id, technicianId) => api.put(`/incidents/${id}/assign`, { technician_id: technicianId }),
    reassignTechnician: (id, technicianId, reason) => api.put(`/incidents/${id}/reassign`, { technician_id: technicianId, reason }),
    markAsResolved: (id, resolutionNotes) => api.put(`/incidents/${id}/resolve`, { resolution_notes: resolutionNotes }),
    returnToCreator: (id, returnReason) => api.put(`/incidents/${id}/return`, { return_reason: returnReason }),
    correctIncident: (id, corrections) => api.put(`/incidents/${id}/correct`, corrections),
    approve: (id, data) => api.put(`/incidents/${id}/approve`, data),
    reject: (id, rejectionReason) => api.put(`/incidents/${id}/reject`, { rejection_reason: rejectionReason }),
    getMyRatings: () => api.get('/incidents/my-ratings'),
    getTechnicianRatings: (technicianId) => api.get(`/incidents/ratings/${technicianId}`),
    sendApprovalAlerts: (incident_ids, alert_message) => api.post('/incidents/send-alerts', { incident_ids, alert_message }),
    getMyAlerts: () => api.get('/incidents/my-alerts'),
    markAlertAsRead: (alertId) => api.put(`/incidents/alerts/${alertId}/read`),
    dismissAlert: (alertId) => api.put(`/incidents/alerts/${alertId}/dismiss`)
};

// === SERVICIOS DE CHAT ===
export const chatService = {
    sendMessage: (to_user_id, message) => api.post('/chat/send', { to_user_id, message }),
    getMessages: (userId) => api.get(`/chat/messages/${userId}`),
    getConversations: () => api.get('/chat/conversations'),
    getAdminInfo: () => api.get('/chat/admin-info'),
    getUnreadCount: () => api.get('/chat/unread-count')
};

// === SERVICIOS DE ANALÍTICAS ===
export const analyticsService = {
    getOverview: () => api.get('/analytics/overview'),
    getIncidentsBySede: () => api.get('/analytics/by-sede'),
    getIncidentsByDepartment: () => api.get('/analytics/by-department'),
    getIncidentsByFailureType: () => api.get('/analytics/by-failure-type'),
    getTemporalTrend: (period = 30) => api.get(`/analytics/temporal-trend?period=${period}`),
    getTopFailingStations: (limit = 10) => api.get(`/analytics/top-failing-stations?limit=${limit}`),
    getTechnicianPerformance: (startDate, endDate) => {
        const params = startDate && endDate
            ? `?start_date=${startDate}&end_date=${endDate}`
            : '';
        return api.get(`/analytics/technician-performance${params}`);
    },
    getReportsByUser: () => api.get('/analytics/reports-by-user'),
    getHourlyDistribution: () => api.get('/analytics/hourly-distribution'),
    getWeekdayDistribution: () => api.get('/analytics/weekday-distribution'),
    getResolutionTimeAnalysis: () => api.get('/analytics/resolution-time-analysis'),
    getQualityMetrics: () => api.get('/analytics/quality-metrics'),
    getTechnicianDailyStats: (id, startDate, endDate) =>
        api.get(`/analytics/technician/${id}/daily-stats?start_date=${startDate}&end_date=${endDate}`),
    getTechnicianDailyIncidents: (id, date) =>
        api.get(`/analytics/technician/${id}/daily-incidents?date=${date}`)
};

// === SERVICIOS DE HISTORIAL DE COMPONENTES ===
export const assetHistoryService = {
    getStats: () => api.get('/activos-tecnico/historial/stats'),
    getFiltered: (params) => api.get('/activos-tecnico/historial/filtered', { params }),
    getByAsset: (id) => api.get(`/activos-tecnico/${id}/historial`),
    crearObservacion: (id, observaciones) => api.post(`/activos-tecnico/${id}/inventario`, { observaciones }),
    getObservaciones: (id) => api.get(`/activos-tecnico/${id}/inventario`),
    getNoProductivos: () => api.get('/activos-tecnico/no-productivos'),
    getEnBodega: () => api.get('/activos-tecnico/en-bodega'),
    getPendientesBaja: () => api.get('/activos-tecnico/pendientes-baja'),
    darDeBaja: (id) => api.put(`/activos-tecnico/${id}/dar-de-baja`),
    rechazarSolicitudBaja: (id) => api.put(`/activos-tecnico/${id}/estado-mantenimiento`, { nuevoEstado: 'funcional' }),
    actualizarEstadoMantenimiento: (id, nuevoEstado) => api.put(`/activos-tecnico/${id}/estado-mantenimiento`, { nuevoEstado })
};

// === SERVICIOS DE EMPLEADOS (users_company) ===
export const userCompanyService = {
    getAll: (params = {}) => api.get('/users-company', { params }),
    getById: (id) => api.get(`/users-company/${id}`),
    create: (data) => api.post('/users-company', data),
    update: (id, data) => api.put(`/users-company/${id}`, data),
    delete: (id) => api.delete(`/users-company/${id}`),
    getGastoTotal: () => api.get('/users-company/gasto-total'),
    getActivos: (id) => api.get(`/users-company/${id}/activos`),
    assignActivo: (id, activoId) => api.put(`/users-company/${id}/activos/${activoId}`),
    unassignActivo: (id, activoId) => api.delete(`/users-company/${id}/activos/${activoId}`),
    getRetiro: (id) => api.get(`/users-company/${id}/retiro`),
    registrarRetiro: (id, data) => api.post(`/users-company/${id}/retiro`, data),
    actualizarRetiro: (id, data) => api.put(`/users-company/${id}/retiro`, data),
    reactivarEmpleado: (id) => api.delete(`/users-company/${id}/retiro`),
    previewImportExcel: (formData) => api.post('/users-company/import-excel/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }),
    commitImportExcel: (formData) => api.post('/users-company/import-excel/commit', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
};

// === SERVICIOS DE NOVEDADES RRHH ===
export const novedadRrhhService = {
    getAll: (params = {}) => api.get('/users-company/novedades', { params }),
    getById: (id) => api.get(`/users-company/novedades/${id}`),
    create: (data) => api.post('/users-company/novedades', data),
    update: (id, data) => api.put(`/users-company/novedades/${id}`, data),
    delete: (id) => api.delete(`/users-company/novedades/${id}`),
    // Soportes documentales (PDF o imagen), uno por tipo de soporte que aplica a la novedad
    getSoportes: (id) => api.get(`/users-company/novedades/${id}/soportes`),
    subirSoporte: (id, tipoSoporteId, archivo) => {
        const formData = new FormData();
        formData.append('archivo', archivo);
        return api.post(`/users-company/novedades/${id}/soportes/${tipoSoporteId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
    },
    descargarSoporte: (id, tipoSoporteId) => api.get(`/users-company/novedades/${id}/soportes/${tipoSoporteId}/archivo`, { responseType: 'blob' }),
    eliminarSoporte: (id, tipoSoporteId) => api.delete(`/users-company/novedades/${id}/soportes/${tipoSoporteId}`)
};

// === SERVICIOS DE TRASPASOS ===
export const traspasoService = {
    getAll: (params = {}) => api.get('/users-company/traspasos', { params }),
    getById: (id) => api.get(`/users-company/traspasos/${id}`),
    create: (data) => api.post('/users-company/traspasos', data),
    update: (id, data) => api.put(`/users-company/traspasos/${id}`, data),
    delete: (id) => api.delete(`/users-company/traspasos/${id}`),
    // Alertas (evaluación del encargo, retorno del trabajo en casa) y documentos por tipo (migración 070)
    getAlertas: () => api.get('/users-company/traspasos/alertas'),
    reenviarAlertaEvaluacion: (id) => api.post(`/users-company/traspasos/${id}/alertas/evaluacion`),
    getSoportes: (id) => api.get(`/users-company/traspasos/${id}/soportes`),
    subirSoporte: (id, tipoSoporteId, archivo) => {
        const formData = new FormData();
        formData.append('archivo', archivo);
        return api.post(`/users-company/traspasos/${id}/soportes/${tipoSoporteId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
    },
    descargarSoporte: (id, tipoSoporteId) => api.get(`/users-company/traspasos/${id}/soportes/${tipoSoporteId}/archivo`, { responseType: 'blob' }),
    eliminarSoporte: (id, tipoSoporteId) => api.delete(`/users-company/traspasos/${id}/soportes/${tipoSoporteId}`)
};

// === SERVICIOS DE PASIVO VACACIONAL ===
export const vacacionesService = {
    getAll: (params = {}) => api.get('/users-company/vacaciones', { params }),
    getById: (id) => api.get(`/users-company/vacaciones/${id}`),
    create: (data) => api.post('/users-company/vacaciones', data),
    update: (id, data) => api.put(`/users-company/vacaciones/${id}`, data),
    delete: (id) => api.delete(`/users-company/vacaciones/${id}`)
};

// === CONTRATACIÓN DESDE HYDRA (RRHH) ===
// Lotes de candidatos que envía Hydra (reclutamiento). Ver conexionhydra.md §8 en el backend.
export const contratacionHydraService = {
    getLotes: (params = {}) => api.get('/contratacion-hydra/lotes', { params }),
    getLote: (id) => api.get(`/contratacion-hydra/lotes/${id}`),
    getCandidato: (id) => api.get(`/contratacion-hydra/candidatos/${id}`),
    guardarSeccion: (id, seccion, cambios) => api.put(`/contratacion-hydra/candidatos/${id}/secciones/${seccion}`, cambios),
    marcarVerificacion: (id, seccion, verificado) => api.put(`/contratacion-hydra/candidatos/${id}/secciones/${seccion}/verificacion`, { verificado }),
    descartar: (id, motivo) => api.post(`/contratacion-hydra/candidatos/${id}/descartar`, { motivo }),
    // simular=true hace todo el registro y lo revierte: devuelve errores o "se registrarían N".
    registrarLote: (id, { simular = false } = {}) => api.post(`/contratacion-hydra/lotes/${id}/registrar`, null, { params: simular ? { simular: 'true' } : {} }),
    getCatalogosMapeo: () => api.get('/contratacion-hydra/catalogos'),
    getMapeos: () => api.get('/contratacion-hydra/mapeos'),
    guardarMapeo: (data) => api.post('/contratacion-hydra/mapeos', data),
    getEnvios: (params = {}) => api.get('/contratacion-hydra/envios', { params }),
    reintentarEnvio: (id) => api.post(`/contratacion-hydra/envios/${id}/reintentar`)
};

// === SERVICIOS DE DISEÑOS ===
export const disenoService = {
    getAll: (params = {}) => api.get('/disenos', { params }),
    getById: (id) => api.get(`/disenos/${id}`),
    getDisenadores: () => api.get('/disenos/disenadores'),
    create: (formData) => api.post('/disenos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, formData) => api.put(`/disenos/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    assign: (id, disenador_id) => api.put(`/disenos/${id}/assign`, { disenador_id }),
    setFechaEstimada: (id, fecha_estimada) => api.put(`/disenos/${id}/fecha-estimada`, { fecha_estimada }),
    complete: (id, nota) => api.put(`/disenos/${id}/complete`, { nota_completado: nota || null }),
    toggleEspera: (id) => api.put(`/disenos/${id}/espera`),
    return: (id, formData) => api.put(`/disenos/${id}/return`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getDevoluciones: (id) => api.get(`/disenos/${id}/devoluciones`),
    deleteImagen: (id, imagenId) => api.delete(`/disenos/${id}/imagenes/${imagenId}`),
    downloadImagenes: (id) => api.get(`/disenos/${id}/imagenes/download`, { responseType: 'blob' }),
    downloadEntregas: (id) => api.get(`/disenos/${id}/entregas/download`, { responseType: 'blob' }),
    uploadEntrega: (id, formData) => api.post(`/disenos/${id}/entregas`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    replaceEntregas: (id, formData) => api.put(`/disenos/${id}/entregas/replace`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    deleteEntrega: (id, archivoId) => api.delete(`/disenos/${id}/entregas/${archivoId}`),
    delete: (id) => api.delete(`/disenos/${id}`)
};

// === SERVICIOS DE ASISTENCIA ===
export const asistenciaService = {
    // Empleado (y director sobre sí mismo)
    getMiHorario: (params = {}) => api.get('/asistencia/mi-horario', { params }),
    getMiJornadaHoy: () => api.get('/asistencia/mi-jornada/hoy'),
    marcarEntrada: () => api.post('/asistencia/mi-jornada/entrada'),
    iniciarPausa: (tipo) => api.post('/asistencia/mi-jornada/pausa', { tipo }),
    finalizarPausa: () => api.post('/asistencia/mi-jornada/pausa/fin'),
    marcarSalida: () => api.post('/asistencia/mi-jornada/salida'),
    getTrazabilidad: (fecha) => api.get(`/asistencia/mi-jornada/${fecha}/trazabilidad`),
    getMisJornadas: (params = {}) => api.get('/asistencia/mis-jornadas', { params }),
    getMisEstadisticas: (params = {}) => api.get('/asistencia/mis-estadisticas', { params }),
    solicitarHoraExtra: (data) => api.post('/asistencia/horas-extra/solicitar', data),
    previsualizarHoraExtra: (data) => api.post('/asistencia/horas-extra/previsualizar', data),
    getMisHorasExtra: (params = {}) => api.get('/asistencia/mis-horas-extra', { params }),
    // Campana: alertas de traspasos dirigidas a mí
    getMisAlertas: () => api.get('/asistencia/mis-alertas'),
    marcarAlertaLeida: (id) => api.post(`/asistencia/mis-alertas/${id}/leida`),
    // Notificaciones de asistencia de la campana (084: cambios de turno), a mi ficha o a mi usuario.
    getMisNotificaciones: () => api.get('/asistencia/mis-notificaciones'),
    marcarNotificacionLeida: (id) => api.post(`/asistencia/mis-notificaciones/${id}/leida`),
    marcarTodasNotificacionesLeidas: () => api.post('/asistencia/mis-notificaciones/leidas'),

    // Director de operaciones
    getEquipo: () => api.get('/asistencia/equipo'),
    getJornadasDe: (empleadoId, params = {}) => api.get(`/asistencia/equipo/${empleadoId}/jornadas`, { params }),
    getTrazabilidadDe: (empleadoId, fecha) => api.get(`/asistencia/equipo/${empleadoId}/jornada/${fecha}/trazabilidad`),
    getEstadisticasEquipo: (params = {}) => api.get('/asistencia/equipo/estadisticas', { params }),
    getResumenMensualEquipo: (periodo) => api.get('/asistencia/equipo/resumen-mensual', { params: { periodo } }),
    registrarEventoManual: (jornadaId, data) => api.post(`/asistencia/equipo/jornada/${jornadaId}/evento`, data),

    getPlantillas: () => api.get('/asistencia/horarios/plantillas'),
    crearPlantilla: (data) => api.post('/asistencia/horarios/plantillas', data),
    actualizarPlantilla: (id, data) => api.put(`/asistencia/horarios/plantillas/${id}`, data),
    eliminarPlantilla: (id) => api.delete(`/asistencia/horarios/plantillas/${id}`),

    getHorarios: (params = {}) => api.get('/asistencia/horarios', { params }),
    asignarHorarios: (data) => api.post('/asistencia/horarios', data),
    actualizarHorario: (id, data) => api.put(`/asistencia/horarios/${id}`, data),
    eliminarHorario: (id) => api.delete(`/asistencia/horarios/${id}`),

    getBandejaHorasExtra: (params = {}) => api.get('/asistencia/horas-extra', { params }),
    aprobarHoraExtra: (id, data) => api.put(`/asistencia/horas-extra/${id}/aprobar`, data),
    rechazarHoraExtra: (id, data) => api.put(`/asistencia/horas-extra/${id}/rechazar`, data),
    asignarHoraExtra: (data) => api.post('/asistencia/horas-extra/asignar', data),

    // Reporte mensual de horas extras del jefe: solo lectura, se llena solo (asistencia.md §32).
    getReporteHorasExtra: (periodo) => api.get('/asistencia/reporte-horas-extra', { params: { periodo } })
};

// Cambios de turno (asistencia.md §50): el coordinador los pide para cualquier empleado y el jefe que
// gestiona a ese empleado los aprueba (el horario se reemplaza solo) o los rechaza con un motivo.
export const cambioTurnoService = {
    getPermisos: () => api.get('/asistencia/cambios-turno/permisos'),
    getEmpleados: () => api.get('/asistencia/cambios-turno/empleados'),
    getPlantillas: (empleadoId) => api.get('/asistencia/cambios-turno/plantillas', { params: { empleadoId } }),
    getHorarios: (empleados, desde, hasta) => api.get('/asistencia/cambios-turno/horarios', { params: { empleados: empleados.join(','), desde, hasta } }),
    solicitar: (data) => api.post('/asistencia/cambios-turno', data),
    getMias: () => api.get('/asistencia/cambios-turno/mias'),
    getBandeja: (params = {}) => api.get('/asistencia/cambios-turno/bandeja', { params }),
    aprobar: (id, data = {}) => api.put(`/asistencia/cambios-turno/${id}/aprobar`, data),
    rechazar: (id, data) => api.put(`/asistencia/cambios-turno/${id}/rechazar`, data),
    getTodas: (params = {}) => api.get('/asistencia/financiera/cambios-turno', { params })
};

// Rol financiera (asistencia.md §32): reporte de horas extras con dinero (en vivo) y trazabilidad
// de todos los empleados por campaña.
export const financieraService = {
    getReporteHorasExtra: (periodo, campaniaId) => api.get('/asistencia/financiera/reporte-horas-extra', { params: { periodo, ...(campaniaId ? { campania_id: campaniaId } : {}) } }),
    getHome: (periodo) => api.get('/asistencia/financiera/home', { params: { periodo } }),
    getResumenMensual: (periodo, campaniaId) => api.get('/asistencia/financiera/resumen-mensual', { params: { periodo, ...(campaniaId ? { campania_id: campaniaId } : {}) } }),
    getCampanias: () => api.get('/asistencia/financiera/campanias'),
    getEmpleados: (campaniaId) => api.get('/asistencia/financiera/empleados', { params: campaniaId ? { campania_id: campaniaId } : {} }),
    // Asistencia en vivo de hoy de todos o de una campaña (asistencia.md §47).
    getEnVivo: (campaniaId) => api.get('/asistencia/financiera/en-vivo', { params: campaniaId ? { campania_id: campaniaId } : {} }),
    getTrazabilidad: (empleadoId, fecha) => api.get(`/asistencia/financiera/empleados/${empleadoId}/jornada/${fecha}/trazabilidad`)
};

export default api;