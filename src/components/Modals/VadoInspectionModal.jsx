// Archivo: /src/components/Modals/VadoInspectionModal.jsx
// ✨ Modal para realizar inspecciones de vados con geolocalización y fotos

import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, Camera, CheckCircle, AlertTriangle, Navigation,
  Save, Loader, Image, Trash2, Clock
} from 'react-feather';
import { useVadoStore } from '../../store/vadoStore';
import { useAuthStore } from '../../store/authStore';

const styles = `
  .inspection-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    backdrop-filter: blur(10px);
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .inspection-modal {
    background: linear-gradient(145deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98));
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    width: 100%;
    max-width: 550px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .modal-title h2 {
    margin: 0;
    font-size: 1.25rem;
    color: white;
  }

  .modal-title p {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.5);
  }

  .close-btn {
    background: rgba(255,255,255,0.05);
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(239,68,68,0.2);
    color: #ef4444;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  /* Resultado de inspección */
  .result-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .result-option {
    padding: 1.25rem;
    border-radius: 12px;
    border: 2px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
  }

  .result-option:hover {
    border-color: rgba(255,255,255,0.2);
  }

  .result-option.selected.ok {
    border-color: #00ff88;
    background: rgba(0,255,136,0.1);
  }

  .result-option.selected.incidencia {
    border-color: #ef4444;
    background: rgba(239,68,68,0.1);
  }

  .result-option svg {
    margin-bottom: 8px;
  }

  .result-option.ok svg { color: #00ff88; }
  .result-option.incidencia svg { color: #ef4444; }

  .result-option span {
    display: block;
    font-weight: 600;
    color: white;
    font-size: 0.95rem;
  }

  .result-option small {
    display: block;
    color: rgba(255,255,255,0.5);
    font-size: 0.8rem;
    margin-top: 4px;
  }

  /* Form Group */
  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-label {
    display: block;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.7);
    margin-bottom: 8px;
  }

  .form-textarea {
    width: 100%;
    padding: 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: white;
    font-size: 0.9rem;
    resize: vertical;
    min-height: 100px;
  }

  .form-textarea:focus {
    outline: none;
    border-color: var(--color-accent-neon);
    box-shadow: 0 0 0 3px rgba(0,255,136,0.1);
  }

  .form-textarea::placeholder {
    color: rgba(255,255,255,0.3);
  }

  /* Tipo de incidencia */
  .incidencia-types {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 1rem;
  }

  .incidencia-type {
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent;
    color: rgba(255,255,255,0.7);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .incidencia-type:hover {
    border-color: rgba(255,255,255,0.3);
  }

  .incidencia-type.selected {
    background: rgba(239,68,68,0.2);
    border-color: #ef4444;
    color: #ef4444;
  }

  /* Geolocalización */
  .geo-section {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.25rem;
  }

  .geo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .geo-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: white;
  }

  .geo-btn {
    padding: 8px 14px;
    border-radius: 8px;
    border: none;
    background: rgba(59,130,246,0.15);
    color: #3b82f6;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .geo-btn:hover {
    background: rgba(59,130,246,0.25);
  }

  .geo-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .geo-coords {
    font-family: monospace;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.7);
    background: rgba(0,0,0,0.2);
    padding: 8px 12px;
    border-radius: 6px;
  }

  .geo-coords.success {
    color: #00ff88;
    border: 1px solid rgba(0,255,136,0.2);
  }

  .geo-error {
    color: #ef4444;
    font-size: 0.85rem;
    margin-top: 8px;
  }

  /* Fotos */
  .photos-section {
    margin-bottom: 1.25rem;
  }

  .photos-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 10px;
  }

  .photo-item {
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
    background: rgba(255,255,255,0.05);
  }

  .photo-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .photo-item .delete-photo {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(239,68,68,0.9);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-photo-btn {
    aspect-ratio: 1;
    border-radius: 10px;
    border: 2px dashed rgba(255,255,255,0.2);
    background: transparent;
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.75rem;
    transition: all 0.2s;
  }

  .add-photo-btn:hover {
    border-color: var(--color-accent-neon);
    color: var(--color-accent-neon);
  }

  /* Footer */
  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .modal-footer .button {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .spinning {
    animation: spin 1s linear infinite;
  }
`;

const INCIDENCIA_TYPES = [
  'Sin placa',
  'Placa deteriorada',
  'Dimensiones incorrectas',
  'Vado ilegal',
  'Uso indebido',
  'Obstrucción permanente',
  'Otros'
];

export default function VadoInspectionModal({ vado, onClose }) {
  const { user } = useAuthStore();
  const { addInspeccion } = useVadoStore();

  // Estado del formulario
  const [resultado, setResultado] = useState(null); // 'ok' | 'incidencia'
  const [tipoIncidencia, setTipoIncidencia] = useState([]);
  const [notas, setNotas] = useState('');
  const [coordenadas, setCoordenadas] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [saving, setSaving] = useState(false);

  // Obtener geolocalización automáticamente al abrir
  useEffect(() => {
    obtenerUbicacion();
  }, []);

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalización no soportada en este navegador');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordenadas({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setGeoLoading(false);
      },
      (error) => {
        let msg = 'Error obteniendo ubicación';
        if (error.code === 1) msg = 'Permiso de ubicación denegado';
        if (error.code === 2) msg = 'Ubicación no disponible';
        if (error.code === 3) msg = 'Tiempo de espera agotado';
        setGeoError(msg);
        setGeoLoading(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  };

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + fotos.length > 5) {
      alert('Máximo 5 fotos por inspección');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFotos(prev => [...prev, {
          id: Date.now() + Math.random(),
          file,
          preview: e.target.result
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoDelete = (photoId) => {
    setFotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleTipoIncidenciaToggle = (tipo) => {
    setTipoIncidencia(prev => 
      prev.includes(tipo) 
        ? prev.filter(t => t !== tipo)
        : [...prev, tipo]
    );
  };

  const handleSubmit = async () => {
    if (!resultado) {
      alert('Selecciona el resultado de la inspección');
      return;
    }

    if (resultado === 'incidencia' && tipoIncidencia.length === 0) {
      alert('Selecciona al menos un tipo de incidencia');
      return;
    }

    setSaving(true);

    try {
      const inspeccionData = {
        resultado,
        tipoIncidencia: resultado === 'incidencia' ? tipoIncidencia : [],
        notas: notas.trim(),
        coordenadas,
        // Las fotos se subirían por separado en una implementación completa
        fotosCount: fotos.length,
        agenteId: user?.agentId || user?.uid,
        agenteNombre: user?.name || user?.email
      };

      const result = await addInspeccion(vado.id, inspeccionData);

      if (result.success) {
        onClose();
      } else {
        alert(result.message || 'Error al guardar la inspección');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar la inspección');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inspection-overlay" onClick={onClose}>
      <style>{styles}</style>
      
      <div className="inspection-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <h2>Nueva Inspección</h2>
            <p>{vado.ubicacion?.calle} {vado.ubicacion?.numero && `Nº ${vado.ubicacion.numero}`}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Selector de Resultado */}
          <div className="result-selector">
            <div 
              className={`result-option ok ${resultado === 'ok' ? 'selected' : ''}`}
              onClick={() => setResultado('ok')}
            >
              <CheckCircle size={32} />
              <span>Conforme</span>
              <small>Todo correcto</small>
            </div>
            <div 
              className={`result-option incidencia ${resultado === 'incidencia' ? 'selected' : ''}`}
              onClick={() => setResultado('incidencia')}
            >
              <AlertTriangle size={32} />
              <span>Incidencia</span>
              <small>Se detectó problema</small>
            </div>
          </div>

          {/* Tipos de Incidencia (solo si hay incidencia) */}
          {resultado === 'incidencia' && (
            <div className="form-group">
              <label className="form-label">Tipo de Incidencia</label>
              <div className="incidencia-types">
                {INCIDENCIA_TYPES.map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    className={`incidencia-type ${tipoIncidencia.includes(tipo) ? 'selected' : ''}`}
                    onClick={() => handleTipoIncidenciaToggle(tipo)}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="form-group">
            <label className="form-label">Observaciones</label>
            <textarea
              className="form-textarea"
              placeholder="Añade notas o detalles de la inspección..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {/* Geolocalización */}
          <div className="geo-section">
            <div className="geo-header">
              <div className="geo-title">
                <Navigation size={18} />
                Ubicación GPS
              </div>
              <button 
                className="geo-btn"
                onClick={obtenerUbicacion}
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <Loader size={16} className="spinning" />
                ) : (
                  <MapPin size={16} />
                )}
                {geoLoading ? 'Obteniendo...' : 'Actualizar'}
              </button>
            </div>
            
            {coordenadas ? (
              <div className="geo-coords success">
                📍 {coordenadas.lat.toFixed(6)}, {coordenadas.lng.toFixed(6)}
                <span style={{ opacity: 0.7, marginLeft: '10px' }}>
                  (±{coordenadas.accuracy?.toFixed(0) || '?'}m)
                </span>
              </div>
            ) : (
              <div className="geo-coords">
                Sin coordenadas
              </div>
            )}
            
            {geoError && (
              <div className="geo-error">⚠️ {geoError}</div>
            )}
          </div>

          {/* Fotos */}
          <div className="photos-section">
            <label className="form-label">
              <Camera size={14} style={{ marginRight: '6px' }} />
              Fotos (opcional, máx. 5)
            </label>
            <div className="photos-grid">
              {fotos.map(foto => (
                <div key={foto.id} className="photo-item">
                  <img src={foto.preview} alt="Foto inspección" />
                  <button 
                    className="delete-photo"
                    onClick={() => handlePhotoDelete(foto.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {fotos.length < 5 && (
                <label className="add-photo-btn">
                  <Camera size={24} />
                  <span>Añadir</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoAdd}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="button button-primary" 
            onClick={handleSubmit}
            disabled={saving || !resultado}
          >
            {saving ? (
              <>
                <Loader size={18} className="spinning" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={18} />
                Guardar Inspección
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
