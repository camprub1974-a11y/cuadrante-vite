import { renderContext, currentView, availableAgents, currentUser } from '../state.js';
import { renderAvailabilityView } from './availabilityRenderer.js';
import { openShiftModal } from './shiftModal.js';
import { formatDate, getShiftDisplayText, getShiftFullName, parseISO } from '../utils.js';
import { openProposeChangeModal } from './proposeChangeModal.js';
import { EXTRA_SERVICE_TYPES } from '../constants.js';

// ✅ CORRECCIÓN: Se añade la palabra 'export' para que la función esté disponible para otros archivos.
export function getAgentName(agentId) {
    const agent = availableAgents.get().find(a => String(a.id) === String(agentId));
    return agent ? agent.name : `ID ${agentId}`;
}

function renderGraphicalScheduleView({ scheduleData: data, selectedAgentId: selectedAgent }) {
    const desktopViewContainer = document.querySelector('.schedule-desktop-view');
    if (!desktopViewContainer) return;
    desktopViewContainer.innerHTML = ''; 

    if (!data || !data.weeks) {
        desktopViewContainer.innerHTML = '<p class="info-message">No hay datos de cuadrante disponibles.</p>';
        return;
    }

    let agentsToDisplay = availableAgents.get();
    if (selectedAgent && selectedAgent !== 'all') {
        agentsToDisplay = agentsToDisplay.filter(agent => String(agent.id) === String(selectedAgent));
    }
    
    agentsToDisplay.sort((a,b) => (a.name || a.id).localeCompare(b.name || b.id));
    const sortedWeeks = Object.entries(data.weeks).sort(([weekKeyA], [weekKeyB]) => parseInt(weekKeyA.replace('week', '')) - parseInt(weekKeyB.replace('week', '')));
    
    sortedWeeks.forEach(([weekKey, week]) => {
        const hasDaysInCurrentMonth = Object.values(week.days).some(day => day.isCurrentMonth);
        if (!hasDaysInCurrentMonth) return;

        const weekCard = document.createElement('div');
        weekCard.className = 'card week-card';
        
        const sortedDayKeys = Object.keys(week.days).sort((a, b) => parseInt(a) - parseInt(b));
        const firstDayOfWeek = week.days[sortedDayKeys[0]];
        const lastDayOfWeek = week.days[sortedDayKeys[sortedDayKeys.length - 1]];

        const formattedStartDate = firstDayOfWeek ? formatDate(parseISO(firstDayOfWeek.date), 'dd/MM') : '';
        const formattedEndDate = lastDayOfWeek ? formatDate(parseISO(lastDayOfWeek.date), 'dd/MM/yyyy') : '';

        weekCard.innerHTML = `<h3>Semana del ${formattedStartDate} al ${formattedEndDate}</h3>`;
        
        const scheduleTable = document.createElement('table');
        scheduleTable.className = 'schedule-table';
        
        let headerRowHtml = '<thead><tr><th class="agent-name-header">Agente</th>';
        sortedDayKeys.forEach(dayKey => {
            const day = week.days[dayKey];
            headerRowHtml += `<th class="day-header">${day.name} ${day.number}</th>`;
        });
        headerRowHtml += '</tr></thead>';
        scheduleTable.innerHTML = headerRowHtml;

        const tbody = document.createElement('tbody');
        agentsToDisplay.forEach(agent => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="agent-cell">${agent.name}</td>`;
            sortedDayKeys.forEach(dayKey => {
                const day = week.days[dayKey];
                let currentShiftType = '-';
                if (day?.shifts) {
                    const shiftEntry = Object.entries(day.shifts).find(([,s]) => String(s.agentId) === String(agent.id));
                    if (shiftEntry) currentShiftType = shiftEntry[1].shiftType;
                }
                const cell = document.createElement('td');
                cell.className = 'shift-cell';
                if (day && !day.isCurrentMonth) cell.classList.add('day-off-month');
                
                const displayTxt = getShiftDisplayText(currentShiftType);
                const fullName = getShiftFullName(currentShiftType);
                const shiftBadge = document.createElement('span');
                shiftBadge.className = `turno-icon shift-${displayTxt}`;
                shiftBadge.textContent = displayTxt;
                shiftBadge.title = fullName;
                cell.appendChild(shiftBadge);
                
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });
        scheduleTable.appendChild(tbody);
        weekCard.appendChild(scheduleTable);
        desktopViewContainer.appendChild(weekCard);
    });
}

function renderMobileScheduleView({ scheduleData: data, selectedAgentId: selectedAgent, userProfile }) {
    const mobileViewContainer = document.querySelector('.schedule-mobile-view');
    if (!mobileViewContainer) return;
    mobileViewContainer.innerHTML = '';
    if (!data || !data.weeks || Object.keys(data.weeks).length === 0) {
        mobileViewContainer.innerHTML = '<p class="info-message">No hay datos de cuadrante disponibles.</p>';
        return;
    }
    let agentsToDisplay = availableAgents.get();
    if (selectedAgent && selectedAgent !== 'all') {
        agentsToDisplay = agentsToDisplay.filter(agent => String(agent.id) === String(selectedAgent));
    }
    if (agentsToDisplay.length === 0) {
        mobileViewContainer.innerHTML = '<p class="info-message">No hay agentes para mostrar.</p>';
        return;
    }
    const allDays = Object.values(data.weeks).flatMap(week => Object.values(week.days)).sort((a,b) => new Date(a.date) - new Date(b.date));
    allDays.forEach(day => {
        if (!day.isCurrentMonth) return;
        const dayCard = document.createElement('div');
        dayCard.className = 'mobile-day-card';
        const dayHeader = document.createElement('div');
        dayHeader.className = 'mobile-day-header';
        dayHeader.innerHTML = `<span class="day-name">${day.name}</span><span class="day-number">${day.number}</span><span class="material-icons expand-icon">expand_more</span>`;
        const dayContent = document.createElement('div');
        dayContent.className = 'mobile-day-content hidden';
        agentsToDisplay.forEach(agent => {
            let shiftType = '-';
            if (day.shifts) {
                const shiftEntry = Object.values(day.shifts).find(s => String(s.agentId) === String(agent.id));
                if (shiftEntry) shiftType = shiftEntry.shiftType;
            }
            const shiftItem = document.createElement('div');
            shiftItem.className = 'mobile-shift-item';
            const displayTxt = getShiftDisplayText(shiftType);
            shiftItem.innerHTML = `<span class="agent-name">${agent.name}</span><span class="shift-badge-mobile shift-${displayTxt}">${displayTxt}</span>`;
            dayContent.appendChild(shiftItem);
        });
        dayCard.appendChild(dayHeader);
        dayCard.appendChild(dayContent);
        mobileViewContainer.appendChild(dayCard);
        dayHeader.addEventListener('click', () => {
            dayCard.classList.toggle('is-open');
            dayContent.classList.toggle('hidden');
        });
    });
}

function handleShiftClick(event) {
    const userProfile = currentUser.get();
    const cell = event.currentTarget;
    const { monthId, weekKey, dayKey, agentId, agentName, dayDate, currentShiftType } = cell.dataset;
    if (!userProfile || !agentId || !dayDate) return;
    if (userProfile.role === 'admin' || userProfile.role === 'supervisor') {
        const shiftData = { monthId, weekKey, dayKey, agentId, agentName, dayDate, shiftType: currentShiftType };
        openShiftModal(shiftData);
    } else if (userProfile.role === 'guard') {
        const isOwnShift = String(userProfile.agentId) === String(agentId);
        if (isOwnShift) {
            openProposeChangeModal(agentId, dayDate, currentShiftType);
        }
    }
}

export function render(context) {
    const scheduleContent = document.getElementById('schedule-content');
    if (!scheduleContent) return;
    
    const { userProfile, scheduleData: currentScheduleData, currentView: viewType } = context;

    if (!userProfile || !currentScheduleData) {
        if (!scheduleContent.innerHTML.trim()) {
            scheduleContent.innerHTML = '<p class="info-message">Cargando...</p>';
        }
        return;
    }
    
    scheduleContent.innerHTML = '<div class="schedule-desktop-view"></div><div class="schedule-mobile-view"></div>';
    const isMobile = window.innerWidth <= 768;

    if (viewType === 'calendario') {
        renderAvailabilityView(context);
    } else if (isMobile) {
        renderMobileScheduleView(context);
    } else {
        renderGraphicalScheduleView(context);
    }
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        render(renderContext.get());
    }, 250);
});

// ✅ ESTA LÍNEA ES LA CORRECTA: USA .subscribe EN LUGAR DE .listen
renderContext.subscribe(render);