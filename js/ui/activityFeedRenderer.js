// js/ui/activityFeedRenderer.js (Versión Recomendada)

import { getLatestMarkedDates } from '../dataController.js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const feedContainer = document.getElementById('activity-feed-container');

// Mapeo para dar un estilo visual a cada tipo de novedad
const typeStyles = {
    fiesta_local: { icon: 'sun', color: '#ea580c' },
    fiesta_nacional: { icon: 'flag', color: '#dc2626' },
    evento_especial: { icon: 'star', color: '#8b5cf6' },
    otros: { icon: 'info', color: '#6b7280' },
};

/**
 * Renderiza el feed con las últimas novedades globales en la barra lateral.
 * @async
 */
export async function renderActivityFeed() {
    if (!feedContainer) return;
    feedContainer.innerHTML = '<p class="info-message">Cargando novedades...</p>';

    try {
        // 1. Obtenemos las últimas fechas señaladas, sin importar el mes
        const items = await getLatestMarkedDates();

        if (items.length === 0) {
            feedContainer.innerHTML = '<p class="info-message">No hay novedades recientes.</p>';
            return;
        }

        // 2. Generamos el HTML con un diseño mejorado
        const html = items.map(item => {
            const date = item.date.toDate();
            // Formateamos la fecha a un formato legible como "18 de octubre"
            const formattedDate = format(date, "d 'de' MMMM", { locale: es });
            const style = typeStyles[item.type] || typeStyles.otros;

            return `
                <div class="feed-item">
                    <div class="feed-item-icon" style="background-color: ${style.color};">
                        <i data-feather="${style.icon}"></i>
                    </div>
                    <div class="feed-item-content">
                        <strong class="feed-item-title">${item.title}</strong>
                        <span class="feed-item-date">${formattedDate}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        feedContainer.innerHTML = `<div class="feed-list">${html}</div>`;
        if (window.feather) feather.replace(); // Actualizamos los iconos de Feather

    } catch (error) {
        console.error("Error al renderizar el feed de actividad:", error);
        feedContainer.innerHTML = '<p class="error-message">No se pudieron cargar las novedades.</p>';
    }
}