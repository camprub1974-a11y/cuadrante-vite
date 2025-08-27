// js/utils.js

import { format, parse, isValid as dateFnsIsValid, parseISO as dateFnsParseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

export const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MADRID_TIMEZONE = 'Europe/Madrid';
export const parseISO = dateFnsParseISO;
export const isValid = dateFnsIsValid;

export function formatDate(date, formatString) {
  if (!date || !isValid(date)) { 
      console.warn("formatDate: Fecha de entrada inválida o no es un objeto Date.", date);
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
        console.error("Error al parsear cadena de fecha con parseDateString:", dateString, e);
        return new Date('Invalid Date');
    }
}

export function parseDate(dateString, formatString) {
  return parse(dateString, formatString, new Date(), { locale: es });
}

export function generateMonthsForYear(year) {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(year, i, 1);
    const monthName = formatInTimeZone(monthDate, MADRID_TIMEZONE, 'MMMM', { locale: es });
    months.push({
      id: `cuadrante_${monthName.toLowerCase()}_${year}`,
      name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      monthIndex: i
    });
  }
  return months;
}

export function getMonthNumberFromName(monthName) {
  const date = parse(monthName, 'MMMM', new Date(), { locale: es });
  return date.getMonth();
}

// ✅ FUNCIÓN CORREGIDA Y SIMPLIFICADA
export function getShiftDisplayText(shiftType) {
    if (!shiftType) return '-';
    // Mapeo directo de todos los tipos conocidos a una sola letra o símbolo.
    const mappings = {
        'Mañana': 'M', 'Tarde': 'T', 'Noche': 'N', 'Libre': 'L',
        'Vacaciones': 'V', 'Permiso': 'P', 'Baja': 'B', 'Asuntos Propios': 'AP',
        'Permiso Retribuido': 'P', 'Lc': 'L', 'PR': 'P' // Unificamos variantes a una sola letra
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
    const mappings = { 'M': 'Mañana', 'T': 'Tarde', 'N': 'Noche', 'L': 'Libre', 'V': 'Vacaciones', 'PR': 'Permiso Retribuido', 'AP': 'Asuntos Propios' };
    if (shiftType === 'N') return 'No Aplica'; 
    return mappings[shiftType] || shiftType;
}

export function getTurnoInitial(shiftType) {
    if (!shiftType) return '-';
    const mappings = { 'Mañana': 'M', 'Tarde': 'T', 'Noche': 'N', 'Libre': 'L', 'Vacaciones': 'V', 'Permiso Retribuido': 'PR', 'Asuntos Propios': 'AP' };
    if (shiftType === 'N' || shiftType === 'Noche') return '-';
    if (['M', 'T', 'L', 'V', 'PR', 'AP'].includes(shiftType)) return shiftType;
    return mappings[shiftType] || (shiftType.length > 2 ? shiftType.substring(0,2) : shiftType);
}

export function parseDateToISO(date) {
  if (!date || !dateFnsIsValid(date)) {
    return '';
  }
  return format(date, 'yyyy-MM-dd');
}