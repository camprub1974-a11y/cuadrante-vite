// cuadrante-vite/js/ui/availabilityRenderer.js

import { scheduleData, availableAgents, selectedMonthId, currentView, selectedAgentId, currentUser } from '../state.js';
import { openEditShiftModal } from './shiftModal.js';
import { displayMessage } from './viewManager.js';
import { weekDays, getTurnoInitial, formatDate } from '../utils.js';

const scheduleContent = document.getElementById('schedule-content');

function addAvailabilityListeners() {
    document.querySelectorAll('.calendar-day').forEach(dayElement => {
        if (dayElement.dataset.isCurrentMonth === 'true' && dayElement.dataset.actualDayDate !== '') {
            const userProfile = currentUser.get();
            if (userProfile && userProfile.role === 'admin') {
                 dayElement.addEventListener('click', (event) => {
                    console.log("[DEBUG availabilityRenderer] Clic en día de calendario (admin)."); // <-- LOG DE DEPURACIÓN
                    const weekKey = dayElement.dataset.weekKey;
                    const dayKey = dayElement.dataset.dayKey;
                    const actualDayDateFromData = dayElement.dataset.actualDayDate;

                    const currentScheduleData = scheduleData.get();
                    const dayData = currentScheduleData?.weeks?.[weekKey]?.days?.[dayKey];

                    let agentIdToEdit = selectedAgentId.get();
                    
                    if (String(agentIdToEdit) === 'all' || !agentIdToEdit) {
                        displayMessage("Por favor, selecciona un agente individual para editar su turno en vista calendario.", "info");
                        return;
                    }

                    let currentShiftType = null;
                    let existingShiftKey = null;

                    if (dayData && dayData.shifts) {
                        for (const sKey in dayData.shifts) {
                            if (String(dayData.shifts[sKey].agentId) === String(agentIdToEdit)) {
                                currentShiftType = dayData.shifts[sKey].shiftType;
                                existingShiftKey = sKey;
                                break;
                            }
                        }
                    }

                    openEditShiftModal(
                        weekKey,
                        dayKey,
                        agentIdToEdit,
                        currentShiftType || '-',
                        actualDayDateFromData,
                        dayElement
                    );
                }, { once: true });
            }
        }
    });
}

