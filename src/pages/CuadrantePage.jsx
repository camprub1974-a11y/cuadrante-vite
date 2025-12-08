// Archivo: /src/pages/CuadrantePage.jsx

import React, { useEffect, useState, useRef } from 'react';
import { useCalendarStore } from '../store/calendarStore';
import { useAuthStore } from '../store/authStore';
import WeeklyScheduleTable from '../components/Cuadrante/WeeklyScheduleTable';
import QuadrantStats from '../components/Cuadrante/QuadrantStats';
import QuadrantSidebar from '../components/Cuadrante/QuadrantSidebar';

// Store de Agentes y Componente Print
import { useGlobalStore } from '../store/globalStore'; 
import CuadrantePrintView from '../components/Cuadrante/CuadrantePrintView'; 

// Imports de Data Controller
import { 
  getMarkedDatesCurrentMonth, 
  getAllMarkedDates, 
  importScheduleFromJson,
  getSolicitudes,
  getShiftChangeRequests // 💡 IMPORTAR PARA CARGAR CAMBIOS
} from '../../js/dataController'; 

// Activity Feed Sidebar (El nuevo mejorado)
import ActivityFeedSidebar, { useActivityFeedSidebar } from '../components/Cuadrante/ActivityFeedSidebar';

// Imports de Modales
import ShiftModal from '../components/Modals/ShiftModal';
import RequestPermissionModal from '../components/Modals/RequestPermissionModal';
import ManagementModal from '../components/Modals/ManagementModal';
import AgentManagerModal from '../components/Modals/AgentManagerModal'; 
import MarkedDatesModal from '../components/Modals/MarkedDatesModal'; 
import ManageRequestsModal from '../components/Modals/ManageRequestsModal';
import AddShiftModal from '../components/Modals/AddShiftModal'; 
import ShiftChangeRequestModal from '../components/Modals/ShiftChangeRequestModal';

import { 
  Calendar as CalIcon, 
  Printer, RefreshCw, Settings, FileText, List, Bell, Clock
} from 'react-feather';

