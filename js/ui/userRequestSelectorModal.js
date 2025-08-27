/**
 * @file userRequestSelectorModal.js
 * @description Lógica para el modal selector de solicitudes del usuario estándar.
 * @version 2.5.0 (Solución de Flujo Lineal)
 *
 * @changelog
 * - Refactorizado el flujo de inicialización para ser estrictamente lineal y eliminar llamadas recursivas.
 * - La responsabilidad de mostrar el modal ahora recae directamente en el bloque que confirma la
 * inicialización, tanto en la ruta de búsqueda directa como en la del MutationObserver.
 * - Este enfoque elimina cualquier posible condición de carrera o bucle de eventos que impedía
 * mostrar el modal de forma consistente.
 */

// --- DEPENDENCIAS ---
import { showRequestPermissionModal } from './requestPermissionModal.js';
import { openProposeChangeModal } from './proposeChangeModal.js';
import { showManageRequestsModal } from './manageRequestsModal.js';
import { currentUser } from '../state.js';
import { displayMessage } from './viewManager.js';

// --- ESTADO DEL MÓDULO ---
let modal = null;
let isInitialized = false;
let observer = null;
let pendingShowRequest = false;

// --- SECCIÓN DE LÓGICA INTERNA ---

/**
 * @private
 * [MODIFICADO] Su única responsabilidad ahora es adjuntar listeners.
 * Ya no intenta mostrar el modal.
 */
function _initializeAndAttachListeners() {
    if (isInitialized) return true; // Si ya está listo, retorna éxito.

    console.log("[DEBUG] UserRequestSelectorModal: Intentando inicializar listeners...");
    
    // Validar que el nodo del modal existe antes de continuar.
    if (!modal) {
        console.error("ERROR - _initializeAndAttachListeners: Se llamó sin un nodo de modal válido.");
        return false;
    }

    const closeButton = modal.querySelector('.close-button');
    const requestPermissionButton = modal.querySelector('#select-request-permission');
    const proposeChangeButton = modal.querySelector('#select-propose-change');
    const viewMyRequestsButton = modal.querySelector('#select-view-my-requests');
    
    if (!closeButton || !requestPermissionButton || !proposeChangeButton || !viewMyRequestsButton) {
        console.error("ERROR - UserRequestSelectorModal: Fallo al encontrar elementos DOM cruciales dentro del modal.");
        return false; // Retorna fallo.
    }

    closeButton.addEventListener('click', hideUserRequestSelectorModal);
    requestPermissionButton.addEventListener('click', () => {
        hideUserRequestSelectorModal();
        showRequestPermissionModal();
    });
    proposeChangeButton.addEventListener('click', () => {
        hideUserRequestSelectorModal();
        displayMessage("Para solicitar un intercambio de turno, haz clic directamente en el turno que deseas cambiar en el cuadrante (vista Calendario).", "info", 8000);
    });
    viewMyRequestsButton.addEventListener('click', () => {
        hideUserRequestSelectorModal();
        showManageRequestsModal();
    });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) hideUserRequestSelectorModal();
    });

    isInitialized = true;
    console.log("✅ UserRequestSelectorModal: Modal inicializado y listeners adjuntados.");
    return true; // Retorna éxito.
}

/**
 * @private
 * [MODIFICADO] Ahora esta función orquesta la inicialización Y la acción de mostrar.
 */
function _ensureInitializedAndShow() {
    if (isInitialized) {
        // Si ya está listo, simplemente muestra el modal.
        showUserRequestSelectorModal();
        return;
    }

    // 1. BÚSQUEDA DIRECTA
    const existingModal = document.getElementById('user-requests-selector-modal');
    if (existingModal) {
        console.log("[DEBUG] UserRequestSelectorModal: Modal encontrado directamente. Procediendo...");
        modal = existingModal;
        // Intenta inicializar, y si tiene éxito, muestra el modal.
        if (_initializeAndAttachListeners()) {
            showUserRequestSelectorModal();
        }
        return;
    }

    // 2. RESPALDO CON MUTATION OBSERVER
    if (observer) return; // Evita crear observadores duplicados.
    
    console.log("[INFO] UserRequestSelectorModal: Modal no encontrado, iniciando MutationObserver.");
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const callback = (mutationsList, obs) => {
        const foundModal = document.getElementById('user-requests-selector-modal');
        if (foundModal) {
            console.log("[DEBUG] UserRequestSelectorModal: MutationObserver detectó el modal.");
            obs.disconnect();
            observer = null;
            modal = foundModal;
            
            // Lógica lineal: inicializa y, si tiene éxito, muestra.
            if (_initializeAndAttachListeners() && pendingShowRequest) {
                showUserRequestSelectorModal();
            }
        }
    };

    observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}

// --- SECCIÓN DE FUNCIONES PÚBLICAS (API del Módulo) ---

/**
 * [MODIFICADO] Muestra el modal o delega la inicialización.
 */
export function showUserRequestSelectorModal() {
    // Si está inicializado, esta es la única función que realmente cambia el estilo.
    if (isInitialized && modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        console.log("[DEBUG] UserRequestSelectorModal: Mostrando modal.");
        pendingShowRequest = false; // Resetea la bandera una vez mostrado.
        return;
    }
    
    // Si no está inicializado, marca la intención y arranca el proceso.
    console.log("[DEBUG] UserRequestSelectorModal: show() llamado; el modal no está listo. Arrancando proceso de inicialización.");
    pendingShowRequest = true;
    _ensureInitializedAndShow();
}

/**
 * Oculta el modal.
 */
export function hideUserRequestSelectorModal() {
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        pendingShowRequest = false; // Cancela cualquier solicitud de apertura.
    }
}

/**
 * Punto de entrada para la inicialización (opcional, por seguridad).
 */
export function initializeUserRequestSelectorModal() {
    _ensureInitializedAndShow();
}