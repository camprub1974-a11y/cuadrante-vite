// Archivo: /src/store/vadoStore.js
// ✨ Store para gestión de Vados - Con filtros, paginación y estadísticas

import { create } from 'zustand';
import { 
  getVados, 
  getVadoById,
  deleteVado,
  importVadosFromExcel,
  createInspeccion,
  getInspeccionesVado,
  updateVado
} from '../../js/dataController';

export const useVadoStore = create((set, get) => ({
  // =========================================
  // ESTADO
  // =========================================
  vados: [],
  selectedVado: null,
  lastVisible: null,
  loading: false,
  importing: false,
  error: null,
  
  pagination: {
    hasMore: false,
    currentPage: 1,
    limit: 50
  },

  filters: {
    search: '',           // Búsqueda general (DNI, nombre, calle)
    calle: '',            // Filtro por calle específica
    año: '',              // Año del expediente
    situacion: 'all',     // Alta, Baja, all
    sinInspeccionar: false // Solo vados sin inspección reciente
  },

  stats: { 
    total: 0, 
    activos: 0,
    thisYear: 0,
    sinInspeccionar: 0,
    porCalle: {}
  },

  // Vista actual: 'lista' o 'mapa'
  viewMode: 'lista',

  // =========================================
  // SETTERS
  // =========================================
  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedVado: (vado) => set({ selectedVado: vado }),

  setFilter: (key, value) => {
    set(state => ({ 
      filters: { ...state.filters, [key]: value },
      vados: [],
      lastVisible: null,
      pagination: { ...state.pagination, currentPage: 1, hasMore: false }
    }));
    get().loadVados(true);
  },

  clearFilters: () => {
    set({ 
      filters: { search: '', calle: '', año: '', situacion: 'all', sinInspeccionar: false },
      vados: [], 
      lastVisible: null,
      pagination: { hasMore: false, currentPage: 1, limit: 50 }
    });
    get().loadVados(true);
  },

  resetStore: () => {
    set({
      vados: [],
      selectedVado: null,
      lastVisible: null,
      loading: false,
      importing: false,
      error: null,
      pagination: { hasMore: false, currentPage: 1, limit: 50 },
      filters: { search: '', calle: '', año: '', situacion: 'all', sinInspeccionar: false },
      stats: { total: 0, activos: 0, thisYear: 0, sinInspeccionar: 0, porCalle: {} },
      viewMode: 'lista'
    });
  },

  // =========================================
  // CARGA DE DATOS
  // =========================================
  loadVados: async (reset = false) => {
    const { loading, filters, pagination, lastVisible: currentCursor } = get();
    
    if (loading) return;
    
    set({ loading: true, error: null });

    try {
      const options = {
        filters,
        limit: pagination.limit,
        startAfterDoc: reset ? null : currentCursor
      };

      const result = await getVados(options);
      
      set(state => {
        const rawList = reset ? result.vados : [...state.vados, ...result.vados];
        
        // Deduplicación por ID
        const uniqueMap = new Map();
        rawList.forEach(item => uniqueMap.set(item.id, item));
        const uniqueVados = Array.from(uniqueMap.values());

        // Ordenar por calle y número
        uniqueVados.sort((a, b) => {
          const calleA = a.ubicacion?.calle || '';
          const calleB = b.ubicacion?.calle || '';
          if (calleA !== calleB) return calleA.localeCompare(calleB);
          const numA = parseInt(a.ubicacion?.numero) || 0;
          const numB = parseInt(b.ubicacion?.numero) || 0;
          return numA - numB;
        });

        // Calcular estadísticas
        const now = new Date();
        const currentYear = now.getFullYear();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const stats = {
          total: uniqueVados.length,
          activos: uniqueVados.filter(v => v.expediente?.situacion === 'Alta').length,
          thisYear: uniqueVados.filter(v => {
            const year = v.expediente?.referencia?.split('/')[0];
            return year === String(currentYear);
          }).length,
          sinInspeccionar: uniqueVados.filter(v => {
            if (!v.ultimaInspeccion) return true;
            const lastInsp = v.ultimaInspeccion.toDate ? v.ultimaInspeccion.toDate() : new Date(v.ultimaInspeccion);
            return lastInsp < sixMonthsAgo;
          }).length,
          porCalle: uniqueVados.reduce((acc, curr) => {
            const calle = curr.ubicacion?.calle || 'Sin especificar';
            acc[calle] = (acc[calle] || 0) + 1;
            return acc;
          }, {})
        };

        return {
          vados: uniqueVados,
          lastVisible: result.lastVisible,
          pagination: {
            ...state.pagination,
            hasMore: result.vados.length >= pagination.limit && !!result.lastVisible,
            currentPage: reset ? 1 : state.pagination.currentPage + 1
          },
          stats,
          loading: false,
          error: null
        };
      });

    } catch (err) {
      console.error("VadoStore Error:", err);
      set({ error: err.message, loading: false });
    }
  },

  // =========================================
  // OPERACIONES CRUD
  // =========================================
  
  // Obtener detalle de un vado con sus inspecciones
  fetchVadoDetail: async (vadoId) => {
    set({ loading: true, error: null });
    
    try {
      const vado = await getVadoById(vadoId);
      const inspecciones = await getInspeccionesVado(vadoId);
      
      set({ 
        selectedVado: { ...vado, inspecciones },
        loading: false 
      });
      
      return { success: true, vado: { ...vado, inspecciones } };
    } catch (err) {
      console.error("Error fetching vado detail:", err);
      set({ loading: false, error: err.message });
      return { success: false, message: err.message };
    }
  },

  // Eliminar vado (solo admin)
  removeVado: async (vadoId) => {
    set({ loading: true, error: null });
    
    try {
      await deleteVado(vadoId);
      
      set(state => {
        const newVados = state.vados.filter(v => v.id !== vadoId);
        
        // Recalcular stats
        const now = new Date();
        const currentYear = now.getFullYear();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const stats = {
          total: newVados.length,
          activos: newVados.filter(v => v.expediente?.situacion === 'Alta').length,
          thisYear: newVados.filter(v => {
            const year = v.expediente?.referencia?.split('/')[0];
            return year === String(currentYear);
          }).length,
          sinInspeccionar: newVados.filter(v => {
            if (!v.ultimaInspeccion) return true;
            const lastInsp = v.ultimaInspeccion.toDate ? v.ultimaInspeccion.toDate() : new Date(v.ultimaInspeccion);
            return lastInsp < sixMonthsAgo;
          }).length,
          porCalle: newVados.reduce((acc, curr) => {
            const calle = curr.ubicacion?.calle || 'Sin especificar';
            acc[calle] = (acc[calle] || 0) + 1;
            return acc;
          }, {})
        };
        
        return { 
          vados: newVados,
          selectedVado: null,
          stats,
          loading: false 
        };
      });
      
      return { success: true };
    } catch (err) {
      console.error("Error removing vado:", err);
      set({ loading: false, error: err.message });
      return { success: false, message: err.message };
    }
  },

  // =========================================
  // IMPORTACIÓN DESDE EXCEL
  // =========================================
  importFromExcel: async (file, mode = 'merge') => {
    // mode: 'merge' = añadir/actualizar, 'replace' = reemplazar todo
    set({ importing: true, error: null });
    
    try {
      const result = await importVadosFromExcel(file, mode);
      
      // Recargar datos
      await get().loadVados(true);
      
      set({ importing: false });
      
      return { 
        success: true, 
        imported: result.imported,
        updated: result.updated,
        errors: result.errors 
      };
    } catch (err) {
      console.error("Error importing vados:", err);
      set({ importing: false, error: err.message });
      return { success: false, message: err.message };
    }
  },

  // =========================================
  // INSPECCIONES
  // =========================================
  addInspeccion: async (vadoId, inspeccionData) => {
    set({ loading: true, error: null });
    
    try {
      await createInspeccion(vadoId, inspeccionData);
      
      // Actualizar el vado en el estado local
      set(state => ({
        vados: state.vados.map(v => 
          v.id === vadoId 
            ? { ...v, ultimaInspeccion: new Date() }
            : v
        ),
        loading: false
      }));
      
      // Si tenemos el vado seleccionado, recargar su detalle
      if (get().selectedVado?.id === vadoId) {
        await get().fetchVadoDetail(vadoId);
      }
      
      return { success: true };
    } catch (err) {
      console.error("Error creating inspeccion:", err);
      set({ loading: false, error: err.message });
      return { success: false, message: err.message };
    }
  },

  // =========================================
  // UTILIDADES
  // =========================================
  
  // Obtener lista única de calles para filtros
  getCallesUnicas: () => {
    const { vados } = get();
    const calles = [...new Set(vados.map(v => v.ubicacion?.calle).filter(Boolean))];
    return calles.sort();
  },

  // Obtener vados filtrados para el mapa (con coordenadas)
  getVadosParaMapa: () => {
    const { vados } = get();
    return vados.filter(v => v.ubicacion?.coordenadas?.lat && v.ubicacion?.coordenadas?.lng);
  },

  // Buscar vado por DNI
  findByDNI: (dni) => {
    const { vados } = get();
    return vados.filter(v => 
      v.titular?.documento?.toLowerCase().includes(dni.toLowerCase())
    );
  },

  // Buscar vado por calle
  findByCalle: (calle) => {
    const { vados } = get();
    return vados.filter(v => 
      v.ubicacion?.calle?.toLowerCase().includes(calle.toLowerCase())
    );
  }
}));
