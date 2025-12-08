// Archivo: /src/components/Modals/ResolucionEntradaModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Check, FileText, Save, Send } from 'react-feather';
import { updateRegistro } from '../../../js/dataController';

export default function ResolucionEntradaModal({ isOpen, onClose, registro, onSaved, onLinkSalida }) {
  const [formData, setFormData] = useState({
    estado: 'pendiente',
    comentario: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && registro) {
      setFormData({
        estado: registro.estado || 'pendiente',
        comentario: registro.comentario || ''
      });
    }
  }, [isOpen, registro]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateRegistro(registro.id, {
          ...formData,
          fechaResolucion: new Date() // Actualizamos fecha al modificar
      });
      
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      alert("Error al actualizar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !registro) return null;

  return (
    <div className="modal-overlay active" style={{zIndex: 1060}}>
      <div className="modal-content" style={{maxWidth: '500px'}}>
        
        <div className="modal-header">
          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
             <FileText size={20} className="text-accent"/>
             Resolución de Entrada
          </h3>
          <button className="icon-button close-button" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{padding: '1.5rem'}}>
            {/* Detalles del Registro */}
            <div style={{marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                <p style={{margin: '0 0 5px 0', fontSize:'0.9rem', color:'rgba(255,255,255,0.7)'}}>
                    <strong>Nº Registro:</strong> {registro.registrationNumber}
                </p>
                <p style={{margin: 0, fontSize:'1rem', fontWeight:'bold', color:'white'}}>
                    {registro.asunto || registro.subject}
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <div className="form-group">
                    <label className="form-label">Nuevo Estado</label>
                    <select 
                        className="selector w-100" 
                        value={formData.estado} 
                        onChange={e => setFormData({...formData, estado: e.target.value})}
                    >
                        <option value="pendiente">Pendiente (No revisado)</option>
                        <option value="revisado">Revisado (Pendiente de respuesta)</option>
                        <option value="finalizado">Finalizado (Archivado sin respuesta)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Observaciones / Resolución</label>
                    <textarea 
                        className="input w-100" 
                        rows="3" 
                        placeholder="Escribe aquí la resolución o notas internas..."
                        value={formData.comentario}
                        onChange={e => setFormData({...formData, comentario: e.target.value})}
                    ></textarea>
                </div>

                <div className="modal-footer" style={{marginTop: '1rem', display: 'flex', justifyContent: 'space-between'}}>
                    {/* Botón para vincular salida (Navegación) */}
                    <button 
                        type="button" 
                        className="button button-primary" 
                        onClick={() => { onClose(); onLinkSalida(registro.id); }}
                        title="Crear documento de salida vinculado"
                    >
                        <Send size={16} style={{marginRight: 5}}/> Responder con Salida
                    </button>

                    <div style={{display:'flex', gap:'10px'}}>
                        <button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                        <button type="submit" className="button button-success" disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar'} <Check size={16} style={{marginLeft: 5}}/>
                        </button>
                    </div>
                </div>
            </form>
        </div>

      </div>
    </div>
  );
}