import React, { useState } from 'react';
import { X, Repeat, Play, User } from 'react-feather';
import { useGlobalStore } from '../../store/globalStore';
import { usePlanningStore } from '../../store/planningStore';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

export default function PatternGeneratorModal({ isOpen, onClose }) {
  const { agents } = useGlobalStore();
  const { planningDate, updateLocalShift } = usePlanningStore();
  
  const [selectedAgent, setSelectedAgent] = useState('');
  const [patternStr, setPatternStr] = useState('M-M-T-T-N-N-L-L-L-L'); // Ejemplo por defecto
  const [applying, setApplying] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
      if (!selectedAgent || !patternStr) return;
      setApplying(true);

      // 1. Convertir patrón a array
      const pattern = patternStr.toUpperCase().split('-').map(s => s.trim());
      
      // 2. Obtener días del mes
      const days = eachDayOfInterval({
          start: startOfMonth(planningDate),
          end: endOfMonth(planningDate)
      });

      // 3. Aplicar cíclicamente
      days.forEach((day, index) => {
          const shiftType = pattern[index % pattern.length];
          const dateStr = format(day, 'yyyy-MM-dd');
          // Actualizar en el store (memoria)
          updateLocalShift(selectedAgent, dateStr, shiftType);
      });

      setApplying(false);
      onClose();
      if (window.displayMessage) window.displayMessage(`Patrón aplicado a Agente ${selectedAgent}`, 'success');
  };

  return (
    <div className="modal-overlay active" style={{zIndex: 1100}}>
      <div className="modal-content" style={{maxWidth: '500px'}}>
        <div className="modal-header">
            <h3 style={{margin:0, display:'flex', alignItems:'center', gap:'10px'}}>
                <Repeat className="text-accent"/> Generador de Patrones
            </h3>
            <button className="icon-button close-button" onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="modal-body" style={{padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.5rem'}}>
            
            <div className="form-group">
                <label className="form-label">1. Seleccionar Agente</label>
                <div style={{position:'relative'}}>
                    <User size={16} style={{position:'absolute', left:12, top:12, opacity:0.5}}/>
                    <select 
                        className="selector w-100" 
                        style={{paddingLeft:'40px'}}
                        value={selectedAgent}
                        onChange={e => setSelectedAgent(e.target.value)}
                    >
                        <option value="">-- Elegir Agente --</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">2. Definir Patrón (Separado por guiones)</label>
                <input 
                    type="text" 
                    className="input w-100" 
                    value={patternStr}
                    onChange={e => setPatternStr(e.target.value)}
                    placeholder="Ej: M-M-T-T-L-L"
                    style={{fontFamily: 'monospace', letterSpacing: '1px'}}
                />
                <p style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', marginTop:'5px'}}>
                    Tipos: M (Mañana), T (Tarde), N (Noche), L (Libre)
                </p>
            </div>

            <div style={{background:'rgba(59, 130, 246, 0.1)', padding:'1rem', borderRadius:'8px', border:'1px dashed #3b82f6'}}>
                <strong style={{color:'#60a5fa', fontSize:'0.9rem'}}>¿Qué hará esto?</strong>
                <p style={{fontSize:'0.85rem', opacity:0.8, margin:'5px 0 0 0'}}>
                    Sobrescribirá los turnos de este agente para <strong>{format(planningDate, 'MMMM', {locale:es})}</strong> repitiendo la secuencia.
                </p>
            </div>

            <div className="modal-footer" style={{marginTop:0, justifyContent:'flex-end'}}>
                <button className="button button-secondary" onClick={onClose}>Cancelar</button>
                <button className="button btn-gradient-primary" onClick={handleApply} disabled={applying || !selectedAgent}>
                    <Play size={16} style={{marginRight:5}}/> Aplicar Patrón
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}