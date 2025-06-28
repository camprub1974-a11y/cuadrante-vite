// js/ui/viewManager.js

import { currentView, setView } from '../state.js';

const messagesContainer = document.getElementById('app-messages-container');
let messageTimeout;

export function showAppContent(userEmail) {
    const authContainer = document.getElementById('auth-container');
    const appContent = document.getElementById('app-content');
    const logoutButton = document.getElementById('logout-button');
    const authStatus = document.getElementById('authStatus');

    console.log('[DEBUG] showAppContent ejecutada. Intentando mostrar logoutButton.');
    console.log('[DEBUG] logoutButton element (should not be null):', logoutButton);

    if (authContainer) authContainer.style.display = 'none';
    if (appContent) appContent.style.display = 'block';
    if (logoutButton) logoutButton.style.display = 'block';
    if (authStatus && userEmail) authStatus.textContent = `Conectado: ${userEmail}`;
    if (messagesContainer) messagesContainer.innerHTML = ''; 
}

export function showLoginScreen() {
    const authContainer = document.getElementById('auth-container');
    const appContent = document.getElementById('app-content');
    const logoutButton = document.getElementById('logout-button');
    const authStatus = document.getElementById('authStatus');
    if (appContent) appContent.style.display = 'none';
    if (authContainer) authContainer.style.display = 'block';
    if (logoutButton) logoutButton.style.display = 'none';
    if (authStatus) authStatus.textContent = 'Por favor, inicia sesión.';
    if (messagesContainer) messagesContainer.innerHTML = ''; 
}

export function initializeViewButtons() {
    const viewCardButton = document.getElementById('viewCardButton');
    const viewCalendarButton = document.getElementById('viewCalendarButton');
    if (!viewCardButton || !viewCalendarButton) return;

    const setActiveView = (viewType) => {
        console.log(`[DEBUG viewManager] setActiveView llamado con viewType: ${viewType}`); // <-- LOG DE DEPURACIÓN
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

    // Asegurarse de que el estado inicial del botón "activo" coincide con el átomo
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
        messageElement.addEventListener('transitionend', () => {
            if (messageElement.parentNode) {
                messagesContainer.removeChild(messageElement);
            }
        }, { once: true });
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