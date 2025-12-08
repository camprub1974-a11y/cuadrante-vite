// Archivo: src/components/TemplateModal.jsx (NUEVO/ACTUALIZADO)

import React, { useState, useEffect } from 'react';
import { getTemplatesByType, getDocumentTemplateById } from '../../js/dataController';
import { functions } from '../../js/firebase-config';
import { httpsCallable } from 'firebase/functions';
import { X, FileText, Loader, Check, ArrowLeft } from 'react-feather';

export default function TemplateModal({ isOpen, onClose, type, onTemplateSelected }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('list'); // 'list' | 'form'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [generating, setGenerating] = useState(false);

  // Cargar lista al abrir
  useEffect(() => {
    if (isOpen && type) {
      setStep('list');
      setLoading(true);
      getTemplatesByType(null, 'salida').then(allTemplates => {
        // Filtrar por tipo (portada/acta)
        const filtered = allTemplates.filter(t => 
            t.documentType?.toLowerCase() === type.toLowerCase()
        );
        setTemplates(filtered);
        setLoading(false);
      });
    }
  }, [isOpen, type]);

  // Manejar selección de plantilla -> Ir al formulario
  const handleSelect = async (templateSummary) => {
    setLoading(true);
    try {
      // Traer la plantilla completa (con schema)
      const fullTemplate = await getDocumentTemplateById(templateSummary.id);
      setSelectedTemplate(fullTemplate);
      
      // Inicializar form vacío
      const initialData = {};
      if (fullTemplate.schema) {
          Object.keys(fullTemplate.schema).forEach(k => initialData[k] = '');
      }
      setFormData(initialData);
      setStep('form');
    } catch (error) {
      alert("Error cargando la plantilla");
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Generar PDF y cerrar
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const generarFn = httpsCallable(functions, 'generarPdfDesdePlantilla');
      const result = await generarFn({
        templateId: selectedTemplate.id,
        templateData: formData // 👈 AQUÍ PASAMOS LOS DATOS RELLENADOS
      });
      
      if (result.data.success) {
        onTemplateSelected({
            name: selectedTemplate.templateName,
            type: selectedTemplate.documentType,
            pdfUrl: result.data.pdfUrl
        });
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Error al generar el PDF: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{zIndex: 1000}}>
      <div className="modal-content" style={{maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
        
        {/* Header */}
        <div className="modal-header">
          <h3>
            {step === 'form' ? `Rellenar: ${selectedTemplate.templateName}` : `Añadir ${type}`}
          </h3>
          <button onClick={onClose} className="icon-button close-button"><X /></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{overflowY: 'auto', padding: '1.5rem'}}>
          {loading ? (
             <div className="loading-spinner"></div>
          ) : step === 'list' ? (
             // --- VISTA LISTA ---
             <div className="template-list" style={{display: 'grid', gap: '10px'}}>
                {templates.length === 0 && <p>No hay plantillas disponibles.</p>}
                {templates.map(t => (
                  <div key={t.id} className="card" onClick={() => handleSelect(t)} style={{cursor: 'pointer', padding: '1rem', border: '1px solid var(--glass-dark-border)'}}>
                     <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <FileText className="text-accent" />
                        <div>
                            <strong>{t.templateName}</strong>
                            <br/><small>{t.description}</small>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          ) : (
             // --- VISTA FORMULARIO ---
             <div className="dynamic-form">
                {selectedTemplate.schema && Object.entries(selectedTemplate.schema).map(([key, def]) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{def.label || key}</label>
                    {def.type === 'textarea' ? (
                      <textarea className="input" name={key} rows="3" value={formData[key]} onChange={handleChange} />
                    ) : (
                      <input className="input" type={def.type || 'text'} name={key} value={formData[key]} onChange={handleChange} />
                    )}
                  </div>
                ))}
                {(!selectedTemplate.schema || Object.keys(selectedTemplate.schema).length === 0) && (
                    <p>Esta plantilla no requiere datos adicionales.</p>
                )}
             </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
            <div className="modal-footer" style={{justifyContent: 'space-between'}}>
                <button className="button button-secondary" onClick={() => setStep('list')} disabled={generating}>
                    <ArrowLeft size={16} /> Volver
                </button>
                <button className="button button-success" onClick={handleGenerate} disabled={generating}>
                    {generating ? 'Generando...' : 'Generar y Adjuntar'} <Check size={16} />
                </button>
            </div>
        )}
      </div>
    </div>
  );
}