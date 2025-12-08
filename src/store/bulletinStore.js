// Archivo: /src/store/bulletinStore.js

import { create } from 'zustand';
import { httpsCallable } from 'firebase/functions';
// 💡 CORRECCIÓN: Subir dos niveles para encontrar la carpeta 'js'
import { functions } from '../../js/firebase-config'; 

export const useBulletinStore = create((set, get) => ({
    announcements: [],
    loading: false,
    filter: 'all', // all, trafico, legislacion...
    
    // Estado para el contador
    unreadCount: 0,
    lastViewed: localStorage.getItem('bulletin_last_viewed') || null,

    setFilter: (category) => set({ filter: category }),

    fetchAnnouncements: async () => {
        set({ loading: true });
        try {
            const fn = httpsCallable(functions, 'getAnnouncements');
            const result = await fn();
            if (result.data.success) {
                const items = result.data.announcements;
                
                // Lógica de conteo: cuántos son más nuevos que la última visita
                const lastViewedDate = get().lastViewed ? new Date(get().lastViewed) : new Date(0);
                const newItems = items.filter(item => new Date(item.createdAt) > lastViewedDate).length;

                set({ 
                    announcements: items,
                    unreadCount: newItems
                });
            }
        } catch (error) {
            console.error("Error al obtener anuncios:", error);
        } finally {
            set({ loading: false });
        }
    },

    // ACCIÓN: Marcar como visto (se llamará al entrar en la página)
    markAsViewed: () => {
        const now = new Date().toISOString();
        localStorage.setItem('bulletin_last_viewed', now);
        set({ lastViewed: now, unreadCount: 0 });
    },

    addAnnouncement: async (data) => {
        set({ loading: true });
        try {
            const fn = httpsCallable(functions, 'createAnnouncement');
            await fn(data);
            await get().fetchAnnouncements(); // Recargar
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        } finally {
            set({ loading: false });
        }
    },

    deleteAnnouncement: async (id) => {
        if(!confirm("¿Borrar anuncio?")) return;
        set({ loading: true });
        try {
            const fn = httpsCallable(functions, 'deleteAnnouncement');
            await fn({ id });
            set({ announcements: get().announcements.filter(a => a.id !== id) });
        } catch (error) {
            console.error(error);
        } finally {
            set({ loading: false });
        }
    }
}));