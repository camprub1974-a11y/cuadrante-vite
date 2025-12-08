import React, { useState } from 'react';
import { X, User, Clock, Save, Users, Briefcase } from 'react-feather';
import { useGlobalStore } from '../../store/globalStore';

export default function AddShiftModal({ isOpen, onClose, date, onSave }) {
  const { agents } = useGlobalStore();
  
  const [isExternal, setIsExternal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [externalAgentName, setExternalAgentName] = useState('');
  const [shiftType, setShiftType] = useState('R'); // Por defecto Refuerzo
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('06:00');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!isExternal && !selectedAgentId) return alert("Selecciona un agente.");
    if (isExternal && !externalAgentName) return alert("Escribe el nombre del agente externo.");

    setSaving(true);
    
    const shiftData = {
        agentId: isExternal ? 'EXTERNO' : selectedAgentId,
        agentName: isExternal ? externalAgentName : null, // Guardamos nombre si es externo
        shiftType: shiftType,
        isExternal: isExternal,
        customTime: `${startTime} - ${endTime}` // Guardamos el horario
    };

    await onSave(date, shiftData);
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay active" style={{zIndex: 1060}}>
      <div className="modal-content" style={{maxWidth: '450px'}}>
        <div className="modal-header">
          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
             <User size={20} className="text-accent"/> Añadir Turno / Refuerzo
          </h3>
          <button className="icon-button close-button" onClick={onClose}><X size={20}/></button>
        </div>

        <div className="modal-body" style={{padding: '1.5rem', display:'flex', flexDirection:'column', gap:'1.2rem'}}>
            
            {/* Selector Tipo de Agente */}
            <div style={{display:'flex', gap:'10px', background:'rgba(255,255,255,0.05)', padding:'5px', borderRadius:'8px'}}>
                <button 
                    className={`button ${!isExternal ? 'button-primary' : 'button-ghost'}`} 
                    style={{flex:1}} onClick={() => setIsExternal(false)}
                >
                    Plantilla Local
                </button>
                <button 
                    className={`button ${isExternal ? 'button-primary' : 'button-ghost'}`} 
                    style={{flex:1}} onClick={() => setIsExternal(true)}
                >
                    Convenio / Externo
                </button>
            </div>

            {/* Selector de Agente */}
            <div className="form-group">
                <label className="form-label">{isExternal ? 'Nombre y Apellidos (Externo)' : 'Seleccionar Agente'}</label>
                {isExternal ? (
                    <input 
                        type="text" className="input w-100" 
                        placeholder="Ej: Juan Pérez (Santa Fe)" 
                        value={externalAgentName} onChange={e => setExternalAgentName(e.target.value)}
                    />
                ) : (
                    <select 
                        className="selector w-100" 
                        value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)}
                    >
                        <option value="">-- Selecciona Agente --</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
                    </select>
                )}
            </div>

            {/* Tipo y Horario */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select className="selector w-100" value={shiftType} onChange={e => setShiftType(e.target.value)}>
                        <option value="R">Refuerzo (R)</option>
                        <option value="M">Mañana (M)</option>
                        <option value="T">Tarde (T)</option>
                        <option value="N">Noche (N)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Horario</label>
                    <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                        <input type="time" className="input" value={startTime} onChange={e => setStartTime(e.target.value)} style={{padding:'5px'}} />
                        <span>-</span>
                        <input type="time" className="input" value={endTime} onChange={e => setEndTime(e.target.value)} style={{padding:'5px'}} />
                    </div>
                </div>
            </div>

            <button className="button button-success w-100" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Añadir Turno'} <Save size={16} style={{marginLeft:5}}/>
            </button>
        </div>
      </div>
    </div>
  );
}