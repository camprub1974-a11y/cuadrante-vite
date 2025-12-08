// Archivo: /src/components/Cuadrante/CuadrantePrintView.jsx

import React from 'react';
import ReactDOM from 'react-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

// 🎨 COLORES PARA IMPRESIÓN - FONDO SUAVE + TEXTO OSCURO
const SHIFT_STYLES = {
  'M': { bg: '#bbf7d0', color: '#166534' }, // Verde claro / Verde oscuro
  'T': { bg: '#bfdbfe', color: '#1e40af' }, // Azul claro / Azul oscuro
  'N': { bg: '#ddd6fe', color: '#581c87' }, // Púrpura claro / Púrpura oscuro
  'L': { bg: '#e5e7eb', color: '#374151' }, // Gris claro / Gris oscuro
  'V': { bg: '#fde68a', color: '#92400e' }, // Amarillo / Ámbar oscuro
  'B': { bg: '#fecaca', color: '#991b1b' }, // Rojo claro / Rojo oscuro
  'LC': { bg: '#fbcfe8', color: '#9d174d' }, // Rosa claro / Rosa oscuro
  'R': { bg: '#99f6e4', color: '#115e59' }, // Teal claro / Teal oscuro
  'default': { bg: '#ffffff', color: '#000000' }
};

// Helper para nombres completos
function getShiftName(key) {
    const names = { 
        'M': 'Mañana', 
        'T': 'Tarde', 
        'N': 'Noche', 
        'L': 'Libre', 
        'V': 'Vacaciones', 
        'B': 'Baja', 
        'LC': 'Licencia', 
        'R': 'Refuerzo'
    };
    return names[key] || key;
}

const CuadrantePrintView = ({ currentDate, scheduleData, agents }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysOfMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getShift = (agentId, dateObj) => {
    if (!scheduleData?.weeks) return null;
    const dateStr = format(dateObj, 'yyyy-MM-dd');

    for (const week of Object.values(scheduleData.weeks)) {
        if (!week.days) continue;
        for (const day of Object.values(week.days)) {
            if (day.date === dateStr && day.shifts) {
                const shift = Object.values(day.shifts).find(s => String(s.agentId) === String(agentId));
                return shift ? shift.shiftType : null;
            }
        }
    }
    return null;
  };

  const content = (
    <div id="print-view-container" style={{ 
        fontFamily: 'Arial, Helvetica, sans-serif', 
        color: '#000',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#fff',
        padding: '15mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    }}>

      {/* CABECERA IMPRESIÓN */}
      <div style={{ 
          textAlign: 'center', 
          marginBottom: '25px', 
          paddingBottom: '15px', 
          borderBottom: '3px solid #000' 
      }}>
        <div style={{
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '15px'
        }}>
             <div style={{textAlign: 'left', fontSize: '12pt'}}>
                 <strong style={{ fontSize: '14pt' }}>AYUNTAMIENTO DE CHAUCHINA</strong><br/>
                 <span style={{ color: '#444' }}>Jefatura de Policía Local</span>
             </div>
             <div style={{textAlign: 'right', fontSize: '12pt', color: '#444'}}>
                 {new Date().toLocaleDateString('es-ES')}
             </div>
        </div>
        <h2 style={{ 
            fontSize: '24pt', 
            textTransform: 'uppercase', 
            margin: '10px 0',
            fontWeight: 'bold',
            letterSpacing: '2px'
        }}>
            CUADRANTE - {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
      </div>

      {/* MES Y AÑO ENCIMA DE LA TABLA */}
      <div style={{
          textAlign: 'center',
          marginBottom: '10px',
          fontSize: '16pt',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          color: '#333',
          letterSpacing: '1px',
      }}>
          {format(currentDate, 'MMMM yyyy', { locale: es })}
      </div>

      {/* TABLA PRINCIPAL */}
      <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '11pt',
          tableLayout: 'fixed',
          margin: '0 auto',
      }}>
        <thead>
          <tr>
            <th style={{ 
                border: '2px solid #000', 
                padding: '8px 10px', 
                backgroundColor: '#d1d5db', 
                color: '#000',
                width: '130px',
                textAlign: 'left',
                fontWeight: 'bold',
                fontSize: '12pt',
            }}>
                AGENTE
            </th>
            {daysOfMonth.map(day => {
                const isWeekend = [0, 6].includes(day.getDay());
                return (
                  <th 
                    key={day.toString()} 
                    style={{ 
                      border: '2px solid #000', 
                      padding: '4px 2px', 
                      backgroundColor: isWeekend ? '#9ca3af' : '#e5e7eb',
                      textAlign: 'center',
                      color: '#000',
                      fontWeight: 'bold',
                  }}>
                    <div style={{ fontSize: '9pt', textTransform: 'uppercase', marginBottom: '2px' }}>
                        {format(day, 'EEEEE', { locale: es })}
                    </div>
                    <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>
                        {format(day, 'd')}
                    </div>
                  </th>
                );
            })}
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, index) => (
            <tr key={agent.id}>
              <td style={{ 
                  border: '2px solid #000', 
                  padding: '8px 10px', 
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb',
              }}>
                {agent.name || agent.id}
              </td>
              {daysOfMonth.map(day => {
                const shiftType = getShift(agent.id, day);
                const styles = SHIFT_STYLES[shiftType] || SHIFT_STYLES['default'];
                
                return (
                  <td 
                    key={day.toString()} 
                    style={{
                      border: '1px solid #888',
                      textAlign: 'center',
                      padding: '6px 2px',
                      fontWeight: 'bold',
                      fontSize: '12pt',
                      // 🔥 COLORES DIRECTOS EN STYLE - FONDO + TEXTO
                      backgroundColor: shiftType ? styles.bg : '#fff',
                      color: shiftType ? styles.color : '#000',
                    }}
                  >
                    {shiftType || ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* LEYENDA */}
      <div style={{ 
          marginTop: '30px', 
          borderTop: '2px solid #000', 
          paddingTop: '15px', 
          display: 'flex', 
          gap: '20px', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          fontSize: '11pt' 
      }}>
         {Object.entries(SHIFT_STYLES).map(([key, styles]) => {
             if (key === 'default') return null;
             return (
                 <div key={key} style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     gap: '6px' 
                 }}>
                     <span style={{ 
                         fontWeight: 'bold', 
                         color: styles.color, 
                         backgroundColor: styles.bg,
                         padding: '4px 10px',
                         borderRadius: '4px',
                         border: `2px solid ${styles.color}`,
                         fontSize: '12pt',
                         minWidth: '30px',
                         textAlign: 'center',
                     }}>
                        {key}
                     </span>
                     <span style={{ color: '#000' }}>= {getShiftName(key)}</span>
                 </div>
             );
         })}
      </div>

      {/* PIE DE PÁGINA */}
      <div style={{
          marginTop: '25px',
          paddingTop: '10px',
          borderTop: '1px dashed #999',
          fontSize: '10pt',
          color: '#666',
          textAlign: 'center'
      }}>
          Documento generado el {new Date().toLocaleString('es-ES')} | Cuadrante v2.0
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default CuadrantePrintView;