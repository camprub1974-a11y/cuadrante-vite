// Archivo: /src/components/Cuadrante/QuadrantSidebar.jsx

import React, { useState } from 'react';
import { Bell, RefreshCw, Calendar, Clock, CheckCircle, AlertTriangle, X, ArrowRight, User } from 'react-feather';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Función helper para colores de estado
function getStatusColor(status) {
    const s = status?.toLowerCase() || '';
    if (s.includes('aprobado')) return '#22c55e';
    if (s.includes('rechazado') || s.includes('denegado')) return '#ef4444';
    return '#eab308'; // Pendiente
}

function QuadrantSidebar({ isOpen, onClose, novedades = [], cambios = [] }) {
  const [activeTab, setActiveTab] = useState('novedades');

  // Estilos dinámicos
  const sidebarStyle = {
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
    boxShadow: isOpen ? '-10px 0 30px rgba(0,0,0,0.5)' : 'none'
  };

  const itemsToShow = activeTab === 'novedades' ? novedades : cambios;

  return (
    <>
        <div 
            className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.4)', zIndex: 998,
                opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'all' : 'none',
                transition: 'opacity 0.3s'
            }}
        />

        <div className="quadrant-sidebar-pro" style={sidebarStyle}>
            {/* HEADER */}
            <div className="sidebar-header">
                <h3 style={{margin: 0, color: 'white', display:'flex', alignItems:'center', gap:'10px', fontSize: '1.2rem'}}>
                    {activeTab === 'novedades' ? <Bell className="text-accent" /> : <RefreshCw className="text-accent" />}
                    Centro de Actividad
                </h3>
                <button onClick={onClose} className="icon-button close-btn">
                    <X size={24} color="white" />
                </button>
            </div>

            {/* TABS */}
            <div className="sidebar-tabs">
                <button 
                    className={`sidebar-tab ${activeTab === 'novedades' ? 'active' : ''}`}
                    onClick={() => setActiveTab('novedades')}
                >
                    Novedades
                    {novedades.length > 0 && <span className="badge-count">{novedades.length}</span>}
                </button>
                <button 
                    className={`sidebar-tab ${activeTab === 'cambios' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cambios')}
                >
                    Cambios
                    {cambios.length > 0 && <span className="badge-count" style={{background: '#3b82f6'}}>{cambios.length}</span>}
                </button>
            </div>

            {/* LISTA */}
            <div className="sidebar-content">
                {itemsToShow.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon-bg" style={{opacity: 0.2}}>
                             {activeTab === 'novedades' ? <Calendar size={32}/> : <RefreshCw size={32}/>}
                        </div>
                        <p>No hay {activeTab} recientes.</p>
                    </div>
                ) : (
                    <div className="feed-list">
                        {itemsToShow.map((item, idx) => {
                            // --- RENDERIZADO CONDICIONAL SEGÚN TIPO ---
                            
                            // A) RENDER PARA CAMBIOS DE TURNO
                            if (activeTab === 'cambios') {
                                const statusColor = getStatusColor(item.status);
                                let createdDate = new Date();
                                if(item.createdAt?.toDate) createdDate = item.createdAt.toDate();
                                else if(item.createdAt) createdDate = new Date(item.createdAt);
                                
                                return (
                                    <div key={item.id || idx} className="feed-card" style={{borderLeft: `3px solid ${statusColor}`}}>
                                        <div className="feed-card-header">
                                            <strong className="feed-title" style={{color: statusColor}}>
                                                {item.status?.replace('_', ' ')}
                                            </strong>
                                            <span className="feed-time-ago">{formatDistanceToNow(createdDate, {addSuffix: true, locale: es})}</span>
                                        </div>
                                        
                                        {/* Visualización A -> B */}
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)'}}>
                                            <div style={{flex:1, textAlign:'center'}}>
                                                <div style={{fontWeight:'bold'}}>Agente {item.requesterAgentId}</div>
                                            </div>
                                            <ArrowRight size={14} color="rgba(255,255,255,0.5)"/>
                                            <div style={{flex:1, textAlign:'center'}}>
                                                 <div style={{fontWeight:'bold'}}>Agente {item.targetAgentId}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="feed-footer">
                                            <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'0.75rem', color:'rgba(255,255,255,0.5)'}}>
                                                <Clock size={12} /> {format(createdDate, 'dd/MM/yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // B) RENDER PARA NOVEDADES (Fechas Señaladas)
                            let dateObj = new Date();
                            if (item.date) {
                                if (item.date.toDate) dateObj = item.date.toDate();
                                else if (item.date.seconds) dateObj = new Date(item.date.seconds * 1000);
                                else dateObj = new Date(item.date);
                            }
                            const isUrgent = item.type === 'urgent';

                            return (
                                <div key={item.id || idx} className={`feed-card ${isUrgent ? 'urgent' : ''}`}>
                                    <div className="feed-card-header">
                                        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                            {isUrgent ? <AlertTriangle size={16} color="#ef4444"/> : <CheckCircle size={16} color="#10b981"/>}
                                            <strong className="feed-title">{item.title || 'Novedad'}</strong>
                                        </div>
                                        <span className="feed-time-ago">{formatDistanceToNow(dateObj, { addSuffix: true, locale: es })}</span>
                                    </div>
                                    
                                    <p className="feed-desc">{item.details || item.description}</p>
                                    
                                    <div className="feed-footer">
                                        <div className="date-badge" style={{color: '#fbbf24', fontWeight: 'bold'}}>
                                            <Calendar size={14} /> <span>{dateObj.toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* ESTILOS */}
            <style>{`
                .quadrant-sidebar-pro {
                    position: fixed; top: 0; right: 0; bottom: 0;
                    width: 400px; 
                    background: #1e293b; 
                    border-left: 1px solid rgba(255,255,255,0.1);
                    display: flex; flex-direction: column;
                    z-index: 999;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: -10px 0 30px rgba(0,0,0,0.5);
                }
                .sidebar-header {
                    padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);
                    display: flex; justify-content: space-between; alignItems: center;
                    background: rgba(0,0,0,0.2);
                }
                .close-btn { background: transparent; border: none; cursor: pointer; padding: 5px; }
                
                .sidebar-tabs { display: flex; padding: 1rem; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .sidebar-tab {
                    flex: 1; padding: 10px; border-radius: 8px; cursor: pointer;
                    background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
                    border: 1px solid transparent; font-weight: 600; display: flex; justify-content: center; gap: 8px;
                    transition: all 0.2s;
                }
                .sidebar-tab.active {
                    background: rgba(52, 211, 153, 0.15); color: #34d399; border-color: #34d399;
                }
                .badge-count { background: #ef4444; color: white; font-size: 0.75rem; padding: 2px 6px; border-radius: 10px; }

                .sidebar-content { flex: 1; overflow-y: auto; padding: 1.5rem; }
                .feed-list { display: flex; flex-direction: column; gap: 1rem; }
                
                .feed-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 1.2rem;
                    transition: transform 0.2s;
                }
                .feed-card:hover { background: rgba(255,255,255,0.06); transform: translateY(-2px); }
                
                .feed-card-header { display: flex; justify-content: space-between; margin-bottom: 0.8rem; align-items: flex-start; }
                .feed-title { font-size: 0.95rem; letter-spacing: 0.3px; }
                .feed-time-ago { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-style: italic; white-space: nowrap; margin-left: 10px; }
                .feed-desc { color: rgba(255,255,255,0.85); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1rem; }
                .feed-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.1); }
                
                .text-accent { color: #34d399; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .empty-state { text-align: center; margin-top: 4rem; color: rgba(255,255,255,0.3); }
            `}</style>
        </div>
    </>
  );
}

export default QuadrantSidebar;