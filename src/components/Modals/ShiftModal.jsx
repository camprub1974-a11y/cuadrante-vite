// Archivo: /src/components/Modals/ShiftModal.jsx

import React, { useState, useEffect } from 'react';
// 💡 Importar RefreshCw para el botón de cambio
import { X, User, Calendar, Clock, Edit2, Check, AlertCircle, Trash2, RefreshCw } from 'react-feather';
import { useAuthStore } from '../../store/authStore';

const SHIFT_TYPES = [
  { id: 'M', label: 'Mañana', color: '#60a5fa' },
  { id: 'T', label: 'Tarde', color: '#fbbf24' },
  { id: 'N', label: 'Noche', color: '#a78bfa' },
  { id: 'L', label: 'Libre', color: '#34d399' },
  { id: 'V', label: 'Vacaciones', color: '#f0abfc' },
  { id: 'B', label: 'Baja', color: '#fca5a5' },
  { id: 'LC', label: 'Licencia', color: '#f9a8d4' },
  { id: 'R', label: 'Refuerzo', color: '#5eead4' }
];

const SHIFT_NAMES = {
  'M': 'Mañana (06:00 - 14:00)',
  'T': 'Tarde (14:00 - 22:00)',
  'N': 'Noche (22:00 - 06:00)',
  'L': 'Libre',
  'V': 'Vacaciones',
  'B': 'Baja',
  'AP': 'Asuntos Propios',
  'LC': 'Licencia',
  'R': 'Refuerzo'
};

