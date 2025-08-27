// js/logic.js

import { selectedMonthId, scheduleData, currentUser, selectedAgentId, setScheduleData, currentView } from './state.js';
import { formatDate } from './utils.js';
import { showLoading, hideLoading, displayMessage } from './ui/viewManager.js';
import { getScheduleForMonth } from './dataController.js';
// La importación de 'renderSchedule' ya no es necesaria aquí.

export async function loadAndDisplaySchedule(monthId, agentId) {
    if (!monthId) {
        console.warn("[DEBUG] Se llamó a loadAndDisplaySchedule sin un monthId válido.");
        hideLoading();
        return;
    }
    const user = currentUser.get();
    let effectivePersonIdToDisplay = agentId;
    if (user?.role !== 'admin' && user?.role !== 'supervisor') {
        effectivePersonIdToDisplay = user.agentId;
    }
    
    const scheduleContent = document.getElementById('schedule-content');
    if (!scheduleContent) return;

    showLoading();
    // No borramos el contenido aquí para evitar parpadeos,
    // el renderer se encargará de actualizarlo.

    try {
        const scheduleDataFromDB = await getScheduleForMonth(monthId);
        
        // ✅ SIMPLIFICACIÓN: Simplemente actualizamos los datos del estado.
        // La suscripción en `scheduleRenderer.js` se encargará de redibujar la vista.
        setScheduleData(scheduleDataFromDB);

        // La lógica de estadísticas sigue dependiendo de los datos cargados.
        if (scheduleDataFromDB) {
            renderQuadrantStats(scheduleDataFromDB, effectivePersonIdToDisplay);
        } else {
            renderQuadrantStats(null, effectivePersonIdToDisplay);
            const message = (user?.role === 'admin' || user?.role === 'supervisor') ? "Cuadrante no inicializado." : "Cuadrante para este mes no disponible.";
            scheduleContent.innerHTML = `<p class="info-message">${message}</p>`;
        }
        
        const seasonalShiftNote = document.getElementById('seasonal-shift-note');
        if (seasonalShiftNote) updateSeasonalNote(monthId, seasonalShiftNote);
        
    } catch (e) {
        console.error("ERROR - logic: Error al cargar el cuadrante:", e);
        setScheduleData(null);
        displayMessage(`Error: ${e.message}`, "error");
    } finally {
        hideLoading();
    }
}

function renderQuadrantStats(scheduleData, agentId) {
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer) return;
    const shiftCounts = { M: 0, T: 0, N: 0, Libre: 0, V: 0, P: 0, B: 0 };
    let totalShifts = 0;
    if (!scheduleData || !scheduleData.weeks) {
        statsContainer.innerHTML = '<p class="info-message">No hay datos para calcular estadísticas.</p>';
        return;
    }
    for (const weekKey in scheduleData.weeks) {
        for (const dayKey in scheduleData.weeks[weekKey].days) {
            const day = scheduleData.weeks[weekKey].days[dayKey];
            if (!day.isCurrentMonth) continue;
            for (const shiftKey in day.shifts) {
                const shift = day.shifts[shiftKey];
                if (agentId === 'all' || String(shift.agentId) === String(agentId)) {
                    if (shiftCounts.hasOwnProperty(shift.shiftType)) {
                        shiftCounts[shift.shiftType]++;
                        totalShifts++;
                    }
                }
            }
        }
    }
    if (totalShifts === 0) {
        statsContainer.innerHTML = '<p class="info-message">No hay turnos asignados en este periodo.</p>';
        return;
    }
    statsContainer.innerHTML = `
        <ul class="stats-list">
            <li><strong>Mañanas:</strong> <span>${shiftCounts.M}</span></li>
            <li><strong>Tardes:</strong> <span>${shiftCounts.T}</span></li>
            <li><strong>Noches:</strong> <span>${shiftCounts.N}</span></li>
            <li><strong>Libres:</strong> <span>${shiftCounts.Libre}</span></li>
            <li><strong>Vacaciones:</strong> <span>${shiftCounts.V}</span></li>
            <li><strong>Permisos:</strong> <span>${shiftCounts.P}</span></li>
            <li><strong>Bajas:</strong> <span>${shiftCounts.B}</span></li>
        </ul>
        <hr class="subtle-divider">
        <div class="stats-total">Total de Turnos: <strong>${totalShifts}</strong></div>
    `;
}

export function updateSeasonalNote(monthId, noteElement) {
    if (!noteElement || !monthId) return;
    const summerMonths = ['junio', 'julio', 'agosto', 'septiembre'];
    const currentMonthName = monthId.split('_')[1].toLowerCase();
    if (summerMonths.includes(currentMonthName)) {
        noteElement.innerHTML = '<b>Nota de Temporada:</b> Turno de Mañana: 08:00 a 14:00H. Turno de Tarde: 18:00 a 23:00H.';
        noteElement.classList.remove('hidden');
    } else {
        noteElement.classList.add('hidden');
    }
}