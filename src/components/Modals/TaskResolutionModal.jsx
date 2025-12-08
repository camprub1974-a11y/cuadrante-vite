// Archivo: /src/components/Modals/TaskResolutionModal.jsx
// ✨ VERSIÓN MEJORADA: Diseño compacto, mejor UX, opciones claras

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, CheckCircle, MessageSquare, Inbox, Send, FileText, 
  AlertCircle, Clock, User, ArrowRight
} from 'react-feather';

export default function TaskResolutionModal({ isOpen, onClose, task, onResolve }) {
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setComment('');
      setErrors({});
    }
  }, [isOpen]);

  // Opción A: Resolver con comentario
  const handleConfirm = async () => {
    if (!comment.trim()) {
      setErrors({ comment: 'Indica cómo se resolvió la tarea' });
      return;
    }
    
    setSaving(true);
    try {
      await onResolve(task.id, comment);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Error al resolver la tarea' });
    } finally {
      setSaving(false);
    }
  };

  // Opción B: Resolver creando un documento
  const handleCreateDocument = (direction) => {
    onClose();
    navigate('/registros/crear', { 
      state: { 
        direction: direction, 
        linkedTaskId: task.id,
        initialDescription: task.description
      } 
    });
  };

  if (!isOpen || !task) return null;

  const isHighPriority = task.priority === 'alta';

  return (
    <div className="modal-overlay active" style={{ zIndex: 1070 }}>
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(52, 211, 153, 0.05)'
        }}>
          <h3 style={{ margin: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(52, 211, 153, 0.15)',
              padding: '8px',
              borderRadius: '10px'
            }}>
              <CheckCircle size={20} color="#34d399"/>
            </div>
            Resolver Tarea
          </h3>
          <button className="icon-button close-button" onClick={onClose} disabled={saving}>
            <X size={20}/>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          
          {/* Info de la tarea */}
          <div style={{
            background: isHighPriority ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.03)',
            borderLeft: isHighPriority ? '4px solid #ef4444' : '4px solid #3b82f6',
            padding: '12px',
            borderRadius: '0 8px 8px 0',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                background: isHighPriority ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: isHighPriority ? '#ef4444' : '#60a5fa',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontWeight: 'bold'
              }}>
                {isHighPriority ? 'URGENTE' : 'NORMAL'}
              </span>
            </div>
            <div style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>{task.title}</div>
            {task.description && (
              <p style={{ 
                margin: '8px 0 0 0', 
                fontSize: '0.85rem', 
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.5
              }}>
                {task.description}
              </p>
            )}
          </div>
            
          {/* OPCIÓN 1: COMENTARIO */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <MessageSquare size={14}/> Comentario de resolución
            </label>
            <textarea 
              className={`input w-100 ${errors.comment ? 'input-error' : ''}`}
              rows="3" 
              value={comment} 
              onChange={e => {
                setComment(e.target.value);
                if (errors.comment) setErrors({});
              }} 
              placeholder="Describe la actuación realizada para completar esta tarea..."
              autoFocus
              style={{
                resize: 'vertical',
                minHeight: '80px',
                background: 'rgba(255,255,255,0.05)',
                border: errors.comment ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
              }}
            />
            {errors.comment && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                {errors.comment}
              </span>
            )}
            
            <button 
              className="button btn-gradient-success w-100" 
              onClick={handleConfirm} 
              disabled={saving}
              style={{ marginTop: '10px', justifyContent: 'center' }}
            >
              {saving ? (
                <>
                  <span className="loading-spinner-sm" style={{ width: 16, height: 16, marginRight: 8 }}></span>
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={16} style={{ marginRight: 6 }}/> Completar Tarea
                </>
              )}
            </button>
          </div>

          {/* SEPARADOR */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: '1rem 0', 
            color: 'rgba(255,255,255,0.3)'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
            <span style={{ padding: '0 12px', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              O vincular documento
            </span>
            <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
          </div>

          {/* OPCIÓN 2: CREAR DOCUMENTO */}
          <div style={{ 
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '12px'
          }}>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontSize: '0.8rem', 
              color: 'rgba(255,255,255,0.5)',
              textAlign: 'center'
            }}>
              Resolver creando un registro documental vinculado
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                className="button button-secondary" 
                onClick={() => handleCreateDocument('entrada')}
                style={{ 
                  flexDirection: 'column', 
                  gap: '6px', 
                  padding: '14px 10px',
                  justifyContent: 'center'
                }}
              >
                <Inbox size={22} color="#60a5fa"/>
                <span style={{ fontSize: '0.85rem' }}>Doc. Entrada</span>
                <ArrowRight size={12} style={{ opacity: 0.4 }}/>
              </button>
              
              <button 
                className="button button-secondary" 
                onClick={() => handleCreateDocument('salida')}
                style={{ 
                  flexDirection: 'column', 
                  gap: '6px', 
                  padding: '14px 10px',
                  justifyContent: 'center'
                }}
              >
                <Send size={22} color="#34d399"/>
                <span style={{ fontSize: '0.85rem' }}>Doc. Salida</span>
                <ArrowRight size={12} style={{ opacity: 0.4 }}/>
              </button>
            </div>
          </div>

          {/* Error general */}
          {errors.submit && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px',
              marginTop: '1rem',
              color: '#ef4444',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16}/> {errors.submit}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}