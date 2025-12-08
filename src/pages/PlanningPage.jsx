// Archivo: /src/pages/PlanningPage.jsx
// VERSIÓN MODIFICADA: Implementación de Paginación Consistente (Cursor-Based)

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
    getServiceOrders, // Asumimos que esta función ahora soporta cursor/limit
    deleteServiceOrder,
    generateAiServiceOrder,
    getDefaultOrderTemplate
} from '../../js/dataController';
import { 
    Calendar, ChevronLeft, ChevronRight, Clipboard, 
    Sun, Briefcase, Plus, CheckCircle, AlertCircle, Users,
    Filter, Eye, Edit, Trash2, Cpu, RefreshCw, Clock, Loader, Activity, Search, ChevronDown
} from 'react-feather';
import { format, addDays, subDays, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// Imports de componentes de paginación
import PaginationControls from '../components/PaginationControls'; 

// Modales
import ServiceOrderModal from '../components/Modals/ServiceOrderModal';
import ViewOrderModal from '../components/Modals/ViewOrderModal';


// =========================================
// CONSTANTES GLOBALES Y DE PAGINACIÓN
// =========================================
const PAGINATION_LIMIT = 15; // Usamos el límite estándar de la guía

const getStatusConfig = (status) => {
    switch(status?.toLowerCase()) {
        case 'assigned': return { color: '#fbbf24', label: 'Asignado', icon: Users, class: 'status-assigned' };
        case 'in_progress': return { color: '#3b82f6', label: 'En Curso', icon: Clock, class: 'status-in-progress' };
        case 'completed': return { color: '#34d399', label: 'Finalizado', icon: CheckCircle, class: 'status-completed' };
        case 'draft': return { color: '#9ca3af', label: 'Borrador', icon: Edit, class: 'status-draft' };
        default: return { color: '#9ca3af', label: status || 'Pendiente', icon: AlertCircle, class: 'status-pending' };
    }
};

const getStatusLabel = (status) => getStatusConfig(status).label;
const getStatusClass = (status) => getStatusConfig(status).class;

// NOTA: Se elimina getPaginationRange ya que PaginationControls lo maneja.

const shiftColors = { 
    'M': { bg: 'rgba(52, 211, 153, 0.2)', text: '#34d399' },
    'T': { bg: 'rgba(96, 165, 250, 0.2)', text: '#60a5fa' }, 
    'N': { bg: 'rgba(129, 140, 248, 0.2)', text: '#a78bfa' } 
};
const shiftLabels = { 'M': 'Mañana', 'T': 'Tarde', 'N': 'Noche' };


// =========================================
// COMPONENTE: Tarjeta de Turno
// ... (Este componente se mantiene sin cambios, ya que solo muestra órdenes del día actual)
const ShiftOrderCard = ({ 
    shiftType, label, timeRange,
    icon: Icon, iconColor, date, 
    orders = [], onGenerate, onView, onGenerateIA,
    isGeneratingIA 
}) => {
    const order = orders.find(o => 
        o.service_shift === shiftType && 
        isSameDay(
            o.service_date?.toDate ? o.service_date.toDate() : new Date(o.service_date), 
            date
        )
    );
    const exists = !!order;
    const statusInfo = order ? getStatusConfig(order.status) : null;

    return (
        <div 
            className="card" 
            style={{ 
                background: 'var(--glass-dark-bg)', 
                border: exists ? `1px solid ${statusInfo?.color || '#34d399'}40` : '1px solid var(--glass-dark-border)', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {exists && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: statusInfo?.color || '#34d399'
                }}/>
            )}

            <div 
                className="card-header" 
                style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.1)', 
                    padding: '1rem 1.25rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        background: exists ? `${statusInfo?.color || iconColor}20` : 'rgba(255,255,255,0.05)', 
                        padding: '10px', borderRadius: '12px', 
                        color: exists ? (statusInfo?.color || iconColor) : 'rgba(255,255,255,0.4)'
                    }}>
                        <Icon size={22} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: '600' }}>{label}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{timeRange}</span>
                    </div>
                </div>
                
                {exists && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: `${statusInfo?.color}20`, padding: '4px 10px',
                        borderRadius: '20px', fontSize: '0.75rem',
                        color: statusInfo?.color, fontWeight: '600'
                    }}>
                        {React.createElement(statusInfo.icon, { size: 12 })}
                        {statusInfo.label}
                    </div>
                )}
            </div>

            <div 
                className="card-body" 
                style={{ 
                    flex: 1, padding: '1.5rem', 
                    display: 'flex', flexDirection: 'column', 
                    justifyContent: 'center', alignItems: 'center', 
                    gap: '1rem' 
                }}
            >
                {exists ? (
                    <>
                        <div style={{ textAlign: 'center', width: '100%' }}>
                            <p style={{ 
                                margin: 0, fontWeight: '700', color: 'white', 
                                fontSize: '1.15rem', fontFamily: 'monospace'
                            }}>
                                #{order.order_number || order.order_reg_number || '---'}
                            </p>
                            <p style={{ 
                                margin: '8px 0 0 0', fontSize: '0.9rem', 
                                color: 'rgba(255,255,255,0.7)', maxWidth: '280px',
                                whiteSpace: 'nowrap', overflow: 'hidden', 
                                textOverflow: 'ellipsis' 
                            }}>
                                {order.title || 'Sin título'}
                            </p>
                            
                            <div style={{ 
                                display: 'flex', alignItems: 'center', 
                                justifyContent: 'center', gap: '8px', 
                                marginTop: '15px', background: 'rgba(255,255,255,0.05)', 
                                padding: '8px 15px', borderRadius: '25px' 
                            }}>
                                <Users size={16} color="var(--color-accent-neon)"/>
                                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                    {order.assigned_agents?.length || 0} Agentes
                                </span>
                            </div>
                        </div>
                        
                        <button 
                            className="button button-secondary w-100" 
                            onClick={() => onView(order)} 
                            style={{ 
                                marginTop: 'auto', width: '100%', 
                                border: '1px solid rgba(255,255,255,0.15)',
                                justifyContent: 'center'
                            }}
                        >
                            <Eye size={16} style={{ marginRight: 8 }}/> Ver Detalles
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', opacity: 0.5, marginBottom: '10px' }}>
                            <AlertCircle size={40} style={{ marginBottom: '10px', strokeWidth: 1.5 }} />
                            <p style={{ fontSize: '0.95rem', margin: 0 }}>Sin orden planificada</p>
                        </div>
                        
                        <div style={{ 
                            display: 'grid', gridTemplateColumns: '1fr 1fr', 
                            gap: '10px', width: '100%', marginTop: 'auto' 
                        }}>
                            <button 
                                className="button ripple-effect" 
                                onClick={() => onGenerateIA(shiftType)} 
                                disabled={isGeneratingIA}
                                style={{ 
                                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
                                    border: 'none', color: 'white', 
                                    justifyContent: 'center', padding: '10px 8px',
                                    opacity: isGeneratingIA ? 0.7 : 1
                                }} 
                                title="Generar automáticamente con IA"
                            >
                                {isGeneratingIA ? (
                                    <Loader size={16} className="spin"/>
                                ) : (
                                    <Cpu size={16} />
                                )}
                                <span style={{ fontSize: '0.8rem', marginLeft: 6 }}>
                                    {isGeneratingIA ? 'Generando...' : 'Auto IA'}
                                </span>
                            </button>
                            <button 
                                className="button btn-gradient-primary" 
                                onClick={() => onGenerate(shiftType)} 
                                style={{ justifyContent: 'center', padding: '10px 8px' }} 
                                title="Crear orden manualmente"
                            >
                                <Plus size={16} />
                                <span style={{ fontSize: '0.8rem', marginLeft: 6 }}>Manual</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
// =========================================


// =========================================
// COMPONENTE PRINCIPAL: PlanningPage
// =========================================
export default function PlanningPage() {
    const { user } = useAuthStore();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    // allOrders ahora guarda solo las órdenes de la página actual del histórico
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generatingIA, setGeneratingIA] = useState({ M: false, T: false });
    
    // 💡 ESTADO DE PAGINACIÓN DE CURSOR
    const [pagination, setPagination] = useState({
        currentPage: 1,
        lastVisible: null,       // Cursor de Firestore
        pageHistory: [null],     // Historial de cursores (null para pág 1)
        hasNextPage: true        // ¿Hay más páginas que cargar?
    });

    // 💡 itemsPerPage se elimina del estado local porque PAGINATION_LIMIT es la fuente de la verdad para el fetch
    // itemsPerPage se mantiene como constante local si fuera necesario para UI local, pero no para el fetch.

    const [filters, setFilters] = useState({ 
        startDate: '', 
        endDate: '', 
        shift: 'all',
        status: 'all',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [defaultModalShift, setDefaultModalShift] = useState('M');
    const [initialOrderData, setInitialOrderData] = useState(null); 
    const [viewOrder, setViewOrder] = useState(null);

    // =========================================
    // 💡 FUNCIÓN DE CARGA CON CURSOR (Migración del loadOrders)
    // =========================================
    const fetchOrdersWithCursor = useCallback(async (page, cursor) => {
        setLoading(true);
        try {
            // Calculamos el rango de fechas para el filtro del mes actual
            const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

            // 1. Aplicar filtros y parámetros de paginación
            const fetchFilters = { 
                ...filters, 
                // Sobrescribimos el rango de fechas con el del mes actual
                startDate: format(startOfMonth, 'yyyy-MM-dd'), 
                endDate: format(endOfMonth, 'yyyy-MM-dd'), 
            };
            
            // Llamamos a la función de dataController (ASUMIMOS que soporta cursor/limit)
            const result = await getServiceOrders({
                filters: fetchFilters,
                limit: PAGINATION_LIMIT,
                startAfterDoc: cursor,
            });
            
            const validOrders = (result.orders || []).filter(o => o.id);
            
            setAllOrders(validOrders); // Establecemos las órdenes de la página actual

            // 2. Actualizar el estado de paginación
            setPagination(prev => {
                const newState = { ...prev };
                newState.currentPage = page;
                newState.lastVisible = result.lastVisible;
                
                const isPageFull = validOrders.length === PAGINATION_LIMIT;
                newState.hasNextPage = isPageFull;
                
                // Si avanzamos a una página nueva y la página actual estaba llena, añadimos el cursor
                if (page === prev.pageHistory.length && result.lastVisible && isPageFull) {
                    newState.pageHistory.push(result.lastVisible);
                }

                // Si volvemos, hasNextPage se mantiene a true (siempre se puede avanzar a la página siguiente conocida)
                if (page < prev.pageHistory.length) {
                    newState.hasNextPage = true; 
                } else if (page === prev.pageHistory.length) {
                    newState.hasNextPage = isPageFull; 
                }

                return newState;
            });

        } catch (error) { 
            console.error("Error cargando órdenes:", error); 
        } finally { 
            setLoading(false); 
        }
    }, [currentMonth, filters]); // Depende del mes y los filtros de búsqueda

    // --- HANDLERS DE PAGINACIÓN (COPIADOS DE SERVICEREPORTSPAGE) ---

    const handleNextPage = () => {
        const nextPage = pagination.currentPage + 1;
        const cursorToUse = pagination.lastVisible;
        const storedCursor = pagination.pageHistory[nextPage - 1];

        if (storedCursor !== undefined || pagination.hasNextPage) {
            fetchOrdersWithCursor(nextPage, storedCursor || cursorToUse);
        }
    };

    const handlePrevPage = () => {
        const prevPage = pagination.currentPage - 1;
        if (prevPage >= 1) {
            const prevCursor = pagination.pageHistory[prevPage - 1];
            fetchOrdersWithCursor(prevPage, prevCursor);
        }
    };
    
    const handlePageClick = (page) => {
        if (page === pagination.currentPage) return;
        
        const cursor = pagination.pageHistory[page - 1];
        if (cursor !== undefined) {
            fetchOrdersWithCursor(page, cursor);
        }
    };

    // --- EFECTO DE CARGA Y FILTRO ---
    useEffect(() => { 
        // Resetear paginación al cambiar el mes o los filtros de la tabla
        setPagination({
            currentPage: 1,
            lastVisible: null,
            pageHistory: [null],
            hasNextPage: true
        });
        fetchOrdersWithCursor(1, null); 
    }, [currentMonth, filters.shift, filters.status, filters.search, fetchOrdersWithCursor]); 


    // Navegación de Fecha
    const prevDay = () => setCurrentDate(subDays(currentDate, 1));
    const nextDay = () => setCurrentDate(addDays(currentDate, 1));
    const goToToday = () => {
        setCurrentDate(new Date());
        setCurrentMonth(new Date());
    };
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    // Handlers
    const handleViewOrder = (order) => setViewOrder(order);
    
    const handleGenerateOrder = (shiftType) => {
        setEditingOrder(null);
        setInitialOrderData(null);  
        setDefaultModalShift(shiftType);
        setIsOrderModalOpen(true);
    };

    const handleEditOrder = (order) => {
        setEditingOrder(order);
        setIsOrderModalOpen(true);
        setInitialOrderData(null);  
    };

    const handleDeleteOrder = async (orderId) => {
        if (!confirm("¿Eliminar esta orden de servicio?")) return;
        try {
            await deleteServiceOrder(orderId);
            fetchOrdersWithCursor(pagination.currentPage, pagination.pageHistory[pagination.currentPage - 1]); // Recargar página actual
        } catch (e) {
            alert("Error: " + e.message);
        }
    };

    const handleGenerateIA = async (shiftType) => {
        setGeneratingIA(prev => ({ ...prev, [shiftType]: true }));
        
        try {
            const dateString = format(currentDate, 'yyyy-MM-dd');
            
            const result = await generateAiServiceOrder(dateString, shiftType);
            
            if (result.success) {
                const shiftName = shiftType === 'M' ? 'Mañana' : shiftType === 'T' ? 'Tarde' : 'Noche';
                let template = null;
                try {
                    template = await getDefaultOrderTemplate(shiftName); 
                } catch (e) {
                    console.warn("No se pudo cargar la plantilla:", e);
                }

                // Lógica de Responsable (Veteranía) se mantiene
                const AGENT_SENIORITY_ORDER = ['4684', '4687', '5281', '5605', '8498']; 
                let finalManagerId = '';
                const assignedAgents = result.assignedAgents || [];
                
                if (assignedAgents.length > 0) {
                    finalManagerId = assignedAgents.slice().sort((a, b) => {
                        const idxA = AGENT_SENIORITY_ORDER.indexOf(String(a));
                        const idxB = AGENT_SENIORITY_ORDER.indexOf(String(b));
                        if (idxA === -1) return 1;
                        if (idxB === -1) return -1;
                        return idxA - idxB;
                    })[0];
                }

                const draftOrder = {
                    id: null,
                    service_date: currentDate,
                    service_shift: shiftType,
                    assigned_agents: assignedAgents,
                    shift_manager_id: finalManagerId, 
                    title: template?.title || `Servicio Automático - ${shiftName}`,
                    subtitle: template?.subtitle || 'Generado por IA basado en Cuadrante',
                    description: template?.description || result.message || 'Orden generada automáticamente.',
                    status: 'draft',
                    checklist: template?.checklist || [] 
                };

                setEditingOrder(null);  
                setInitialOrderData(draftOrder);  
                setIsOrderModalOpen(true);

            } else {
                throw new Error(result.message || 'Error desconocido');
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setGeneratingIA(prev => ({ ...prev, [shiftType]: false }));
        }
    };

    // 💡 Filtros locales para la tabla del histórico (YA NO NECESARIOS, el fetchOrdersWithCursor debe filtrar en la BD)
    // El código original hacía: Filtrado local -> Sort local -> Slice local
    // Con cursor-based, el fetch ya trae los resultados filtrados y paginados. 
    
    // Por simplicidad en la migración, asumo que `getServiceOrders` en la BD ya aplica los filtros:
    const currentItems = allOrders; 
    const totalPages = pagination.pageHistory.length; // El número de páginas que hemos visitado/calculado.

    return (
        <div className="view-container" style={{ padding: '1.5rem', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
            
            {/* Header */}
            <div className="view-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                        background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,180,100,0.1))', 
                        padding: '12px', borderRadius: '14px',
                        border: '1px solid rgba(0,255,136,0.2)'
                    }}>
                        <Calendar size={28} color="var(--color-accent-neon)" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: 'white' }}>Planificación</h1>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Gestión de Borradores y Futuro</p>
                    </div>
                </div>
            </div>

            {/* Selector de Fecha */}
            <div className="card" style={{ marginBottom: '2rem', background: 'var(--glass-dark-bg)', border: '1px solid var(--glass-dark-border)' }}>
                <div className="card-body" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="icon-button" onClick={prevDay}><ChevronLeft size={20}/></button>
                        <div style={{ textAlign: 'center', minWidth: '220px' }}>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '1.4rem', textTransform: 'capitalize', fontWeight: '600' }}>
                                {format(currentDate, "EEEE d", { locale: es })}
                            </h2>
                            <span style={{ color: 'var(--color-accent-neon)', fontSize: '0.9rem' }}>
                                {format(currentDate, "MMMM yyyy", { locale: es })}
                            </span>
                        </div>
                        <button className="icon-button" onClick={nextDay}><ChevronRight size={20}/></button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="button btn-gradient-primary" onClick={goToToday}>
                            <Calendar size={16}/> Hoy
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid de Turnos */}
            {loading && allOrders.length === 0 ? (
                <div className="loading-spinner-container" style={{ padding: '3rem' }}><div className="loading-spinner"></div></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <ShiftOrderCard 
                        shiftType="M" label="Turno de Mañana" timeRange="08:00 - 15:00"
                        icon={Sun} iconColor="#fbbf24" date={currentDate} orders={allOrders} 
                        onGenerate={handleGenerateOrder} onGenerateIA={handleGenerateIA} onView={handleViewOrder}
                        isGeneratingIA={generatingIA.M}
                    />
                    <ShiftOrderCard 
                        shiftType="T" label="Turno de Tarde" timeRange="14:00 - 21:00"
                        icon={Briefcase} iconColor="#f97316" date={currentDate} orders={allOrders} 
                        onGenerate={handleGenerateOrder} onGenerateIA={handleGenerateIA} onView={handleViewOrder}
                        isGeneratingIA={generatingIA.T}
                    />
                </div>
            )}

            {/* Histórico */}
            <div> 
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h4 style={{ fontSize: '1.1rem', color: 'white', margin: 0, fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '1px' }}>
                        <Clipboard size={18}/> Histórico del Mes
                        <span style={{ background: 'rgba(0,255,136,0.2)', color: 'var(--color-accent-neon)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>
                            {allOrders.length} {/* Muestra el total de items de la página actual */}
                        </span>
                    </h4>
                    <button className="button button-secondary button-sm" onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={14}/> Filtros
                    </button>
                </div>

                {showFilters && (
                    <div className="card" style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-dark-border)' }}>
                        <div className="card-body" style={{ padding: '1.25rem' }}>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
                                
                                {/* 1. INPUT BUSCADOR ESTILIZADO */}
                                <div>
                                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px', display:'block', color: 'rgba(255,255,255,0.6)' }}>Buscar</label>
                                    <div style={{ 
                                        position: 'relative', display: 'flex', alignItems: 'center',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '8px', padding: '0 10px', height: '40px'
                                    }}>
                                        <Search size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: '8px' }}/>
                                        <input 
                                            type="text" 
                                            className="input" 
                                            placeholder="Nº orden, título..." 
                                            value={filters.search} 
                                            onChange={e => setFilters({...filters, search: e.target.value})}
                                            style={{ 
                                                border: 'none', background: 'transparent', padding: 0, 
                                                height: '100%', width: '100%', color: 'white', outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* 2. SELECTOR TURNO ESTILIZADO */}
                                <div>
                                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px', display:'block', color: 'rgba(255,255,255,0.6)' }}>Turno</label>
                                    <div style={{ 
                                        position: 'relative', display: 'flex', alignItems: 'center',
                                        background: filters.shift !== 'all' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)', 
                                        border: filters.shift !== 'all' ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '8px', padding: '0 30px 0 10px', height: '40px'
                                    }}>
                                        <Clock size={16} color={filters.shift !== 'all' ? '#fbbf24' : "rgba(255,255,255,0.4)"} style={{ marginRight: '8px' }}/>
                                        
                                        <select 
                                            value={filters.shift} 
                                            onChange={e => setFilters({...filters, shift: e.target.value})}
                                            style={{ 
                                                appearance: 'none', background: 'transparent', border: 'none', 
                                                color: filters.shift !== 'all' ? '#fbbf24' : 'white', 
                                                width: '100%', height: '100%', cursor: 'pointer', outline: 'none',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <option value="all" style={{ background: '#1f2937', color: 'white' }}>Todos los turnos</option>
                                            <option value="M" style={{ background: '#1f2937', color: 'white' }}>Mañana</option>
                                            <option value="T" style={{ background: '#1f2937', color: 'white' }}>Tarde</option>
                                        </select>
                                        
                                        <ChevronDown size={16} color={filters.shift !== 'all' ? '#fbbf24' : "rgba(255,255,255,0.4)"} style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }}/>
                                    </div>
                                </div>

                                {/* 3. SELECTOR ESTADO ESTILIZADO */}
                                <div>
                                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px', display:'block', color: 'rgba(255,255,255,0.6)' }}>Estado</label>
                                    <div style={{ 
                                        position: 'relative', display: 'flex', alignItems: 'center',
                                        background: filters.status !== 'all' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255,255,255,0.05)', 
                                        border: filters.status !== 'all' ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '8px', padding: '0 30px 0 10px', height: '40px'
                                    }}>
                                        <Activity size={16} color={filters.status !== 'all' ? '#60a5fa' : "rgba(255,255,255,0.4)"} style={{ marginRight: '8px' }}/>
                                        
                                        <select 
                                            value={filters.status} 
                                            onChange={e => setFilters({...filters, status: e.target.value})}
                                            style={{ 
                                                appearance: 'none', background: 'transparent', border: 'none', 
                                                color: filters.status !== 'all' ? '#60a5fa' : 'white', 
                                                width: '100%', height: '100%', cursor: 'pointer', outline: 'none',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <option value="all" style={{ background: '#1f2937', color: 'white' }}>Todos los estados</option>
                                            <option value="draft" style={{ background: '#1f2937', color: 'white' }}>Borrador</option>
                                            <option value="assigned" style={{ background: '#1f2937', color: 'white' }}>Asignado</option>
                                            <option value="in_progress" style={{ background: '#1f2937', color: 'white' }}>En Curso</option>
                                            <option value="completed" style={{ background: '#1f2937', color: 'white' }}>Finalizado</option>
                                        </select>

                                        <ChevronDown size={16} color={filters.status !== 'all' ? '#60a5fa' : "rgba(255,255,255,0.4)"} style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }}/>
                                    </div>
                                </div>

                                {/* BOTÓN LIMPIAR */}
                                <button 
                                    className="button button-secondary" 
                                    onClick={() => setFilters({ startDate: '', endDate: '', shift: 'all', status: 'all', search: '' })}
                                    style={{ height: '40px', justifyContent: 'center' }}
                                >
                                    Limpiar
                                </button>

                            </div>
                        </div>
                    </div>
                )}

                {/* TABLA DE ÓRDENES */}
                <div className="card" style={{ background: 'var(--glass-dark-bg)', border: '1px solid var(--glass-dark-border)', overflow: 'hidden' }}>
                    <div className="table-container" style={{ overflowX: 'auto' }}> 
                        <table className="data-table" style={{ width: '100%', minWidth: '800px' }}><thead>
                            <tr>
                                <th style={{ cursor: 'pointer' }}>Nº Orden</th>
                                <th style={{ cursor: 'pointer' }}>Fecha</th>
                                <th>Turno</th>
                                <th>Estado</th>
                                <th>Agentes</th>
                                <th>Título</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                                        <div className="loading-spinner"></div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                                        No se encontraron órdenes para la selección actual.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map(order => {
                                    const dateObj = order.service_date?.toDate ? order.service_date.toDate() : new Date(order.service_date);
                                    const shift = shiftColors[order.service_shift] || shiftColors['M'];
                                    const statusConfig = getStatusConfig(order.status);
                                    
                                    return (
                                        <tr key={order.id}>
                                            <td><strong style={{ fontFamily: 'monospace' }}>#{order.order_number || order.order_reg_number || '---'}</strong></td>
                                            <td>{format(dateObj, 'dd/MM/yyyy', { locale: es })}</td>
                                            <td><span className="type-pill" style={{ background: shift.bg, color: shift.text, fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>{shiftLabels[order.service_shift] || 'N/A'}</span></td>
                                            <td><span className={`status-pill ${statusConfig.class}`} style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500' }}>{statusConfig.label}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {(order.assigned_agents || []).slice(0, 3).map(aId => (
                                                        <span key={aId} className="agent-badge" style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white' }}>{aId}</span>
                                                    ))}
                                                    {order.assigned_agents?.length > 3 && 
                                                        <span style={{ fontSize: '0.75rem', opacity: 0.5, marginLeft: '4px' }}>
                                                            +{order.assigned_agents.length - 3}
                                                        </span>
                                                    }
                                                    {(order.assigned_agents?.length === 0 || !order.assigned_agents) && 
                                                        <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>Sin asignar</span>
                                                    }
                                                </div>
                                            </td>
                                            <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.title}</td>
                                            <td>
                                                <div className="actions-cell" style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
                                                    <button className="icon-button" title="Ver" aria-label={`Ver orden ${order.order_number}`} onClick={() => handleViewOrder(order)}><Eye size={16}/></button>
                                                    <button className="icon-button" title="Editar" aria-label={`Editar orden ${order.order_number}`} onClick={() => handleEditOrder(order)}><Edit size={16}/></button>
                                                    <button className="icon-button button-danger" title="Eliminar" aria-label={`Eliminar orden ${order.order_number}`} onClick={() => handleDeleteOrder(order.id)}><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN DE CURSOR */}
                    <PaginationControls
                        currentPage={pagination.currentPage}
                        pageHistory={pagination.pageHistory}
                        hasNextPage={pagination.hasNextPage}
                        loading={loading}
                        itemsCount={allOrders.length} // Items de la página actual
                        onNextPage={handleNextPage}
                        onPrevPage={handlePrevPage}
                        onPageClick={handlePageClick}
                    />
                </div>
            </div> 

            {/* Modales */}
            <ServiceOrderModal 
                isOpen={isOrderModalOpen} 
                onClose={() => { setIsOrderModalOpen(false); setInitialOrderData(null); }} 
                orderToEdit={editingOrder}
                initialData={initialOrderData}
                defaultDate={currentDate}
                defaultShift={defaultModalShift}
                onSaved={fetchOrdersWithCursor} // Llamar a fetchOrdersWithCursor después de guardar
            />
            
            <ViewOrderModal 
                isOpen={!!viewOrder}
                onClose={() => setViewOrder(null)}
                order={viewOrder}
                onEdit={(order) => { setViewOrder(null); handleEditOrder(order); }}
            />

        </div> 
    );
}