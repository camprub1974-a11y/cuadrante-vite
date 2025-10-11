// EN: js/ui/agentTasksModal.js

import { getPendingTasksForAgent, updateTaskStatus } from '../dataController.js';
import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { currentUser } from '../state.js';

let modal;
let taskListContainer;

export function initializeAgentTasksModal() {
    modal = document.getElementById('agent-tasks-modal');
    if (!modal) return;

    taskListContainer = modal.querySelector('#agent-tasks-list-container');
    
    modal.addEventListener('click', (event) => {
        if (event.target.closest('.close-button')) {
            hideAgentTasksModal();
        }
    });
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

    } catch (error) {
        displayMessage(`Error al cargar tareas: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function createTaskItemHTML(task) {
    return `
        <div class="task-item">
            <p class="task-description">${task.description}</p>
            <div class="task-footer">
                <span class="task-meta">Orden: ${task.orderId || 'N/A'}</span>
                <button class="button button-success button-small finish-task-btn" data-task-id="${task.id}">
                    <i data-feather="check"></i>
                    <span>Finalizar</span>
                </button>
            </div>
        </div>
    `;
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
}