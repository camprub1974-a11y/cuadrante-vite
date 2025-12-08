// Archivo: /src/store/dotacionesStore.js
// Store Zustand para el módulo de Dotaciones
// VERSIÓN FINAL - UTF-8 limpio, debounce, try/catch/finally

import { create } from 'zustand';
import { 
  getArmasByAgente, 
  getVestuarioByAgente,
  getEquipamientoByAgente,
  getAllDotaciones,
  createAsignacionArma,
  createAsignacionVestuario,
  createAsignacionEquipamiento,
  updateAsignacion,
  deleteAsignacion,
  createRevistaArmas,
  createPracticaTiro,
  getDotacionesStats,
  acceptAsignacion
} from '../../js/dataController';

// ============================================================
// CONSTANTES - Tipos de dotación según normativa andaluza
// ============================================================

export const TIPOS_ARMAS = {
  PISTOLA: { id: 'pistola', nombre: 'Pistola Reglamentaria', calibre: '9mm Parabellum', requiereRevista: true },
  DEFENSA_CORTA: { id: 'defensa_corta', nombre: 'Defensa Corta', longitud: '40cm', requiereRevista: false },
  DEFENSA_EXTENSIBLE: { id: 'defensa_extensible', nombre: 'Defensa Extensible', longitud: '50cm', requiereRevista: false },
  GRILLETES: { id: 'grilletes', nombre: 'Grilletes', material: 'Acero', requiereRevista: false },
  SPRAY: { id: 'spray', nombre: 'Spray Defensa', requiereRevista: false }
};

export const TIPOS_VESTUARIO = {
  GORRA: { id: 'gorra', nombre: 'Gorra', renovacion: 2 },
  POLO: { id: 'polo', nombre: 'Polo', renovacion: 2 },
  PANTALON: { id: 'pantalon', nombre: 'Pantalon', renovacion: 2 },
  BOTAS: { id: 'botas', nombre: 'Botas', renovacion: 2 },
  CAZADORA: { id: 'cazadora', nombre: 'Cazadora', renovacion: 4 },
  CHALECO_REF: { id: 'chaleco_ref', nombre: 'Chaleco Reflectante', renovacion: 2 }
};

export const TIPOS_EQUIPAMIENTO = {
  CHALECO_BAL: { id: 'chaleco_balistico', nombre: 'Chaleco Balistico', vidaUtil: 10 },
  EMISORA: { id: 'emisora', nombre: 'Emisora', vidaUtil: 5 },
  LINTERNA: { id: 'linterna', nombre: 'Linterna', vidaUtil: 3 },
  PLACA: { id: 'placa', nombre: 'Placa Emblema', vidaUtil: null }
};

// ============================================================
// STORE PRINCIPAL
// ============================================================

