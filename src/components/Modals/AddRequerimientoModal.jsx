// Archivo: /src/components/Modals/AddRequerimientoModal.jsx
// ✨ VERSIÓN MEJORADA: Mejor validación, iconos visuales, preview y UX mejorada

import React, { useState, useEffect } from 'react';
import { 
  X, Phone, User, Clock, MessageSquare, CheckCircle, 
  PhoneCall, UserCheck, MapPin, AlertCircle
} from 'react-feather';
import { useReportStore } from '../../store/reportStore';

export default function AddRequerimientoModal({ isOpen, onClose }) {
  const { addReq } = useReportStore(); 
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    hora: '',
    tipoContacto: 'telefonico',
    telefono: '',
    requirente: '',
    ubicacion: '',
    motivo: ''
  });

  // Reset form al abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        tipoContacto: 'telefonico',
        telefono: '',
        requirente: '',
        ubicacion: '',
        motivo: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.requirente.trim()) {
      newErrors.requirente = 'El nombre del requirente es obligatorio';
    }
    
    if (!formData.motivo.trim()) {
      newErrors.motivo = 'El motivo es obligatorio';
    } else if (formData.motivo.trim().length < 10) {
      newErrors.motivo = 'Describe el motivo con al menos 10 caracteres';
    }
    
    if (formData.tipoContacto === 'telefonico' && formData.telefono) {
      const phoneClean = formData.telefono.replace(/\s/g, '');
      if (phoneClean.length < 9) {
        newErrors.telefono = 'El teléfono debe tener al menos 9 dígitos';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSaving(true);
    try {
      // Combinar requirente y ubicación si hay ubicación
      const requirenteCompleto = formData.ubicacion 
        ? `${formData.requirente} - ${formData.ubicacion}`
        : formData.requirente;

      const dataToSend = {
        hora: formData.hora,
        tipoContacto: formData.tipoContacto,
        telefono: formData.tipoContacto === 'telefonico' ? formData.telefono : '',
        requirente: requirenteCompleto,
        motivo: formData.motivo,
        clientTime: new Date().toISOString()
      };

      await addReq(dataToSend);
      onClose();
      
    } catch (error) {
      console.error("Error al añadir requerimiento:", error);
      setErrors({ submit: error.message || "Error al guardar el requerimiento" });
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ zIndex: 1070 }}>
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(96, 165, 250, 0.15)',
              padding: '8px',
              borderRadius: '10px'
            }}>
              <Phone size={20} color="#60a5fa"/>
            </div>
            Nuevo Requerimiento
          </h3>
          <button className="icon-button close-button" onClick={onClose} disabled={saving}>
            <X size={20}/>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '1.5rem' }}>
            
          {/* Fila 1: Hora y Tipo de Contacto */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            
            {/* Hora */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={14}/> Hora
              </label>
              <input 
                type="time" 
                className="input w-100" 
                value={formData.hora} 
                onChange={e => updateField('hora', e.target.value)} 
                required 
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              />
            </div>

            {/* Tipo de Contacto - Cards */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tipo de Aviso</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                
                {/* Telefónico */}
                <button
                  type="button"
                  onClick={() => updateField('tipoContacto', 'telefonico')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    background: formData.tipoContacto === 'telefonico' 
                      ? 'rgba(96, 165, 250, 0.15)' 
                      : 'rgba(255,255,255,0.03)',
                    border: formData.tipoContacto === 'telefonico' 
                      ? '2px solid #60a5fa' 
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <PhoneCall 
                    size={18} 
                    color={formData.tipoContacto === 'telefonico' ? '#60a5fa' : 'rgba(255,255,255,0.5)'} 
                  />
                  <span style={{ 
                    color: formData.tipoContacto === 'telefonico' ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                    fontWeight: formData.tipoContacto === 'telefonico' ? '600' : '400',
                    fontSize: '0.9rem'
                  }}>
                    Telefónico
                  </span>
                </button>

                {/* Presencial */}
                <button
                  type="button"
                  onClick={() => updateField('tipoContacto', 'personal')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    background: formData.tipoContacto === 'personal' 
                      ? 'rgba(167, 139, 250, 0.15)' 
                      : 'rgba(255,255,255,0.03)',
                    border: formData.tipoContacto === 'personal' 
                      ? '2px solid #a78bfa' 
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <UserCheck 
                    size={18} 
                    color={formData.tipoContacto === 'personal' ? '#a78bfa' : 'rgba(255,255,255,0.5)'} 
                  />
                  <span style={{ 
                    color: formData.tipoContacto === 'personal' ? '#a78bfa' : 'rgba(255,255,255,0.7)',
                    fontWeight: formData.tipoContacto === 'personal' ? '600' : '400',
                    fontSize: '0.9rem'
                  }}>
                    Presencial
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Requirente */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <User size={14}/> Nombre del Requirente
            </label>
            <input 
              type="text" 
              className={`input w-100 ${errors.requirente ? 'input-error' : ''}`}
              placeholder="Ej: Juan Pérez García" 
              value={formData.requirente} 
              onChange={e => updateField('requirente', e.target.value)} 
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: errors.requirente ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
              }}
            />
            {errors.requirente && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                {errors.requirente}
              </span>
            )}
          </div>

          {/* Ubicación */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={14}/> Ubicación 
              <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>(opcional)</span>
            </label>
            <input 
              type="text" 
              className="input w-100"
              placeholder="Ej: C/ Mayor 15, 2º B" 
              value={formData.ubicacion} 
              onChange={e => updateField('ubicacion', e.target.value)} 
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          </div>

          {/* Teléfono (Condicional) */}
          {formData.tipoContacto === 'telefonico' && (
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Phone size={14}/> Teléfono de Contacto
              </label>
              <input 
                type="tel" 
                className={`input w-100 ${errors.telefono ? 'input-error' : ''}`}
                placeholder="600 000 000" 
                value={formData.telefono} 
                onChange={e => updateField('telefono', e.target.value)} 
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: errors.telefono ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
                }}
              />
              {errors.telefono && (
                <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                  {errors.telefono}
                </span>
              )}
            </div>
          )}

          {/* Motivo */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MessageSquare size={14}/> Motivo / Incidencia
            </label>
            <textarea 
              className={`input w-100 ${errors.motivo ? 'input-error' : ''}`}
              rows="3" 
              placeholder="Describe brevemente el motivo del requerimiento..." 
              value={formData.motivo} 
              onChange={e => updateField('motivo', e.target.value)} 
              style={{
                resize: 'vertical',
                minHeight: '80px',
                background: 'rgba(255,255,255,0.05)',
                border: errors.motivo ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
              }}
            />
            {errors.motivo && (
              <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                {errors.motivo}
              </span>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              marginTop: '4px',
              fontSize: '0.75rem',
              color: formData.motivo.length < 10 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)'
            }}>
              {formData.motivo.length} caracteres
            </div>
          </div>

          {/* Preview Card */}
          {formData.requirente && formData.motivo && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '1.25rem'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255,255,255,0.5)', 
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                Vista previa del requerimiento
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderLeft: formData.tipoContacto === 'telefonico' ? '4px solid #60a5fa' : '4px solid #a78bfa',
                padding: '12px',
                borderRadius: '0 8px 8px 0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: 'white' }}>
                    {formData.requirente}
                    {formData.ubicacion && <span style={{ fontWeight: 'normal', opacity: 0.7 }}> - {formData.ubicacion}</span>}
                  </span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: formData.tipoContacto === 'telefonico' ? '#60a5fa' : '#a78bfa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {formData.tipoContacto === 'telefonico' ? <PhoneCall size={12}/> : <UserCheck size={12}/>}
                    {formData.hora}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                  {formData.motivo}
                </p>
                {formData.telefono && formData.tipoContacto === 'telefonico' && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Phone size={12}/> {formData.telefono}
                  </div>
                )}
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
            marginTop: '0.5rem', 
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
              disabled={saving || !formData.requirente || !formData.motivo}
              style={{
                opacity: (saving || !formData.requirente || !formData.motivo) ? 0.6 : 1
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
                  Registrar Aviso
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}