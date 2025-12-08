// Archivo: /src/components/Modals/VadoImportModal.jsx
// ✨ Modal para importar vados desde archivo Excel del Ayuntamiento

import React, { useState, useCallback } from 'react';
import { 
  X, Upload, FileText, CheckCircle, AlertTriangle, 
  RefreshCw, Download, Info, AlertCircle
} from 'react-feather';
import { useVadoStore } from '../../store/vadoStore';

const styles = `
  .import-overlay {
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

  .import-modal {
    background: linear-gradient(145deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98));
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    width: 100%;
    max-width: 500px;
    overflow: hidden;
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
    align-items: center;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: white;
    display: flex;
    align-items: center;
    gap: 10px;
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
  }

  /* Dropzone */
  .dropzone {
    border: 2px dashed rgba(255,255,255,0.2);
    border-radius: 12px;
    padding: 2.5rem 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: rgba(255,255,255,0.02);
  }

  .dropzone:hover, .dropzone.active {
    border-color: var(--color-accent-neon);
    background: rgba(0,255,136,0.05);
  }

  .dropzone-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 1rem;
    background: rgba(0,255,136,0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-neon);
  }

  .dropzone h3 {
    color: white;
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
  }

  .dropzone p {
    color: rgba(255,255,255,0.5);
    margin: 0;
    font-size: 0.85rem;
  }

  .dropzone input {
    display: none;
  }

  /* File Selected */
  .file-selected {
    background: rgba(0,255,136,0.1);
    border: 1px solid rgba(0,255,136,0.2);
    border-radius: 10px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 1rem;
  }

  .file-icon {
    width: 44px;
    height: 44px;
    background: rgba(0,255,136,0.15);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-neon);
  }

  .file-info {
    flex: 1;
  }

  .file-name {
    color: white;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .file-size {
    color: rgba(255,255,255,0.5);
    font-size: 0.8rem;
  }

  .file-remove {
    background: rgba(239,68,68,0.15);
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    color: #ef4444;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Import Mode */
  .import-mode {
    margin: 1.25rem 0;
  }

  .import-mode-label {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.7);
    margin-bottom: 10px;
    display: block;
  }

  .mode-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .mode-option {
    padding: 1rem;
    border-radius: 10px;
    border: 2px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .mode-option:hover {
    border-color: rgba(255,255,255,0.2);
  }

  .mode-option.selected {
    border-color: var(--color-accent-neon);
    background: rgba(0,255,136,0.1);
  }

  .mode-option h4 {
    color: white;
    margin: 0 0 4px;
    font-size: 0.9rem;
  }

  .mode-option p {
    color: rgba(255,255,255,0.5);
    margin: 0;
    font-size: 0.75rem;
  }

  /* Info Box */
  .info-box {
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.2);
    border-radius: 10px;
    padding: 1rem;
    display: flex;
    gap: 10px;
    margin-top: 1rem;
  }

  .info-box svg {
    color: #3b82f6;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .info-box p {
    color: rgba(255,255,255,0.7);
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  /* Warning Box */
  .warning-box {
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 10px;
    padding: 1rem;
    display: flex;
    gap: 10px;
    margin-top: 1rem;
  }

  .warning-box svg {
    color: #fbbf24;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .warning-box p {
    color: rgba(255,255,255,0.7);
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  /* Results */
  .import-results {
    margin-top: 1.5rem;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .result-item:last-child {
    border-bottom: none;
  }

  .result-item.success svg { color: #00ff88; }
  .result-item.warning svg { color: #fbbf24; }
  .result-item.error svg { color: #ef4444; }

  .result-item span {
    color: rgba(255,255,255,0.8);
    font-size: 0.9rem;
  }

  .result-item strong {
    color: white;
  }

  /* Footer */
  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .spinning {
    animation: spin 1s linear infinite;
  }
`;

