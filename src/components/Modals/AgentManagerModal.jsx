// Archivo: /src/components/Modals/AgentManagerModal.jsx

import React, { useState, useEffect } from 'react';
import { 
  X, Users, UserPlus, Edit2, Trash2, 
  Check, ArrowLeft, Search, Shield 
} from 'react-feather';
import { 
  loadInitialAgents, 
  addAgent, 
  updateAgent, 
  deleteAgent 
} from '../../../js/dataController';

// Importamos estilos específicos si no están ya en main.css
// (Asumimos que _agent-manager.css ya está cargado globalmente)

export default function AgentManagerModal({ isOpen, onClose }) {
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado del formulario
  const [formData, setFormData] = useState({ id: '', name: '', active: true });
  const [isEditing, setIsEditing] = useState(false);

  // Cargar agentes al abrir
  useEffect(() => {
    if (isOpen) {
      loadData();
      setView('list');
      setError(null);
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await loadInitialAgents();
      // Ordenar por ID (TIP)
      setAgents(data.sort((a, b) => a.id.localeCompare(b.id)));
    } catch (err) {
      console.error(err);
      setError("Error al cargar la lista de agentes.");
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJADORES ---

  const handleNewAgent = () => {
    setFormData({ id: '', name: '', active: true });
    setIsEditing(false);
    setView('form');
    setError(null);
  };

  const handleEditAgent = (agent) => {
    setFormData({ 
        id: agent.id, 
        name: agent.name, 
        active: agent.active !== false // Default true
    });
    setIsEditing(true);
    setView('form');
    setError(null);
  };

  const handleDeleteAgent = async (agentId) => {
      if (!confirm(`¿Estás seguro de eliminar al agente ${agentId}? Esta acción es irreversible.`)) return;
      
      setLoading(true);
      try {
          await deleteAgent(agentId);
          await loadData(); // Recargar lista
          alert("Agente eliminado.");
      } catch (err) {
          alert("Error: " + err.message);
          setLoading(false);
      }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      try {
          if (isEditing) {
              await updateAgent(formData.id, { 
                  name: formData.name, 
                  active: formData.active 
              });
          } else {
              await addAgent({ 
                  id: formData.id, 
                  name: formData.name, 
                  active: formData.active 
              });
          }
          
          // Volver a la lista
          await loadData();
          setView('list');
          
      } catch (err) {
          console.error(err);
          setError(err.message || "Error al guardar el agente.");
          setLoading(false);
      }
  };

  // Filtrado
  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.id.includes(searchTerm)
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{zIndex: 1060}}>
      <div className="modal-content" style={{maxWidth: '700px', height: '80vh', display:'flex', flexDirection:'column'}}>
        
        {/* Header */}
        <div className="modal-header">
          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
             <Users size={20} />
             Gestión de Agentes
          </h3>
          <button className="icon-button close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
            
            {error && (
                <div className="message message-error" style={{marginBottom: '1rem'}}>
                    {error}
                </div>
            )}

            {/* VISTA LISTA */}
            {view === 'list' && (
                <>
                    <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                        <div style={{position: 'relative', flex: 1}}>
                            <Search size={16} style={{position: 'absolute', left: 10, top: 12, opacity: 0.5}}/>
                            <input 
                                type="text" 
                                className="input" 
                                placeholder="Buscar por nombre o TIP..." 
                                style={{paddingLeft: '35px', width: '100%'}}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="button button-primary" onClick={handleNewAgent}>
                            <UserPlus size={18} /> Nuevo
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading-spinner-container"><div className="loading-spinner"></div></div>
                    ) : (
                        <div className="agent-list-container" style={{flex: 1, overflowY: 'auto', border: '1px solid var(--glass-dark-border)', borderRadius: '8px'}}>
                            <table className="data-table" style={{width: '100%'}}>
                                <thead>
                                    <tr>
                                        <th>TIP (ID)</th>
                                        <th>Nombre</th>
                                        <th>Estado</th>
                                        <th style={{textAlign: 'right'}}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAgents.map(agent => (
                                        <tr key={agent.id}>
                                            <td><strong>{agent.id}</strong></td>
                                            <td>{agent.name}</td>
                                            <td>
                                                {agent.active ? (
                                                    <span className="status-badge status-active">Activo</span>
                                                ) : (
                                                    <span className="status-badge status-inactive">Inactivo</span>
                                                )}
                                            </td>
                                            <td style={{textAlign: 'right'}}>
                                                <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                                    <button className="icon-button" title="Editar" onClick={() => handleEditAgent(agent)}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button className="icon-button button-danger" title="Eliminar" onClick={() => handleDeleteAgent(agent.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredAgents.length === 0 && (
                                        <tr><td colSpan="4" style={{textAlign: 'center', padding: '2rem'}}>No se encontraron agentes.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* VISTA FORMULARIO */}
            {view === 'form' && (
                <form onSubmit={handleSubmit} className="agent-form-wrapper" style={{maxWidth: '500px', margin: '0 auto', width: '100%'}}>
                    <h4 style={{marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-dark-border)', paddingBottom: '0.5rem'}}>
                        {isEditing ? `Editar Agente ${formData.id}` : 'Nuevo Agente'}
                    </h4>

                    <div className="form-group">
                        <label className="form-label">TIP / ID (Identificador Único)</label>
                        <input 
                            type="text" 
                            className="input w-100" 
                            value={formData.id} 
                            onChange={e => setFormData({...formData, id: e.target.value})}
                            disabled={isEditing} // No se puede cambiar el ID al editar
                            required 
                            placeholder="Ej: 4684"
                        />
                        {isEditing && <small style={{opacity: 0.6}}>El ID no se puede modificar.</small>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nombre Completo</label>
                        <input 
                            type="text" 
                            className="input w-100" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required 
                            placeholder="Ej: Agente García"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Estado</label>
                        <div className="checkbox-wrapper" style={{display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px'}}>
                            <input 
                                type="checkbox" 
                                checked={formData.active} 
                                onChange={e => setFormData({...formData, active: e.target.checked})}
                                id="active-check"
                            />
                            <label htmlFor="active-check" style={{cursor: 'pointer'}}>Agente Activo (Disponible en cuadrante)</label>
                        </div>
                    </div>

                    <div style={{marginTop: '2rem', display: 'flex', justifyContent: 'space-between'}}>
                        <button type="button" className="button button-secondary" onClick={() => setView('list')}>
                            <ArrowLeft size={18} /> Volver
                        </button>
                        <button type="submit" className="button button-success" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Datos'} <Check size={18} />
                        </button>
                    </div>
                </form>
            )}

        </div>
      </div>
    </div>
  );
}