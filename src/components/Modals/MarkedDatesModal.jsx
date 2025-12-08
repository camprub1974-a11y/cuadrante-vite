// Archivo: /src/components/Modals/MarkedDatesModal.jsx

import React, { useState } from 'react';
import { X, Calendar, Type, Check, Tag, Users, BookOpen, AlertTriangle } from 'react-feather';
import { addMarkedDateCallable } from '../../../js/dataController';
import { useCalendarStore } from '../../store/calendarStore';

// Tipos de eventos disponibles
const EVENT_TYPES = [
  { id: 'festivo', label: 'Festivo', icon: '🎉', color: '#f87171', description: 'Día festivo oficial' },
  { id: 'evento', label: 'Evento', icon: '📅', color: '#60a5fa', description: 'Evento especial' },
  { id: 'nota', label: 'Nota', icon: '📝', color: '#fbbf24', description: 'Recordatorio' },
  { id: 'reunion', label: 'Reunión', icon: '👥', color: '#34d399', description: 'Reunión de equipo' },
  { id: 'formacion', label: 'Formación', icon: '📚', color: '#a78bfa', description: 'Curso o formación' },
  { id: 'urgente', label: 'Urgente', icon: '⚠️', color: '#ef4444', description: 'Aviso importante' },
];

export default function MarkedDatesModal({ isOpen, onClose }) {
  const { currentDate, loadSchedule } = useCalendarStore();
  
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('festivo');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Inicializar la fecha con la fecha actual del calendario al abrir
  React.useEffect(() => {
    if (isOpen) {
      const isoDate = currentDate.toISOString().split('T')[0];
      setDate(isoDate);
      setTitle('');
      setType('festivo');
      setDescription('');
    }
  }, [isOpen, currentDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !title) return;

    setLoading(true);
    try {
      await addMarkedDateCallable({
        date: date,
        title: title,
        type: type,
        description: description || null
      });

      loadSchedule();
      
      if(window.displayMessage) window.displayMessage('Fecha señalada añadida correctamente.', 'success');
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al guardar la fecha: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = EVENT_TYPES.find(t => t.id === type);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{zIndex: 1060}}>
      <div className="modal-content" style={{maxWidth: '480px'}}>
        
        {/* Cabecera */}
        <div className="modal-header">
          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
             <Calendar size={20} className="text-accent"/>
             Añadir Fecha Señalada
          </h3>
          <button className="icon-button close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="modal-body" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
            
            {/* Fecha */}
            <div className="form-group">
                <label className="form-label">Fecha</label>
                <div style={{position: 'relative'}}>
                    <Calendar size={16} style={{position: 'absolute', left: 12, top: 12, opacity: 0.5}}/>
                    <input 
                        type="date" 
                        className="input w-100" 
                        style={{paddingLeft: '35px'}}
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        required 
                    />
                </div>
            </div>

            {/* Título */}
            <div className="form-group">
                <label className="form-label">Título</label>
                <div style={{position: 'relative'}}>
                    <Type size={16} style={{position: 'absolute', left: 12, top: 12, opacity: 0.5}}/>
                    <input 
                        type="text" 
                        className="input w-100" 
                        style={{paddingLeft: '35px'}}
                        placeholder="Ej: Festividad Local, Reunión mensual..."
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        required 
                    />
                </div>
            </div>

            {/* Tipo de evento - Grid mejorado */}
            <div className="form-group">
                <label className="form-label">Tipo de Evento</label>
                <div style={{
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '8px'
                }}>
                    {EVENT_TYPES.map(eventType => (
                        <label 
                            key={eventType.id}
                            style={{
                                cursor: 'pointer', 
                                padding: '12px 8px', 
                                borderRadius: '10px',
                                border: type === eventType.id 
                                    ? `2px solid ${eventType.color}` 
                                    : '1px solid rgba(255,255,255,0.1)',
                                background: type === eventType.id 
                                    ? `${eventType.color}15` 
                                    : 'rgba(255,255,255,0.03)',
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                gap: '6px', 
                                transition: 'all 0.2s',
                                transform: type === eventType.id ? 'scale(1.02)' : 'scale(1)',
                            }}
                        >
                            <input 
                                type="radio" 
                                name="type" 
                                value={eventType.id} 
                                checked={type === eventType.id} 
                                onChange={() => setType(eventType.id)} 
                                style={{display:'none'}}
                            />
                            <span style={{fontSize: '1.5rem'}}>{eventType.icon}</span>
                            <span style={{
                                color: type === eventType.id ? eventType.color : 'rgba(255,255,255,0.7)', 
                                fontWeight: '600',
                                fontSize: '0.8rem',
                            }}>
                                {eventType.label}
                            </span>
                        </label>
                    ))}
                </div>
                {/* Descripción del tipo seleccionado */}
                {selectedType && (
                    <p style={{
                        margin: '8px 0 0 0',
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.5)',
                        textAlign: 'center',
                        fontStyle: 'italic',
                    }}>
                        {selectedType.description}
                    </p>
                )}
            </div>

            {/* Descripción opcional */}
            <div className="form-group">
                <label className="form-label">
                    Descripción <span style={{opacity: 0.5, fontWeight: 'normal'}}>(opcional)</span>
                </label>
                <textarea 
                    className="input w-100" 
                    rows="2"
                    placeholder="Añade detalles adicionales..."
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    style={{resize: 'vertical', minHeight: '60px'}}
                />
            </div>

            {/* Preview de cómo se verá */}
            {title && (
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '10px',
                    padding: '12px',
                    borderLeft: `3px solid ${selectedType?.color || '#00ff88'}`,
                }}>
                    <div style={{fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase'}}>
                        Vista previa
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <span style={{fontSize: '1.3rem'}}>{selectedType?.icon}</span>
                        <div>
                            <div style={{color: 'white', fontWeight: '600', fontSize: '0.9rem'}}>{title}</div>
                            {description && (
                                <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: '2px'}}>{description}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Botones */}
            <div className="modal-footer" style={{marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <button type="button" className="button button-secondary" onClick={onClose} disabled={loading}>
                    Cancelar
                </button>
                <button type="submit" className="button button-success" disabled={loading || !title || !date}>
                    {loading ? 'Guardando...' : 'Añadir Fecha'} <Check size={18} style={{marginLeft: 5}}/>
                </button>
            </div>

        </form>
      </div>
    </div>
  );
}