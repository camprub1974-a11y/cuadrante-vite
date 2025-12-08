// src/components/UI/DotacionesNotification.jsx
import React, { useEffect, useState } from 'react';
import { Shield } from 'react-feather';
import { Link } from 'react-router-dom';
import { useDotacionesStore } from '../../store/dotacionesStore';
import { useAuthStore } from '../../store/authStore';

export default function DotacionesNotification() {
  const { user } = useAuthStore();
  const { loadDotacionesAgente, dotaciones } = useDotacionesStore();
  const [pendingCount, setPendingCount] = useState(0);

  // Cargar datos periódicamente para ver si hay nuevas asignaciones
  useEffect(() => {
    if (user?.agentId) {
      const checkPending = async () => {
        await loadDotacionesAgente(user.agentId);
        // Calcular pendientes sumando todas las categorías
        const count = 
          dotaciones.armas.filter(a => a.estado === 'pendiente_aceptacion').length +
          dotaciones.vestuario.filter(v => v.estado === 'pendiente_aceptacion').length +
          dotaciones.equipamiento.filter(e => e.estado === 'pendiente_aceptacion').length;
        
        setPendingCount(count);
      };

      checkPending();
      const interval = setInterval(checkPending, 300000); // Cada 5 min
      return () => clearInterval(interval);
    }
  }, [user, loadDotacionesAgente, dotaciones]); // Dependencias para recalcular

  return (
    <Link to="/dotaciones" className="nav-item" style={{ position: 'relative' }}>
      <Shield size={20} />
      <span>Dotaciones</span>
      
      {pendingCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '5px', left: '25px',
          background: '#fbbf24', // Amarillo para diferenciar de alertas rojas
          color: 'black',
          fontSize: '0.65rem', fontWeight: 'bold',
          minWidth: '18px', height: '18px',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #1e293b',
          animation: 'pulse 2s infinite'
        }}>
          {pendingCount}
        </span>
      )}
    </Link>
  );
}