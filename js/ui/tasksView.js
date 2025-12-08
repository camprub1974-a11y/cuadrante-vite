// js/ui/tasksView.js (VERSIÓN CORREGIDA)

import { getTasksForAgent, resolveTaskWithComment } from '../dataController.js';
import { currentUser } from '../state.js';
import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { openRegistroModal } from './registroModal.js';
// ✅ 1. Importamos la función para cambiar de vista desde main.js
import { showRegistroViewForTask } from '../main.js';

let currentTasks = [];
let selectedTaskId = null;
let activeFilter = 'pendiente';

export function renderTasksView() {
  const view = document.getElementById('tasks-view');
  if (!view) return;
  setupEventListeners(view);
  const filters = view.querySelector('#task-filters');
  const currentActive = filters.querySelector('.filter-btn.active');
  if (currentActive) currentActive.classList.remove('active');
  filters.querySelector('.filter-btn[data-status="pendiente"]').classList.add('active');
  activeFilter = 'pendiente';
  loadAndRenderTasks(view, activeFilter);
  hideResolutionPanel(view);
}

function setupEventListeners(view) {
  if (view.dataset.listenerAttached) return;
  view.addEventListener('click', async (event) => {
    const target = event.target;
    const filterBtn = target.closest('.filter-btn');
    if (filterBtn) {
      activeFilter = filterBtn.dataset.status;
      const filters = view.querySelector('#task-filters');
      filters.querySelector('.active').classList.remove('active');
      filterBtn.classList.add('active');
      loadAndRenderTasks(view, activeFilter);
      hideResolutionPanel(view);
      return;
    }
    const taskItem = target.closest('.task-item');
    if (taskItem) {
      selectedTaskId = taskItem.dataset.id;
      const selectedTask = currentTasks.find(t => t.id === selectedTaskId);
      const taskListContainer = view.querySelector('#tasks-list-container');
      const currentSelected = taskListContainer.querySelector('.selected');
      if (currentSelected) currentSelected.classList.remove('selected');
      taskItem.classList.add('selected');
      if (selectedTask && selectedTask.status === 'pendiente') {
        showResolutionPanel(view, selectedTask);
      } else {
        hideResolutionPanel(view);
      }
      return;
    }
    const resolveBtn = target.closest('.resolution-btn');
    if (resolveBtn) {
        switch (resolveBtn.id) {
            case 'resolve-with-comment-btn':
                handleResolveWithComment(view);
                break;
            // ✅ 2. La lógica para los botones ahora llama a la función correcta
            case 'resolve-with-entrada-btn':
                handleResolveWithEntrada(); // Nueva función específica
                break;
            case 'resolve-with-salida-btn':
                handleResolveWithSalida(view); // Función específica para salida
                break;
        }
    }
  });
  view.dataset.listenerAttached = 'true';
}

// ✅ 3. Nueva función que navega a la vista de registro de entrada
function handleResolveWithEntrada() {
    if (!selectedTaskId) return;
    // Llama a la función importada de main.js, pasándole el ID de la tarea
    showRegistroViewForTask(selectedTaskId);
}

// ✅ 4. Función específica para salida, que mantiene la lógica del modal
function handleResolveWithSalida(view) {
    if (!selectedTaskId) return;
    openRegistroModal({
      direction: 'salida',
      taskId: selectedTaskId,
      callback: async () => {
        displayMessage('Tarea resuelta y documento creado con éxito.', 'success');
        hideResolutionPanel(view);
        await loadAndRenderTasks(view, activeFilter);
      }
    });
}

async function loadAndRenderTasks(view, status) {
  showLoading('Cargando tareas...');
  const taskListContainer = view.querySelector('#tasks-list-container');
  try {
    const user = currentUser.get();
    currentTasks = await getTasksForAgent(user.agentId, status);
    
    if (currentTasks.length === 0) {
      taskListContainer.innerHTML = '<p class="empty-state-text">No hay tareas que mostrar.</p>';
    } else {
      taskListContainer.innerHTML = currentTasks.map((task, i) => createTaskHTML(task, i)).join('');
    }
    feather.replace();
  } catch (error) {
    displayMessage(error.message, 'error');
  } finally {
    hideLoading();
  }
}

function createTaskHTML(task, index) {
  const createdAt = task.createdAt ? new Date(task.createdAt.seconds * 1000).toLocaleDateString('es-ES') : 'N/A';
  return `
    <div class="task-item status-${task.status}" data-id="${task.id}">
      <div class="task-item-number">${index + 1}</div>
      <div class="task-item-content">
        <div class="task-header">Creada: ${createdAt}</div>
        <p class="task-description">${task.description}</p>
      </div>
      <div class="task-item-indicator">
        <i data-feather="chevron-right"></i>
      </div>
    </div>
  `;
}

function showResolutionPanel(view, task) {
  const placeholder = view.querySelector('#task-resolution-placeholder');
  const resolutionPanel = view.querySelector('#task-resolution-panel');
  const taskDescriptionPreview = view.querySelector('#resolution-task-description');
  const resolutionCommentInput = view.querySelector('#resolution-comment');

  placeholder.classList.add('hidden');
  resolutionPanel.classList.remove('hidden');
  taskDescriptionPreview.textContent = task.description;
  resolutionCommentInput.value = '';
}

function hideResolutionPanel(view) {
  const placeholder = view.querySelector('#task-resolution-placeholder');
  const resolutionPanel = view.querySelector('#task-resolution-panel');
  const taskListContainer = view.querySelector('#tasks-list-container');
  
  placeholder.classList.remove('hidden');
  resolutionPanel.classList.add('hidden');
  selectedTaskId = null;
  
  const currentSelected = taskListContainer.querySelector('.selected');
  if (currentSelected) currentSelected.classList.remove('selected');
}

async function handleResolveWithComment(view) {
  const resolutionCommentInput = view.querySelector('#resolution-comment');
  const comment = resolutionCommentInput.value.trim();
  if (!comment) {
    displayMessage('El comentario no puede estar vacío.', 'warning');
    return;
  }
  showLoading('Finalizando tarea...');
  try {
    await resolveTaskWithComment({ taskId: selectedTaskId, comment });
    displayMessage('Tarea finalizada con éxito.', 'success');
    hideResolutionPanel(view);
    await loadAndRenderTasks(view, activeFilter);
  } catch (error) {
    displayMessage(error.message, 'error');
  } finally {
    hideLoading();
  }
}

function handleResolveWithDocument(direction, view) {
    if (!selectedTaskId) return;
  
    openRegistroModal({
      direction: direction,
      taskId: selectedTaskId,
      callback: async () => {
        displayMessage('Tarea resuelta y documento creado con éxito.', 'success');
        hideResolutionPanel(view);
        await loadAndRenderTasks(view, activeFilter);
      }
    });
}