// 💡 RECIBIR onRequestChange
export default function ShiftModal({ isOpen, onClose, shiftData, onSave, onDelete, onRequestChange }) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 💡 CORRECCIÓN: Resetear TODOS los estados cuando el modal se abre/cierra
  useEffect(() => {
    if (isOpen && shiftData) {
      setIsEditing(false);
      setSelectedType(shiftData.shiftType || 'L');
      setSaving(false);  // 💡 AÑADIDO
      setDeleting(false); // 💡 AÑADIDO
    }
  }, [isOpen, shiftData]);

  // 💡 CORRECCIÓN: También resetear al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSaving(false);
      setDeleting(false);
      setIsEditing(false);
    }
  }, [isOpen]);

  if (!isOpen || !shiftData) return null;

  const dateObj = shiftData.dateStr ? new Date(shiftData.dateStr) : new Date();
  const dateFormatted = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleSaveClick = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
        const result = await onSave(shiftData, selectedType);
        if (result && result.success) {
            onClose();
        } else {
            alert("Error: " + (result?.message || "No se pudo guardar."));
        }
    } catch (error) {
        console.error(error);
        alert("Error al guardar.");
    } finally {
        setSaving(false); // ✅ Siempre se resetea
    }
  };

  // 💡 CORRECCIÓN: Añadir finally para resetear el estado
  const handleDeleteClick = async () => {
      if (!onDelete) return;
      setDeleting(true);
      try {
          await onDelete(shiftData);
          // El cierre del modal lo maneja el padre si tiene éxito
      } catch (error) {
          console.error(error);
          alert("Error al eliminar: " + error.message);
      } finally {
          setDeleting(false); // 💡 AÑADIDO: Siempre se resetea
      }
  };

  // 💡 Handler para cerrar que resetea estados
  const handleClose = () => {
      setSaving(false);
      setDeleting(false);
      setIsEditing(false);
      onClose();
  };

  return (
    <div className="modal-overlay active" style={{zIndex: 1050}}>
      <div className="modal-content" style={{maxWidth: '450px'}}>
        
        {/* Cabecera */}
        <div className="modal-header">
          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
             <span className="agent-badge" style={{background: 'rgba(255,255,255,0.1)', width:'30px', height:'30px', fontSize:'14px'}}>
                {isEditing ? selectedType : shiftData.shiftType}
             </span>
             {isEditing ? 'Editar Turno' : 'Detalles del Turno'}
          </h3>
          <button className="icon-button close-button" onClick={handleClose} disabled={saving || deleting}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{padding: '1.5rem'}}>
            
            {/* Info Fija */}
            <div style={{marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px'}}>
                    <User size={18} className="text-accent"/> 
                    <span style={{fontSize: '1.1rem', fontWeight: 'bold', color: 'white'}}>Agente {shiftData.agentId}</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem'}}>
                    <Calendar size={16}/> 
                    <span style={{textTransform: 'capitalize'}}>{dateFormatted}</span>
                </div>
            </div>

            {/* VISTA DE DETALLES */}
            {!isEditing && (
                <div style={{marginBottom: '1.5rem'}}>
                    <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase'}}>Horario Actual</h4>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: 'white', fontSize:'1rem'}}>
                        <Clock size={18} color="var(--color-accent-neon)"/> 
                        {SHIFT_NAMES[shiftData.shiftType] || shiftData.shiftType}
                    </div>
                </div>
            )}

            {/* VISTA DE EDICIÓN */}
            {isEditing && (
                <div>
                    <label className="form-label" style={{marginBottom: '10px', display: 'block', color:'var(--color-accent-neon)'}}>Nuevo Tipo de Turno:</label>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px'}}>
                        {SHIFT_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                disabled={saving || deleting}
                                style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: selectedType === type.id ? `2px solid ${type.color}` : '1px solid rgba(255,255,255,0.1)',
                                    background: selectedType === type.id ? `${type.color}30` : 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    opacity: (saving || deleting) ? 0.5 : 1
                                }}
                            >
                                <span style={{fontWeight: 'bold', fontSize: '1rem', color: type.color}}>{type.id}</span>
                                <span style={{fontSize: '0.65rem', opacity: 0.8}}>{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Botones de Acción */}
            {isAdmin && (
                <div style={{marginTop: '2rem', borderTop: '1px solid var(--glass-dark-border)', paddingTop: '1rem'}}>
                    {isEditing ? (
                        <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                            <button className="button button-secondary" onClick={() => setIsEditing(false)} disabled={saving || deleting}>Cancelar</button>
                            <button className="button button-success" onClick={handleSaveClick} disabled={saving || deleting}>
                                {saving ? 'Guardando...' : 'Guardar Cambios'} <Check size={16} style={{marginLeft: '5px'}}/>
                            </button>
                        </div>
                    ) : (
                        <div style={{display: 'flex', gap: '10px'}}>
                            {/* BOTÓN ELIMINAR */}
                            <button 
                                className="button button-danger" 
                                onClick={handleDeleteClick}
                                disabled={saving || deleting}
                                title="Eliminar Turno"
                                style={{padding: '0 12px'}}
                            >
                                {deleting ? <div className="loading-spinner-small"></div> : <Trash2 size={18} />}
                            </button>

                            {/* BOTÓN EDITAR */}
                            <button 
                                className="button button-primary" 
                                onClick={() => setIsEditing(true)} 
                                disabled={saving || deleting}
                                style={{flex: 1, justifyContent: 'center'}}
                            >
                                <Edit2 size={16} style={{marginRight: '5px'}} /> Editar Turno
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {/* 💡 ACCIONES AGENTE (Si no es admin) */}
            {!isAdmin && onRequestChange && (
                <div style={{marginTop: '2rem', borderTop: '1px solid var(--glass-dark-border)', paddingTop: '1rem'}}>
                    <button className="button btn-gradient-primary ripple-effect w-100" 
                        onClick={() => onRequestChange(shiftData)} // 💡 Llamar al handler
                        style={{width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px'}}
                    >
                        <RefreshCw size={16} /> Solicitar Cambio de Turno
                    </button>
                    <p style={{textAlign:'center', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', marginTop:'10px'}}>
                        Se enviará una solicitud al compañero/admin.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}