import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './components/Login';
import Layout from './components/Layout';
import AnonymousLayout from './components/AnonymousLayout';
import AnonymousChat from './components/AnonymousChat';
import Dashboard from './components/Dashboard';
import CreateIncident from './components/incidents/CreateIncident';
import IncidentsSupervision from './components/incidents/IncidentsSupervision';
import PendingIncidents from './components/incidents/PendingIncidents';
import MyIncidents from './components/incidents/MyIncidents';
import ApprovedIncidents from './components/incidents/ApprovedIncidents';
import ReturnedIncidents from './components/incidents/ReturnedIncidents';
import MyIncidentsSupervision from './components/incidents/MyIncidentsSupervision';
import MyReports from './components/incidents/MyReports';
import UserManagement from './components/UserManagement';
import WorkstationManagement from './components/WorkstationManagement';
import Analytics from './components/Analytics';
import Tecnicos from './components/Tecnicos';
import AssetManagement from './components/AssetManagement';
import AssetLayout from './components/AssetLayout';
import AssetInventory from './components/AssetInventory';
import AssetCharts from './components/AssetCharts';
import ScriptParser from './components/ScriptParser';
import TecnicoInventarioLayout from './components/TecnicoInventarioLayout';
import TecnicoInventarioEdicion from './components/TecnicoInventarioEdicion';
import AssetComponentHistory from './components/AssetComponentHistory';
import DirectivoFinancieroLayout from './components/DirectivoFinancieroLayout';
import DirectivoDashboard from './components/DirectivoDashboard';

// Componente para determinar el layout según el rol
const LayoutWrapper = ({ children }) => {
  const { user } = useAuth();

  if (user?.role === 'anonimo') {
    return <AnonymousLayout>{children}</AnonymousLayout>;
  }

  if (user?.role === 'gestorActivos') {
    return <AssetLayout>{children}</AssetLayout>;
  }

  if (user?.role === 'tecnicoInventario') {
    return <TecnicoInventarioLayout>{children}</TecnicoInventarioLayout>;
  }

  if (user?.role === 'directivoFinanciero') {
    return <DirectivoFinancieroLayout>{children}</DirectivoFinancieroLayout>;
  }

  return <Layout>{children}</Layout>;
};

// Componente específico para usuarios anónimos
const AnonymousRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return user?.role === 'anonimo' ? children : <Navigate to="/dashboard" replace />;
};

// Componente para redirigir según el rol
const RedirectByRole = () => {
  const { user, loading } = useAuth();
  
  console.log('RedirectByRole - user:', user, 'loading:', loading);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (user?.role === 'anonimo') {
    return <Navigate to="/chat" replace />;
  }
  
  if (user?.role === 'gestorActivos') {
    return <Navigate to="/activos" replace />;
  }

  if (user?.role === 'tecnicoInventario') {
    return <Navigate to="/inventario-tecnico" replace />;
  }

  if (user?.role === 'directivoFinanciero') {
    return <Navigate to="/directivo" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

// Componente que bloquea dashboard para anónimos
const DashboardRoute = () => {
  const { user, loading } = useAuth();
  
  console.log('DashboardRoute - user:', user, 'loading:', loading);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (user?.role === 'anonimo') {
    return <Navigate to="/chat" replace />;
  }
  
  if (user?.role === 'gestorActivos') {
    return <Navigate to="/activos" replace />;
  }

  if (user?.role === 'tecnicoInventario') {
    return <Navigate to="/inventario-tecnico" replace />;
  }

  if (user?.role === 'directivoFinanciero') {
    return <Navigate to="/directivo" replace />;
  }

  return <Dashboard />;
};

// Componente que bloquea rutas para usuarios anónimos
const NonAnonymousRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (user?.role === 'anonimo') {
    return <Navigate to="/chat" replace />;
  }
  
  return children;
};

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Componente para rutas que requieren rol de admin
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
        <p className="text-gray-600">Solo los administradores pueden acceder a esta sección.</p>
      </div>
    );
  }
  
  return children;
};

