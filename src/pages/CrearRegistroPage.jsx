// Archivo: /src/pages/CrearRegistroPage.jsx
// VERSIÓN CON DINAMIC FIELD MEJORADO Y SINCRONIZACIÓN DE SCROLL

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGlobalStore } from '../store/globalStore';
import {
  getTemplatesByType,
  getDocumentTemplateById,
  createRegistro,
  getRegistroById,
  updateRegistro,
  uploadRecordImage,
  resolveTaskWithComment
} from '../../js/dataController';
import { functions } from '../../js/firebase-config';
import { httpsCallable } from 'firebase/functions';

import Handlebars from 'handlebars';

import {
  FilePlus, X, ChevronLeft, ChevronRight, Trash2, Plus,
  Inbox, FileText, Shield, AlertCircle, Info, Check
} from 'react-feather';

import { displayMessage, showLoading, hideLoading } from '../../js/ui/viewManager.js';

// 💡 IMPORTAR EL COMPONENTE FILEUPLOADER (Necesario para campos de imagen/archivo)
import FileUploader from '../components/UI/FileUploader';

import '../../css/views/_registro-view.css';

// ========================================================
// === HELPERS DE HANDLEBARS ===
// ========================================================

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

Handlebars.registerHelper('neq', function (a, b) {
  return a !== b;
});

Handlebars.registerHelper('gt', function (a, b) {
  return a > b;
});

Handlebars.registerHelper('lt', function (a, b) {
  return a < b;
});

Handlebars.registerHelper('gte', function (a, b) {
  return a >= b;
});

Handlebars.registerHelper('lte', function (a, b) {
  return a <= b;
});

// =================================================================
// 1. CONFIGURACIÓN DE CAMPOS PARA REGISTROS DE ENTRADA
// =================================================================
const COMMON_ENTRY_FIELDS = [
  { id: 'asunto', label: 'Asunto / Resumen', type: 'textarea', rows: 2, optional: false },
  { id: 'remitente', label: 'Remitente (Persona/Entidad)', type: 'text', optional: false },
  { id: 'fecha_entrada_fisica', label: 'Fecha de Entrada (Sello)', type: 'date', optional: false },
  { id: 'numero_registro_origen', label: 'Nº Registro de Origen (Si tiene)', type: 'text', optional: true },
  // 💡 Campo de documento adjunto que usará FileUploader
  { id: 'documento_adjunto', label: 'Documento Escaneado (PDF/Imagen)', type: 'image', optional: true }
];

const ENTRY_DOC_SCHEMAS = {
  oficio_judicial: [
    { id: 'organo_judicial', label: 'Órgano Judicial / Juzgado', type: 'text', optional: false },
    { id: 'tipo_procedimiento', label: 'Tipo de Procedimiento', type: 'select', options: ['Diligencias Previas', 'Procedimiento Abreviado', 'Juicio Rápido', 'Ejecutoria', 'Exhorto', 'Otros'], optional: false },
    { id: 'numero_autos', label: 'Nº de Autos / Expediente', type: 'text', optional: false },
    { id: 'fecha_limite', label: 'Fecha Límite / Citación', type: 'date', optional: true },
    { id: 'requiere_informe', label: '¿Requiere Informe?', type: 'checkbox', optional: true }
  ],
  req_administracion: [
    { id: 'organismo', label: 'Organismo Solicitante', type: 'text', optional: false, placeholder: 'Ej: DGT, Diputación, Otro Ayto' },
    { id: 'departamento', label: 'Departamento', type: 'text', optional: true },
    { id: 'referencia_expediente', label: 'Ref. Expediente Externo', type: 'text', optional: true },
    { id: 'plazo_dias', label: 'Plazo de contestación (días)', type: 'number', optional: true }
  ],
  sol_aseguradora: [
    { id: 'compania', label: 'Compañía Aseguradora', type: 'text', optional: false },
    { id: 'referencia_siniestro', label: 'Referencia del Siniestro', type: 'text', optional: false },
    { id: 'fecha_siniestro', label: 'Fecha del Siniestro', type: 'date', optional: true },
    { id: 'solicita_atestado', label: '¿Solicita Atestado Completo?', type: 'checkbox', optional: true }
  ],
  instancia_general: [
    { id: 'dni_solicitante', label: 'DNI/NIE Solicitante', type: 'text', optional: true },
    { id: 'telefono_contacto', label: 'Teléfono de Contacto', type: 'tel', optional: true },
    { id: 'motivo_solicitud', label: 'Motivo', type: 'select', options: ['Vado', 'Corte de Calle', 'Ocupación Vía Pública', 'Alegaciones', 'Otros'], optional: false }
  ],
  comunicacion_interna: [
    { id: 'area_remitente', label: 'Área/Concejalía', type: 'text', optional: false },
    { id: 'prioridad', label: 'Prioridad', type: 'select', options: ['Baja', 'Normal', 'Alta', 'Urgente'], optional: false }
  ]
};