export default function VadoImportModal({ onClose }) {
  const { importFromExcel, importing } = useVadoStore();
  
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('merge'); // 'merge' | 'replace'
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ];
    const validExtensions = ['.xls', '.xlsx'];
    
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      setError('Solo se permiten archivos Excel (.xls o .xlsx)');
      return;
    }
    
    setFile(file);
    setError(null);
    setResults(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResults(null);
    setError(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleImport = async () => {
    if (!file) return;
    
    setError(null);
    
    try {
      const result = await importFromExcel(file, mode);
      
      if (result.success) {
        setResults(result);
      } else {
        setError(result.message || 'Error al importar');
      }
    } catch (err) {
      setError(err.message || 'Error al importar');
    }
  };

  return (
    <div className="import-overlay" onClick={onClose}>
      <style>{styles}</style>
      
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>
            <Upload size={22} />
            Importar Vados
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {!results ? (
            <>
              {/* Dropzone o archivo seleccionado */}
              {!file ? (
                <div 
                  className={`dropzone ${dragActive ? 'active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <div className="dropzone-icon">
                    <FileText size={28} />
                  </div>
                  <h3>Arrastra el archivo Excel aquí</h3>
                  <p>o haz clic para seleccionar</p>
                  <p style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                    Formatos: .xls, .xlsx
                  </p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="file-selected">
                  <div className="file-icon">
                    <FileText size={22} />
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{formatFileSize(file.size)}</div>
                  </div>
                  <button className="file-remove" onClick={handleRemoveFile}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {error && (
                <div className="warning-box" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={18} style={{ color: '#ef4444' }} />
                  <p>{error}</p>
                </div>
              )}

              {/* Modo de importación */}
              {file && (
                <div className="import-mode">
                  <label className="import-mode-label">Modo de importación</label>
                  <div className="mode-options">
                    <div 
                      className={`mode-option ${mode === 'merge' ? 'selected' : ''}`}
                      onClick={() => setMode('merge')}
                    >
                      <h4>Fusionar</h4>
                      <p>Añade nuevos y actualiza existentes</p>
                    </div>
                    <div 
                      className={`mode-option ${mode === 'replace' ? 'selected' : ''}`}
                      onClick={() => setMode('replace')}
                    >
                      <h4>Reemplazar</h4>
                      <p>Elimina todo y carga desde cero</p>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'replace' && file && (
                <div className="warning-box">
                  <AlertTriangle size={18} />
                  <p>
                    <strong>Atención:</strong> Esta acción eliminará todos los vados existentes 
                    y sus inspecciones. Esta acción no se puede deshacer.
                  </p>
                </div>
              )}

              <div className="info-box">
                <Info size={18} />
                <p>
                  El archivo debe ser el formato estándar del Ayuntamiento con las columnas: 
                  Documento, Sujeto Pasivo, Referencia Expediente, Objeto Tributario, etc.
                </p>
              </div>
            </>
          ) : (
            /* Resultados de la importación */
            <div className="import-results">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 1rem',
                  background: 'rgba(0,255,136,0.15)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle size={32} color="#00ff88" />
                </div>
                <h3 style={{ color: 'white', margin: '0 0 0.5rem' }}>Importación Completada</h3>
              </div>

              <div className="result-item success">
                <CheckCircle size={18} />
                <span><strong>{results.imported || 0}</strong> vados importados</span>
              </div>
              
              <div className="result-item warning">
                <RefreshCw size={18} />
                <span><strong>{results.updated || 0}</strong> vados actualizados</span>
              </div>
              
              {results.errors > 0 && (
                <div className="result-item error">
                  <AlertTriangle size={18} />
                  <span><strong>{results.errors}</strong> errores</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {!results ? (
            <>
              <button className="button button-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button 
                className="button button-primary" 
                onClick={handleImport}
                disabled={!file || importing}
              >
                {importing ? (
                  <>
                    <RefreshCw size={18} className="spinning" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Importar
                  </>
                )}
              </button>
            </>
          ) : (
            <button className="button button-primary" onClick={onClose}>
              <CheckCircle size={18} />
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