// Componente para rutas que requieren rol de gestorActivos
const GestorActivosRoute = ({ children }) => {
  const { isGestorActivos, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isGestorActivos) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
        <p className="text-gray-600">Solo los gestores de activos pueden acceder a esta sección.</p>
      </div>
    );
  }

  return children;
};

// Componente para rutas que requieren rol de tecnicoInventario
const TecnicoInventarioRoute = ({ children }) => {
  const { isTecnicoInventario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isTecnicoInventario) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
        <p className="text-gray-600">Solo los técnicos de inventario pueden acceder a esta sección.</p>
      </div>
    );
  }

  return children;
};

// Componente para rutas que requieren rol de directivoFinanciero
const DirectivoFinancieroRoute = ({ children }) => {
  const { isDirectivoFinanciero, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isDirectivoFinanciero) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
        <p className="text-gray-600">Solo los directivos financieros pueden acceder a esta sección.</p>
      </div>
    );
  }

  return children;
};

// Componente placeholder para rutas que aún no están implementadas
const ComingSoon = ({ title }) => (
  <div className="text-center py-12">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
    <p className="text-gray-600">Esta sección está en desarrollo...</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Ruta pública para crear activos desde script */}
            <Route path="/activos/script-parser" element={<ScriptParser />} />
            
            {/* Ruta específica para usuarios anónimos */}
            <Route path="/chat" element={
              <ProtectedRoute>
                <AnonymousRoute>
                  <AnonymousLayout>
                    <AnonymousChat />
                  </AnonymousLayout>
                </AnonymousRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/" element={
              <ProtectedRoute>
                <LayoutWrapper />
              </ProtectedRoute>
            }>
              <Route index element={<RedirectByRole />} />
              <Route path="dashboard" element={<DashboardRoute />} />
              
              {/* Rutas de incidencias */}
              <Route path="incidents/create" element={<NonAnonymousRoute><CreateIncident /></NonAnonymousRoute>} />
              <Route path="incidents/pending" element={<NonAnonymousRoute><PendingIncidents /></NonAnonymousRoute>} />
              <Route path="incidents/my-incidents" element={<NonAnonymousRoute><MyIncidents /></NonAnonymousRoute>} />
              <Route path="incidents/supervision" element={<NonAnonymousRoute><IncidentsSupervision /></NonAnonymousRoute>} />
              <Route path="incidents/my-supervision" element={<NonAnonymousRoute><MyIncidentsSupervision /></NonAnonymousRoute>} />
              <Route path="incidents/my-reports" element={<NonAnonymousRoute><MyReports /></NonAnonymousRoute>} />
              <Route path="incidents/approved" element={<NonAnonymousRoute><ApprovedIncidents /></NonAnonymousRoute>} />
              <Route path="incidents/returned" element={<NonAnonymousRoute><ReturnedIncidents /></NonAnonymousRoute>} />
              
              {/* Rutas de gestión */}
              <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="workstations" element={<AdminRoute><WorkstationManagement /></AdminRoute>} />
              <Route path="analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
              <Route path="tecnicos" element={<AdminRoute><Tecnicos /></AdminRoute>} />
              <Route path="asset-history" element={<AdminRoute><AssetComponentHistory /></AdminRoute>} />

              {/* Rutas de gestión de activos */}
              <Route path="activos" element={<GestorActivosRoute><AssetManagement /></GestorActivosRoute>} />
              <Route path="activos/inventario" element={<GestorActivosRoute><AssetInventory /></GestorActivosRoute>} />
              <Route path="activos/charts" element={<GestorActivosRoute><AssetCharts /></GestorActivosRoute>} />

              {/* Rutas de técnico de inventario */}
              <Route path="inventario-tecnico" element={<TecnicoInventarioRoute><TecnicoInventarioEdicion /></TecnicoInventarioRoute>} />

              {/* Rutas de directivo financiero */}
              <Route path="directivo" element={<DirectivoFinancieroRoute><DirectivoDashboard /></DirectivoFinancieroRoute>} />
              <Route path="directivo/inventario" element={<DirectivoFinancieroRoute><DirectivoDashboard /></DirectivoFinancieroRoute>} />
            </Route>

            {/* Ruta catch-all */}
            <Route path="*" element={<RedirectByRole />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
