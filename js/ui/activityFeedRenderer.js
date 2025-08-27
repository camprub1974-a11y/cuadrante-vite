// js/ui/activityFeedRenderer.js

import { scheduleData } from '../state.js'; // Importar scheduleData para obtener markedDates
import { formatDate } from '../utils.js'; // Para formatear las fechas

const activityFeedContainer = document.getElementById('activity-feed-container');

export function renderActivityFeed() {
    if (!activityFeedContainer) {
        console.warn("Contenedor de feed de actividad (#activity-feed-container) no encontrado.");
        return;
    }

    const currentScheduleData = scheduleData.get();
    if (!currentScheduleData || !currentScheduleData.markedDates || currentScheduleData.markedDates.length === 0) {
        activityFeedContainer.innerHTML = '<p>No hay novedades destacadas para este mes.</p>';
        return;
    }

    const markedDates = currentScheduleData.markedDates;
    
    // Ordenar por fecha
    markedDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    let feedHtml = '<ul>';
    markedDates.forEach(event => {
        const formattedDate = formatDate(event.date, 'dd MMMM'); // Formato "01 Mayo"
        feedHtml += `<li><strong>${formattedDate}:</strong> ${event.title} (${event.type.replace('_', ' ')})</li>`;
    });
    feedHtml += '</ul>';

    activityFeedContainer.innerHTML = feedHtml;
    console.log("[DEBUG - activityFeedRenderer] Feed de actividad renderizado con fechas marcadas.");
}

// Suscribirse a scheduleData para que el feed se actualice cuando cambie el mes/cuadrante
scheduleData.subscribe(renderActivityFeed);