export const useDotacionesStore = create((set, get) => ({
  // --- ESTADO ---
  dotaciones: { armas: [], vestuario: [], equipamiento: [] },
  selectedAgente: null,
  loading: false,
  error: null,
  stats: { 
    totalArmas: 0, 
    totalVestuario: 0, 
    totalEquipamiento: 0, 
    pendientesRevista: 0 
  },
  filters: { tipo: 'all', estado: 'activa' },
  currentView: 'dashboard',
  modals: {
    asignarArma: false,
    asignarVestuario: false,
    asignarEquipamiento: false,
    revistaArmas: false,
    practicaTiro: false,
    detalleAsignacion: null
  },
  lastFetchTime: 0, // Para debounce

  // --- ACCIONES UI ---
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedAgente: (agente) => set({ selectedAgente: agente }),
  setFilter: (key, value) => set((state) => ({ 
    filters: { ...state.filters, [key]: value } 
  })),
  
  openModal: (name, data = null) => set((state) => ({ 
    modals: { ...state.modals, [name]: data || true } 
  })),
  closeModal: (name) => set((state) => ({ 
    modals: { ...state.modals, [name]: false } 
  })),

  // --- CARGA DE DATOS (Con debounce) ---
  loadDotacionesAgente: async (agenteId) => {
    if (!agenteId) {
      console.warn('[Store] loadDotacionesAgente llamado sin agenteId');
      return;
    }
    
    const now = Date.now();
    const { lastFetchTime, loading } = get();

    // PROTECCIÓN ANTI-BUCLE: Si está cargando o hace menos de 1s que cargamos, ignorar
    if (loading || (now - lastFetchTime < 1000)) {
      console.warn('[Store] Carga bloqueada (debounce/loading activo)');
      return;
    }
    
    set({ loading: true, error: null, lastFetchTime: now });
    
    try {
      console.log('[Store] Cargando dotaciones para agente:', agenteId);
      const [armas, vestuario, equipamiento] = await Promise.all([
        getArmasByAgente(agenteId),
        getVestuarioByAgente(agenteId),
        getEquipamientoByAgente(agenteId)
      ]);
      set({ 
        dotaciones: { armas, vestuario, equipamiento }
      });
      console.log('[Store] Dotaciones cargadas:', { 
        armas: armas.length, 
        vestuario: vestuario.length, 
        equipamiento: equipamiento.length 
      });
    } catch (error) {
      console.error('[Store] Error cargando dotaciones:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  loadAllDotaciones: async () => {
    const { loading } = get();
    if (loading) return;
    
    set({ loading: true, error: null });
    try {
      const data = await getAllDotaciones(get().filters);
      set({ dotaciones: data });
    } catch (error) {
      console.error('[Store] Error cargando todas las dotaciones:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await getDotacionesStats();
      if (stats) set({ stats });
    } catch (error) {
      console.error('[Store] Error cargando estadisticas:', error);
    }
  },

  // --- ACCIONES DE ASIGNACIÓN ---
  
  asignarArma: async (agenteId, armaData) => {
    console.log('[Store] ====== asignarArma INICIADO ======');
    console.log('[Store] agenteId:', agenteId);
    console.log('[Store] armaData:', armaData);
    
    set({ loading: true, error: null });
    try {
      const result = await createAsignacionArma(agenteId, armaData);
      console.log('[Store] Resultado de createAsignacionArma:', result);
      
      if (result && result.success) {
        // Forzar recarga ignorando debounce
        set({ lastFetchTime: 0 });
        await get().loadDotacionesAgente(agenteId);
        get().closeModal('asignarArma');
        console.log('[Store] ====== asignarArma EXITO ======');
        return { success: true };
      }
      throw new Error('Error desconocido al guardar.');
    } catch (error) {
      console.error('[Store] ====== asignarArma ERROR ======');
      console.error('[Store] Error:', error);
      set({ error: error.message });
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  asignarVestuario: async (agenteId, vestuarioData) => {
    console.log('[Store] ====== asignarVestuario INICIADO ======');
    set({ loading: true, error: null });
    try {
      const result = await createAsignacionVestuario(agenteId, vestuarioData);
      if (result && result.success) {
        set({ lastFetchTime: 0 });
        await get().loadDotacionesAgente(agenteId);
        get().closeModal('asignarVestuario');
        return { success: true };
      }
      throw new Error('Error al guardar vestuario.');
    } catch (error) {
      console.error('[Store] Error asignando vestuario:', error);
      set({ error: error.message });
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  asignarEquipamiento: async (agenteId, equipamientoData) => {
    console.log('[Store] ====== asignarEquipamiento INICIADO ======');
    set({ loading: true, error: null });
    try {
      const result = await createAsignacionEquipamiento(agenteId, equipamientoData);
      if (result && result.success) {
        set({ lastFetchTime: 0 });
        await get().loadDotacionesAgente(agenteId);
        get().closeModal('asignarEquipamiento');
        return { success: true };
      }
      throw new Error('Error al guardar equipamiento.');
    } catch (error) {
      console.error('[Store] Error asignando equipamiento:', error);
      set({ error: error.message });
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  // --- ACEPTAR DOTACIÓN (Actualización optimista) ---
  aceptarDotacion: async (id, tipoCategoria) => {
    console.log('[Store] ====== aceptarDotacion INICIADO ======');
    console.log('[Store] id:', id, 'tipo:', tipoCategoria);
    
    set({ loading: true, error: null });
    try {
      let collectionName = '';
      if (tipoCategoria === 'armas') collectionName = 'dotaciones_armas';
      else if (tipoCategoria === 'vestuario') collectionName = 'dotaciones_vestuario';
      else if (tipoCategoria === 'equipamiento') collectionName = 'dotaciones_equipamiento';
      else throw new Error('Tipo de dotacion no valido');

      // 1. Llamada al Backend
      await acceptAsignacion({ id, collectionName });
      
      // 2. Actualización optimista del estado local
      const state = get();
      const newDotaciones = { ...state.dotaciones };
      
      if (newDotaciones[tipoCategoria]) {
        newDotaciones[tipoCategoria] = newDotaciones[tipoCategoria].map(item => {
          if (item.id === id) {
            return { ...item, estado: 'activa', fechaAceptacion: new Date() };
          }
          return item;
        });
        set({ dotaciones: newDotaciones });
      }

      // 3. Recarga en segundo plano
      const { selectedAgente } = get();
      if (selectedAgente) {
        set({ lastFetchTime: 0 });
        get().loadDotacionesAgente(selectedAgente.id);
      }
      
      console.log('[Store] ====== aceptarDotacion EXITO ======');
      return { success: true };
    } catch (error) {
      console.error('[Store] Error aceptando dotacion:', error);
      return { success: false, message: error.message };
    } finally {
      set({ loading: false });
    }
  },

  // --- OTRAS ACCIONES ---
  registrarRevistaArmas: async (agenteId, data) => {
    set({ loading: true, error: null });
    try {
      await createRevistaArmas(agenteId, data);
      set({ lastFetchTime: 0 });
      await get().loadDotacionesAgente(agenteId);
      get().closeModal('revistaArmas');
      return { success: true };
    } catch (error) {
      console.error('[Store] Error registrando revista:', error);
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  registrarPracticaTiro: async (agenteId, data) => {
    set({ loading: true, error: null });
    try {
      await createPracticaTiro(agenteId, data);
      set({ lastFetchTime: 0 });
      await get().loadDotacionesAgente(agenteId);
      get().closeModal('practicaTiro');
      return { success: true };
    } catch (error) {
      console.error('[Store] Error registrando practica:', error);
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },
  
  eliminarAsignacion: async (tipo, id) => {
    set({ loading: true, error: null });
    try {
      await deleteAsignacion(tipo, id);
      const { selectedAgente } = get();
      if (selectedAgente) {
        set({ lastFetchTime: 0 });
        await get().loadDotacionesAgente(selectedAgente.id);
      }
      return { success: true };
    } catch (error) {
      console.error('[Store] Error eliminando asignacion:', error);
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  // --- UTILIDADES ---
  necesitaRevista: (fecha) => {
    if (!fecha) return true;
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return d.getFullYear() < new Date().getFullYear();
  },

  necesitaRenovacion: (fecha, anos) => {
    if (!fecha || !anos) return false;
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    d.setFullYear(d.getFullYear() + anos);
    return new Date() > d;
  },

  necesitaPracticaTiro: (fecha) => {
    if (!fecha) return true;
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    const seisMeses = new Date();
    seisMeses.setMonth(seisMeses.getMonth() - 6);
    return d < seisMeses;
  }
}));

export default useDotacionesStore;