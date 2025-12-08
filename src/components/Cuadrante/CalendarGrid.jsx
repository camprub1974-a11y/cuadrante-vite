import React from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, format 
} from 'date-fns';
import { useAuthStore } from '../../store/authStore';
// ✅ ICONOS FEATHER INTEGRADOS
import { Sun, Moon, Briefcase, Coffee, Umbrella, Activity, HelpCircle } from 'react-feather';

// ✅ CONFIGURACIÓN DE ICONOS POR TURNO
const SHIFT_CONFIG = {
  'M': { icon: Sun, label: 'M', color: '#86efac' },       // Mañana - Verde
  'T': { icon: Briefcase, label: 'T', color: '#60a5fa' }, // Tarde - Azul
  'N': { icon: Moon, label: 'N', color: '#818cf8' },      // Noche - Indigo
  'L': { icon: Coffee, label: 'L', color: '#9ca3af' },    // Libre - Gris
  'V': { icon: Umbrella, label: 'V', color: '#fbbf24' },  // Vacaciones - Amarillo
  'B': { icon: Activity, label: 'B', color: '#f87171' },  // Baja - Rojo
};

const AGENT_LETTER_MAP = {
  '4684': 'O', '5605': 'A', '5281': 'B', '8498': 'C', '4687': 'D'
};

function CalendarGrid({ currentDate, scheduleData, onShiftClick, filterAgentId }) {
  const { user } = useAuthStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getShiftsForDate = (dateObj) => {
    if (!scheduleData || !scheduleData.weeks) return [];
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    for (const week of Object.values(scheduleData.weeks)) {
      if (!week.days) continue;
      for (const day of Object.values(week.days)) {
        if (day.date === dateStr && day.shifts) {
          return Object.values(day.shifts);
        }
      }
    }
    return [];
  };

  return (
    <div className="calendar-wrapper">
      {/* HEADER - DÍAS DE LA SEMANA */}
      <div className="schedule-header">
        <div>Lunes</div>
        <div>Martes</div>
        <div>Miércoles</div>
        <div>Jueves</div>
        <div>Viernes</div>
        <div>Sábado</div>
        <div>Domingo</div>
      </div>

      {/* GRID - DÍAS DEL MES */}
      <div className="schedule-body">
        {calendarDays.map((day) => {
          const dateKey = day.toISOString();
          const isCurrent = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          const shifts = getShiftsForDate(day);

          // Ordenar turnos (Mañana, Tarde, Noche)
          const order = { 'M': 1, 'T': 2, 'N': 3 };
          shifts.sort((a, b) => (order[a.shiftType] || 99) - (order[b.shiftType] || 99));

          return (
            <div 
              key={dateKey} 
              className={`day-cell ${!isCurrent ? 'not-current-month' : ''} ${isToday ? 'today' : ''}`}
            >
              {/* NÚMERO DEL DÍA */}
              <div className="day-number">{format(day, 'd')}</div>
              
              {/* CONTENEDOR DE TURNOS */}
              <div className="shifts-container">
                {shifts.map((shift, idx) => {
                  // ✅ FILTRO DE AGENTE
                  if (filterAgentId && filterAgentId !== 'all' && String(shift.agentId) !== String(filterAgentId)) {
                    return null;
                  }

                  const typeClass = `shift-${shift.shiftType.toLowerCase()}`;
                  const agentLetter = AGENT_LETTER_MAP[shift.agentId] || shift.agentId;
                  
                  // ✅ OBTENER CONFIGURACIÓN DE ICONO
                  const Config = SHIFT_CONFIG[shift.shiftType] || { icon: HelpCircle, label: shift.shiftType, color: '#9ca3af' };
                  const IconComponent = Config.icon;

                  return (
                    <div 
                      key={`${dateKey}-${idx}`} 
                      className={`shift-tag ${typeClass}`}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onShiftClick(shift, day); 
                      }}
                      title={`${Config.label} - Agente: ${shift.agentId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 8px'
                      }}
                    >
                      {/* ICONO + LABEL */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <IconComponent size={14} strokeWidth={3} color={Config.color} />
                        <span>{Config.label}</span>
                      </div>
                      
                      {/* AGENTE */}
                      <span style={{
                        opacity: 0.8,
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        {agentLetter}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarGrid;