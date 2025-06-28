// js/utils.js

import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function formatDate(date, formatString) {
  if (!date || isNaN(date)) return 'Inválida';
  return format(date, formatString, { locale: es });
}

export function parseDate(dateString, formatString) {
  return parse(dateString, formatString, new Date());
}

export function generateMonthsForYear(year) {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(year, i, 1);
    const monthName = format(monthDate, 'MMMM', { locale: es });

    months.push({
      id: `cuadrante_${monthName.toLowerCase()}_${year}`,
      name: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    });
  }
  return months;
}

export function getMonthNumberFromName(monthName) {
  const date = parse(monthName, 'MMMM', new Date(), { locale: es });
  return date.getMonth();
}

export function getShiftDisplayText(shiftType) {
    if (!shiftType) return '-';
    const mappings = {
        'Mañana': 'M',
        'Tarde': 'T',
        'Noche': 'N',
        'Libre': 'L',
        'Vacaciones': 'V',
        'Permiso Retribuido': 'PR',
        'Asuntos Propios': 'AP',
    };
    if (['M', 'T', 'N', 'L', 'V', 'PR', 'AP', '-'].includes(shiftType)) {
        return shiftType;
    }
    return mappings[shiftType] || (shiftType.length > 2 ? shiftType.substring(0,2) : shiftType);
}

export function getShiftFullName(shiftType) {
    if (!shiftType) return 'Sin Turno';
    const mappings = {
        'M': 'Mañana',
        'T': 'Tarde',
        'N': 'Noche',
        'L': 'Libre',
        'V': 'Vacaciones',
        'PR': 'Permiso Retribuido',
        'AP': 'Asuntos Propios',
    };
    return mappings[shiftType] || shiftType;
}

export function getTurnoInitial(shiftType) {
    if (!shiftType) return '-';
    const mappings = {
        'Mañana': 'M',
        'Tarde': 'T',
        'Noche': 'N',
        'Libre': 'L',
        'Vacaciones': 'V',
        'Permiso Retribuido': 'PR',
        'Asuntos Propios': 'AP',
    };
    if (['M', 'T', 'N', 'L', 'V', 'PR', 'AP'].includes(shiftType)) {
        return shiftType;
    }
    return mappings[shiftType] || (shiftType.length > 2 ? shiftType.substring(0,2) : shiftType);
}