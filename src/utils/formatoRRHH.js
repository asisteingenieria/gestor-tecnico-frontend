// Helpers de presentación para el rediseño "Opción C" de RRHH. Nunca tocan el dato
// original, solo cómo se muestra (ver INSTRUCCIONES_CLAUDE_CODE.md §5).

const MAPA_CAMPANIA = {
    HOGAR: 'hogar',
    'T&T': 'tyt',
    'OPERACIÓN': 'operacion',
    'OPERACION': 'operacion',
    'TECNOLOGÍA': 'tecnologia',
    'TECNOLOGIA': 'tecnologia',
    'MÓVIL': 'movil',
    'MOVIL': 'movil'
};

// Convierte un nombre en MAYÚSCULAS (como se guarda) a Nombre Propio, conservando tildes.
export function nombrePropio(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
}

// Primera letra de nombre + primera letra de apellido, para el avatar circular.
export function iniciales(nombreCompleto) {
    if (!nombreCompleto) return '?';
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[Math.ceil(partes.length / 2)].charAt(0)).toUpperCase();
}

// Nombre de la clase .ai-chip--{clave} para una campaña; neutro si no está en el mapa.
export function claseCampania(nombreCampania) {
    if (!nombreCampania) return null;
    const clave = MAPA_CAMPANIA[nombreCampania.toUpperCase().trim()];
    return clave ? `ai-chip--${clave}` : null;
}

// "3144404761" -> "314 440 4761"
export function formatearTelefono(tel) {
    if (!tel) return '';
    const digitos = String(tel).replace(/\D/g, '');
    if (digitos.length !== 10) return tel;
    return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
}

// "agente call center" -> "Agente call center" (solo la primera letra)
export function primeraMayuscula(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
