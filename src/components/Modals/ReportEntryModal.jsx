// Archivo: /src/components/Modals/ReportEntryModal.jsx
// ✨ VERSIÓN MEJORADA: Tipos de novedad, hora automática, preview y mejor validación

import React, { useState, useEffect } from 'react';
import { 
  X, Clock, AlertTriangle, Shield, Truck, Users, FileText, 
  Phone, Eye, AlertCircle, CheckCircle, MapPin, Radio
} from 'react-feather';
import { useReportStore } from '../../store/reportStore';

// =========================================
// TIPOS DE NOVEDAD PREDEFINIDOS
// =========================================
const ENTRY_TYPES = [
  { id: 'patrulla', label: 'Patrulla/Ronda', icon: Truck, color: '#60a5fa' },
  { id: 'intervencion', label: 'Intervención', icon: Shield, color: '#f59e0b' },
  { id: 'asistencia', label: 'Asistencia ciudadano', icon: Users, color: '#34d399' },
  { id: 'trafico', label: 'Control tráfico', icon: AlertCircle, color: '#ef4444' },
  { id: 'comunicacion', label: 'Comunicación/Radio', icon: Radio, color: '#a78bfa' },
  { id: 'otro', label: 'Otro', icon: FileText, color: '#9ca3af' }
];

export default function ReportEntryModal({ isOpen, onClose }) {
  const { addEntry } = useReportStore();
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [entryType, setEntryType] = useState('otro');
  const [hora, setHora] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Actualizar hora al abrir
  useEffect(() => {
    if (isOpen) {
      setHora(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      setDescription('');
      setIsUrgent(false);
      setEntryType('otro');
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      // Construir descripción con hora y tipo
      const typeLabel = ENTRY_TYPES.find(t => t.id === entryType)?.label || '';
      const fullDescription = `[${hora}] ${typeLabel ? `(${typeLabel}) ` : ''}${description}`;
      
      await addEntry(fullDescription, isUrgent ? 'urgente' : 'normal');
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Error al guardar la novedad' });
    } finally {
      setSaving(false);
    }
  };

  const selectedType = ENTRY_TYPES.find(t => t.id === entryType);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ zIndex: 1070 }}>
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
        }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 255, 136, 0.1)',
              padding: '8px',
              borderRadius: '10px'
            }}>
              {isUrgent ? <AlertTriangle size={20} color="#ef4444"/> : <Clock size={20} color="var(--color-accent-neon)"/>}
            </div>
            Nueva Novedad
          </h3>
          <button className="icon-button close-button" onClick={onClose} disabled={saving}>
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '1.5rem' }}>
          
          {/* Fila: Hora */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14}/> Hora de la actuación
            </label>
            <input 
              type="time" 
              className="input" 
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              style={{ 
                width: '140px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          </div>

          {/* Selector de Tipo */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Tipo de actuación</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '8px',
              marginTop: '8px'
            }}>
              {ENTRY_TYPES.map(type => {
                const IconComp = type.icon;
                const isSelected = entryType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setEntryType(type.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '12px 8px',
                      background: isSelected ? `${type.color}20` : 'rgba(255,255,255,0.03)',
                      border: isSelected ? `2px solid ${type.color}` : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <IconComp size={20} color={isSelected ? type.color : 'rgba(255,255,255,0.5)'} />
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: isSelected ? type.color : 'rgba(255,255,255,0.7)',
                      fontWeight: isSelected ? '600' : '400',
                      textAlign: 'center'
                    }}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14}/> Descripción de la actuación
            </label>
            <textarea 
              className={`input w-100 ${errors.description ? 'input-error' : ''}`}
              rows="4" 
              value={description} 
              onChange={e => {
                setDescription(e.target.value);
                if (errors.description) setErrors({...errors, description: null});
              }}
              placeholder="Detalla la intervención realizada..."
              autoFocus
              style={{
                resize: 'vertical',
                minHeight: '100px'
              }}
            />
            {errors.description && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                {errors.description}
              </span>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              marginTop: '4px',
              fontSize: '0.75rem',
              color: description.length < 10 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)'
            }}>
              {description.length} caracteres
            </div>
          </div>

          {/* Toggle Urgente */}
          <div 
            onClick={() => setIsUrgent(!isUrgent)}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              background: isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)', 
              padding: '14px', 
              borderRadius: '10px', 
              cursor: 'pointer',
              border: isUrgent ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{
              width: '42px',
              height: '24px',
              background: isUrgent ? '#ef4444' : 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              position: 'relative',
              transition: 'all 0.2s'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: isUrgent ? '20px' : '2px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}></div>
            </div>
            <div>
              <span style={{
                color: isUrgent ? '#ef4444' : 'rgba(255,255,255,0.8)', 
                fontWeight: '600', 
                fontSize: '0.95rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px'
              }}>
                <AlertTriangle size={16}/> Marcar como Urgente
              </span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '2px' }}>
                Se destacará en la bitácora para revisión prioritaria
              </span>
            </div>
          </div>

          {/* Preview */}
          {description.trim() && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255,255,255,0.5)', 
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Eye size={12}/> Vista previa
              </div>
              <div style={{
                background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                borderLeft: `4px solid ${isUrgent ? '#ef4444' : selectedType?.color || 'var(--color-accent-neon)'}`,
                padding: '10px',
                borderRadius: '0 8px 8px 0',
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.85)'
              }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>[{hora}]</span>
                {selectedType && selectedType.id !== 'otro' && (
                  <span style={{ color: selectedType.color }}> ({selectedType.label})</span>
                )}
                {' '}{description}
              </div>
            </div>
          )}

          {/* Error general */}
          {errors.submit && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '1rem',
              color: '#ef4444',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16}/> {errors.submit}
            </div>
          )}

          {/* Footer */}
          <div className="modal-footer" style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '10px',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.05)'
          }}>
            <button 
              type="button" 
              className="button button-secondary" 
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="button btn-gradient-primary" 
              disabled={saving || !description.trim()}
              style={{
                opacity: (!description.trim() || saving) ? 0.6 : 1
              }}
            >
              {saving ? (
                <>
                  <span className="loading-spinner-sm" style={{ width: 16, height: 16, marginRight: 8 }}></span>
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={16} style={{ marginRight: 6 }}/> 
                  Añadir Novedad
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}