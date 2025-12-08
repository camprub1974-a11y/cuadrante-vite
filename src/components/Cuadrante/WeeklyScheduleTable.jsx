// Archivo: /src/components/Cuadrante/WeeklyScheduleTable.jsx

import React, { useMemo, useEffect, useCallback } from 'react'; 
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, format, 
  isSameDay, isSameMonth, parse, getYear, getMonth, parseISO,
  addMonths, subMonths, addWeeks, subWeeks 
} from 'date-fns';
import { es } from 'date-fns/locale';
// 💡 IMPORTACIÓN COMPLETA
import { ChevronLeft, ChevronRight, Calendar, Grid, Layers, User } from 'react-feather';
import { useCalendarStore } from '../../store/calendarStore';
import { useGlobalStore } from '../../store/globalStore'; 

// 🔑 AÑADIR PROP onAddShiftClick
function WeeklyScheduleTable({ scheduleData = {}, novedades = [], onShiftClick, onAddShiftClick }) {
  // Traemos estado global
  const { 
    currentDate, viewMode, setViewMode, 
    navigateNext, navigatePrev, goToToday,
    loadScheduleForMonth, additionalMonthsData,
    selectedAgentId, setFilterAgent 
  } = useCalendarStore();

  // Traemos la lista de agentes para el selector
  const { agents } = useGlobalStore();

  // ... (Lógica de Novedades y Meses - SE MANTIENE IGUAL) ...
  const novedadesDates = useMemo(() => {
    const dates = new Set();
    novedades.forEach(novedad => {
      let dateStr = null;
      const raw = novedad.date || novedad.createdAt;
      if (raw) {
        if (raw.toDate) dateStr = format(raw.toDate(), 'yyyy-MM-dd');
        else if (typeof raw === 'string') dateStr = raw.includes('T') ? raw.split('T')[0] : raw;
        else if (raw instanceof Date) dateStr = format(raw, 'yyyy-MM-dd');
      }
      if (dateStr) dates.add(dateStr);
    });
    return dates;
  }, [novedades]);

  const hasNovedad = useCallback((day) => format(day, 'yyyy-MM-dd') && novedadesDates.has(format(day, 'yyyy-MM-dd')), [novedadesDates]);

  const getNovedadForDay = useCallback((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return novedades.find(novedad => {
      const d = novedad.date?.toDate ? novedad.date.toDate() : new Date(novedad.date);
      return format(d, 'yyyy-MM-dd') === dateStr;
    });
  }, [novedades]);

  const requiredMonths = useMemo(() => {
    const months = new Set();
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      months.add(`${getYear(start)}-${getMonth(start)}`);
      months.add(`${getYear(end)}-${getMonth(end)}`);
    } else {
      months.add(`${getYear(currentDate)}-${getMonth(currentDate)}`);
    }
    return Array.from(months);
  }, [currentDate, viewMode]);

  useEffect(() => {
    requiredMonths.forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      const monthDate = new Date(year, month, 1);
      if (loadScheduleForMonth) loadScheduleForMonth(monthDate);
    });
  }, [requiredMonths, loadScheduleForMonth]);

  const allScheduleData = useMemo(() => {
    const combined = { weeks: {} };
    const processedDates = new Set();
    const addWeekData = (weeks, sourceId = '') => {
      if (!weeks) return;
      Object.entries(weeks).forEach(([weekKey, weekData]) => {
        if (!weekData?.days) return;
        const uniqueWeekKey = sourceId ? `${sourceId}_${weekKey}` : weekKey;
        const filteredDays = {};
        Object.entries(weekData.days).forEach(([dayKey, dayData]) => {
          if (dayData?.date && !processedDates.has(dayData.date)) {
            processedDates.add(dayData.date);
            filteredDays[dayKey] = dayData;
          }
        });
        if (Object.keys(filteredDays).length > 0) {
          combined.weeks[uniqueWeekKey] = { ...weekData, days: filteredDays };
        }
      });
    };
    if (scheduleData?.weeks) addWeekData(scheduleData.weeks, scheduleData.id || 'main');
    if (additionalMonthsData) {
      Object.entries(additionalMonthsData).forEach(([monthId, monthData]) => {
        if (monthData?.weeks) addWeekData(monthData.weeks, monthId);
      });
    }
    return combined;
  }, [scheduleData, additionalMonthsData]);

  const displayDays = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const start = startOfWeek(monthStart, { weekStartsOn: 1 });
      const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  const weekGroups = useMemo(() => {
    if (viewMode === 'week') return [displayDays];
    const weeks = [];
    for (let i = 0; i < displayDays.length; i += 7) {
      weeks.push(displayDays.slice(i, i + 7));
    }
    return weeks;
  }, [displayDays, viewMode]);

  // 1. Definir Agentes Fijos (Tu plantilla)
  const localAgentIds = useMemo(() => ['4684', '4687', '5281', '5605', '8498'], []);

  // 2. 💡 DETECTAR AGENTES EXTERNOS O EXTRA EN LOS DATOS
  const allActiveAgents = useMemo(() => {
    const foundAgents = new Set(localAgentIds);

    // Recorremos todos los turnos cargados para ver si hay alguien más (Externos)
    if (allScheduleData?.weeks) {
        Object.values(allScheduleData.weeks).forEach(week => {
            if (!week.days) return;
            Object.values(week.days).forEach(day => {
                if (!day.shifts) return;
                Object.values(day.shifts).forEach(shift => {
                    // Si hay un agente con turno que no conocemos, lo añadimos
                    if (shift.agentId && !foundAgents.has(String(shift.agentId))) {
                        foundAgents.add(String(shift.agentId));
                    }
                });
            });
        });
    }
    return Array.from(foundAgents);
  }, [allScheduleData, localAgentIds]);

  // 3. 💡 FILTRADO PARA VISUALIZACIÓN
  const displayedAgentIds = useMemo(() => {
      // Si hay un filtro específico seleccionado
      if (selectedAgentId && selectedAgentId !== 'all') {
          return allActiveAgents.filter(id => String(id) === String(selectedAgentId));
      }
      // Si no, mostramos todos (Locales + Externos encontrados)
      return allActiveAgents;
  }, [selectedAgentId, allActiveAgents]);

  const normalizeDate = (dateInput) => { 
     if (!dateInput) return null;
     if (dateInput instanceof Date) return { iso: format(dateInput, 'yyyy-MM-dd') };
     if (typeof dateInput === 'string') return { iso: dateInput.includes('T') ? dateInput.split('T')[0] : dateInput };
     return null;
  };
  
  const getShiftsForAgentDay = (agentId, targetDate) => { 
     if (!allScheduleData?.weeks) return [];
     const dateStr = format(targetDate, 'yyyy-MM-dd');
     const shiftsForDay = [];
     const seenShiftIds = new Set();
     Object.values(allScheduleData.weeks).forEach(week => {
         Object.values(week.days || {}).forEach(day => {
             if(day.date === dateStr && day.shifts) {
                 Object.values(day.shifts).forEach(s => {
                     const shiftId = `${s.agentId}_${day.date}_${s.shiftType}`;
                     if(String(s.agentId) === String(agentId) && !seenShiftIds.has(shiftId)) {
                        shiftsForDay.push(s);
                        seenShiftIds.add(shiftId);
                     }
                 });
             }
         });
     });
     return shiftsForDay;
  };

  const shiftConfig = { 'M': { label: 'M', fullLabel: 'Mañana', gradient: 'linear-gradient(145deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)', shadowColor: 'rgba(59, 130, 246, 0.6)', glowColor: '#3b82f6', hours: '08:00 - 15:00' }, 'T': { label: 'T', fullLabel: 'Tarde', gradient: 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)', shadowColor: 'rgba(245, 158, 11, 0.6)', glowColor: '#f59e0b', hours: '14:00 - 21:00' }, 'N': { label: 'N', fullLabel: 'Noche', gradient: 'linear-gradient(145deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)', shadowColor: 'rgba(139, 92, 246, 0.6)', glowColor: '#8b5cf6', hours: '22:00 - 06:00' }, 'L': { label: 'L', fullLabel: 'Libre', gradient: 'linear-gradient(145deg, #34d399 0%, #10b981 50%, #059669 100%)', shadowColor: 'rgba(16, 185, 129, 0.6)', glowColor: '#10b981', hours: 'Día libre' }, 'V': { label: 'V', fullLabel: 'Vacaciones', gradient: 'linear-gradient(145deg, #f0abfc 0%, #e879f9 50%, #d946ef 100%)', shadowColor: 'rgba(217, 70, 239, 0.6)', glowColor: '#d946ef', hours: 'Vacaciones' }, 'B': { label: 'B', fullLabel: 'Baja', gradient: 'linear-gradient(145deg, #fca5a5 0%, #ef4444 50%, #dc2626 100%)', shadowColor: 'rgba(239, 68, 68, 0.6)', glowColor: '#ef4444', hours: 'Baja médica' }, 'LC': { label: 'LC', fullLabel: 'Licencia', gradient: 'linear-gradient(145deg, #f9a8d4 0%, #ec4899 50%, #db2777 100%)', shadowColor: 'rgba(236, 72, 153, 0.6)', glowColor: '#ec4899', hours: 'Licencia' }, 'R': { label: 'R', fullLabel: 'Refuerzo', gradient: 'linear-gradient(145deg, #5eead4 0%, #14b8a6 50%, #0d9488 100%)', shadowColor: 'rgba(20, 184, 166, 0.6)', glowColor: '#14b8a6', hours: 'Turno refuerzo' } };

  const handlePrev = () => navigatePrev();
  const handleNext = () => navigateNext();
  const handleToday = () => goToToday();

  // 💡💡💡 COMPONENTE BADGE INTELIGENTE 💡💡💡
  const ShiftBadge = ({ shift, isCompact = false, showNovedad = false, novedadInfo = null, onClick }) => {
    const config = shiftConfig[shift.shiftType] || shiftConfig['L'];
    const isRefuerzo = shift.shiftType === 'R';
    
    // Si es refuerzo, intentamos extraer la hora corta (Ej: "22:00 - 06:00" -> "22-06")
    let displayLabel = shift.shiftType;
    let displayTime = "";
    
    if (isRefuerzo && shift.customTime) {
        // Extraer horas simples (Ej: de "22:00 - 06:00" a "22-06")
        const matches = shift.customTime.match(/(\d{2}):\d{2}.*?(\d{2}):\d{2}/);
        if (matches) {
            displayTime = `${matches[1]}-${matches[2]}`;
        } else {
             displayTime = shift.customTime; // Fallback completo si no hay patrón
        }
    }

    // Tamaño dinámico: si es refuerzo con hora, lo hacemos más ancho
    const width = isRefuerzo && displayTime ? 'auto' : (isCompact ? '36px' : '50px');
    const padding = isRefuerzo && displayTime ? '0 8px' : '0';
    const fontSize = isCompact ? '13px' : '16px';

    const tooltipText = shift.customTime 
        ? `Refuerzo: ${shift.customTime}\n${shift.agentName ? 'Agente: ' + shift.agentName : ''}` 
        : `${config.fullLabel}\n${config.hours}`;

    return (
      <div
        className="shift-badge-enhanced"
        style={{
          position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: width, height: isCompact ? '36px' : '50px', minWidth: isCompact ? '36px' : '50px',
          background: config.gradient, color: '#ffffff', borderRadius: '10px', padding: padding,
          fontSize: fontSize, fontWeight: '800', fontFamily: "'Inter', sans-serif", cursor: 'pointer',
          boxShadow: `0 4px 15px ${config.shadowColor}`, border: '2px solid rgba(255, 255, 255, 0.2)',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        }}
        title={tooltipText}
        onClick={(e) => {
            e.stopPropagation();
            if(onClick) onClick();
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; }}
      >
        {/* Si es Refuerzo, mostramos R arriba y hora abajo */}
        {isRefuerzo && displayTime ? (
            <>
                <span style={{fontSize: '0.7em', lineHeight: 1}}>R</span>
                <span style={{fontSize: '0.55em', fontWeight: '600', opacity: 0.9, whiteSpace: 'nowrap'}}>{displayTime}</span>
            </>
        ) : (
            config.label
        )}

        {showNovedad && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px',
            backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid rgba(30, 41, 59, 0.9)',
            boxShadow: '0 0 8px #ef4444', animation: 'pulse-novedad 2s infinite',
          }} />
        )}
      </div>
    );
  };
  
  const renderAgentRow = (agentId, days, isCompact = false) => {
    // Intentar buscar el nombre si es un ID conocido, o dejar el ID si es externo
    // (Nota: Para agentes externos puros, el ID guardado suele ser 'EXTERNO' o el nombre, 
    // pero aquí visualizamos el ID. Si quieres el nombre, necesitaríamos buscarlo en el turno específico).
    
    return (
      <tr key={agentId} className="weekly-schedule-table__body-row">
          <td className="weekly-schedule-table__agent-cell">
            {/* Si el ID es muy largo (ej. nombre externo), reducimos la fuente */}
            <span 
              className="weekly-schedule-table__agent-badge" 
              style={agentId.length > 4 ? {fontSize: '10px', width: 'auto', padding: '0 5px'} : {}}
            >
              {agentId}
            </span>
          </td>
          {days.map((day, idx) => {
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);
              const shifts = getShiftsForAgentDay(agentId, day);
              const dayHasNovedad = hasNovedad(day);
              const novedadInfo = dayHasNovedad ? getNovedadForDay(day) : null;
              
              return (
                  <td 
                    key={idx} 
                    className={`weekly-schedule-table__shift-cell ${isToday ? 'weekly-schedule-table__shift-cell--today' : ''} ${dayHasNovedad ? 'has-novedad' : ''}`}
                    style={{ opacity: viewMode === 'month' && !isCurrentMonth ? 0.4 : 1, height: isCompact ? '55px' : '70px', position: 'relative' }}
                  >
                    {/* 💡 BOTÓN AÑADIR (+) EN ESQUINA - Visible al pasar el ratón (CSS) */}
                    {onAddShiftClick && (
                        <div 
                            onClick={(e) => { e.stopPropagation(); onAddShiftClick(format(day, 'yyyy-MM-dd')); }}
                            style={{
                                position: 'absolute', top: 2, right: 2, width: '16px', height: '16px', 
                                borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s',
                                color: 'var(--color-accent-neon)', background: 'rgba(255,255,255,0.1)'
                            }}
                            className="add-shift-btn"
                            title="Añadir turno extra"
                        >
                            +
                        </div>
                    )}

                    <div className="weekly-schedule-table__shifts-container">
                      {shifts.map((s, i) => <ShiftBadge key={i} shift={s} isCompact={isCompact} showNovedad={dayHasNovedad} novedadInfo={novedadInfo} onClick={() => onShiftClick && onShiftClick(s, format(day, 'yyyy-MM-dd'))} />)}
                      
                      {shifts.length === 0 && (
                          <div 
                            className="weekly-schedule-table__empty-cell" 
                            onClick={() => onShiftClick && onShiftClick({ agentId, shiftType: 'L' }, format(day, 'yyyy-MM-dd'))}
                          >
                              {dayHasNovedad ? <span style={{color: 'rgba(255,255,255,0.5)'}}>—</span> : '—'}
                          </div>
                      )}
                    </div>
                  </td>
              );
          })}
      </tr>
    );
  };

  const getTitle = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return `Semana del ${format(start, 'dd/MM/yyyy')} al ${format(end, 'dd/MM/yyyy')}`;
    } else {
      return format(currentDate, "MMMM 'de' yyyy", { locale: es }).toUpperCase();
    }
  };

  // Se extraen los handlers de navegación del store para usar en la UI
  const handleGoToToday = () => goToToday();

  return (
    <div className="weekly-schedule-table__container">
      <div className="weekly-schedule-table__header">
        <div className="weekly-schedule-table__title">
          <Calendar size={24} className="weekly-schedule-table__icon" />
          <span className="weekly-schedule-table__text">{getTitle()}</span>
        </div>

        <div className="weekly-schedule-table__controls">
          {/* 💡 SELECTOR DE AGENTES INTEGRADO */}
          <div style={{display: 'flex', alignItems: 'center', marginRight: '1rem', position: 'relative'}}>
            <User size={16} style={{position: 'absolute', left: '10px', color: 'var(--color-text-secondary)', pointerEvents: 'none'}} />
            <select 
              value={selectedAgentId} 
              onChange={(e) => setFilterAgent(e.target.value)}
              className="selector"
              style={{paddingLeft: '32px', height: '36px', minWidth: '150px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.9rem', cursor: 'pointer', appearance: 'none'}}
            >
              <option value="all" style={{color: 'black'}}>Todos los Agentes</option>
              {/* Usamos allActiveAgents aquí para tener la lista completa en el filtro */}
              {allActiveAgents.map(id => {
                const agent = agents.find(a => a.id === id) || { name: `Agente ${id}` };
                return (
                    <option key={id} value={id} style={{color: 'black'}}>
                        {agent.name}
                    </option>
                );
              })}
            </select>
            {/* 🔑 SOLUCIÓN DE ACCESIBILIDAD/VISUAL: Flecha manual */}
            <div style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
              pointerEvents: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '10px', zIndex: 1 
            }}>▼</div>
          </div>

          <div className="weekly-schedule-table__view-toggle">
            <button onClick={() => setViewMode('week')} className={`weekly-schedule-table__toggle-btn ${viewMode === 'week' ? 'weekly-schedule-table__toggle-btn--active' : ''}`}><Layers size={16} /><span>Semana</span></button>
            <button onClick={() => setViewMode('month')} className={`weekly-schedule-table__toggle-btn ${viewMode === 'month' ? 'weekly-schedule-table__toggle-btn--active' : ''}`}><Grid size={16} /><span>Mes</span></button>
          </div>
          <div className="weekly-schedule-table__nav">
            <button onClick={handlePrev} className="weekly-schedule-table__nav-btn"><ChevronLeft size={20} /></button>
            <button onClick={handleGoToToday} className="weekly-schedule-table__nav-btn weekly-schedule-table__nav-btn--active">Hoy</button>
            <button onClick={handleNext} className="weekly-schedule-table__nav-btn"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <div className="weekly-schedule-table__wrapper">
        {viewMode === 'week' ? (
          <table className="weekly-schedule-table__table">
            <thead>
              <tr className="weekly-schedule-table__header-row">
                <th className="weekly-schedule-table__header-agent">Agente</th>
                {displayDays.map((day, idx) => (
                  <th 
                    key={idx} 
                    className={`weekly-schedule-table__header-day ${isSameDay(day, new Date()) ? 'weekly-schedule-table__header-day--today' : ''}`}
                    style={{ position: 'relative' }} // Asegurar posicionamiento relativo para el botón
                  >
                    <span className="weekly-schedule-table__day-short">{format(day, 'eee', { locale: es })}</span>
                    <span className="weekly-schedule-table__day-num">{format(day, 'd')}</span>
                    
                    {/* 💡 BOTÓN AÑADIR (Añadido al TH) */}
                    {onAddShiftClick && (
                        <button 
                            className="icon-button-xs" 
                            onClick={(e) => { e.stopPropagation(); onAddShiftClick(format(day, 'yyyy-MM-dd')); }}
                            style={{
                                position: 'absolute', top: 2, right: 2, 
                                background: 'rgba(0,255,136,0.2)', color: '#00ff88',
                                border: 'none', borderRadius: '4px', cursor: 'pointer',
                                padding: '2px 4px', fontSize: '12px', lineHeight: '1', fontWeight: 'bold'
                            }}
                            title="Añadir Refuerzo/Externo"
                        >
                            +
                        </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 💡 RENDERIZAMOS LA LISTA FILTRADA */}
              {displayedAgentIds.map((agentId) => renderAgentRow(agentId, displayDays))}
            </tbody>
          </table>
        ) : (
          // VISTA MENSUAL
          <div className="weekly-schedule-table__month-view">
            {weekGroups.map((weekDays, weekIdx) => (
              <div key={weekIdx} className="weekly-schedule-table__week-block">
                <div className="weekly-schedule-table__week-label">Semana {weekIdx + 1} <span className="weekly-schedule-table__week-dates">{format(weekDays[0], 'dd/MM')} - {format(weekDays[6], 'dd/MM')}</span></div>
                <table className="weekly-schedule-table__table weekly-schedule-table__table--compact">
                  <thead>
                    <tr className="weekly-schedule-table__header-row">
                      <th className="weekly-schedule-table__header-agent">Ag.</th>
                      {weekDays.map((day, idx) => (
                        <th 
                          key={idx} 
                          className={`weekly-schedule-table__header-day ${isSameDay(day, new Date()) ? 'weekly-schedule-table__header-day--today' : ''}`} 
                          style={{ opacity: isSameMonth(day, currentDate) ? 1 : 0.4, position: 'relative' }} // Asegurar posicionamiento relativo
                        >
                          <span className="weekly-schedule-table__day-short">{format(day, 'EEEEE', { locale: es })}</span>
                          <span className="weekly-schedule-table__day-num" style={{ fontSize: '14px' }}>{format(day, 'd')}</span>
                            
                          {/* 💡 BOTÓN AÑADIR */}
                          {onAddShiftClick && (
                              <button 
                                  className="icon-button-xs" 
                                  onClick={(e) => { e.stopPropagation(); onAddShiftClick(format(day, 'yyyy-MM-dd')); }}
                                  style={{
                                      position: 'absolute', top: 2, right: 2, 
                                      background: 'rgba(0,255,136,0.2)', color: '#00ff88',
                                      border: 'none', borderRadius: '4px', cursor: 'pointer',
                                      padding: '2px 4px', fontSize: '10px', lineHeight: '1', fontWeight: 'bold' // Reducir tamaño para vista mensual compacta
                                  }}
                                  title="Añadir Refuerzo/Externo"
                              >
                                  +
                              </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{displayedAgentIds.map((agentId) => renderAgentRow(agentId, weekDays, true))}</tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Estilo para el hover del botón + (Aplicado en el renderAgentRow) */}
      <style>{`
          .weekly-schedule-table__shift-cell:hover .add-shift-btn {
              opacity: 1 !important;
          }
      `}</style>
      
      {/* Leyenda */}
      <div className="weekly-schedule-table__legend">
        <div className="weekly-schedule-table__legend-title">Leyenda de Turnos</div>
        <div className="weekly-schedule-table__legend-items">
          {Object.entries(shiftConfig).map(([key, config]) => (
            <div key={key} className="weekly-schedule-table__legend-item">
              <div className="weekly-schedule-table__legend-badge" style={{ background: config.gradient, boxShadow: `0 2px 8px ${config.shadowColor}`, border: '2px solid rgba(255,255,255,0.15)' }}>{config.label}</div>
              <div className="weekly-schedule-table__legend-info"><span className="weekly-schedule-table__legend-text">{config.fullLabel}</span><span className="weekly-schedule-table__legend-hours">{config.hours}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WeeklyScheduleTable;