// public/js/admin/agentsManager.js

// Importaciones necesarias
import { showLoading, hideLoading, displayMessage } from '../ui/viewManager.js';
import { db } from '../firebase-config.js'; // Necesitas db para Firestore
import { currentUser, availableAgents, selectedAgentId, selectedMonthId, setAgent, setAvailableAgents } from '../state.js'; // Importa Nanostores atoms
import { loadInitialAgents, addAgent, updateAgent, deleteAgent } from '../dataController.js'; // Importa funciones CRUD de agentes
import { loadAndDisplaySchedule } from '../logic.js'; // Para recargar el cuadrante

// Variables globales para elementos DOM, inicializadas a null
// Estas ya se gestionan mejor en agentManagerModal.js, aquí solo las que se usen fuera de su ámbito de modal
// Aunque en este contexto (el archivo agentsManager.js que proporcionaste), las vamos a obtener directamente.

/**
 * Función principal para mostrar la vista de gestión de agentes.
 * Obtiene las referencias DOM directamente y usa el estado de Nanostores.
 */
export async function showAgentsAdminView() {
    const userProfile = currentUser.get();
    if (userProfile?.role !== 'admin') {
        displayMessage("Acceso denegado. Solo administradores pueden gestionar agentes.", "error");
        return;
    }

    showLoading();

    // Obtener referencias DOM al inicio de la función
    const appContent = document.getElementById('app-content');
    const printViewContainer = document.getElementById('print-view-container');
    const manageAgentsButton = document.getElementById('manageAgentsButton');
    const viewIncidencesButton = document.getElementById('viewIncidencesButton'); // Asumiendo que existe
    const viewCardButton = document.getElementById('viewCardButton');
    const viewCalendarButton = document.getElementById('viewCalendarButton');
    const agentSelect = document.getElementById('agent-select');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const prevMonthButton = document.getElementById('prevMonthButton');
    const nextMonthButton = document.getElementById('nextMonthButton');
    const scheduleLegend = document.getElementById('schedule-legend'); // Asumiendo que existe
    const currentMonthTitle = document.getElementById('currentMonthTitle');
    const agentsAdminViewContainer = document.getElementById('agent-manager-modal'); // El modal es el contenedor de la vista admin

    // Ocultar todas las vistas principales y mostrar solo la de agentes
    if (appContent) appContent.style.display = 'none'; // o classList.add('hidden') si usas clases
    if (printViewContainer) printViewContainer.classList.add('hidden');
    // Ya no necesitas incidencesViewContainer si no lo usas

    // Asegurarse de que los selectores y botones de la vista principal estén ocultos
    if (manageAgentsButton) manageAgentsButton.style.display = 'none'; // Se oculta a sí mismo
    if (viewIncidencesButton) viewIncidencesButton.style.display = 'none';
    if (viewCardButton) viewCardButton.style.display = 'none';
    if (viewCalendarButton) viewCalendarButton.style.display = 'none';
    if (agentSelect) agentSelect.style.display = 'none';
    if (monthSelect) monthSelect.style.display = 'none';
    if (yearSelect) yearSelect.style.display = 'none';
    if (prevMonthButton) prevMonthButton.style.display = 'none';
    if (nextMonthButton) nextMonthButton.style.display = 'none';
    if (scheduleLegend) scheduleLegend.style.display = 'none';
    if (currentMonthTitle) currentMonthTitle.style.display = 'none';

    // Mostrar el modal de gestión de agentes (que actúa como el contenedor de la vista admin)
    if (agentsAdminViewContainer) {
        agentsAdminViewContainer.classList.remove('hidden');
        agentsAdminViewContainer.style.display = 'flex'; // Usar flex para centrar
    }

    // Ya no se llama a loadAgentsList directamente aquí.
    // La lista se renderizará automáticamente cuando el modal se abra y detecte cambios en availableAgents.
    // La lógica de renderizado de la lista de agentes se mueve al módulo del modal.
    hideLoading();
}

/**
 * Función para volver a la vista principal del cuadrante.
 * Obtiene las referencias DOM directamente y usa el estado de Nanostores.
 */
export function hideAgentsAdminView() {
    showLoading();

    const appContent = document.getElementById('app-content');
    const manageAgentsButton = document.getElementById('manageAgentsButton');
    const viewIncidencesButton = document.getElementById('viewIncidencesButton');
    const viewCardButton = document.getElementById('viewCardButton');
    const viewCalendarButton = document.getElementById('viewCalendarButton');
    const agentSelect = document.getElementById('agent-select');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const prevMonthButton = document.getElementById('prevMonthButton');
    const nextMonthButton = document.getElementById('nextMonthButton');
    const scheduleLegend = document.getElementById('schedule-legend');
    const currentMonthTitle = document.getElementById('currentMonthTitle');
    const agentsAdminViewContainer = document.getElementById('agent-manager-modal');

    if (agentsAdminViewContainer) {
        agentsAdminViewContainer.classList.add('hidden');
        agentsAdminViewContainer.style.display = 'none';
    }
    if (appContent) appContent.style.display = 'block';

    // Mostrar de nuevo los selectores y botones de la vista principal
    if (manageAgentsButton) manageAgentsButton.style.display = 'block';
    if (viewIncidencesButton) viewIncidencesButton.style.display = 'block';
    if (viewCardButton) viewCardButton.style.display = 'block';
    if (viewCalendarButton) viewCalendarButton.style.display = 'block';
    if (agentSelect) agentSelect.style.display = 'block';
    if (monthSelect) monthSelect.style.display = 'block';
    if (yearSelect) yearSelect.style.display = 'block';
    if (prevMonthButton) prevMonthButton.style.display = 'block';
    if (nextMonthButton) nextMonthButton.style.display = 'block';
    if (scheduleLegend) scheduleLegend.style.display = 'block';
    if (currentMonthTitle) currentMonthTitle.style.display = 'block';

    // Recargar el cuadrante con el estado actual de Nanostores
    loadAndDisplaySchedule(
        selectedMonthId.get(),
        selectedAgentId.get(),
        document.getElementById('schedule-content'),
        document.getElementById('currentMonthTitle'),
        document.getElementById('printButton'),
        document.getElementById('agent-select'),
        document.getElementById('seasonal-shift-note')
    );
    hideLoading();
}


// Las funciones `loadAgentsList`, `attachAgentListListeners`, `openAddAgentModal`,
// `cancelAddAgent`, `confirmAddAgent`, `handleEditAgentClick`, `cancelEditAgent`,
// `confirmEditAgent`, `handleDeleteAgentClick`, y `updateAllAvailableTipsAndReload`
// que estaban aquí, ¡YA HAN SIDO MIGRARAS y refactorizadas en `agentManagerModal.js`!
// Este archivo `agentsManager.js` (el que el usuario subió) es obsoleto o su contenido
// ya se ha fusionado en `agentManagerModal.js`.

// Por lo tanto, el resto de este archivo se vacía, ya que su lógica se ha movido.
// Solo quedan las funciones para mostrar/ocultar la vista de administración general,
// que delegan en el modal correspondiente.