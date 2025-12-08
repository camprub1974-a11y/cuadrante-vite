// Archivo: /src/store/taskStore.js

import { create } from 'zustand';
import { 
  getAllTasks, 
  createTask, 
  updateTaskStatus, 
  resolveTaskWithComment 
} from '../../js/dataController';
import { useAuthStore } from './authStore';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  
  // Filtros
  filters: {
    status: 'pendiente', // 'pendiente', 'finalizada', 'all'
    priority: 'all',     // 'alta', 'normal', 'all'
    scope: 'mine'        // 'mine' (mis tareas), 'all' (todas - admin)
  },

  setFilter: (key, value) => {
    set(state => ({ filters: { ...state.filters, [key]: value } }));
    get().loadTasks();
  },

  loadTasks: async () => {
    set({ loading: true, error: null });
    const { filters } = get();
    const user = useAuthStore.getState().user;

    try {
      // Preparamos los filtros para el controlador
      const queryOptions = {
        status: filters.status,
        limit: 50 // Traemos un lote razonable
      };

      // Si el scope es 'mine', filtramos por el agente actual
      if (filters.scope === 'mine' && user?.agentId) {
        queryOptions.agentId = user.agentId;
      }

      const result = await getAllTasks(queryOptions);
      
      // Filtro adicional en cliente para prioridad (si no lo soporta el backend aún)
      let filteredTasks = result.tasks || [];
      if (filters.priority !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.priority === filters.priority);
      }

      set({ tasks: filteredTasks, loading: false });
    } catch (err) {
      console.error("Store: Error cargando tareas", err);
      set({ error: err.message, loading: false });
    }
  },

  addNewTask: async (taskData) => {
    set({ loading: true });
    try {
      await createTask(taskData);
      await get().loadTasks(); // Recargar
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.message };
    }
  },

  resolveTask: async (taskId, comment) => {
    set({ loading: true });
    try {
      await resolveTaskWithComment({ taskId, comment });
      await get().loadTasks(); // Recargar para verla desaparecer de pendientes
      return { success: true };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.message };
    }
  }
}));