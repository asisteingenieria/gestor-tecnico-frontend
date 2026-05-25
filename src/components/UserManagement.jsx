import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    Plus, 
    Search, 
    Users, 
    Edit, 
    Trash2, 
    Eye, 
    EyeOff, 
    Save,
    X,
    UserPlus,
    Shield,
    Settings,
    MapPin
} from 'lucide-react';

const UserManagement = () => {
    const { user } = useAuth();
    const isIronManTheme = user?.username === 'davidlopez10';
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [sedeFilter, setSedeFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form data para crear/editar usuario
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role: '',
        sede: 'bogota',
        departamento: 'claro'
    });
    const [showPassword, setShowPassword] = useState(false);

    const roles = [
        { value: 'coordinador', label: 'Coordinador', color: 'bg-blue-100 text-blue-800' },
        { value: 'technician', label: 'Técnico', color: 'bg-green-100 text-green-800' },
        { value: 'jefe_operaciones', label: 'Jefe de Operaciones', color: 'bg-purple-100 text-purple-800' },
        { value: 'administrativo', label: 'Administrativo', color: 'bg-orange-100 text-orange-800' },
        { value: 'gestorActivos', label: 'Gestor de Activos', color: 'bg-indigo-100 text-indigo-800' },
        { value: 'tecnicoInventario', label: 'Técnico Inventario', color: 'bg-teal-100 text-teal-800' },
        { value: 'disenador', label: 'Diseñador', color: 'bg-purple-100 text-purple-800' }
    ];

    const sedes = [
        { value: 'bogota', label: 'Bogotá' },
        { value: 'barranquilla', label: 'Barranquilla' },
        { value: 'villavicencio', label: 'Villavicencio' }
    ];

    const getDepartamentosBySede = (sede) => {
        const baseDepartamentos = [
            { value: 'obama', label: 'Obama' },
            { value: 'claro', label: 'Claro' }
        ];
        
        // Majority solo existe en Bogotá
        if (sede === 'bogota') {
            baseDepartamentos.splice(1, 0, { value: 'majority', label: 'Majority' }); // Insertar entre Obama y Claro
        }
        
        return baseDepartamentos;
    };

    const departamentos = getDepartamentosBySede(formData.sede);

    const handleSedeChange = (newSede) => {
        const newDepartamentos = getDepartamentosBySede(newSede);
        const currentDept = formData.departamento;
        
        // Si el departamento actual no existe en la nueva sede, resetear a Obama
        const deptExists = newDepartamentos.some(d => d.value === currentDept);
        
        setFormData({
            ...formData,
            sede: newSede,
            departamento: deptExists ? currentDept : 'obama'
        });
    };

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, roleFilter, sedeFilter]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await userService.getAll();
            setUsers(response.data);
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            setError('Error al cargar los usuarios');
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = () => {
        let filtered = users;

        // Filtro por búsqueda
        if (searchTerm) {
            filtered = filtered.filter(user => 
                user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtro por rol
        if (roleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        // Filtro por sede
        if (sedeFilter !== 'all') {
            filtered = filtered.filter(user => user.sede === sedeFilter);
        }

        setFilteredUsers(filtered);
    };

    const getRoleInfo = (role) => {
        const roleInfo = roles.find(r => r.value === role);
        if (roleInfo) return roleInfo;
        
        // Fallback para roles no definidos
        if (role === 'admin') return { label: 'Administrador', color: 'bg-red-100 text-red-800' };
        if (role === 'supervisor') return { label: 'Coordinador', color: 'bg-blue-100 text-blue-800' };
        if (role === 'jefe_operaciones') return { label: 'Jefe de Operaciones', color: 'bg-purple-100 text-purple-800' };
        return { label: role, color: 'bg-gray-100 text-gray-800' };
    };

    const handleCreateUser = () => {
        setFormData({
            username: '',
            password: '',
            full_name: '',
            role: '',
            sede: 'bogota',
            departamento: 'claro'
        });
        setShowCreateModal(true);
        setError('');
        setSuccess('');
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            password: '', // No mostrar la contraseña actual
            full_name: user.full_name,
            role: user.role,
            sede: user.sede || 'bogota',
            departamento: user.departamento || 'claro'
        });
        setShowEditModal(true);
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.full_name || !formData.role) {
            setError('Todos los campos son requeridos');
            return;
        }

        if (showCreateModal && !formData.password) {
            setError('La contraseña es requerida');
            return;
        }

        if (formData.password && formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            setLoading(true);
            
            // Preparar datos para envío
            const submitData = { ...formData };
            
            // Para técnicos y administrativos, no asignar departamento específico
            if (submitData.role === 'technician' || submitData.role === 'administrativo') {
                submitData.departamento = null;
            }
            
            // Para gestores de activos y técnicos de inventario, no asignar sede ni departamento
            if (submitData.role === 'gestorActivos' || submitData.role === 'tecnicoInventario' || submitData.role === 'disenador') {
                submitData.sede = null;
                submitData.departamento = null;
            }
            
            if (showCreateModal) {
                await userService.create(submitData);
                setSuccess('Usuario creado exitosamente');
            } else {
                const updateData = { ...submitData };
                if (!updateData.password) {
                    delete updateData.password; // No actualizar contraseña si está vacía
                }
                await userService.update(selectedUser.id, updateData);
                setSuccess('Usuario actualizado exitosamente');
            }

            setShowCreateModal(false);
            setShowEditModal(false);
            loadUsers();
            
        } catch (error) {
            console.error('Error guardando usuario:', error);
            setError(error.response?.data?.msg || 'Error al guardar el usuario');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        const confirmDelete = window.confirm(
            `¿Estás seguro de que quieres eliminar al usuario "${username}"?\n\n` +
            `Esta acción no se puede deshacer.`
        );
        
        if (!confirmDelete) return;

        try {
            setLoading(true);
            await userService.delete(userId);
            setSuccess('Usuario eliminado exitosamente');
            loadUsers();
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            setError(error.response?.data?.msg || 'Error al eliminar el usuario');
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setSelectedUser(null);
        setError('');
        setSuccess('');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex-1">
                    <h1 className={`text-xl sm:text-2xl font-bold ${isIronManTheme ? 'text-[#E5E7EB] ironman-glow' : 'text-gray-900'}`}>Gestión de Usuarios</h1>
                    <p className={`text-sm sm:text-base mt-1 ${isIronManTheme ? 'text-[#94A3B8]' : 'text-gray-600'}`}>
                        Administrar coordinadores y técnicos del sistema
                    </p>
                </div>
                <button
                    onClick={handleCreateUser}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crear Usuario
                </button>
            </div>

            {/* Alertas */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-700">{success}</p>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white shadow rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Búsqueda */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nombre o usuario..."
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Filtro por rol */}
                    <div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">Todos los roles</option>
                            <option value="coordinador">Coordinadores</option>
                            <option value="technician">Técnicos</option>
                            <option value="jefe_operaciones">Jefes de Operaciones</option>
                            <option value="gestorActivos">Gestores de Activos</option>
                            <option value="tecnicoInventario">Técnicos Inventario</option>
                            <option value="disenador">Diseñadores</option>
                        </select>
                    </div>

                    {/* Filtro por sede */}
                    <div>
                        <select
                            value={sedeFilter}
                            onChange={(e) => setSedeFilter(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">Todas las sedes</option>
                            {sedes.map(sede => (
                                <option key={sede.value} value={sede.value}>{sede.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de usuarios */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                        <Users className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                            Mostrando {filteredUsers.length} de {users.length} usuarios
                        </span>
                    </div>
                    
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {users.length === 0 ? 'No hay usuarios' : 'No se encontraron usuarios'}
                            </h3>
                            <p className="text-gray-500">
                                {users.length === 0 
                                    ? 'Crea el primer usuario del sistema'
                                    : 'Intenta ajustar los filtros de búsqueda'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-2">
                                                <div className="flex items-center">
                                                    <Shield className="h-4 w-4 mr-2 text-gray-400" />
                                                    <span className="font-medium text-gray-900">
                                                        {user.full_name}
                                                    </span>
                                                    <span className="ml-2 text-sm text-gray-500">
                                                        @{user.username}
                                                    </span>
                                                </div>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleInfo(user.role).color}`}>
                                                    {getRoleInfo(user.role).label}
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <MapPin className="h-4 w-4 mr-1" />
                                                    <span>
                                                        {(user.role === 'gestorActivos' || user.role === 'tecnicoInventario' || user.role === 'disenador')
                                                            ? (user.role === 'gestorActivos' ? 'Gestión de Activos - Sin sede específica' : user.role === 'disenador' ? 'Diseñador - Sin sede específica' : 'Técnico Inventario - Sin sede específica')
                                                            : `${sedes.find(s => s.value === user.sede)?.label || user.sede}${user.departamento ? ` - ${departamentos.find(d => d.value === user.departamento)?.label || user.departamento}` : ''}`
                                                        }
                                                    </span>
                                                </div>
                                                <span>
                                                    Creado: {new Date(user.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleEditUser(user)}
                                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Editar
                                            </button>
                                            {user.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                                    className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal para crear/editar usuario */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-10 mx-auto p-5 border max-w-md shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {showCreateModal ? 'Crear Usuario' : 'Editar Usuario'}
                                </h3>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Nombre completo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre Completo *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>

                                {/* Usuario */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre de Usuario *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ej: jperez"
                                    />
                                </div>

                                {/* Contraseña */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contraseña {showCreateModal ? '*' : '(dejar vacío para no cambiar)'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required={showCreateModal}
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Rol */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rol *
                                    </label>
                                    <select
                                        required
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Seleccionar rol...</option>
                                        {roles.map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sede - Solo mostrar si NO es gestorActivos */}
                                {formData.role !== 'gestorActivos' && formData.role !== 'tecnicoInventario' && formData.role !== 'disenador' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Sede *
                                        </label>
                                        <select
                                            required
                                            value={formData.sede}
                                            onChange={(e) => handleSedeChange(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {sedes.map(sede => (
                                                <option key={sede.value} value={sede.value}>
                                                    {sede.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Departamento - Solo mostrar para coordinadores y jefes de operaciones */}
                                {(formData.role === 'coordinador' || formData.role === 'jefe_operaciones') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Departamento *
                                        </label>
                                        <select
                                            required
                                            value={formData.departamento}
                                            onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {departamentos.map(dept => (
                                                <option key={dept.value} value={dept.value}>
                                                    {dept.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                
                                {/* Mensaje informativo para técnicos */}
                                {formData.role === 'technician' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                        <p className="text-sm text-blue-700">
                                            <strong>Nota:</strong> Los técnicos no tienen departamento asignado específico. 
                                            Pueden trabajar en cualquier departamento según las necesidades.
                                        </p>
                                    </div>
                                )}

                                {/* Mensaje informativo para gestores de activos */}
                                {formData.role === 'gestorActivos' && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
                                        <p className="text-sm text-indigo-700">
                                            <strong>Nota:</strong> Los gestores de activos tienen acceso exclusivo al módulo de gestión de activos. 
                                            No requieren sede ni departamento específico.
                                        </p>
                                    </div>
                                )}

                                {/* Mensaje informativo para diseñadores */}
                                {formData.role === 'disenador' && (
                                    <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                                        <p className="text-sm text-purple-700">
                                            Los diseñadores gestionan solicitudes de diseño. No requieren sede ni departamento específico.
                                        </p>
                                    </div>
                                )}

                                {/* Mensaje informativo para técnicos de inventario */}
                                {formData.role === 'tecnicoInventario' && (
                                    <div className="bg-teal-50 border border-teal-200 rounded-md p-3">
                                        <p className="text-sm text-teal-700">
                                            <strong>Nota:</strong> Los técnicos de inventario tienen acceso al módulo de inventario.
                                            No requieren sede ni departamento específico.
                                        </p>
                                    </div>
                                )}

                                {/* Mensaje informativo para administrativos */}
                                {formData.role === 'administrativo' && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                                        <p className="text-sm text-orange-700">
                                            <strong>Nota:</strong> Los administrativos manejan tareas generales de su sede y no tienen departamento específico asignado.
                                        </p>
                                    </div>
                                )}

                                {/* Mensaje informativo para jefes de operaciones */}
                                {formData.role === 'jefe_operaciones' && (
                                    <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                                        <p className="text-sm text-purple-700">
                                            <strong>Nota:</strong> Los jefes de operaciones supervisan incidencias de su departamento específico en su sede.
                                        </p>
                                    </div>
                                )}

                                {/* Botones */}
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        {loading ? 'Guardando...' : (showCreateModal ? 'Crear' : 'Actualizar')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;