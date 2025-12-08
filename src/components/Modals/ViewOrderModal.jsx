// Archivo: /src/components/Modals/ViewOrderModal.jsx

import React, { useMemo } from 'react';
import { 
  X, Calendar, Clock, Users, MapPin, Edit3, Printer, 
  CheckCircle, Circle, AlertCircle, FileText, ChevronRight
} from 'react-feather';
import { useGlobalStore } from '../../store/globalStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- HELPER: Extraer hora de un string ---
const extractTimeFromText = (text) => {
    // Busca patrones como 08:00, 8:00, 08.00, 8.30
    const timeRegex = /([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])/; 
    const match = text.match(timeRegex);
    if (match) {
        // Normalizar a formato HH:mm para comparar
        let hh = match[1].padStart(2, '0');
        let mm = match[2];
        return `${hh}:${mm}`;
    }
    return null;
};

export default function ViewOrderModal({ isOpen, onClose, order, onEdit }) {
  const { agents } = useGlobalStore();

  // --- 1. Lógica de Ordenamiento por Hora ---
  const sortedChecklist = useMemo(() => {
    if (!order || !order.checklist) return [];

    return [...order.checklist].sort((a, b) => {
        // Buscar hora en 'item' (título) o 'description'
        const timeA = extractTimeFromText(a.item) || extractTimeFromText(a.description) || '99:99';
        const timeB = extractTimeFromText(b.item) || extractTimeFromText(b.description) || '99:99';
        
        return timeA.localeCompare(timeB);
    });
  }, [order]);

  if (!isOpen || !order) return null;

  // --- Helpers de Datos ---
  const dateObj = order.service_date?.toDate ? order.service_date.toDate() : new Date(order.service_date);
  
  const getAgentName = (id) => {
    const a = agents.find(ag => String(ag.id) === String(id));
    return a ? a.name : `Agente ${id}`;
  };

  const getStatusConfig = (status) => {
    switch(status?.toLowerCase()) {
        case 'assigned': return { color: '#fbbf24', text: 'Asignada', bg: 'rgba(251, 191, 36, 0.1)' };
        case 'in_progress': return { color: '#60a5fa', text: 'En Curso', bg: 'rgba(96, 165, 250, 0.1)' };
        case 'completed': return { color: '#34d399', text: 'Finalizada', bg: 'rgba(52, 211, 153, 0.1)' };
        default: return { color: '#9ca3af', text: 'Borrador', bg: 'rgba(156, 163, 175, 0.1)' };
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const shiftLabels = { 'M': 'Mañana', 'T': 'Tarde', 'N': 'Noche' };

  return (
    <div className="modal-overlay active" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ 
          maxWidth: '850px', 
          height: '90vh', 
          display: 'flex', 
          flexDirection: 'column',
          background: '#1f2937', // Fondo oscuro sólido o usar variable CSS
          color: 'white'
      }}>
        
        {/* --- HEADER --- */}
        <div className="modal-header" style={{ 
            borderBottom: '1px solid rgba(255,255,255,0.1)', 
            padding: '1.5rem',
            background: 'linear-gradient(to right, rgba(255,255,255,0.05), transparent)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ 
                            background: statusConfig.bg, 
                            color: statusConfig.color,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            border: `1px solid ${statusConfig.color}40`
                        }}>
                            {statusConfig.text.toUpperCase()}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                            #{order.order_number || '---'}
                        </span>
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>{order.title}</h2>
                    {order.subtitle && (
                        <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.6)' }}>{order.subtitle}</p>
                    )}
                </div>
                <button className="icon-button" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>

            {/* Meta Data Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                gap: '15px',
                marginTop: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
                    <Calendar size={16} color="var(--color-accent-neon)"/>
                    <span style={{ fontWeight: 500 }}>{format(dateObj, "d 'de' MMMM", { locale: es })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
                    <Clock size={16} color="var(--color-accent-neon)"/>
                    <span style={{ fontWeight: 500 }}>Turno {shiftLabels[order.service_shift]}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
                    <Users size={16} color="var(--color-accent-neon)"/>
                    <span style={{ fontWeight: 500 }}>{order.assigned_agents?.length || 0} Agentes</span>
                </div>
            </div>
        </div>

        {/* --- BODY SCROLLABLE --- */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                
                {/* COLUMNA IZQUIERDA: TIMELINE DE INSTRUCCIONES */}
                <div>
                    <h4 style={{ 
                        textTransform: 'uppercase', 
                        color: 'rgba(255,255,255,0.5)', 
                        fontSize: '0.8rem', 
                        marginBottom: '1.5rem',
                        letterSpacing: '1px'
                    }}>
                        Cronograma del Servicio
                    </h4>

                    <div className="timeline-container" style={{ position: 'relative', paddingLeft: '10px' }}>
                        {/* Línea vertical */}
                        <div style={{ 
                            position: 'absolute', 
                            left: '19px', 
                            top: '10px', 
                            bottom: '20px', 
                            width: '2px', 
                            background: 'rgba(255,255,255,0.1)' 
                        }}/>

                        {sortedChecklist.map((task, idx) => {
                            const time = extractTimeFromText(task.item) || extractTimeFromText(task.description);
                            
                            return (
                                <div key={idx} style={{ 
                                    display: 'flex', 
                                    gap: '20px', 
                                    marginBottom: '2rem',
                                    position: 'relative'
                                }}>
                                    {/* Icono / Time Marker */}
                                    <div style={{ 
                                        width: '20px', 
                                        height: '20px', 
                                        borderRadius: '50%', 
                                        background: task.completed ? '#34d399' : '#1f2937',
                                        border: `2px solid ${task.completed ? '#34d399' : 'var(--color-accent-neon)'}`,
                                        zIndex: 2,
                                        marginTop: '4px',
                                        flexShrink: 0
                                    }}/>

                                    {/* Card de la Tarea */}
                                    <div style={{ 
                                        flex: 1, 
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        transition: 'transform 0.2s',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>{task.item}</h4>
                                            {time && (
                                                <span style={{ 
                                                    background: 'rgba(255,255,255,0.1)', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '4px', 
                                                    fontSize: '0.8rem',
                                                    fontFamily: 'monospace',
                                                    color: 'var(--color-accent-neon)'
                                                }}>
                                                    {time}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {task.description && (
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                                                {task.description}
                                            </p>
                                        )}

                                        {task.requiresGeolocation && (
                                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#60a5fa' }}>
                                                <MapPin size={12}/> Ubicación requerida
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {sortedChecklist.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                                No hay tareas definidas para este servicio.
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: EQUIPO E INFO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Equipo */}
                    <div style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.08)', 
                        borderRadius: '12px', 
                        padding: '1.25rem' 
                    }}>
                        <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                            <Users size={16} color="var(--color-accent-neon)"/> Equipo Asignado
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(!order.assigned_agents || order.assigned_agents.length === 0) ? (
                                <span style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.9rem' }}>Sin asignar</span>
                            ) : (
                                order.assigned_agents.map(agentId => {
                                    const isManager = String(agentId) === String(order.shift_manager_id);
                                    return (
                                        <div key={agentId} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: isManager ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                                            border: isManager ? '1px solid rgba(251, 191, 36, 0.3)' : 'none'
                                        }}>
                                            <div style={{ 
                                                width: '28px', height: '28px', borderRadius: '50%', 
                                                background: 'rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.75rem', fontWeight: 'bold'
                                            }}>
                                                {agentId.toString().slice(-2)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.9rem', color: isManager ? '#fbbf24' : 'white' }}>
                                                    {getAgentName(agentId)}
                                                </div>
                                                {isManager && <div style={{ fontSize: '0.7rem', color: '#fbbf24', opacity: 0.8 }}>Responsable</div>}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Briefing General */}
                    {order.description && (
                        <div style={{ 
                            background: 'rgba(255,255,255,0.03)', 
                            border: '1px solid rgba(255,255,255,0.08)', 
                            borderRadius: '12px', 
                            padding: '1.25rem' 
                        }}>
                            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                                <FileText size={16} color="var(--color-accent-neon)"/> Briefing / Notas
                            </h4>
                            <p style={{ 
                                fontSize: '0.9rem', 
                                lineHeight: '1.6', 
                                color: 'rgba(255,255,255,0.7)',
                                whiteSpace: 'pre-wrap',
                                margin: 0
                            }}>
                                {order.description}
                            </p>
                        </div>
                    )}

                </div>
            </div>

        </div>

        {/* --- FOOTER --- */}
        <div className="modal-footer" style={{ 
            borderTop: '1px solid rgba(255,255,255,0.1)', 
            padding: '1rem 1.5rem', 
            display: 'flex', 
            justifyContent: 'space-between',
            background: '#1f2937'
        }}>
            <button className="button button-secondary" onClick={() => alert("Función de impresión en desarrollo...")}>
                <Printer size={16} style={{marginRight: 8}}/> Imprimir Orden
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
                <button className="button button-secondary" onClick={onClose}>
                    Cerrar
                </button>
                {onEdit && (
                    <button className="button btn-gradient-primary" onClick={() => { onClose(); onEdit(order); }}>
                        <Edit3 size={16} style={{marginRight: 8}}/> Editar Orden
                    </button>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}