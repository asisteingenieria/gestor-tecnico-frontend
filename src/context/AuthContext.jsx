import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Configurar axios por defecto
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['x-auth-token'] = token;
        } else {
            delete axios.defaults.headers.common['x-auth-token'];
        }
    }, [token]);

    // Verificar token al cargar la aplicación
    useEffect(() => {
        const verifyToken = async () => {
            if (token) {
                try {
                    const response = await axios.get(`${API_BASE_URL}/auth/me`);
                    setUser(response.data);
                } catch (error) {
                    console.error('Token inválido:', error);
                    logout();
                }
            }
            setLoading(false);
        };

        verifyToken();
    }, [token]);

    const login = async (username, password) => {
        try {
            console.log('Iniciando login para:', username);
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                username,
                password
            });

            const { token: newToken, user: userData } = response.data;

            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(userData);
            setLoading(false);

            return { success: true, user: userData };
        } catch (error) {
            setLoading(false);
            return { 
                success: false, 
                message: error.response?.data?.msg || 'Error al iniciar sesión' 
            };
        }
    };



    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['x-auth-token'];
    };

    const changePassword = async (currentPassword, newPassword) => {
        try {
            await axios.put(`${API_BASE_URL}/auth/change-password`, {
                currentPassword,
                newPassword
            });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.msg || 'Error al cambiar contraseña'
            };
        }
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        changePassword,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isCoordinador: user?.role === 'coordinador',
        isJefeOperaciones: user?.role === 'jefe_operaciones',
        isAdministrativo: user?.role === 'administrativo',
        isSupervisor: user?.role === 'supervisor' || user?.role === 'coordinador', // Mantener compatibilidad
        isTechnician: user?.role === 'technician',
        isAnonimo: user?.role === 'anonimo',
        isGestorActivos: user?.role === 'gestorActivos',
        isTecnicoInventario: user?.role === 'tecnicoInventario',
        isDirectivoFinanciero: user?.role === 'directivoFinanciero',
        isDisenador: user?.role === 'disenador',
        canSupervise: user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'coordinador' || user?.role === 'administrativo' || user?.role === 'jefe_operaciones',
        canCreateIncidents: user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'coordinador' || user?.role === 'jefe_operaciones',
        // Permisos para activos
        canAccessAssets: user?.role === 'tecnicoInventario' || user?.role === 'gestorActivos' || user?.role === 'admin',
        canViewAssetHistory: user?.role === 'gestorActivos' || user?.role === 'admin'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};