// src/store/collectionStore.js
import { create } from 'zustand';
import { 
    searchPersonas, 
    searchVehiculos, 
    searchEstablecimientos,
    createIdentificacion,
    updateIdentificacion,
    deleteIdentificacion
} from '../../js/dataController'; // Asegúrate de exportar estas en tu dataController

export const useCollectionStore = create((set, get) => ({
    // Estado inicial
    activeTab: 'personas', // personas | vehiculos | establecimientos
    searchTerm: '',
    
    // Datos
    personas: [],
    vehiculos: [],
    establecimientos: [],
    
    // Estado de UI
    loading: false,
    error: null,

    // Acciones de UI
    setActiveTab: (tab) => {
        set({ activeTab: tab, searchTerm: '', error: null });
        // 💡 CAMBIO 2: Al cambiar de pestaña, cargamos datos automáticamente
        get().search(); 
    }, 
    setSearchTerm: (term) => set({ searchTerm: term }),

    // --- FUNCIÓN PRINCIPAL DE CARGA DE DATOS ---
    search: async () => {
        const { activeTab, searchTerm } = get();
        set({ loading: true, error: null });

        try {
            let results = [];
            
            // 💡 CAMBIO 1: Eliminamos la condición para que busque siempre.
            // El backend ahora es responsable de devolver los últimos 50 si searchTerm está vacío.
            

            if (activeTab === 'personas') {
                results = await searchPersonas(searchTerm);
                set({ personas: results || [] });
            } else if (activeTab === 'vehiculos') {
                results = await searchVehiculos(searchTerm);
                set({ vehiculos: results || [] });
            } else if (activeTab === 'establecimientos') {
                results = await searchEstablecimientos(searchTerm);
                set({ establecimientos: results || [] });
            }
        } catch (err) {
            console.error(`Error cargando datos de ${activeTab}:`, err);
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    },

    // --- CREAR (Con actualización automática) ---
    addItem: async (collectionName, docId, data) => {
        set({ loading: true });
        try {
            // 1. Crear en Firebase
            await createIdentificacion(collectionName, docId, data);
            
            // 2. 💡 IMPORTANTE: Recargar la lista inmediatamente para ver el nuevo registro
            await get().search(); 
            
            return { success: true };
        } catch (err) {
            console.error("Error al añadir item:", err);
            return { success: false, message: err.message };
        } finally {
            set({ loading: false });
        }
    },


    // --- ACTUALIZAR (Con refresco local optimista o recarga) ---
    updateItem: async (collectionName, docId, data) => {
        set({ loading: true });
        try {
            await updateIdentificacion(collectionName, docId, data);
            
            // Opción A: Recargar todo (Más seguro para sincronizar fechas/keywords)
            // Se usa esta opción para simplificar y asegurar consistencia post-edición
            await get().search(); 

            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        } finally {
            set({ loading: false });
        }
    },

    // --- ELIMINAR ---
    deleteItem: async (collectionName, docId) => {
        set({ loading: true });
        try {
            await deleteIdentificacion(collectionName, docId);
            // Actualización local (Optimista) es segura para borrar
            set(state => ({
                [collectionName]: state[collectionName].filter(item => item.id !== docId)
            }));
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        } finally {
            set({ loading: false });
        }
    }
}));