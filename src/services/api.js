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

export default api;