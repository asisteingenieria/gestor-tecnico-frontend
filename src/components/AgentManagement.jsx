import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { userCompanyService } from '../services/api';
import AgentForm from './AgentForm';
import EmpleadoDrawer from './EmpleadoDrawer';
import RetiroModal from './RetiroModal';
import TraspasoForm from './TraspasoForm';
import ConfirmarEliminarModal from './ConfirmarEliminarModal';
import ImportEmpleadosModal from './ImportEmpleadosModal';
import DescargarEmpleadosModal from './DescargarEmpleadosModal';
import Pagination from './Pagination';
import FiltroChip from './FiltroChip';
import { nombrePropio, iniciales, claseCampania, formatearTelefono, primeraMayuscula } from '../utils/formatoRRHH';
import { formatearFecha } from '../utils/fecha';
import {
    Users, Plus, Edit3, Trash2, Eye,
    Package, AlertCircle, UserCheck, Wallet,
    Upload, LayoutGrid, List, RefreshCw, Download, UserMinus, Contact
} from 'lucide-react';
import { EncabezadoVista, Mosaicos, Mosaico, BarraFiltros, CampoBusqueda, Pastilla, AvatarVista, CargandoVista, VistaVacia, COLOR_EMPLEADO, TONO } from './ui';
import { escucharAsistencia } from '../utils/socketAsistencia';

const PAGE_SIZES = [20, 25, 50];

// Rango de fechas del listado de RRHH/financiera (§56.1): el mismo criterio que la descarga de empleados.
const CAMPOS_RANGO = [
    { valor: 'ingreso', etiqueta: 'Fecha de ingreso' },
    { valor: 'retiro', etiqueta: 'Fecha de retiro' },
    { valor: 'registro', etiqueta: 'Fecha de registro' }
];
const ETIQUETA_CAMPO_RANGO = Object.fromEntries(CAMPOS_RANGO.map(({ valor, etiqueta }) => [valor, etiqueta]));
const ESTADOS_TEXTO_RETIRO = ['Retirado', 'Inactivo'];
// Día de Bogotá 'YYYY-MM-DD' de un timestamp guardado en UTC.
const diaBogota = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

const formatSalario = (val) => {
    if (val == null) return '—';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
};

const estadoBadge = (estado) => {
    const color = COLOR_EMPLEADO[estado || 'sin_contrato'] || TONO.alerta;
    if (estado === 'activo') return { color, texto: 'Activo' };
    if (['retirado', 'inactivo'].includes(estado)) return { color, texto: primeraMayuscula(estado || '') };
    if (!estado) return { color, texto: 'Sin contrato' };
    return { color, texto: primeraMayuscula(estado) };
};

// Documentación del empleado y contrato y anexos (migración 088): 2 por empleado.
const OPCIONES_DOCUMENTOS = ['Completos', 'Pendientes'];
const estadoDocumentos = (e) => (Number(e.documentos_cargados) >= 2 ? 'Completos' : 'Pendientes');

// 'YYYY-MM-DD' de una fecha (DATE o timestamp ISO). En UTC, igual que formatearFecha, para que
// el valor del filtro coincida con el día que muestra la tabla.
const aYMD = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return v.slice(0, 10);
    const d = new Date(v);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
};
// Fechas distintas presentes en la lista para un campo, de la más reciente a la más antigua.
const fechasUnicas = (lista, campo) => {
    const set = new Set();
    lista.forEach(e => { const d = aYMD(e[campo]); if (d) set.add(d); });
    return [...set].sort((a, b) => b.localeCompare(a));
};
// "Fecha de registro" de la vista del admin: para un retirado, el instante en que RRHH lo pasó a
// retirado (retiro.created_at); para los demás, cuándo se creó la ficha (users_company.created_at).
const instanteRegistro = (e) => (e.estado_contrato_nombre === 'retirado' && e.retiro_registrado_en
    ? e.retiro_registrado_en
    : e.created_at);
