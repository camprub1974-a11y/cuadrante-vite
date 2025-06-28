// js/ui/scheduleRenderer.js

import { currentView, scheduleData, selectedAgentId, currentUser, availableAgents } from '../state.js';
import { renderAvailabilityView } from './availabilityRenderer.js';
import { openEditShiftModal } from './shiftModal.js';
import { formatDate, getShiftDisplayText, getShiftFullName } from '../utils.js';
import { openProposeChangeModal } from './proposeChangeModal.js';
import { openRespondToProposalModal } from './respondToProposalModal.js';
import { getShiftChangeRequests } from '../dataController.js';

let pendingProposalsCache = [];

// Esta función se está utilizando en varios lugares. Se recomienda moverla a utils.js o un nuevo helper.js
// para una mejor centralización y reutilización.
export function getAgentName(agentId) {
    const agent = availableAgents.get().find(a => String(a.id) === String(agentId));
    return agent ? agent.name : `ID ${agentId}`;
}

function displayScheduleCardView({ data, agentId: selectedAgent, userProfile }) {
    console.log("[DEBUG - scheduleRenderer] displayScheduleCardView llamado.");
    console.log("[DEBUG - scheduleRenderer] Datos de cuadrante recibidos:", data);
    console.log("[DEBUG - scheduleRenderer] Agente seleccionado para vista de tarjetas:", selectedAgent);
    console.log("[DEBUG - scheduleRenderer] Perfil de usuario:", userProfile);

    const scheduleContent = document.getElementById('schedule-content'); // Obtener referencia aquí
    if (!scheduleContent || !data || !data.weeks || !data.people) {
        console.warn("[DEBUG - scheduleRenderer] Datos de cuadrante incompletos o ausentes para renderizado de tarjetas.");
        scheduleContent.innerHTML = '<p class="info-message">No hay datos de cuadrante para este mes.</p>';
        return;
    }

    let agentsToRender = Object.values(data.people);
    console.log("[DEBUG - scheduleRenderer] Agentes en data.people:", agentsToRender);

    if (selectedAgent && selectedAgent !== 'all') {
        agentsToRender = agentsToRender.filter(agent => String(agent.id) === String(selectedAgent));
        console.log("[DEBUG - scheduleRenderer] Agentes a renderizar (filtrados):", agentsToRender);
    }
    
    if (agentsToRender.length === 0) {
        console.warn("[DEBUG - scheduleRenderer] No se encontraron agentes para renderizar después del filtrado.");
        scheduleContent.innerHTML = '<p class="info-message">No se encontró información para el agente seleccionado.</p>';
        return;
    }
    
    agentsToRender.sort((a,b) => (a.name || a.id).localeCompare(b.name || b.id));

    const today = formatDate(new Date(), 'yyyy-MM-dd');

    let finalHtml = Object.keys(data.weeks)
        .sort((a,b) => parseInt(a.replace('week','')) - parseInt(b.replace('week','')))
        .map(weekKey => {
            const week = data.weeks[weekKey];
            const dayKeys = Object.keys(week.days).sort((a,b) => parseInt(a)-parseInt(b));
            const firstDay = week.days[dayKeys[0]];
            const lastDay = week.days[dayKeys[dayKeys.length-1]];
            const monthName = firstDay?.date ? formatDate(new Date(firstDay.date + 'T12:00:00'), 'MMMM', { locale: 'es' }) : '';
            const weekTitleHtml = `<h3>Semana del ${firstDay?.number || ''} al ${lastDay?.number || ''} de ${monthName}</h3>`;
            
            let dayNamesRowHtml = '<div class="day-names-row"><div class="agent-label-header">Agente</div>';
            for (let i = 0; i < 7; i++) {
                const day = week.days[i.toString()];
                dayNamesRowHtml += `<div class="day-header ${!day?.isCurrentMonth ? 'day-header-inactive' : ''}">${day?.name || ''} ${day?.number || ''}</div>`;
            }
            dayNamesRowHtml += '</div>';

            const agentRowsHtml = agentsToRender.map(agent => {
                const agentId = String(agent.id);
                const agentName = agent.name || `Agente ${agentId}`;
                let agentRow = `<div class="agent-row"><div class="agent-label">${agentName}</div>`;

                for (let i = 0; i < 7; i++) {
                    const day = week.days[i.toString()];
                    let cellHtml = '<span class="shift-badge shift--">-</span>';
                    let currentShiftType = '-';
                    let existingShiftKey = null;

                    if (day?.shifts) {
                        const shiftEntry = Object.entries(day.shifts).find(([,s]) => String(s.agentId) === agentId);
                        if (shiftEntry) {
                            existingShiftKey = shiftEntry[0];
                            currentShiftType = shiftEntry[1].shiftType;

                            console.log(`[DEBUG - scheduleRenderer] Turno encontrado para Agente ${agentId} en ${day.date}: shiftType=${currentShiftType}`);
                            const displayTxt = getShiftDisplayText(currentShiftType);
                            const fullName = getShiftFullName(currentShiftType);
                            const className = `shift-${displayTxt}`;
                            console.log(`[DEBUG - scheduleRenderer] getShiftDisplayText('${currentShiftType}') = '${displayTxt}'`);
                            console.log(`[DEBUG - scheduleRenderer] Clase CSS esperada para el turno: '${className}'`);

                            cellHtml = `<span class="shift-badge shift-${displayTxt}" title="${fullName}">${displayTxt}</span>`;
                        }
                    }
                    
                    const actualDayDate = day?.date || '';
                    const isToday = actualDayDate === today;
                    const isClickable = day?.isCurrentMonth;
                    const isOwnShift = userProfile.role === 'guard' && String(userProfile.agentId) === String(agentId);
                    
                    const proposal = pendingProposalsCache.find(p => 
                        String(p.targetAgentId) === String(agentId) && 
                        formatDate(p.targetShiftDate, 'yyyy-MM-dd') === actualDayDate
                    );
                    const hasProposal = proposal && String(userProfile.agentId) === String(proposal.targetAgentId);
                    const dayCellClasses = `day-cell ${isToday ? 'today' : ''} ${isClickable ? 'clickable' : ''} ${isOwnShift ? 'own-shift' : ''} ${hasProposal ? 'has-pending-proposal' : ''}`;
                    const proposalIdAttr = hasProposal ? `data-proposal-id="${proposal.id}"` : '';

                    agentRow += `<div class="${dayCellClasses}" ${proposalIdAttr}
                                    data-week-key="${weekKey}" data-day-key="${i}" data-agent-id="${agentId}"
                                    data-current-shift-type="${currentShiftType}" data-existing-shift-key="${existingShiftKey || ''}"
                                    data-actual-day-date="${actualDayDate}" data-is-current-month="${day?.isCurrentMonth || false}">
                                    ${cellHtml}
                                </div>`;
                }
                return agentRow + '</div>';
            }).join('');

            return `<div class="week-card">${weekTitleHtml}<div class="week-days-container">${dayNamesRowHtml}${agentRowsHtml}</div></div>`;
        }).join('');

    scheduleContent.innerHTML = finalHtml;
    
    scheduleContent.querySelectorAll('.day-cell.clickable[data-is-current-month="true"]').forEach(cell => {
        cell.addEventListener('click', handleShiftClick);
    });
    console.log("[DEBUG - scheduleRenderer] Cuadrante de tarjetas renderizado.");
}

