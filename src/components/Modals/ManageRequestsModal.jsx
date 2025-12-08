import React, { useState, useEffect } from 'react';
import { 
  getSolicitudes, 
  updateSolicitudStatus, 
  getShiftChangeRequests,
  respondToShiftChangeRequest // 💡 IMPORTAR ESTA FUNCIÓN
} from '../../../js/dataController';
import { useAuthStore } from '../../store/authStore';

import { 
  X, FileText, RefreshCw, CheckCircle, XCircle, Clock, User, Calendar, AlertCircle, Filter, ChevronDown 
} from 'react-feather'; 
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- HELPERS ---
function formatEventType(typeInput) {
    if (!typeInput) return 'TIPO DESCONOCIDO';
    const type = typeInput.toLowerCase().trim();
    const types = {
        'vacaciones': 'Vacaciones', 'asuntos_propios': 'Asuntos Propios (AP)', 'ap': 'Asuntos Propios (AP)',
        'compensacion': 'Compensación Horaria', 'horas': 'Compensación Horaria', 'cambio_turno': 'Cambio de Turno',
        'cambio': 'Cambio de Turno', 'licencia': 'Licencia', 'permiso': 'Permiso Oficial', 'baja': 'Baja Médica'
    };
    return types[type] || typeInput.replace(/_/g, ' ').toUpperCase();
}

function formatDate(dateInput) {
    if (!dateInput) return '-';
    try {
        let date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (dateInput.seconds) date = new Date(dateInput.seconds * 1000);
        return format(date, 'dd/MM/yyyy', { locale: es });
    } catch (e) { return 'Fecha inválida'; }
}

function getStatusColor(status) {
    const s = status?.toLowerCase().trim(); 
    switch(s) {
        case 'aprobado': case 'aprobada': case 'concedido': return '#22c55e';
        case 'rechazado': case 'rechazada': case 'denegado': case 'denegada': return '#ef4444';
        case 'pendiente': return '#eab308';
        case 'pendiente_target': return '#3b82f6'; // Azul - esperando al compañero
        case 'pendiente_admin': return '#f59e0b'; // Naranja - esperando al admin
        default: return '#6b7280';
    }
}

// 💡 Helper para mostrar el estado en español
function formatStatus(status) {
    const statusMap = {
        'Pendiente_Target': 'Esperando Compañero',
        'Pendiente_Admin': 'Esperando Admin',
        'Aprobado': 'Aprobado',
        'Rechazado': 'Rechazado',
        'Pendiente': 'Pendiente'
    };
    return statusMap[status] || status?.replace(/_/g, ' ') || 'Desconocido';
}

