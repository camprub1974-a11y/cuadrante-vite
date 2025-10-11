// js/ui/viewManager.js (VERSIÓN FINAL Y CORREGIDA)

import { currentView, setView } from '../state.js';

const messagesContainer = document.getElementById('app-messages-container');
let messageTimeout;

export function showAppContent(userEmail) {
  const authContainer = document.getElementById('auth-container');
  const appContent = document.getElementById('app-content');
  const mainHeader = document.querySelector('.main-header'); // Buscamos el header
  const moduleNav = document.querySelector('.module-nav'); // Buscamos la navegación

  // Oculta el login
  if (authContainer) authContainer.classList.add('hidden');
  
  // Muestra el contenido de la app, el header y la navegación
  if (appContent) appContent.classList.remove('hidden');
  if (mainHeader) mainHeader.classList.remove('hidden');
  if (moduleNav) moduleNav.classList.remove('hidden');
}

export function showLoginScreen() {
  const authContainer = document.getElementById('auth-container');
  const appContent = document.getElementById('app-content');
  const mainHeader = document.querySelector('.main-header'); // Buscamos el header
  const moduleNav = document.querySelector('.module-nav'); // Buscamos la navegación

  // Muestra el login
  if (authContainer) authContainer.classList.remove('hidden');

  // Oculta el contenido de la app, el header y la navegación
  if (appContent) appContent.classList.add('hidden');
  if (mainHeader) mainHeader.classList.add('hidden');
  if (moduleNav) moduleNav.classList.add('hidden');

  // Limpia mensajes de error
  const messagesContainer = document.getElementById('app-messages-container');
  if (messagesContainer) messagesContainer.innerHTML = '';
}

// El resto de tu archivo (initializeViewButtons, showLoading, etc.)
// se mantiene exactamente igual.
export function initializeViewButtons() {
  const viewCardButton = document.getElementById('viewCardButton');
  const viewCalendarButton = document.getElementById('viewCalendarButton');
  if (!viewCardButton || !viewCalendarButton) return;

  const setActiveView = (viewType) => {
    setView(viewType);
    if (viewType === 'tarjetas') {
      viewCardButton.classList.add('active');
      viewCalendarButton.classList.remove('active');
    } else {
      viewCalendarButton.classList.add('active');
      viewCardButton.classList.remove('active');
    }
  };

  viewCardButton.addEventListener('click', () => setActiveView('tarjetas'));
  viewCalendarButton.addEventListener('click', () => setActiveView('calendario'));
  setActiveView(currentView.get() || 'tarjetas');
}

export function showLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

export function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

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
    messageElement.addEventListener(
      'transitionend',
      () => {
        if (messageElement.parentNode) {
          messagesContainer.removeChild(messageElement);
        }
      },
      { once: true }
    );
  }, duration);
}

export function showInitializeMonthModal() {
  const modal = document.getElementById('initialize-month-modal');
  if (modal) modal.classList.remove('hidden');
}

export function hideInitializeMonthModal() {
  const modal = document.getElementById('initialize-month-modal');
  if (modal) modal.classList.add('hidden');
}