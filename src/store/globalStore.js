// Archivo: /src/store/globalStore.js (NUEVO)

import { create } from 'zustand';
import { loadInitialAgents } from '../../js/dataController';

export const useGlobalStore = create((set) => ({
  agents: [], // Aquí guardaremos los agentes
  
  /**
   * Carga los agentes desde Firestore y los guarda en el store.
   */
  loadAgents: async () => {
    try {
      // Reutilizamos tu dataController
      const agentsList = await loadInitialAgents(); 
      set({ agents: agentsList });
    } catch (error) {
      console.error("Error al cargar agentes en el store global:", error);
      set({ agents: [] });
    }
  },
}));