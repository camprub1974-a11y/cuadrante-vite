import React, { useEffect, useState } from 'react';
import { AlertOctagon } from 'react-feather'; // Icono sugerido
import { Link } from 'react-router-dom';
import { useIncidenciasStore } from '../../store/incidenciasStore';
import { useAuthStore } from '../../store/authStore';

export default function IncidenciasNotification() {
  const { user } = useAuthStore();
  const { loadIncidencias, stats } = useIncidenciasStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    // Solo cargamos contadores si es admin, para no saturar lecturas si no hace falta
    if (isAdmin) {
        loadIncidencias();
        const interval = setInterval(loadIncidencias, 60000); // Check cada min
        return () => clearInterval(interval);
    }
  }, [isAdmin]);

  return (
    <Link to="/incidencias" className="nav-item" style={{ position: 'relative' }}>
      <AlertOctagon size={20} />
      <span>Incidencias Vía</span>
      
      {isAdmin && stats.pendientes > 0 && (
        <span style={{
          position: 'absolute', top: '5px', left: '25px',
          background: '#ef4444', color: 'white',
          fontSize: '0.65rem', fontWeight: 'bold',
          minWidth: '18px', height: '18px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #1e293b', animation: 'pulse 2s infinite'
        }}>
          {stats.pendientes}
        </span>
      )}
    </Link>
  );
}