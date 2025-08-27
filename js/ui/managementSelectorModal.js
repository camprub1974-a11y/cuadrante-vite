// js/ui/managementSelectorModal.js (VERSIÓN CORREGIDA Y FINAL)

import { showAgentManagerModal } from './agentManagerModal.js';
import { showManageRequestsModal } from './manageRequestsModal.js';
import { showAddMarkedDateModal } from './addMarkedDateModal.js';
import { showTemplateManagerView } from '../main.js'; 

let modal;
let isInitialized = false;

export function initializeManagementSelectorModal() {
    if (isInitialized) return;

    modal = document.getElementById('management-selector-modal');
    if (!modal) return;

    const closeButton = modal.querySelector('.close-button');
    const manageAgentsButton = modal.querySelector('#select-manage-agents');
    const manageRequestsButton = modal.querySelector('#select-manage-requests');
    const addMarkedDateButton = modal.querySelector('#select-add-marked-date');
    const manageTemplatesButton = modal.querySelector('#select-manage-templates');

    if (closeButton) closeButton.addEventListener('click', hideManagementSelectorModal);
    
    if (manageAgentsButton) manageAgentsButton.addEventListener('click', () => {
        hideManagementSelectorModal();
        showAgentManagerModal();
    });
    
    if (manageRequestsButton) manageRequestsButton.addEventListener('click', () => {
        hideManagementSelectorModal();
        showManageRequestsModal();
    });
    
    if (addMarkedDateButton) addMarkedDateButton.addEventListener('click', () => {
        hideManagementSelectorModal();
        showAddMarkedDateModal();
    });

    // ✅ AÑADIMOS EL LISTENER PARA EL BOTÓN DE GESTIONAR PLANTILLAS
    if (manageTemplatesButton) {
        manageTemplatesButton.addEventListener('click', () => {
            hideManagementSelectorModal();
            showTemplateManagerView();
        });
    }
    
    modal.addEventListener('click', (event) => {
        if (event.target === modal) hideManagementSelectorModal();
    });

    isInitialized = true;
}

export function showManagementSelectorModal() {
    if (!isInitialized) initializeManagementSelectorModal();
    if (modal) modal.classList.remove('hidden');
}

export function hideManagementSelectorModal() {
    if (modal) modal.classList.add('hidden');
}