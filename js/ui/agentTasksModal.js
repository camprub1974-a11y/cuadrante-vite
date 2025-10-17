// EN: js/ui/agentTasksModal.js (VERSIÓN CORREGIDA Y MEJORADA)

import { getPendingTasksForAgent } from '../dataController.js';
import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { currentUser } from '../state.js';
// ✅ 1. Importamos la función correcta desde el flujo de resolución de tareas.
import { openTaskResolutionModal } from './taskResolutionFlow.js';

let modal;
let taskListContainer;
let isInitialized = false;

export function initializeAgentTasksModal() {
    if (isInitialized) return;

    modal = document.getElementById('agent-tasks-modal');
    if (!modal) return;

    taskListContainer = modal.querySelector('#agent-tasks-list-container');

    modal.addEventListener('click', (event) => {
        if (event.target.closest('.close-button')) {
            hideAgentTasksModal();
        }

        // ✅ 2. El listener ahora busca el nuevo botón y abre el modal de resolución.
        const finishButton = event.target.closest('.finish-task-btn');
        if (finishButton) {
            const taskId = finishButton.dataset.taskId;
            hideAgentTasksModal(); // Cerramos el modal actual
            openTaskResolutionModal(taskId); // Abrimos el modal correcto
        }
    });
    isInitialized = true;
}

export async function showAgentTasksModal() {
    if (!modal) return;
    modal.classList.remove('hidden');
    await loadAndRenderTasks();
}

function hideAgentTasksModal() {
    if (!modal) return;
    modal.classList.add('hidden');
}

async function loadAndRenderTasks() {
    showLoading();
    try {
        const user = currentUser.get();
        const tasks = await getPendingTasksForAgent(user.agentId);

        if (tasks.length === 0) {
            taskListContainer.innerHTML = '<p class="empty-state-text">No tienes tareas pendientes.</p>';
            return;
        }

        // Usamos la nueva función para crear el HTML mejorado.
        taskListContainer.innerHTML = tasks.map(createTaskCardHTML).join('');
        if (window.feather) feather.replace();

    } catch (error) {
        displayMessage(`Error al cargar tareas: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// ✅ 3. Nueva función que genera el HTML con la estructura de tarjeta mejorada.
function createTaskCardHTML(task) {
    return `
        <div class="task-card">
            <div class="task-card-header">
                <span class="task-meta">Orden de Servicio: ${task.orderId || 'N/A'}</span>
            </div>
            <div class="task-card-body">
                <p>${task.description}</p>
            </div>
            <div class="task-card-footer">
                <button class="button button-primary button-small finish-task-btn" data-task-id="${task.id}">
                    <i data-feather="check-square"></i>
                    <span>Resolver Tarea</span>
                </button>
            </div>
        </div>
    `;
}