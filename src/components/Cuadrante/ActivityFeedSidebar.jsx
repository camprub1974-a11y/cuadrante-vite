import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, AlertCircle, CheckCircle, Clock, Calendar, X, ChevronRight, User, XCircle } from 'react-feather';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthStore } from '../../store/authStore';
import { respondToShiftChangeRequest } from '../../../js/dataController';

// ✅ HOOK PERSONALIZADO PARA CONTROLAR EL SIDEBAR
export function useActivityFeedSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);
  return { sidebarOpen, openSidebar, closeSidebar };
}

// ✅ HELPER: Formatear fecha de forma segura
const formatDateSafe = (dateInput) => {
  if (!dateInput) return '-';
  try {
    let date = dateInput;
    if (dateInput.seconds) date = new Date(dateInput.seconds * 1000);
    else if (dateInput._seconds) date = new Date(dateInput._seconds * 1000);
    else if (typeof dateInput === 'string') date = new Date(dateInput);
    else if (!(dateInput instanceof Date)) date = new Date(dateInput);
    
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch (e) {
    return '-';
  }
};

// ✅ HELPER: Obtener tiempo relativo
const getTimeAgo = (dateInput) => {
  if (!dateInput) return '';
  try {
    let date = dateInput;
    if (dateInput.seconds) date = new Date(dateInput.seconds * 1000);
    else if (dateInput._seconds) date = new Date(dateInput._seconds * 1000);
    else if (!(dateInput instanceof Date)) date = new Date(dateInput);
    
    if (isNaN(date.getTime())) return '';
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch (e) {
    return '';
  }
};

// ✅ HELPER: Obtener info del tipo de novedad
const getNovedadTypeInfo = (type) => {
  switch(type?.toLowerCase()) {
    case 'festivo':
      return { 
        icon: '🎉', 
        color: '#f87171', 
        bg: 'rgba(248, 113, 113, 0.15)',
        label: 'Festivo'
      };
    case 'evento':
      return { 
        icon: '📅', 
        color: '#60a5fa', 
        bg: 'rgba(96, 165, 250, 0.15)',
        label: 'Evento'
      };
    case 'nota':
      return { 
        icon: '📝', 
        color: '#fbbf24', 
        bg: 'rgba(251, 191, 36, 0.15)',
        label: 'Nota'
      };
    case 'urgent':
    case 'urgente':
      return { 
        icon: '⚠️', 
        color: '#ef4444', 
        bg: 'rgba(239, 68, 68, 0.15)',
        label: 'Urgente'
      };
    case 'formacion':
      return { 
        icon: '📚', 
        color: '#a78bfa', 
        bg: 'rgba(167, 139, 250, 0.15)',
        label: 'Formación'
      };
    case 'reunion':
      return { 
        icon: '👥', 
        color: '#34d399', 
        bg: 'rgba(52, 211, 153, 0.15)',
        label: 'Reunión'
      };
    default:
      return { 
        icon: '📌', 
        color: 'var(--color-accent-neon)', 
        bg: 'rgba(0, 255, 136, 0.1)',
        label: 'Novedad'
      };
  }
};

// ✅ COMPONENTE: Item de Novedad (fechas señaladas) - MEJORADO
const NovedadItem = ({ item }) => {
  const dateObj = item.date || item.createdAt;
  const timeAgo = getTimeAgo(dateObj);
  const typeInfo = getNovedadTypeInfo(item.type);
  
  // Fecha formateada
  const formattedDate = formatDateSafe(dateObj);

  return (
    <div 
      className="activity-feed__item"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderLeft: `3px solid ${typeInfo.color}`,
        padding: '14px 16px',
        marginBottom: '12px',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Icono según tipo */}
        <div style={{
          minWidth: '40px',
          height: '40px',
          borderRadius: '10px',
          background: typeInfo.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${typeInfo.color}30`,
          fontSize: '1.2rem',
        }}>
          {typeInfo.icon}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header con título y tiempo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              fontWeight: '600', 
              color: 'white', 
              fontSize: '0.9rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.title || 'Novedad'}
            </span>
            <span style={{ 
              fontSize: '0.65rem', 
              color: 'rgba(255,255,255,0.4)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {timeAgo}
            </span>
          </div>
          
          {/* Descripción si existe */}
          {(item.details || item.description) && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'rgba(255,255,255,0.6)', 
              margin: '0 0 8px 0',
              lineHeight: '1.4',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {item.details || item.description}
            </p>
          )}
          
          {/* Footer con fecha y badge de tipo */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: '6px',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.4)',
            }}>
              <Calendar size={12} />
              <span>{formattedDate}</span>
            </div>
            
            {/* Badge de tipo */}
            <span style={{
              background: typeInfo.bg,
              color: typeInfo.color,
              fontSize: '0.65rem',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '10px',
              border: `1px solid ${typeInfo.color}40`,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}>
              {typeInfo.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ COMPONENTE: Item de Cambio de Turno (MEJORADO)
const CambioTurnoItem = ({ item, currentUser, onAction, processing }) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';
  const myAgentId = String(currentUser?.agentId);
  const requesterAgentId = String(item.requesterAgentId);
  const targetAgentId = String(item.targetAgentId);
  
  // ¿Me afecta este cambio?
  const isRequester = myAgentId === requesterAgentId;
  const isTarget = myAgentId === targetAgentId;
  const affectsMe = isRequester || isTarget;
  
  // ¿Puedo actuar?
  const canAct = (isTarget && item.status === 'Pendiente_Target') || 
                 (isAdmin && item.status === 'Pendiente_Admin');
  
  // Colores según estado
  const getStatusInfo = (status) => {
    switch(status) {
      case 'Pendiente_Target': return { color: '#3b82f6', label: 'Esperando compañero', bg: 'rgba(59,130,246,0.15)' };
      case 'Pendiente_Admin': return { color: '#f59e0b', label: 'Esperando admin', bg: 'rgba(245,158,11,0.15)' };
      case 'Aprobado': return { color: '#22c55e', label: 'Aprobado', bg: 'rgba(34,197,94,0.15)' };
      case 'Rechazado': return { color: '#ef4444', label: 'Rechazado', bg: 'rgba(239,68,68,0.15)' };
      default: return { color: '#6b7280', label: status || 'Pendiente', bg: 'rgba(107,114,128,0.15)' };
    }
  };
  
  const statusInfo = getStatusInfo(item.status);
  const timeAgo = getTimeAgo(item.createdAt);

  return (
    <div 
      style={{
        background: affectsMe ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        borderRadius: '14px',
        border: affectsMe ? '1px solid rgba(0, 255, 136, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px',
        marginBottom: '12px',
        transition: 'all 0.25s ease',
        boxShadow: canAct ? '0 0 20px rgba(0, 255, 136, 0.15)' : 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} color="var(--color-accent-neon)" />
          <span style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem' }}>Cambio de Turno</span>
          {affectsMe && (
            <span style={{
              background: 'var(--color-accent-neon)',
              color: '#0f172a',
              fontSize: '0.65rem',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '700',
            }}>
              TE AFECTA
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{timeAgo}</span>
      </div>

      {/* Detalle del intercambio */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '10px',
        padding: '12px',
        marginBottom: '12px',
      }}>
        {/* Agente solicitante */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          {/* Badge estilo cuadrante */}
          <div style={{
            background: isRequester 
              ? 'linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,255,136,0.1) 100%)' 
              : 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%)',
            border: isRequester 
              ? '1.5px solid rgba(0,255,136,0.5)' 
              : '1.5px solid rgba(0,255,136,0.3)',
            borderRadius: '8px',
            padding: '6px 12px',
            marginBottom: '8px',
            display: 'inline-block',
            boxShadow: isRequester 
              ? '0 0 10px rgba(0,255,136,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' 
              : 'inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            <span style={{
              color: 'var(--color-accent-neon)',
              fontWeight: '700',
              fontSize: '0.85rem',
              textShadow: '0 0 10px rgba(0,255,136,0.3)',
            }}>
              {isRequester ? 'TÚ' : requesterAgentId}
            </span>
          </div>
          <div style={{ color: '#60a5fa', fontWeight: '700', fontSize: '0.95rem' }}>
            {formatDateSafe(item.requesterShiftDate)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
            OFRECE
          </div>
        </div>

        {/* Icono central */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: statusInfo.bg,
          border: `2px solid ${statusInfo.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <RefreshCw size={14} color={statusInfo.color} />
        </div>

        {/* Agente destino */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          {/* Badge estilo cuadrante */}
          <div style={{
            background: isTarget 
              ? 'linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,255,136,0.1) 100%)' 
              : 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%)',
            border: isTarget 
              ? '1.5px solid rgba(0,255,136,0.5)' 
              : '1.5px solid rgba(0,255,136,0.3)',
            borderRadius: '8px',
            padding: '6px 12px',
            marginBottom: '8px',
            display: 'inline-block',
            boxShadow: isTarget 
              ? '0 0 10px rgba(0,255,136,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' 
              : 'inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            <span style={{
              color: 'var(--color-accent-neon)',
              fontWeight: '700',
              fontSize: '0.85rem',
              textShadow: '0 0 10px rgba(0,255,136,0.3)',
            }}>
              {isTarget ? 'TÚ' : targetAgentId}
            </span>
          </div>
          <div style={{ color: '#fbbf24', fontWeight: '700', fontSize: '0.95rem' }}>
            {formatDateSafe(item.targetShiftDate)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
            RECIBE
          </div>
        </div>
      </div>

      {/* Comentarios si hay */}
      {item.requesterComments && (
        <div style={{
          fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.6)',
          fontStyle: 'italic',
          marginBottom: '12px',
          padding: '8px 10px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '6px',
          borderLeft: '2px solid rgba(255,255,255,0.2)',
        }}>
          "{item.requesterComments}"
        </div>
      )}

      {/* Estado y Acciones */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: '12px',
      }}>
        {/* Badge de estado */}
        <span style={{
          background: statusInfo.bg,
          color: statusInfo.color,
          border: `1px solid ${statusInfo.color}50`,
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '600',
        }}>
          {statusInfo.label}
        </span>

        {/* Botones de acción */}
        {canAct && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onAction(item.id, 'reject')}
              disabled={processing === item.id}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
                opacity: processing === item.id ? 0.5 : 1,
              }}
            >
              <XCircle size={14} /> Rechazar
            </button>
            <button
              onClick={() => onAction(item.id, 'accept')}
              disabled={processing === item.id}
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,255,136,0.1) 100%)',
                border: '1px solid rgba(0,255,136,0.4)',
                color: 'var(--color-accent-neon)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
                opacity: processing === item.id ? 0.5 : 1,
              }}
            >
              <CheckCircle size={14} /> Aceptar
            </button>
          </div>
        )}

        {/* Mensaje si no puede actuar pero le afecta */}
        {!canAct && affectsMe && item.status === 'Pendiente_Target' && !isTarget && (
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
            Esperando al Ag. {targetAgentId}
          </span>
        )}
        {!canAct && item.status === 'Pendiente_Admin' && !isAdmin && (
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
            Esperando al administrador
          </span>
        )}
      </div>
    </div>
  );
};

// ✅ COMPONENTE PRINCIPAL
const ActivityFeedSidebar = ({ isVisible, onClose, novedades = [], cambios = [], onCambiosUpdate }) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('novedades');
  const [processing, setProcessing] = useState(null);

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isVisible) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isVisible, onClose]);

  // Si hay cambios que me afectan, mostrar esa pestaña
  useEffect(() => {
    if (isVisible && cambios.length > 0 && user) {
      const myAgentId = String(user.agentId);
      const cambiosQueMeAfectan = cambios.filter(c => 
        String(c.requesterAgentId) === myAgentId || 
        String(c.targetAgentId) === myAgentId
      );
      if (cambiosQueMeAfectan.length > 0) {
        setActiveTab('cambios');
      }
    }
  }, [isVisible, cambios, user]);

  // Handler para responder a cambio de turno
  const handleShiftChangeAction = async (requestId, action) => {
    if (!confirm(`¿Estás seguro de ${action === 'accept' ? 'ACEPTAR' : 'RECHAZAR'} este cambio de turno?`)) return;
    
    setProcessing(requestId);
    try {
      await respondToShiftChangeRequest({
        requestId,
        action,
        comments: ''
      });
      
      if (window.displayMessage) {
        window.displayMessage(`Cambio ${action === 'accept' ? 'aceptado' : 'rechazado'}`, 'success');
      }
      
      // Callback para recargar datos
      if (onCambiosUpdate) onCambiosUpdate();
      
    } catch (error) {
      console.error('Error al responder:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  if (!isVisible) return null;

  // Contar cambios que me afectan
  const myAgentId = String(user?.agentId);
  const cambiosQueMeAfectan = cambios.filter(c => 
    (String(c.requesterAgentId) === myAgentId || String(c.targetAgentId) === myAgentId) &&
    ['Pendiente_Target', 'Pendiente_Admin'].includes(c.status)
  ).length;

  const itemsToShow = activeTab === 'novedades' ? novedades : cambios;
  const isEmpty = itemsToShow.length === 0;

  return (
    <>
      {/* OVERLAY */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
        }}
      />

      {/* SIDEBAR */}
      <aside style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        bottom: '16px',
        width: '400px',
        maxWidth: 'calc(100vw - 32px)',
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transform: isVisible ? 'translateX(0)' : 'translateX(calc(100% + 32px))',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        
        {/* HEADER */}
        <div style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,255,136,0.05) 100%)',
              border: '1px solid rgba(0,255,136,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bell size={20} color="var(--color-accent-neon)" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: '700' }}>Actividad</h3>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                {novedades.length + cambios.length} notificaciones
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title="Cerrar (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', padding: '12px 16px', gap: '8px' }}>
          {[
            { id: 'novedades', label: 'Novedades', icon: Bell, count: novedades.length },
            { id: 'cambios', label: 'Cambios', icon: RefreshCw, count: cambios.length, urgent: cambiosQueMeAfectan },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '10px',
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, rgba(0,255,136,0.15) 0%, rgba(0,255,136,0.05) 100%)'
                  : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(0,255,136,0.3)' : '1px solid transparent',
                color: activeTab === tab.id ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  background: tab.urgent > 0 ? '#ef4444' : (activeTab === tab.id ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.2)'),
                  color: tab.urgent > 0 || activeTab === tab.id ? '#0f172a' : 'white',
                  fontSize: '0.7rem',
                  padding: '2px 7px',
                  borderRadius: '20px',
                  fontWeight: '700',
                  animation: tab.urgent > 0 ? 'pulse 2s infinite' : 'none',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div 
          className="custom-scrollbar"
          style={{ flex: 1, overflowY: 'auto', padding: '16px' }}
        >
          {isEmpty ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                {activeTab === 'novedades' ? <Bell size={28} color="rgba(255,255,255,0.2)" /> : <RefreshCw size={28} color="rgba(255,255,255,0.2)" />}
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                No hay {activeTab === 'novedades' ? 'novedades' : 'cambios de turno'}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'novedades' && novedades.map((item, idx) => (
                <NovedadItem key={item.id || idx} item={item} />
              ))}
              
              {activeTab === 'cambios' && cambios.map((item, idx) => (
                <CambioTurnoItem 
                  key={item.id || idx} 
                  item={item} 
                  currentUser={user}
                  onAction={handleShiftChangeAction}
                  processing={processing}
                />
              ))}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
            Pulsa ESC para cerrar
          </span>
        </div>
      </aside>

      {/* ESTILOS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  );
};

export default ActivityFeedSidebar;