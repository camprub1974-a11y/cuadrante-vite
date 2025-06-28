// js/ui/selectorManager.js

import {
    selectedYear, selectedMonthId, selectedAgentId,
    setDate, setAgent, agentSelectorContext,
    currentMonthTitle, currentView, currentUser, availableAgents
} from '../state.js';
import { generateMonthsForYear, formatDate, getMonthNumberFromName } from '../utils.js';
import { loadAndDisplaySchedule } from '../logic.js';

export async function initSelectors() {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const agentSelect = document.getElementById('agent-select');
    const prevMonthButton = document.getElementById('prevMonthButton');
    const nextMonthButton = document.getElementById('nextMonthButton');
    const monthTitleElement = document.getElementById('currentMonthTitle');
    const scheduleContent = document.getElementById('schedule-content');
    const printButton = document.getElementById('printButton');
    const seasonalShiftNote = document.getElementById('seasonal-shift-note');

    console.log("[DEBUG SelectorManager] Inicializando selectores. Elementos encontrados:", 
        { yearSelect: !!yearSelect, monthSelect: !!monthSelect, agentSelect: !!agentSelect, 
          prevMonthButton: !!prevMonthButton, nextMonthButton: !!nextMonthButton, monthTitleElement: !!monthTitleElement,
          scheduleContent: !!scheduleContent, printButton: !!printButton, seasonalShiftNote: !!seasonalShiftNote });

    if (!yearSelect || !monthSelect || !agentSelect || !prevMonthButton || !nextMonthButton || !monthTitleElement || !scheduleContent || !printButton || !seasonalShiftNote) {
        console.error("[ERROR SelectorManager] Faltan elementos DOM esenciales para los selectores o la carga del cuadrante. Abortando inicialización de selectores.");
        return;
    }

    // 1. Asignar listeners
    yearSelect.addEventListener('change', (e) => {
        const newYear = parseInt(e.target.value);
        const months = generateMonthsForYear(newYear);
        const currentMonthId = selectedMonthId.get();
        let newMonthId = months[0].id;
        if (currentMonthId) {
            const currentMonthName = currentMonthId.split('_')[1];
            const existingMonthInNewYear = months.find(m => m.name.toLowerCase() === currentMonthName);
            if (existingMonthInNewYear) {
                newMonthId = existingMonthInNewYear.id;
            }
        }
        setDate(newYear, newMonthId);
        console.log(`[DEBUG SelectorManager] Evento: Año cambiado a: ${newYear}, mes establecido a: ${newMonthId}`);
    });

    monthSelect.addEventListener('change', (e) => {
        setDate(selectedYear.get(), e.target.value);
        console.log(`[DEBUG SelectorManager] Evento: Mes cambiado a: ${e.target.value}`);
    });

    agentSelect.addEventListener('change', (e) => {
        setAgent(String(e.target.value));
        console.log(`[DEBUG SelectorManager] Evento: Agente cambiado a: ${e.target.value}`);
    });
    
    // Lógica para botones de navegación de mes
    prevMonthButton.addEventListener('click', () => {
        const currentMonthId = selectedMonthId.get();
        const currentYear = selectedYear.get();
        if (!currentMonthId || !currentYear) {
            console.warn("[DEBUG SelectorManager] No se puede navegar: mes o año no definidos.");
            return;
        }

        const [_, monthName, yearStr] = currentMonthId.split('_');
        const monthIndex = getMonthNumberFromName(monthName);

        let newMonth = monthIndex - 1;
        let newYear = currentYear;

        if (newMonth < 0) {
            newMonth = 11; // Diciembre
            newYear--;
        }
        const newMonthDate = new Date(newYear, newMonth, 1);
        const newMonthName = formatDate(newMonthDate, 'MMMM', { locale: 'es' }).toLowerCase();
        const newMonthId = `cuadrante_${newMonthName}_${newYear}`;
        
        setDate(newYear, newMonthId);
        console.log(`[DEBUG SelectorManager] Evento: Navegar a mes anterior: ${newMonthId}`);
    });

    nextMonthButton.addEventListener('click', () => {
        const currentMonthId = selectedMonthId.get();
        const currentYear = selectedYear.get();
        if (!currentMonthId || !currentYear) {
            console.warn("[DEBUG SelectorManager] No se puede navegar: mes o año no definidos.");
            return;
        }

        const [_, monthName, yearStr] = currentMonthId.split('_');
        const monthIndex = getMonthNumberFromName(monthName);

        let newMonth = monthIndex + 1;
        let newYear = currentYear;

        if (newMonth > 11) {
            newMonth = 0; // Enero
            newYear++;
        }
        const newMonthDate = new Date(newYear, newMonth, 1);
        const newMonthName = formatDate(newMonthDate, 'MMMM', { locale: 'es' }).toLowerCase();
        const newMonthId = `cuadrante_${newMonthName}_${newYear}`;

        setDate(newYear, newMonthId);
        console.log(`[DEBUG SelectorManager] Evento: Navegar a mes siguiente: ${newMonthId}`);
    });

    // 2. Suscribir UI a cambios de estado
    selectedYear.subscribe(newYear => {
        const currentSystemYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        for (let i = currentSystemYear - 5; i <= currentSystemYear + 5; i++) {
            yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
        }
        yearSelect.value = newYear;
        console.log(`[DEBUG SelectorManager] Suscripción: Selector de año actualizado a: ${newYear}`);
    });

    selectedMonthId.subscribe(async (newMonthId) => {
        if (newMonthId) {
            const currentYear = selectedYear.get(); 
            const months = generateMonthsForYear(currentYear);
            console.log("[DEBUG SelectorManager] Suscripción: Meses generados para el año actual:", months);
            monthSelect.innerHTML = months.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
            monthSelect.value = newMonthId;
            console.log(`[DEBUG SelectorManager] Suscripción: Selector de mes actualizado a: ${newMonthId}`);

            await loadAndDisplaySchedule(
                newMonthId, 
                selectedAgentId.get(), 
                scheduleContent, 
                monthTitleElement, 
                printButton, 
                agentSelect,
                seasonalShiftNote
            );
        } else {
            console.log("[DEBUG SelectorManager] Suscripción: selectedMonthId cambió a null. Ignorando carga de cuadrante.");
            monthSelect.innerHTML = '<option value="">Cargando...</option>';
            monthSelect.value = '';
        }
    });

    const renderAgentSelector = () => {
        console.log("[DEBUG SelectorManager] renderAgentSelector llamado.");
        const { agents, isAdmin, currentUser: userProfile } = agentSelectorContext.get();
        const currentViewType = currentView.get();
        const options = [];
        let shouldBeDisabled = false;
        let defaultSelection = '';

        console.log("[DEBUG SelectorManager] renderAgentSelector - Agentes disponibles (from atom):", availableAgents.get());
        console.log("[DEBUG SelectorManager] renderAgentSelector - Contexto recibido:", { agents, isAdmin, currentUser: userProfile, currentViewType });

        if (!agents || agents.length === 0) {
            agentSelect.innerHTML = '<option value="">No hay agentes disponibles</option>';
            agentSelect.disabled = true;
            console.warn("[DEBUG SelectorManager] No hay agentes cargados. Selector de agente deshabilitado.");
            return;
        }

        // === Lógica para la vista de CALENDARIO (Nueva restricción) ===
        if (currentViewType === 'calendario') {
            shouldBeDisabled = false; // El selector puede estar habilitado para admins, pero la opción 'all' no está.
            
            // Si el usuario es guardia, solo puede ver su propio agente y el selector se deshabilita
            if (userProfile?.role === 'guard') {
                shouldBeDisabled = true;
                const userAgent = agents.find(agent => String(agent.id) === String(userProfile.agentId));
                if (userAgent) {
                    options.push({ value: String(userAgent.id), text: userAgent.name });
                    defaultSelection = String(userAgent.id);
                } else {
                    options.push({ value: '', text: 'Tu agente no encontrado' });
                    shouldBeDisabled = true;
                }
            } else { // Si es admin en vista calendario
                options.push({ value: '', text: 'Selecciona un agente' }); // Opción por defecto para admin
                agents.forEach(agent => options.push({ value: String(agent.id), text: agent.name }));
                defaultSelection = (selectedAgentId.get() === 'all' && agents.length > 0) ? String(agents[0].id) : selectedAgentId.get();
                // Si el valor actual es 'all', forzamos a seleccionar el primer agente disponible
                if (defaultSelection === 'all' && agents.length > 0) {
                    defaultSelection = String(agents[0].id);
                    setAgent(defaultSelection); // Actualiza el átomo de Nanostores
                    console.log(`[DEBUG SelectorManager] Admin en vista calendario, forzando a primer agente: ${defaultSelection}`);
                }
            }
        } 
        // === Lógica para la vista de TARJETAS (Actual) ===
        else { // currentViewType === 'tarjetas'
            if (isAdmin) {
                options.push({ value: 'all', text: 'Todos los Agentes' });
                agents.forEach(agent => options.push({ value: String(agent.id), text: agent.name }));
                defaultSelection = selectedAgentId.get() || 'all';
            } else if (userProfile?.role === 'guard') {
                shouldBeDisabled = false; // Un guardia puede ver 'Todos' o su propio turno en vista de tarjetas
                options.push({ value: 'all', text: 'Todos los Agentes' });
                const userAgent = agents.find(agent => String(agent.id) === String(userProfile.agentId));
                if (userAgent) options.push({ value: String(userAgent.id), text: userAgent.name });
                defaultSelection = selectedAgentId.get() || 'all';
            }
        }
        
        console.log("[DEBUG SelectorManager] renderAgentSelector - Opciones generadas FINALES:", options);
        agentSelect.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
        agentSelect.disabled = shouldBeDisabled;
        
        const currentSelectedAgentValue = selectedAgentId.get();
        // Intentamos mantener la selección actual si está entre las nuevas opciones
        const optionExists = options.some(opt => opt.value === currentSelectedAgentValue);

        if (optionExists) {
            agentSelect.value = currentSelectedAgentValue;
        } else if (options.length > 0) {
            // Si la opción actual no existe (ej. era 'all' y ahora no está),
            // se selecciona la opción por defecto calculada.
            agentSelect.value = defaultSelection || options[0].value;
            setAgent(agentSelect.value); // Asegurar que el átomo se actualiza con el valor real
            console.log(`[DEBUG SelectorManager] Corrigiendo selectedAgentId del selector a: ${agentSelect.value}`);
        } else {
            agentSelect.value = ''; // No hay opciones válidas
        }
        
        console.log(`[DEBUG SelectorManager] Suscripción: Selector de agente renderizado. Valor final del selector: ${agentSelect.value}, Disabled: ${shouldBeDisabled}`);
    };
    agentSelectorContext.subscribe(renderAgentSelector);
    currentView.subscribe(renderAgentSelector);
    selectedAgentId.subscribe(async (agentId) => {
        if (agentSelect.value !== agentId) agentSelect.value = agentId;
        console.log(`[DEBUG SelectorManager] Suscripción: selectedAgentId del estado cambió a: ${agentId}`);
        
        const currentMonthId = selectedMonthId.get();
        if (currentMonthId) {
            await loadAndDisplaySchedule(
                currentMonthId, 
                agentId, 
                scheduleContent, 
                monthTitleElement, 
                printButton, 
                agentSelect,
                seasonalShiftNote
            );
        } else {
            console.warn("[DEBUG SelectorManager] selectedAgentId cambió, pero currentMonthId es null. No se carga el cuadrante.");
        }
    });
    currentMonthTitle.subscribe(title => { monthTitleElement.textContent = title; });

    // 3. Establecer estado inicial
    const initialMonthState = selectedMonthId.get();
    const initialAgentState = selectedAgentId.get();
    const user = currentUser.get();

    if (!initialMonthState) {
        const today = new Date();
        const initialYear = today.getFullYear();
        const initialMonthName = formatDate(today, 'MMMM', { locale: 'es' }).toLowerCase();
        const initialMonthId = `cuadrante_${initialMonthName}_${initialYear}`;
        console.log(`[DEBUG SelectorManager] Estableciendo estado inicial del mes: Año=${initialYear}, Mes=${initialMonthId}`);
        setDate(initialYear, initialMonthId); 
        // Asegúrate de establecer el agente inicial correctamente para el usuario actual
        setAgent(user?.role === 'admin' ? 'all' : String(user?.agentId || ''));
    } else {
        console.log(`[DEBUG SelectorManager] selectedMonthId ya tiene valor: ${initialMonthState}. No se estableció el mes inicial.`);
        await loadAndDisplaySchedule(
            initialMonthState, 
            initialAgentState, 
            scheduleContent, 
            monthTitleElement, 
            printButton, 
            agentSelect,
            seasonalShiftNote
        );
    }
}