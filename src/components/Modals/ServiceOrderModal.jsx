// Archivo: /src/components/Modals/ServiceOrderModal.jsx
// VERSIÓN MEJORADA: Wizard completo con validación, templates DB, y generación IA

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Save, Check, Users, FileText, Calendar, Clock, Shield,
  ArrowRight, ArrowLeft, Plus, Trash2, MapPin, AlertTriangle,
  Cpu, CheckSquare, Square, Star, Loader, User, RefreshCw
} from 'react-feather';
import { useGlobalStore } from '../../store/globalStore';
import {
  createServiceOrder,
  updateServiceOrder,
  getDefaultOrderTemplate,
  generateAiServiceOrder,
  getPendingTasksForAgents
} from '../../../js/dataController';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Plantillas hardcodeadas por defecto (fallback si no hay en DB)
const DEFAULT_TEMPLATES = {
  'M': {
    title: 'Servicio Ordinario de Mañana',
    subtitle: 'Turno 08:00 - 15:00',
    description: 'Patrullaje preventivo, control de tráfico escolar y atención al ciudadano.',
    checklist: [
      { item: 'Revisión de vehículo oficial', description: 'Comprobar luces, niveles y documentación', requiresGeolocation: false },
      { item: 'Control entrada colegios', description: 'Zona escolar C/ Principal y Avda. Constitución', requiresGeolocation: true },
      { item: 'Patrulla preventiva zona comercial', description: 'Recorrido por calles peatonales', requiresGeolocation: true },
      { item: 'Atención ciudadana en Jefatura', description: 'Turnos rotativos de oficina', requiresGeolocation: false }
    ]
  },
  'T': {
    title: 'Servicio Ordinario de Tarde',
    subtitle: 'Turno 14:00 - 21:00',
    description: 'Seguridad ciudadana, control de tráfico y vigilancia de zonas de ocio.',
    checklist: [
      { item: 'Relevo y briefing con turno saliente', description: 'Recepción de novedades', requiresGeolocation: false },
      { item: 'Control salida colegios', description: 'Zonas escolares 17:00h', requiresGeolocation: true },
      { item: 'Patrulla parques y jardines', description: 'Especial atención zonas infantiles', requiresGeolocation: true },
      { item: 'Vigilancia zona de terrazas', description: 'Control ruidos y ocupación', requiresGeolocation: true }
    ]
  },
  'N': {
    title: 'Servicio Ordinario de Noche',
    subtitle: 'Turno 21:00 - 08:00',
    description: 'Vigilancia nocturna, control de establecimientos y seguridad ciudadana.',
    checklist: [
      { item: 'Revisión de vehículo oficial', description: 'Comprobar equipamiento nocturno', requiresGeolocation: false },
      { item: 'Control cierre de establecimientos', description: 'Verificar horarios de locales', requiresGeolocation: true },
      { item: 'Patrulla zona industrial', description: 'Vigilancia de polígonos', requiresGeolocation: true },
      { item: 'Control de alcoholemia', description: 'Punto fijo o móvil según instrucciones', requiresGeolocation: true }
    ]
  }
};

// Orden de veteranía para auto-asignar responsable
const AGENT_SENIORITY_ORDER = ['4684', '4687', '5281', '5605', '8498'];

