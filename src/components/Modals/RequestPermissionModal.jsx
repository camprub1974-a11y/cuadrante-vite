// Archivo: /src/components/Modals/RequestPermissionModal.jsx

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore'; // Este probablemente necesite revisión si falla, pero dataController es el del error actual.

// 💡 CORRECCIÓN: Usar 3 niveles hacia atrás (../../../)
import { addSolicitud } from '../../../js/dataController'; 

import { X, Send, CheckCircle } from 'react-feather';

export default function RequestPermissionModal({ isOpen, onClose }) {
  const { user } = useAuthStore();
  const [type, setType] = useState('asuntos_propios');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comments, setComments] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
        await addSolicitud({
            agentId: user.agentId,
            type: type,
            startDate: startDate,
            endDate: endDate || startDate,
            comments: comments,
            status: 'pendiente'
        });
        alert("Solicitud enviada correctamente");
        onClose();
    } catch (error) {
        alert("Error al enviar: " + error.message);
    } finally {
        setSending(false);
    }
  };

  return (
    <div className="modal-overlay active" style={{zIndex: 1050}}>
      <div className="modal-content" style={{maxWidth: '500px'}}>
        <div className="modal-header">
          <h3>Solicitar Permiso / Cambio</h3>
          <button className="icon-button close-button" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            
            <div className="form-group">
                <label className="form-label">Tipo de Solicitud</label>
                <select className="selector w-100" value={type} onChange={e => setType(e.target.value)}>
                    <option value="asuntos_propios">Asuntos Propios (AP)</option>
                    <option value="vacaciones">Vacaciones</option>
                    <option value="compensacion">Compensación Horaria</option>
                    <option value="cambio_turno">Cambio de Turno (Solicitud Oficial)</option>
                </select>
            </div>

            <div style={{display: 'flex', gap: '1rem'}}>
                <div className="form-group" style={{flex: 1}}>
                    <label className="form-label">Desde</label>
                    <input type="date" className="input w-100" required value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="form-group" style={{flex: 1}}>
                    <label className="form-label">Hasta (Opcional)</label>
                    <input type="date" className="input w-100" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Comentarios / Motivo</label>
                <textarea className="input w-100" rows="3" value={comments} onChange={e => setComments(e.target.value)}></textarea>
            </div>

            <div className="modal-footer" style={{marginTop: '1rem', display: 'flex', justifyContent: 'flex-end'}}>
                <button type="button" className="button button-secondary" onClick={onClose} style={{marginRight: '10px'}}>Cancelar</button>
                <button type="submit" className="button btn-gradient-primary" disabled={sending}>
                    {sending ? 'Enviando...' : 'Enviar Solicitud'} <Send size={16} style={{marginLeft: 5}}/>
                </button>
            </div>

        </form>
      </div>
    </div>
  );
}