// El mismo instante como día 'YYYY-MM-DD' de Bogotá: la BD guarda UTC y un registro después de las
// 7 p. m. caería en el día siguiente. Así lo usan la columna y el filtro (formatearFecha lo deja igual).
const fechaRegistro = (e) => {
    const v = instanteRegistro(e);
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

// `soloLectura`: vista de consulta para el admin (Hanny Admin). Ve la lista, la ficha completa y
// los documentos (ver/descargar), sin crear, editar, eliminar, importar, retirar ni traspasar.
const AgentManagement = ({ soloLectura = false }) => {
    const { user, isRecursosHumanos, isFinanciera, isAdmin, canVerEmpleadosRrhh } = useAuth();
    // RRHH y financiera ya no descargan jefaturas: descargan el Excel de empleados (§56). Solo la vista de
    // solo lectura (admin / ver_empleados_rrhh) conserva el de jefaturas.
    const puedeDescargarJefaturas = !['recursosHumanos', 'financiera'].includes(user?.role);
    const [showDescargarEmpleados, setShowDescargarEmpleados] = useState(false);
    // El gasto en salarios es de financiera/admin; recursosHumanos solo ve contratación.
    const puedeVerGasto = isFinanciera || isAdmin;
    const [empleados, setEmpleados] = useState([]);
    const [gastoTotal, setGastoTotal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedEmpleado, setSelectedEmpleado] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [perfilEmpleadoId, setPerfilEmpleadoId] = useState(null);
    const [retiroEmpleadoId, setRetiroEmpleadoId] = useState(null);
    const [traspasoEmpleadoId, setTraspasoEmpleadoId] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [empleadoAEliminar, setEmpleadoAEliminar] = useState(null);
    const [vista, setVista] = useState('tabla');
    const [filtroCampanias, setFiltroCampanias] = useState(new Set());
    const [filtroEstados, setFiltroEstados] = useState(new Set());
    const [filtroCargos, setFiltroCargos] = useState(new Set());
    const [filtroAnalistas, setFiltroAnalistas] = useState(new Set());
    // Documentación del empleado y contrato y anexos (migración 088)
    const [filtroDocumentos, setFiltroDocumentos] = useState(new Set());
    // Filtros de fecha (solo en la vista del admin): un desplegable por fecha exacta de registro,
    // de ingreso y de retiro. '' = todas; un valor 'YYYY-MM-DD' filtra a esa fecha.
    const [fIngreso, setFIngreso] = useState('');
    const [fRegistro, setFRegistro] = useState('');
    const [fRetiro, setFRetiro] = useState('');
    const [perfilTabInicial, setPerfilTabInicial] = useState('Información');
    // Rango de fechas de la vista de RRHH/financiera (§56.1). Si solo se filtran retirados/inactivos el rango
    // va sobre la fecha de retiro, si no sobre la de ingreso, hasta que el usuario elija el tipo a mano.
    const [rangoCampo, setRangoCampo] = useState('ingreso');
    const [rangoManual, setRangoManual] = useState(false);
    const [rangoDesde, setRangoDesde] = useState('');
    const [rangoHasta, setRangoHasta] = useState('');

    useEffect(() => {
        if (rangoManual) return;
        const soloRetiros = filtroEstados.size > 0 && [...filtroEstados].every(t => ESTADOS_TEXTO_RETIRO.includes(t));
        setRangoCampo(soloRetiros ? 'retiro' : 'ingreso');
    }, [filtroEstados, rangoManual]);

    useEffect(() => {
        fetchEmpleados();
        fetchGastoTotal();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- se carga una vez al montar
    }, []);

    // Búsqueda con debounce de 300ms
    useEffect(() => {
        const t = setTimeout(() => setSearchTerm(searchInput), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, filtroCampanias, filtroEstados, filtroCargos, filtroAnalistas, filtroDocumentos, fIngreso, fRegistro, fRetiro, rangoCampo, rangoDesde, rangoHasta, pageSize]);

    // Excel con la jefatura de cada empleado vigente y quién le sube el horario (backend §51).
    const [descargandoJefaturas, setDescargandoJefaturas] = useState(false);
    const descargarJefaturas = async () => {
        setDescargandoJefaturas(true);
        try {
            const response = await userCompanyService.exportarJefaturas();
            const disposicion = response.headers?.['content-disposition'] || '';
            const nombre = disposicion.match(/filename="?([^"]+)"?/)?.[1] || 'jefaturas.xlsx';
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error al descargar jefaturas:', err);
            setError('No se pudo descargar el Excel de jefaturas');
        } finally {
            setDescargandoJefaturas(false);
        }
    };

    // `silencioso`: recarga en segundo plano (socket / intervalo / botón) sin mostrar el
    // esqueleto de carga, para no parpadear la tabla que ya está en pantalla.
    const fetchEmpleados = async ({ silencioso = false } = {}) => {
        try {
            if (silencioso) setRefrescando(true); else setLoading(true);
            const response = await api.get('/users-company');
            setEmpleados(response.data.empleados);
            setError('');
        } catch (err) {
            console.error('Error al cargar empleados:', err);
            if (!silencioso) setError('Error al cargar los empleados');
        } finally {
            if (silencioso) setRefrescando(false); else setLoading(false);
        }
    };

    // Vista del admin (solo lectura): se mantiene al día sola. Recarga en vivo cuando RRHH
    // registra, edita, retira, elimina o carga empleados por Excel (evento de socket
    // 'empleados:actualizados'), y además cada 30 s como respaldo si el socket no está conectado.
    useEffect(() => {
        if (!soloLectura) return;
        const dejarDeEscuchar = escucharAsistencia('empleados:actualizados', () => fetchEmpleados({ silencioso: true }));
        const intervalo = setInterval(() => fetchEmpleados({ silencioso: true }), 30000);
        return () => { dejarDeEscuchar(); clearInterval(intervalo); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [soloLectura]);

    const fetchGastoTotal = async () => {
        if (!puedeVerGasto || soloLectura) return;
        try {
            const response = await api.get('/users-company/gasto-total');
            setGastoTotal(response.data.gasto);
        } catch (err) {
            console.error('Error al cargar gasto total:', err);
        }
    };

    const handleCreateEmpleado = () => {
        setSelectedEmpleado(null);
        setShowCreateForm(true);
    };

    const handleEditEmpleado = (empleado) => {
        setSelectedEmpleado(empleado);
        setShowEditForm(true);
    };

    // `creado`: el empleado recién creado. Se abre su ficha en Documentos para cargar los dos PDF.
    const handleFormSuccess = async (creado) => {
        await fetchEmpleados();
        await fetchGastoTotal();
        setShowCreateForm(false);
        setShowEditForm(false);
        if (creado?.id) abrirPerfil(creado.id, 'Documentos');
    };

    const abrirPerfil = (id, tabInicial = 'Información') => {
        setPerfilTabInicial(tabInicial);
        setPerfilEmpleadoId(id);
    };

    const handleConfirmarEliminar = async (id) => {
        try {
            await api.delete(`/users-company/${id}`);
            await fetchEmpleados();
            await fetchGastoTotal();
            setEmpleadoAEliminar(null);
        } catch (err) {
            console.error('Error al eliminar empleado:', err);
            setError('Error al eliminar el empleado');
        }
    };

    const opcionesCampania = useMemo(
        () => [...new Set(empleados.map(e => e.campania_nombre).filter(Boolean))].sort(),
        [empleados]
    );
    const opcionesEstado = useMemo(
        () => [...new Set(empleados.map(e => estadoBadge(e.estado_contrato_nombre).texto))].sort(),
        [empleados]
    );
    const opcionesCargo = useMemo(
        () => [...new Set(empleados.map(e => e.cargo_nombre).filter(Boolean))].sort(),
        [empleados]
    );
    const opcionesAnalista = useMemo(
        () => [...new Set(empleados.map(e => e.analista_encargado_nombre).filter(Boolean))].sort(),
        [empleados]
    );
    const opcionesFechaRegistro = useMemo(
        () => fechasUnicas(empleados.map(e => ({ fecha_registro: fechaRegistro(e) })), 'fecha_registro'),
        [empleados]
    );
    const opcionesFechaIngreso = useMemo(() => fechasUnicas(empleados, 'fecha_ingreso'), [empleados]);
    const opcionesFechaRetiro = useMemo(() => fechasUnicas(empleados, 'fecha_retiro'), [empleados]);

    const hayRango = !soloLectura && Boolean(rangoDesde || rangoHasta);
    const rangoInvalido = Boolean(rangoDesde && rangoHasta && rangoDesde > rangoHasta);
    // Día del empleado para el rango: ingreso y retiro son DATE; registro es cuándo se creó la ficha, en Bogotá.
    const fechaDelRango = (e) => {
        if (rangoCampo === 'retiro') return aYMD(e.fecha_retiro);
        if (rangoCampo === 'registro') return diaBogota(e.created_at);
        return aYMD(e.fecha_ingreso);
    };

    const filteredEmpleados = empleados.filter(e => {
        // En la vista del admin se oculta la ficha placeholder de German (dueño, cédula ficticia).
        if (soloLectura && e.numero_identificacion === '0123456789') return false;
        const coincideTexto = !searchTerm || [
            e.nombre_completo, e.numero_identificacion, e.email, e.telefono, e.campania_nombre, e.cargo_nombre
        ].some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase()));
        const coincideCampania = filtroCampanias.size === 0 || filtroCampanias.has(e.campania_nombre);
        const coincideEstado = filtroEstados.size === 0 || filtroEstados.has(estadoBadge(e.estado_contrato_nombre).texto);
        const coincideCargo = filtroCargos.size === 0 || filtroCargos.has(e.cargo_nombre);
        const coincideAnalista = filtroAnalistas.size === 0 || filtroAnalistas.has(e.analista_encargado_nombre);
        const coincideDocumentos = filtroDocumentos.size === 0 || filtroDocumentos.has(estadoDocumentos(e));
        const coincideIngreso = !soloLectura || !fIngreso || aYMD(e.fecha_ingreso) === fIngreso;
        const coincideRegistro = !soloLectura || !fRegistro || aYMD(fechaRegistro(e)) === fRegistro;
        const coincideRetiro = !soloLectura || !fRetiro || aYMD(e.fecha_retiro) === fRetiro;
        let coincideRango = true;
        if (hayRango) {
            const dia = fechaDelRango(e);
            coincideRango = Boolean(dia) && (!rangoDesde || dia >= rangoDesde) && (!rangoHasta || dia <= rangoHasta);
        }
        return coincideTexto && coincideCampania && coincideEstado && coincideCargo && coincideAnalista && coincideDocumentos && coincideIngreso && coincideRegistro && coincideRetiro && coincideRango;
    });

    // KPI de personal: activos = contrato vigente (activo, periodo de prueba o suspendido); los retirados
    // (retirado o inactivo) van en su propio indicador. Se cuentan sobre la lista FILTRADA (§56.2): con
    // Campaña = T&T muestran los activos y retirados de T&T, y así con cualquier filtro, rango de fechas o
    // búsqueda. Sin filtros es el total. En la vista del admin no cuenta la ficha placeholder.
    const esActivo = (e) => ['activo', 'periodo_prueba', 'suspendido'].includes(e.estado_contrato_nombre);
    const esRetirado = (e) => ['retirado', 'inactivo'].includes(e.estado_contrato_nombre);
    const empleadosReales = soloLectura ? empleados.filter(e => e.numero_identificacion !== '0123456789') : empleados;
    const totalRetirados = filteredEmpleados.filter(esRetirado).length;
    const totalEmpleadosActivos = filteredEmpleados.filter(esActivo).length;
    const totalRetiradosGeneral = empleadosReales.filter(esRetirado).length;
    const totalActivosGeneral = empleadosReales.filter(esActivo).length;

    const totalConActivos = filteredEmpleados.filter(e => e.total_activos > 0).length;
    const totalActivos = filteredEmpleados.reduce((sum, e) => sum + (e.total_activos || 0), 0);

    // En la vista del admin (solo lectura) se ordena por fecha de registro (ver fechaRegistro),
    // del más reciente al más antiguo, en vez del orden alfabético que trae el backend para RRHH.
    const empleadosOrdenados = soloLectura
        ? [...filteredEmpleados].sort((a, b) => new Date(instanteRegistro(b) || 0) - new Date(instanteRegistro(a) || 0))
        : filteredEmpleados;

    const totalPages = Math.max(1, Math.ceil(empleadosOrdenados.length / pageSize));
    const paginaSegura = Math.min(page, totalPages);
    const paginatedEmpleados = empleadosOrdenados.slice((paginaSegura - 1) * pageSize, paginaSegura * pageSize);

    const limpiarFiltros = () => {
        setSearchInput('');
        setFiltroCampanias(new Set());
        setFiltroEstados(new Set());
        setFiltroCargos(new Set());
        setFiltroAnalistas(new Set());
        setFiltroDocumentos(new Set());
        setFIngreso(''); setFRegistro(''); setFRetiro('');
        limpiarRango();
    };

    function limpiarRango() {
        setRangoDesde(''); setRangoHasta(''); setRangoManual(false);
    }

    // Lo que hay en pantalla, para abrir la descarga con los mismos filtros de estado y fechas.
    const filtrosParaDescarga = () => ({
        estados: [...new Set(empleados
            .filter(e => e.estado_contrato_nombre && filtroEstados.has(estadoBadge(e.estado_contrato_nombre).texto))
            .map(e => e.estado_contrato_nombre))],
        campoFecha: rangoCampo,
        campoManual: rangoManual,
        desde: rangoDesde,
        hasta: rangoHasta
    });

    // Los mosaicos de Activos y Retirados filtran por Estado: ponen los textos de esos contratos (o los quitan).
    const textosDe = (cumple) => [...new Set(empleados.filter(cumple).map(e => estadoBadge(e.estado_contrato_nombre).texto))];
    const textosActivos = textosDe(esActivo);
    const textosRetirados = textosDe(esRetirado);
    const filtroEs = (textos) => textos.length > 0 && filtroEstados.size === textos.length && textos.every(t => filtroEstados.has(t));
    const filtrarPor = (textos) => setFiltroEstados(filtroEs(textos) ? new Set() : new Set(textos));

    const hayFiltrosFecha = fIngreso || fRegistro || fRetiro;
    const hayFiltrosActivos = searchTerm || filtroCampanias.size > 0 || filtroEstados.size > 0 || filtroCargos.size > 0 || filtroAnalistas.size > 0 || filtroDocumentos.size > 0 || hayFiltrosFecha || hayRango;

    if (!isRecursosHumanos && !(soloLectura && canVerEmpleadosRrhh)) {
        return (
            <div className="ai-scope" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="ai-card" style={{ padding: 32, textAlign: 'center' }}>
                    <AlertCircle className="mx-auto" size={48} strokeWidth={1.75} style={{ color: 'var(--danger)', marginBottom: 12 }} />
                    <h2 style={{ font: '600 20px var(--font-display)', color: 'var(--ink)', margin: '0 0 6px' }}>Acceso denegado</h2>
                    <p className="ai-muted">Solo Recursos Humanos puede acceder a esta sección.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-scope">
            <div className="ai-content">
                <EncabezadoVista
                    icono={Contact}
                    titulo="Personal de la empresa"
                    subtitulo={soloLectura ? 'Consulta de empleados, su ficha y documentos (solo lectura)' : 'Registra y administra los empleados y sus activos asignados'}
                >
                    <div className="ai-seg" role="tablist" aria-label="Vista">
                        <span role="tab" tabIndex={0} aria-selected={vista === 'tabla'} className={vista === 'tabla' ? 'is-active' : ''} onClick={() => setVista('tabla')} style={{ cursor: 'pointer' }}>
                            <List size={14} strokeWidth={1.75} /> Tabla
                        </span>
                        <span role="tab" tabIndex={0} aria-selected={vista === 'tarjetas'} className={vista === 'tarjetas' ? 'is-active' : ''} onClick={() => setVista('tarjetas')} style={{ cursor: 'pointer' }}>
                            <LayoutGrid size={14} strokeWidth={1.75} /> Tarjetas
                        </span>
                    </div>
                    {!soloLectura && (
                        <button type="button" onClick={() => setShowDescargarEmpleados(true)} className="ai-monitor-btn" title="Excel con toda la información de los empleados, por estado y rango de fechas">
                            <Download size={15} strokeWidth={2} /> Descargar empleados
                        </button>
                    )}
                    {puedeDescargarJefaturas && (
                        <button type="button" onClick={descargarJefaturas} className="ai-monitor-btn" disabled={descargandoJefaturas} title="Excel con el jefe inmediato, jefe de área, director, gestor de asistencia y quién sube el horario de cada empleado vigente">
                            <Download size={15} strokeWidth={2} /> {descargandoJefaturas ? 'Descargando…' : 'Descargar jefaturas'}
                        </button>
                    )}
                    {soloLectura && (
                        <button type="button" onClick={() => fetchEmpleados({ silencioso: true })} className="ai-monitor-btn" disabled={refrescando} title="Actualizar la lista">
                            <RefreshCw size={15} strokeWidth={2} className={refrescando ? 'animate-spin' : undefined} /> {refrescando ? 'Actualizando…' : 'Actualizar'}
                        </button>
                    )}
                    {!soloLectura && (
                        <>
                            <button type="button" onClick={() => setShowImportModal(true)} className="ai-monitor-btn">
                                <Upload size={15} strokeWidth={2} /> Cargar Excel
                            </button>
                            <button type="button" onClick={handleCreateEmpleado} className="ai-monitor-btn ai-monitor-btn--primario">
                                <Plus size={15} strokeWidth={2} /> Nuevo empleado
                            </button>
                        </>
                    )}
                </EncabezadoVista>

                <Mosaicos>
                    <Mosaico
                        color={TONO.exito} icono={Users} valor={totalEmpleadosActivos} label="Empleados activos"
                        detalle={hayFiltrosActivos ? `Según los filtros · ${totalActivosGeneral} en total` : null}
                        activo={filtroEs(textosActivos)} onClick={() => filtrarPor(textosActivos)}
                    />
                    <Mosaico
                        color={TONO.peligro} icono={UserMinus} valor={totalRetirados} label="Retirados"
                        detalle={hayFiltrosActivos ? `Según los filtros · ${totalRetiradosGeneral} en total` : null}
                        activo={filtroEs(textosRetirados)} onClick={() => filtrarPor(textosRetirados)}
                    />
                    {!soloLectura && <Mosaico color={TONO.info} icono={UserCheck} valor={totalConActivos} label="Con activos asignados" />}
                    {!soloLectura && <Mosaico color={TONO.acento} icono={Package} valor={totalActivos} label="Total activos asignados" />}
                    {!soloLectura && puedeVerGasto && (
                        <Mosaico color={TONO.cian} icono={Wallet} valor={gastoTotal ? formatSalario(gastoTotal.gasto_mensual_total) : '—'} label="Gasto mensual en personal" />
                    )}
                </Mosaicos>

                {error && (
                    <div style={{ marginBottom: 12 }}><Pastilla color={TONO.peligro} punto>{error}</Pastilla></div>
                )}

                <BarraFiltros>
                    <CampoBusqueda value={searchInput} onChange={setSearchInput} placeholder="Buscar por nombre, identificación, correo, campaña o cargo…" />
                    <FiltroChip etiqueta="Campaña" opciones={opcionesCampania} seleccion={filtroCampanias} onChange={setFiltroCampanias} />
                    <FiltroChip etiqueta="Estado" opciones={opcionesEstado} seleccion={filtroEstados} onChange={setFiltroEstados} />
                    <FiltroChip etiqueta="Cargo" opciones={opcionesCargo} seleccion={filtroCargos} onChange={setFiltroCargos} />
                    <FiltroChip etiqueta="Analista" opciones={opcionesAnalista} seleccion={filtroAnalistas} onChange={setFiltroAnalistas} />
                    <FiltroChip etiqueta="Documentos" opciones={OPCIONES_DOCUMENTOS} seleccion={filtroDocumentos} onChange={setFiltroDocumentos} />
                    {hayFiltrosActivos && (
                        <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={limpiarFiltros}>Limpiar filtros</button>
                    )}
                </BarraFiltros>

                {!soloLectura && (
                    <BarraFiltros>
                        <label className="ai-row" style={{ gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)' }}>
                            Rango sobre
                            <select className="ai-input" style={{ width: 'auto', flex: 'none' }} value={rangoCampo} onChange={(e) => { setRangoCampo(e.target.value); setRangoManual(true); }}>
                                {CAMPOS_RANGO.map(({ valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
                            </select>
                        </label>
                        <label className="ai-row" style={{ gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)' }}>
                            Desde
                            <input type="date" className="ai-input" style={{ width: 'auto', flex: 'none' }} value={rangoDesde} max={rangoHasta || undefined} onChange={(e) => setRangoDesde(e.target.value)} />
                        </label>
                        <label className="ai-row" style={{ gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)' }}>
                            Hasta
                            <input type="date" className="ai-input" style={{ width: 'auto', flex: 'none' }} value={rangoHasta} min={rangoDesde || undefined} onChange={(e) => setRangoHasta(e.target.value)} />
                        </label>
                        {(hayRango || rangoManual) && (
                            <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={limpiarRango}>Limpiar fechas</button>
                        )}
                        {hayRango && !rangoInvalido && (
                            <span className="ai-muted" style={{ fontSize: 13 }}>
                                <strong className="ai-num">{filteredEmpleados.length}</strong> empleado{filteredEmpleados.length === 1 ? '' : 's'} con {ETIQUETA_CAMPO_RANGO[rangoCampo].toLowerCase()} en el rango
                            </span>
                        )}
                        {rangoInvalido && (
                            <span style={{ color: 'var(--danger)', fontSize: 13 }}>La fecha Desde no puede ser posterior a Hasta</span>
                        )}
                    </BarraFiltros>
                )}

                {soloLectura && (
                    <BarraFiltros>
                        {[['Fecha de registro', fRegistro, setFRegistro, opcionesFechaRegistro], ['Fecha de ingreso', fIngreso, setFIngreso, opcionesFechaIngreso], ['Fecha de retiro', fRetiro, setFRetiro, opcionesFechaRetiro]].map(([etiqueta, valor, cambiar, opciones]) => (
                            <label key={etiqueta} className="ai-row" style={{ gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)' }}>
                                {etiqueta}
                                <select className="ai-input" style={{ width: 'auto', flex: 'none' }} value={valor} onChange={(e) => cambiar(e.target.value)}>
                                    <option value="">Todas</option>
                                    {opciones.map(d => <option key={d} value={d}>{formatearFecha(d)}</option>)}
                                </select>
                            </label>
                        ))}
                        {hayFiltrosFecha && (
                            <button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" onClick={() => { setFIngreso(''); setFRegistro(''); setFRetiro(''); }}>Limpiar fechas</button>
                        )}
                    </BarraFiltros>
                )}

                <div>
                    {loading ? (
                        <CargandoVista />
                    ) : filteredEmpleados.length === 0 ? (
                        <VistaVacia icono={Users}>
                            No hay empleados que coincidan con los filtros
                            {hayFiltrosActivos && (
                                <><br /><button type="button" className="ai-btn ai-btn--ghost ai-btn--sm" style={{ marginTop: 12 }} onClick={limpiarFiltros}>Limpiar filtros</button></>
                            )}
                        </VistaVacia>
                    ) : vista === 'tarjetas' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 14 }}>
                            {paginatedEmpleados.map((empleado) => {
                                const est = estadoBadge(empleado.estado_contrato_nombre);
                                return (
                                    <div key={empleado.id} className="ai-card" style={{ padding: 16 }}>
                                        <div className="ai-person" style={{ marginBottom: 10 }}>
                                            <span className="ai-avatar">{iniciales(empleado.nombre_completo)}</span>
                                            <div style={{ minWidth: 0 }}>
                                                <div className="ai-person-name" style={{ whiteSpace: 'normal' }}>{nombrePropio(empleado.nombre_completo)}</div>
                                                <div className="ai-person-sub">{primeraMayuscula(empleado.cargo_nombre || '')}</div>
                                            </div>
                                        </div>
                                        <div className="ai-row" style={{ marginBottom: 12 }}>
                                            {empleado.campania_nombre && (
                                                <span className={`ai-chip ${claseCampania(empleado.campania_nombre) || ''}`}>{empleado.campania_nombre}</span>
                                            )}
                                            <Pastilla color={est.color} punto>{est.texto}</Pastilla>
                                        </div>
                                        <div className="ai-row" style={{ justifyContent: 'flex-end' }}>
                                            <button className="ai-icon-btn" aria-label="Ver perfil" onClick={() => abrirPerfil(empleado.id)}><Eye size={16} strokeWidth={1.75} /></button>
                                            {!soloLectura && (
                                                <>
                                                    <button className="ai-icon-btn" aria-label="Editar empleado" onClick={() => handleEditEmpleado(empleado)}><Edit3 size={16} strokeWidth={1.75} /></button>
                                                    <button className="ai-icon-btn ai-icon-btn--danger" aria-label="Eliminar empleado" onClick={() => setEmpleadoAEliminar(empleado)}><Trash2 size={16} strokeWidth={1.75} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="ai-monitor-tabla-wrap" style={{ marginBottom: 12 }}>
                        <table className="ai-monitor-tabla ai-monitor-tabla--simple">
                            <thead>
                                <tr>
                                    {soloLectura && <th>Fecha de registro</th>}
                                    <th>Empleado</th>
                                    <th>Identificación</th>
                                    <th>Campaña</th>
                                    <th>Cargo</th>
                                    <th>Estado</th>
                                    <th>{soloLectura ? 'Fecha de ingreso' : 'Teléfono'}</th>
                                    {soloLectura && <th>Fecha de retiro</th>}
                                    {hayRango && <th>{ETIQUETA_CAMPO_RANGO[rangoCampo]}</th>}
                                    <th className="ai-td-actions">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedEmpleados.map((empleado) => {
                                    const est = estadoBadge(empleado.estado_contrato_nombre);
                                    const chipCampania = claseCampania(empleado.campania_nombre);
                                    return (
                                        <tr key={empleado.id} className="is-clicable" onClick={() => abrirPerfil(empleado.id)} title="Ver ficha">
                                            {soloLectura && (
                                                <td className="ai-num" title={empleado.retiro_registrado_en && empleado.estado_contrato_nombre === 'retirado' ? 'Fecha en que RRHH lo pasó a retirado' : 'Fecha en que se creó la ficha'}>
                                                    {formatearFecha(fechaRegistro(empleado)) || '—'}
                                                </td>
                                            )}
                                            <td className="ai-monitor-nombre">
                                                <span>
                                                    <AvatarVista />
                                                    <span>
                                                        {nombrePropio(empleado.nombre_completo).toUpperCase()}
                                                        {empleado.email && <span className="ai-monitor-sub">{empleado.email}</span>}
                                                    </span>
                                                </span>
                                            </td>
                                            <td>
                                                <div className="ai-num">{empleado.numero_identificacion}</div>
                                                {empleado.tipo_identificacion_codigo && <div className="ai-monitor-sub">{empleado.tipo_identificacion_codigo}</div>}
                                            </td>
                                            <td>
                                                {empleado.campania_nombre ? (
                                                    <span className={`ai-chip ${chipCampania || ''}`} style={!chipCampania ? { background: 'var(--surface-200)', color: 'var(--ink-muted)' } : undefined}>
                                                        {empleado.campania_nombre}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td>{empleado.cargo_nombre ? primeraMayuscula(empleado.cargo_nombre) : '—'}</td>
                                            <td><Pastilla color={est.color} punto>{est.texto}</Pastilla></td>
                                            <td className="ai-num">{soloLectura ? (formatearFecha(empleado.fecha_ingreso) || '—') : (empleado.telefono ? formatearTelefono(empleado.telefono) : '—')}</td>
                                            {soloLectura && <td className="ai-num">{formatearFecha(empleado.fecha_retiro) || '—'}</td>}
                                            {hayRango && <td className="ai-num">{formatearFecha(fechaDelRango(empleado)) || '—'}</td>}
                                            <td className="ai-td-actions" onClick={(ev) => ev.stopPropagation()}>
                                                <div className="ai-row-actions">
                                                    <button className="ai-icon-btn" aria-label="Ver perfil" title="Ver perfil" onClick={() => abrirPerfil(empleado.id)}>
                                                        <Eye size={16} strokeWidth={1.75} />
                                                    </button>
                                                    {!soloLectura && (
                                                        <>
                                                            <button className="ai-icon-btn" aria-label="Editar empleado" title="Editar empleado" onClick={() => handleEditEmpleado(empleado)}>
                                                                <Edit3 size={16} strokeWidth={1.75} />
                                                            </button>
                                                            <button className="ai-icon-btn ai-icon-btn--danger" aria-label="Eliminar empleado" title="Eliminar empleado" onClick={() => setEmpleadoAEliminar(empleado)}>
                                                                <Trash2 size={16} strokeWidth={1.75} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    )}

                    {!loading && (
                        <Pagination
                            page={paginaSegura}
                            totalPages={totalPages}
                            totalItems={filteredEmpleados.length}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                            pageSizeOptions={PAGE_SIZES}
                            etiqueta="empleados"
                        />
                    )}
                </div>
            </div>

            {perfilEmpleadoId && (
                <EmpleadoDrawer
                    isOpen={!!perfilEmpleadoId}
                    onClose={() => setPerfilEmpleadoId(null)}
                    empleadoId={perfilEmpleadoId}
                    tabInicial={perfilTabInicial}
                    soloLectura={soloLectura}
                    onDocumentosCambio={fetchEmpleados}
                    onEditar={(empleado) => {
                        setPerfilEmpleadoId(null);
                        handleEditEmpleado(empleado);
                    }}
                    onRetiro={(id) => {
                        setPerfilEmpleadoId(null);
                        setRetiroEmpleadoId(id);
                    }}
                    onTraspaso={(id) => {
                        setPerfilEmpleadoId(null);
                        setTraspasoEmpleadoId(id);
                    }}
                />
            )}

            {traspasoEmpleadoId && (
                <TraspasoForm
                    isOpen={!!traspasoEmpleadoId}
                    onClose={() => setTraspasoEmpleadoId(null)}
                    traspaso={null}
                    empleadoInicialId={traspasoEmpleadoId}
                    onSuccess={() => setTraspasoEmpleadoId(null)}
                />
            )}

            {retiroEmpleadoId && (
                <RetiroModal
                    isOpen={!!retiroEmpleadoId}
                    onClose={() => setRetiroEmpleadoId(null)}
                    empleadoId={retiroEmpleadoId}
                    onSuccess={handleFormSuccess}
                />
            )}

            <ConfirmarEliminarModal
                isOpen={!!empleadoAEliminar}
                onClose={() => setEmpleadoAEliminar(null)}
                empleado={empleadoAEliminar}
                onConfirmar={handleConfirmarEliminar}
            />

            {showImportModal && (
                <ImportEmpleadosModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onImportado={handleFormSuccess}
                />
            )}

            {showDescargarEmpleados && !soloLectura && (
                <DescargarEmpleadosModal
                    isOpen={showDescargarEmpleados}
                    onClose={() => setShowDescargarEmpleados(false)}
                    inicial={filtrosParaDescarga()}
                />
            )}

            {showCreateForm && (
                <AgentForm
                    isOpen={showCreateForm}
                    onClose={() => setShowCreateForm(false)}
                    agente={null}
                    onSuccess={handleFormSuccess}
                />
            )}
            {showEditForm && selectedEmpleado && (
                <AgentForm
                    isOpen={showEditForm}
                    onClose={() => setShowEditForm(false)}
                    agente={selectedEmpleado}
                    onSuccess={handleFormSuccess}
                />
            )}
        </div>
    );
};

export default AgentManagement;
