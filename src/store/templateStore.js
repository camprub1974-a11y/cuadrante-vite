// src/store/templateStore.js

import { create } from 'zustand';

import {
  getDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  duplicateDocumentTemplate,
  countAllDocumentTemplates,
  countDocumentTemplatesByType,
  getDocumentTemplateById
} from '../../js/dataController';

export const useTemplateStore = create((set, get) => ({

  // Estado de Datos
  templates: [],
  loading: false,
  error: null,

  // Estado de Filtros y Paginación
  filterType: 'all',
  currentPage: 1,
  itemsPerPage: 10,
  hasNextPage: false,

  // pageCursors[0] = null (página 1), pageCursors[1] = cursor para pág 2, etc.
  pageCursors: [null],
  totalItems: 0,

  // Estado de UI
  isModalOpen: false,
  editingTemplate: null,   // Si es null, es modo creación
  previewTemplate: null,   // Para el panel de vista previa

  // --- ACCIONES DE UI ---

  setFilterType: (type) => {
    // Al cambiar filtro, reseteamos paginación y cursores
    set({ filterType: type, currentPage: 1, pageCursors: [null] });
    get().fetchTemplates(1);
  },

  setPreviewTemplate: (template) => set({ previewTemplate: template }),

  openModal: (template = null) =>
    set({ isModalOpen: true, editingTemplate: template }),

  closeModal: () =>
    set({ isModalOpen: false, editingTemplate: null }),

  // --- FETCH PRINCIPAL (adaptado a cursores como RegistroPage) ---
  fetchTemplates: async (page = 1) => {
    const { filterType, itemsPerPage, pageCursors } = get();
    set({ loading: true, error: null });

    try {
      // Cursor para la página X está en índice X-1
      const startAfter = pageCursors[page - 1] || null;

      // 1. Obtener datos paginados
      const result = await getDocumentTemplates({
        type: filterType === 'all' ? null : filterType,
        limit: itemsPerPage,
        startAfter
      });

      // 2. Obtener/actualizar total solo cuando haga falta
      let total = get().totalItems;
      if (page === 1 || total === 0) {
        if (filterType === 'all') {
          total = await countAllDocumentTemplates();
        } else {
          total = await countDocumentTemplatesByType(filterType);
        }
      }

      // 3. Gestionar cursores para la siguiente página
      const newCursors = [...pageCursors];

      if (result.nextCursor) {
        // Guardamos el cursor para la página siguiente (índice = page)
        if (!newCursors[page]) {
          newCursors[page] = result.nextCursor;
        }
      }

      set({
        templates: result.templates || [],
        hasNextPage: !!result.nextCursor,
        pageCursors: newCursors,
        currentPage: page,
        totalItems: total,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Navegación directa a página
  goToPage: (page) => {
    const { pageCursors, loading } = get();

    // Solo permitimos ir a una página si tenemos su cursor (o es la 1)
    if (!loading && page > 0 && page <= pageCursors.length) {
      get().fetchTemplates(page);
    }
  },

  nextPage: () => {
    const { currentPage, hasNextPage, loading } = get();
    if (!loading && hasNextPage) {
      get().fetchTemplates(currentPage + 1);
    }
  },

  prevPage: () => {
    const { currentPage, loading } = get();
    if (!loading && currentPage > 1) {
      get().fetchTemplates(currentPage - 1);
    }
  },

  // --- CRUD ---

  saveTemplate: async (templateData) => {
    set({ loading: true });

    try {
      if (templateData.id) {
        // Update
        const { id, ...data } = templateData;
        await updateDocumentTemplate(id, data);
      } else {
        // Create
        await createDocumentTemplate(templateData);
      }

      // Volvemos a página 1 y reseteamos cursores para refrescar correctamente
      set({ currentPage: 1, pageCursors: [null] });
      await get().fetchTemplates(1);

      set({ isModalOpen: false, editingTemplate: null });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      set({ loading: false });
    }
  },

  deleteTemplate: async (id) => {
    set({ loading: true });

    try {
      await deleteDocumentTemplate(id);

      // Si borramos el último item de una página, podemos retroceder una página
      const { templates, currentPage, pageCursors } = get();
      let targetPage = currentPage;

      if (templates.length === 1 && currentPage > 1) {
        targetPage = currentPage - 1;
      }

      // Limpiamos cursores posteriores porque la paginación cambia
      const newCursors = pageCursors.slice(0, targetPage);
      set({ pageCursors: newCursors });

      await get().fetchTemplates(targetPage);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      set({ loading: false });
    }
  },

  duplicateTemplate: async (id) => {
    set({ loading: true });

    try {
      await duplicateDocumentTemplate(id);

      // Volvemos a la página 1 para ver la copia y recalcular cursores/total
      set({ currentPage: 1, pageCursors: [null] });
      await get().fetchTemplates(1);

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      set({ loading: false });
    }
  }

}));
