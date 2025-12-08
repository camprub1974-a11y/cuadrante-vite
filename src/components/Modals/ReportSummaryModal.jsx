// Archivo: /src/components/Modals/ReportSummaryModal.jsx
// ✨ VERSIÓN MEJORADA: Categorías colapsables, totales, mejor stepper y UX

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Minus, Plus, Hash, Search, ChevronDown, ChevronRight,
  Shield, Truck, FileText, Users, AlertTriangle, Phone, Activity
} from 'react-feather';
import { useReportStore } from '../../store/reportStore';
import { SUMMARY_FIELD_LABELS, SUMMARY_FIELD_ICONS } from '../../constants/summaryFields';
import * as IconosFeather from 'react-feather';

// =========================================
// CATEGORÍAS DE CAMPOS (Agrupa los campos)
// =========================================
const FIELD_CATEGORIES = {
  'seguridad': {
    label: 'Seguridad Ciudadana',
    icon: Shield,
    color: '#ef4444',
    fields: ['identificaciones', 'detenidos_ciudadana', 'reyertas', 'intervencion_menores', 'violencia_genero']
  },
  'trafico': {
    label: 'Tráfico y Vehículos',
    icon: Truck,
    color: '#f59e0b',
    fields: ['denuncias_trafico', 'controles_trafico', 'regulacion_trafico', 'delitos_trafico', 'informes_trafico', 'anomalias_via', 'deposito_vehiculos', 'vehiculos_abandonados', 'estacionamiento_indebido', 'otros_trafico']
  },
  'administrativo': {
    label: 'Gestión Administrativa',
    icon: FileText,
    color: '#3b82f6',
    fields: ['denuncias_oomm', 'denuncias_seguridad', 'notificaciones', 'citaciones', 'informes_admin', 'certificados_convivencia', 'diligencias_exposicion', 'diligencias_prevencion', 'minutas']
  },
  'asistencia': {
    label: 'Asistencia y Colaboración',
    icon: Users,
    color: '#34d399',
    fields: ['auxilio_personas', 'colaboracion_gc', 'colab_bomberos', 'colab_sanitarios', 'solicitud_datos_gc']
  },
  'comunicaciones': {
    label: 'Comunicaciones',
    icon: Phone,
    color: '#a78bfa',
    fields: ['recepcion_llamadas', 'req_ciudadanos', 'recepcion_denuncias']
  },
  'otros': {
    label: 'Otros',
    icon: Activity,
    color: '#9ca3af',
    fields: ['inspecciones_locales', 'inspecciones_obras', 'contrap_patrimonio', 'salud_publica', 'fallecimientos']
  }
};

