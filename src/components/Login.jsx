import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff, Wrench, Shield, Zap } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState('');
    
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const particles = document.querySelector('.particles');
        if (particles) {
            for (let i = 0; i < 50; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 20 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
                particles.appendChild(particle);
            }
        }
    }, []);

    if (isAuthenticated) {
        if (user?.role === 'anonimo') return <Navigate to="/chat" replace />;
        if (user?.role === 'gestorActivos') return <Navigate to="/activos" replace />;
        if (user?.role === 'tecnicoInventario') return <Navigate to="/inventario-tecnico" replace />;
        if (user?.role === 'directivoFinanciero') return <Navigate to="/directivo" replace />;
        if (user?.role === 'disenador') return <Navigate to="/disenos" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(formData.username, formData.password);

        if (!result.success) {
            setError(result.message);
            setLoading(false);
            return;
        }

        const role = result.user?.role;
        if (role === 'anonimo') navigate('/chat', { replace: true });
        else if (role === 'gestorActivos') navigate('/activos', { replace: true });
        else if (role === 'tecnicoInventario') navigate('/inventario-tecnico', { replace: true });
        else if (role === 'directivoFinanciero') navigate('/directivo', { replace: true });
        else if (role === 'disenador') navigate('/disenos', { replace: true });
        else navigate('/dashboard', { replace: true });

        setLoading(false);
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
            <div className="particles absolute inset-0 opacity-20"></div>
            
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 animate-pulse"></div>
            
            <div className="relative z-10 max-w-md w-full space-y-8">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition-transform duration-300">
                    <div className="text-center mb-8">
                        <div className="relative mx-auto h-20 w-20 mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-spin-slow"></div>
                            <div className="relative h-full w-full bg-gradient-to-r from-blue-600 to-purple-700 rounded-full flex items-center justify-center">
                                <Wrench className="h-10 w-10 text-white animate-bounce" />
                            </div>
                        </div>
                        
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                            ASISTE ING
                        </h1>
                        <p className="text-white/80 text-sm font-medium">
                            Sistema de Gestión Técnica Profesional
                        </p>
                        
                        <div className="flex justify-center mt-4 space-x-6 text-white/60">
                            <div className="flex items-center space-x-1">
                                <Shield className="h-4 w-4" />
                                <span className="text-xs">Seguro</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Zap className="h-4 w-4" />
                                <span className="text-xs">Rápido</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Wrench className="h-4 w-4" />
                                <span className="text-xs">Eficiente</span>
                            </div>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm">
                                <div className="flex items-center">
                                    <AlertCircle className="h-5 w-5 text-red-400 mr-3 animate-pulse" />
                                    <span className="text-red-200 text-sm font-medium">{error}</span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="relative group">
                                <label className="block text-sm font-semibold text-white/90 mb-2">
                                    Usuario
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className={`h-5 w-5 transition-colors duration-200 ${
                                            focusedField === 'username' ? 'text-blue-400' : 'text-white/60'
                                        }`} />
                                    </div>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={handleChange}
                                        onFocus={() => setFocusedField('username')}
                                        onBlur={() => setFocusedField('')}
                                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200 hover:bg-white/15"
                                        placeholder="Ingrese su usuario"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="block text-sm font-semibold text-white/90 mb-2">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className={`h-5 w-5 transition-colors duration-200 ${
                                            focusedField === 'password' ? 'text-blue-400' : 'text-white/60'
                                        }`} />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField('')}
                                        className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200 hover:bg-white/15"
                                        placeholder="Ingrese su contraseña"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white transition-colors duration-200"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-3 px-4 text-white font-semibold shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                <div className="relative flex items-center justify-center">
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            Iniciando sesión...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
                                            Iniciar Sesión
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>

                    </form>
                </div>
            </div>

            <style>{`
                .particles {
                    pointer-events: none;
                }
                .particle {
                    position: absolute;
                    width: 2px;
                    height: 2px;
                    background: rgba(255, 255, 255, 0.5);
                    animation: float linear infinite;
                }
                @keyframes float {
                    0% {
                        transform: translateY(100vh) translateX(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-100px) translateX(50px);
                        opacity: 0;
                    }
                }
                @keyframes spin-slow {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Login;