// Archivo: /src/pages/TasksPage.jsx
// ✨ VERSIÓN MEJORADA: Paginación estilo Registros y Filtros de Admin corregidos

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { useGlobalStore } from '../store/globalStore';
import { 
    CheckSquare, Plus, Filter, AlertTriangle, Clock, User, CheckCircle,
    ChevronDown, ChevronRight, ChevronLeft, Calendar, MoreVertical, Trash2, Edit2,
    Circle, Search, Inbox, Send, ChevronsLeft, ChevronsRight
} from 'react-feather';
import { format, isValid, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import TaskModal from '../components/Modals/TaskModal';
import TaskResolutionModal from '../components/Modals/TaskResolutionModal';

// =========================================
// ESTILOS
// =========================================
const customStyles = `
  .task-row {
    transition: all 0.2s ease;
    cursor: pointer;
  }
  
  .task-row:hover {
    background: rgba(255,255,255,0.04) !important;
    transform: translateX(4px);
  }
  
  .task-row:hover .task-actions {
    opacity: 1;
  }
  
  .task-actions {
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .task-checkbox {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .task-checkbox:hover {
    border-color: #34d399;
    background: rgba(52, 211, 153, 0.1);
  }
  
  .task-checkbox.checked {
    background: #34d399;
    border-color: #34d399;
  }
  
  .task-checkbox.checked svg {
    color: white;
  }
  
  .priority-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .priority-alta {
    background: #ef4444;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
    animation: pulse-red 2s infinite;
  }
  
  .priority-normal {
    background: #3b82f6;
  }
  
  .task-expand-content {
    animation: slideDown 0.2s ease;
  }
  
  /* Estilos para selectores y paginación estilo Registros */
  .pagination-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0,0,0,0.1);
  }

  .button-ghost {
    background: transparent;
    color: rgba(255,255,255,0.6);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .button-ghost:hover:not(:disabled) {
    background: rgba(255,255,255,0.05);
    color: white;
  }
  .button-ghost:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .page-number-btn {
    min-width: 36px;
    padding: 6px;
    font-size: 0.9rem;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .btn-gradient-primary {
    background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%); 
    color: #064e3b;
    border: none;
    font-weight: bold;
  }
  
  @keyframes slideDown {
    from { opacity: 0; max-height: 0; }
    to { opacity: 1; max-height: 200px; }
  }
  
  @keyframes pulse-red {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .stats-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    text-align: center;
  }
`;

export default function TasksPage() {
  const navigate = useNavigate();
  const { tasks, loading, filters, setFilter, loadTasks, addNewTask, resolveTask, deleteTask } = useTaskStore();
  const { user } = useAuthStore();
  const { agents } = useGlobalStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToResolve, setTaskToResolve] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Inicialización y carga
  useEffect(() => {
    // 💡 Lógica de filtro por defecto: Admin ve 'all', Agente ve 'mine'
    if (isAdmin) {
        setFilter('scope', 'all');
    } else {
        setFilter('scope', 'mine');
    }
    loadTasks();
  }, []); // Se ejecuta al montar (y cuando cambian filtros internamente en el store)

  // =========================================
  // HELPERS
  // =========================================
  const formatDateSafe = (dateInput) => {
    if (!dateInput) return '';
    let dateObj;
    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      dateObj = dateInput.toDate();
    } else {
      dateObj = new Date(dateInput);
    }
    if (!isValid(dateObj)) return '';
    return format(dateObj, 'dd/MM/yy HH:mm', { locale: es });
  };

  const getTimeAgo = (dateInput) => {
    if (!dateInput) return '';
    let dateObj;
    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      dateObj = dateInput.toDate();
    } else {
      dateObj = new Date(dateInput);
    }
    if (!isValid(dateObj)) return '';
    return formatDistanceToNow(dateObj, { locale: es, addSuffix: true });
  };

  const getAgentName = (id) => agents.find(a => String(a.id) === String(id))?.name || id;

  // Filtrar por búsqueda
  const filteredTasks = tasks.filter(task => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return task.title?.toLowerCase().includes(search) || 
           task.description?.toLowerCase().includes(search) ||
           getAgentName(task.assignedAgentId)?.toLowerCase().includes(search);
  });

  // Cálculo de Paginación
  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  // Reset página cuando cambian filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Estadísticas
  const stats = {
    total: tasks.length,
    pendientes: tasks.filter(t => t.status === 'pendiente').length,
    urgentes: tasks.filter(t => t.status === 'pendiente' && t.priority === 'alta').length,
    completadas: tasks.filter(t => t.status === 'finalizada').length
  };

  // Manejar resolución rápida
  const handleQuickResolve = (e, task) => {
    e.stopPropagation();
    setTaskToResolve(task);
  };

  // Toggle expandir
  const toggleExpand = (taskId) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  // Eliminar tarea (solo admin)
  const handleDelete = async (e, taskId) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta tarea?')) {
      await deleteTask(taskId);
    }
  };

  // =========================================
  // RENDERIZADO DE PAGINACIÓN (Estilo Registros)
  // =========================================
  const renderPagination = () => {
    if (loading || totalItems === 0) return null;

    return (
        <div className="pagination-container">
            {/* Izquierda: Info de rango */}
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                Mostrando <strong style={{ color: 'var(--color-accent-neon)' }}>{startIndex + 1}-{endIndex}</strong> de <strong>{totalItems}</strong> tareas
            </span>

            {/* Centro/Derecha: Botones y Selector */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                
                {/* Selector de filas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Filas:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        style={{
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: 'white',
                            padding: '4px 8px',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                {/* Botones de Navegación */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                        className="button button-sm button-ghost"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '6px 10px', borderRadius: '8px' }}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {/* Números simples */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                         // Lógica simple de ventana deslizante para no mostrar demasiados números
                         let pNum = i + 1;
                         if (totalPages > 5 && currentPage > 3) {
                             pNum = currentPage - 2 + i;
                             if (pNum > totalPages) pNum = i + (totalPages - 4); // Ajuste final
                         }
                         if (pNum <= 0) return null; // Safety check

                         return (
                            <button
                                key={pNum}
                                className={`page-number-btn ${currentPage === pNum ? 'btn-gradient-primary' : 'button-ghost'}`}
                                onClick={() => setCurrentPage(pNum)}
                            >
                                {pNum}
                            </button>
                         );
                    })}

                    <button
                        className="button button-sm button-ghost"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{ padding: '6px 10px', borderRadius: '8px' }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="view-container" style={{ padding: '1.5rem', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
      
      <style>{customStyles}</style>

      {/* HEADER */}
      <div className="view-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px' }}>
            <CheckSquare size={28} style={{ color: 'var(--color-accent-neon)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: 'white' }}>Gestión de Tareas</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
              Asignación y seguimiento de trabajos
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button className="button btn-gradient-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} style={{ marginRight: 8 }}/> Nueva Tarea
          </button>
        )}
      </div>

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stats-card">
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-accent-neon)' }}>{stats.pendientes}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Pendientes</div>
        </div>
        <div className="stats-card" style={{ borderColor: stats.urgentes > 0 ? 'rgba(239, 68, 68, 0.3)' : undefined }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ef4444' }}>{stats.urgentes}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Urgentes</div>
        </div>
        <div className="stats-card">
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#34d399' }}>{stats.completadas}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Completadas</div>
        </div>
        <div className="stats-card">
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#60a5fa' }}>{stats.total}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Total</div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="card" style={{ marginBottom: '1rem', background: 'var(--glass-dark-bg)', border: '1px solid var(--glass-dark-border)' }}>
        <div className="card-body" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Búsqueda */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}/>
            <input
              type="text"
              className="input"
              placeholder="Buscar tarea..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px', height: '36px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)' }}>
            <Filter size={14}/>
          </div>
          
          {/* Tabs Scope - 💡 LÓGICA DE VISIBILIDAD MODIFICADA */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px' }}>
            {/* Si NO es admin, muestra "Mis Tareas". Si es admin, este botón se oculta */}
            {!isAdmin && (
                <button 
                onClick={() => setFilter('scope', 'mine')}
                style={{
                    padding: '6px 14px', 
                    borderRadius: '6px', 
                    border: 'none', 
                    background: filters.scope === 'mine' ? 'rgba(0, 255, 136, 0.15)' : 'transparent', 
                    color: filters.scope === 'mine' ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.5)', 
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: filters.scope === 'mine' ? '600' : '400'
                }}
                >
                Mis Tareas
                </button>
            )}
            
            {/* El botón "Todas" solo lo ve el admin (o supervisor) */}
            {isAdmin && (
              <button 
                onClick={() => setFilter('scope', 'all')}
                style={{
                  padding: '6px 14px', 
                  borderRadius: '6px', 
                  border: 'none', 
                  background: filters.scope === 'all' ? 'rgba(0, 255, 136, 0.15)' : 'transparent', 
                  color: filters.scope === 'all' ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.5)', 
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: filters.scope === 'all' ? '600' : '400'
                }}
              >
                Todas las Tareas
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select 
            className="selector" 
            value={filters.status} 
            onChange={(e) => setFilter('status', e.target.value)}
            style={{ height: '36px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            <option value="pendiente">📋 Pendientes</option>
            <option value="finalizada">✅ Finalizadas</option>
            <option value="all">📁 Todos</option>
          </select>

          {/* Priority Filter */}
          <select 
            className="selector" 
            value={filters.priority || 'all'} 
            onChange={(e) => setFilter('priority', e.target.value)}
            style={{ height: '36px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            <option value="all">Todas prioridades</option>
            <option value="alta">🔴 Urgentes</option>
            <option value="normal">🔵 Normales</option>
          </select>
        </div>
      </div>

      {/* LISTA DE TAREAS */}
      <div className="card" style={{ background: 'var(--glass-dark-bg)', border: '1px solid var(--glass-dark-border)' }}>
        
        {/* Header de la lista */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '40px 1fr 150px 120px 100px 60px',
          gap: '10px',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          fontWeight: '600',
          letterSpacing: '0.5px'
        }}>
          <div></div>
          <div>Tarea</div>
          <div>Asignado a</div>
          <div>Creada</div>
          <div>Prioridad</div>
          <div></div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <CheckSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }}/>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>No hay tareas con los filtros actuales.</p>
          </div>
        ) : (
          <div>
            {paginatedTasks.map(task => {
              const isExpanded = expandedTaskId === task.id;
              const isPending = task.status === 'pendiente';
              const isHighPriority = task.priority === 'alta';
              
              return (
                <div key={task.id}>
                  {/* Fila principal */}
                  <div 
                    className="task-row"
                    onClick={() => toggleExpand(task.id)}
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '40px 1fr 150px 120px 100px 60px',
                      gap: '10px',
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      alignItems: 'center',
                      background: isHighPriority && isPending ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                    }}
                  >
                    {/* Checkbox / Estado */}
                    <div 
                      className={`task-checkbox ${!isPending ? 'checked' : ''}`}
                      onClick={(e) => isPending && handleQuickResolve(e, task)}
                    >
                      {!isPending && <CheckCircle size={14} />}
                    </div>

                    {/* Título y descripción preview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      {isExpanded ? <ChevronDown size={16} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.4)' }}/> : <ChevronRight size={16} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.4)' }}/>}
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ 
                          fontWeight: '600', 
                          color: isPending ? 'white' : 'rgba(255,255,255,0.5)',
                          textDecoration: !isPending ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {task.title}
                        </div>
                        {task.description && !isExpanded && (
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: 'rgba(255,255,255,0.4)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {task.description.substring(0, 60)}{task.description.length > 60 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Asignado a */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                      <User size={14} style={{ opacity: 0.5 }}/>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getAgentName(task.assignedAgentId)}
                      </span>
                    </div>

                    {/* Fecha */}
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      <div>{formatDateSafe(task.createdAt)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{getTimeAgo(task.createdAt)}</div>
                    </div>

                    {/* Prioridad */}
                    <div>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: isHighPriority ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: isHighPriority ? '#ef4444' : '#60a5fa',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: '600'
                      }}>
                        <span className={`priority-dot ${isHighPriority ? 'priority-alta' : 'priority-normal'}`}></span>
                        {isHighPriority ? 'Urgente' : 'Normal'}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="task-actions" style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      {isPending && (
                        <button 
                          className="icon-button"
                          onClick={(e) => handleQuickResolve(e, task)}
                          title="Resolver"
                          style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', width: '28px', height: '28px', borderRadius: '6px' }}
                        >
                          <CheckCircle size={14}/>
                        </button>
                      )}
                      {isAdmin && (
                        <button 
                          className="icon-button"
                          onClick={(e) => handleDelete(e, task.id)}
                          title="Eliminar"
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '28px', height: '28px', borderRadius: '6px' }}
                        >
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contenido expandido (Igual que antes) */}
                  {isExpanded && (
                    <div className="task-expand-content" style={{
                      padding: '16px 16px 16px 66px',
                      background: 'rgba(255,255,255,0.02)',
                      borderBottom: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      {task.description ? (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase' }}>Descripción</div>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                            {task.description}
                          </p>
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.85rem' }}>Sin descripción adicional</p>
                      )}

                      {/* Resolución si está completada */}
                      {!isPending && task.resolutionComment && (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px',
                          background: 'rgba(52, 211, 153, 0.1)',
                          borderRadius: '8px',
                          border: '1px solid rgba(52, 211, 153, 0.2)'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#34d399', marginBottom: '4px', fontWeight: '600' }}>Resolución</div>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>{task.resolutionComment}</p>
                          {task.resolvedAt && (
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                              Resuelta el {formatDateSafe(task.resolvedAt)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Documento vinculado si existe */}
                      {!isPending && task.linkedRegistroId && (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px',
                          background: task.linkedRegistroDirection === 'entrada' 
                            ? 'rgba(96, 165, 250, 0.1)' 
                            : 'rgba(52, 211, 153, 0.1)',
                          borderRadius: '8px',
                          border: task.linkedRegistroDirection === 'entrada'
                            ? '1px solid rgba(96, 165, 250, 0.2)'
                            : '1px solid rgba(52, 211, 153, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {task.linkedRegistroDirection === 'entrada' ? (
                              <Inbox size={18} color="#60a5fa"/>
                            ) : (
                              <Send size={18} color="#34d399"/>
                            )}
                            <div>
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: task.linkedRegistroDirection === 'entrada' ? '#60a5fa' : '#34d399',
                                fontWeight: '600'
                              }}>
                                Documento de {task.linkedRegistroDirection === 'entrada' ? 'Entrada' : 'Salida'}
                              </div>
                              <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '600' }}>
                                {task.linkedRegistroNumber || 'Sin número'}
                              </div>
                            </div>
                          </div>
                          <button
                            className="button button-sm button-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/registros/${task.linkedRegistroId}`);
                            }}
                          >
                            Ver documento
                          </button>
                        </div>
                      )}

                      {/* Acciones expandidas */}
                      {isPending && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                          <button 
                            className="button button-success button-sm"
                            onClick={(e) => { e.stopPropagation(); setTaskToResolve(task); }}
                          >
                            <CheckCircle size={14}/> Resolver Tarea
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 💡 RENDERIZADO DE LA PAGINACIÓN ESTILO REGISTROS */}
        {renderPagination()}

      </div>

      {/* Modales */}
      <TaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSave={addNewTask}
      />
      
      <TaskResolutionModal 
        isOpen={!!taskToResolve} 
        onClose={() => setTaskToResolve(null)}
        task={taskToResolve}
        onResolve={resolveTask}
      />

    </div>
  );
}