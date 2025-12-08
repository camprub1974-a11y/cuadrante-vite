// Archivo: /src/components/ExtraServices/ExtraServicesTable.jsx

import React from 'react';
import { Edit2, Trash2, User, Calendar, Clock, DollarSign } from 'react-feather';
import { format } from 'date-fns';

// Configuración visual de tipos
const TYPE_CONFIG = {
  'diurno': { label: 'Diurno', color: 'var(--color-primary)', bg: 'rgba(59, 130, 246, 0.15)' },
  'nocturno': { label: 'Nocturno', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)' },
  'festivo': { label: 'Festivo', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  'festivo_nocturno': { label: 'Festivo Nocturno', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' }
};

export default function ExtraServicesTable({ services, onEdit, onDelete }) {
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (!services || services.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
        <p>No hay servicios registrados con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Agente</th>
            <th>Concepto / Tipo</th>
            <th style={{ textAlign: 'center' }}>Horas</th>
            <th style={{ textAlign: 'right' }}>Precio/h</th>
            <th style={{ textAlign: 'right' }}>Total</th>
            <th style={{ textAlign: 'right', width: '100px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => {
            // Manejo robusto de fechas
            let dateObj = new Date();
            if (service.date) {
                 if (service.date.toDate) dateObj = service.date.toDate();
                 else dateObj = new Date(service.date);
            }
            
            const typeStyle = TYPE_CONFIG[service.type] || TYPE_CONFIG['diurno'];
            const total = (service.hours || 0) * (service.price || 0);

            return (
              <tr key={service.id}>
                {/* Fecha */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} style={{ opacity: 0.5 }} />
                    <span style={{ fontWeight: '600', color: 'white' }}>
                        {format(dateObj, 'dd/MM/yyyy')}
                    </span>
                  </div>
                </td>

                {/* 💡 CAMBIO: Solo Badge, sin nombre */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                     <span className="agent-badge" style={{ width: 'auto', minWidth: '30px', height: '24px', padding: '0 8px', fontSize: '11px', borderRadius: '12px' }}>
                        {service.agentId}
                     </span>
                  </div>
                </td>

                {/* Tipo */}
                <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="type-pill" style={{ 
                            backgroundColor: typeStyle.bg, 
                            color: typeStyle.color, 
                            border: `1px solid ${typeStyle.color}40`,
                            width: 'fit-content'
                        }}>
                            {typeStyle.label}
                        </span>
                        {service.notes && (
                            <span style={{ fontSize: '0.75rem', opacity: 0.6, fontStyle: 'italic' }}>
                                {service.notes}
                            </span>
                        )}
                    </div>
                </td>

                {/* Horas */}
                <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                        <Clock size={12} /> {service.hours}h
                    </div>
                </td>

                {/* Precio */}
                <td style={{ textAlign: 'right', fontFamily: 'monospace', opacity: 0.8 }}>
                    {formatCurrency(service.price)}
                </td>

                {/* Total */}
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-accent-neon)' }}>
                    {formatCurrency(total)}
                </td>

                {/* Acciones */}
                <td className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                  <button 
                    className="icon-button" 
                    onClick={() => onEdit(service)} 
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="icon-button button-danger" 
                    onClick={() => onDelete(service.id)} 
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}