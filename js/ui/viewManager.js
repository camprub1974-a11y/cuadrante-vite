// js/ui/viewManager.js (VERSIÓN ADAPTADA PARA TOAST UI CALENDAR)

import { currentView, setView } from '../state.js';

const messagesContainer = document.getElementById('app-messages-container');
let messageTimeout;

/**
 * Muestra el contenido principal de la aplicación y oculta el login.
 */
export function showAppContent() {
  const authContainer = document.getElementById('auth-container');
  const appContent = document.getElementById('app-content');
  const mainHeader = document.querySelector('.main-header');
  const moduleNav = document.querySelector('.module-nav');

  if (authContainer) authContainer.classList.add('hidden');
  if (appContent) appContent.classList.remove('hidden');
  if (mainHeader) mainHeader.classList.remove('hidden');
  if (moduleNav) moduleNav.classList.remove('hidden');
}

/**
 * Muestra la pantalla de login y oculta el contenido principal de la aplicación.
 */
export function showLoginScreen() {
  const authContainer = document.getElementById('auth-container');
  const appContent = document.getElementById('app-content');
  const mainHeader = document.querySelector('.main-header');
  const moduleNav = document.querySelector('.module-nav');

  if (authContainer) authContainer.classList.remove('hidden');
  if (appContent) appContent.classList.add('hidden');
  if (mainHeader) mainHeader.classList.add('hidden');
  if (moduleNav) moduleNav.classList.add('hidden');

  if (messagesContainer) messagesContainer.innerHTML = '';
}

/**
 * Muestra el indicador de carga.
 */
export function showLoading(message = 'Cargando...') {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingMessage = document.getElementById('loading-message');
  if (loadingMessage) loadingMessage.textContent = message;
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

/**
 * Oculta el indicador de carga.
 */
export function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

/**
 * Muestra un mensaje temporal en pantalla.
 */
export function displayMessage(message, type = 'info', duration = 5000) {
  if (!messagesContainer) {
    console.warn('Contenedor de mensajes (#app-messages-container) no encontrado.');
    alert(`[${type.toUpperCase()}] ${message}`);
    return;
  }

  clearTimeout(messageTimeout);
  messagesContainer.innerHTML = '';

  const messageElement = document.createElement('div');
  messageElement.classList.add('app-message', `app-message-${type}`);
  messageElement.textContent = message;

  messagesContainer.appendChild(messageElement);

  messageTimeout = setTimeout(() => {
    messageElement.classList.add('fade-out');
    messageElement.addEventListener('transitionend', () => {
      if (messageElement.parentNode) {
        messagesContainer.removeChild(messageElement);
      }
    }, { once: true });
  }, duration);
}

// ✅ Se mantienen estas funciones por si son usadas por otros módulos.
export function showInitializeMonthModal() {
  const modal = document.getElementById('initialize-month-modal');
  if (modal) modal.classList.remove('hidden');
}

export function hideInitializeMonthModal() {
  const modal = document.getElementById('initialize-month-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Abre un modal eliminando la clase 'hidden'.
 * @param {string | HTMLElement} modalIdOrElement - El ID del modal o el elemento modal directamente.
 */
export function openModal(modalIdOrElement) {
  let modalElement = null;
  if (typeof modalIdOrElement === 'string') {
    modalElement = document.getElementById(modalIdOrElement);
  } else if (modalIdOrElement instanceof HTMLElement) {
    modalElement = modalIdOrElement;
  }

  if (modalElement) {
    modalElement.classList.remove('hidden');
    console.log(`Modal abierto: ${modalElement.id || 'Elemento sin ID'}`);
  } else {
    console.warn('Intento de abrir un modal que no se encontró:', modalIdOrElement);
  }
}

/**
 * Cierra cualquier modal añadiendo la clase 'hidden'.
 * @param {string | HTMLElement} modalIdOrElement - El ID del modal o el elemento modal directamente.
 */
export function closeModal(modalIdOrElement) {
  let modalElement = null;
  if (typeof modalIdOrElement === 'string') {
    modalElement = document.getElementById(modalIdOrElement);
  } else if (modalIdOrElement instanceof HTMLElement) {
    modalElement = modalIdOrElement;
  }

  if (modalElement) {
    modalElement.classList.add('hidden');
    console.log(`Modal cerrado: ${modalElement.id || 'Elemento sin ID'}`);
  } else {
    console.warn('Intento de cerrar un modal que no se encontró:', modalIdOrElement);
  }
}

/**
 * Añade listeners a todos los elementos con clase '.modal-close' dentro de un modal específico.
 * @param {HTMLElement} modalElement - El elemento raíz del modal.
 */
export function setupModalCloseButtons(modalElement) { // <-- CORREGIDO: Nombre de función válido
    if (!modalElement) return;
    // La variable se renombra a "closeButtons". El selector (la string) se mantiene.
    const closeButtons = modalElement.querySelectorAll('.modal-close'); // <-- CORREGIDO: Nombre de variable válido
    console.log(`Modal ${modalElement.id}: Encontrados ${closeButtons.length} botones de cierre.`); // <-- CORREGIDO
    closeButtons.forEach(btn => { // <-- CORREGIDO
        // Evitar añadir múltiples listeners al mismo botón
        if (!btn.dataset.closeListenerAdded) {
            btn.addEventListener('click', (event) => {
                event.stopPropagation(); 
                closeModal(modalElement);
            });
            btn.dataset.closeListenerAdded = 'true'; 
            console.log(`Listener de cierre añadido a:`, btn); 
        }
    });
}