export default function ServiceOrderModal({
  isOpen,
  onClose,
  orderToEdit,
  initialData, // 💡 NUEVO: Datos iniciales (ej: de generación IA) sin activar modo edición
  defaultDate,
  defaultShift,
  onSaved
}) {
  const { agents } = useGlobalStore();

  // Estado del Wizard
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Estados de UI
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [pendingTasksWarning, setPendingTasksWarning] = useState(null);

  // Estado Principal del Formulario
  const [formData, setFormData] = useState({
    service_date: '',
    service_shift: 'M',
    title: '',
    subtitle: '',
    description: '',
    assigned_agents: [],
    shift_manager_id: '',
    checklist: [],
    status: 'draft'
  });

  // Estado para nueva tarea
  const [newTask, setNewTask] = useState({
    item: '',
    description: '',
    requiresGeolocation: false,
    assignedTo: '' // <-- PASO 1: AGREGADO assignedTo
  });

  // =========================================
  // EFECTOS
  // =========================================

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPendingTasksWarning(null);

      if (orderToEdit && orderToEdit.id) {
        // 💡 Solo modo edición si tiene ID válido
        loadExistingOrder(orderToEdit);
      } else if (initialData) {
        // 💡 NUEVO: Cargar datos iniciales (ej: generación IA) sin modo edición
        loadInitialData(initialData);
      } else {
        loadNewOrderWithTemplate(defaultShift || 'M', defaultDate);
      }
    }
  }, [isOpen, orderToEdit, initialData, defaultDate, defaultShift]);

  // Verificar tareas pendientes cuando cambian los agentes
  useEffect(() => {
    if (formData.assigned_agents.length > 0) {
      checkPendingTasks(formData.assigned_agents);
    } else {
      setPendingTasksWarning(null);
    }
  }, [formData.assigned_agents]);

  // =========================================
  // FUNCIONES DE CARGA
  // =========================================

  const loadExistingOrder = (order) => {
    const dateObj = order.service_date?.toDate
      ? order.service_date.toDate()
      : new Date(order.service_date);

    setFormData({
      service_date: format(dateObj, 'yyyy-MM-dd'),
      service_shift: order.service_shift || 'M',
      title: order.title || '',
      subtitle: order.subtitle || '',
      description: order.description || '',
      assigned_agents: order.assigned_agents || [],
      shift_manager_id: order.shift_manager_id || '',
      checklist: (order.checklist || []).map(t => ({
        item: t.item || t,
        description: t.description || '',
        requiresGeolocation: t.requiresGeolocation || false,
        assignedTo: t.assignedTo || '', // Importar assignedTo del objeto existente
        status: t.status || 'pendiente',
        completed: t.completed || false
      })),
      status: order.status || 'draft'
    });
  };

  // 💡 NUEVO: Cargar datos iniciales (de IA o externos) sin modo edición
  const loadInitialData = (data) => {
    const dateStr = data.service_date 
      ? (typeof data.service_date === 'string' 
          ? data.service_date 
          : format(new Date(data.service_date), 'yyyy-MM-dd'))
      : format(new Date(), 'yyyy-MM-dd');

    setFormData({
      service_date: dateStr,
      service_shift: data.service_shift || 'M',
      title: data.title || '',
      subtitle: data.subtitle || '',
      description: data.description || '',
      assigned_agents: data.assigned_agents || [],
      shift_manager_id: data.shift_manager_id || '',
      checklist: (data.checklist || []).map(t => ({
        item: t.item || t,
        description: t.description || '',
        requiresGeolocation: t.requiresGeolocation || false,
        assignedTo: t.assignedTo || '',
        status: 'pendiente',
        completed: false
      })),
      status: 'draft' // Siempre draft para datos nuevos
    });
  };

  const loadNewOrderWithTemplate = async (shiftType, date) => {
    setLoadingTemplate(true);

    try {
      // Intentar cargar plantilla de la DB
      let template = null;
      try {
        const shiftName = shiftType === 'M' ? 'Mañana' : shiftType === 'T' ? 'Tarde' : 'Noche';
        template = await getDefaultOrderTemplate(shiftName);
      } catch (e) {
        console.warn('No se pudo cargar plantilla de DB, usando fallback:', e);
      }

      // Usar plantilla de DB o fallback
      const finalTemplate = template || DEFAULT_TEMPLATES[shiftType];

      setFormData({
        service_date: date ? format(new Date(date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        service_shift: shiftType,
        title: finalTemplate.title,
        subtitle: finalTemplate.subtitle || '',
        description: finalTemplate.description,
        assigned_agents: [],
        shift_manager_id: '',
        checklist: (finalTemplate.checklist || []).map(t => ({
          item: typeof t === 'string' ? t : t.item,
          description: typeof t === 'string' ? '' : (t.description || ''),
          requiresGeolocation: typeof t === 'string' ? false : (t.requiresGeolocation || false),
          assignedTo: '', // Inicializar assignedTo en plantillas
          status: 'pendiente',
          completed: false
        })),
        status: 'draft'
      });
    } finally {
      setLoadingTemplate(false);
    }
  };

  // =========================================
  // VERIFICACIÓN DE TAREAS PENDIENTES
  // =========================================

  const checkPendingTasks = async (agentIds) => {
    if (!agentIds || agentIds.length === 0) {
      setPendingTasksWarning(null);
      return;
    }

    try {
      const pendingTasks = await getPendingTasksForAgents(agentIds);

      if (pendingTasks && Object.keys(pendingTasks).length > 0) {
        const agentsWithTasks = Object.entries(pendingTasks)
          .filter(([_, tasks]) => tasks && tasks.length > 0)
          .map(([agentId, tasks]) => {
            const agent = agents.find(a => String(a.id) === String(agentId));
            return `${agent?.name || agentId} (${tasks.length} pendientes)`;
          });

        if (agentsWithTasks.length > 0) {
          setPendingTasksWarning(agentsWithTasks.join(', '));
        } else {
          setPendingTasksWarning(null);
        }
      } else {
        setPendingTasksWarning(null);
      }
    } catch (error) {
      console.error('Error verificando tareas pendientes:', error);
    }
  };

  // =========================================
  // HANDLERS DE CAMBIO
  // =========================================

  const handleShiftChange = (e) => {
    const newShift = e.target.value;

    if (!orderToEdit) {
      // En modo creación, cambiar plantilla
      loadNewOrderWithTemplate(newShift, formData.service_date);
    } else {
      setFormData(prev => ({ ...prev, service_shift: newShift }));
    }
  };

  const toggleAgent = (agentId) => {
    const id = String(agentId);
    setFormData(prev => {
      const current = prev.assigned_agents;
      const newAgents = current.includes(id)
        ? current.filter(a => a !== id)
        : [...current, id];

      // Si quitamos al responsable actual, resetear
      let newManager = prev.shift_manager_id;
      if (!newAgents.includes(newManager)) {
        newManager = '';
      }

      return { ...prev, assigned_agents: newAgents, shift_manager_id: newManager };
    });
  };

  const setResponsable = (agentId) => {
    setFormData(prev => ({ ...prev, shift_manager_id: String(agentId) }));
  };

  // =========================================
  // GESTIÓN DE TAREAS
  // =========================================

  const addTask = () => {
    if (!newTask.item.trim()) return;

    setFormData(prev => ({
      ...prev,
      checklist: [
        ...prev.checklist,
        {
          ...newTask,
          // Aseguramos que el estado y completado estén inicializados
          status: 'pendiente',
          completed: false,
          assignedTo: newTask.assignedTo || '' // <-- PASO 2: Incluir assignedTo
        }
      ]
    }));
    // Reseteamos el formulario, incluyendo el selector de agente
    setNewTask({ item: '', description: '', requiresGeolocation: false, assignedTo: '' }); // <-- PASO 2: Resetear el estado de newTask incluyendo assignedTo
  };

  const removeTask = (index) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }));
  };

  const toggleTaskGeo = (index) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.map((t, i) =>
        i === index ? { ...t, requiresGeolocation: !t.requiresGeolocation } : t
      )
    }));
  };

 // Función para importar tareas pendientes al checklist actual
