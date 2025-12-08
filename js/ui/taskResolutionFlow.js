// En: js/ui/taskResolutionFlow.js

import { resolveTaskWithComment } from '../dataController.js';
import { showLoading, hideLoading, displayMessage } from './viewManager.js';
import { showRegistroView } from '../main.js'; // Importamos la función para mostrar la vista de registro

let activeTaskId = null;

// Función para abrir el modal de resolución con el ID de la tarea
export function openTaskResolutionModal(taskId) {
  activeTaskId = taskId;
  const taskModal = document.getElementById('task-resolution-modal');
  if (taskModal) {
    taskModal.classList.remove('hidden');
  } else {
    console.error('El modal de resolución de tareas no se encuentra en el DOM.');
  }
}

// Función para cerrar el modal
function closeTaskResolutionModal() {
  const taskModal = document.getElementById('task-resolution-modal');
  if (taskModal) {
    taskModal.classList.add('hidden');
  }
  activeTaskId = null; // Limpiamos el ID de la tarea activa
}

// Función principal que inicializa todo el flujo
export function initializeTaskResolutionFlow() {
  const taskModal = document.getElementById('task-resolution-modal');
  if (!taskModal) return; // Si el modal no existe, no hacemos nada

  const resolveWithCommentBtn = document.getElementById('resolve-with-comment-btn');
  const resolveWithDocBtn = document.getElementById('resolve-with-document-btn');
  const closeModalButton = taskModal.querySelector('.close-button');

  // Listener para finalizar con comentario
  if (resolveWithCommentBtn && !resolveWithCommentBtn.dataset.listenerAttached) {
    resolveWithCommentBtn.addEventListener('click', async () => {
      const comment = prompt('Introduce el comentario de resolución:');
      if (comment && comment.trim() !== '' && activeTaskId) {
        showLoading('Finalizando tarea...');
        try {
          // Llama a la Cloud Function a través del dataController
          await resolveTaskWithComment({ taskId: activeTaskId, comment: comment.trim() });
          displayMessage('Tarea finalizada con éxito.', 'success');
          closeTaskResolutionModal();
        } catch (error) {
          displayMessage(`Error al finalizar la tarea: ${error.message}`, 'error');
        } finally {
          hideLoading();
        }
      }
    });
    resolveWithCommentBtn.dataset.listenerAttached = 'true';
  }

  // Listener para finalizar con documento
  if (resolveWithDocBtn && !resolveWithDocBtn.dataset.listenerAttached) {
    resolveWithDocBtn.addEventListener('click', () => {
      if (!activeTaskId) return;
      // Cerramos el modal actual y navegamos a la vista de registro electrónico.
      // Pasamos el taskId a través de un Custom Event para que la vista de registro lo reciba.
      closeTaskResolutionModal();
      
      // Creamos un evento para que la vista de registro sepa que debe vincular una tarea
      const event = new CustomEvent('navigateToRegistroForTask', {
        detail: { taskId: activeTaskId }
      });
      document.dispatchEvent(event);

      // Llama a la función que muestra la vista de registro
      showRegistroView();
    });
    resolveWithDocBtn.dataset.listenerAttached = 'true';
  }

  // Listener para el botón de cerrar el modal
  if (closeModalButton && !closeModalButton.dataset.listenerAttached) {
    closeModalButton.addEventListener('click', closeTaskResolutionModal);
    closeModalButton.dataset.listenerAttached = 'true';
  }

  // Listener global en el body para "escuchar" los clics en los botones de finalizar tarea
  // Este es el punto de entrada que inicia el flujo.
  if (!document.body.dataset.taskListenerAttached) {
    document.body.addEventListener('click', event => {
      // Usa una clase específica para el botón de finalizar en tus notificaciones o partes
      const completeTaskButton = event.target.closest('.complete-task-btn');
      if (completeTaskButton) {
        const taskId = completeTaskButton.dataset.taskId;
        if (taskId) {
          openTaskResolutionModal(taskId);
        }
      }
    });
    document.body.dataset.taskListenerAttached = 'true';
  }
}