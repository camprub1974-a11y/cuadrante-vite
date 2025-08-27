// js/ui/reportSummaryModal.js

import { updateReportSummary } from '../dataController.js';
import { displayMessage, showLoading, hideLoading } from './viewManager.js';

let modal, form, closeButton, currentReportId;

export function initializeReportSummaryModal() {
    modal = document.getElementById('report-summary-modal');
    if (!modal) return;

    form = modal.querySelector('#report-summary-form');
    closeButton = modal.querySelector('.close-button');

    closeButton.addEventListener('click', () => modal.classList.add('hidden'));
    form.addEventListener('submit', handleFormSubmit);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    // ✅ USAMOS DELEGACIÓN DE EVENTOS PARA LOS BOTONES +/-
    form.addEventListener('click', (event) => {
        const button = event.target.closest('.stepper-btn');
        if (!button) return;

        const input = button.parentElement.querySelector('input[type="number"]');
        if (!input) return;
        
        let currentValue = parseInt(input.value, 10) || 0;

        if (button.classList.contains('stepper-plus')) {
            currentValue++;
        } else if (button.classList.contains('stepper-minus')) {
            currentValue--;
        }

        // Asegurarse de no bajar de 0
        input.value = Math.max(0, currentValue);
    });
}

export function openReportSummaryModal(report) {
    if (!modal) return;
    
    currentReportId = report.id;
    const summaryData = report.summary || {};

    form.querySelectorAll('input[type="number"]').forEach(input => {
        const key = input.dataset.key;
        input.value = summaryData[key] || '0'; // Poner 0 por defecto
    });

    modal.classList.remove('hidden');
}

async function handleFormSubmit(event) {
    event.preventDefault();
    showLoading();

    const summaryData = {};
    form.querySelectorAll('input[type="number"]').forEach(input => {
        const key = input.dataset.key;
        const value = parseInt(input.value, 10);
        if (!isNaN(value) && value >= 0) {
            summaryData[key] = value;
        }
    });

    try {
        await updateReportSummary(currentReportId, summaryData);
        displayMessage('Resumen de actuaciones guardado con éxito.', 'success');
        modal.classList.add('hidden');
        document.dispatchEvent(new CustomEvent('reportSummaryUpdated'));
    } catch (error) {
        displayMessage(`Error al guardar el resumen: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}