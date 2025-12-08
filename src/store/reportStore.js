// Archivo: /src/store/reportStore.js

import { create } from 'zustand';
import { 
  getServiceReports, 
  getServiceReportDetails, 
  addReportEntry, 
  addRequerimiento, 
  updateReportSummary,
  submitServiceReport,
  validateServiceReport,
  getActiveServiceOrdersForAgent,
  updateChecklistItemStatus,
// ELIMINADA: updateRequerimientoStatus
// ELIMINADA: toggleRequerimientoStatus
  updateRequerimiento // 💡 Importante: Asegúrate de importar esto de dataController
} from '../../js/dataController';
import { useAuthStore } from './authStore';

export const useReportStore = create((set, get) => ({
  // --- ESTADO DE LISTADO ---
  reports: [],
  lastVisible: null,
  loadingList: false,
  filters: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    agentId: 'all',
    status: 'all'
  },

  // --- ESTADO DE DETALLE (PARTE ACTIVO) ---
  currentReport: null,
  loadingReport: false,
  
  // --- ESTADO DE AGENTE (DASHBOARD) ---
  activeAgentReport: null, // El parte activo del día para el agente

  // =========================================
  // ACCIONES DE LISTADO
  // =========================================
  setFilter: (key, value) => {
    set(state => ({ filters: { ...state.filters, [key]: value } }));
    get().loadReports();
  },

  // 💡 FUNCIÓN loadReports ACTUALIZADA
  loadReports: async () => {
    // 1. Obtener usuario actual del store de Auth (React)
    const user = useAuthStore.getState().user;
    
    // 2. Si no hay usuario, no intentamos cargar nada (evita el error)
    if (!user) return; 

    set({ loadingList: true });
    try {
      const { filters } = get();
      
      // 3. Pasamos el usuario explícitamente al controlador
      const result = await getServiceReports({ filters, user }); 
      
      set({ reports: result.reports || [], loadingList: false });
    } catch (error) {
      console.error("Store: Error cargando partes", error);
      set({ reports: [], loadingList: false });
    }
  },

  // =========================================
  // ACCIONES DE DETALLE (EL PARTE)
  // =========================================
  loadReportDetails: async (reportId) => {
    set({ loadingReport: true, currentReport: null });
    try {
      const result = await getServiceReportDetails({ reportId });
      if (result.success) {
        set({ currentReport: result.report, loadingReport: false });
      }
    } catch (error) {
      console.error("Store: Error cargando detalle", error);
      set({ loadingReport: false });
      throw error; // Re-lanzar para que la UI muestre error
    }
  },

  // Acciones atómicas dentro del parte (Actualización Optimista o Recarga)
  addEntry: async (description, priority = 'normal') => {
    const { currentReport } = get();
    if (!currentReport) return;
    
    await addReportEntry({ reportId: currentReport.id, description, priority });
    // Recargamos para ver la nueva entrada
    get().loadReportDetails(currentReport.id);
  },

  addReq: async (data) => {
    const { currentReport } = get();
    if (!currentReport) throw new Error("No hay un parte de servicio activo seleccionado.");
    
    // Llamada al controlador
    await addRequerimiento({ reportId: currentReport.id, data }); // Pasamos reportId y data encapsulados
    
    // Recargar para actualizar la lista
    get().loadReportDetails(currentReport.id);
  },
  
  // 💡 ACCIÓN MODIFICADA: Ahora acepta comentario
  toggleReqStatus: async (reqId, newStatus, comment = '') => {
      const { currentReport } = get();
      if (!currentReport) return;

      // Usamos updateRequerimiento para guardar estado Y comentario
      await updateRequerimiento(currentReport.id, reqId, { 
          isResolved: newStatus,
          resolutionComment: comment, // Guardamos el comentario
          resolvedAt: newStatus ? new Date() : null // Guardamos fecha si se resuelve
      });
      
      get().loadReportDetails(currentReport.id);
  },

  saveSummary: async (summaryData) => {
    const { currentReport } = get();
    if (!currentReport) return;

    await updateReportSummary({ reportId: currentReport.id, summaryData });
    get().loadReportDetails(currentReport.id);
  },

  updateChecklist: async (itemId, idx, newStatus, comment, coords) => {
      const { currentReport } = get();
      if (!currentReport) return;

      // Llamada al controller (updateChecklistItemStatus)
      await updateChecklistItemStatus({
          reportId: currentReport.id,
          orderId: currentReport.order_id, // Necesario para la orden
          itemIndex: idx,
          newStatus: newStatus,
          comment: comment,
          geolocation: coords
      });
      get().loadReportDetails(currentReport.id);
  },

  // =========================================
  // FLUJO DE ESTADOS (WORKFLOW)
  // =========================================
  submitForReview: async () => {
    const { currentReport } = get();
    if (!currentReport) return;
    await submitServiceReport({ reportId: currentReport.id });
    get().loadReportDetails(currentReport.id);
  },

  validateOrReturn: async (status, comments) => {
    const { currentReport } = get();
    if (!currentReport) return;
    
    await validateServiceReport({ 
        reportId: currentReport.id, 
        newStatus: status, // 'validated' | 'returned'
        comments 
    });
    get().loadReportDetails(currentReport.id);
  }
}));