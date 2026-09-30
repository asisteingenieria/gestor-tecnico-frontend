import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import ComboboxBuscable from './ComboboxBuscable';
import { X, Save, UserPlus, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

const CATALOGOS_VACIOS = {
    tipos_identificacion: [],
    estados_civiles: [],
    grupos_sanguineos: [],
    generos: [],
    ciudades: [],
    campanias: [],
    areas: [],
    centros_costo: [],
    cargos: [],
    tipos_contrato: [],
    modalidades: [],
    oleadas: [],
    estados_contrato: [],
    entidades_eps: [],
    entidades_arl: [],
    entidades_afp: [],
    entidades_cesantias: [],
    entidades_caja: [],
    bancos: [],
    tipos_cuenta: [],
    tipos_direccion: [],
    zonas_direccion: [],
    tipos_vivienda: [],
    parentescos: [],
    tipos_vacuna: [],
    tipos_recurso: [],
    empresas: [],
    clases_contrato: [],
    periodos_pago: [],
    clasificaciones_dian: [],
    tipos_sena: [],
    tipos_cotizante: [],
    subtipos_cotizante: [],
    salarios_referencia: [],
    empleados: [],
    jefes_inmediatos: [],
    jefes_area: [],
    directores_area: []
};

const fecha = (v) => (v ? String(v).substring(0, 10) : '');

// Suma meses a una fecha ISO (YYYY-MM-DD) sin desbordar el mes destino
// (ej. 31 de enero + 1 mes = 28/29 de febrero, no 3 de marzo).
const sumarMeses = (fechaISO, meses) => {
    const [y, m, d] = fechaISO.split('-').map(Number);
    const primerDiaObjetivo = new Date(y, m - 1 + meses, 1);
    const ultimoDiaMes = new Date(primerDiaObjetivo.getFullYear(), primerDiaObjetivo.getMonth() + 1, 0).getDate();
    primerDiaObjetivo.setDate(Math.min(d, ultimoDiaMes));
    const yy = primerDiaObjetivo.getFullYear();
    const mm = String(primerDiaObjetivo.getMonth() + 1).padStart(2, '0');
    const dd = String(primerDiaObjetivo.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
};

// Formatea un numero (o string numerico) con puntos de miles al estilo colombiano,
// sin decimales -- los salarios en este modulo siempre son pesos enteros.
const formatearMiles = (valor) => {
    if (valor === '' || valor === null || valor === undefined) return '';
    const numero = Number(valor);
    if (Number.isNaN(numero)) return '';
    return Math.round(numero).toLocaleString('es-CO');
};

const PASOS = [
    { n: 1, label: 'Datos personales' },
    { n: 2, label: 'Contratación' }
];

// Las 5 clases de riesgo ARL de la ARL colombiana -- tarifas fijas por ley (Decreto 1607 de
// 2002), no un catálogo de BD. El selector solo ayuda a escoger la clase correcta por
// actividad; en `seguridad_social.tarifa_arl` (DECIMAL(8,5)) se guarda unicamente el numero
// (ej. "0.522"), que es lo que despues se usa para calculos -- nunca el texto de la clase.
const TARIFAS_ARL = [
    { id: '0.522', nombre: 'Clase I — Riesgo mínimo (0,522%): oficinas, actividades administrativas y financieras' },
    { id: '1.044', nombre: 'Clase II — Riesgo bajo (1,044%): comercio al por menor, manufactura ligera y restaurantes' },
    { id: '2.436', nombre: 'Clase III — Riesgo medio (2,436%): procesos industriales, manufactura y confecciones' },
    { id: '4.350', nombre: 'Clase IV — Riesgo alto (4,350%): transporte, vigilancia privada y manufactura pesada' },
    { id: '6.960', nombre: 'Clase V — Riesgo máximo (6,960%): construcción y minería' }
];

const AgentForm = ({ isOpen, onClose, agente = null, onSuccess }) => {
    const formRef = useRef(null);
    const [paso, setPaso] = useState(1);

    const [personal, setPersonal] = useState({
        tipo_identificacion_id: '',
        numero_identificacion: '',
        tipo_identificacion_secundaria_id: '',
        numero_identificacion_secundaria: '',
        fecha_expedicion: '',
        ciudad_expedicion_id: '',
        primer_nombre: '',
        segundo_nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        fecha_nacimiento: '',
        ciudad_nacimiento_id: '',
        numero_hijos: 0,
        estado_civil_id: '',
        grupo_sanguineo_id: '',
        genero_id: '',
        email: '',
        telefono: '',
        usuario_ssff: '',
        rut: '',
        declarante_renta: false,
        libreta_militar_numero: ''
    });
    const [clienteId, setClienteId] = useState('');
    const [contrato, setContrato] = useState({
        campania_id: '',
        area_id: '',
        centro_costo_id: '',
        cargo_id: '',
        cargo_ssff: '',
        tipo_contrato_id: '',
        modalidad_id: '',
        oleada_id: '',
        ciudad_id: '',
        piso: '',
        estado_contrato_id: '',
        jefe_inmediato_id: '',
        jefe_area_id: '',
        director_area_id: '',
        analista_encargado_id: '',
        fecha_ingreso: '',
        fecha_fin_periodo_prueba: '',
        fecha_fin_contrato: '',
        fecha_entrega_certificacion_laboral: '',
        observaciones: '',
        empresa_id: '',
        clase_contrato_id: '',
        periodo_pago_id: '',
        clasificacion_dian_id: '',
        tipo_sena_id: '',
        tipo_cotizante_id: '',
        subtipo_cotizante_id: '',
        aplica_dotacion: false
    });
    const [salario, setSalario] = useState({ salario: '', bono_no_prestacional: '', bono_cafeteria: '' });
    // Se activa cuando "Salario mensual" toma su valor de `salarioSugerido`/`salariosAmbiguos`
    // (autocompletado o elegido del selector) -- bloquea el campo para que no se pise a mano un
    // valor que ya viene de Cliente + Cargo. NO se activa al cargar un empleado existente para
    // editar (su salario ya guardado sigue editable, ej. para registrar un aumento).
    const [salarioBloqueado, setSalarioBloqueado] = useState(false);
    const [segSocial, setSegSocial] = useState({
        eps_id: '', arl_id: '', afp_id: '', cesantias_id: '', caja_id: '', tarifa_arl: '',
        eps_fecha_afiliacion: '', arl_fecha_afiliacion: '', afp_fecha_afiliacion: '', cesantias_fecha_afiliacion: '', caja_fecha_afiliacion: ''
    });
    const [cuenta, setCuenta] = useState({ banco_id: '', tipo_cuenta_id: '', numero_cuenta: '' });
    const [direccion, setDireccion] = useState({ tipo_direccion_id: '', direccion: '', barrio: '', ciudad_id: '', zona_direccion_id: '', tipo_vivienda_id: '' });
    const [contactoEmergencia, setContactoEmergencia] = useState({ nombre: '', telefono: '', parentesco_id: '' });
    const [vacunacion, setVacunacion] = useState({ tipo_vacuna_id: '', primera_dosis_fecha: '', segunda_dosis_fecha: '' });
    const [dotacion, setDotacion] = useState({ talla_camisa: '', talla_pantalon: '', talla_calzado: '' });
    const [recursos, setRecursos] = useState({ diadema_serial: '', locker_numero: '', carnet_entregado: false });

    const [catalogos, setCatalogos] = useState(CATALOGOS_VACIOS);
    const [loadingData, setLoadingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setPaso(1);
        const cargar = async () => {
            setLoadingData(true);
            try {
                const catRes = await api.get('/users-company/catalogos');
                setCatalogos(catRes.data.catalogos);

                if (!agente) {
                    // El Excel no distingue tipo de dirección (residencia/correspondencia/
                    // laboral) — el import siempre lo guarda como "Residencia", así que un
                    // empleado nuevo arranca igual, sin exponer el selector en el formulario.
                    const residenciaId = catRes.data.catalogos.tipos_direccion?.find(o => o.nombre === 'Residencia')?.id || '';
                    setDireccion(prev => ({ ...prev, tipo_direccion_id: residenciaId }));
                    setClienteId('');

                    // Catálogos nuevos con un único valor real hoy (ver Excel de nómina):
                    // se preseleccionan para no obligar a elegir entre una sola opción en
                    // cada alta; si en el futuro se agregan más valores, el selector deja
                    // de autocompletar (solo aplica cuando hay exactamente 1 opción).
                    const unicoId = (lista) => (lista?.length === 1 ? lista[0].id : '');
                    setContrato(prev => ({
                        ...prev,
                        empresa_id: unicoId(catRes.data.catalogos.empresas),
                        clase_contrato_id: unicoId(catRes.data.catalogos.clases_contrato),
                        periodo_pago_id: unicoId(catRes.data.catalogos.periodos_pago),
                        clasificacion_dian_id: unicoId(catRes.data.catalogos.clasificaciones_dian),
                        tipo_cotizante_id: unicoId(catRes.data.catalogos.tipos_cotizante),
                        subtipo_cotizante_id: unicoId(catRes.data.catalogos.subtipos_cotizante)
                    }));
                }

                if (agente) {
                    const empRes = await api.get(`/users-company/${agente.id}`);
                    const e = empRes.data.empleado;

                    setPersonal({
                        tipo_identificacion_id: e.tipo_identificacion_idtipo_identificacion || '',
                        numero_identificacion: e.numero_identificacion || '',
                        tipo_identificacion_secundaria_id: e.tipo_identificacion_secundaria_id || '',
                        numero_identificacion_secundaria: e.numero_identificacion_secundaria || '',
                        fecha_expedicion: fecha(e.fecha_expedicion),
                        ciudad_expedicion_id: e.ciudad_expedicion_id || '',
                        primer_nombre: e.primer_nombre || '',
                        segundo_nombre: e.segundo_nombre || '',
                        primer_apellido: e.primer_apellido || '',
                        segundo_apellido: e.segundo_apellido || '',
                        fecha_nacimiento: fecha(e.fecha_nacimiento),
                        ciudad_nacimiento_id: e.ciudad_nacimiento_id || '',
                        numero_hijos: e.numero_hijos ?? 0,
                        estado_civil_id: e.estado_civil_idestado_civil || '',
                        grupo_sanguineo_id: e.grupo_sanguineo_idgrupo_sanguineo || '',
                        genero_id: e.genero_idgenero || '',
                        email: e.email || '',
                        telefono: e.telefono || '',
                        usuario_ssff: e.usuario_ssff || '',
                        rut: e.rut || '',
                        declarante_renta: !!e.declarante_renta,
                        libreta_militar_numero: e.libreta_militar_numero || ''
                    });
                    if (e.contrato) {
                        setContrato({
                            campania_id: e.contrato.campania_idcampania || '',
                            area_id: e.contrato.area_idarea || '',
                            centro_costo_id: e.contrato.centro_costo_idcentro_costo || '',
                            cargo_id: e.contrato.cargo_idcargo || '',
                            cargo_ssff: e.contrato.cargo_ssff || '',
                            tipo_contrato_id: e.contrato.tipo_contrato_idtipo_contrato || '',
                            modalidad_id: e.contrato.modalidad_idmodalidad || '',
                            oleada_id: e.contrato.oleada_idoleada || '',
                            ciudad_id: e.contrato.ciudad_idciudad || '',
                            piso: e.contrato.piso || '',
                            estado_contrato_id: e.contrato.estado_contrato_idestado_contrato || '',
                            jefe_inmediato_id: e.contrato.jefe_inmediato_id || '',
                            jefe_area_id: e.contrato.jefe_area_id || '',
                            director_area_id: e.contrato.director_area_id || '',
                            analista_encargado_id: e.contrato.analista_encargado_id || '',
                            fecha_ingreso: fecha(e.contrato.fecha_ingreso),
                            fecha_fin_periodo_prueba: fecha(e.contrato.fecha_fin_periodo_prueba),
                            fecha_fin_contrato: fecha(e.contrato.fecha_fin_contrato),
                            fecha_entrega_certificacion_laboral: fecha(e.contrato.fecha_entrega_certificacion_laboral),
                            observaciones: e.contrato.observaciones || '',
                            empresa_id: e.contrato.empresa_id || '',
                            clase_contrato_id: e.contrato.clase_contrato_id || '',
                            periodo_pago_id: e.contrato.periodo_pago_id || '',
                            clasificacion_dian_id: e.contrato.clasificacion_dian_id || '',
                            tipo_sena_id: e.contrato.tipo_sena_id || '',
                            tipo_cotizante_id: e.contrato.tipo_cotizante_id || '',
                            subtipo_cotizante_id: e.contrato.subtipo_cotizante_id || '',
                            aplica_dotacion: e.contrato.aplica_dotacion === undefined ? true : !!e.contrato.aplica_dotacion
                        });
                        // Cliente no se guarda aparte: se deriva de la campaña ya elegida,
                        // solo se usa para preseleccionar el filtro del selector de Campaña.
                        const campaniaActual = catRes.data.catalogos.campanias.find(
                            c => c.id === e.contrato.campania_idcampania
                        );
                        setClienteId(campaniaActual?.cliente_id || '');
                    }
                    if (e.salario_actual) {
                        setSalario({
                            salario: e.salario_actual.salario ?? '',
                            bono_no_prestacional: e.salario_actual.bono_no_prestacional ?? '',
                            bono_cafeteria: e.salario_actual.bono_cafeteria ?? ''
                        });
                    }
                    if (e.seguridad_social) {
                        setSegSocial({
                            eps_id: e.seguridad_social.eps_id || '',
                            arl_id: e.seguridad_social.arl_id || '',
                            afp_id: e.seguridad_social.afp_id || '',
                            cesantias_id: e.seguridad_social.cesantias_id || '',
                            caja_id: e.seguridad_social.caja_id || '',
                            tarifa_arl: e.seguridad_social.tarifa_arl ?? '',
                            eps_fecha_afiliacion: fecha(e.seguridad_social.eps_fecha_afiliacion),
                            arl_fecha_afiliacion: fecha(e.seguridad_social.arl_fecha_afiliacion),
                            afp_fecha_afiliacion: fecha(e.seguridad_social.afp_fecha_afiliacion),
                            cesantias_fecha_afiliacion: fecha(e.seguridad_social.cesantias_fecha_afiliacion),
                            caja_fecha_afiliacion: fecha(e.seguridad_social.caja_fecha_afiliacion)
                        });
                    }
                    if (e.cuenta_bancaria) {
                        setCuenta({
                            banco_id: e.cuenta_bancaria.banco_idbanco || '',
                            tipo_cuenta_id: e.cuenta_bancaria.tipo_cuenta_idtipo_cuenta || '',
                            numero_cuenta: e.cuenta_bancaria.numero_cuenta || ''
                        });
                    }
                    if (e.direccion) {
                        setDireccion({
                            tipo_direccion_id: e.direccion.tipo_direccion_idtipo_direccion || '',
                            direccion: e.direccion.direccion || '',
                            barrio: e.direccion.barrio || '',
                            ciudad_id: e.direccion.ciudad_idciudad || '',
                            zona_direccion_id: e.direccion.zona_direccion_id || '',
                            tipo_vivienda_id: e.direccion.tipo_vivienda_id || ''
                        });
                    }
                    if (e.contacto_emergencia) {
                        setContactoEmergencia({
                            nombre: e.contacto_emergencia.nombre || '',
                            telefono: e.contacto_emergencia.telefono || '',
                            parentesco_id: e.contacto_emergencia.parentesco_idparentesco || ''
                        });
                    }
                    if (e.vacunacion) {
                        setVacunacion({
                            tipo_vacuna_id: e.vacunacion.tipo_vacuna_idtipo_vacuna || '',
                            primera_dosis_fecha: fecha(e.vacunacion.primera_dosis_fecha),
                            segunda_dosis_fecha: fecha(e.vacunacion.segunda_dosis_fecha)
                        });
                    }
                    const ultimaDotacion = e.dotaciones?.[0];
                    if (ultimaDotacion) {
                        setDotacion({
                            talla_camisa: ultimaDotacion.talla_camisa || '',
                            talla_pantalon: ultimaDotacion.talla_pantalon || '',
                            talla_calzado: ultimaDotacion.talla_calzado || ''
                        });
                    }
                    const recursosAsignados = e.recursos_asignados || [];
                    setRecursos({
                        diadema_serial: recursosAsignados.find(r => r.tipo_recurso_nombre === 'diadema')?.identificador || '',
                        locker_numero: recursosAsignados.find(r => r.tipo_recurso_nombre === 'locker')?.identificador || '',
                        carnet_entregado: recursosAsignados.some(r => r.tipo_recurso_nombre === 'carnet')
                    });
                }
                setError('');
            } catch (err) {
                console.error('Error al cargar datos del formulario:', err);
                setError('Error al cargar los datos del formulario');
            } finally {
                setLoadingData(false);
            }
        };
        cargar();
    }, [agente, isOpen]);

    const onChange = (setter) => (e) => {
        const { name, value } = e.target;
        setter(prev => ({ ...prev, [name]: value }));
    };

    // El documento secundario (Identificación secundaria) solo aplica a extranjeros con
    // PPT o Pasaporte — para CC/CE/TI no tiene sentido pedirlo. Se muestra según el código
    // del tipo de documento PRINCIPAL elegido, no del secundario.
    const tipoIdPrincipalCodigo = catalogos.tipos_identificacion.find(
        o => String(o.id) === String(personal.tipo_identificacion_id)
    )?.codigo;
    const mostrarDocumentoSecundario = tipoIdPrincipalCodigo === 'PPT' || tipoIdPrincipalCodigo === 'PA';

    // "Nombre propio" del Excel fuente (hoja "Nuevo Epleado", col. 14) es el nombre completo
    // en orden Apellido Apellido Nombre Nombre — puramente derivado de estos 4 campos, no se
    // guarda aparte (mismo criterio que nombre_completo, calculado con CONCAT_WS en el backend).
    const nombrePropio = [
        personal.primer_apellido, personal.segundo_apellido,
        personal.primer_nombre, personal.segundo_nombre
    ].filter(Boolean).join(' ');

    const handleTipoIdentificacionChange = (e) => {
        const { value } = e.target;
        const codigo = catalogos.tipos_identificacion.find(o => String(o.id) === String(value))?.codigo;
        const aplicaSecundario = codigo === 'PPT' || codigo === 'PA';
        setPersonal(prev => ({
            ...prev,
            tipo_identificacion_id: value,
            ...(aplicaSecundario ? {} : { tipo_identificacion_secundaria_id: '', numero_identificacion_secundaria: '' })
        }));
    };

    // Cliente es un filtro de UI, no un campo del contrato: el backend sigue derivando
    // el cliente de la campaña elegida (clienteDeCampania en el modelo). Separarlos aquí
    // solo evita el "Obamacare (Obamacare)" del selector único anterior.
    const clientesUnicos = (() => {
        const mapa = new Map();
        for (const c of catalogos.campanias) {
            if (!mapa.has(c.cliente_id)) mapa.set(c.cliente_id, { id: c.cliente_id, nombre: c.cliente_nombre });
        }
        // "Obama" es un cliente residual de la semilla (migracion 036), duplicado de "OBAMACARE"
        // (mismo cliente real, nunca tuvo empleados reales -- ver claude/modulo
        // recursoshumanos.md §13.1). Se oculta del selector para altas nuevas; si un empleado ya
        // existente quedo registrado con el, se conserva visible al editarlo -- no se toca su dato
        // ni se fuerza a cambiarlo.
        for (const [id, c] of mapa) {
            if (c.nombre === 'Obama' && String(id) !== String(clienteId)) mapa.delete(id);
        }
        return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    })();

    const campaniasFiltradas = clienteId
        ? catalogos.campanias.filter(c => String(c.cliente_id) === String(clienteId))
        : catalogos.campanias;

    // Cargo se filtra por Cliente usando `salarios_referencia` (Cliente+Cargo de la hoja
    // "Salarios", migracion 054) -- el catalogo `cargo` es compartido por todos los clientes (61
    // cargos), pero cada cliente real solo usa un subconjunto. Si el cliente elegido no tiene
    // ninguna fila en `salarios_referencia` (ej. BEEMO, que no esta en ese Excel) no se filtra --
    // mejor mostrar el catalogo completo que dejar el selector vacio y bloquear el formulario.
    const cargoIdsDelCliente = clienteId
        ? new Set(
            catalogos.salarios_referencia
                .filter(s => String(s.cliente_id) === String(clienteId))
                .map(s => String(s.cargo_id))
        )
        : new Set();
    const cargosFiltrados = cargoIdsDelCliente.size > 0
        ? catalogos.cargos.filter(c => cargoIdsDelCliente.has(String(c.id)) || String(c.id) === String(contrato.cargo_id))
        : catalogos.cargos;

    // Sueldo sugerido por Cliente + Cargo (hoja "Salarios" de Informacion 280926 (1).xlsx,
    // migracion 054). Solo autocompleta cuando hay un unico salario de referencia para esa
    // combinacion -- si hay mas de uno (ej. Asiste + Ayudante de obra, con 3 valores reales
    // distintos en la fuente) no se adivina cual aplica; en su lugar se ofrece un selector
    // (ver `salariosAmbiguos` mas abajo) para que la persona elija uno de los valores reales.
    // El campo "Salario mensual" se bloquea (`salarioBloqueado`) en cuanto toma un valor por
    // esta via -- cambiar Cliente o Cargo a una combinacion sin referencia lo vuelve a habilitar.
    const salarioSugerido = (clienteIdBuscado, cargoIdBuscado) => {
        if (!clienteIdBuscado || !cargoIdBuscado) return null;
        const coincidencias = catalogos.salarios_referencia.filter(
            s => String(s.cliente_id) === String(clienteIdBuscado) && String(s.cargo_id) === String(cargoIdBuscado)
        );
        const valoresUnicos = [...new Set(coincidencias.map(s => String(s.salario)))];
        // El valor viene de una columna DECIMAL (ej. "1925996.00"); se redondea a entero porque
        // los salarios de este modulo siempre son pesos sin centavos.
        return valoresUnicos.length === 1 ? String(Math.round(Number(valoresUnicos[0]))) : null;
    };

    // Cuando el Cliente + Cargo elegido tiene mas de un salario real distinto en la fuente,
    // esta lista alimenta el selector "Sueldo sugerido" de la seccion Salario. Vacia (sin
    // selector visible) en el caso normal de un unico valor, que ya se autocompleta solo.
    const salariosAmbiguos = (() => {
        if (!clienteId || !contrato.cargo_id) return [];
        const coincidencias = catalogos.salarios_referencia.filter(
            s => String(s.cliente_id) === String(clienteId) && String(s.cargo_id) === String(contrato.cargo_id)
        );
        const valoresUnicos = [...new Set(coincidencias.map(s => String(Math.round(Number(s.salario)))))];
        return valoresUnicos.length > 1 ? valoresUnicos.sort((a, b) => Number(a) - Number(b)) : [];
    })();

    // Si el cargo ya elegido no pertenece a los cargos reales del nuevo cliente (segun
    // `salarios_referencia`), se limpia -- igual que ya se hacia con Campaña -- para no dejar
    // seleccionado en silencio un cargo que ni siquiera aparece en el selector filtrado.
    const cargoValidoParaCliente = (cargoId, clienteIdNuevo) => {
        const idsDelCliente = new Set(
            catalogos.salarios_referencia
                .filter(s => String(s.cliente_id) === String(clienteIdNuevo))
                .map(s => String(s.cargo_id))
        );
        return idsDelCliente.size === 0 || idsDelCliente.has(String(cargoId));
    };

    const handleClienteChange = (e) => {
        const id = e.target.value;
        setClienteId(id);
        setContrato(prev => {
            const campaniaActual = catalogos.campanias.find(c => String(c.id) === String(prev.campania_id));
            const siguiente = { ...prev };
            if (campaniaActual && String(campaniaActual.cliente_id) !== String(id)) {
                siguiente.campania_id = '';
            }
            if (prev.cargo_id && !cargoValidoParaCliente(prev.cargo_id, id)) {
                siguiente.cargo_id = '';
            }
            return siguiente;
        });
        const sugerido = salarioSugerido(id, contrato.cargo_id);
        if (sugerido !== null) {
            setSalario(prev => ({ ...prev, salario: sugerido }));
            setSalarioBloqueado(true);
        } else {
            setSalarioBloqueado(false);
        }
    };

    const handleCampaniaChange = (e) => {
        const id = e.target.value;
        const campaniaElegida = catalogos.campanias.find(c => String(c.id) === String(id));
        setContrato(prev => {
            const siguiente = { ...prev, campania_id: id };
            if (campaniaElegida && prev.cargo_id && !cargoValidoParaCliente(prev.cargo_id, campaniaElegida.cliente_id)) {
                siguiente.cargo_id = '';
            }
            return siguiente;
        });
        if (campaniaElegida) setClienteId(campaniaElegida.cliente_id);
    };

    const handleCargoChange = (e) => {
        const id = e.target.value;
        setContrato(prev => ({ ...prev, cargo_id: id }));
        const sugerido = salarioSugerido(clienteId, id);
        if (sugerido !== null) {
            setSalario(prev => ({ ...prev, salario: sugerido }));
            setSalarioBloqueado(true);
        } else {
            setSalarioBloqueado(false);
        }
    };

    const handleSueldoAmbiguoChange = (e) => {
        if (!e.target.value) return;
        setSalario(prev => ({ ...prev, salario: e.target.value }));
        setSalarioBloqueado(true);
    };

    // "Salario mensual" se escribe/muestra con puntos de miles (formatearMiles), pero el estado
    // sigue guardando solo digitos -- por eso no se puede usar el <input type="number"> nativo
    // (no admite separadores de miles ni cambia su formato de despliegue segun el locale).
    const handleSalarioChange = (e) => {
        const soloDigitos = e.target.value.replace(/\D/g, '');
        setSalario(prev => ({ ...prev, salario: soloDigitos }));
    };

    // El fin de periodo de prueba se calcula solo (2 meses después del ingreso), pero
    // sigue siendo un campo editable por si el caso real difiere de la regla general. Si el
    // tipo de contrato ya elegido es Aprendizaje, "Fin de contrato" se recalcula igual (6 meses).
    const handleFechaIngresoChange = (e) => {
        const { value } = e.target;
        const esAprendizaje = tipoContratoNombre.toLowerCase().includes('aprendizaje');
        setContrato(prev => ({
            ...prev,
            fecha_ingreso: value,
            fecha_fin_periodo_prueba: value ? sumarMeses(value, 2) : prev.fecha_fin_periodo_prueba,
            ...(esAprendizaje ? { fecha_fin_contrato: value ? sumarMeses(value, 6) : '' } : {})
        }));
    };

    // "Fin de contrato" solo aplica a tipos de contrato con fecha de finalización estipulada
    // (Fijo, Obra o labor, Prestación de servicios, Aprendizaje) — un indefinido no la tiene.
    const tipoContratoNombre = catalogos.tipos_contrato.find(
        o => String(o.id) === String(contrato.tipo_contrato_id)
    )?.nombre || '';
    const mostrarFinContrato = tipoContratoNombre !== '' && !tipoContratoNombre.toLowerCase().includes('indefinido');

    // Aprendizaje sugiere "Fin de contrato" a 6 meses del ingreso (duración estándar de un
    // contrato de aprendizaje) -- igual que el periodo de prueba, sigue siendo editable después.
    const handleTipoContratoChange = (e) => {
        const { value } = e.target;
        const nombre = catalogos.tipos_contrato.find(o => String(o.id) === String(value))?.nombre || '';
        const esIndefinido = nombre.toLowerCase().includes('indefinido');
        const esAprendizaje = nombre.toLowerCase().includes('aprendizaje');
        setContrato(prev => ({
            ...prev,
            tipo_contrato_id: value,
            ...(esIndefinido ? { fecha_fin_contrato: '' } : {}),
            ...(esAprendizaje && prev.fecha_ingreso ? { fecha_fin_contrato: sumarMeses(prev.fecha_ingreso, 6) } : {})
        }));
    };

    const irASiguiente = () => {
        if (formRef.current?.reportValidity()) setPaso(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (paso === 1) {
            irASiguiente();
            return;
        }
        setLoading(true);
        setError('');

        const payload = {
            ...personal,
            numero_hijos: personal.numero_hijos !== '' ? parseInt(personal.numero_hijos, 10) : 0,
            contrato,
            salario: {
                salario: salario.salario !== '' ? parseFloat(salario.salario) : null,
                bono_no_prestacional: salario.bono_no_prestacional !== '' ? parseFloat(salario.bono_no_prestacional) : 0,
                bono_cafeteria: salario.bono_cafeteria !== '' ? parseFloat(salario.bono_cafeteria) : 0
            },
            seguridad_social: segSocial,
            cuenta_bancaria: cuenta,
            direccion,
            contacto_emergencia: contactoEmergencia,
            vacunacion: (vacunacion.tipo_vacuna_id || vacunacion.primera_dosis_fecha || vacunacion.segunda_dosis_fecha) ? vacunacion : null,
            dotacion: (dotacion.talla_camisa || dotacion.talla_pantalon || dotacion.talla_calzado) ? dotacion : null,
            recursos
        };

        try {
            let response;
            if (agente) {
                response = await api.put(`/users-company/${agente.id}`, payload);
            } else {
                response = await api.post('/users-company', payload);
            }

            if (response.data.success) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error('Error al guardar empleado:', err);
            if (err.response?.data?.type === 'DUPLICATE_IDENTIFICACION') {
                setError(err.response.data.message);
            } else {
                setError(err.response?.data?.message || err.message || 'Error al guardar el empleado');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectField = (label, name, value, handler, options, { required = false, render = (o) => o.nombre, tagSalario = false } = {}) => (
        <div className={`ai-field${tagSalario ? ' ai-field--salario-source' : ''}`}>
            <label className="ai-label">
                {label}{required && <em>*</em>}
                {tagSalario && <span className="ai-label-tag" title="Junto con este campo, sugiere el salario">$ Salario</span>}
            </label>
            <select name={name} value={value} onChange={handler} required={required} className="ai-input">
                <option value="">{required ? 'Seleccionar…' : 'Sin especificar'}</option>
                {options.map(o => <option key={o.id} value={o.id}>{render(o)}</option>)}
            </select>
        </div>
    );

    const textField = (label, name, value, handler, { required = false, type = 'text', placeholder = '', min, max, step, span2 = false } = {}) => (
        <div className={`ai-field${span2 ? ' span-2' : ''}`}>
            <label className="ai-label">{label}{required && <em>*</em>}</label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={handler}
                required={required}
                min={min}
                max={max}
                step={step}
                placeholder={placeholder}
                className="ai-input"
            />
        </div>
    );

    // "Jefe inmediato"/"Jefe de área"/"Director de área" solo ofrecen a quienes YA son jefe o
    // director de alguien en un contrato real (34/8/4 personas, ver `getCatalogos()` en
    // UserCompany.js), no los ~400 empleados del catálogo completo. Si el valor ya guardado (al
    // editar) no está en esa lista, se agrega igual -- no dejar un valor seleccionado sin
    // aparecer en las opciones visibles.
    const filtrarJefes = (lista, valorActual) => {
        const base = lista.filter(emp => !agente || emp.id !== agente.id);
        if (valorActual && !base.some(emp => String(emp.id) === String(valorActual))) {
            const yaGuardado = catalogos.empleados.find(emp => String(emp.id) === String(valorActual));
            if (yaGuardado) return [...base, yaGuardado].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
        }
        return base;
    };

    // Los 3 catálogos anteriores traen ahora una fila por cada Campaña (y, para jefe inmediato,
    // Cargo) real en la que esa persona figura como jefe -- una misma persona puede repetirse en
    // varias filas. `dedupePorId` colapsa eso a una opción por persona para cuando no hay
    // suficiente contexto para filtrar todavía.
    const dedupePorId = (lista) => {
        const mapa = new Map();
        for (const item of lista) if (!mapa.has(item.id)) mapa.set(item.id, item);
        return [...mapa.values()];
    };

    // Filtra "Jefe de área"/"Director de área" según la Campaña ya elegida del empleado que se
    // está registrando -- verificado contra datos reales (ver UserCompany.js::getCatalogos): esos
    // dos roles casi siempre cubren toda la campaña sin importar el cargo del subordinado. Sin
    // Campaña elegida, o si la campaña no tiene ningún candidato real todavía (ej. campaña nueva
    // sin historial), se muestra la lista completa -- mismo criterio que el filtro de Cargo por
    // Cliente: mejor no bloquear el alta que dejar el selector vacío.
    const filtrarPorCampania = (lista, campaniaId) => {
        if (!campaniaId) return dedupePorId(lista);
        const filtrados = lista.filter(j => String(j.campania_id) === String(campaniaId));
        return filtrados.length > 0 ? dedupePorId(filtrados) : dedupePorId(lista);
    };

    // "Jefe inmediato" sí varía por Cargo dentro de una misma Campaña (ej. T&T + Agente call
    // center trae 7 candidatos reales distintos, T&T + Coordinador Call trae solo 1) -- se filtra
    // primero por Campaña+Cargo; si esa combinación exacta no tiene candidatos (cargo recién
    // elegido, o combinación nueva), cae a filtrar solo por Campaña.
    const filtrarJefesInmediatos = (lista, campaniaId, cargoId) => {
        if (!campaniaId) return dedupePorId(lista);
        if (cargoId) {
            const porCampaniaYCargo = lista.filter(
                j => String(j.campania_id) === String(campaniaId) && String(j.cargo_id) === String(cargoId)
            );
            if (porCampaniaYCargo.length > 0) return dedupePorId(porCampaniaYCargo);
        }
        return filtrarPorCampania(lista, campaniaId);
    };

    const jefesInmediatosOpciones = filtrarJefes(
        filtrarJefesInmediatos(catalogos.jefes_inmediatos, contrato.campania_id, contrato.cargo_id),
        contrato.jefe_inmediato_id
    );
    const jefesAreaOpciones = filtrarJefes(
        filtrarPorCampania(catalogos.jefes_area, contrato.campania_id),
        contrato.jefe_area_id
    );
    const directoresAreaOpciones = filtrarJefes(
        filtrarPorCampania(catalogos.directores_area, contrato.campania_id),
        contrato.director_area_id
    );

    return (
        <div className="ai-overlay ai-scope" onClick={onClose}>
            <div className="ai-modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
                <div className="ai-modal-head">
                    <span className="ai-modal-icon"><UserPlus size={20} strokeWidth={1.75} /></span>
                    <div>
                        <h2 className="ai-modal-title">{agente ? 'Editar empleado' : 'Nuevo empleado'}</h2>
                        <p className="ai-modal-sub">Paso {paso} de 2 · Los campos con * son obligatorios</p>
                    </div>
                    <button className="ai-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} strokeWidth={1.75} /></button>
                </div>

                <div className="ai-steps">
                    {PASOS.map(p => (
                        <div key={p.n} className={`ai-step${p.n < paso ? ' is-done' : ''}${p.n === paso ? ' is-current' : ''}`}>
                            {p.n}. {p.label}
                        </div>
                    ))}
                </div>

                {loadingData ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                        <Loader2 size={32} strokeWidth={1.75} className="animate-spin" style={{ color: 'var(--primary)' }} />
                    </div>
                ) : (
                    <form ref={formRef} onSubmit={handleSubmit}>
                        <div className="ai-modal-body" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                            {error && (
                                <div className="ai-badge ai-badge--danger" style={{ height: 'auto', padding: '10px 14px', marginBottom: 16, width: '100%' }}>
                                    {error}
                                </div>
                            )}

                            {/* ===== Paso 1: Datos personales ===== */}
                            <div style={{ display: paso === 1 ? 'block' : 'none' }}>
                                <p className="ai-overline" style={{ marginBottom: 10 }}>Identificación</p>
                                <div className="ai-form-grid">
                                    {selectField('Tipo de documento', 'tipo_identificacion_id', personal.tipo_identificacion_id, handleTipoIdentificacionChange, catalogos.tipos_identificacion, { required: true, render: o => `${o.nombre} (${o.codigo})` })}
                                    {textField('Número de identificación', 'numero_identificacion', personal.numero_identificacion, onChange(setPersonal), { required: true, placeholder: 'Número de identificación' })}
                                    {textField('Fecha de expedición', 'fecha_expedicion', personal.fecha_expedicion, onChange(setPersonal), { type: 'date' })}
                                    <ComboboxBuscable label="Ciudad de expedición" opciones={catalogos.ciudades} value={personal.ciudad_expedicion_id} onChange={(id) => setPersonal(prev => ({ ...prev, ciudad_expedicion_id: id }))} />
                                    {mostrarDocumentoSecundario && selectField('Tipo de documento secundario', 'tipo_identificacion_secundaria_id', personal.tipo_identificacion_secundaria_id, onChange(setPersonal), catalogos.tipos_identificacion, { render: o => `${o.nombre} (${o.codigo})` })}
                                    {mostrarDocumentoSecundario && textField('Identificación secundaria', 'numero_identificacion_secundaria', personal.numero_identificacion_secundaria, onChange(setPersonal), { placeholder: 'Ej. PPT, CE' })}
                                    {textField('RUT', 'rut', personal.rut, onChange(setPersonal), { placeholder: 'Número de RUT' })}
                                    {textField('Libreta militar No.', 'libreta_militar_numero', personal.libreta_militar_numero, onChange(setPersonal), { placeholder: 'Número de libreta militar' })}
                                </div>

                                <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Datos personales</p>
                                <div className="ai-form-grid">
                                    {textField('Primer nombre', 'primer_nombre', personal.primer_nombre, onChange(setPersonal), { required: true })}
                                    {textField('Segundo nombre', 'segundo_nombre', personal.segundo_nombre, onChange(setPersonal))}
                                    {textField('Primer apellido', 'primer_apellido', personal.primer_apellido, onChange(setPersonal), { required: true })}
                                    {textField('Segundo apellido', 'segundo_apellido', personal.segundo_apellido, onChange(setPersonal))}
                                    <div className="ai-field span-2">
                                        <label className="ai-label">Nombre propio (automático)</label>
                                        <p style={{ margin: 0, fontSize: 14 }}>{nombrePropio || '—'}</p>
                                    </div>
                                    {textField('Fecha de nacimiento', 'fecha_nacimiento', personal.fecha_nacimiento, onChange(setPersonal), { type: 'date' })}
                                    <ComboboxBuscable label="Ciudad de nacimiento" opciones={catalogos.ciudades} value={personal.ciudad_nacimiento_id} onChange={(id) => setPersonal(prev => ({ ...prev, ciudad_nacimiento_id: id }))} />
                                    {selectField('Género', 'genero_id', personal.genero_id, onChange(setPersonal), catalogos.generos)}
                                    {selectField('Estado civil', 'estado_civil_id', personal.estado_civil_id, onChange(setPersonal), catalogos.estados_civiles)}
                                    {selectField('Grupo sanguíneo', 'grupo_sanguineo_id', personal.grupo_sanguineo_id, onChange(setPersonal), catalogos.grupos_sanguineos)}
                                    {textField('Número de hijos', 'numero_hijos', personal.numero_hijos, onChange(setPersonal), { type: 'number', min: 0 })}
                                    {textField('Correo electrónico', 'email', personal.email, onChange(setPersonal), { type: 'email', placeholder: 'correo@empresa.com' })}
                                    {textField('Teléfono', 'telefono', personal.telefono, onChange(setPersonal), { required: true, type: 'tel', placeholder: 'Ej. 300 123 4567' })}
                                </div>

                                <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Dirección de residencia</p>
                                <div className="ai-form-grid">
                                    {textField('Dirección', 'direccion', direccion.direccion, onChange(setDireccion), { placeholder: 'Ej. Calle 45 # 12-30, Bogotá', span2: true })}
                                    {textField('Barrio', 'barrio', direccion.barrio, onChange(setDireccion))}
                                    <ComboboxBuscable label="Ciudad de residencia" opciones={catalogos.ciudades} value={direccion.ciudad_id} onChange={(id) => setDireccion(prev => ({ ...prev, ciudad_id: id }))} />
                                    {selectField('Zona', 'zona_direccion_id', direccion.zona_direccion_id, onChange(setDireccion), catalogos.zonas_direccion)}
                                    {selectField('Tipo de vivienda', 'tipo_vivienda_id', direccion.tipo_vivienda_id, onChange(setDireccion), catalogos.tipos_vivienda)}
                                </div>
                            </div>

                            {/* ===== Paso 2: Contratación ===== */}
                            <div style={{ display: paso === 2 ? 'block' : 'none' }}>
                                <p className="ai-overline" style={{ marginBottom: 10 }}>Contrato</p>
                                <div className="ai-form-grid">
                                    {selectField('Cliente', 'cliente_id', clienteId, handleClienteChange, clientesUnicos, { required: paso === 2, tagSalario: true })}
                                    {selectField('Campaña', 'campania_id', contrato.campania_id, handleCampaniaChange, campaniasFiltradas, { required: paso === 2 })}
                                    {selectField('Área', 'area_id', contrato.area_id, onChange(setContrato), catalogos.areas, { required: paso === 2 })}
                                    {selectField('Centro de costo', 'centro_costo_id', contrato.centro_costo_id, onChange(setContrato), catalogos.centros_costo, { required: paso === 2, render: o => `${o.codigo} — ${o.nombre}` })}
                                    {selectField('Cargo', 'cargo_id', contrato.cargo_id, handleCargoChange, cargosFiltrados, { required: paso === 2, tagSalario: true })}
                                    {textField('Cargo en SSFF', 'cargo_ssff', contrato.cargo_ssff, onChange(setContrato), { placeholder: 'Cargo tal como aparece en SuccessFactors' })}
                                    {selectField('Tipo de contrato', 'tipo_contrato_id', contrato.tipo_contrato_id, handleTipoContratoChange, catalogos.tipos_contrato, { required: paso === 2 })}
                                    {selectField('Modalidad', 'modalidad_id', contrato.modalidad_id, onChange(setContrato), catalogos.modalidades, { required: paso === 2 })}
                                    {selectField('Oleada', 'oleada_id', contrato.oleada_id, onChange(setContrato), catalogos.oleadas, { required: paso === 2 })}
                                    <ComboboxBuscable label="Ciudad de trabajo" opciones={catalogos.ciudades} value={contrato.ciudad_id} onChange={(id) => setContrato(prev => ({ ...prev, ciudad_id: id }))} required={paso === 2} />
                                    {textField('Piso', 'piso', contrato.piso, onChange(setContrato), { placeholder: 'Ej. 4' })}
                                    {textField('Fecha de ingreso', 'fecha_ingreso', contrato.fecha_ingreso, handleFechaIngresoChange, { type: 'date', required: paso === 2 })}
                                    {textField('Fin periodo de prueba', 'fecha_fin_periodo_prueba', contrato.fecha_fin_periodo_prueba, onChange(setContrato), { type: 'date' })}
                                    {mostrarFinContrato && textField('Fin de contrato', 'fecha_fin_contrato', contrato.fecha_fin_contrato, onChange(setContrato), { type: 'date' })}
                                    {/* Al crear, el backend deja el contrato en "activo" por defecto (ver
                                        `estadoContratoActivo()` en UserCompany.js) si no se manda este campo --
                                        por eso solo se expone al editar un empleado ya existente. */}
                                    {agente && selectField('Estado del contrato', 'estado_contrato_id', contrato.estado_contrato_id, onChange(setContrato), catalogos.estados_contrato)}
                                    {selectField('Jefe inmediato', 'jefe_inmediato_id', contrato.jefe_inmediato_id, onChange(setContrato), jefesInmediatosOpciones, { render: o => o.nombre_completo })}
                                    {selectField('Jefe de área', 'jefe_area_id', contrato.jefe_area_id, onChange(setContrato), jefesAreaOpciones, { render: o => o.nombre_completo })}
                                    {selectField('Director de área', 'director_area_id', contrato.director_area_id, onChange(setContrato), directoresAreaOpciones, { render: o => o.nombre_completo })}
                                    {selectField('Empresa', 'empresa_id', contrato.empresa_id, onChange(setContrato), catalogos.empresas)}
                                    {selectField('Periodo de pago', 'periodo_pago_id', contrato.periodo_pago_id, onChange(setContrato), catalogos.periodos_pago)}
                                    {selectField('Tipo cotizante', 'tipo_cotizante_id', contrato.tipo_cotizante_id, onChange(setContrato), catalogos.tipos_cotizante)}
                                    <div className="ai-field">
                                        <label className="ai-label">Dotación</label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                                            <input
                                                type="checkbox"
                                                checked={contrato.aplica_dotacion}
                                                onChange={(e) => setContrato(prev => ({ ...prev, aplica_dotacion: e.target.checked }))}
                                            />
                                            Aplica
                                        </label>
                                    </div>
                                </div>

                                <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Salario</p>
                                {salariosAmbiguos.length > 0 && (
                                    <div className="ai-form-grid" style={{ marginBottom: 10 }}>
                                        <div className="ai-field span-2">
                                            <label className="ai-label">Sueldo sugerido — elige uno</label>
                                            <select
                                                className="ai-input"
                                                value=""
                                                onChange={handleSueldoAmbiguoChange}
                                            >
                                                <option value="">Elige salario</option>
                                                {salariosAmbiguos.map(valor => (
                                                    <option key={valor} value={valor}>{`$ ${formatearMiles(valor)}`}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                                <div className="ai-form-grid">
                                    <div className="ai-field">
                                        <label className="ai-label">Salario mensual<em>*</em></label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={formatearMiles(salario.salario)}
                                            onChange={handleSalarioChange}
                                            required={paso === 2}
                                            placeholder={salariosAmbiguos.length > 0 ? 'Elige un sueldo arriba' : '0'}
                                            className="ai-input"
                                            disabled={salarioBloqueado}
                                            title={salarioBloqueado ? 'Definido automáticamente por Cliente + Cargo — cambia uno de los dos para editarlo' : undefined}
                                        />
                                    </div>
                                    {textField('Bono no prestacional', 'bono_no_prestacional', salario.bono_no_prestacional, onChange(setSalario), { type: 'number', min: 0, step: '0.01', placeholder: '0.00' })}
                                    {textField('Bono cafetería', 'bono_cafeteria', salario.bono_cafeteria, onChange(setSalario), { type: 'number', min: 0, step: '0.01', placeholder: '0.00' })}
                                </div>

                                <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Seguridad social</p>
                                <div className="ai-form-grid">
                                    {selectField('EPS', 'eps_id', segSocial.eps_id, onChange(setSegSocial), catalogos.entidades_eps)}
                                    {textField('Fecha afiliación EPS', 'eps_fecha_afiliacion', segSocial.eps_fecha_afiliacion, onChange(setSegSocial), { type: 'date' })}
                                    {selectField('ARL', 'arl_id', segSocial.arl_id, onChange(setSegSocial), catalogos.entidades_arl)}
                                    {textField('Fecha afiliación ARL', 'arl_fecha_afiliacion', segSocial.arl_fecha_afiliacion, onChange(setSegSocial), { type: 'date' })}
                                    {selectField('Tarifa ARL (%)', 'tarifa_arl', segSocial.tarifa_arl, onChange(setSegSocial), TARIFAS_ARL)}
                                    {selectField('Fondo de pensiones (AFP)', 'afp_id', segSocial.afp_id, onChange(setSegSocial), catalogos.entidades_afp)}
                                    {textField('Fecha afiliación AFP', 'afp_fecha_afiliacion', segSocial.afp_fecha_afiliacion, onChange(setSegSocial), { type: 'date' })}
                                    {selectField('Fondo de cesantías', 'cesantias_id', segSocial.cesantias_id, onChange(setSegSocial), catalogos.entidades_cesantias)}
                                    {selectField('Caja de compensación', 'caja_id', segSocial.caja_id, onChange(setSegSocial), catalogos.entidades_caja)}
                                    {textField('Fecha afiliación caja', 'caja_fecha_afiliacion', segSocial.caja_fecha_afiliacion, onChange(setSegSocial), { type: 'date' })}
                                </div>

                                <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Cuenta bancaria</p>
                                <div className="ai-form-grid">
                                    {selectField('Banco', 'banco_id', cuenta.banco_id, onChange(setCuenta), catalogos.bancos)}
                                    {selectField('Tipo de cuenta', 'tipo_cuenta_id', cuenta.tipo_cuenta_id, onChange(setCuenta), catalogos.tipos_cuenta)}
                                    {textField('Número de cuenta', 'numero_cuenta', cuenta.numero_cuenta, onChange(setCuenta), { placeholder: 'Número de cuenta' })}
                                </div>

                                <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Contacto de emergencia</p>
                                <div className="ai-form-grid">
                                    {textField('Nombre', 'nombre', contactoEmergencia.nombre, onChange(setContactoEmergencia), { placeholder: 'Nombre completo' })}
                                    {textField('Teléfono', 'telefono', contactoEmergencia.telefono, onChange(setContactoEmergencia), { type: 'tel', placeholder: 'Ej. 300 123 4567' })}
                                    {selectField('Parentesco', 'parentesco_id', contactoEmergencia.parentesco_id, onChange(setContactoEmergencia), catalogos.parentescos)}
                                </div>

                                {contrato.aplica_dotacion && (
                                    <>
                                        <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Dotación</p>
                                        <div className="ai-form-grid">
                                            {textField('Talla camisa', 'talla_camisa', dotacion.talla_camisa, onChange(setDotacion), { placeholder: 'Ej. L' })}
                                            {textField('Talla pantalón', 'talla_pantalon', dotacion.talla_pantalon, onChange(setDotacion), { placeholder: 'Ej. 34' })}
                                            {textField('Talla calzado', 'talla_calzado', dotacion.talla_calzado, onChange(setDotacion), { placeholder: 'Ej. 39' })}
                                        </div>
                                    </>
                                )}

                                <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Recursos asignados</p>
                                <div className="ai-form-grid">
                                    {textField('Serial diadema', 'diadema_serial', recursos.diadema_serial, onChange(setRecursos), { placeholder: 'Serial de la diadema' })}
                                    {textField('Número de locker', 'locker_numero', recursos.locker_numero, onChange(setRecursos), { placeholder: 'Ej. 27' })}
                                    <div className="ai-field">
                                        <label className="ai-label">Carnet</label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                                            <input
                                                type="checkbox"
                                                checked={recursos.carnet_entregado}
                                                onChange={(e) => setRecursos(prev => ({ ...prev, carnet_entregado: e.target.checked }))}
                                            />
                                            Entregado
                                        </label>
                                    </div>
                                </div>

                                <p className="ai-overline" style={{ margin: '18px 0 10px' }}>Otros</p>
                                <div className="ai-form-grid">
                                    {textField('Usuario SSFF', 'usuario_ssff', personal.usuario_ssff, onChange(setPersonal), { placeholder: 'Usuario en SuccessFactors' })}
                                </div>
                            </div>
                        </div>

                        <div className="ai-modal-foot">
                            {paso === 2 ? (
                                <button type="button" className="ai-btn ai-btn--secondary" onClick={() => setPaso(1)} disabled={loading}>
                                    <ChevronLeft size={16} strokeWidth={1.75} />
                                    Atrás
                                </button>
                            ) : (
                                <button type="button" className="ai-btn ai-btn--secondary" onClick={onClose} disabled={loading}>
                                    Cancelar
                                </button>
                            )}

                            {paso === 1 ? (
                                <button key="btn-siguiente" type="button" className="ai-btn ai-btn--primary" onClick={irASiguiente}>
                                    Siguiente
                                    <ChevronRight size={16} strokeWidth={1.75} />
                                </button>
                            ) : (
                                <button key="btn-guardar" type="submit" className="ai-btn ai-btn--primary" disabled={loading}>
                                    {loading ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin" /> : <Save size={16} strokeWidth={1.75} />}
                                    {loading ? 'Guardando…' : `${agente ? 'Actualizar' : 'Guardar'} empleado`}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AgentForm;
