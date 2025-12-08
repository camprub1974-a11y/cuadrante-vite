// Archivo: /src/components/Modals/ExtraServiceModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Save, Check, DollarSign, Clock, FileText, Lock } from 'react-feather';
import { useGlobalStore } from '../../store/globalStore';
import { useExtraServicesStore } from '../../store/extraServicesStore';
// 💡 1. IMPORTAR AUTH STORE
import { useAuthStore } from '../../store/authStore';

// Tipos y precios base
const SERVICE_TYPES = [
    { id: 'diurno', label: 'Ordinario Diurno', price: 25 },
    { id: 'nocturno', label: 'Ordinario Nocturno', price: 32 },
    { id: 'festivo', label: 'Festivo', price: 35 },
    { id: 'festivo_nocturno', label: 'Festivo Nocturno', price: 38 }
];

export default function ExtraServiceModal({ isOpen, onClose, serviceToEdit }) {
  const { agents } = useGlobalStore();
  const { addService, updateService } = useExtraServicesStore();
  
  // 💡 2. OBTENER USUARIO Y ROL
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const [formData, setFormData] = useState({
      agentId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'diurno',
      hours: 8,
      price: 25,
      notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Cargar datos al abrir (Editar vs Crear)
  useEffect(() => {
    if (isOpen) {
        if (serviceToEdit) {
            // MODO EDICIÓN
            let dateStr = '';
            if(serviceToEdit.date?.toDate) dateStr = serviceToEdit.date.toDate().toISOString().split('T')[0];
            else if(typeof serviceToEdit.date === 'string') dateStr = serviceToEdit.date.split('T')[0];

            setFormData({
                agentId: serviceToEdit.agentId,
                date: dateStr,
                type: serviceToEdit.type,
                hours: serviceToEdit.hours,
                price: serviceToEdit.price,
                notes: serviceToEdit.notes || ''
            });
        } else {
            // MODO CREACIÓN (NUEVO)
            setFormData({
                // 💡 3. PRE-SELECCIÓN INTELIGENTE
                // Si es admin, vacío. Si es agente, SU PROPIO ID.
                agentId: isAdmin ? '' : (user?.agentId || ''),
                date: new Date().toISOString().split('T')[0],
                type: 'diurno',
                hours: 8,
                price: 25,
                notes: ''
            });
        }
    }
  }, [isOpen, serviceToEdit, user, isAdmin]); // Añadido user e isAdmin a dependencias

  // Autocompletar precio al cambiar tipo
  const handleTypeChange = (e) => {
      const newType = e.target.value;
      const typeConfig = SERVICE_TYPES.find(t => t.id === newType);
      setFormData(prev => ({
          ...prev,
          type: newType,
          price: typeConfig ? typeConfig.price : prev.price
      }));
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setSaving(true);
      
      const agent = agents.find(a => String(a.id) === String(formData.agentId));
      const payload = { ...formData, agentName: agent?.name || '' };

      let result;
      if (serviceToEdit) {
          result = await updateService(serviceToEdit.id, payload);
      } else {
          result = await addService(payload);
      }

      setSaving(false);
      if (result.success) {
          onClose();
      } else {
          alert("Error: " + result.message);
      }
  };

  if (!isOpen) return null;

  const totalEstimado = (formData.hours * formData.price).toFixed(2);

  return (
    <div className="modal-overlay active" style={{zIndex: 1060}}>
      <div className="modal-content" style={{maxWidth: '500px'}}>
        
        <div className="modal-header">
          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
             <DollarSign size={20} className="text-accent"/>
             {serviceToEdit ? 'Editar Servicio' : 'Nuevo Servicio Extra'}
          </h3>
          <button className="icon-button close-button" onClick={onClose} disabled={saving}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            
            {/* Fila 1: Agente y Fecha */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                    <label className="form-label">
                        Agente 
                        {/* Icono de candado si está bloqueado */}
                        {!isAdmin && <Lock size={12} style={{marginLeft: 5, opacity: 0.5}}/>}
                    </label>
                    
                    {/* 💡 4. SELECTOR CONDICIONAL */}
                    <select 
                        className="selector w-100" 
                        required 
                        value={formData.agentId} 
                        onChange={e => setFormData({...formData, agentId: e.target.value})}
                        // 🔒 DESHABILITADO SI NO ES ADMIN (O si estamos editando un registro existente)
                        disabled={!isAdmin || !!serviceToEdit} 
                        style={(!isAdmin || !!serviceToEdit) ? {opacity: 0.7, background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed'} : {}}
                    >
                        {/* Si es admin, mostramos opción vacía para obligar a elegir */}
                        {isAdmin && <option value="">Seleccionar...</option>}
                        
                        {/* Lista de agentes */}
                        {agents.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.name} ({a.id})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input 
                        type="date" className="input w-100" required 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                </div>
            </div>

            {/* Fila 2: Tipo y Precio */}
            <div className="form-group">
                <label className="form-label">Tipo de Servicio</label>
                <select className="selector w-100" value={formData.type} onChange={handleTypeChange}>
                    {SERVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label} ({t.price}€/h)</option>)}
                </select>
            </div>

            {/* Fila 3: Horas y Cálculo */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'flex-end'}}>
                <div className="form-group">
                    <label className="form-label">Horas</label>
                    <div className="input-group" style={{display:'flex', alignItems:'center'}}>
                        <Clock size={16} style={{marginRight: 8, opacity: 0.5}}/>
                        <input 
                            type="number" className="input w-100" step="0.5" min="0" required 
                            value={formData.hours} 
                            onChange={e => setFormData({...formData, hours: parseFloat(e.target.value)})}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Precio/Hora</label>
                    <div className="input-group" style={{display:'flex', alignItems:'center'}}>
                        <DollarSign size={16} style={{marginRight: 8, opacity: 0.5}}/>
                        <input 
                            type="number" className="input w-100" step="0.01" required 
                            value={formData.price} 
                            onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                            // Solo admin puede cambiar el precio manual (opcional)
                            // disabled={!isAdmin} 
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label" style={{textAlign:'right', display:'block'}}>Total</label>
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)', 
                        color: '#34d399', 
                        padding: '10px', 
                        borderRadius: '8px', 
                        textAlign: 'right',
                        fontWeight: 'bold',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                        {isNaN(totalEstimado) ? '0.00' : totalEstimado} €
                    </div>
                </div>
            </div>

            {/* Notas */}
            <div className="form-group">
                <label className="form-label">Notas / Descripción</label>
                <div style={{position: 'relative'}}>
                    <FileText size={16} style={{position: 'absolute', top: 12, left: 12, opacity: 0.5}}/>
                    <textarea 
                        className="input w-100" rows="2" 
                        style={{paddingLeft: '35px'}}
                        placeholder="Detalles adicionales..."
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                    ></textarea>
                </div>
            </div>

            <div className="modal-footer" style={{marginTop: '1rem', display: 'flex', justifyContent: 'flex-end'}}>
                <button type="button" className="button button-secondary" onClick={onClose} disabled={saving} style={{marginRight: '10px'}}>Cancelar</button>
                <button type="submit" className="button button-success" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Servicio'} <Check size={16} style={{marginLeft: 5}}/>
                </button>
            </div>

        </form>
      </div>
    </div>
  );
}