// js/ui/selectorManager.js (VERSIÓN CORREGIDA Y ROBUSTA)

import {
    selectedYear,
    selectedMonthId,
    selectedAgentId,
    setDate,
    availableAgents,
    currentUser,
    MESES
} from '../state.js';

/**
 * Inicializa los selectores principales de la vista Cuadrante (los que controlan el estado global).
 */
export async function initSelectors() {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const agentSelect = document.getElementById('agent-select');
    const prevMonthButton = document.getElementById('prevMonthButton');
    const nextMonthButton = document.getElementById('nextMonthButton');
    const monthTitleElement = document.getElementById('currentMonthTitle');

    if (!yearSelect || !monthSelect || !agentSelect || !prevMonthButton || !nextMonthButton || !monthTitleElement) {
        console.error('[SelectorManager] Faltan elementos DOM esenciales para los controles del cuadrante.');
        return;
    }

    // --- SINCRONIZACIÓN INICIAL ---
    populateYearSelector(yearSelect);
    populateMonthSelectorForSchedule(monthSelect);
    populateAgentSelector(agentSelect, true);

    // --- LISTENERS PARA ACTUALIZAR EL ESTADO ---

    // Al cambiar el año
    yearSelect.addEventListener('change', () => {
        const newYear = parseInt(yearSelect.value, 10);
        const currentMonthIndex = MESES.indexOf(selectedMonthId.get().split('_')[1]);
        const newMonthId = `cuadrante_${MESES[currentMonthIndex]}_${newYear}`;
        
        setDate(newYear, newMonthId, selectedAgentId.get()); // Actualiza el estado
        populateMonthSelectorForSchedule(monthSelect); // <- LA CLAVE: Regenera los meses
        monthSelect.value = newMonthId; // Vuelve a seleccionar el mes correcto
    });

    // Al cambiar el mes
    monthSelect.addEventListener('change', () => {
        const newMonthId = monthSelect.value;
        const newYear = parseInt(newMonthId.split('_')[2], 10);
        setDate(newYear, newMonthId, selectedAgentId.get());
    });

    // Al cambiar el agente
    agentSelect.addEventListener('change', () => {
        setDate(selectedYear.get(), selectedMonthId.get(), agentSelect.value);
    });

    // Botones de navegación de mes
    prevMonthButton.addEventListener('click', () => navigateMonth(-1));
    nextMonthButton.addEventListener('click', () => navigateMonth(1));

    // --- SUSCRIPCIONES AL ESTADO PARA ACTUALIZAR LA UI ---

    selectedYear.subscribe((year) => {
        if (parseInt(yearSelect.value, 10) !== year) {
            yearSelect.value = year;
        }
    });

    selectedMonthId.subscribe((monthId) => {
        if (monthSelect.value !== monthId) {
            monthSelect.value = monthId;
        }
        if (monthId) {
            const [_, monthName, year] = monthId.split('_');
            monthTitleElement.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
        }
    });

    selectedAgentId.subscribe((agentId) => {
        if (agentSelect.value !== agentId) {
            agentSelect.value = agentId || 'all';
        }
    });

    // Carga inicial
    const initialMonthId = selectedMonthId.get();
    if(initialMonthId) {
        yearSelect.value = initialMonthId.split('_')[2];
        monthSelect.value = initialMonthId;
        agentSelect.value = selectedAgentId.get() || 'all';
    }
}

/**
 * Navega al mes anterior o siguiente.
 * @param {number} direction - (-1) para anterior, (1) para siguiente.
 */
function navigateMonth(direction) {
    const currentMonthId = selectedMonthId.get();
    const currentYear = selectedYear.get();
    const currentMonthName = currentMonthId.split('_')[1];
    const currentMonthIndex = MESES.indexOf(currentMonthName);

    let newMonthIndex = currentMonthIndex + direction;
    let newYear = currentYear;

    if (newMonthIndex < 0) {
        newMonthIndex = 11;
        newYear--;
    } else if (newMonthIndex > 11) {
        newMonthIndex = 0;
        newYear++;
    }

    const newMonthId = `cuadrante_${MESES[newMonthIndex]}_${newYear}`;
    setDate(newYear, newMonthId, selectedAgentId.get());
    populateMonthSelectorForSchedule(document.getElementById('month-select'));
}


// --- FUNCIONES UTILITARIAS EXPORTABLES ---

export function populateYearSelector(selectElement) {
    if (!selectElement) return;
    const currentYear = new Date().getFullYear();
    let optionsHtml = '';
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
        optionsHtml += `<option value="${i}">${i}</option>`;
    }
    selectElement.innerHTML = optionsHtml;
}

export function populateMonthSelector(selectElement) {
    if (!selectElement) return;
    let optionsHtml = '';
    MESES.forEach((monthName, index) => {
        const displayName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        optionsHtml += `<option value="${index}">${displayName}</option>`;
    });
    selectElement.innerHTML = optionsHtml;
}

function populateMonthSelectorForSchedule(selectElement) {
    if (!selectElement) return;
    const year = selectedYear.get();
    let optionsHtml = '';
    MESES.forEach(monthName => {
        const monthId = `cuadrante_${monthName}_${year}`;
        const displayName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        optionsHtml += `<option value="${monthId}">${displayName}</option>`;
    });
    selectElement.innerHTML = optionsHtml;
}

export function populateAgentSelector(selectElement, includeAllOption = false) {
    if (!selectElement) return;
    const user = currentUser.get();
    const allAgents = availableAgents.get();
    let optionsHtml = '';

    if (includeAllOption && user?.role === 'admin') {
        optionsHtml += `<option value="all">Todos los Agentes</option>`;
    }

    allAgents.forEach(agent => {
        const agentName = agent.name || `Agente ${agent.id}`;
        optionsHtml += `<option value="${String(agent.id)}">${agentName}</option>`;
    });

    selectElement.innerHTML = optionsHtml;

    if (user && user.role !== 'admin') {
        selectElement.disabled = true;
        if (user.agentId) {
            selectElement.value = String(user.agentId);
        }
    }
}