export default function ReportSummaryModal({ isOpen, onClose }) {
  const { currentReport, saveSummary } = useReportStore();
  
  const [formData, setFormData] = useState(() => {
    const initial = {};
    Object.keys(SUMMARY_FIELD_LABELS).forEach(key => initial[key] = 0);
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  // Cargar datos cuando se abre
  useEffect(() => {
    if (isOpen && currentReport) {
      const newData = {};
      Object.keys(SUMMARY_FIELD_LABELS).forEach(key => {
        newData[key] = currentReport.summary?.[key] || 0;
      });
      setFormData(newData);
      setSearchTerm('');
      
      // Expandir categorías que tienen valores > 0
      const expanded = {};
      Object.entries(FIELD_CATEGORIES).forEach(([catKey, cat]) => {
        const hasValues = cat.fields.some(field => (currentReport.summary?.[field] || 0) > 0);
        expanded[catKey] = hasValues;
      });
      setExpandedCategories(expanded);
    }
  }, [isOpen, currentReport]);

  // Calcular total
  const total = useMemo(() => {
    return Object.values(formData).reduce((sum, val) => sum + (val || 0), 0);
  }, [formData]);

  // Calcular totales por categoría
  const categoryTotals = useMemo(() => {
    const totals = {};
    Object.entries(FIELD_CATEGORIES).forEach(([catKey, cat]) => {
      totals[catKey] = cat.fields.reduce((sum, field) => sum + (formData[field] || 0), 0);
    });
    return totals;
  }, [formData]);

  const handleStep = (key, delta) => {
    setFormData(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta)
    }));
  };
  
  const handleInputChange = (key, valueStr) => {
    const val = parseInt(valueStr);
    setFormData(prev => ({
      ...prev,
      [key]: isNaN(val) ? 0 : Math.max(0, val)
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await saveSummary(formData);
      onClose();
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (catKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catKey]: !prev[catKey]
    }));
  };

  const getIcon = (key) => {
    const iconName = SUMMARY_FIELD_ICONS?.[key] || 'Circle';
    const IconComponent = IconosFeather[iconName] || IconosFeather.Circle;
    return <IconComponent size={16} />;
  };

  // Filtrar campos por búsqueda
  const getFilteredFields = (fields) => {
    if (!searchTerm) return fields;
    return fields.filter(key => 
      SUMMARY_FIELD_LABELS[key]?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Verificar si hay resultados en alguna categoría
  const hasSearchResults = useMemo(() => {
    if (!searchTerm) return true;
    return Object.values(FIELD_CATEGORIES).some(cat => 
      getFilteredFields(cat.fields).length > 0
    );
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ zIndex: 1070 }}>
      <div className="modal-content" style={{ 
        maxWidth: '600px', 
        height: '85vh', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        
        {/* Header */}
        <div className="modal-header" style={{ 
          flexDirection: 'column', 
          gap: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'rgba(0, 255, 136, 0.1)',
                padding: '8px',
                borderRadius: '10px'
              }}>
                <Hash size={20} color="var(--color-accent-neon)"/>
              </div>
              Editar Resumen
            </h3>
            <button className="icon-button close-button" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Total destacado */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            borderRadius: '10px',
            padding: '10px 15px'
          }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
              Total actuaciones registradas
            </span>
            <span style={{ 
              color: 'var(--color-accent-neon)', 
              fontSize: '1.5rem', 
              fontWeight: 'bold' 
            }}>
              {total}
            </span>
          </div>

          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)'
              }}
            />
            <input 
              type="text" 
              className="input w-100" 
              placeholder="Buscar concepto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                fontSize: '0.9rem', 
                padding: '10px 12px 10px 38px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          </div>
        </div>

        {/* Body con categorías */}
        <div className="modal-body" style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
          
          {!hasSearchResults ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              color: 'rgba(255,255,255,0.5)'
            }}>
              <Search size={40} style={{ opacity: 0.3, marginBottom: '1rem' }}/>
              <p>No se encontraron conceptos para "{searchTerm}"</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(FIELD_CATEGORIES).map(([catKey, category]) => {
                const filteredFields = getFilteredFields(category.fields);
                if (filteredFields.length === 0) return null;
                
                const CategoryIcon = category.icon;
                const isExpanded = expandedCategories[catKey] || searchTerm;
                const catTotal = categoryTotals[catKey];

                return (
                  <div 
                    key={catKey}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: catTotal > 0 
                        ? `1px solid ${category.color}40` 
                        : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header de categoría */}
                    <button
                      onClick={() => !searchTerm && toggleCategory(catKey)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 15px',
                        background: catTotal > 0 ? `${category.color}10` : 'transparent',
                        border: 'none',
                        cursor: searchTerm ? 'default' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {!searchTerm && (
                          isExpanded 
                            ? <ChevronDown size={18} color="rgba(255,255,255,0.5)"/>
                            : <ChevronRight size={18} color="rgba(255,255,255,0.5)"/>
                        )}
                        <CategoryIcon size={18} color={category.color}/>
                        <span style={{ 
                          color: 'white', 
                          fontWeight: '600',
                          fontSize: '0.95rem'
                        }}>
                          {category.label}
                        </span>
                      </div>
                      {catTotal > 0 && (
                        <span style={{
                          background: category.color,
                          color: 'white',
                          padding: '2px 10px',
                          borderRadius: '10px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          {catTotal}
                        </span>
                      )}
                    </button>

                    {/* Campos de la categoría */}
                    {isExpanded && (
                      <div style={{ padding: '0 10px 10px 10px' }}>
                        {filteredFields.map(key => (
                          <div 
                            key={key} 
                            style={{
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              background: formData[key] > 0 ? `${category.color}15` : 'rgba(255,255,255,0.02)', 
                              padding: '10px 12px', 
                              borderRadius: '8px',
                              marginTop: '6px',
                              border: formData[key] > 0 ? `1px solid ${category.color}30` : '1px solid transparent',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <span style={{ color: formData[key] > 0 ? category.color : 'rgba(255,255,255,0.4)' }}>
                                {getIcon(key)}
                              </span>
                              <label style={{ 
                                color: formData[key] > 0 ? 'white' : 'rgba(255,255,255,0.7)', 
                                fontSize: '0.85rem', 
                                fontWeight: formData[key] > 0 ? '600' : '400'
                              }}>
                                {SUMMARY_FIELD_LABELS[key]}
                              </label>
                            </div>
                            
                            {/* Stepper mejorado */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <button 
                                type="button"
                                onClick={() => handleStep(key, -1)}
                                disabled={formData[key] === 0}
                                style={{
                                  width: '32px', 
                                  height: '32px', 
                                  background: formData[key] === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(239, 68, 68, 0.2)',
                                  border: 'none', 
                                  cursor: formData[key] === 0 ? 'not-allowed' : 'pointer', 
                                  color: formData[key] === 0 ? 'rgba(255,255,255,0.3)' : '#ef4444',
                                  borderRadius: '6px 0 0 6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Minus size={14}/>
                              </button>
                              
                              <input 
                                type="number" 
                                value={formData[key] || 0} 
                                onChange={(e) => handleInputChange(key, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                style={{
                                  width: '50px', 
                                  height: '32px', 
                                  textAlign: 'center', 
                                  border: 'none', 
                                  background: 'rgba(0,0,0,0.3)', 
                                  color: formData[key] > 0 ? category.color : 'rgba(255,255,255,0.5)',
                                  fontWeight: 'bold',
                                  fontSize: '0.95rem'
                                }}
                              />
                              
                              <button 
                                type="button"
                                onClick={() => handleStep(key, 1)}
                                style={{
                                  width: '32px', 
                                  height: '32px', 
                                  background: 'rgba(52, 211, 153, 0.2)',
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  color: '#34d399',
                                  borderRadius: '0 6px 6px 0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Plus size={14}/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ 
          padding: '1rem', 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            {Object.values(formData).filter(v => v > 0).length} conceptos con valor
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="button button-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button 
              className="button btn-gradient-success" 
              onClick={handleSubmit} 
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading-spinner-sm" style={{ width: 16, height: 16, marginRight: 8 }}></span>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={16} style={{ marginRight: 6 }}/> 
                  Guardar Resumen
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}