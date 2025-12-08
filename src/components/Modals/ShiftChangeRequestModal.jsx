// Archivo: /src/components/Modals/ShiftChangeRequestModal.jsx

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, User, Calendar, ArrowRight, Check, AlertCircle } from 'react-feather';
import { useAuthStore } from '../../store/authStore';
import { useGlobalStore } from '../../store/globalStore';
import { addShiftChangeRequest } from '../../../js/dataController';
import { format } from 'date-fns';

export default function ShiftChangeRequestModal({ isOpen, onClose, selectedShift }) {
  const { user } = useAuthStore();
  const { agents } = useGlobalStore();
  
  const [targetAgentId, setTargetAgentId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [myDate, setMyDate] = useState('');
  const [comments, setComments] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Determinar si el turno clickeado es mío o de otro
  const isMyShiftClicked = selectedShift && String(selectedShift.agentId) === String(user?.agentId);

  useEffect(() => {
    if (isOpen && selectedShift) {
        setError(null);
        setComments('');
        
        if (isMyShiftClicked) {
            // Si clic en MI turno -> Es el turno ORIGEN (lo quiero cambiar)
            setMyDate(selectedShift.dateStr);
            setTargetAgentId(''); // Tengo que elegir con quién
            setTargetDate('');    // Y qué día
        } else {
            // Si clic en OTRO turno -> Es el turno DESTINO (lo quiero conseguir)
            setTargetAgentId(selectedShift.agentId);
            setTargetDate(selectedShift.dateStr);
            setMyDate(''); // Tengo que elegir qué día mío ofrezco
        }
    }
  }, [isOpen, selectedShift, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!myDate || !targetDate || !targetAgentId) {
        setError("Por favor completa todos los campos obligatorios.");
        return;
    }

    setSending(true);
    setError(null);

    try {
        await addShiftChangeRequest({
            requesterAgentId: user.agentId,
            targetAgentId: targetAgentId,
            requesterShiftDate: myDate,  // Mi fecha a cambiar
            targetShiftDate: targetDate, // Su fecha a cambiar
            // Nota: Los tipos de turno (M, T, N) se resolverán en backend o se asumen del día
            // Para simplicidad, enviamos las fechas y dejamos que el backend/lógica valide
            requesterComments: comments,
            status: 'Pendiente_Target'
        });

        if (window.displayMessage) window.displayMessage('Propuesta de cambio enviada.', 'success');
        else alert("Propuesta enviada correctamente.");
        
        onClose();
    } catch (err) {
        console.error(err);
        setError(err.message || "Error al enviar la solicitud.");
    } finally {
        setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{zIndex: 1060}}>
      <div className="modal-content" style={{maxWidth: '550px'}}>
        
        <div className="modal-header">
          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
             <RefreshCw size={20} className="text-accent"/>
             Proponer Cambio de Turno
          </h3>
          <button className="icon-button close-button" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            
            {error && <div className="message message-error"><AlertCircle size={16}/> {error}</div>}

            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-dark-border)'}}>
                
                {/* LADO IZQUIERDO (YO) */}
                <div style={{flex: 1, display:'flex', flexDirection:'column', gap:'5px'}}>
                    <label className="form-label" style={{fontSize:'0.75rem', textTransform:'uppercase'}}>Mi Turno (Oferta)</label>
                    <div className="agent-badge" style={{width:'fit-content', padding:'0 10px', borderRadius:'12px', marginBottom:'5px'}}>
                        {user?.agentId} (Yo)
                    </div>
                    <input 
                        type="date" 
                        className="input" 
                        value={myDate} 
                        onChange={e => setMyDate(e.target.value)}
                        disabled={isMyShiftClicked} // Si clic en mi turno, esto es fijo
                        required
                        style={{width: '100%', fontSize:'0.9rem'}}
                    />
                </div>

                <ArrowRight size={24} style={{color: 'var(--color-text-secondary)', marginTop:'20px'}}/>

                {/* LADO DERECHO (COMPAÑERO) */}
                <div style={{flex: 1, display:'flex', flexDirection:'column', gap:'5px'}}>
                    <label className="form-label" style={{fontSize:'0.75rem', textTransform:'uppercase'}}>Su Turno (Demanda)</label>
                    
                    {/* Selector de Agente o Fijo */}
                    {isMyShiftClicked ? (
                        <select 
                            className="selector" 
                            value={targetAgentId} 
                            onChange={e => setTargetAgentId(e.target.value)}
                            required
                            style={{width: '100%', marginBottom:'5px', padding:'6px'}}
                        >
                            <option value="">-- Agente --</option>
                            {agents.filter(a => String(a.id) !== String(user.agentId)).map(a => (
                                <option key={a.id} value={a.id}>{a.name || a.id}</option>
                            ))}
                        </select>
                    ) : (
                         <div className="agent-badge" style={{width:'fit-content', padding:'0 10px', borderRadius:'12px', marginBottom:'5px', background: 'rgba(255,255,255,0.2)'}}>
                            {targetAgentId}
                        </div>
                    )}

                    <input 
                        type="date" 
                        className="input" 
                        value={targetDate} 
                        onChange={e => setTargetDate(e.target.value)}
                        disabled={!isMyShiftClicked} // Si clic en otro, esto es fijo
                        required
                        style={{width: '100%', fontSize:'0.9rem'}}
                    />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Comentarios / Motivo</label>
                <textarea 
                    className="input w-100" 
                    rows="2" 
                    placeholder="Ej: Te cambio mi mañana del martes por tu tarde..."
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                ></textarea>
            </div>

            <div className="modal-footer" style={{marginTop: '0', display: 'flex', justifyContent: 'flex-end'}}>
                <button type="button" className="button button-secondary" onClick={onClose} style={{marginRight: '10px'}}>Cancelar</button>
                <button type="submit" className="button btn-gradient-success ripple-effect" disabled={sending}>
                    {sending ? 'Enviando...' : 'Enviar Propuesta'} <Check size={16} style={{marginLeft: 5}}/>
                </button>
            </div>

        </form>
      </div>
    </div>
  );
}