function CuadrantePage() { 
  // --- Hooks de Estado ---
  const { 
    currentDate, scheduleData, loading, loadSchedule,
    selectedAgentId, 
    updateShiftByDate,
    addShift,
    deleteShiftByDate 
  } = useCalendarStore();
  const { user } = useAuthStore();
  const { agents } = useGlobalStore(); 
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  // Estados de UI (Sidebars)
  const { sidebarOpen, openSidebar, closeSidebar } = useActivityFeedSidebar();
  
  // 💡 ESTADOS PARA NOTIFICACIONES
  const [novedadesMes, setNovedadesMes] = useState([]);      
  const [todasNovedades, setTodasNovedades] = useState([]);  
  const [cambios, setCambios] = useState([]); // 💡 ESTADO PARA CAMBIOS DE TURNO

  // Estado para el contador de solicitudes pendientes (Admin)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);

  // Estados de Modales
  const [selectedShift, setSelectedShift] = useState(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isAgentManagerOpen, setIsAgentManagerOpen] = useState(false);
  const [isMarkedDatesOpen, setIsMarkedDatesOpen] = useState(false); 
  const [isManageRequestsOpen, setIsManageRequestsOpen] = useState(false);
  const [addShiftDate, setAddShiftDate] = useState(null); 
  const [isPrinting, setIsPrinting] = useState(false);
  const [isShiftChangeOpen, setIsShiftChangeOpen] = useState(false); 

  // REF PARA EL INPUT DE ARCHIVO OCULTO
  const fileInputRef = useRef(null);

  // ✅ CARGA INICIAL DEL CALENDARIO
  useEffect(() => {
    loadSchedule();
  }, [currentDate, loadSchedule]);

  // 💡 CARGA DE NOVEDADES (Fechas Señaladas) - No depende del usuario
  useEffect(() => {
    const fetchNovedades = async () => {
      try {
        const mesActual = await getMarkedDatesCurrentMonth();
        setNovedadesMes(mesActual || []);
        
        const todas = await getAllMarkedDates();
        setTodasNovedades(todas || []);
      } catch (e) { 
        console.error('Error cargando novedades:', e); 
      }
    };
    fetchNovedades();
  }, []); // Solo al montar

  // 💡 FUNCIÓN PARA CARGAR CAMBIOS DE TURNO (reutilizable)
  const fetchCambios = async () => {
    // 🔒 Verificar que el usuario está completamente cargado
    if (!user || !user.agentId) {
      console.log('[CuadrantePage] Esperando usuario para cargar cambios de turno...');
      return;
    }

    try {
      const cambiosData = await getShiftChangeRequests({ limit: 20 });
      // 💡 Guardar datos ORIGINALES (no formateados) para el nuevo sidebar
      setCambios(cambiosData || []);
    } catch (e) {
      console.warn('No se pudieron cargar cambios de turno:', e.message);
      setCambios([]);
    }
  };

  // 💡 CARGA DE CAMBIOS DE TURNO - Requiere usuario autenticado
  useEffect(() => {
    fetchCambios();
  }, [user]); // Recargar cuando el usuario esté disponible

  // Cargar contador de solicitudes pendientes (Solo Admin)
  useEffect(() => {
    if (isAdmin) {
      const fetchSolicitudesCount = async () => {
        try {
          const pendientes = await getSolicitudes({ status: 'Pendiente' });
          setSolicitudesPendientes(pendientes.length);
        } catch (e) {
          console.error("Error contando solicitudes:", e);
        }
      };
      fetchSolicitudesCount();
    }
  }, [isAdmin]);

  // 💡 CALCULAR TOTAL DE NOTIFICACIONES PARA LA CAMPANA
  // Contar cambios que requieren acción (pendientes)
  const cambiosPendientes = cambios.filter(c => 
    ['Pendiente_Target', 'Pendiente_Admin'].includes(c.status)
  ).length;
  const totalNotifications = novedadesMes.length + cambiosPendientes;

  // --- HANDLERS ---

  // Función de Impresión
  const handlePrint = () => {
    if (!scheduleData || agents.length === 0) {
      if (window.displayMessage) {
        window.displayMessage("Error: No hay datos de cuadrante o agentes cargados para imprimir.", 'warning');
      }
      return;
    }
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };
  
  // Handler para añadir turno
  const handleAddShift = async (date, shiftData) => {
    const result = await addShift(date, shiftData);
    setAddShiftDate(null);
    if (result.success) {
      if (window.displayMessage) window.displayMessage("Turno añadido.", "success");
    } else {
      if (window.displayMessage) window.displayMessage(result.message, "error");
    }
  };
  
  // Handler para eliminar turno
  const handleDeleteShift = async (shiftData) => {
    if (!confirm(`¿Estás seguro de que quieres ELIMINAR el turno del agente ${shiftData.agentId}?`)) {
      return;
    }
    
    const result = await deleteShiftByDate(
      shiftData.dateStr, 
      shiftData.agentId, 
      shiftData.shiftType 
    );
    
    if (result.success) {
      setSelectedShift(null);
    } else {
      alert("Error al eliminar: " + result.message);
    }
  };
  
  // Handler para abrir modal de solicitud de cambio
  const handleRequestChange = (shift) => {
    setIsShiftChangeOpen(true);
  };

  // Handlers de Interfaz
  const handleRequestPermission = () => setIsPermissionModalOpen(true);
  
  const handleShiftClick = (shift, date) => { 
    setSelectedShift({ ...shift, dateStr: date }); 
  };
  
  const handleCloseShiftModal = () => {
    setSelectedShift(null);
    setIsShiftChangeOpen(false); 
  };

  // Función de guardado de turno
  const handleSaveShift = async (originalShiftData, newType) => {
    if (!originalShiftData || !originalShiftData.dateStr || !originalShiftData.agentId) {
      if (window.displayMessage) {
        window.displayMessage("Error: Datos del turno incompletos. No se puede guardar.", 'error');
      }
      return { success: false };
    }
    const result = await updateShiftByDate(
      originalShiftData.dateStr, 
      originalShiftData.agentId, 
      newType
    );
    if (result.success) {
      setSelectedShift(null); 
    } 
    return result;
  };

  // Función para procesar subida de JSON
  const handleJsonUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonContent = JSON.parse(e.target.result);
        console.log("JSON Cargado:", jsonContent);
        
        if (confirm(`Archivo "${file.name}" leído correctamente.\nContiene datos del cuadrante: ${jsonContent.id || 'Desconocido'}\n\n¿ESTÁS SEGURO de que quieres sobrescribir los datos actuales con este archivo?`)) {
          
          if (window.showLoading) window.showLoading('Importando cuadrante...');
          
          await importScheduleFromJson(jsonContent);
          
          if (window.displayMessage) window.displayMessage('Cuadrante importado con éxito.', 'success');
          
          loadSchedule(); 
        }
        
      } catch (error) {
        console.error("Error en importación:", error);
        alert(`Error en la importación: ${error.message}. Asegúrate de que el formato JSON es correcto.`);
      } finally {
        if (window.hideLoading) window.hideLoading();
      }
      event.target.value = ''; 
    };
    reader.readAsText(file);
  };

  // Handler de acciones de gestión
  const handleManagementAction = (actionId) => {
    setIsManagementOpen(false);
    console.log("Acción de gestión seleccionada:", actionId);
    
    if (actionId === 'manage_agents') {
      setIsAgentManagerOpen(true); 
    } else if (actionId === 'manage_dates') {
      setIsMarkedDatesOpen(true); 
    } else if (actionId === 'import_json') { 
      if (fileInputRef.current) fileInputRef.current.click();
    } else if (actionId === 'config') {
      alert("Configuración no disponible aún.");
    }
  };

  // Estilos para la leyenda de horarios
  const shiftLegendStyles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      padding: '0.75rem 1.5rem',
      background: 'rgba(30, 41, 59, 0.6)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      marginBottom: '1rem',
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '800',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
      border: '2px solid rgba(255, 255, 255, 0.15)',
    },
    badgeMorning: {
      background: 'linear-gradient(145deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
    },
    badgeAfternoon: {
      background: 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    },
    info: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.9)',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
    },
    time: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '14px',
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.7)',
    },
    clockIcon: {
      width: '14px',
      height: '14px',
      opacity: 0.7,
    },
    divider: {
      width: '1px',
      height: '40px',
      background: 'rgba(255, 255, 255, 0.1)',
    }
  };

  return (
    <div className="cuadrante-view" style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      
      {/* ZONA CENTRAL */}
      <div className="main-content" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        
       {/* TÍTULO ESTILO "SERVICIOS EXTRAORDINARIOS" */}
        <div className="view-header" style={{ marginBottom: '2rem' }}>
          <div className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            
            {/* Icono con fondo Glass */}
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
              <CalIcon size={28} className="text-accent" style={{ color: 'var(--color-accent-neon)' }} />
            </div>
            
            {/* Textos: Título y Subtítulo */}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: 'white' }}>
                Cuadrante de Servicio
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                Gestión mensual de turnos y personal
              </p>
            </div>
            
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body quadrant-controls">
            <div className="view-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              
              {isAdmin ? (
                <>
                  <button 
                    className="button btn-gradient-success ripple-effect" 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => setIsManagementOpen(true)}
                  >
                    <Settings size={18} />
                    <span>Gestión</span>
                  </button>
                  
                  {/* Botón SOLICITUDES con Contador */}
                  <button 
                    className="button btn-gradient-primary ripple-effect" 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}
                    onClick={() => setIsManageRequestsOpen(true)}
                  >
                    <List size={18}/> 
                    <span>Solicitudes</span>
                    
                    {/* El contador (badge) */}
                    {solicitudesPendientes > 0 && (
                      <span className="badge-dot" style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        minWidth: '20px',
                        height: '20px',
                        background: '#ef4444',
                        borderRadius: '10px',
                        boxShadow: '0 0 0 2px rgba(30, 41, 59, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: 'white',
                        padding: '0 5px',
                        zIndex: 10
                      }}>
                        {solicitudesPendientes}
                      </span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="button btn-gradient-primary ripple-effect"
                    onClick={handleRequestPermission}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FileText size={18}/>
                    <span>Permiso</span>
                  </button>
                </>
              )}
              
              {/* 💡 BOTÓN DE NOVEDADES CON CONTADOR TOTAL (Novedades + Cambios) */}
              <button 
                className="icon-button button-ghost"
                onClick={openSidebar}
                title="Ver Novedades y Cambios"
                style={{ position: 'relative' }}
              >
                <Bell size={20} />
                {totalNotifications > 0 && (
                  <span className="badge-dot" style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    minWidth: '18px',
                    height: '18px',
                    background: '#ef4444',
                    borderRadius: '9px',
                    boxShadow: '0 0 8px #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'white',
                    padding: '0 4px',
                  }}>
                    {totalNotifications}
                  </span>
                )}
              </button>
              
              {/* Botón de imprimir */}
              <button className="icon-button" title="Imprimir" onClick={handlePrint}>
                <Printer size={20}/>
              </button>
            </div>
          </div>
        </div>

        {/* Leyenda de turnos */}
        <div style={shiftLegendStyles.container}>
          <div style={shiftLegendStyles.item}>
            <div style={{ ...shiftLegendStyles.badge, ...shiftLegendStyles.badgeMorning }}> M </div>
            <div style={shiftLegendStyles.info}>
              <span style={shiftLegendStyles.label}>Turno Mañana</span>
              <span style={shiftLegendStyles.time}> <Clock style={shiftLegendStyles.clockIcon} /> 08:00 - 15:00 h </span>
            </div>
          </div>
          <div style={shiftLegendStyles.divider}></div>
          <div style={shiftLegendStyles.item}>
            <div style={{ ...shiftLegendStyles.badge, ...shiftLegendStyles.badgeAfternoon }}> T </div>
            <div style={shiftLegendStyles.info}>
              <span style={shiftLegendStyles.label}>Turno Tarde</span>
              <span style={shiftLegendStyles.time}> <Clock style={shiftLegendStyles.clockIcon} /> 14:00 - 21:00 h </span>
            </div>
          </div>
        </div>

        {/* TABLA SEMANAL */}
        {loading && !scheduleData ? (
          <div className="loading-spinner-container" style={{ padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            <WeeklyScheduleTable 
              scheduleData={scheduleData}
              novedades={todasNovedades}
              onShiftClick={handleShiftClick}
              onAddShiftClick={(date) => setAddShiftDate(date)}
            />
            
            <div style={{ marginTop: '2rem' }}>
              <QuadrantStats />
            </div>
          </>
        )}
      </div>

      {/* SIDEBARS */}
      <QuadrantSidebar />
      
      {/* 💡 ACTIVITY FEED SIDEBAR MEJORADO */}
      <ActivityFeedSidebar 
        isVisible={sidebarOpen}
        onClose={closeSidebar}
        novedades={novedadesMes}
        cambios={cambios}
        onCambiosUpdate={fetchCambios} // 💡 Callback para recargar después de acción
      />

      {/* MODALES */}
      <ShiftModal 
        isOpen={!!selectedShift && !isShiftChangeOpen}
        onClose={handleCloseShiftModal}
        shiftData={selectedShift}
        onSave={handleSaveShift} 
        onDelete={handleDeleteShift} 
        onRequestChange={handleRequestChange}
      />
    
      {/* Modal Añadir Turno */}
      <AddShiftModal 
        isOpen={!!addShiftDate}
        onClose={() => setAddShiftDate(null)}
        date={addShiftDate}
        onSave={handleAddShift}
      />
    
      {/* Modal de Propuesta de Cambio */}
      <ShiftChangeRequestModal 
        isOpen={isShiftChangeOpen}
        onClose={() => {
          setIsShiftChangeOpen(false);
          setSelectedShift(null);
        }}
        selectedShift={selectedShift}
      />

      <RequestPermissionModal 
        isOpen={isPermissionModalOpen} 
        onClose={() => setIsPermissionModalOpen(false)}
      />

      <ManagementModal 
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
        onAction={handleManagementAction}
      />

      <AgentManagerModal 
        isOpen={isAgentManagerOpen}
        onClose={() => setIsAgentManagerOpen(false)}
      />
      
      <MarkedDatesModal 
        isOpen={isMarkedDatesOpen}
        onClose={() => setIsMarkedDatesOpen(false)}
      />
      
      <ManageRequestsModal 
        isOpen={isManageRequestsOpen}
        onClose={() => setIsManageRequestsOpen(false)}
      />
      
      {/* INPUT DE ARCHIVO OCULTO */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{display: 'none'}} 
        accept=".json" 
        onChange={handleJsonUpload} 
      />

      {/* PORTAL DE IMPRESIÓN */}
      {isPrinting && scheduleData && (
        <CuadrantePrintView 
          currentDate={currentDate}
          scheduleData={scheduleData}
          agents={agents}
        />
      )}
    </div>
  );
}

export default CuadrantePage;