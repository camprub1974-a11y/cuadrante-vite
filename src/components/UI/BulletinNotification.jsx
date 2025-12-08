// Archivo: src/components/UI/BulletinNotification.jsx
import React, { useEffect } from 'react';
import { Bell } from 'react-feather';
import { useBulletinStore } from '../../store/bulletinStore'; // Asegúrate que esta ruta es correcta
import { Link, useLocation } from 'react-router-dom';

export default function BulletinNotification() {
  const { unreadCount, fetchAnnouncements } = useBulletinStore();
  const location = useLocation();

  // Comprobar actualizaciones periódicamente (cada 5 min) o al montar
  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  // Calculamos si está activo
  const isActive = location.pathname === '/tablon';

  return (
    <Link 
      to="/tablon" 
      className={`nav-item ${isActive ? 'active' : ''}`} 
      style={{ position: 'relative' }}
    >
      <Bell size={20} />
      <span>Tablón</span>
      
      {/* 💡 EL GLOBO ROJO */}
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '8px',       // Ajustado ligeramente
          left: '28px',     // Ajustado para que no tape el icono
          background: '#ef4444',
          color: 'white',
          fontSize: '0.65rem',
          fontWeight: 'bold',
          minWidth: '18px',
          height: '18px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #1e293b', // Color de fondo del sidebar para recorte
          zIndex: 10,
          animation: 'pulse 2s infinite'
        }}>
          {unreadCount > 9 ? '+9' : unreadCount}
        </span>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </Link>
  );
}