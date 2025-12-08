// Archivo: /src/store/planningStore.js

import { create } from 'zustand';
import { doc, getDoc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { db } from '../../js/firebase-config';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export const usePlanningStore = create((set, get) => ({
  planningDate: addMonths(new Date(), 1), // Por defecto: Mes siguiente
  draftData: null, // Datos del borrador actual
  loading: false,
  error: null,
  unsavedChanges: false,

  // --- NAVEGACIÓN ---
  setPlanningDate: (date) => {
    set({ planningDate: date });
    get().loadDraft();
  },

  // --- CARGAR BORRADOR ---
  loadDraft: async () => {
    const { planningDate } = get();
    const monthId = `draft_${format(planningDate, 'MMMM_yyyy', { locale: es }).toLowerCase()}`;
    
    set({ loading: true, error: null });
    
    try {
      const docRef = doc(db, 'planning_drafts', monthId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        set({ draftData: docSnap.data(), loading: false, unsavedChanges: false });
      } else {
        // Si no existe, inicializamos una estructura vacía
        const structure = get().initializeEmptyMonth(planningDate);
        set({ draftData: structure, loading: false, unsavedChanges: true }); // Marcado como no guardado para forzar creación inicial
      }
    } catch (err) {
      console.error("Error cargando borrador:", err);
      set({ error: err.message, loading: false });
    }
  },

  // --- GUARDAR BORRADOR ---
  saveDraft: async () => {
    const { planningDate, draftData } = get();
    const monthId = `draft_${format(planningDate, 'MMMM_yyyy', { locale: es }).toLowerCase()}`;
    
    set({ loading: true });
    try {
      await setDoc(doc(db, 'planning_drafts', monthId), {
          ...draftData,
          updatedAt: new Date()
      });
      set({ loading: false, unsavedChanges: false });
      return { success: true };
    } catch (err) {
      set({ loading: false, error: err.message });
      return { success: false, message: err.message };
    }
  },

  // --- PUBLICAR (Borrador -> Real) ---
  publishSchedule: async () => {
    const { planningDate, draftData } = get();
    // ID Real: "cuadrante_noviembre_2025"
    const realId = `cuadrante_${format(planningDate, 'MMMM_yyyy', { locale: es }).toLowerCase()}`;
    
    set({ loading: true });
    try {
        // 1. Guardar en colección real 'schedules'
        await setDoc(doc(db, 'schedules', realId), {
            ...draftData,
            id: realId,
            status: 'published',
            publishedAt: new Date()
        });

        // 2. (Opcional) Eliminar el borrador o marcarlo como 'merged'
        // await deleteDoc(doc(db, 'planning_drafts', draftId));

        set({ loading: false });
        return { success: true };
    } catch (err) {
        set({ loading: false, error: err.message });
        return { success: false, message: err.message };
    }
  },

  // --- UTILIDADES ---
  
  // Modificar un turno en el borrador (en memoria)
  updateLocalShift: (agentId, dateStr, newType) => {
      const { draftData } = get();
      if (!draftData) return;

      // Clonación profunda simple para inmutabilidad
      const newDraft = JSON.parse(JSON.stringify(draftData));
      
      // Buscar día y actualizar (Lógica simplificada, adaptada a tu estructura weeks/days)
      let found = false;
      Object.values(newDraft.weeks).forEach(week => {
          Object.values(week.days).forEach(day => {
              if (day.date === dateStr) {
                  // Buscar o crear el turno del agente
                  let shiftFound = false;
                  if (!day.shifts) day.shifts = {};
                  
                  // Buscamos por value
                  Object.entries(day.shifts).forEach(([key, s]) => {
                      if (String(s.agentId) === String(agentId)) {
                          s.shiftType = newType;
                          shiftFound = true;
                      }
                  });

                  if (!shiftFound) {
                      // Añadir nuevo si no existía
                      const newKey = Object.keys(day.shifts).length + 1;
                      day.shifts[newKey] = { agentId, shiftType: newType };
                  }
                  found = true;
              }
          });
      });

      if (found) {
          set({ draftData: newDraft, unsavedChanges: true });
      }
  },

  // Inicializador de estructura vacía
  initializeEmptyMonth: (date) => {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const days = eachDayOfInterval({ start, end });
      
      // Crear estructura de semanas/días compatible con tu WeeklyScheduleTable
      // (Esto es una simplificación, tu lógica real de semanas puede variar)
      const structure = { id: '', year: date.getFullYear(), monthIndex: date.getMonth(), weeks: {} };
      
      let currentWeek = 0;
      days.forEach(d => {
          const weekKey = `week${currentWeek}`;
          if (!structure.weeks[weekKey]) structure.weeks[weekKey] = { days: {} };
          
          const dayKey = d.getDate(); // Usamos día del mes como key simple
          structure.weeks[weekKey].days[dayKey] = {
              date: format(d, 'yyyy-MM-dd'),
              number: d.getDate(),
              name: format(d, 'eee', { locale: es }),
              shifts: {} // Vacío inicialmente
          };

          if (d.getDay() === 0) currentWeek++; // Domingo cambia semana
      });

      return structure;
  }
}));