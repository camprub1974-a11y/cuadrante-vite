// Archivo: /src/store/extraServicesStore.js

import { create } from 'zustand';
import { 
  getAllExtraServices, 
  addExtraService, 
  updateExtraService, 
  deleteExtraService,
  generarInformeManualPDF
} from '../../js/dataController';
// 💡 1. IMPORTAR STORE DE AUTH PARA VERIFICAR ROL
import { useAuthStore } from './authStore';

export const useExtraServicesStore = create((set, get) => ({
  allServices: [],      
  paginatedServices: [], 
  loading: false,
  error: null,
  
  // Paginación
  currentPage: 1,
  itemsPerPage: 10,
  totalPages: 1,

  // Estadísticas
  stats: {
    totalServicios: 0,
    totalHoras: 0,
    totalImporte: 0,
    byType: {} 
  },
  
  filters: {
    agentId: 'all',
    startDate: '',
    endDate: '',
    type: 'all'
  },

  setFilter: (key, value) => {
    set(state => ({ filters: { ...state.filters, [key]: value } }));
    get().loadServices(); 
  },

  setPage: (page) => {
    const { allServices, itemsPerPage } = get();
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    
    set({ 
        currentPage: page,
        paginatedServices: allServices.slice(start, end)
    });
  },

  loadServices: async () => {
    const { filters, itemsPerPage } = get();
    set({ loading: true, error: null });
    
    try {
      // getAllExtraServices ya maneja la lógica de seguridad en dataController
      // forzando el ID si no es admin.
      const result = await getAllExtraServices({ ...filters, limit: null });
      const services = result.services || [];

      // Calcular Estadísticas
      const newStats = services.reduce((acc, curr) => {
          acc.totalServicios++;
          acc.totalHoras += (curr.hours || 0);
          
          const importe = (curr.hours || 0) * (curr.price || 0);
          acc.totalImporte += importe;

          const type = curr.type || 'otro';
          if (!acc.byType[type]) acc.byType[type] = { count: 0, amount: 0, hours: 0 };
          acc.byType[type].count++;
          acc.byType[type].amount += importe;
          acc.byType[type].hours += (curr.hours || 0);

          return acc;
      }, { totalServicios: 0, totalHoras: 0, totalImporte: 0, byType: {} });

      // Calcular Paginación
      const totalPages = Math.ceil(services.length / itemsPerPage) || 1;
      const paginated = services.slice(0, itemsPerPage);

      set({ 
          allServices: services,
          paginatedServices: paginated,
          stats: newStats,
          totalPages: totalPages,
          currentPage: 1, 
          loading: false 
      });

    } catch (err) {
      console.error("Error cargando servicios extra:", err);
      set({ error: err.message, loading: false });
    }
  },

  // --- CRUD ---
  addService: async (serviceData) => {
    set({ loading: true });
    try {
      await addExtraService(serviceData);
      await get().loadServices();
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.message };
    }
  },

  updateService: async (id, data) => {
    set({ loading: true });
    try {
      await updateExtraService(id, data);
      await get().loadServices();
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.message };
    }
  },

  deleteService: async (id) => {
    set({ loading: true });
    try {
      await deleteExtraService(id);
      await get().loadServices();
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.message };
    }
  },

  // 💡 GENERACIÓN DE INFORME (CORREGIDA)
  generateReport: async () => {
    const { filters } = get();
    // Obtenemos el usuario directamente del AuthStore
    const user = useAuthStore.getState().user;
    const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

    if (!filters.startDate || !filters.endDate) {
        return { success: false, message: "Selecciona un rango de fechas." };
    }
    
    try {
        // 💡 LÓGICA DE SEGURIDAD
        let targetAgentIds = [];
        let requestAllAgents = false;

        if (isAdmin) {
            // Admin: Respeta lo que diga el filtro
            if (filters.agentId === 'all') {
                requestAllAgents = true;
            } else {
                targetAgentIds = [filters.agentId];
            }
        } else {
            // Agente: FORZAMOS su ID, ignorando el filtro
            requestAllAgents = false;
            targetAgentIds = [user.agentId];
        }

        // Llamada al backend con parámetros seguros
        const result = await generarInformeManualPDF({
            startDate: filters.startDate,
            endDate: filters.endDate,
            agentIds: targetAgentIds,
            allAgents: requestAllAgents
        });
        return { success: true, pdfBase64: result.pdfBase64 };

    } catch (err) {
        return { success: false, message: err.message };
    }
  }
}));