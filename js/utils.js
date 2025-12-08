// js/utils.js

import { format, parse, isValid as dateFnsIsValid, parseISO as dateFnsParseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

export const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MADRID_TIMEZONE = 'Europe/Madrid';
export const parseISO = dateFnsParseISO;
export const isValid = dateFnsIsValid; // <-- Usaremos esta importación

export function formatDate(date, formatString) {
    if (!date || !isValid(date)) {
        console.warn('formatDate: Fecha de entrada inválida o no es un objeto Date.', date);
        return 'Fecha Inválida';
    }
    const zonedDate = toZonedTime(date, MADRID_TIMEZONE);
    return formatInTimeZone(zonedDate, MADRID_TIMEZONE, formatString, { locale: es });
}

export function parseDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return new Date('Invalid Date');
    }
    try {
        const parsed = parseISO(dateString + 'T00:00:00');
        if (isValid(parsed)) {
            return toZonedTime(parsed, MADRID_TIMEZONE);
        }
        return new Date('Invalid Date');
    } catch (e) {
        console.error('Error al parsear cadena de fecha con parseDateString:', dateString, e);
        return new Date('Invalid Date');
    }
}

/**
 * Convierte de forma segura un valor de Firestore (Timestamp, String, o Date) 
 * en un objeto Date de JavaScript válido.
 * @param {any} firestoreDate - El valor del campo de fecha de Firestore.
 * @returns {Date} Un objeto Date válido o un Date inválido si falla.
 */
export function parseFirestoreDate(firestoreDate) {
  // Caso 1: Es un Timestamp de Firestore (tiene el método .toDate())
  if (firestoreDate && typeof firestoreDate.toDate === 'function') {
    return firestoreDate.toDate();
  }

  // Caso 2: Ya es un objeto Date de JavaScript
  if (firestoreDate instanceof Date) {
    return firestoreDate;
  }

  // Caso 3: Es un String (ej. "2025-11-10" o "10/11/2025")
  if (typeof firestoreDate === 'string') {
    // Intenta con el parser robusto que ya tienes
    const parsed = parseDateRobust(firestoreDate); 
    if (isValid(parsed)) {
        return parsed;
    }
    // Intenta con el parser ISO (más fiable si es YYYY-MM-DD)
    const isoParsed = parseDateString(firestoreDate);
    if (isValid(isoParsed)) {
        return isoParsed;
    }
  }
  
  // Fallback: No se pudo convertir
  return new Date(null); // Devuelve 'Invalid Date'
}

export function parseDate(dateString, formatString) {
    return parse(dateString, formatString, new Date(), { locale: es });
}

/**
 * Genera un array de meses para un año dado con el formato correcto para tu app.
 * @param {number | string} year - El año para el cual generar los meses.
 * @returns {Array<{id: string, name: string}>}
 */
export function generateMonthsForYear(year) {
    
    // Convertimos el año a un número
    let validYear = parseInt(year, 10);

    // Si el resultado no es un número, usamos el año actual como fallback
    if (isNaN(validYear)) {
        validYear = new Date().getFullYear();
    }

    const months = [];
    const currentLocale = 'es-ES';

    for (let i = 0; i < 12; i++) {
        const date = new Date(validYear, i, 1); 
        
        // Verificación de seguridad adicional
        if (isNaN(date.getTime())) {
            console.error(`Fecha inválida generada para el mes ${i} del año ${validYear}`);
            continue;
        }

        // Obtener el nombre del mes en español y en minúsculas (CRÍTICO)
        const monthName = date.toLocaleString(currentLocale, { month: 'long' }).toLowerCase();
        
        // Generar el ID en el formato esperado: cuadrante_octubre_2025
        const monthId = `cuadrante_${monthName}_${validYear}`;
        
        // Nombre con mayúscula inicial para display
        const monthDisplayName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        
        months.push({
            id: monthId,           // ← CAMBIO CRÍTICO: Ahora incluye el ID completo
            name: monthDisplayName // Nombre formateado para mostrar
        });
    }
    
    return months;
}

/**
 * Formatea una fecha como "hace X tiempo" (a prueba de fallos).
 * @param {Date} date - El objeto Date a formatear.
 * @returns {string}
 */