export function renderAvailabilityView() {
    console.log("[DEBUG availabilityRenderer] renderAvailabilityView: Iniciando renderizado de vista calendario."); // <-- LOG DE DEPURACIÓN
    const currentScheduleData = scheduleData.get();
    const currentAvailableAgents = availableAgents.get();
    let currentSelectedAgentId = selectedAgentId.get();
    const currentViewType = currentView.get();
    const userProfile = currentUser.get();

    console.log('[DEBUG AvailabilityRenderer] renderAvailabilityView llamado. Vista:', currentViewType, 'Datos de Cuadrante presentes:', !!currentScheduleData);
    console.log('[DEBUG AvailabilityRenderer] Agentes disponibles presentes:', currentAvailableAgents && Object.keys(currentAvailableAgents).length > 0);
    console.log('[DEBUG AvailabilityRenderer] Usuario:', userProfile?.email, 'Rol:', userProfile?.role);
    console.log('[DEBUG AvailabilityRenderer] selectedAgentId al inicio de renderAvailabilityView:', currentSelectedAgentId);

    // Validaciones al inicio para vista calendario
    if (currentViewType === 'calendario') {
        if (!userProfile || !userProfile.uid) {
            if (scheduleContent) scheduleContent.innerHTML = '<p class="info-message">Inicia sesión para ver el cuadrante.</p>';
            console.log("[DEBUG availabilityRenderer] Usuario no logueado, deteniendo renderizado calendario."); // <-- LOG DE DEPURACIÓN
            return;
        }
        if (!currentAvailableAgents || Object.keys(currentAvailableAgents).length === 0) {
            if (scheduleContent) scheduleContent.innerHTML = '<p class="info-message">No hay agentes disponibles.</p>';
            console.log("[DEBUG availabilityRenderer] No hay agentes disponibles, deteniendo renderizado calendario."); // <-- LOG DE DEPURACIÓN
            return;
        }

        if (userProfile.role === 'guard') {
            const userAgentId = String(userProfile.agentId);
            const userAgent = currentAvailableAgents.find(a => String(a.id) === userAgentId);

            if (!userAgent) {
                if (scheduleContent) scheduleContent.innerHTML = '<p class="info-message">Tu perfil de agente no se encontró en la lista de agentes activos.</p>';
                console.log("[DEBUG availabilityRenderer] Agente de guardia no encontrado, deteniendo renderizado calendario."); // <-- LOG DE DEPURACIÓN
                return;
            }

            if (String(currentSelectedAgentId) !== userAgentId) {
                selectedAgentId.set(userAgentId);
                console.log(`[DEBUG availabilityRenderer] Forzando selectedAgentId para guardia: ${userAgentId}. Puede disparar re-render.`); // <-- LOG DE DEPURACIÓN
                // RETORNAR AQUÍ. La suscripción a selectedAgentId disparará renderAvailabilityView de nuevo
                // con el ID correcto. Esto evita que la función intente renderizar con un ID desactualizado.
                return; 
            }
            currentSelectedAgentId = userAgentId; // Asegurar que esta instancia de la función usa el ID correcto.
        } 
        else if (userProfile.role === 'admin' && String(currentSelectedAgentId) === 'all') {
            if (scheduleContent) scheduleContent.innerHTML = '<p class="info-message">Por favor, selecciona un agente individual para ver el calendario como administrador.</p>';
            console.log("[DEBUG availabilityRenderer] Admin en vista calendario con 'all' seleccionado, deteniendo renderizado."); // <-- LOG DE DEPURACIÓN
            return;
        }
    }

    if (!currentScheduleData || Object.keys(currentScheduleData).length === 0) {
        console.warn("[DEBUG AvailabilityRenderer] Datos de cuadrante ausentes o vacíos al intentar renderizar disponibilidad.");
        if (scheduleContent) scheduleContent.innerHTML = '<p class="loading-message">Cargando cuadrante de disponibilidad...</p>';
        return;
    }
    console.log("[DEBUG AvailabilityRenderer] Procediendo a generar HTML para calendario."); // <-- LOG DE DEPURACIÓN

    let html = '<div class="availability-calendar">';

    html += '<div class="calendar-week-header">';
    weekDays.forEach(dayName => {
        html += `<div class="day-name">${dayName}</div>`;
    });
    html += '</div>';

    Object.keys(currentScheduleData.weeks)
        .sort((a,b) => parseInt(a.replace('week','')) - parseInt(b.replace('week','')))
        .forEach(weekKey => {
            const week = currentScheduleData.weeks[weekKey];
            html += '<div class="calendar-week">';
            for (let i = 0; i <= 6; i++) {
                const day = week.days[i.toString()] || {
                    name: weekDays[i],
                    number: '',
                    month: '',
                    year: '',
                    dateId: '',
                    isCurrentMonth: false,
                    shifts: {}
                };

                let dayContent = '';
                let isCurrentMonthDay = day.isCurrentMonth;

                let dayNumber = day.number;
                let dateId = day.date;
                const actualDayDate = day.date;

                if (!day.isCurrentMonth && (day.number === '' || day.number === null)) {
                    dayContent = `<div class="day-empty"></div>`;
                } else {
                    dayContent += `<div class="day-header">${dayNumber}</div>`;
                    dayContent += `<div class="day-shifts-container">`;

                    let agentShifts = Object.values(day.shifts).filter(shift => String(shift.agentId) === String(currentSelectedAgentId));
                    console.log(`[DEBUG AvailabilityRenderer] Día ${day.date}: Turnos para ${currentSelectedAgentId}:`, agentShifts); // <-- LOG DE DEPURACIÓN
                    
                    if (agentShifts.length > 0) {
                        agentShifts.forEach(shift => {
                            const agent = currentAvailableAgents.find(a => String(a.id) === String(shift.agentId));
                            const agentName = agent ? agent.name : `Agente ${shift.agentId}`;

                            const initial = getTurnoInitial(shift.shiftType);

                            dayContent += `
                                <span
                                    class="turno-icon shift-${initial}"
                                    data-agent-id="${String(shift.agentId)}"
                                    data-shift-type="${shift.shiftType}"
                                    data-date-id="${dateId}"
                                    title="${agentName}: ${shift.shiftType}"
                                    data-week-key="${weekKey}"
                                    data-day-key="${i.toString()}"
                                    data-actual-day-date="${actualDayDate}"
                                    data-is-current-month="${isCurrentMonthDay}"
                                >
                                    ${initial}
                                </span>
                            `;
                        });
                    } else {
                        dayContent += '<span class="no-shifts-placeholder">Sin turnos</span>';
                    }
                    dayContent += `</div>`;
                }

                html += `<div class="calendar-day ${!isCurrentMonthDay ? 'day-off-month' : ''}"
                                data-date-id="${dateId}"
                                data-week-key="${weekKey}"
                                data-day-key="${i.toString()}"
                                data-actual-day-date="${actualDayDate}"
                                data-is-current-month="${isCurrentMonthDay}" >
                                ${dayContent}
                         </div>`;
            }
            html += '</div>';
        });
    html += '</div>';

    if (scheduleContent) scheduleContent.innerHTML = html;
    addAvailabilityListeners();
    console.log("[DEBUG AvailabilityRenderer] HTML de vista de calendario inyectado. Listeners añadidos.");
}

// Suscripciones a Nanostores para re-renderizar
currentView.subscribe(view => {
    console.log(`[DEBUG availabilityRenderer] currentView.subscribe: View changed to ${view}`); // <-- LOG DE DEPURACIÓN
    if (view === 'calendario') {
        renderAvailabilityView();
    }
});
scheduleData.subscribe(data => {
    console.log(`[DEBUG availabilityRenderer] scheduleData.subscribe: Data changed.`); // <-- LOG DE DEPURACIÓN
    if (currentView.get() === 'calendario') {
        renderAvailabilityView();
    }
});
selectedAgentId.subscribe(agentId => {
    console.log(`[DEBUG availabilityRenderer] selectedAgentId.subscribe: Agent changed to ${agentId}`); // <-- LOG DE DEPURACIÓN
    if (currentView.get() === 'calendario') {
        renderAvailabilityView();
    }
});
availableAgents.subscribe(agents => {
    console.log(`[DEBUG availabilityRenderer] availableAgents.subscribe: Agents list changed. Count: ${agents.length}`); // <-- LOG DE DEPURACIÓN
    if (currentView.get() === 'calendario') {
        renderAvailabilityView();
    }
});
currentUser.subscribe(user => {
    console.log(`[DEBUG availabilityRenderer] currentUser.subscribe: User changed. Role: ${user?.role}`); // <-- LOG DE DEPURACIÓN
    if (currentView.get() === 'calendario') {
        renderAvailabilityView();
    }
});