function handleShiftClick(event) {
    console.log("[DEBUG - scheduleRenderer] Clic en celda detectado.");
    const userProfile = currentUser.get(); // Obtener del átomo
    const cell = event.currentTarget;
    const { agentId, actualDayDate, currentShiftType, proposalId, weekKey, dayKey, isCurrentMonth } = cell.dataset;

    console.log(`[DEBUG - scheduleRenderer] Datos de la celda: Agente=${agentId}, Fecha=${actualDayDate}, Turno=${currentShiftType}, PropuestaID=${proposalId || 'none'}, WeekKey=${weekKey}, DayKey=${dayKey}, IsCurrentMonth=${isCurrentMonth}`);
    console.log("[DEBUG - scheduleRenderer] Perfil de usuario en handleShiftClick:", userProfile);

    if (!userProfile) {
        console.warn("[DEBUG - scheduleRenderer] Clic en celda sin perfil de usuario. Ignorado.");
        return;
    }

    if (userProfile.role === 'admin') {
        console.log("[DEBUG - scheduleRenderer] Usuario es admin. Intentando abrir modal de edición de turno.");
        openEditShiftModal(weekKey, dayKey, agentId, currentShiftType, actualDayDate, cell);
        return;
    }

    if (userProfile.role === 'guard') {
        if (proposalId && String(userProfile.agentId) === String(agentId)) {
            console.log("[DEBUG - scheduleRenderer] Es turno del guardia con propuesta pendiente para él. Abriendo modal de respuesta.");
            openRespondToProposalModal(proposalId);
        } else if (String(userProfile.agentId) === String(agentId)) {
            console.log("[DEBUG - scheduleRenderer] Es turno propio del guardia SIN propuesta. Abriendo modal de propuesta de cambio.");
            openProposeChangeModal(agentId, actualDayDate, currentShiftType);
        } else {
            console.log("[DEBUG - scheduleRenderer] Es turno de otro sin propuesta para este guardia. No se realiza acción para guardias.");
        }
    }
}

