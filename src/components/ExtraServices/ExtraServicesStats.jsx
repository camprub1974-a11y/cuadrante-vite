// Archivo: /src/components/ExtraServices/ExtraServicesStats.jsx

import React from 'react';
import { useExtraServicesStore } from '../../store/extraServicesStore';
import { DollarSign, Clock, Briefcase, BarChart2, Sun, Moon, Umbrella, Star } from 'react-feather';

// 1. CONFIGURACIÓN DE ICONOS
const TYPE_ICONS = {
    'diurno': Sun,
    'nocturno': Moon,
    'festivo': Umbrella,
    'festivo_nocturno': Star
};

// 2. 💡 CONFIGURACIÓN DE COLORES (Idéntica a la Tabla)
const TYPE_CONFIG = {
  'diurno': { 
      label: 'Diurno', 
      color: '#3b82f6', // Azul Primario (var(--color-primary))
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.3)'
  },
  'nocturno': { 
      label: 'Nocturno', 
      color: '#818cf8', 
      bg: 'rgba(129, 140, 248, 0.15)',
      border: 'rgba(129, 140, 248, 0.3)'
  },
  'festivo': { 
      label: 'Festivo', 
      color: '#fbbf24', 
      bg: 'rgba(251, 191, 36, 0.15)',
      border: 'rgba(251, 191, 36, 0.3)'
  },
  'festivo_nocturno': { 
      label: 'Festivo Nocturno', 
      color: '#f472b6', 
      bg: 'rgba(244, 114, 182, 0.15)',
      border: 'rgba(244, 114, 182, 0.3)'
  }
};

export default function ExtraServicesStats() {
  const { stats } = useExtraServicesStore();

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div style={{ marginBottom: '2rem' }}>
        
        {/* CABECERA */}
        <div className="view-header" style={{ paddingBottom: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={20} style={{ color: 'var(--color-accent-neon, #00ff88)' }} />
            <h4 style={{ fontSize: '1.1rem', color: 'white', margin: 0, fontWeight: '600', textTransform: 'uppercase' }}>
                Resumen Económico
            </h4>
        </div>

        {/* GRID PRINCIPAL (Totales) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            
            {/* 1. TOTAL IMPORTE */}
            <div className="stat-card-pro" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))', border: '1px solid #34d399' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#6ee7b7', fontWeight: 'bold' }}>Total a Percibir</span>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399', lineHeight: 1.2 }}>
                            {formatCurrency(stats.totalImporte)}
                        </div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '50%' }}>
                        <DollarSign size={24} color="#34d399" />
                    </div>
                </div>
            </div>

            {/* 2. TOTAL HORAS */}
            <div className="stat-card-pro" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>Total Horas</span>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'white', lineHeight: 1.2 }}>
                            {stats.totalHoras}h
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%' }}>
                        <Clock size={24} color="white" />
                    </div>
                </div>
            </div>

            {/* 3. SERVICIOS */}
            <div className="stat-card-pro" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>Nº Servicios</span>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'white', lineHeight: 1.2 }}>
                            {stats.totalServicios}
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%' }}>
                        <Briefcase size={24} color="white" />
                    </div>
                </div>
            </div>
        </div>

        {/* DESGLOSE POR TIPOS (Coloreado según tipo) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.8rem', marginTop: '1rem' }}>
            {Object.entries(stats.byType).map(([type, data]) => {
                const Icon = TYPE_ICONS[type] || Briefcase;
                // 💡 Aplicamos estilos específicos si existen, si no, un gris por defecto
                const style = TYPE_CONFIG[type] || { color: '#9ca3af', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' };
                
                return (
                    <div key={type} style={{ 
                        background: style.bg, 
                        border: `1px solid ${style.border}`, 
                        borderRadius: '10px', 
                        padding: '0.8rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            background: style.color, // Fondo sólido para el icono pequeño
                            borderRadius: '50%',
                            width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', // Icono blanco sobre fondo de color
                            boxShadow: `0 0 10px ${style.color}66`
                        }}>
                            <Icon size={16} />
                        </div>
                        
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize', marginBottom: '2px' }}>
                                {style.label || type.replace('_', ' ')}
                            </div>
                            <div style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>
                                {formatCurrency(data.amount)}
                            </div>
                            {/* Opcional: Mostrar horas pequeñas debajo */}
                            {/* <div style={{ fontSize: '0.65rem', color: style.color }}>{data.hours}h</div> */}
                        </div>
                    </div>
                );
            })}
        </div>

        <style>{`
            .stat-card-pro {
                border-radius: 12px;
                padding: 1.25rem;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                transition: transform 0.2s;
            }
            .stat-card-pro:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 15px rgba(0,0,0,0.2);
            }
        `}</style>
    </div>
  );
}