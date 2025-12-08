// Archivo: /src/components/Cuadrante/QuadrantStats.jsx

import React, { useMemo } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
// 💡 ACTUALIZACIÓN DE IMPORTS: Añadimos las funciones de intervalo y fin de mes
import { isWithinInterval, startOfWeek, endOfWeek, parseISO, format, startOfMonth, endOfMonth } from 'date-fns'; 
import { Clock, Sun, Moon, Briefcase, Coffee, Umbrella, Activity, BarChart2 } from 'react-feather';

function QuadrantStats() {
  // 💡 1. TRAEMOS EL ESTADO COMPLETO NECESARIO PARA EL FILTRO GLOBAL
  const { 
    scheduleData, 
    additionalMonthsData, // Añadido para combinar datos
    selectedAgentId, 
    currentDate,
    viewMode // Añadido para filtro dinámico (week vs month)
  } = useCalendarStore();

  const stats = useMemo(() => {
    // Inicializar todos los contadores de turnos
    const counts = { 'M': 0, 'T': 0, 'N': 0, 'L': 0, 'V': 0, 'B': 0, 'LC': 0, 'R': 0, 'Total': 0 };
    
    // 2. DEFINIR EL INTERVALO EXACTO DE VISUALIZACIÓN
    let intervalStart, intervalEnd;
    
    if (viewMode === 'week') {
        // Intervalo: la semana actual (Lunes a Domingo)
        intervalStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        intervalEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
        // Intervalo: el mes actual estricto (Día 1 al último día del mes)
        intervalStart = startOfMonth(currentDate);
        intervalEnd = endOfMonth(currentDate);
    }
    // Ajustar hora fin para incluir todo el último día (robustez contra isWithinInterval)
    intervalEnd.setHours(23, 59, 59, 999);

    // 3. COMBINAR TODOS LOS DATOS DISPONIBLES
    const allWeeks = { ...scheduleData?.weeks };
    if (additionalMonthsData) {
        Object.values(additionalMonthsData).forEach(mData => {
            if (mData?.weeks) Object.assign(allWeeks, mData.weeks);
        });
    }

    // 4. ITERAR Y FILTRAR
    Object.values(allWeeks).forEach(week => {
      Object.values(week.days || {}).forEach(day => {
        if (!day.shifts || !day.date) return;

        // Convertir fecha de forma segura
        let dayDate;
        try {
             if (typeof day.date === 'string') dayDate = parseISO(day.date);
             else if (day.date.toDate) dayDate = day.date.toDate();
             else dayDate = new Date(day.date);
             
             if (isNaN(dayDate.getTime())) return;
        } catch (e) { return; }

        // 💡 CLAVE: Solo contar si está dentro del intervalo visible (Semana o Mes)
        if (!isWithinInterval(dayDate, { start: intervalStart, end: intervalEnd })) return;
        
        Object.values(day.shifts).forEach(shift => {
          // Filtro de Agente
          if (selectedAgentId !== 'all' && String(shift.agentId) !== String(selectedAgentId)) return;
          
          const type = shift.shiftType;
          if (counts[type] !== undefined) counts[type]++;
          
          // Sumar 8h si es trabajo (M, T, N, R)
          if (['M', 'T', 'N', 'R'].includes(type)) counts['Total'] += 8; 
        });
      });
    });
    
    return counts;
  }, [scheduleData, additionalMonthsData, selectedAgentId, currentDate, viewMode]); // Dependencias completas

  if (!scheduleData) return null;

  // --- Renderizado de Tarjetas ---
  const statCards = [
    { key: 'M', label: 'Mañanas', icon: Sun, color: '#86efac', bgGradient: 'linear-gradient(135deg, rgba(134,239,172,0.15) 0%, rgba(134,239,172,0.05) 100%)' },
    { key: 'T', label: 'Tardes', icon: Briefcase, color: '#60a5fa', bgGradient: 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(96,165,250,0.05) 100%)' },
    // Licencias (LC)
    { 
      key: 'LC', 
      label: 'Licencias', 
      icon: Moon, 
      color: '#f9a8d4', 
      bgGradient: 'linear-gradient(135deg, rgba(249,168,212,0.15) 0%, rgba(249,168,212,0.05) 100%)' 
    },
    // 💡 AÑADIDO: REFUERZO (R)
    { key: 'R', label: 'Refuerzo', icon: Activity, color: '#0d9488', bgGradient: 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(20,184,166,0.05) 100%)' }, 
    { key: 'L', label: 'Libres', icon: Coffee, color: '#9ca3af', bgGradient: 'linear-gradient(135deg, rgba(156,163,175,0.15) 0%, rgba(156,163,175,0.05) 100%)' },
    { key: 'V', label: 'Vacaciones', icon: Umbrella, color: '#fbbf24', bgGradient: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)' },
    { key: 'B', label: 'Bajas', icon: Activity, color: '#f87171', bgGradient: 'linear-gradient(135deg, rgba(248,113,113,0.15) 0%, rgba(248,113,113,0.05) 100%)' }
  ];

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* TITULO */}
      <div 
        className="view-header" 
        style={{ 
          paddingBottom: '1rem', 
          marginBottom: '1.5rem', 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <BarChart2 size={24} style={{ color: 'var(--color-accent-neon, #00ff88)', strokeWidth: 1.5 }} />
        <h4 style={{ 
          fontSize: '1.1rem', 
          color: 'white', 
          margin: 0,
          fontWeight: '600',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          Estadísticas del {viewMode === 'week' ? 'Período' : 'Mes'}
        </h4>
      </div>

      {/* GRID DE STATS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
        gap: '1rem'
      }}>
        
        {/* CARD PRINCIPAL: TOTAL HORAS */}
        <div 
          style={{ 
            gridColumn: 'span 2',
            background: 'linear-gradient(135deg, rgba(0,255,136,0.15) 0%, rgba(0,255,136,0.05) 100%)',
            border: '1px solid rgba(0,255,136,0.3)',
            borderRadius: '12px', 
            padding: '1.25rem',
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,136,0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ 
            background: 'rgba(0,255,136,0.2)', 
            padding: '12px', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={28} color="#00ff88" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800', 
              color: '#00ff88',
              lineHeight: 1,
              textShadow: '0 0 12px rgba(0,255,136,0.4)'
            }}>
              {stats['Total']}h
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: 'rgba(255,255,255,0.6)', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: '600'
            }}>
              Total Horas
            </div>
          </div>
        </div>

        {/* CARDS DE TIPOS */}
        {statCards.map(item => (
          <div 
            key={item.key}
            style={{
              background: item.bgGradient,
              border: `1.5px solid ${item.color}33`,
              borderRadius: '12px', 
              padding: '1rem',
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between', 
              minHeight: '100px',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = item.bgGradient.replace('0.15', '0.25').replace('0.05', '0.12');
              e.currentTarget.style.borderColor = `${item.color}66`;
              e.currentTarget.style.boxShadow = `0 0 16px ${item.color}33`;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = item.bgGradient;
              e.currentTarget.style.borderColor = `${item.color}33`;
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* TOP: ICONO + VALOR */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '8px'
            }}>
              <span style={{ 
                fontSize: '1.8rem', 
                fontWeight: '700', 
                color: 'white',
                textShadow: `0 0 8px ${item.color}66`
              }}>
                {stats[item.key]}
              </span>
              <item.icon 
                size={18} 
                style={{ 
                  color: item.color, 
                  opacity: 0.8,
                  strokeWidth: 1.5
                }} 
              />
            </div>
            
            {/* LABEL */}
            <span style={{ 
              fontSize: '0.75rem', 
              textTransform: 'uppercase', 
              color: 'rgba(255,255,255,0.8)', 
              fontWeight: '600',
              letterSpacing: '0.05em'
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuadrantStats;