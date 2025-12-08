import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useGlobalStore } from './store/globalStore';

// Imports de componentes UI
import BulletinNotification from './components/UI/BulletinNotification'; 
import DotacionesNotification from './components/UI/DotacionesNotification';
// 💡 IMPORTACIÓN DE INCIDENCIAS
import IncidenciasNotification from './components/UI/IncidenciasNotification'; 

// Imports de páginas
import LoginPage from './pages/LoginPage';
import RegistroPage from './pages/RegistroPage';
import CrearRegistroPage from './pages/CrearRegistroPage';
import FusionadorPage from './pages/FusionadorPage';
import CuadrantePage from './pages/CuadrantePage'; 
import ExtraServicesPage from './pages/ExtraServicesPage';
import CalculadoraIRPFPage from './pages/CalculadoraIRPFPage';
import PlanningPage from './pages/PlanningPage'; 
import ServiceReportsPage from './pages/ServiceReportsPage';
import ServiceReportDetailPage from './pages/ServiceReportDetailPage';
import TasksPage from './pages/TasksPage';
import SketcherPage from './pages/SketcherPage';
import CollectionsPage from './pages/CollectionsPage';
import VadosPage from './pages/VadosPage';
import TemplatesPage from './pages/TemplatesPage';
import BulletinBoardPage from './pages/BulletinBoardPage';
import DotacionesPage from './pages/DotacionesPage'; 
// 💡 IMPORTACIÓN DE PÁGINA DE INCIDENCIAS
import IncidenciasPage from './pages/IncidenciasPage'; 

// Iconos
import {
  Grid, Calendar, Archive, Briefcase, LogOut, Menu, X, FileText,
  CheckSquare, Edit3, Database, Home, Clipboard 
} from 'react-feather';

// Importar CSS global
import '../css/main.css';

function App() {
  const { user, loading, checkAuth, logout } = useAuthStore();
  const loadAgents = useGlobalStore((state) => state.loadAgents);

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation(); 
  
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  // Obtener iniciales del usuario para el avatar
  const getUserInitials = () => {
    if (!user?.email) return '??';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  // Verificar autenticacion al montar
  useEffect(() => {
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Error verificando autenticacion:', error);
      } finally {
        setAuthChecked(true);
      }
    };
    
    initAuth();
  }, [checkAuth]);

  // Cargar agentes cuando hay usuario
  useEffect(() => {
    if (user) {
      loadAgents();
    }
  }, [user, loadAgents]);

  // Cerrar nav al cambiar de ruta
  useEffect(() => {
    setIsNavOpen(false);
  }, [location]);

  // PANTALLA DE CARGA: Solo mientras se verifica la autenticacion inicial
  if (loading && !authChecked) { 
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Cargando sistema...</p>
      </div>
    );
  }

  // PROTECCION: Si NO hay usuario despues de verificar, mostramos Login
  if (!user) {
    return <LoginPage />;
  }

  // APP COMPLETA: Usuario autenticado
  return (
    <div className="app-layout">
        
      {/* Boton hamburguesa movil */}
      <button 
        className="menu-toggle icon-button"
        onClick={() => setIsNavOpen(!isNavOpen)}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {/* Overlay para movil */}
      <div 
        className={`nav-overlay ${isNavOpen ? 'visible' : ''}`} 
        onClick={() => setIsNavOpen(false)}
      />

      {/* Sidebar Principal */}
      <nav className={`main-nav ${isNavOpen ? 'open' : ''}`}>
        
        {/* Header con Escudo */}
        <div className="nav-header">
          <button 
            className="close-nav-btn icon-button" 
            onClick={() => setIsNavOpen(false)}
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </button>
          
          <div className="app-logo">
            <div className="police-badge">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/cuadrante-81ca7.firebasestorage.app/o/assets%2Fescudo_policia_local.png?alt=media&token=a15daa5a-56a1-46e3-821f-841e24c8254e" 
                alt="Escudo Policia Local"
              />
            </div>
            <div className="nav-title">
              <h3 className="nav-title-main">Policia Local</h3>
              <span className="nav-title-sub">Sistema de Gestion</span>
            </div>
            <div className="nav-header-line" />
          </div>
        </div>

        {/* Enlaces de Navegacion */}
        <div className="nav-links">
          
          {/* Seccion Principal */}
          <span className="nav-section-label">Principal</span>
          
          <Link 
            to="/cuadrante" 
            className={`nav-item ${location.pathname === '/cuadrante' || location.pathname === '/' ? 'active' : ''}`}
          >
            <Grid size={20} />
            <span>Cuadrante</span>
          </Link>

          {/* Componente Tablon con Notificacion */}
          <BulletinNotification />

          {isAdmin && (
            <Link 
              to="/planificacion" 
              className={`nav-item ${location.pathname === '/planificacion' ? 'active' : ''}`}
            >
              <Calendar size={20} />
              <span>Planificacion</span>
            </Link>
          )}

          {/* Seccion Gestion */}
          <span className="nav-section-label">Gestion</span>

          <Link 
            to="/partes" 
            className={`nav-item ${location.pathname.includes('/partes') ? 'active' : ''}`}
          >
            <FileText size={20} />
            <span>Partes de Servicio</span>
          </Link>

          <Link 
            to="/registros" 
            className={`nav-item ${location.pathname.includes('/registros') ? 'active' : ''}`}
          >
            <Archive size={20} />
            <span>Registros</span>
          </Link>

          <Link 
            to="/tareas" 
            className={`nav-item ${location.pathname.includes('/tareas') ? 'active' : ''}`}
          >
            <CheckSquare size={20} />
            <span>Tareas</span>
          </Link>
          
          {/* Componente Dotaciones con Notificacion */}
          <DotacionesNotification />

          {isAdmin && (
            <Link 
              to="/plantillas" 
              className={`nav-item ${location.pathname.includes('/plantillas') ? 'active' : ''}`}
            >
              <Clipboard size={20} />
              <span>Plantillas</span>
            </Link>
          )}
          
          {/* 💡 AÑADIR BOTÓN DE INCIDENCIAS AQUÍ */}
          <IncidenciasNotification /> 

          {/* Seccion Colecciones */}
          <span className="nav-section-label">Colecciones</span>

          <Link 
            to="/colecciones" 
            className={`nav-item ${location.pathname.includes('/colecciones') ? 'active' : ''}`}
          >
            <Database size={20} />
            <span>Identificaciones</span>
          </Link>

          <Link 
            to="/vados" 
            className={`nav-item ${location.pathname.includes('/vados') ? 'active' : ''}`}
          >
            <Home size={20} />
            <span>Vados</span>
          </Link>

          {/* Seccion Herramientas */}
          <span className="nav-section-label">Herramientas</span>

          <Link 
            to="/servicios-extra" 
            className={`nav-item ${location.pathname.includes('/servicios-extra') ? 'active' : ''}`}
          >
            <Briefcase size={20} />
            <span>Servicios Extra</span>
          </Link>

          <Link 
            to="/croquis" 
            className={`nav-item ${location.pathname.includes('/croquis') ? 'active' : ''}`}
          >
            <Edit3 size={20} />
            <span>Croquizador</span>
          </Link>
          
        </div>

        {/* Footer con Usuario */}
        <div className="nav-footer">
          <div className="user-info">
            <div className="user-avatar">
              {getUserInitials()}
            </div>
            <div className="user-details">
              <span className="user-email">{user?.email}</span>
              <span className="role-badge">
                {isAdmin ? 'Administrador' : 'Agente'}
              </span>
            </div>
          </div>
          
          <button onClick={logout} className="nav-item logout">
            <LogOut size={18}/> 
            <span>Cerrar Sesion</span>
          </button>
        </div>
        
      </nav>

      {/* Contenido Principal */}
      <main className="app-main-content">
        <Routes>
          {/* Rutas protegidas */}
          <Route path="/" element={<CuadrantePage />} />
          <Route path="/cuadrante" element={<CuadrantePage />} />
          <Route path="/planificacion" element={<PlanningPage />} />
          
          {/* Ruta del Tablon */}
          <Route path="/tablon" element={<BulletinBoardPage />} />

          {/* Rutas de Partes */}
          <Route path="/partes" element={<ServiceReportsPage />} />
          <Route path="/partes/:id" element={<ServiceReportDetailPage />} />

          {/* Rutas de Registro */}
          <Route path="/registros/*" element={<RegistroPage />} />
          <Route path="/registros/crear" element={<CrearRegistroPage />} />
          <Route path="/registros/fusionar/:id" element={<FusionadorPage />} />

          {/* Ruta de Colecciones */}
          <Route path="/colecciones" element={<CollectionsPage />} />
          <Route path="/vados" element={<VadosPage />} />

          {/* Rutas de Servicios Extra y Tareas */}
          <Route path="/servicios-extra" element={<ExtraServicesPage />} />
          <Route path="/calculadora-irpf" element={<CalculadoraIRPFPage />} />
          <Route path="/tareas" element={<TasksPage />} />
          
          {/* Ruta de Dotaciones */}
          <Route path="/dotaciones" element={<DotacionesPage />} />

          <Route path="/plantillas" element={<TemplatesPage />} />
          <Route path="/croquis" element={<SketcherPage />} />
          
          {/* 💡 AÑADIR RUTA DE INCIDENCIAS */}
          <Route path="/incidencias" element={<IncidenciasPage />} /> 
          
          <Route path="*" element={<h2 style={{ color: 'white', padding: '2rem' }}>Error 404: Pagina no encontrada</h2>} />
        </Routes>
      </main>

      {/* Contenedor de mensajes toast */}
      <div id="app-messages-container" style={{
        position: 'fixed', 
        top: '20px', 
        right: '20px', 
        zIndex: 9999, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px'
      }}></div>

    </div>
  );
}

export default App;