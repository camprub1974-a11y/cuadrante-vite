// Archivo: /src/store/sketchStore.js
// ✨ VERSIÓN MEJORADA: Ordenación, filtros optimizados, mejor manejo de estado y PAGINACIÓN COMPLETA

import { create } from 'zustand';
import { 
  getSketches, 
  saveSketchRecord, 
  updateSketch, 
  deleteSketch, 
  uploadCroquisImage 
} from '../../js/dataController';

export const useSketchStore = create((set, get) => ({
  sketches: [],
  lastVisible: null,
  loading: false,
  error: null,
  
  pagination: {
    hasMore: false,
    currentPage: 1,
    limit: 12,
    pageHistory: [null] // Historial de cursores para ir atrás [null, doc1, doc2...]
  },

  filters: {
    lugar: '',
    month: '', // Formato YYYY-MM
    fecha: '',
    implicados: '',
    tipo: 'all'
  },

  stats: { 
    total: 0, 
    thisMonth: 0, 
    types: {} 
  },

  // =========================================
  // SETTERS
  // =========================================
  setFilter: (key, value) => {
    set(state => ({ 
      filters: { ...state.filters, [key]: value },
      // Resetear paginación al cambiar filtros
      sketches: [],
      lastVisible: null,
      pagination: { ...state.pagination, currentPage: 1, hasMore: false, pageHistory: [null] }
    }));
    // Recargar con nuevos filtros
    get().loadSketches({ reset: true });
  },

  clearFilters: () => {
    set({ 
      filters: { lugar: '', month: '', fecha: '', implicados: '', tipo: 'all' },
      sketches: [], 
      lastVisible: null,
      pagination: { hasMore: false, currentPage: 1, limit: 12, pageHistory: [null] }
    });
    get().loadSketches({ reset: true });
  },

  resetStore: () => {
    set({
      sketches: [],
      lastVisible: null,
      loading: false,
      error: null,
      pagination: { hasMore: false, currentPage: 1, limit: 12, pageHistory: [null] },
      filters: { lugar: '', month: '', fecha: '', implicados: '', tipo: 'all' },
      stats: { total: 0, thisMonth: 0, types: {} }
    });
  },

  // =========================================
  // NAVEGACIÓN (PAGINACIÓN) 💡 CORRECCIÓN PRINCIPAL
  // =========================================
  
  nextPage: (limit) => {
    const { pagination, loadSketches, lastVisible } = get();
    if (!pagination.hasMore || !lastVisible) return;

    // El cursor para la siguiente página es el último visible actual
    loadSketches({ 
        reset: false, 
        cursor: lastVisible, 
        page: pagination.currentPage + 1 
    });
  },

  prevPage: (limit) => {
    const { pagination, loadSketches } = get();
    if (pagination.currentPage <= 1) return;

    const prevPageNum = pagination.currentPage - 1;
    // Recuperar el cursor de la página anterior desde el historial
    // El cursor para la página X está en el índice X-1 del historial
    const cursor = pagination.pageHistory[prevPageNum - 1]; 

    loadSketches({ 
        reset: false, // No es un reset total, pero cargamos una página específica
        cursor: cursor, 
        page: prevPageNum,
        isBackNavigation: true // Flag para saber que vamos atrás (opcional si manejamos bien el history)
    });
  },

  goToPage: (pageNumber, limit) => {
    // La paginación por cursores no permite saltos aleatorios fácilmente.
    // Si piden página 1, es un reset.
    if (pageNumber === 1) {
        get().loadSketches({ reset: true });
    } else {
        console.warn("Navegación directa a página X no soportada con cursores simples sin caché previa.");
    }
  },

  // =========================================
  // CARGA DE DATOS
  // =========================================
  // Modificado para aceptar un objeto de opciones
  loadSketches: async (params = {}) => {
    // Normalizar parámetros (puede venir como booleano 'reset' o como objeto)
    const reset = typeof params === 'boolean' ? params : params.reset;
    const cursor = params.cursor || (reset ? null : get().lastVisible);
    const targetPage = params.page || (reset ? 1 : get().pagination.currentPage);

    const { loading, filters, pagination } = get();
    
    // Evitar cargas duplicadas si ya está cargando
    if (loading) return;
    
    set({ loading: true, error: null });

    try {
      const options = {
        filters,
        limit: pagination.limit,
        startAfterDoc: cursor
      };

      const result = await getSketches(options);
      
      set(state => {
        // En paginación, reemplazamos la lista con la nueva página
        // (A diferencia de "Load More" infinito donde concatenamos)
        const newSketches = result.sketches; 
        
        // Calcular estadísticas (Esto idealmente debería hacerse en el backend o una sola vez)
        // Aquí lo hacemos sobre los datos cargados, lo cual es parcial si hay paginación.
        // Para stats globales, mejor una función aparte en dataController.
        
        // Mantenemos stats anteriores si no es reset, o calculamos sobre lo visible
        // Nota: Para una app real, stats deben venir del backend count()
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const stats = {
          total: state.stats.total + (reset ? 0 : 0), // Placeholder, ajustar si backend devuelve total
          thisMonth: newSketches.filter(s => {
            if (!s.fechaSuceso) return false;
            const d = new Date(s.fechaSuceso);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          }).length,
          types: newSketches.reduce((acc, curr) => {
            const type = curr.documentoRealizado || 'ninguno';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {})
        };

        // Actualizar historial de páginas
        let newHistory = [...state.pagination.pageHistory];
        if (reset) {
            newHistory = [null]; // Página 1 siempre empieza con null
        } else {
            // Si estamos avanzando y no tenemos el cursor guardado, lo guardamos
            // Guardamos el cursor QUE SE USÓ para cargar esta página
            if (targetPage > newHistory.length) {
               // El cursor para la página actual fue 'cursor' (pasado como argumento)
               // Pero para ir ATRÁS a esta página en el futuro, necesitamos el cursor ANTERIOR.
               // La lógica de historial se simplifica: newHistory[i] es el cursor para cargar la página i+1
               newHistory[targetPage - 1] = cursor;
            }
        }
        
        // Si hay resultados, el cursor para la SIGUIENTE página será result.lastVisible
        // Pero eso lo guardaremos cuando el usuario pulse "Siguiente".

        return {
          sketches: newSketches,
          lastVisible: result.lastVisible,
          pagination: {
            ...state.pagination,
            hasMore: newSketches.length >= pagination.limit && !!result.lastVisible,
            currentPage: targetPage,
            pageHistory: newHistory
          },
          // Solo actualizamos stats si es reset (carga inicial) para no confundir con parciales
          stats: reset ? stats : state.stats,
          loading: false,
          error: null
        };
      });

    } catch (err) {
      console.error("SketchStore Error:", err);
      set({ 
        error: err.message, 
        loading: false 
      });
    }
  },

  // =========================================
  // CRUD OPERATIONS
  // =========================================
  addSketch: async (data, file) => {
    set({ loading: true, error: null });
    
    try {
      let imageUrl = data.imageUrl;
      
      // Subir imagen si existe
      if (file) {
        imageUrl = await uploadCroquisImage(file);
      }
      
      // Guardar registro
      await saveSketchRecord({ ...data, imageUrl });
      
      // Recargar lista (reset)
      await get().loadSketches({ reset: true });
      
      return { success: true };
    } catch (err) {
      console.error("Error adding sketch:", err);
      set({ loading: false, error: err.message });
      return { success: false, message: err.message };
    }
  },

  editSketch: async (id, data, file) => {
    set({ loading: true, error: null });
    
    try {
      let imageUrl = data.imageUrl;
      
      // Subir nueva imagen si existe
      if (file) {
        imageUrl = await uploadCroquisImage(file);
      }
      
      // Actualizar registro
      await updateSketch(id, { ...data, imageUrl });
      
      // Actualizar en el estado local (Optimista)
      set(state => ({
        sketches: state.sketches.map(s => 
          s.id === id ? { ...s, ...data, imageUrl } : s
        ),
        loading: false
      }));
      
      return { success: true };
    } catch (err) {
      console.error("Error editing sketch:", err);
      set({ loading: false, error: err.message });
      return { success: false, message: err.message };
    }
  },

  removeSketch: async (id) => {
    set({ loading: true, error: null });
    
    try {
      await deleteSketch(id);
      
      // Eliminar del estado local
      set(state => ({
        sketches: state.sketches.filter(s => s.id !== id),
        loading: false 
      }));
      
      // Si la página quedó vacía y no es la 1, intentar ir atrás
      const { sketches, pagination, prevPage } = get();
      if (sketches.length === 0 && pagination.currentPage > 1) {
          prevPage();
      } else if (sketches.length === 0 && pagination.currentPage === 1) {
          // Si es la 1 y vacía, recargar para asegurar
          get().loadSketches({ reset: true });
      }

      return { success: true };
    } catch (err) {
      console.error("Error removing sketch:", err);
      set({ loading: false, error: err.message });
      return { success: false, message: err.message };
    }
  }
}));