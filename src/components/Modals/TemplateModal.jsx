// src/components/Modals/TemplateModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Save, Loader, FileText, Code } from 'react-feather';
import { useTemplateStore } from '../../store/templateStore';

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)',
        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    content: {
        background: 'rgba(30, 41, 59, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        width: '90%', maxWidth: '800px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'white',
        display: 'flex', flexDirection: 'column'
    },
    header: {
        padding: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    title: { margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' },
    body: { padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    row: { display: 'flex', gap: '1.5rem' },
    group: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 },
    input: {
        padding: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', 
        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', 
        color: 'white', outline: 'none'
    },
    textarea: {
        padding: '1rem', background: '#1e1e1e', // Editor-like background
        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', 
        color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.9rem',
        resize: 'vertical', minHeight: '300px', outline: 'none', lineHeight: '1.5'
    },
    footer: {
        padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(0,0,0,0.2)'
    }
};

export default function TemplateModal() {
    const { isModalOpen, editingTemplate, closeModal, saveTemplate } = useTemplateStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        templateName: '',
        documentType: 'informe',
        content: ''
    });

    // Resetear form al abrir
    useEffect(() => {
        if (isModalOpen) {
            if (editingTemplate) {
                setFormData({
                    templateName: editingTemplate.templateName || '',
                    documentType: editingTemplate.documentType || 'informe',
                    content: editingTemplate.content || ''
                });
            } else {
                setFormData({ templateName: '', documentType: 'informe', content: '' });
            }
        }
    }, [isModalOpen, editingTemplate]);

    // Función auxiliar para extraer placeholders {{variable}}
    const parsePlaceholders = (html) => {
        const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
        const matches = new Set();
        let match;
        const ignore = ['FECHA_ACTUAL', 'NUM_REGISTRO', 'AGENTES_FIRMANTES', 'hora_actual'];
        while ((match = regex.exec(html)) !== null) {
            if (!ignore.includes(match[1])) matches.add(match[1]);
        }
        return Array.from(matches);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.templateName.trim() || !formData.content.trim()) {
            alert("Nombre y contenido son obligatorios");
            return;
        }

        setLoading(true);
        
        // Generar esquema básico basado en placeholders
        const placeholders = parsePlaceholders(formData.content);
        const schema = {};
        const fieldOrderFields = [];
        placeholders.forEach(p => {
            schema[p] = { type: 'text', label: p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' '), optional: false };
            fieldOrderFields.push(p);
        });

        // Mantener datos antiguos si editamos para no perder configuraciones avanzadas de schema
        const payload = {
            ...(editingTemplate || {}), 
            ...formData,
            placeholders: placeholders,
            // Solo sobrescribimos schema si es creación nueva, para no borrar configs manuales en DB
            schema: editingTemplate?.schema || schema, 
            fieldOrder: editingTemplate?.fieldOrder || [{ groupName: "Datos", fields: fieldOrderFields }]
        };

        const result = await saveTemplate(payload);
        setLoading(false);
        if (!result.success) alert("Error al guardar: " + result.message);
    };

    if (!isModalOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.content} className="fade-in-up">
                <div style={styles.header}>
                    <h3 style={styles.title}>
                        <FileText size={20} color="#34d399"/> 
                        {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </h3>
                    <button onClick={closeModal} style={{background:'none', border:'none', color:'#94a3b8', cursor:'pointer'}}>
                        <X size={20}/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', flex:1}}>
                    <div style={styles.body}>
                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Nombre de la Plantilla</label>
                                <input 
                                    style={styles.input} 
                                    type="text" 
                                    placeholder="Ej: Acta de Denuncia Tráfico"
                                    value={formData.templateName}
                                    onChange={e => setFormData({...formData, templateName: e.target.value})}
                                    autoFocus
                                />
                            </div>
                            <div style={{...styles.group, flex: '0 0 200px'}}>
                                <label style={styles.label}>Tipo de Documento</label>
                                <select 
                                    style={styles.input}
                                    value={formData.documentType}
                                    onChange={e => setFormData({...formData, documentType: e.target.value})}
                                >
                                    <option value="informe">Informe</option>
                                    <option value="acta">Acta</option>
                                    <option value="portada">Portada</option>
                                    <option value="atestado">Atestado</option>
                                    <option value="oficio">Oficio</option>
                                    <option value="estadillo">Estadillo</option>
                                </select>
                            </div>
                        </div>

                        <div style={styles.group}>
                            <label style={styles.label}>
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <span>Código HTML de la Plantilla</span>
                                    <span style={{fontSize:'0.75rem', color:'#64748b'}}>Usa {'{{ variable }}'} para campos dinámicos</span>
                                </div>
                            </label>
                            <textarea 
                                style={styles.textarea}
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                placeholder="<html><body>...</body></html>"
                            />
                        </div>
                    </div>

                    <div style={styles.footer}>
                        <button type="button" onClick={closeModal} style={{background:'transparent', border:'1px solid rgba(255,255,255,0.2)', color:'white', padding:'0.6rem 1.2rem', borderRadius:8, cursor:'pointer'}}>Cancelar</button>
                        <button type="submit" disabled={loading} style={{background:'#34d399', border:'none', color:'#064e3b', fontWeight:600, padding:'0.6rem 1.2rem', borderRadius:8, cursor:'pointer', display:'flex', gap:8, alignItems:'center'}}>
                            {loading ? <Loader className="spin" size={18}/> : <Save size={18}/>}
                            Guardar Plantilla
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}