import { create } from 'zustand';
import { 
    getIncidencias, 
    createIncidencia, 
    updateIncidenciaStatus 
} from '../../js/dataController';

export const useIncidenciasStore = create((set, get) => ({
    // --- ESTADO INICIAL ---
    incidencias: [],
    loading: false,
    error: null,
    filters: { status: 'all' },
    stats: { pendientes: 0, tramitadas: 0, resueltas: 0 },
    modalOpen: false,
    selectedIncidencia: null, // Para editar/gestionar

    // --- ACCIONES DE UI ---
    setFilter: (key, value) => {
        set(state => ({ filters: { ...state.filters, [key]: value } }));
        // Recargar datos automáticamente al cambiar el filtro
        get().loadIncidencias();
    },

    openModal: (incidencia = null) => set({ modalOpen: true, selectedIncidencia: incidencia }),
    
    closeModal: () => set({ modalOpen: false, selectedIncidencia: null }),

    // --- CARGA DE DATOS ---
    loadIncidencias: async () => {
        set({ loading: true, error: null });
        try {
            const data = await getIncidencias(get().filters);
            
            // Validación de seguridad: Aseguramos que data sea un array
            const safeData = Array.isArray(data) ? data : [];
            
            // Calcular estadísticas simples en cliente
            const stats = {
                pendientes: safeData.filter(i => i.status === 'pendiente').length,
                tramitadas: safeData.filter(i => i.status === 'tramitada').length,
                resueltas: safeData.filter(i => i.status === 'resuelta').length
            };

            set({ incidencias: safeData, stats, loading: false });
        } catch (error) {
            console.error("Store Error loading incidencias:", error);
            set({ error: error.message, loading: false, incidencias: [] });
        }
    },

    // --- CREACIÓN ---
    addIncidencia: async (data) => {
        set({ loading: true, error: null });
        try {
            await createIncidencia(data);
            await get().loadIncidencias(); // Recargar lista
            get().closeModal(); // Cerrar modal al terminar
            return { success: true };
        } catch (error) {
            console.error("Store Error adding incidencia:", error);
            return { success: false, error: error.message };
        } finally {
            set({ loading: false }); // Desbloquear botón
        }
    },

    // --- ACTUALIZACIÓN (ADMIN) ---
    updateStatus: async (id, data) => {
        set({ loading: true, error: null });
        try {
            await updateIncidenciaStatus(id, data);
            await get().loadIncidencias(); // Recargar lista
            get().closeModal(); // Cerrar modal al terminar
            return { success: true };
        } catch (error) {
            console.error("Store Error updating status:", error);
            return { success: false, error: error.message };
        } finally {
            set({ loading: false }); // Desbloquear botón
        }
    }
}));