// =================================================================
// --- Funciones Auxiliares ---
// =================================================================
const getFormDefinition = (template) => {
  if (!template) return [];
  if (template.fields && Array.isArray(template.fields) && template.fields.length > 0) return template.fields;
  if (template.schema) {
    const fieldsArray = [];
    const fieldKeys = (template.fieldOrder && Array.isArray(template.fieldOrder))
      ? template.fieldOrder.flatMap(group => group.fields || [])
      : Object.keys(template.schema);
    for (const fieldId of fieldKeys) {
      if (template.schema[fieldId]) {
        fieldsArray.push({ id: fieldId, ...template.schema[fieldId] });
      }
    }
    return fieldsArray;
  }
  return [];
};

function unescapeHtml(safe) {
  if (!safe) return '';
  return safe
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/'/g, "'");
}

// =================================================================
// --- Componente DynamicField (INTEGRANDO FileUploader) ---
// =================================================================
const DynamicField = React.memo(({ fieldDef, value, onChange, previewUrl, agents, index = 0, repeaterId = null, onFieldFocus }) => {
  const uniqueId = `field-${repeaterId || fieldDef.id}-${index}-${fieldDef.id}`;
  const inputName = repeaterId ? `${repeaterId}[${index}][${fieldDef.id}]` : fieldDef.id;
  const isRequired = fieldDef.optional === false;

  // Handler para focus que activa la sincronización
  const handleFocus = () => {
    if (onFieldFocus) {
      onFieldFocus(fieldDef.id);
    }
  };

  let FieldComponent;
  let props = {
    id: uniqueId,
    name: inputName,
    onChange: onChange,
    onFocus: handleFocus, 
    className: fieldDef.type === 'select' ? 'selector' : (fieldDef.type === 'textarea' ? 'input' : 'input'),
    required: isRequired,
    disabled: fieldDef.readOnly,
    placeholder: fieldDef.placeholder || ''
  };

  if (fieldDef.type === 'checkbox') {
    props.checked = !!value;
  } else if (fieldDef.type === 'multiselect') {
    props.value = Array.isArray(value) ? value : [];
  } else if (fieldDef.type !== 'file' && fieldDef.type !== 'image') {
    props.value = value || '';
  }

  switch (fieldDef.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'date':
    case 'time':
    case 'number':
      FieldComponent = 'input';
      props.type = fieldDef.type || 'text';
      break;
    case 'textarea':
      FieldComponent = 'textarea';
      props.rows = fieldDef.rows || 3;
      break;
    case 'select':
      FieldComponent = 'select';
      props.children = [
        <option key="default" value="">-- Selecciona --</option>,
        ...(fieldDef.options || []).map(opt => {
          const optValue = (typeof opt === 'object' && opt.value !== undefined) ? opt.value : opt;
          const optText = (typeof opt === 'object' && opt.text !== undefined) ? opt.text : opt;
          return <option key={optValue} value={optValue}>{optText}</option>;
        })
      ];
      break;
    case 'multiselect':
      FieldComponent = 'select';
      props.multiple = true;
      props.className = 'multiselect-listbox';
      props.children = (agents || []).map(agent => (
        <option key={agent.id} value={agent.id}>
          {agent.name || agent.id}
        </option>
      ));
      break;
    case 'checkbox':
      return (
        <div className={`form-group-checkbox ${isRequired ? 'required' : ''}`}>
          <input type="checkbox" {...props} />
          <label className="form-label" htmlFor={uniqueId}>
            {fieldDef.label || fieldDef.id}
            {isRequired && <span className="required-indicator">*</span>}
          </label>
        </div>
      );
    case 'image':
    case 'file': // 💡 Soporte para tipo 'file'
      const isSignature = fieldDef.id.includes('firma');

      if (isSignature) {
        return (
          <div className="form-group">
            <p className="form-hint">Implementación de firma pendiente en React.</p>
            <input type="hidden" name={inputName} value={value || ''} />
          </div>
        );
      } 
      
      // 💡 INTEGRACIÓN DE FILEUPLOADER
      return (
        <div className={`form-group ${isRequired ? 'required' : ''}`}>
          {fieldDef.label && (
            <label className="form-label" htmlFor={uniqueId}>
              {fieldDef.label}
              {isRequired && <span className="required-indicator">*</span>}
            </label>
          )}
          
          <FileUploader
            onFileSelect={(file) => {
              // Simula el evento e.target para que handleFormChange funcione
              onChange({
                target: { 
                  name: inputName, 
                  type: 'file', 
                  files: [file], // Pasamos el archivo como un array para simular files[0]
                  value: ''
                }
              });
              handleFocus(); // Activar el focus para sincronización
            }}
            onRemove={() => {
              // Simula el evento e.target con un archivo nulo
              onChange({
                target: { 
                  name: inputName, 
                  type: 'file', 
                  files: [], 
                  value: ''
                }
              });
            }}
            currentFile={value} // El valor puede ser un objeto File o una URL string
            label={fieldDef.placeholder || `Arrastra tu ${fieldDef.label} aquí`}
            accept={fieldDef.type === 'image' ? 'image/*,application/pdf' : '.pdf,.doc,.docx,.jpg,.png'}
          />

        </div>
      );
    case 'repeater':
      return <p className="form-hint">[Campo Repetidor - Pendiente]</p>;
    default:
      return (
        <div className="form-group">
          <p className="form-hint">Tipo de campo **{fieldDef.type}** no soportado.</p>
        </div>
      );
  }

  return (
    <div className={`form-group ${isRequired ? 'required' : ''}`}>
      {fieldDef.type !== 'checkbox' && fieldDef.label && (
        <label className="form-label" htmlFor={uniqueId}>
          {fieldDef.label}
          {isRequired && <span className="required-indicator">*</span>}
        </label>
      )}
      <FieldComponent {...props} />
    </div>
  );
});

