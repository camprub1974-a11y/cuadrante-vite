// js/ui/managementSelectorModal.js (VERSIÓN FINAL CORREGIDA)

import { showAgentManagerModal } from './agentManagerModal.js';
import { showManageRequestsModal } from './manageRequestsModal.js';
import { showAddMarkedDateModal } from './addMarkedDateModal.js';

let modal = null;
let isInitialized = false;

// Oculta el modal
function hideManagementSelectorModal() {
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Inicializa el modal y sus listeners
export function initializeManagementSelectorModal() {
  if (isInitialized) return;
  modal = document.getElementById('management-selector-modal');
  if (!modal) return;

  // --- LÓGICA DE EVENTOS CORREGIDA ---

  // 1. Asigna el cierre a todos los botones de cerrar/cancelar
  modal.querySelectorAll('.close-button').forEach(button => {
    button.addEventListener('click', hideManagementSelectorModal);
  });

  // 2. Asigna la acción a cada botón de opción por su ID específico
  const manageAgentsBtn = document.getElementById('select-manage-agents');
  if (manageAgentsBtn) {
    manageAgentsBtn.addEventListener('click', () => {
      hideManagementSelectorModal();
      showAgentManagerModal();
    });
  }
  
  const manageRequestsBtn = document.getElementById('select-manage-requests');
  if (manageRequestsBtn) {
    manageRequestsBtn.addEventListener('click', () => {
      hideManagementSelectorModal();
      showManageRequestsModal('permissions');
    });
  }

  const addMarkedDateBtn = document.getElementById('select-add-marked-date');
  if (addMarkedDateBtn) {
    addMarkedDateBtn.addEventListener('click', () => {
      hideManagementSelectorModal();
      showAddMarkedDateModal();
    });
  }

  // --- FIN DE LA CORRECCIÓN ---

  isInitialized = true;
}

// Muestra el modal
export function showManagementSelectorModal() {
  if (!isInitialized) {
    initializeManagementSelectorModal();
  }
  if (modal) {
    modal.classList.remove('hidden');
  }
}