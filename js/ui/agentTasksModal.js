<<<<<<< HEAD
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

=======
// EN: js/ui/agentTasksModal.js

import { getPendingTasksForAgent, updateTaskStatus } from '../dataController.js';
import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { currentUser } from '../state.js';

let modal;
let taskListContainer;

export function initializeAgentTasksModal() {
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    modal = document.getElementById('agent-tasks-modal');
    if (!modal) return;

    taskListContainer = modal.querySelector('#agent-tasks-list-container');
<<<<<<< HEAD

=======
    
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    modal.addEventListener('click', (event) => {
        if (event.target.closest('.close-button')) {
            hideAgentTasksModal();
        }
<<<<<<< HEAD

        // ✅ 2. El listener ahora busca el nuevo botón y abre el modal de resolución.
        const finishButton = event.target.closest('.finish-task-btn');
        if (finishButton) {
            const taskId = finishButton.dataset.taskId;
            hideAgentTasksModal(); // Cerramos el modal actual
            openTaskResolutionModal(taskId); // Abrimos el modal correcto
        }
    });
    isInitialized = true;
=======
    });
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
}

export async function showAgentTasksModal() {
    if (!modal) return;
<<<<<<< HEAD
=======
    
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
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
<<<<<<< HEAD

=======
        
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
        if (tasks.length === 0) {
            taskListContainer.innerHTML = '<p class="empty-state-text">No tienes tareas pendientes.</p>';
            return;
        }

<<<<<<< HEAD
        // Usamos la nueva función para crear el HTML mejorado.
        taskListContainer.innerHTML = tasks.map(createTaskCardHTML).join('');
        if (window.feather) feather.replace();

=======
        taskListContainer.innerHTML = tasks.map(task => createTaskItemHTML(task)).join('');
        
        if (window.feather) feather.replace();

        // Añadir listeners a los botones de finalizar
        taskListContainer.querySelectorAll('.finish-task-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const taskId = button.dataset.taskId;
                if (confirm('¿Marcar esta tarea como finalizada?')) {
                    await handleFinishTask(taskId);
                }
            });
        });

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
    } catch (error) {
        displayMessage(`Error al cargar tareas: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

<<<<<<< HEAD
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
=======
function createTaskItemHTML(task) {
    return `
        <div class="task-item">
            <p class="task-description">${task.description}</p>
            <div class="task-footer">
                <span class="task-meta">Orden: ${task.orderId || 'N/A'}</span>
                <button class="button button-success button-small finish-task-btn" data-task-id="${task.id}">
                    <i data-feather="check"></i>
                    <span>Finalizar</span>
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
                </button>
            </div>
        </div>
    `;
<<<<<<< HEAD
=======
}

async function handleFinishTask(taskId) {
    showLoading('Finalizando tarea...');
    try {
        await updateTaskStatus(taskId, 'finalizada');
        displayMessage('Tarea finalizada con éxito.', 'success');
        await loadAndRenderTasks(); // Recargar la lista
    } catch (error) {
        displayMessage(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
}