// =================================================================
// --- COMPONENTE PRINCIPAL: CrearRegistroPage ---
// =================================================================
function CrearRegistroPage() {
  const navigate = useNavigate();
  const { id: editingRecordId } = useParams();
  const location = useLocation();
  
  // 💡 CAMBIO 1: Desestructuramos para obtener linkedTaskId e initialDescription
  const { parentId, linkedTaskId, initialDescription } = location.state || {};
  
  const direction = location.pathname.includes('crear-entrada') ? 'entrada' : 'salida';
  const user = useAuthStore(state => state.user);
  const agents = useGlobalStore(state => state.agents);

  // --- Estado del Componente ---
  const [currentStep, setCurrentStep] = useState(1);
  const [currentSubStep, setCurrentSubStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Estado de Datos ---
  const [documentType, setDocumentType] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templatesCache, setTemplatesCache] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [fieldOrderGroups, setFieldOrderGroups] = useState([]);
  const [allFields, setAllFields] = useState([]);
  // 💡 Mantemos localPreviewUrls si se requiere la URL temporal en otros sitios.
  const [localPreviewUrls, setLocalPreviewUrls] = useState({}); 

  // 💡 ELIMINADO: manualFile ya no es necesario

  // Referencias y estado para sincronización de scroll
  const previewIframeRef = useRef(null);
  const [activeFieldId, setActiveFieldId] = useState(null);

  const totalSubSteps = useMemo(() => fieldOrderGroups.length > 0 ? fieldOrderGroups.length : 1, [fieldOrderGroups]);

  // 💡 CAMBIO 2: Si venimos de una tarea, pre-llenar el asunto
  useEffect(() => {
    if (initialDescription && !editingRecordId) {
      setFormData(prev => ({
        ...prev,
        asunto: prev.asunto || initialDescription // Solo si está vacío
      }));
    }
  }, [initialDescription, editingRecordId]);

  // 1. Cargar caché de plantillas (Solo para SALIDA)
  useEffect(() => {
    if (direction === 'salida') {
        const loadCache = async () => {
        try {
            const templates = await getTemplatesByType(null, 'salida');
            setTemplatesCache(templates);
        } catch (err) {
            console.warn("Error loading templates cache", err);
        }
        };
        loadCache();
    }
  }, [direction]);

  // 2. Cargar Plantilla (Solo para SALIDA)
  useEffect(() => {
    if (direction === 'salida' && templateId) {
      const fetchTemplate = async () => {
        setLoading(true);
        try {
          const template = await getDocumentTemplateById(templateId);
          setCurrentTemplate(template);
          const fields = getFormDefinition(template);
          setAllFields(fields);
          let groups = template.fieldOrder || [];
          if (groups.length === 0 && fields.length > 0) {
            groups = [{ groupName: "Detalles", fields: fields.map(f => f.id) }];
          }
          setFieldOrderGroups(groups);
          setCurrentSubStep(1);
        } catch (error) {
          displayMessage('Error al cargar la plantilla.', 'error');
        } finally {
          setLoading(false);
        }
      };
      fetchTemplate();
    } else if (direction === 'salida') {
      setCurrentTemplate(null);
      setAllFields([]);
      setFieldOrderGroups([]);
    }
  }, [templateId, direction]);

  // 3. Configurar Campos para ENTRADA
  useEffect(() => {
    if (direction === 'entrada' && documentType) {
        const specificFields = ENTRY_DOC_SCHEMAS[documentType] || [];
        const combinedFields = [...COMMON_ENTRY_FIELDS, ...specificFields];

        setAllFields(combinedFields);
        setFieldOrderGroups([{ groupName: "Datos del Registro", fields: combinedFields.map(f => f.id) }]);
        setCurrentSubStep(1);

        setFormData(prev => {
          if (!prev.fecha_entrada_fisica || editingRecordId) {
            return { ...prev, fecha_entrada_fisica: new Date().toISOString().split('T')[0] };
          }
          return prev;
        });

    } else if (direction === 'entrada') {
      setAllFields([]);
      setFieldOrderGroups([]);
    }
  }, [documentType, direction, editingRecordId]);

  // 4. Cargar Edición
  useEffect(() => {
    if (editingRecordId) {
      setLoading(true);
      const loadRecord = async () => {
        try {
          const recordData = await getRegistroById(editingRecordId);
          setDocumentType(recordData.documentType);
          setFormData(recordData.details || {});

          const recordDirection = recordData.direction === 'entrada' ? 'entrada' : 'salida';

          if (recordDirection === 'salida') {
             setTemplateId(recordData.templateUsed || '');
             if(recordData.templateUsed) setCurrentStep(3);
          } else {
             setCurrentStep(3);
          }
        } catch (err) {
          displayMessage('Error al cargar.', 'error');
          navigate('/registros');
        } finally {
          setLoading(false);
        }
      };
      loadRecord();
    }
  }, [editingRecordId, navigate]);

  // 5. Limpieza de URLs
  useEffect(() => {
    return () => {
      Object.values(localPreviewUrls).forEach(url => { if (url) URL.revokeObjectURL(url); });
    };
  }, [localPreviewUrls]);

  const filteredTemplates = useMemo(() => {
    if (direction === 'entrada') return [];
    return templatesCache.filter(t => t.documentType?.toLowerCase() === documentType.toLowerCase());
  }, [templatesCache, documentType, direction]);

  // Salto automático de pasos
  useEffect(() => {
    if (direction === 'entrada' && currentStep === 1 && documentType && !editingRecordId) {
        setCurrentStep(3);
    }
    else if (direction === 'salida' && currentStep === 2 && !editingRecordId && (documentType && filteredTemplates.length === 0)) {
      setCurrentStep(3);
    }
  }, [currentStep, editingRecordId, direction, documentType, filteredTemplates.length]);

  // --- Lógica de Preview (Solo Salida) ---
  const compiledTemplate = useMemo(() => {
    if (direction === 'entrada' || !currentTemplate?.content) return null;
    try { return Handlebars.compile(unescapeHtml(currentTemplate.content)); } catch (e) { return null; }
  }, [currentTemplate, direction]);

  const dataForPreview = useMemo(() => {
    const details = { ...formData };
    
    if (details.AGENTES_FIRMANTES && Array.isArray(details.AGENTES_FIRMANTES)) {
       const agentNames = details.AGENTES_FIRMANTES.map(id => {
         const agent = agents.find(a => a.id === id);
         return agent ? agent.name : id;
       });

       if (agentNames.length === 1) {
        details.AGENTES_FIRMANTES = agentNames[0];
      } else if (agentNames.length === 2) {
        details.AGENTES_FIRMANTES = agentNames.join(' y ');
      } else if (agentNames.length > 2) {
        details.AGENTES_FIRMANTES = agentNames.slice(0, -1).join(', ') + ' y ' + agentNames.slice(-1);
      } else {
        details.AGENTES_FIRMANTES = '(Sin agentes)';
      }
    }

    for (const key in details) {
      // Aseguramos que solo se muestre la URL de archivos en la previsualización
      const isFileField = allFields.find(f => f.id === key && (f.type === 'image' || f.type === 'file'));
      if (isFileField) {
        // Si es un objeto File (recién subido), usa la URL temporal
        if (details[key] instanceof File) {
          details[key] = localPreviewUrls[key] || '';
        } 
        // Si es una URL (archivo guardado anteriormente) se mantiene
        // Si es null, se mantiene null
      }
    }
    return details;
  }, [formData, localPreviewUrls, agents, allFields]);

  // CORREGIDO: previewHtml con highlight basado en activeFieldId
  const previewHtml = useMemo(() => {
    if (direction === 'entrada') return '<html><body><p>El registro de ENTRADA no tiene vista previa de plantilla.</p></body></html>';
    if (!compiledTemplate) return '<html><body><p>Selecciona plantilla...</p></body></html>';
    
    try { 
      const content = compiledTemplate(dataForPreview);
      
      // CSS con highlight dinámico - solo genera el selector si hay campo activo
      let highlightCSS = '';
      if (activeFieldId) {
        highlightCSS = `
          [data-field-id="${activeFieldId}"] {
            background-color: rgba(0, 200, 100, 0.35) !important;
            outline: 3px solid #00c864 !important;
            outline-offset: 4px !important;
            box-shadow: 0 0 20px rgba(0, 200, 100, 0.6) !important;
            animation: pulse-highlight 1.5s ease-in-out infinite !important;
          }
        `;
      }
      
      const highlightStyles = `
        <style>
          [data-field-id] {
            transition: all 0.3s ease !important;
            border-radius: 4px !important;
          }
          
          ${highlightCSS}
          
          @keyframes pulse-highlight {
            0%, 100% { 
              box-shadow: 0 0 10px rgba(0, 200, 100, 0.4);
              outline-color: #00c864;
            }
            50% { 
              box-shadow: 0 0 25px rgba(0, 255, 136, 0.8);
              outline-color: #00ff88;
            }
          }
        </style>
      `;
      
      // Inyectar estilos ANTES de </head> para mayor prioridad
      if (content.includes('</head>')) {
        return content.replace('</head>', highlightStyles + '</head>');
      } else if (content.includes('<body>')) {
        return content.replace('<body>', '<body>' + highlightStyles);
      } else if (content.includes('<html>')) {
        return content.replace('<html>', '<html><head>' + highlightStyles + '</head>');
      } else {
        return highlightStyles + content;
      }
    } catch (error) { 
      return `<p>Error: ${error.message}</p>`; 
    }
  }, [compiledTemplate, dataForPreview, direction, activeFieldId]);

  // Función para hacer scroll en el preview al campo activo
  const scrollPreviewToField = useCallback((fieldId) => {
    setActiveFieldId(fieldId);
    
    // Hacer scroll después de que el iframe se actualice
    setTimeout(() => {
      const iframe = previewIframeRef.current;
      if (!iframe) return;
      
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;
        
        const targetElement = iframeDoc.querySelector(`[data-field-id="${fieldId}"]`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (e) {
        console.warn('No se pudo acceder al iframe para scroll:', e);
      }
    }, 150);
  }, []);

  // =================================================================
  // === Lógica de Formulario ===
  // =================================================================
  const validateSubStep = useCallback((stepNumber, showError = true) => { 
    const group = fieldOrderGroups[stepNumber - 1];
    if (!group) return true;
    let isValid = true;
    for (const fieldId of group.fields) {
      const fieldDef = allFields.find(f => f.id === fieldId);
      
      if (fieldDef && fieldDef.optional === false) {
        const value = formData[fieldId];
        
        if (!value || (typeof value === 'string' && !value.trim())) { 
            isValid = false; 
            break; 
        }
        // Validación de archivo para campos 'image' o 'file'
        const isFileOrImage = fieldDef.type === 'image' || fieldDef.type === 'file';
        if (isFileOrImage && !editingRecordId && !(value instanceof File) && !((typeof value === 'string') && value.startsWith('http'))) {
             isValid = false;
             break;
        }
      }
    }
    if (!isValid && (stepNumber === currentSubStep) && showError) {
      displayMessage('Por favor, completa todos los campos obligatorios.', 'error');
    }
    return isValid;
  }, [formData, fieldOrderGroups, allFields, currentSubStep, editingRecordId]);

  const validateStep = useCallback(() => {
    if (currentStep === 1) return !!documentType;
    if (currentStep === 2) return true;
    if (currentStep === 3) return validateSubStep(currentSubStep, false); 
    return true;
  }, [currentStep, currentSubStep, documentType, validateSubStep]);

  const handleNextStep = () => { if (currentStep < 3 && validateStep()) { setCurrentStep(currentStep + 1); setCurrentSubStep(1); } };
  const handlePreviousStep = () => { 
    if (currentStep === 3 && currentSubStep > 1) { 
        handleSubWizardPrev(); 
    } else if (currentStep > 1) { 
        if (direction === 'entrada' && currentStep === 3) {
             setCurrentStep(1);
        } else {
             setCurrentStep(currentStep - 1); 
        }
    } 
  };
  const handleSubWizardNext = () => { if (currentSubStep < totalSubSteps && validateSubStep(currentSubStep)) setCurrentSubStep(currentSubStep + 1); }; 
  const handleSubWizardPrev = () => { if (currentSubStep > 1) setCurrentSubStep(currentSubStep - 1); };

  // 💡 handleFormChange unificado para manejar tanto inputs normales como FileUploader
  const handleFormChange = (e) => {
    const { name, value, type, checked, options, multiple, files } = e.target;
    let finalValue;
    
    if (multiple) finalValue = Array.from(options).filter(o => o.selected).map(o => o.value);
    else if (type === 'checkbox') finalValue = checked;
    else if (type === 'file') {
        finalValue = files[0] || null; // El FileUploader pasa el File como files[0]
        setLocalPreviewUrls(prev => {
            // Limpia la URL temporal si existe
            if (prev[name]) URL.revokeObjectURL(prev[name]);
            // Crea la nueva URL temporal para el preview
            return { ...prev, [name]: finalValue ? URL.createObjectURL(finalValue) : null };
        });
    } else finalValue = value;
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };
  
  const handleRepeaterChange = useCallback((repeaterId, itemIndex, subFieldId, value) => {
    setFormData(prevFormData => {
      const repeaterArray = [...(prevFormData[repeaterId] || [])];
      if (!repeaterArray[itemIndex]) repeaterArray[itemIndex] = {};
      repeaterArray[itemIndex][subFieldId] = value;
      return { ...prevFormData, [repeaterId]: repeaterArray };
    });
  }, []);

  const addRepeaterItem = (repeaterId) => {
    setFormData(prev => ({
      ...prev,
      [repeaterId]: [...(prev[repeaterId] || []), {}]
    }));
  };

  const removeRepeaterItem = (repeaterId, itemIndex) => {
    setFormData(prev => ({
      ...prev,
      [repeaterId]: (prev[repeaterId] || []).filter((_, i) => i !== itemIndex)
    }));
  };

  // 💡 handleSave ahora solo maneja la subida de los archivos dentro de detailsToSave
  const handleSave = async () => {
    if (!validateSubStep(currentSubStep)) return; 
    setIsSaving(true);
    showLoading('Guardando...');

    const detailsToSave = { ...formData };

    // Identificar y subir todos los archivos de los campos dinámicos ('image' o 'file')
    const fileFieldIds = allFields
      .filter(f => (f.type === 'image' || f.type === 'file') && !f.id.includes('firma'))
      .map(f => f.id);

    for (const fieldId of fileFieldIds) {
      const file = detailsToSave[fieldId];
      if (file && file instanceof File) {
        try {
            showLoading(`Subiendo archivo de campo: ${file.name}...`);
            // Usamos uploadRecordImage para obtener la URL
            const fileUrl = await uploadRecordImage(file);
            detailsToSave[fieldId] = fileUrl; // Reemplazar el objeto File por la URL
        } catch (e) {
            displayMessage('Error al subir archivo del formulario.', 'error');
            setIsSaving(false); hideLoading(); return;
        }
      }
      // Si el campo existe pero está vacío (null o ''), se elimina para limpiar la BD
      if (!detailsToSave[fieldId]) delete detailsToSave[fieldId];
    }
    
    showLoading('Guardando documento...');

    const isCompositeDoc = direction === 'salida' && ['atestado', 'estadillo'].includes(documentType);

    try {
      if (editingRecordId) {
        await updateRegistro(editingRecordId, { details: detailsToSave });
        displayMessage('Documento actualizado.', 'success');
        navigate('/registros');
      } 
      else {
        const dataToSave = {
            direction,
            details: detailsToSave,
            documentType,
            templateUsed: currentTemplate?.id || null,
            subject: detailsToSave.asunto || detailsToSave.subject || currentTemplate?.templateName || `Documento ${documentType}`, 
            interesado: detailsToSave.remitente || detailsToSave.interesado || '', 
            parentId,
            linkedTaskId: linkedTaskId || null, 
            pdfUrl: null, 
            htmlContent: direction === 'salida' ? previewHtml : null, 
            status: direction === 'salida' ? 'completado' : 'pendiente'
        };

        if (isCompositeDoc) {
             const crearDocumento = httpsCallable(functions, 'crearDocumentoDesdePlantilla');
             dataToSave.status = 'borrador';
             const result = await crearDocumento({ plantillaId: currentTemplate.id, datosIncidente: detailsToSave, initialData: dataToSave });
             
             // 💡 LÓGICA TAREA (Documento Compuesto) - Añadida fecha
             if (linkedTaskId && result.data.status === 'success') {
                 const dateStr = new Date().toLocaleDateString('es-ES');
                 await resolveTaskWithComment({
                     taskId: linkedTaskId,
                     comment: `✅ Tarea resuelta el ${dateStr} mediante generación de documento (Borrador ID: ${result.data.documentoId}).`
                 });
             }

             if (result.data.status === 'success') navigate(`/registros/fusionar/${result.data.documentoId}`);
        } else {
             dataToSave.status = direction === 'salida' ? 'completado' : 'pendiente';
             
             // 1. Crear el registro
             const result = await createRegistro({ documentType, data: dataToSave });
             
             // 💡 2. LÓGICA TAREA (Caso Normal) - Añadida FECHA y Nº REGISTRO
             if (linkedTaskId) {
                 const regNum = result.registrationNumber || result.numeroRegistro || '(Pendiente)';
                 const docTypeLabel = direction === 'salida' ? 'Registro de Salida' : 'Registro de Entrada';
                 const dateStr = new Date().toLocaleDateString('es-ES'); // Fecha actual formateada
                 
                 await resolveTaskWithComment({
                     taskId: linkedTaskId,
                     // 📝 AQUÍ ESTÁ EL FORMATO QUE PEDISTE:
                     comment: `✅ Resuelta el ${dateStr}\n📄 ${docTypeLabel} Nº ${regNum}\n🔗 ID Doc: ${result.id || result.documentId}`
                 });
             }

             displayMessage('Documento guardado y tarea actualizada.', 'success');
             navigate('/registros');
        }
      }
    } catch (error) {
        console.error(error);
        displayMessage(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading(); 
        setIsSaving(false);
    }
  };

  const getTitle = () => {
    if (editingRecordId) return 'Editar Documento';
    if (parentId) return 'Crear Documento de Salida (Respuesta)';
    return direction === 'entrada' ? 'Añadir Nuevo Registro de Entrada' : 'Crear Nuevo Documento de Salida';
  };
  
  const isNextDisabled = () => {
    if (isSaving || loading) return true;
    if (currentStep === 1 && !documentType) return true;
    if (currentStep === 2 && direction === 'salida' && ['atestado', 'estadillo'].includes(documentType) && !templateId) {
      return true;
    }
    return currentStep === 3 ? !validateStep() : false;
  };
  
  const isSaveDisabled = () => {
    if (isSaving || loading) return true;
    if (currentStep === 3 && totalSubSteps > 0 && currentSubStep !== totalSubSteps) return true;
    return currentStep === 3 ? !validateSubStep(currentSubStep, false) : false;
  };

  // --- Render Step 1, 2 (Sin cambios) ---
  const renderStep1 = () => {
    // ... (código anterior de renderStep1)
    const tipos = direction === 'salida' ? [
      { id: 'informe', name: 'Informe' },
      { id: 'acta', name: 'Acta' },
      { id: 'atestado', name: 'Atestado' },
      { id: 'estadillo', name: 'Estadillo' },
      { id: 'salida_general', name: 'Documento General' }
    ] : [
      { id: 'oficio_judicial', name: 'Oficio Judicial' },
      { id: 'req_administracion', name: 'Requerimiento Administración' },
      { id: 'sol_aseguradora', name: 'Solicitud Aseguradora' },
      { id: 'instancia_general', name: 'Instancia General' },
      { id: 'comunicacion_interna', name: 'Comunicación Interna' }
    ];
    
    return (
        <div className="form-group">
        <label className="form-label">1. Tipo de Documento de {direction === 'salida' ? 'Salida' : 'Entrada'}</label>
        <select className="selector" value={documentType} onChange={(e) => { setDocumentType(e.target.value); setTemplateId(''); }} disabled={!!editingRecordId}>
            <option value="">-- Selecciona Tipo --</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        </div>
    );
  };

  function renderStep2() { 
    // ... (código anterior de renderStep2)
    return (
      <div className="form-group">
        <label className="form-label">2. Selecciona Plantilla (Opcional)</label>
        <select 
            className="selector" 
            value={templateId} 
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={!documentType || loading || !!editingRecordId}
        >
          <option value="">-- Sin Plantilla (Documento General) --</option>
          {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.templateName}</option>)}
        </select>
        {loading && <p className="form-hint">Cargando plantilla...</p>}
        {currentTemplate && <p className="form-hint">{currentTemplate.description}</p>}
      </div>
    );
  }

  // --- Render Step 3 (Ligeramente modificado para eliminar el FileUploader manual) ---
  const renderStep3 = () => (
    <div className="wizard-form-container" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', height: '100%' }}>
      
      {/* Columna Izquierda: Formulario */}
      <div className="wizard-sub-wizard" style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3>3. Rellenar Datos</h3>
        
        {fieldOrderGroups.length > 0 ? (
          <>
            <div id="sub-wizard-progress" className="sub-wizard-progress-bar">
              {fieldOrderGroups.map((group, index) => (
                <React.Fragment key={group.groupName}>
                  <div 
                    className={`sub-step-indicator ${index + 1 === currentSubStep ? 'active' : ''} ${index + 1 < currentSubStep ? 'completed' : ''}`} 
                    data-step={index + 1}
                    onClick={() => setCurrentSubStep(index + 1)}
                  >
                    <span>{group.groupName || `Módulo ${index + 1}`}</span>
                  </div>
                  {index < fieldOrderGroups.length - 1 && <div className="sub-step-divider"></div>} 
                </React.Fragment>
              ))}
            </div>

            <div id="sub-wizard-steps-container" className="form-steps-container">
              {fieldOrderGroups.map((group, index) => (
                <div 
                  key={index} 
                  className={`form-step ${index + 1 === currentSubStep ? '' : 'hidden'}`} 
                >
                  <h4>{group.groupName || `Módulo ${index + 1}`}</h4>
                  {group.fields.map(fieldId => {
                    const fieldDef = allFields.find(f => f.id === fieldId);
                    if (!fieldDef) return null;
                    
                    // Lógica Repeater
                    if (fieldDef.type === 'repeater') {
                      const repeaterArray = formData[fieldId] || [];
                      const repeaterId = fieldDef.id;
                      
                      return (
                        <div className="repeater-group" key={repeaterId}>
                          <h4 className="repeater-title">{fieldDef.label || 'Elementos'}</h4>
                          <div className="repeater-items-container">
                            {repeaterArray.map((itemData, itemIndex) => (
                              <div className="repeater-item" key={itemIndex}>
                                <div className="repeater-item-header">
                                  <h5>{fieldDef.itemLabel || 'Elemento'} #{itemIndex + 1}</h5>
                                  <button 
                                    type="button" 
                                    className="button button-danger button-small icon-button" 
                                    title="Eliminar este elemento"
                                    onClick={() => removeRepeaterItem(repeaterId, itemIndex)}
                                  >
                                    <Trash2 size={16} /> 
                                  </button>
                                </div>
                                <div className="repeater-item-fields">
                                  {(fieldDef.itemFields || []).map(subField => (
                                    <DynamicField
                                      key={subField.id}
                                      fieldDef={subField}
                                      value={itemData[subField.id]}
                                      index={itemIndex} 
                                      repeaterId={repeaterId}
                                      onChange={(e) => handleRepeaterChange(repeaterId, itemIndex, subField.id, e.target.type === 'checkbox' ? e.target.checked : e.target.value)}
                                      previewUrl={localPreviewUrls[`${repeaterId}-${itemIndex}-${subField.id}`]} 
                                      agents={agents}
                                      onFieldFocus={scrollPreviewToField} 
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          <button 
                            type="button" 
                            className="button button-secondary button-small add-repeater-item-btn" 
                            onClick={() => addRepeaterItem(repeaterId)}
                          >
                           <Plus size={16} /><span>Añadir {fieldDef.itemLabel || 'Elemento'}</span> 
                          </button>
                        </div>
                      );
                    }
                    
                    return (
                      <DynamicField
                        key={fieldId}
                        fieldDef={fieldDef}
                        value={formData[fieldId]}
                        onChange={handleFormChange}
                        previewUrl={localPreviewUrls[fieldId]} 
                        agents={agents}
                        onFieldFocus={scrollPreviewToField} 
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            
            {/* Navegación del Sub-Wizard */}
            {totalSubSteps > 1 && (
              <div id="sub-wizard-navigation" className="sub-wizard-navigation">
                <button id="btn-sub-wizard-prev" className="button button-secondary" onClick={handleSubWizardPrev} disabled={currentSubStep === 1 || isSaving}><ChevronLeft size={18} /> Atrás</button>
                <button id="btn-sub-wizard-next" className="button button-secondary" onClick={handleSubWizardNext} disabled={currentSubStep === totalSubSteps || isSaving || !validateSubStep(currentSubStep, false)}>Siguiente <ChevronRight size={18} /></button>
              </div>
            )}
          </>
        ) : (
          // --- Fallback si no hay plantilla (Sin FileUploader manual) ---
          <>
            <div className="form-group">
              <label className="form-label">Asunto</label>
              <input type="text" className="input" name="subject" value={formData.subject || ''} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Interesado / Destinatario</label>
              <input type="text" className="input" name="interesado" value={formData.interesado || ''} onChange={handleFormChange} />
            </div>
          </>
        )}

      </div>

      {/* Columna Derecha: Previsualización (CON REF PARA SINCRONIZACIÓN) */}
      {direction === 'salida' && (
        <div className="wizard-preview" style={{ flex: 1.5, display: 'flex', flexDirection: 'column', height: '80vh' }}> 
          <h3 style={{ margin: '0 0 1rem 0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Previsualización
            {activeFieldId && (
              <span style={{
                fontSize: '0.75rem',
                background: 'rgba(0, 200, 100, 0.15)',
                color: '#00c864',
                padding: '4px 10px',
                borderRadius: '15px',
                fontWeight: '500',
                border: '1px solid rgba(0, 200, 100, 0.3)',
                animation: 'pulse-badge 1.5s ease-in-out infinite'
              }}>
                Campo: {allFields.find(f => f.id === activeFieldId)?.label || activeFieldId}
              </span>
            )}
          </h3>
          <div className="iframe-container" style={{ 
            border: '1px solid var(--glass-dark-border)', 
            flex: 1, 
            height: '100%', 
            background: 'white',   
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden'
          }}>
            <iframe
              ref={previewIframeRef} 
              srcDoc={previewHtml}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                display: 'block'
              }}
              title="Previsualización del Documento"
            />
          </div>
        </div>
      )}
    </div>
  );
  
  // --- Renderizado Principal ---
  const maxSteps = direction === 'entrada' ? 2 : 3;

  return (
    <div className="card">
      <div className="card-header">
        <h2><FilePlus size={24} style={{ marginRight: '0.5rem', display: 'inline-block' }} /> {getTitle()}</h2>
        <button className="button button-secondary" onClick={() => navigate('/registros')}><X size={18} /> Cancelar</button>
      </div>
      <div className="card-body">
        <p className="wizard-progress-text">Paso {currentStep} de {maxSteps}</p>
        <div className="wizard-progress-bar-fill" style={{ width: `${(currentStep / maxSteps) * 100}%` }}></div>

        <div style={{ marginTop: '1.5rem', border: '1px solid var(--glass-dark-border)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && direction === 'salida' && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', borderTop: '1px solid var(--glass-dark-border)', paddingTop: '1.5rem' }}>
           <button 
             id="btn-wizard-prev"
             className="button button-secondary" 
             onClick={handlePreviousStep} 
             disabled={(currentStep === 1 && currentSubStep === 1) || isSaving}
           >
             <ChevronLeft size={18} /> Anterior
           </button>
           
           {currentStep < maxSteps ? (
             <button 
               id="btn-wizard-next"
               className="button button-primary" 
               onClick={handleNextStep} 
               disabled={isNextDisabled()}
             >
               Siguiente <ChevronRight size={18} />
             </button>
           ) : (
             <button 
               id="btn-wizard-save"
               className="button button-success" 
               onClick={handleSave} 
               disabled={isSaveDisabled()}
             >
               {isSaving ? 'Guardando...' : (editingRecordId ? 'Actualizar' : 'Guardar')}
             </button>
           )}
        </div>
      </div>
    </div>
  );
}

export default CrearRegistroPage;