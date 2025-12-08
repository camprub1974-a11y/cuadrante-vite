// Archivo: /src/components/Cuadrante/QuadrantFilters.jsx

import React from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { useGlobalStore } from '../../store/globalStore';
import { useAuthStore } from '../../store/authStore';
import { format, parse } from 'date-fns'; // 💡 Importamos parse
import { es } from 'date-fns/locale';
import { Calendar, User, Filter } from 'react-feather';

function QuadrantFilters() {
  const { 
    currentDate, 
    selectedAgentId, 
    setMonthIndex, 
    setYearValue, 
    setFilterAgent 
  } = useCalendarStore();
  
  const { agents } = useGlobalStore();
  const { user } = useAuthStore();
  
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  // Lógica de filtrado de agentes
  const visibleAgents = isAdmin 
    ? agents 
    : agents.filter(agent => String(agent.id) === String(user?.agentId));

  // 💡 MANEJADOR DE CAMBIO DE FECHA
  const handleDateChange = (e) => {
    const val = e.target.value; // Formato "2025-11"
    if (val) {
      // Parseamos la fecha (ej: "2025-11" -> Date object)
      const newDate = parse(val, 'yyyy-MM', new Date());
      // Actualizamos el store
      setYearValue(newDate.getFullYear());
      setMonthIndex(newDate.getMonth());
    }
  };

  // Estilo base compartido
  const selectStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    padding: '8px 12px 8px 36px', // Padding izq para el icono
    fontSize: '0.9rem',
    cursor: 'pointer',
    height: '40px',
    appearance: 'none' // Para quitar estilos nativos feos
  };

  const iconWrapperStyle = {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: 'var(--color-accent-neon)',
    opacity: 0.8
  };

  return (
    <div className="filter-group" style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
      
      {/* 1. SELECTOR DE FECHA UNIFICADO (MES Y AÑO) */}
      <div style={{position: 'relative'}}>
          <Calendar size={16} style={iconWrapperStyle} />
          <input 
            type="month"
            className="selector input-calendar-glass"
            // El value debe ser siempre "YYYY-MM"
            value={format(currentDate, 'yyyy-MM')}
            onChange={handleDateChange}
            style={{
                ...selectStyle,
                fontFamily: 'inherit',
                colorScheme: 'dark', // 💡 Truco para que el calendario nativo salga oscuro
                minWidth: '160px'
            }}
          />
      </div>

      {/* 2. SELECTOR DE AGENTE (Mantenido) */}
      <div style={{position: 'relative'}}>
          <User size={16} style={iconWrapperStyle} />
          <select 
            className="selector"
            value={selectedAgentId}
            onChange={(e) => setFilterAgent(e.target.value)}
            style={{...selectStyle, minWidth: '200px', fontWeight: '500'}}
          >
            <option value="all" style={{color:'black'}}>Todos los Agentes</option>
            
            {visibleAgents.map((agent) => (
              <option key={agent.id} value={agent.id} style={{color:'black'}}>
                {agent.name || `Agente ${agent.id}`}
              </option>
            ))}
          </select>
          
          {/* Flechita visual manual */}
          <div style={{
            position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', 
            pointerEvents:'none', opacity:0.5, fontSize:'0.7rem'
          }}>
             ▼
          </div>
      </div>

    </div>
  );
}

export default QuadrantFilters;