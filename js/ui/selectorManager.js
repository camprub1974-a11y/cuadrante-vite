// js/ui/selectorManager.js (VERSIÓN CORREGIDA Y ROBUSTA)

import {
<<<<<<< HEAD
    selectedYear,
    selectedMonthId,
    selectedAgentId,
    setDate,
    availableAgents,
    currentUser,
    MESES
=======
  selectedYear,
  selectedMonthId,
  selectedAgentId,
  setDate,
  setAgent,
  agentSelectorContext,
  currentMonthTitle,
  currentView,
  currentUser,
  availableAgents,
  setView,
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
} from '../state.js';

/**
 * Inicializa los selectores principales de la vista Cuadrante (los que controlan el estado global).
 */
export async function initSelectors() {
<<<<<<< HEAD
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
=======
  // --- OBTENCIÓN DE ELEMENTOS DEL DOM ---
  const yearSelect = document.getElementById('year-select');
  const monthSelect = document.getElementById('month-select');
  const agentSelect = document.getElementById('agent-select');
  const prevMonthButton = document.getElementById('prevMonthButton');
  const nextMonthButton = document.getElementById('nextMonthButton');
  const monthTitleElement = document.getElementById('currentMonthTitle');

  const managementSelectorBtn = document.getElementById('management-selector-btn');
  const userRequestsBtn = document.getElementById('user-requests-btn');
  const viewSelectorBtn = document.getElementById('view-selector-btn');
  const extraServiceBtn = document.getElementById('extra-service-btn');
  const extraServicesContainer = document.getElementById('extra-services-stats-container');
  const sidebarColumn = document.querySelector('.sidebar-column');

  // ✅ MEJORA DE ROBUSTEZ APLICADA
  // Se comprueba si los elementos esenciales existen ANTES de continuar.
  // Si falta alguno, se muestra un error en la consola y la función se detiene para evitar un 'crash'.
  if (!yearSelect || !monthSelect || !agentSelect || !prevMonthButton || !nextMonthButton) {
    console.error(
      '[ERROR SelectorManager] Faltan elementos DOM esenciales para los selectores (año, mes, agente o botones de navegación).'
    );
    return; // Detiene la ejecución de la función.
  }

  // --- EVENT LISTENERS ---
  const triggerLoad = () => {
    loadAndDisplaySchedule(selectedMonthId.get(), selectedAgentId.get());
  };

  yearSelect.addEventListener('change', (e) => {
    const newYear = parseInt(e.target.value);
    const months = generateMonthsForYear(newYear);
    setDate(newYear, months[0].id);
    triggerLoad();
  });

  monthSelect.addEventListener('change', (e) => {
    setDate(selectedYear.get(), e.target.value);
    triggerLoad();
  });

  agentSelect.addEventListener('change', (e) => {
    setAgent(String(e.target.value));
    triggerLoad();
  });

  const handlePrevMonth = () => {
    const currentMonthId = selectedMonthId.get();
    const currentYear = selectedYear.get();
    const monthIndex = getMonthNumberFromName(currentMonthId.split('_')[1]);
    let newMonth = monthIndex - 1;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    const newMonthId = `cuadrante_${formatDate(new Date(newYear, newMonth, 1), 'MMMM', { locale: 'es' }).toLowerCase()}_${newYear}`;
    setDate(newYear, newMonthId);
    triggerLoad();
  };

  const handleNextMonth = () => {
    const currentMonthId = selectedMonthId.get();
    const currentYear = selectedYear.get();
    const monthIndex = getMonthNumberFromName(currentMonthId.split('_')[1]);
    let newMonth = monthIndex + 1;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    const newMonthId = `cuadrante_${formatDate(new Date(newYear, newMonth, 1), 'MMMM', { locale: 'es' }).toLowerCase()}_${newYear}`;
    setDate(newYear, newMonthId);
    triggerLoad();
  };

  // Limpiamos listeners antiguos antes de añadir los nuevos para evitar duplicados
  let newPrevButton = prevMonthButton.cloneNode(true);
  prevMonthButton.parentNode.replaceChild(newPrevButton, prevMonthButton);
  newPrevButton.addEventListener('click', handlePrevMonth);

  let newNextButton = nextMonthButton.cloneNode(true);
  nextMonthButton.parentNode.replaceChild(newNextButton, nextMonthButton);
  newNextButton.addEventListener('click', handleNextMonth);

  // --- SUSCRIPCIONES A ESTADOS ---
  selectedYear.subscribe((newYear) => {
    const currentSystemYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let i = currentSystemYear - 5; i <= currentSystemYear + 5; i++) {
      yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    }
    yearSelect.value = newYear;
  });

  selectedMonthId.subscribe((newMonthId) => {
    if (!newMonthId) return;
    const currentYear = selectedYear.get();
    const months = generateMonthsForYear(currentYear);
    monthSelect.innerHTML = months
      .map((m) => `<option value="${m.id}">${m.name}</option>`)
      .join('');
    monthSelect.value = newMonthId;
    const monthObject = months.find((m) => m.id === newMonthId);
    if (monthObject && monthTitleElement) {
      // Verificamos que monthTitleElement exista antes de usarlo
      currentMonthTitle.set(`${monthObject.name} de ${currentYear}`);
    }
  });

  // El elemento monthTitleElement es opcional, ya que los selectores ahora muestran mes y año.
  if (monthTitleElement) {
    currentMonthTitle.subscribe((title) => {
      monthTitleElement.textContent = title;
    });
  }

  const renderAgentSelector = () => {
    const { isAdmin, currentUser: userProfile } = agentSelectorContext.get();
    const activeView = currentView.get();
    const agents = availableAgents.get();
    let options = [];
    let shouldBeDisabled = false;

    if (isAdmin) {
      options.push({ value: 'all', text: 'Todos los Agentes' });
      agents.forEach((agent) => options.push({ value: String(agent.id), text: agent.name }));
    } else if (userProfile) {
      const userAgent = agents.find((agent) => String(agent.id) === String(userProfile.agentId));

      if (activeView === 'calendario') {
        if (userAgent) options.push({ value: String(userAgent.id), text: userAgent.name });
        shouldBeDisabled = true;
      } else {
        options.push({ value: 'all', text: 'Todos los Agentes' });
        if (userAgent) options.push({ value: String(userAgent.id), text: userAgent.name });
        shouldBeDisabled = false;
      }
    }

    agentSelect.innerHTML = options
      .map((opt) => `<option value="${opt.value}">${opt.text}</option>`)
      .join('');
    agentSelect.disabled = shouldBeDisabled;

    const currentAgentValue = selectedAgentId.get();
    if (options.some((opt) => opt.value === currentAgentValue)) {
      agentSelect.value = currentAgentValue;
    } else if (options.length > 0) {
      setAgent(options[0].value);
    }
  };
  agentSelectorContext.subscribe(renderAgentSelector);
  currentView.subscribe(renderAgentSelector);

  selectedAgentId.subscribe((agentId) => {
    if (agentSelect.value !== agentId) agentSelect.value = agentId;
  });

  // --- LÓGICA DE CARGA INICIAL ---
  const today = new Date();
  const initialYear = today.getFullYear();
  const initialMonthName = formatDate(today, 'MMMM', { locale: 'es' }).toLowerCase();
  const initialMonthId = `cuadrante_${initialMonthName}_${initialYear}`;
  const user = currentUser.get();

  if (user && user.role === 'supervisor') {
    setView('tarjetas');
    setAgent('all');
    if (viewSelectorBtn) viewSelectorBtn.disabled = true;
    if (agentSelect) agentSelect.disabled = true;
    if (managementSelectorBtn) managementSelectorBtn.style.display = 'none';
    if (userRequestsBtn) userRequestsBtn.style.display = 'none';
    if (extraServiceBtn) extraServiceBtn.style.display = 'none';
    if (extraServicesContainer) extraServicesContainer.style.display = 'none';
    if (sidebarColumn) sidebarColumn.style.display = 'none';
  } else if (user) {
    const initialAgent = user.role === 'admin' ? 'all' : String(user.agentId || '');
    setAgent(initialAgent);

    if (viewSelectorBtn) viewSelectorBtn.disabled = false;

    if (managementSelectorBtn) {
      managementSelectorBtn.style.display = user.role === 'admin' ? 'inline-flex' : 'none';
    }
    if (userRequestsBtn) {
      userRequestsBtn.style.display = user.role === 'guard' ? 'inline-flex' : 'none';
    }

    if (extraServiceBtn) extraServiceBtn.style.display = 'inline-flex';
    if (extraServicesContainer) extraServicesContainer.style.display = 'block';
  }

  setDate(initialYear, initialMonthId);
  await loadAndDisplaySchedule(selectedMonthId.get(), selectedAgentId.get());
}

// =====================================================================
// == ✅ AÑADE ESTAS NUEVAS FUNCIONES EXPORTABLES AL FINAL DEL ARCHIVO ==
// =====================================================================

/**
 * Rellena un elemento <select> con una lista de años.
 * @param {HTMLSelectElement} selectElement - El elemento <select> a rellenar.
 */
export function populateYearSelector(selectElement) {
  if (!selectElement) return;
  const currentYear = new Date().getFullYear();
  let optionsHtml = '';
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    optionsHtml += `<option value="${i}">${i}</option>`;
  }
  selectElement.innerHTML = optionsHtml;
  selectElement.value = currentYear; // Selecciona el año actual por defecto
}

/**
 * Rellena un elemento <select> con los meses del año.
 * @param {HTMLSelectElement} selectElement - El elemento <select> a rellenar.
 */
export function populateMonthSelector(selectElement) {
  if (!selectElement) return;
  const months = [
    { value: 'all', name: 'Todos los Meses' },
    { value: '1', name: 'Enero' }, { value: '2', name: 'Febrero' },
    { value: '3', name: 'Marzo' }, { value: '4', name: 'Abril' },
    { value: '5', name: 'Mayo' }, { value: '6', name: 'Junio' },
    { value: '7', name: 'Julio' }, { value: '8', name: 'Agosto' },
    { value: '9', name: 'Septiembre' }, { value: '10', name: 'Octubre' },
    { value: '11', name: 'Noviembre' }, { value: '12', name: 'Diciembre' }
  ];
  selectElement.innerHTML = months.map(m => `<option value="${m.value}">${m.name}</option>`).join('');
}

/**
 * Rellena un elemento <select> con la lista de agentes disponibles.
 * @param {HTMLSelectElement} selectElement - El elemento <select> a rellenar.
 * @param {boolean} includeAllOption - Si es true, añade la opción "Todos los Agentes".
 */
export function populateAgentSelector(selectElement, includeAllOption = false) {
  if (!selectElement) return;
  const agents = availableAgents.get(); // Obtiene los agentes del estado global
  let optionsHtml = '';
  
  if (includeAllOption) {
    optionsHtml += `<option value="all">Todos los Agentes</option>`;
  }
  
  agents.forEach(agent => {
    optionsHtml += `<option value="${agent.id}">${agent.name}</option>`;
  });
  
  selectElement.innerHTML = optionsHtml;
}
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