const importPendingTasksToOrder = async () => {
    // Aseguramos que 'format' (de date-fns) esté disponible en el scope del archivo
    // Si no está definido, esta función fallará. (Asumiendo que ya lo está).
    
    if (!formData.assigned_agents.length) return;
    
    try {
        const pendingMap = await getPendingTasksForAgents(formData.assigned_agents);
        
        const newTasks = [];
        Object.entries(pendingMap).forEach(([agentId, tasks]) => {
            tasks.forEach(taskObj => {
                // Evitar duplicados
                const exists = formData.checklist.some(t => 
                    t.item === taskObj.description && t.assignedTo === agentId
                );
                
                if (!exists) {
                    
                    // =========================================
                    // LÓGICA MEJORADA DE REFERENCIA (SOLICITADA)
                    // =========================================
                    let referenciaTexto = 'S/R'; // S/R: Sin Referencia (Valor por defecto)
                    
                    if (taskObj.createdAt) {
                        // 1. Prioridad: Usar la fecha de creación
                        referenciaTexto = format(new Date(taskObj.createdAt), 'dd/MM/yyyy');
                    } else if (taskObj.orderId) {
                        // 2. Fallback: Usar el ID de la orden si la fecha no existe
                        referenciaTexto = `Ord. ${taskObj.orderId}`;
                    }
                    // =========================================

                    newTasks.push({
                        item: taskObj.description,
                        // El texto de la descripción ahora incluye la referencia más robusta
                        description: `Pendiente de orden anterior (Ref: ${referenciaTexto})`, 
                        requiresGeolocation: false,
                        assignedTo: agentId,
                        status: 'pendiente',
                        completed: false
                    });
                }
            });
        });

        if (newTasks.length > 0) {
            setFormData(prev => ({
                ...prev,
                checklist: [...prev.checklist, ...newTasks]
            }));
            // Limpiamos el warning porque ya las hemos importado (visual)
            setPendingTasksWarning(null); 
            alert(`✅ ${newTasks.length} tareas pendientes importadas al checklist.`);
        } else {
            alert("No hay tareas nuevas para importar (o ya están en la lista).");
        }

    } catch (error) {
        console.error("Error importando tareas:", error);
        alert("❌ Error al importar tareas pendientes.");
    }
};

  // =========================================
  // NAVEGACIÓN DEL WIZARD
  // =========================================

  const validateStep = (stepNum) => {
    if (stepNum === 1) {
      if (!formData.title.trim() || !formData.service_date || !formData.service_shift) {
        alert('Por favor, completa Título, Fecha y Turno para continuar.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  // =========================================
  // GUARDADO
  // =========================================

// --- LÓGICA DE GUARDADO CORREGIDA ---
  const handleSubmit = async (e) => {
      e.preventDefault(); // Asegura que no recargue la página
      setSaving(true);
      
      try {
          // Auto-asignar responsable si no hay
          let finalManagerId = formData.shift_manager_id;
          if (!finalManagerId && formData.assigned_agents.length > 0) {
              // Buscar por veteranía
              finalManagerId = formData.assigned_agents
                .filter(id => AGENT_SENIORITY_ORDER.includes(String(id)))
                .sort((a, b) => 
                  AGENT_SENIORITY_ORDER.indexOf(String(a)) - AGENT_SENIORITY_ORDER.indexOf(String(b))
                )[0];
              
              // Si no hay veterano, el primero de la lista
              if (!finalManagerId) {
                finalManagerId = formData.assigned_agents[0];
              }
          }

          // Determinar estado
          const newStatus = formData.assigned_agents.length > 0 ? 'assigned' : 'draft';

          const payload = {
              ...formData,
              shift_manager_id: finalManagerId,
              status: orderToEdit ? formData.status : newStatus,
              checklist: formData.checklist.map(t => ({
                  item: t.item,
                  description: t.description || '',
                  requiresGeolocation: t.requiresGeolocation || false,
                  status: t.status || 'pendiente',
                  completed: t.completed || false
              }))
          };

          // 💡 DEBUG: Ver qué estamos intentando guardar
          console.log("Guardando Orden. Datos:", payload);
          console.log("Modo Edición:", !!orderToEdit);
          if(orderToEdit) console.log("ID a actualizar:", orderToEdit.id);

          if (orderToEdit) {
              // 🛑 PROTECCIÓN: Verificar que tenemos ID
              if (!orderToEdit.id) {
                  throw new Error("Error crítico: Se intentó editar una orden sin ID válido. Recarga la página.");
              }
              await updateServiceOrder(orderToEdit.id, payload);
          } else {
              await createServiceOrder(payload);
          }
          
          if (onSaved) onSaved();
          onClose();
          
      } catch (error) {
          console.error("Error en handleSubmit:", error);
          alert("Error al guardar: " + error.message);
      } finally {
          setSaving(false);
      }
  };

  // =========================================
  // RENDER
  // =========================================

  if (!isOpen) return null;

  const isEditMode = !!(orderToEdit && orderToEdit.id);
  const shiftLabels = { 'M': 'Mañana', 'T': 'Tarde', 'N': 'Noche' };

  return (
    <div className="modal-overlay active" style={{ zIndex: 1060 }}>
      <div className="modal-content" style={{
        maxWidth: '800px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* ========== HEADER CON STEPPER ========== */}
        <div className="modal-header" style={{
          flexDirection: 'column',
          gap: '15px',
          alignItems: 'stretch',
          borderBottom: '1px solid var(--glass-dark-border)',
          paddingBottom: '1rem'
        }}>
          {/* Título y Cerrar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={22} color="var(--color-accent-neon)" />
              {isEditMode ? 'Editar Orden de Servicio' : 'Nueva Orden de Servicio'}
            </h3>
            <button className="icon-button" onClick={onClose}>
              <X size={22} />
            </button>
          </div>

          {/* Stepper Visual */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            padding: '0 20px'
          }}>
            {/* Línea de progreso */}
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '60px',
              right: '60px',
              height: '2px',
              background: 'rgba(255,255,255,0.1)',
              zIndex: 0
            }}>
              <div style={{
                width: `${((step - 1) / (totalSteps - 1)) * 100}%`,
                height: '100%',
                background: 'var(--color-accent-neon)',
                transition: 'width 0.3s ease'
              }} />
            </div>

            {[
              { num: 1, label: 'Configuración', icon: FileText },
              { num: 2, label: 'Equipo y Tareas', icon: Users },
              { num: 3, label: 'Confirmación', icon: Check }
            ].map(({ num, label, icon: Icon }) => (
              <div key={num} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 1
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: step >= num ? 'var(--color-accent-neon)' : 'rgba(255,255,255,0.1)',
                  color: step >= num ? 'black' : 'rgba(255,255,255,0.5)',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  transition: 'all 0.3s ease',
                  border: step === num ? '2px solid white' : 'none'
                }}>
                  {step > num ? <Check size={16} /> : <Icon size={14} />}
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  marginTop: '6px',
                  color: step >= num ? 'white' : 'rgba(255,255,255,0.4)',
                  fontWeight: step === num ? '600' : '400'
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ========== CUERPO DEL MODAL ========== */}
        <div className="modal-body" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem'
        }}>

          {loadingTemplate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem',
              gap: '10px'
            }}>
              <Loader size={24} className="spin" />
              <span>Cargando plantilla...</span>
            </div>
          )}

          {!loadingTemplate && (
            <>
              {/* ===== PASO 1: CONFIGURACIÓN (sin cambios) ===== */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                 <div className="form-group">
                      <label className="form-label">
                        <Clock size={14} style={{ marginRight: '6px' }} />
                        Turno *
                      </label>
                      
                      {/* Selector de Turno - DISEÑO UI MEJORADO */}
                      <div style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '0 30px 0 10px', // Espacio para la flecha
                          height: '42px', // Altura consistente
                          width: '100%',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                      }}>
                          {/* Icono Reloj Izquierda */}
                          <Clock 
                              size={16} 
                              color="rgba(255,255,255,0.5)" 
                              style={{ marginRight: '10px', flexShrink: 0 }}
                          />
                          
                          {/* Select Nativo (Invisible pero funcional por encima) */}
                          <select 
                              value={formData.service_shift}
                              onChange={handleShiftChange}
                              style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  opacity: 0, // 👻 Invisible
                                  cursor: 'pointer',
                                  zIndex: 2,
                                  appearance: 'none'
                              }}
                          >
                              <option value="M">Mañana (08:00 - 15:00)</option>
                              <option value="T">Tarde (14:00 - 21:00)</option>
                              <option value="N">Noche (21:00 - 08:00)</option>
                          </select>

                          {/* Texto visible (Label simulado limpio) */}
                          <span style={{
                              fontSize: '0.9rem',
                              color: 'white',
                              fontWeight: '500'
                          }}>
                              {shiftLabels[formData.service_shift]}
                          </span>

                          {/* Flecha personalizada Derecha */}
                          <ArrowRight 
                              size={14} 
                              color="rgba(255,255,255,0.3)"
                              style={{ 
                                  position: 'absolute',
                                  right: '10px',
                                  top: '50%',
                                  marginTop: '-7px',
                                  transform: 'rotate(90deg)', // Flecha hacia abajo
                                  pointerEvents: 'none'
                              }} 
                          />
                      </div>
                    </div>

                  {/* Título */}
                  <div className="form-group">
                    <label className="form-label">Título de la Orden *</label>
                    <input
                      type="text"
                      className="input w-100"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ej: Servicio Ordinario de Mañana"
                    />
                  </div>

                  {/* Subtítulo */}
                  <div className="form-group">
                    <label className="form-label">Subtítulo (opcional)</label>
                    <input
                      type="text"
                      className="input w-100"
                      value={formData.subtitle}
                      onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="Ej: Turno reforzado por evento especial"
                    />
                  </div>

                  {/* Descripción */}
                  <div className="form-group">
                    <label className="form-label">Briefing / Instrucciones Generales</label>
                    <textarea
                      className="input w-100"
                      rows="4"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Instrucciones específicas para este servicio..."
                      style={{ resize: 'vertical', minHeight: '100px' }}
                    />
                  </div>

                </div>
              )}

              {/* ===== PASO 2: EQUIPO Y TAREAS (ACTUALIZADO) ===== */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                  {/* Selector de Agentes (sin cambios en este bloque) */}
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '10px' }}>
                      <Users size={14} style={{ marginRight: '6px' }} />
                      Asignar Agentes al Servicio
                    </label>

                    {/* Warning de tareas pendientes CON ACCIÓN */}
                    {pendingTasksWarning && (
                      <div style={{
                        background: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between', // Para separar texto y botón
                        gap: '10px',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <AlertTriangle size={18} color="#fbbf24"/>
                            <span>
                              <strong>Atención:</strong> Tareas pendientes: {pendingTasksWarning}
                            </span>
                        </div>
                        
                        {/* ✅ BOTÓN DE IMPORTAR */}
                        <button 
                            className="button button-sm"
                            onClick={(e) => { e.preventDefault(); importPendingTasksToOrder(); }}
                            style={{
                                background: 'rgba(251, 191, 36, 0.2)',
                                color: '#fbbf24',
                                border: '1px solid rgba(251, 191, 36, 0.5)',
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <RefreshCw size={12}/> Importar Tareas
                        </button>
                      </div>
                    )}

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '10px',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '15px',
                      borderRadius: '12px',
                      border: '1px solid var(--glass-dark-border)'
                    }}>
                      {agents.map(agent => {
                        const isSelected = formData.assigned_agents.includes(String(agent.id));
                        const isResponsable = formData.shift_manager_id === String(agent.id);

                        return (
                          <div
                            key={agent.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px',
                              borderRadius: '10px',
                              background: isSelected
                                ? 'rgba(0, 255, 136, 0.1)'
                                : 'rgba(255,255,255,0.03)',
                              border: isSelected
                                ? '1px solid rgba(0, 255, 136, 0.3)'
                                : '1px solid rgba(255,255,255,0.08)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => toggleAgent(agent.id)}
                          >
                            {/* Checkbox visual */}
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: isSelected
                                ? '2px solid var(--color-accent-neon)'
                                : '2px solid rgba(255,255,255,0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? 'var(--color-accent-neon)' : 'transparent'
                            }}>
                              {isSelected && <Check size={12} color="black" />}
                            </div>

                            {/* Info del agente */}
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontWeight: '600',
                                color: isSelected ? 'white' : 'rgba(255,255,255,0.7)',
                                fontSize: '0.9rem'
                              }}>
                                {agent.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                TIP: {agent.id}
                              </div>
                            </div>

                            {/* Botón responsable */}
                            {isSelected && (
                              <button
                                className="icon-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setResponsable(agent.id);
                                }}
                                style={{
                                  background: isResponsable ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                                  color: isResponsable ? 'black' : 'rgba(255,255,255,0.5)',
                                  padding: '4px',
                                  borderRadius: '4px'
                                }}
                                title={isResponsable ? 'Responsable del turno' : 'Marcar como responsable'}
                              >
                                <Star size={14} fill={isResponsable ? 'black' : 'transparent'} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {formData.assigned_agents.length > 0 && (
                      <div style={{
                        marginTop: '10px',
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.6)'
                      }}>
                        {formData.assigned_agents.length} agente(s) seleccionado(s)
                        {formData.shift_manager_id && (
                          <> • Responsable: <strong style={{ color: '#fbbf24' }}>
                            {agents.find(a => String(a.id) === formData.shift_manager_id)?.name || formData.shift_manager_id}
                          </strong></>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lista de Tareas */}
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '10px' }}>
                      <CheckSquare size={14} style={{ marginRight: '6px' }} />
                      Lista de Tareas / Checklist
                    </label>

                    {/* Formulario nueva tarea - ACTUALIZADO */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      marginBottom: '15px',
                      flexWrap: 'wrap'
                    }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Nueva tarea..."
                        value={newTask.item}
                        onChange={e => setNewTask({ ...newTask, item: e.target.value })}
                        onKeyPress={e => e.key === 'Enter' && addTask()}
                        style={{ flex: '2', minWidth: '150px' }}
                      />
                      <input
                        type="text"
                        className="input"
                        placeholder="Descripción (opcional)"
                        value={newTask.description}
                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                        style={{ flex: '1.5', minWidth: '150px' }}
                      />

                      {/* Selector de Asignación Inmediata - DISEÑO UI MEJORADO */}
                      <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        background: newTask.assignedTo ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)',
                        border: newTask.assignedTo ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '0 30px 0 10px', // Espacio para la flecha a la derecha
                        height: '42px', // Misma altura que los inputs
                        minWidth: '150px',
                        maxWidth: '150px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}>
                        {/* Icono Usuario Izquierda */}
                        <User
                          size={14}
                          color={newTask.assignedTo ? '#fbbf24' : 'rgba(255,255,255,0.5)'}
                          style={{ marginRight: '8px', flexShrink: 0 }}
                        />

                        {/* Select Nativo (Invisible pero funcional por encima de todo) */}
                        <select
                          value={newTask.assignedTo}
                          onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                          title="Asignar responsable de la tarea"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0, // 👻 Invisible
                            cursor: 'pointer',
                            zIndex: 2,
                            appearance: 'none'
                          }}
                        >
                          <option value="">General</option>
                          {formData.assigned_agents.length > 0 ? (
                            formData.assigned_agents.map(id => {
                              const agent = agents.find(a => String(a.id) === String(id));
                              return <option key={id} value={id}>{agent?.name || id}</option>;
                            })
                          ) : (
                            <option disabled>Añade agentes primero</option>
                          )}
                        </select>

                        {/* Texto visible (Label simulado) */}
                        <span style={{
                          fontSize: '0.85rem',
                          color: newTask.assignedTo ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: newTask.assignedTo ? '600' : '400'
                        }}>
                          {newTask.assignedTo
                            ? (agents.find(a => String(a.id) === newTask.assignedTo)?.name || newTask.assignedTo)
                            : 'General'}
                        </span>

                        {/* Flecha personalizada Derecha */}
                        <ArrowRight
                          size={14}
                          color={newTask.assignedTo ? '#fbbf24' : 'rgba(255,255,255,0.3)'}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            marginTop: '-7px', // Centrado exacto
                            transform: 'rotate(90deg)', // Flecha hacia abajo
                            pointerEvents: 'none'
                          }}
                        />
                      </div>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={newTask.requiresGeolocation}
                          onChange={e => setNewTask({ ...newTask, requiresGeolocation: e.target.checked })}
                        />
                        <MapPin size={14} />
                        GPS
                      </label>
                      <button
                        className="button btn-gradient-success"
                        onClick={addTask}
                        disabled={!newTask.item.trim()}
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    {/* Lista de tareas */}
                    <div style={{
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid var(--glass-dark-border)'
                    }}>
                      {formData.checklist.length === 0 ? (
                        <p style={{
                          padding: '2rem',
                          textAlign: 'center',
                          opacity: 0.5,
                          margin: 0
                        }}>
                          No hay tareas. Añade tareas usando el formulario de arriba.
                        </p>
                      ) : (
                        formData.checklist.map((task, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '12px 15px',
                              borderBottom: idx < formData.checklist.length - 1
                                ? '1px solid rgba(255,255,255,0.05)'
                                : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px'
                            }}
                          >
                            <CheckSquare size={16} color="var(--color-accent-neon)" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '500', color: 'white' }}>{task.item}</div>
                              {task.description && (
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                  {task.description}
                                </div>
                              )}
                              {/* Visualización del Agente Asignado en la lista existente */}
                              {task.assignedTo && (
                                <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Users size={12} />
                                  Asignado a: {agents.find(a => String(a.id) === task.assignedTo)?.name || task.assignedTo}
                                </div>
                              )}
                            </div>
                            {task.requiresGeolocation && (
                              <span
                                onClick={() => toggleTaskGeo(idx)}
                                title="Click para quitar geolocalización"
                                style={{ // Estilos fusionados aquí
                                  background: 'rgba(96, 165, 250, 0.2)',
                                  color: '#60a5fa',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.7rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer' // <--- FUSIONADO AQUÍ
                                }}
                              >
                                <MapPin size={10} /> GPS
                              </span>
                            )}
                            <button
                              className="icon-button button-danger"
                              onClick={() => removeTask(idx)}
                              style={{ padding: '4px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              
              {/* ===== PASO 3: RESUMEN FINAL LIMPIO ===== */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Encabezado Principal Simplificado */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '1.4rem' }}>{formData.title}</h3>
                    {formData.subtitle && (
                      <p style={{ margin: '0 0 15px 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
                        {formData.subtitle}
                      </p>
                    )}
                    
                    {/* Metadatos en Badges (Fecha y Turno) */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                      <span style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', 
                          background: 'rgba(0,0,0,0.2)', padding: '5px 12px', borderRadius: '20px',
                          fontSize: '0.85rem', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)'
                      }}>
                        <Calendar size={14}/>
                        {formData.service_date ? format(new Date(formData.service_date), "d 'de' MMMM, yyyy", { locale: es }) : 'Sin fecha'}
                      </span>
                      <span style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', 
                          background: 'rgba(0,0,0,0.2)', padding: '5px 12px', borderRadius: '20px',
                          fontSize: '0.85rem', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)'
                      }}>
                        <Clock size={14}/>
                        Turno de {shiftLabels[formData.service_shift]}
                      </span>
                    </div>
                  </div>

                  {/* Sección: Equipo */}
                  <div>
                    <h5 style={{ 
                        color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', 
                        fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '10px', marginLeft: '5px' 
                    }}>
                        Equipo Asignado ({formData.assigned_agents.length})
                    </h5>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {formData.assigned_agents.length === 0 ? (
                        <span style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.9rem', padding: '10px' }}>Sin agentes asignados</span>
                      ) : (
                        formData.assigned_agents.map(id => {
                          const agent = agents.find(a => String(a.id) === id);
                          const isResp = formData.shift_manager_id === id;
                          return (
                            <div key={id} style={{
                                background: isResp ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.05)',
                                border: isResp ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                              {isResp ? <Star size={14} fill="#fbbf24" color="#fbbf24"/> : <User size={14} color="rgba(255,255,255,0.7)"/>}
                              <span style={{ fontSize: '0.9rem', color: isResp ? '#fbbf24' : 'white' }}>
                                {agent?.name || `Agente ${id}`}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Sección: Tareas */}
                  <div>
                    <h5 style={{ 
                        color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', 
                        fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '10px', marginLeft: '5px' 
                    }}>
                        Checklist de Tareas ({formData.checklist.length})
                    </h5>
                    
                    {formData.checklist.length === 0 ? (
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <span style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.9rem' }}>No hay tareas definidas</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {formData.checklist.map((t, i) => (
                          <div key={i} style={{ 
                            background: 'rgba(255,255,255,0.03)', 
                            padding: '12px', 
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ marginTop: '2px' }}><CheckSquare size={16} color="var(--color-accent-neon)"/></div>
                                <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{t.item}</span>
                            </div>
                            
                            {/* Detalles de la tarea (Asignación y GPS) */}
                            {(t.assignedTo || t.requiresGeolocation) && (
                                <div style={{ display: 'flex', gap: '15px', marginLeft: '26px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                    {t.assignedTo && (
                                        <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(251, 191, 36, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            <User size={10}/> {agents.find(a => String(a.id) === String(t.assignedTo))?.name || t.assignedTo}
                                        </span>
                                    )}
                                    {t.requiresGeolocation && (
                                        <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(96, 165, 250, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            <MapPin size={10}/> Ubicación requerida
                                        </span>
                                    )}
                                </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sección: Descripción */}
                  {formData.description && (
                    <div>
                      <h5 style={{ 
                          color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', 
                          fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '10px', marginLeft: '5px' 
                      }}>
                        Instrucciones Generales
                      </h5>
                      <div style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          padding: '15px', 
                          borderRadius: '8px', 
                          borderLeft: '3px solid var(--color-accent-neon)',
                          fontSize: '0.9rem', 
                          lineHeight: '1.6',
                          color: 'rgba(255,255,255,0.8)'
                      }}>
                        {formData.description}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </>
          )} 
        </div> 
        {/* ⬆️ CIERRE CORRECTO DEL MODAL BODY */}

        {/* ========== FOOTER ========== */}
        <div className="modal-footer" style={{ 
          borderTop: '1px solid var(--glass-dark-border)',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          {step > 1 ? (
            <button className="button button-secondary" onClick={prevStep}>
              <ArrowLeft size={16} style={{ marginRight: 6 }}/> Anterior
            </button>
          ) : (
            <button className="button button-secondary" onClick={onClose}>
              Cancelar
            </button>
          )}

          {step < totalSteps ? (
            <button className="button btn-gradient-primary" onClick={nextStep}>
              Siguiente <ArrowRight size={16} style={{ marginLeft: 6 }}/>
            </button>
          ) : (
            <button 
              className="button btn-gradient-success" 
              onClick={handleSubmit} 
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader size={16} className="spin" style={{ marginRight: 6 }}/>
                  Guardando...
                </>
              ) : (
                <>
                  <Check size={16} style={{ marginRight: 6 }}/>
                  {isEditMode ? 'Guardar Cambios' : 'Crear Orden'}
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}