export async function render() {
    console.log("[DEBUG - scheduleRenderer] Función 'render' llamada.");
    const userProfile = currentUser.get(); // Obtener del átomo
    if (!userProfile) {
        console.warn("[DEBUG - scheduleRenderer] No hay perfil de usuario en 'render'. Mostrando mensaje de carga.");
        document.getElementById('schedule-content').innerHTML = '<p class="info-message">Cargando usuario...</p>';
        return;
    }

    if (userProfile.role === 'guard') {
        console.log("[DEBUG - scheduleRenderer] Usuario es guardia. Cargando propuestas pendientes...");
        try {
            const allRequests = await getShiftChangeRequests({ status: 'Pendiente_Target' });
            pendingProposalsCache = allRequests.filter(req => String(req.targetAgentId) === String(userProfile.agentId));
            console.log("[DEBUG - scheduleRenderer] Propuestas pendientes cacheadas para guardia:", pendingProposalsCache);
        } catch (e) {
            console.error("ERROR - scheduleRenderer: Error al cargar propuestas pendientes:", e);
            pendingProposalsCache = [];
        }
    } else {
        pendingProposalsCache = [];
        console.log("[DEBUG - scheduleRenderer] Usuario no es guardia. Cache de propuestas vacía.");
    }

    const context = {
        view: currentView.get(), // Obtener del átomo
        data: scheduleData.get(), // Obtener del átomo
        agentId: selectedAgentId.get(), // Obtener del átomo
        userProfile: userProfile
    };
    
    console.log("[DEBUG - scheduleRenderer] Contexto para renderizado:", context);

    const scheduleContent = document.getElementById('schedule-content'); // Obtener referencia aquí
    if (!context.data) {
        console.warn("[DEBUG - scheduleRenderer] No hay datos de cuadrante en el contexto. Mostrando mensaje de no disponible.");
        scheduleContent.innerHTML = '<p class="info-message">No hay cuadrante disponible para este mes.</p>';
        return;
    }
    
    if (context.view === 'tarjetas') {
        console.log("[DEBUG - scheduleRenderer] Renderizando vista de tarjetas.");
        displayScheduleCardView(context);
    } else if (context.view === 'calendario') {
        console.log("[DEBUG - scheduleRenderer] Renderizando vista de calendario.");
        renderAvailabilityView(); // Esta función internamente ya accede a los átomos
    }
}

// Suscripciones a Nanostores para re-renderizar
currentView.subscribe(render);
scheduleData.subscribe(render);
selectedAgentId.subscribe(render);
currentUser.subscribe(render);