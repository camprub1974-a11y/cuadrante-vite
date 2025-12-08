// Archivo: /src/components/Modals/TaskModal.jsx
// ✨ VERSIÓN MEJORADA: Fecha vencimiento, validación inline, preview

import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, AlertTriangle, User, FileText, Calendar, 
  Clock, AlertCircle, Eye
} from 'react-feather';
import { useGlobalStore } from '../../store/globalStore';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TaskModal({ isOpen, onClose, onSave, editTask = null }) {
  const { agents } = useGlobalStore();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
    assignedAgentId: '',
    dueDate: ''
  });

  // Reset form cuando se abre/cierra o cambia editTask
  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        setFormData({
          title: editTask.title || '',
          description: editTask.description || '',
          priority: editTask.priority || 'normal',
          assignedAgentId: editTask.assignedAgentId || user?.agentId || '',
          dueDate: editTask.dueDate || ''
        });
      } else {
        setFormData({
          title: '',
          description: '',
          priority: 'normal',
          assignedAgentId: user?.agentId || '',
          dueDate: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, editTask, user?.agentId]);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'El título debe tener al menos 5 caracteres';
    }
    
    if (!formData.assignedAgentId) {
      newErrors.assignedAgentId = 'Debes asignar la tarea a un agente';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Error al guardar la tarea' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const getAgentName = (id) => agents.find(a => String(a.id) === String(id))?.name || '';

  if (!isOpen) return null;

  const isEditing = !!editTask;

  return (
    <div className="modal-overlay active" style={{ zIndex: 1060 }}>
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{
              background: formData.priority === 'alta' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 255, 136, 0.1)',
              padding: '8px',
              borderRadius: '10px'
            }}>
              {formData.priority === 'alta' ? (
                <AlertTriangle size={20} color="#ef4444"/>
              ) : (
                <FileText size={20} color="var(--color-accent-neon)"/>
              )}
            </div>
            {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
          </h3>
          <button className="icon-button close-button" onClick={onClose} disabled={saving}>
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '1.5rem' }}>
          
          {/* Título */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14}/> Título de la tarea
            </label>
            <input 
              className={`input w-100 ${errors.title ? 'input-error' : ''}`}
              value={formData.title} 
              onChange={e => updateField('title', e.target.value)} 
              placeholder="Ej: Revisar documentación expediente 2024/123" 
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: errors.title ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
              }}
            />
            {errors.title && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                {errors.title}
              </span>
            )}
          </div>

          {/* Descripción */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Descripción <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>(opcional)</span>
            </label>
            <textarea 
              className="input w-100" 
              rows="3" 
              value={formData.description} 
              onChange={e => updateField('description', e.target.value)} 
              placeholder="Detalles adicionales sobre la tarea..."
              style={{
                resize: 'vertical',
                minHeight: '80px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          </div>

          {/* Grid: Prioridad y Asignado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            
            {/* Prioridad - Botones visuales */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Prioridad</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => updateField('priority', 'normal')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: formData.priority === 'normal' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: formData.priority === 'normal' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#3b82f6'
                  }}></span>
                  <span style={{ 
                    color: formData.priority === 'normal' ? '#60a5fa' : 'rgba(255,255,255,0.6)',
                    fontWeight: formData.priority === 'normal' ? '600' : '400',
                    fontSize: '0.85rem'
                  }}>
                    Normal
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => updateField('priority', 'alta')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: formData.priority === 'alta' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: formData.priority === 'alta' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <AlertTriangle size={14} color={formData.priority === 'alta' ? '#ef4444' : 'rgba(255,255,255,0.4)'}/>
                  <span style={{ 
                    color: formData.priority === 'alta' ? '#ef4444' : 'rgba(255,255,255,0.6)',
                    fontWeight: formData.priority === 'alta' ? '600' : '400',
                    fontSize: '0.85rem'
                  }}>
                    Urgente
                  </span>
                </button>
              </div>
            </div>

            {/* Asignar a */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14}/> Asignar a
              </label>
              <select 
                className={`selector w-100 ${errors.assignedAgentId ? 'input-error' : ''}`}
                value={formData.assignedAgentId} 
                onChange={e => updateField('assignedAgentId', e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: errors.assignedAgentId ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                  height: '42px'
                }}
              >
                <option value="">Seleccionar agente...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {errors.assignedAgentId && (
                <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                  {errors.assignedAgentId}
                </span>
              )}
            </div>
          </div>

          {/* Fecha de vencimiento (opcional) */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14}/> Fecha límite <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>(opcional)</span>
            </label>
            <input 
              type="datetime-local"
              className="input"
              value={formData.dueDate} 
              onChange={e => updateField('dueDate', e.target.value)}
              style={{
                width: '220px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          </div>

          {/* Preview de la tarea */}
          {formData.title && (
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
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Eye size={12}/> Vista previa
              </div>
              
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderLeft: formData.priority === 'alta' ? '4px solid #ef4444' : '4px solid #3b82f6',
                padding: '12px',
                borderRadius: '0 8px 8px 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{
                    background: formData.priority === 'alta' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: formData.priority === 'alta' ? '#ef4444' : '#60a5fa',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold'
                  }}>
                    {formData.priority === 'alta' ? 'URGENTE' : 'NORMAL'}
                  </span>
                </div>
                <div style={{ fontWeight: '600', color: 'white', marginBottom: '4px' }}>{formData.title}</div>
                {formData.description && (
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                    {formData.description.substring(0, 80)}{formData.description.length > 80 ? '...' : ''}
                  </div>
                )}
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: '12px' }}>
                  {formData.assignedAgentId && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12}/> {getAgentName(formData.assignedAgentId)}
                    </span>
                  )}
                  {formData.dueDate && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12}/> {format(new Date(formData.dueDate), 'dd/MM HH:mm', { locale: es })}
                    </span>
                  )}
                </div>
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
              disabled={saving || !formData.title.trim()}
              style={{
                opacity: (saving || !formData.title.trim()) ? 0.6 : 1
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
                  {isEditing ? 'Guardar Cambios' : 'Crear Tarea'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}