export default function ManageRequestsModal({ isOpen, onClose }) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const [activeTab, setActiveTab] = useState('permisos');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [requests, setRequests] = useState([]);
  const [shiftChanges, setShiftChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2024, i, 1), 'MMMM', { locale: es }) }));
  const years = [new Date().getFullYear() -1, new Date().getFullYear(), new Date().getFullYear() + 1];

  const loadData = async () => {
    if (!user || !user.uid) return;
    setLoading(true);
    try {
      const agentIdFilter = isAdmin ? 'all' : user?.agentId;
      
      const filters = { 
          status: 'all', 
          agentId: agentIdFilter,
          month: selectedMonth, 
          year: selectedYear
      };

      if (activeTab === 'permisos') {
        const data = await getSolicitudes(filters);
        setRequests(data.sort((a, b) => {
            if (a.status === 'Pendiente' && b.status !== 'Pendiente') return -1;
            if (a.status !== 'Pendiente' && b.status === 'Pendiente') return 1;
            return 0;
        }));
      } else {
        const data = await getShiftChangeRequests(filters);
        // Ordenar: pendientes primero
        setShiftChanges(data.sort((a, b) => {
            const pendingStates = ['Pendiente_Target', 'Pendiente_Admin', 'Pendiente'];
            const aIsPending = pendingStates.includes(a.status);
            const bIsPending = pendingStates.includes(b.status);
            if (aIsPending && !bIsPending) return -1;
            if (!aIsPending && bIsPending) return 1;
            return 0;
        }));
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user && user.uid) {
      loadData();
    }
  }, [isOpen, activeTab, user, selectedMonth, selectedYear]); 

  // Handler para permisos
  const handlePermissionAction = async (id, newStatus) => {
    if (!confirm(`¿Estás seguro de ${newStatus === 'Aprobado' ? 'APROBAR' : 'RECHAZAR'} esta solicitud?`)) return;
    setProcessingId(id);
    try {
      await updateSolicitudStatus({ solicitudId: id, newStatus });
      await loadData();
      if (window.displayMessage) window.displayMessage(`Solicitud ${newStatus}`, 'success');
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  // 💡 NUEVO: Handler para cambios de turno
  const handleShiftChangeAction = async (requestId, action, comments = '') => {
    const actionText = action === 'accept' ? 'ACEPTAR' : 'RECHAZAR';
    if (!confirm(`¿Estás seguro de ${actionText} este cambio de turno?`)) return;
    
    setProcessingId(requestId);
    try {
      await respondToShiftChangeRequest({
        requestId: requestId,
        action: action, // 'accept' o 'reject'
        comments: comments
      });
      await loadData();
      if (window.displayMessage) {
        window.displayMessage(`Cambio de turno ${action === 'accept' ? 'aceptado' : 'rechazado'}`, 'success');
      }
    } catch (error) {
      console.error("Error al responder:", error);
      alert("Error: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  // 💡 Helper para determinar si el usuario actual puede actuar sobre un cambio
  const canUserActOnChange = (change) => {
    if (!user) return { canAct: false, role: null };
    
    // Si es admin y el estado es Pendiente_Admin
    if (isAdmin && change.status === 'Pendiente_Admin') {
      return { canAct: true, role: 'admin' };
    }
    
    // Si el usuario es el target y el estado es Pendiente_Target
    if (String(user.agentId) === String(change.targetAgentId) && change.status === 'Pendiente_Target') {
      return { canAct: true, role: 'target' };
    }
    
    return { canAct: false, role: null };
  };

  if (!isOpen) return null;

  // Estilos
  const getTabStyle = (isActive) => ({
      flex: 1, padding: '1rem', background: 'transparent', border: 'none',
      color: isActive ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.5)',
      borderBottom: isActive ? '2px solid var(--color-accent-neon)' : '2px solid transparent',
      fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px'
  });

  const selectStyle = {
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: 'white',
      padding: '6px 10px',
      borderRadius: '6px',
      textTransform: 'capitalize',
      minWidth: '120px',
      appearance: 'none',
      WebkitAppearance: 'none',
      cursor: 'pointer',
      paddingRight: '30px',
  };

  return (
    <div className="modal-overlay active" style={{zIndex: 1060}}>
      <div className="modal-content" style={{maxWidth: '800px', height: '85vh', display: 'flex', flexDirection: 'column'}}>
        
        {/* Header */}
        <div className="modal-header">
          <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
            <FileText size={20} className="text-accent"/>
            Gestión de Solicitudes
          </h3>
          <button className="icon-button close-button" onClick={onClose}><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div style={{display: 'flex', borderBottom: '1px solid var(--glass-dark-border)'}}>
          <button style={getTabStyle(activeTab === 'permisos')} onClick={() => setActiveTab('permisos')}>
            <FileText size={18}/> Permisos
            {requests.filter(r => r.status === 'Pendiente').length > 0 && (
              <span style={{background:'#ef4444', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'10px'}}>
                {requests.filter(r => r.status === 'Pendiente').length}
              </span>
            )}
          </button>
          <button style={getTabStyle(activeTab === 'cambios')} onClick={() => setActiveTab('cambios')}>
            <RefreshCw size={18}/> Cambios de Turno
            {shiftChanges.filter(c => ['Pendiente_Target', 'Pendiente_Admin'].includes(c.status)).length > 0 && (
              <span style={{background:'#ef4444', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'10px'}}>
                {shiftChanges.filter(c => ['Pendiente_Target', 'Pendiente_Admin'].includes(c.status)).length}
              </span>
            )}
          </button>
        </div>

        {/* Filtros de Fecha */}
        <div style={{display: 'flex', gap: '10px', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', alignItems: 'center'}}>
            <Filter size={16} style={{opacity: 0.6}}/>
            <span style={{fontSize: '0.85rem', opacity: 0.7}}>Filtrar por:</span>
            
            {/* SELECT DE MES */}
            <div style={{position: 'relative'}}>
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    style={selectStyle}
                >
                    {months.map(m => <option key={m.value} value={m.value} style={{color:'black'}}>{m.label}</option>)}
                </select>
                <ChevronDown 
                    size={14} 
                    style={{
                        position: 'absolute', 
                        right: '10px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        pointerEvents: 'none',
                        color: 'rgba(255,255,255,0.7)'
                    }} 
                />
            </div>

            {/* SELECT DE AÑO */}
            <div style={{position: 'relative'}}>
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={selectStyle}
                >
                    {years.map(y => <option key={y} value={y} style={{color:'black'}}>{y}</option>)}
                </select>
                <ChevronDown 
                    size={14} 
                    style={{
                        position: 'absolute', 
                        right: '10px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        pointerEvents: 'none', 
                        color: 'rgba(255,255,255,0.7)'
                    }} 
                />
            </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{padding: '1.5rem', flex: 1, overflowY: 'auto'}}>
            {loading ? (
                <div className="loading-spinner-container"><div className="loading-spinner"></div></div>
            ) : (
                <>
                    {/* LISTA PERMISOS */}
                    {activeTab === 'permisos' && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            {requests.length === 0 ? (
                                <p className="empty-state" style={{textAlign: 'center', padding: '3rem', opacity: 0.7}}>
                                    <FileText size={48} style={{marginBottom: '1rem'}}/>
                                    <br/>
                                    No hay solicitudes de permiso en {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
                                </p>
                            ) : (
                                requests.map(req => {
                                    const statusColor = getStatusColor(req.status);
                                    return (
                                        <div key={req.id} className="card" style={{padding: '1rem', borderLeft: `4px solid ${statusColor}`, background: 'var(--glass-dark-bg)', border: '1px solid var(--glass-dark-border)'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                    <span className="agent-badge" style={{width:'auto', padding:'0 8px', borderRadius:'12px'}}>Agente {req.agentId}</span>
                                                    <span style={{fontWeight: 'bold', fontSize: '1.1rem', color: 'white'}}>{formatEventType(req.typeId || req.type)}</span>
                                                </div>
                                                <span style={{backgroundColor: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}`, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'}}>{req.status}</span>
                                            </div>

                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px'}}>
                                                <div style={{display:'flex', alignItems:'center', gap:'8px'}}><Calendar size={16} color="var(--color-accent-neon)"/><div><span style={{fontSize:'0.75rem', opacity:0.7, display:'block'}}>DESDE</span><strong style={{color:'white'}}>{formatDate(req.startDate)}</strong></div></div>
                                                <div style={{display:'flex', alignItems:'center', gap:'8px'}}><Calendar size={16} color="var(--color-accent-neon)"/><div><span style={{fontSize:'0.75rem', opacity:0.7, display:'block'}}>HASTA</span><strong style={{color:'white'}}>{formatDate(req.endDate)}</strong></div></div>
                                            </div>

                                            {(req.comments || req.commentsAgent) && (
                                                <div style={{display:'flex', gap:'10px', marginBottom:'1rem', opacity:0.9}}><AlertCircle size={16} style={{marginTop:'2px'}}/><span style={{fontStyle: 'italic'}}>"{req.comments || req.commentsAgent}"</span></div>
                                            )}
                                            
                                            {req.attachments && req.attachments.length > 0 && req.attachments[0].url && (
                                                <div style={{marginBottom: '1rem'}}>
                                                    <a href={req.attachments[0].url} target="_blank" rel="noreferrer" style={{color: '#60a5fa', textDecoration: 'underline', fontSize: '0.9rem'}}>
                                                        Ver Adjunto ({req.attachments[0].name || 'Documento'})
                                                    </a>
                                                </div>
                                            )}
                                            
                                            {isAdmin && req.status === 'Pendiente' && (
                                                <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px'}}>
                                                    <button className="button button-danger button-sm" onClick={() => handlePermissionAction(req.id, 'Rechazado')} disabled={processingId === req.id}><XCircle size={16} style={{marginRight: 5}}/> Rechazar</button>
                                                    <button className="button button-success button-sm" onClick={() => handlePermissionAction(req.id, 'Aprobado')} disabled={processingId === req.id}><CheckCircle size={16} style={{marginRight: 5}}/> Aprobar</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* 💡 LISTA CAMBIOS DE TURNO (MEJORADA CON BOTONES DE ACCIÓN) */}
                    {activeTab === 'cambios' && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                            {shiftChanges.length === 0 ? (
                                <p className="empty-state" style={{textAlign: 'center', padding: '3rem', opacity: 0.7}}>
                                    <RefreshCw size={48} style={{marginBottom: '1rem'}}/>
                                    <br/>
                                    No hay cambios de turno en {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
                                </p>
                            ) : (
                                shiftChanges.map(change => {
                                    const statusColor = getStatusColor(change.status);
                                    const { canAct, role } = canUserActOnChange(change);
                                    
                                    return (
                                        <div key={change.id} className="card" style={{
                                            padding: '1.5rem', 
                                            borderLeft: `4px solid ${statusColor}`, 
                                            background: 'var(--glass-dark-bg)', 
                                            border: '1px solid var(--glass-dark-border)',
                                            // Resaltar si requiere acción del usuario
                                            boxShadow: canAct ? `0 0 15px ${statusColor}40` : 'none'
                                        }}>
                                            {/* Header */}
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                                <strong style={{color: 'white', display:'flex', alignItems:'center', gap:'8px'}}>
                                                    <RefreshCw size={16} className="text-accent"/> 
                                                    Intercambio de Turno
                                                </strong>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                    <span style={{fontSize: '0.8rem', opacity: 0.5}}>
                                                        <Clock size={12} style={{marginRight: '5px'}}/> 
                                                        {formatDate(change.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Detalle del intercambio */}
                                            <div style={{
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between', 
                                                background: 'rgba(0,0,0,0.2)', 
                                                padding:'1rem', 
                                                borderRadius:'12px'
                                            }}>
                                                {/* Solicitante */}
                                                <div style={{textAlign: 'center', flex: 1}}>
                                                    <span className="agent-badge" style={{
                                                        width:'auto', 
                                                        padding:'4px 10px',
                                                        background: String(user?.agentId) === String(change.requesterAgentId) ? 'var(--color-accent-neon)' : undefined,
                                                        color: String(user?.agentId) === String(change.requesterAgentId) ? '#0f172a' : undefined
                                                    }}>
                                                        {String(user?.agentId) === String(change.requesterAgentId) ? 'Tú' : `Agente ${change.requesterAgentId}`}
                                                    </span>
                                                    <div style={{fontWeight: 'bold', color: '#60a5fa', fontSize: '1.1rem', marginTop:'5px'}}>
                                                        {formatDate(change.requesterShiftDate)}
                                                    </div>
                                                    <small style={{opacity: 0.6, fontSize: '0.75rem'}}>OFRECE</small>
                                                </div>
                                                
                                                {/* Icono central */}
                                                <div style={{
                                                    width: '36px', 
                                                    height: '36px', 
                                                    borderRadius: '50%', 
                                                    background: statusColor, 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <RefreshCw size={18} color="white" />
                                                </div>
                                                
                                                {/* Destino */}
                                                <div style={{textAlign: 'center', flex: 1}}>
                                                    <span className="agent-badge" style={{
                                                        width:'auto', 
                                                        padding:'4px 10px',
                                                        background: String(user?.agentId) === String(change.targetAgentId) ? 'var(--color-accent-neon)' : undefined,
                                                        color: String(user?.agentId) === String(change.targetAgentId) ? '#0f172a' : undefined
                                                    }}>
                                                        {String(user?.agentId) === String(change.targetAgentId) ? 'Tú' : `Agente ${change.targetAgentId}`}
                                                    </span>
                                                    <div style={{fontWeight: 'bold', color: '#ffb74d', fontSize: '1.1rem', marginTop:'5px'}}>
                                                        {formatDate(change.targetShiftDate)}
                                                    </div>
                                                    <small style={{opacity: 0.6, fontSize: '0.75rem'}}>RECIBE</small>
                                                </div>
                                            </div>
                                            
                                            {/* Comentarios si los hay */}
                                            {change.requesterComments && (
                                                <div style={{
                                                    display:'flex', 
                                                    gap:'10px', 
                                                    marginTop:'1rem', 
                                                    opacity:0.9,
                                                    background: 'rgba(255,255,255,0.03)',
                                                    padding: '10px',
                                                    borderRadius: '8px'
                                                }}>
                                                    <AlertCircle size={16} style={{marginTop:'2px', flexShrink: 0}}/>
                                                    <span style={{fontStyle: 'italic'}}>"{change.requesterComments}"</span>
                                                </div>
                                            )}
                                            
                                            {/* Footer con estado y acciones */}
                                            <div style={{
                                                marginTop: '1rem', 
                                                display: 'flex', 
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                                paddingTop: '1rem'
                                            }}>
                                                {/* Estado */}
                                                <span style={{
                                                    backgroundColor: `${statusColor}20`, 
                                                    color: statusColor, 
                                                    border: `1px solid ${statusColor}`, 
                                                    padding: '4px 12px', 
                                                    borderRadius: '50px', 
                                                    fontSize: '0.85rem', 
                                                    fontWeight: 'bold'
                                                }}>
                                                    {formatStatus(change.status)}
                                                </span>
                                                
                                                {/* 💡 BOTONES DE ACCIÓN */}
                                                {canAct && (
                                                    <div style={{display: 'flex', gap: '10px'}}>
                                                        <button 
                                                            className="button button-danger button-sm" 
                                                            onClick={() => handleShiftChangeAction(change.id, 'reject')}
                                                            disabled={processingId === change.id}
                                                            style={{display: 'flex', alignItems: 'center', gap: '5px'}}
                                                        >
                                                            {processingId === change.id ? (
                                                                <div className="loading-spinner-small"></div>
                                                            ) : (
                                                                <><XCircle size={16}/> Rechazar</>
                                                            )}
                                                        </button>
                                                        <button 
                                                            className="button button-success button-sm" 
                                                            onClick={() => handleShiftChangeAction(change.id, 'accept')}
                                                            disabled={processingId === change.id}
                                                            style={{display: 'flex', alignItems: 'center', gap: '5px'}}
                                                        >
                                                            {processingId === change.id ? (
                                                                <div className="loading-spinner-small"></div>
                                                            ) : (
                                                                <><CheckCircle size={16}/> Aceptar</>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {/* Mensaje informativo si no puede actuar */}
                                                {!canAct && change.status === 'Pendiente_Target' && (
                                                    <span style={{fontSize: '0.8rem', opacity: 0.6, fontStyle: 'italic'}}>
                                                        Esperando respuesta del Agente {change.targetAgentId}
                                                    </span>
                                                )}
                                                {!canAct && change.status === 'Pendiente_Admin' && !isAdmin && (
                                                    <span style={{fontSize: '0.8rem', opacity: 0.6, fontStyle: 'italic'}}>
                                                        Esperando aprobación del administrador
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
}