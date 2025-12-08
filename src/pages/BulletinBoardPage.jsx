import React, { useEffect, useState } from 'react';
import { useBulletinStore } from '../store/bulletinStore';
import { useAuthStore } from '../store/authStore';
import { 
  Bell, MapPin, FileText, Users, AlertTriangle, 
  Star, // 💡 CAMBIO: Usamos Star en lugar de Pin
  Plus, Trash2, Calendar, Filter, X 
} from 'react-feather';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// --- CONFIGURACIÓN DE ESTILOS Y CATEGORÍAS ---
const CATEGORIES = {
  trafico: { 
    label: 'Tráfico y Cortes', 
    icon: MapPin, 
    color: '#f59e0b', // Amber
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.3)'
  },
  legislacion: { 
    label: 'Legislación', 
    icon: FileText, 
    color: '#3b82f6', // Blue
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.3)'
  },
  reunion: { 
    label: 'Reuniones', 
    icon: Users, 
    color: '#10b981', // Emerald
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  urgente: { 
    label: 'URGENTE', 
    icon: AlertTriangle, 
    color: '#ef4444', // Red
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)'
  },
  general: { 
    label: 'General', 
    icon: Bell, 
    color: '#94a3b8', // Slate
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.3)'
  }
};

export default function BulletinBoardPage() {
  const { 
    announcements, 
    fetchAnnouncements, 
    markAsViewed, 
    deleteAnnouncement, 
    loading, 
    filter, 
    setFilter 
  } = useBulletinStore();
  
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    markAsViewed(); 
    return () => markAsViewed();
  }, [fetchAnnouncements, markAsViewed]);

  // Lógica de ordenación: Fijados primero, luego fecha
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return a.isPinned ? -1 : 1;
  }).filter(a => filter === 'all' || a.category === filter);

  return (
    <div className="view-container fade-in" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #fff, #a0aec0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tablón de Anuncios
          </h1>
         <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '5px 0 0', fontSize: '1rem' }}>
                        Novedades, cortes de calle y avisos oficiales
                    </p>
        </div>
        
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-gradient-primary ripple-effect"
            style={{ padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 10, border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={20} /> Nuevo Aviso
          </button>
        )}
      </div>

      {/* FILTROS (Chips) */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
            background: filter === 'all' ? 'white' : 'rgba(255,255,255,0.05)',
            color: filter === 'all' ? 'black' : 'white', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
          }}
        >
          Todos
        </button>
        {Object.entries(CATEGORIES).map(([key, config]) => (
          <button 
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '8px 16px', borderRadius: '20px', 
              border: `1px solid ${filter === key ? config.color : 'rgba(255,255,255,0.1)'}`,
              background: filter === key ? config.bg : 'rgba(255,255,255,0.05)',
              color: filter === key ? config.color : 'rgba(255,255,255,0.6)', 
              cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
            }}
          >
            <config.icon size={14} /> {config.label}
          </button>
        ))}
      </div>

      {/* GRID DE ANUNCIOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {sortedAnnouncements.map(announcement => {
          const theme = CATEGORIES[announcement.category] || CATEGORIES.general;
          const isPinned = announcement.isPinned;

          return (
            <div key={announcement.id} className="card-hover-effect" style={{
              background: 'rgba(30, 41, 59, 0.7)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isPinned ? theme.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
              position: 'relative',
              boxShadow: isPinned ? `0 0 20px ${theme.color}20` : 'none'
            }}>
              {/* Cabecera Tarjeta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ 
                    padding: 10, borderRadius: 10, 
                    background: theme.bg, color: theme.color 
                  }}>
                    <theme.icon size={20} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: theme.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {theme.label}
                    </span>
                    
                    {/* 💡 CAMBIO: Etiqueta FIJADO con Estrella */}
                    {isPinned && (
                      <span style={{ 
                        marginLeft: 8, 
                        fontSize: '0.7rem', 
                        background: 'white', 
                        color: 'black', 
                        padding: '2px 6px', 
                        borderRadius: 4, 
                        fontWeight: 800, 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px' 
                      }}>
                        <Star size={10} fill="black"/> FIJADO
                      </span>
                    )}
                  </div>
                </div>
                {(user?.role === 'admin' || user?.role === 'supervisor') && (
                  <button 
                    onClick={() => deleteAnnouncement(announcement.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6 }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Contenido */}
              <div>
                <h3 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: '1.25rem', lineHeight: 1.3 }}>
                  {announcement.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {announcement.content}
                </p>
              </div>

              {/* Footer Tarjeta */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} />
                  {announcement.createdAt && formatDistanceToNow(new Date(announcement.createdAt), { locale: es, addSuffix: true })}
                </div>
                <div>
                  Por: <span style={{ color: '#cbd5e1' }}>{announcement.authorName || 'Admin'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CREACIÓN */}
      {isModalOpen && (
        <CreateAnnouncementModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

// --- SUBCOMPONENTE MODAL ---
function CreateAnnouncementModal({ onClose }) {
  const { addAnnouncement } = useBulletinStore();
  const [form, setForm] = useState({ title: '', content: '', category: 'general', isPinned: false });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await addAnnouncement(form);
    setSubmitting(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
        padding: '2rem', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: 'white', marginTop: 0 }}>Nuevo Aviso</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <input 
            type="text" placeholder="Título del aviso" required
            value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
          />
          
          <select 
            value={form.category} onChange={e => setForm({...form, category: e.target.value})}
            style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
          >
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <textarea 
            placeholder="Escribe el contenido aquí..." required rows={5}
            value={form.content} onChange={e => setForm({...form, content: e.target.value})}
            style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', resize: 'vertical' }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isPinned} onChange={e => setForm({...form, isPinned: e.target.checked})} />
            Fijar en la parte superior (Importante)
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={submitting} style={{ flex: 1, padding: '12px', background: '#34d399', border: 'none', color: '#064e3b', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
              {submitting ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}