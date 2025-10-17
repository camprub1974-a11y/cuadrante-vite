<<<<<<< HEAD
// js/ui/viewManager.js (VERSIÓN ADAPTADA PARA TOAST UI CALENDAR)
=======
// js/ui/viewManager.js (VERSIÓN FINAL Y CORREGIDA)
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33

import { currentView, setView } from '../state.js';

const messagesContainer = document.getElementById('app-messages-container');
let messageTimeout;

<<<<<<< HEAD
/**
 * Muestra el contenido principal de la aplicación y oculta el login.
 */
export function showAppContent() {
  const authContainer = document.getElementById('auth-container');
  const appContent = document.getElementById('app-content');
  const mainHeader = document.querySelector('.main-header');
  const moduleNav = document.querySelector('.module-nav');

  if (authContainer) authContainer.classList.add('hidden');
=======
export function showAppContent(userEmail) {
  const authContainer = document.getElementById('auth-container');
  const appContent = document.getElementById('app-content');
  const mainHeader = document.querySelector('.main-header'); // Buscamos el header
  const moduleNav = document.querySelector('.module-nav'); // Buscamos la navegación

  // Oculta el login
  if (authContainer) authContainer.classList.add('hidden');
  
  // Muestra el contenido de la app, el header y la navegación
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
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
<<<<<<< HEAD
  const mainHeader = document.querySelector('.main-header');
  const moduleNav = document.querySelector('.module-nav');

  if (authContainer) authContainer.classList.remove('hidden');
=======
  const mainHeader = document.querySelector('.main-header'); // Buscamos el header
  const moduleNav = document.querySelector('.module-nav'); // Buscamos la navegación

  // Muestra el login
  if (authContainer) authContainer.classList.remove('hidden');

  // Oculta el contenido de la app, el header y la navegación
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
  if (appContent) appContent.classList.add('hidden');
  if (mainHeader) mainHeader.classList.add('hidden');
  if (moduleNav) moduleNav.classList.add('hidden');

<<<<<<< HEAD
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
=======
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

>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
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
<<<<<<< HEAD
    messageElement.addEventListener('transitionend', () => {
      if (messageElement.parentNode) {
        messagesContainer.removeChild(messageElement);
      }
    }, { once: true });
=======
    messageElement.addEventListener(
      'transitionend',
      () => {
        if (messageElement.parentNode) {
          messagesContainer.removeChild(messageElement);
        }
      },
      { once: true }
    );
>>>>>>> 96c3d57486e4f06bd38451d4c921030c59481b33
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