export function formatTimeAgo(date) {
  // 🎨 MODIFICACIÓN: Usar 'isValid' de date-fns (que ya importas)
  // 🛑 ANTES: if (!isValidDate(date))
  if (!isValid(date)) { 
    return 'Fecha inválida';
  }

  const seconds = Math.floor((new Date() - date) / 1000);

  // Manejo de fechas futuras
  if (seconds < 0) {
     const days = Math.ceil(Math.abs(seconds) / (60 * 60 * 24));
     return `En ${days} día${days > 1 ? 's' : ''}`;
  }
  
  // Cálculo de tiempo (como antes)
  if (seconds < 60) return `hace ${seconds} seg`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} días`;
}

/**
 * Parsea una cadena de fecha (YYYY-MM-DD o DD/MM/YYYY) a un objeto Date.
 * @param {string} dateStr La cadena de fecha.
 * @returns {Date} Un objeto Date válido o un Invalid Date si falla.
 */
export function parseDateRobust(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return new Date(null); // Devuelve Invalid Date
    }

    // Formato 1: YYYY-MM-DD (ISO)
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            // new Date(year, monthIndex, day)
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
    }

    // Formato 2: DD/MM/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        if (parts.length === 3) {
            // new Date(year, monthIndex, day)
            // Se asume que parts[1] es el mes y parts[0] es el día
            return new Date(year, month - 1, day);
        }
    }
    
    // Fallback (último intento)
    const date = new Date(dateStr);
    return date;
}

// ❌ FUNCIÓN ELIMINADA: isValidDate (Duplicado)
/*
function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
}
*/

/**
 * Extrae el nombre del mes, año e índice (0-11) de un monthId.
 * @param {string} monthId - El ID del mes (ej: 'cuadrante_octubre_2025')
 * @returns {object} - Objeto con { monthName, year, monthIndex }
 */
export function getMonthDetails(monthId) { // ⭐️ AÑADIR EXPORT ⭐️
    if (!monthId || typeof monthId !== 'string') {
        // Devuelve valores por defecto razonables o maneja el error como prefieras
        const now = new Date();
        const currentMonthName = now.toLocaleString('es-ES', { month: 'long' }).toLowerCase();
        const currentYear = now.getFullYear();
        const currentIndex = now.getMonth();
        console.warn(`getMonthDetails recibió monthId inválido: ${monthId}. Usando mes actual.`);
        return { monthName: currentMonthName, year: currentYear, monthIndex: currentIndex };
    }
    const parts = monthId.split('_');
    const monthName = (parts[1] || '').toLowerCase();
    const year = parseInt(parts[2], 10) || new Date().getFullYear(); // Fallback al año actual

    // Asegúrate que MESES esté definido aquí o importado si es necesario
    const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const monthIndex = MESES.indexOf(monthName);

    // Devolver -1 si el mes no se encuentra
    if (monthIndex === -1) {
         console.error(`getMonthDetails: Nombre de mes inválido "${monthName}" en monthId "${monthId}"`);
    }

    return { monthName, year, monthIndex };
}

export function getMonthNumberFromName(monthName) {
    const date = parse(monthName, 'MMMM', new Date(), { locale: es });
    return date.getMonth();
}

/**
 * Devuelve el número de días que tiene un mes específico.
 * @param {Date} date - Una fecha dentro del mes que se quiere consultar.
 * @returns {number} El número de días del mes.
 */
export function getDaysInMonth(date) {
    // Se crea una fecha para el día 0 del mes SIGUIENTE,
    // lo que mágicamente nos da el último día del mes ACTUAL.
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// ✅ FUNCIÓN CORREGIDA Y SIMPLIFICADA
export function getShiftDisplayText(shiftType) {
    if (!shiftType) return '-';
    // Mapeo directo de todos los tipos conocidos a una sola letra o símbolo.
    const mappings = {
        Mañana: 'M',
        Tarde: 'T',
        Noche: 'N',
        Libre: 'L',
        Vacaciones: 'V',
        Permiso: 'P',
        Baja: 'B',
        'Asuntos Propios': 'AP',
        'Permiso Retribuido': 'P',
        Lc: 'L',
        PR: 'P', // Unificamos variantes a una sola letra
    };
    // Si el tipo ya es una letra conocida, la devolvemos.
    if (['M', 'T', 'N', 'L', 'V', 'P', 'B', 'AP'].includes(shiftType)) {
        return shiftType;
    }
    // Si no, buscamos en el mapa. Si no se encuentra, devolvemos un guion.
    return mappings[shiftType] || '-';
}

export function getShiftFullName(shiftType) {
    if (!shiftType) return 'Sin Turno';
    const mappings = {
        M: 'Mañana',
        T: 'Tarde',
        N: 'Noche',
        L: 'Libre',
        V: 'Vacaciones',
        PR: 'Permiso Retribuido',
        AP: 'Asuntos Propios',
    };
    if (shiftType === 'N') return 'No Aplica';
    return mappings[shiftType] || shiftType;
}

export function getTurnoInitial(shiftType) {
    if (!shiftType) return '-';
    const mappings = {
        Mañana: 'M',
        Tarde: 'T',
        Noche: 'N',
        Libre: 'L',
        Vacaciones: 'V',
        'Permiso Retribuido': 'PR',
        'Asuntos Propios': 'AP',
    };
    if (shiftType === 'N' || shiftType === 'Noche') return '-';
    if (['M', 'T', 'L', 'V', 'PR', 'AP'].includes(shiftType)) return shiftType;
    return mappings[shiftType] || (shiftType.length > 2 ? shiftType.substring(0, 2) : shiftType);
}

export function parseDateToISO(date) {
    if (!date || !dateFnsIsValid(date)) {
        return '';
    }
    return format(date, 'yyyy-MM-dd');
}

/**
 * Redimensiona una imagen en el navegador antes de subirla.
 * Mantiene la proporción y la comprime a un JPEG de alta calidad.
 * @param {File} file - El archivo de imagen original.
 * @param {number} maxWidth - El ancho máximo en píxeles.
 * @returns {Promise<Blob>} - Una promesa que se resuelve con el nuevo archivo (Blob) redimensionado.
 */
export function resizeImage(file, maxWidth = 1024) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scaleFactor = maxWidth / img.width;
                const newWidth = img.width > maxWidth ? maxWidth : img.width;
                const newHeight = img.width > maxWidth ? img.height * scaleFactor : img.height;

                canvas.width = newWidth;
                canvas.height = newHeight;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Convierte el canvas a un Blob (archivo) comprimido
                canvas.toBlob(
                    (blob) => {
                        resolve(blob);
                    },
                    'image/jpeg',
                    0.85
                ); // 85% de calidad
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

/**
 * Sanitiza una cadena de texto para prevenir XSS básico.
 * Reemplaza los caracteres <, >, &, ", ' con sus entidades HTML.
 * @param {string | null | undefined} str - La cadena a sanitizar.
 * @returns {string} - La cadena sanitizada.
 */
export function sanitizeHTML(str) {
    if (str === null || typeof str === 'undefined') {
        return '';
    }
    
    // Convertir a string por si acaso es un número
    const strSafe = String(str); 
    
    return strSafe.replace(/[&<>"']/g, function(match) {
        switch (match) {
            case '&':
                return '&amp;'; // Ampersand
            case '<':
                return '&lt;';  // Menor que
            case '>':
                return '&gt;';  // Mayor que
            case '"':
                return '&quot;'; // Comillas dobles
            case "'":
                return '&#39;';  // Comilla simple (más compatible que &apos;)
            default:
                return match;
        }
    });
}

// ============================================================================
// FUNCIÓN DE UTILIDAD: waitForElements
// Espera a que uno o más selectores estén presentes en el DOM.
// ============================================================================
/**
 * Espera a que uno o más elementos aparezcan en el DOM.
 * @param {string[]} selectors - Un array de selectores CSS (ej: ['#id1', '.class2'])
 * @param {number} [timeout=3000] - Tiempo máximo de espera en ms.
 * @param {Document|Element} [root=document] - El nodo raíz donde buscar.
 * @returns {Promise<Element[]>} Una promesa que resuelve con un array de los elementos encontrados.
 */
export function waitForElements(selectors, timeout = 3000, root = document) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkElements = () => {
            const elements = selectors.map(selector => root.querySelector(selector));
            
            // Si todos los elementos se encuentran (ninguno es null)
            if (elements.every(el => el !== null)) {
                resolve(elements);
            } 
            // Si el tiempo de espera se ha superado
            else if (Date.now() - startTime > timeout) {
                const missing = selectors.filter((s, i) => elements[i] === null);
                reject(new Error(`waitForElements: Timeout. Elementos no encontrados: ${missing.join(', ')}`));
            } 
            // Si no, seguir intentando en el siguiente frame
            else {
                requestAnimationFrame(checkElements);
            }
        };

        checkElements();
    });
}