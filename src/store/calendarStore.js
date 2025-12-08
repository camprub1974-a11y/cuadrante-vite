// Archivo: /src/store/calendarStore.js

import { create } from 'zustand';
import { getScheduleForMonth, updateShiftV2, addShiftToSchedule } from '../../js/dataController'; // 💡 Importar addShiftToSchedule
import { format, addMonths, subMonths, setMonth, setYear, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

export const useCalendarStore = create((set, get) => ({
  currentDate: new Date(),
  viewMode: 'week', // 💡 ESTADO GLOBAL DE LA VISTA ('week' o 'month')
  
  scheduleData: null,
  additionalMonthsData: {},
  loadedMonths: new Set(),
  selectedAgentId: 'all', 
  loading: false,
  error: null,

  // --- ACCIONES DE CONFIGURACIÓN ---
  setViewMode: (mode) => set({ viewMode: mode }),

  // --- ACCIONES DE NAVEGACIÓN INTELIGENTE (LA SOLUCIÓN) ---
  navigateNext: () => {
    const { viewMode, currentDate } = get();
    const newDate = viewMode === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1);
    set({ currentDate: newDate });
    get().loadSchedule(); // Recargar datos si cambiamos de mes
  },

  navigatePrev: () => {
    const { viewMode, currentDate } = get();
    const newDate = viewMode === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1);
    set({ currentDate: newDate });
    get().loadSchedule();
  },

  goToToday: () => {
    set({ currentDate: new Date() });
    get().loadSchedule();
  },

  // --- CARGA DE DATOS ---
  loadSchedule: async () => {
    const date = get().currentDate;
    const monthName = format(date, 'MMMM', { locale: es }).toLowerCase();
    const year = format(date, 'yyyy');
    const monthId = `cuadrante_${monthName}_${year}`;
    
    set({ loading: true, error: null });
    try {
      const data = await getScheduleForMonth(monthId);
      const loadedMonths = new Set(get().loadedMonths);
      loadedMonths.add(monthId);
      set({ scheduleData: data || null, loading: false, loadedMonths });
    } catch (err) {
      console.error("Error cargando cuadrante:", err);
      set({ error: "Error al cargar datos.", loading: false });
    }
  },

  loadScheduleForMonth: async (date) => {
    const monthName = format(date, 'MMMM', { locale: es }).toLowerCase();
    const year = format(date, 'yyyy');
    const monthId = `cuadrante_${monthName}_${year}`;
    
    const { loadedMonths, additionalMonthsData, scheduleData } = get();
    // Evitar recargas innecesarias
    if (scheduleData?.id === monthId || loadedMonths.has(monthId) || additionalMonthsData[monthId]) return;
    
    try {
      const data = await getScheduleForMonth(monthId);
      if (data) {
        const newLoadedMonths = new Set(loadedMonths);
        newLoadedMonths.add(monthId);
        set({
          additionalMonthsData: { ...get().additionalMonthsData, [monthId]: data },
          loadedMonths: newLoadedMonths
        });
      }
    } catch (err) { console.error(`Error cargando mes adicional ${monthId}:`, err); }
  },

  // 💡 NUEVA ACCIÓN: Añadir Turno (Mantenido)
  addShift: async (dateStr, shiftData) => {
     const { scheduleData } = get();
     if (!scheduleData?.weeks) return { success: false, message: "Datos no cargados" };

     // 1. Buscar las coordenadas del día (weekKey, dayKey)
     let targetWeekKey = null, targetDayKey = null;
     for (const [wKey, week] of Object.entries(scheduleData.weeks)) {
         for (const [dKey, day] of Object.entries(week.days)) {
             if (day.date === dateStr) { targetWeekKey = wKey; targetDayKey = dKey; break; }
         }
         if (targetWeekKey) break;
     }

     if (!targetWeekKey) return { success: false, message: "Día no encontrado en el mes actual." };

     set({ loading: true });
     try {
         await addShiftToSchedule({
             monthId: scheduleData.id,
             weekKey: targetWeekKey,
             dayKey: targetDayKey,
             shiftData: shiftData
         });
         
         await get().loadSchedule(); // Recargar para ver el nuevo turno
         set({ loading: false });
         return { success: true };
     } catch (err) {
         set({ loading: false, error: err.message });
         return { success: false, message: err.message };
     }
  },
  
  // 💡 CORRECCIÓN 2: deleteShiftByDate ahora pasa currentShiftType
  deleteShiftByDate: async (dateStr, agentId, currentShiftType) => {
      console.log(`[Store] Eliminando turno ${currentShiftType} de ${agentId} en ${dateStr}`);
      // Pasamos el shiftType actual para que el backend sepa cuál eliminar
      return await get().updateShiftByDate(dateStr, agentId, '-', currentShiftType);
  },

  // --- EDICIÓN DE TURNOS ---
  // 💡 CORRECCIÓN 3: updateShiftByDate ahora acepta currentShiftType
  updateShiftByDate: async (dateStr, agentId, newType, currentShiftType = null) => {
     const { scheduleData } = get();
     if (!scheduleData?.weeks) return { success: false, message: "Datos no cargados" };

     let targetWeekKey = null, targetDayKey = null;
     for (const [wKey, week] of Object.entries(scheduleData.weeks)) {
         for (const [dKey, day] of Object.entries(week.days)) {
             if (day.date === dateStr) { targetWeekKey = wKey; targetDayKey = dKey; break; }
         }
         if (targetWeekKey) break;
     }
     if (!targetWeekKey) return { success: false, message: "Día no encontrado en mes principal" };
     // 💡 Pasamos currentShiftType al backend
     return await get().updateShift(scheduleData.id, targetWeekKey, targetDayKey, agentId, newType, currentShiftType);
  },

  // 💡 CORRECCIÓN 4: updateShift ahora acepta currentShiftType
  updateShift: async (monthId, weekKey, dayKey, agentId, newShiftType, currentShiftType = null) => {
    set({ loading: true });
    try {
      // 💡 Incluimos currentShiftType en la llamada
      await updateShiftV2({ monthId, weekKey, dayKey, agentId, newShiftType, currentShiftType }); 
      await get().loadSchedule(); // Recargar para ver cambios
      set({ loading: false });
      return { success: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, message: err.message };
    }
  },

  // --- FILTROS ---
  setMonthIndex: (index) => { set((state) => ({ currentDate: setMonth(state.currentDate, index) })); get().loadSchedule(); },
  setYearValue: (year) => { set((state) => ({ currentDate: setYear(state.currentDate, year) })); get().loadSchedule(); },
  setFilterAgent: (agentId) => { set({ selectedAgentId: agentId }); }
}));