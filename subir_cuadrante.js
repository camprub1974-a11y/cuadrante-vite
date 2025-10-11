import admin from 'firebase-admin';
import { format, startOfMonth, getDay, subDays, addDays, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// --- CONFIGURACIÓN ---
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };
import shiftsData from './cuadrante_noviembre.json' with { type: 'json' };
// --- FIN ---

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function uploadQuadrant() {
  try {
    if (!shiftsData || !shiftsData.length) {
      console.log('El archivo de datos del cuadrante está vacío.');
      return;
    }

    console.log(`Procesando ${shiftsData.length} turnos...`);

    const firstDateOfMonth = new Date(`${shiftsData[0].date}T12:00:00Z`);
    const targetMonthIndex = getMonth(firstDateOfMonth);

    const startOfTargetMonth = startOfMonth(firstDateOfMonth);
    const dayOfWeek = getDay(startOfTargetMonth);
    const daysToSubtract = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
    const calendarStartDate = subDays(startOfTargetMonth, daysToSubtract);

    const monthName = format(firstDateOfMonth, 'MMMM', { locale: es });
    const year = format(firstDateOfMonth, 'yyyy');
    const documentId = `cuadrante_${monthName}_${year}`;
    
    const scheduleRef = db.collection('schedules').doc(documentId);
    
    const nestedScheduleUpdate = { weeks: {} };

    // --- INICIO DE LA CORRECCIÓN FINAL ---
    // 1. Convertimos la lista de turnos en un mapa para buscar fácilmente
    const shiftsMap = new Map();
    shiftsData.forEach(s => shiftsMap.set(s.date, shiftsMap.get(s.date) ? [...shiftsMap.get(s.date), s] : [s]));

    // 2. Construimos la estructura completa para 6 semanas (42 días)
    for (let i = 0; i < 42; i++) {
        const currentDate = addDays(calendarStartDate, i);
        const weekIndex = Math.floor(i / 7);
        const dayIndex = i % 7;

        const weekKey = `week${weekIndex}`;
        const dayKey = String(dayIndex);
        const dateString = format(currentDate, 'yyyy-MM-dd');

        // Aseguramos que el objeto week exista
        if (!nestedScheduleUpdate.weeks[weekKey]) {
            nestedScheduleUpdate.weeks[weekKey] = { days: {} };
        }

        // 3. Creamos el objeto completo para el día
        nestedScheduleUpdate.weeks[weekKey].days[dayKey] = {
            date: dateString,
            isCurrentMonth: getMonth(currentDate) === targetMonthIndex,
            month: format(currentDate, 'MMMM', { locale: es }),
            name: format(currentDate, 'EEEEEE', { locale: es }), // 'lu', 'ma', 'mi'...
            number: format(currentDate, 'd'),
            year: getMonth(currentDate),
            shifts: {} // Inicializamos los turnos vacíos
        };
        
        // 4. Si hay turnos para este día en el JSON, los añadimos
        if (shiftsMap.has(dateString)) {
            const dayShifts = shiftsMap.get(dateString);
            dayShifts.forEach(shift => {
                const shiftKey = `agent_shift_${shift.agentId}`;
                nestedScheduleUpdate.weeks[weekKey].days[dayKey].shifts[shiftKey] = {
                    agentId: String(shift.agentId),
                    shiftType: shift.shift
                };
            });
        }
    }
    // --- FIN DE LA CORRECCIÓN FINAL ---
    
    await scheduleRef.set(nestedScheduleUpdate, { merge: true });

    console.log(`✅ ¡Éxito! El cuadrante para "${documentId}" se ha actualizado con la estructura de días completa.`);

  } catch (error) {
    console.error('❌ Error al subir el cuadrante:', error);
  }
}

uploadQuadrant();