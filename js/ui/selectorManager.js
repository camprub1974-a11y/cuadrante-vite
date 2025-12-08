// js/ui/selectorManager.js (VERSIÓN CORREGIDA)

// *CORRECCIÓN 1: selectedYear, selectedMonthId, y selectedAgentId son funciones
// * o getters, no valores directos, por lo que su desestructuración
// * no tiene sentido si el estado se maneja como funciones.
// * Mantenemos solo las funciones set...
import {
  selectedYear,
  selectedMonthId,
  selectedAgentId,
  setDate,
  setAgent,
  availableAgents,
} from '/js/state.js';

import { generateMonthsForYear } from '/js/utils.js';
// *CORRECCIÓN 2: Para que las funciones auxiliares (populate...) puedan ser
// * utilizadas dentro de initSelectors, deben ser definidas
// * DENTRO del módulo y no necesitan ser exportadas
// * (a menos que se usen fuera de este archivo).
// * Si se usaran fuera, necesitarían 'export'. Si el
// * estado de la función es un problema, la solución más limpia es
// * definirlas aquí arriba o usar 'export' y luego importarlas.
// * Asumo que son internas y las defino ANTES de su uso.

// --- NUEVA FUNCIÓN AUXILIAR ---
// Esta función reemplaza la que intentabas importar.
function getMonthDetails(monthId) {
  if (!monthId || typeof monthId !== 'string') {
    // Devuelve valores por defecto para evitar errores
    return { monthName: '', year: new Date().getFullYear(), monthIndex: 0 };
  }
  const parts = monthId.split('_'); // ej: ["cuadrante", "enero", "2024"]
  const monthName = parts[1] || '';
  const year = parseInt(parts[2], 10) || new Date().getFullYear();
  
  // Array de meses para obtener el índice
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const monthIndex = MESES.indexOf(monthName);

  return { monthName, year, monthIndex };
}

// --- Funciones Auxiliares para poblar los selectores (DEFINIDAS PRIMERO) ---

export function populateYearSelector(select, selectedYearValue) {
  const currentYear = new Date().getFullYear();
  let optionsHtml = '';
  // Se agregó '...' para que el for-loop sea correcto.
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    optionsHtml += `<option value="${i}" ${i === selectedYearValue ? 'selected' : ''}>${i}</option>`;
  }
  select.innerHTML = optionsHtml;
}

export function populateMonthSelector(select, year) {
  const months = generateMonthsForYear(year);
  select.innerHTML = months.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

// REEMPLAZA TU FUNCIÓN populateAgentSelector ACTUAL POR ESTA:
export function populateAgentSelector(select, currentUser, agents) {
  let optionsHtml = '';
  
  // 1. La opción "Todos los Agentes" SIEMPRE está disponible
  optionsHtml += '<option value="all">Todos los Agentes</option>';

  if (currentUser?.role === 'admin' || currentUser?.role === 'supervisor') {
    // --- Lógica para Mandos (Admins/Supervisores) ---
    // Añaden todos los agentes disponibles a la lista
    agents.forEach(agent => {
      // Asegurar que 'agent' tenga 'id' y 'name'
      if (agent && agent.id && agent.name) {
          optionsHtml += `<option value="${agent.id}">${agent.name} (${agent.id})</option>`;
      }
    });
    // El selector está habilitado por defecto
    select.disabled = false; 

  } else {
    // --- Lógica para Agentes Normales ---
    // Añaden SOLAMENTE su propio ID a la lista
    const ownAgent = agents.find(agent => String(agent.id) === String(currentUser.agentId));
    if (ownAgent) {
        optionsHtml += `<option value="${ownAgent.id}">${ownAgent.name} (${ownAgent.id})</option>`;
    }
    // El selector está habilitado para que puedan cambiar entre 'Todos' y 'Yo'
    select.disabled = false; // ✅ ANTES ESTABA 'true'
  }

  select.innerHTML = optionsHtml;

  // Establecer el valor seleccionado actual (que viene del estado global)
  // No necesitamos forzar el valor aquí, el estado lo controla.
  // select.value = selectedAgentId.get(); // Esta línea se puede quitar o dejar, el estado manda.
}

/**
 * Initializes all selectors and listeners for the quadrant view.
 * @param {object} currentUser - The currently logged-in user object.
 */
export function initSelectors(currentUser) {
  // --- 1. Get DOM Elements ---
  const yearSelect = document.getElementById('year-select');
  const monthSelect = document.getElementById('month-select');
  const agentSelect = document.getElementById('agent-select');
  const prevMonthButton = document.getElementById('prevMonthButton');
  const nextMonthButton = document.getElementById('nextMonthButton');
  const monthTitleElement = document.getElementById('currentMonthTitle');

  if (!yearSelect || !monthSelect || !agentSelect || !prevMonthButton || !nextMonthButton || !monthTitleElement) {
    console.error('[SelectorManager] Required DOM elements not found. Initialization failed.');
    return;
  }

  // --- 2. Populate Selectors ---
  const agents = availableAgents.get();
  populateAgentSelector(agentSelect, currentUser, agents);

  const initialYear = selectedYear.get();
  populateYearSelector(yearSelect, initialYear);
  populateMonthSelector(monthSelect, initialYear);

  // --- 3. Set Initial Values (using requestAnimationFrame) ---
  requestAnimationFrame(() => {
    try {
      const initialMonthId = selectedMonthId.get();
      if (agentSelect) {
           // Ensure the 'all' option actually exists before setting
           if (Array.from(agentSelect.options).some(opt => opt.value === 'all')) {
               agentSelect.value = 'all';
               console.log('[SelectorManager] Initial agent value set to "all" via rAF.');
           } else {
               console.warn('[SelectorManager] "all" option not found in agent select during rAF.');
           }
      }
      if (monthSelect && initialMonthId) {
          if (Array.from(monthSelect.options).some(opt => opt.value === initialMonthId)) {
              monthSelect.value = initialMonthId;
              console.log(`[SelectorManager] Initial month value set to "${initialMonthId}" via rAF.`);
          } else {
               console.warn(`[SelectorManager] Initial month ID ${initialMonthId} not found in options during rAF.`);
               // Optionally set a default like the first option if the state value isn't there
               // monthSelect.selectedIndex = 0; 
          }
      }
      // Update title based on initial month
      if (initialMonthId && monthTitleElement) {
         const { monthName, year } = getMonthDetails(initialMonthId);
         monthTitleElement.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
      }

    } catch (e) {
      console.error('[SelectorManager] Error setting initial values in rAF:', e);
    }
  });

  // --- 4. Define Event Handlers ---
  const handleYearChange = () => {
    const newYear = parseInt(yearSelect.value, 10);
    // Determine the current month name to keep it when changing year
    const currentMonthName = getMonthDetails(selectedMonthId.get()).monthName;
    const newMonthId = `cuadrante_${currentMonthName}_${newYear}`;
    // Update the state (this will trigger subscriptions)
    setDate(newYear, newMonthId);
  };

  const handleMonthChange = () => {
    const newMonthId = monthSelect.value;
    const newYear = getMonthDetails(newMonthId).year;
    // Update the state (this will trigger subscriptions)
    setDate(newYear, newMonthId);
  };

  const handleAgentChange = () => {
    // Update the state (this will trigger subscriptions)
    setAgent(agentSelect.value);
  };

  const navigateMonth = (direction) => {
    const currentMonthId = selectedMonthId.get();
    let { monthIndex, year } = getMonthDetails(currentMonthId);
    let newMonthIndex = monthIndex + direction;
    let newYear = year;
    if (newMonthIndex < 0) { newMonthIndex = 11; newYear--; }
    else if (newMonthIndex > 11) { newMonthIndex = 0; newYear++; }
    const months = generateMonthsForYear(newYear); // Assumes this util works correctly
    // Ensure the index is valid for the generated months
    if (newMonthIndex >= 0 && newMonthIndex < months.length) {
        const newMonthId = months[newMonthIndex].id;
        // Update the state (this will trigger subscriptions)
        setDate(newYear, newMonthId);
    } else {
        console.error(`[SelectorManager] Calculated invalid month index ${newMonthIndex} for year ${newYear}`);
    }
  };

  // --- 5. Assign Event Listeners ---
  yearSelect.addEventListener('change', handleYearChange);
  monthSelect.addEventListener('change', handleMonthChange);
  agentSelect.addEventListener('change', handleAgentChange);
  prevMonthButton.addEventListener('click', () => navigateMonth(-1));
  nextMonthButton.addEventListener('click', () => navigateMonth(1));

  // --- 6. Subscribe to State Changes (AFTER initial setup) ---
  selectedYear.subscribe((year) => {
    if (parseInt(yearSelect.value, 10) !== year) {
      // Update year selector visually if state changes externally
      populateYearSelector(yearSelect, year);
    }
    // Repopulate month selector when year changes
    populateMonthSelector(monthSelect, year);
    // Try to set the correct month value after repopulating
    const currentMonthId = selectedMonthId.get();
    if (Array.from(monthSelect.options).some(opt => opt.value === currentMonthId)) {
        monthSelect.value = currentMonthId;
    } else {
        // If current month doesn't exist in new year, maybe select first month?
        monthSelect.selectedIndex = 0;
        // Or trigger a state update to the first month of the new year
        // handleMonthChange(); // Be careful of infinite loops if state updates trigger this
    }
  });

  selectedMonthId.subscribe((monthId) => {
    // Update month selector visual state
    if (monthSelect.value !== monthId) {
        if (Array.from(monthSelect.options).some(opt => opt.value === monthId)) {
            monthSelect.value = monthId;
        } else {
             console.warn(`[SelectorManager] Month ID ${monthId} from state not found in options.`);
        }
    }
    // Update title display
    const { monthName, year } = getMonthDetails(monthId);
    if (monthTitleElement) { // Check if element exists
        monthTitleElement.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
    }
    // Ensure year selector matches
    if (parseInt(yearSelect.value, 10) !== year) {
        yearSelect.value = year; // Directly update year selector visual
    }
  });

  selectedAgentId.subscribe((agentId) => {
    // Update agent selector visual state
    if (agentSelect.value !== agentId) {
        if (Array.from(agentSelect.options).some(opt => opt.value === agentId)) {
            agentSelect.value = agentId;
            console.log(`[SelectorManager] Agent selector updated to ${agentId} via subscription.`);
        } else {
            console.warn(`[SelectorManager] Agent ID ${agentId} from state not found in options. Setting visual to 'all'.`);
            agentSelect.value = 'all'; // Fallback visual state if ID not found
        }
    }
  });

  console.log('[SelectorManager] Selectors initialized and subscriptions active.');
}