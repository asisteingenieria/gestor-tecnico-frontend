// Utilidades compartidas por las pantallas de la Red Maestra.

// Tipo de personal (backend utils/redMaestra.tipoPersonal, por cargo).
export const TIPOS_PERSONAL = {
    agente: { plural: 'Agentes', singular: 'Agente' },
    coordinador: { plural: 'Coordinadores', singular: 'Coordinador' },
    backoffice: { plural: 'Backoffice', singular: 'Backoffice' },
    otro: { plural: 'Otros (staff)', singular: 'Staff' }
};

// La RM escribe la cédula de ciudadanía como "CEDULA"; los demás documentos con su código.
export const documentoRM = (codigo) => (codigo === 'CC' ? 'CEDULA' : codigo || '—');

// Normaliza para buscar sin tildes ni mayúsculas.
export const plano = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Hoy en Bogotá como 'YYYY-MM-DD' (para el máximo de los selectores de fecha).
export const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
