import React, { useState, useEffect } from 'react';
import { X, Save, Loader, User, Phone, MapPin, Calendar, Info } from 'react-feather';
import { useCollectionStore } from '../../../store/collectionStore';

// Estilos del Modal (Glassmorphism)
const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    content: {
        background: 'rgba(30, 41, 59, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        width: '95%', maxWidth: '700px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'white'
    },
    header: {
        padding: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    title: { margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' },
    closeBtn: { background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' },
    body: { padding: '2rem' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
    fullWidth: { gridColumn: '1 / -1' },
    label: { display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a0aec0', fontWeight: 500 },
    input: {
        width: '100%', padding: '0.75rem',
        background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px', color: 'white', fontSize: '0.95rem',
        outline: 'none', transition: 'border-color 0.2s'
    },
    footer: {
        padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(0,0,0,0.2)'
    },
    btnCancel: {
        padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
        color: 'white', borderRadius: '8px', cursor: 'pointer'
    },
    btnSave: {
        padding: '0.75rem 1.5rem', background: '#34d399', border: 'none',
        color: '#064e3b', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px'
    }
};

export default function PersonModal({ isOpen, onClose, initialData }) {
    const { addItem, updateItem } = useCollectionStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: '', nombre: '', apellidos: '', mote: '', telefono: '', fechaNacimiento: '', domicilio: ''
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                id: initialData.id || '',
                nombre: initialData.nombre || '',
                apellidos: initialData.apellidos || '',
                mote: initialData.mote || '',
                telefono: initialData.telefono || '',
                fechaNacimiento: initialData.fechaNacimiento ? new Date(initialData.fechaNacimiento.seconds * 1000 || initialData.fechaNacimiento).toISOString().split('T')[0] : '',
                domicilio: initialData.domicilioCompleto || ''
            });
        } else if (isOpen) {
            setFormData({ id: '', nombre: '', apellidos: '', mote: '', telefono: '', fechaNacimiento: '', domicilio: '' });
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const docId = formData.id.trim().toUpperCase();
        if (!docId) return setLoading(false);

        const payload = {
            nombre: formData.nombre,
            apellidos: formData.apellidos,
            mote: formData.mote,
            telefono: formData.telefono,
            fechaNacimiento: formData.fechaNacimiento ? new Date(formData.fechaNacimiento) : null,
            domicilioCompleto: formData.domicilio
        };

        const result = initialData 
            ? await updateItem('personas', docId, payload)
            : await addItem('personas', docId, payload);

        setLoading(false);
        if (result.success) onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.content} className="fade-in-up">
                <div style={styles.header}>
                    <h3 style={styles.title}>
                        <User size={20} color="#34d399"/> 
                        {initialData ? 'Editar Ficha' : 'Nueva Ficha Policial'}
                    </h3>
                    <button style={styles.closeBtn} onClick={onClose}><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div style={styles.body}>
                        <div style={styles.grid}>
                            {/* DNI - Ocupa ancho completo si es nuevo para destacar */}
                            <div style={styles.fullWidth}>
                                <label style={styles.label}>DNI / NIE / Pasaporte *</label>
                                <input 
                                    style={{...styles.input, borderColor: '#34d399', background: 'rgba(52, 211, 153, 0.1)'}}
                                    type="text" 
                                    value={formData.id} 
                                    onChange={e => setFormData({...formData, id: e.target.value.toUpperCase()})}
                                    readOnly={!!initialData}
                                    placeholder="12345678X"
                                    required 
                                />
                            </div>

                            <div>
                                <label style={styles.label}>Nombre</label>
                                <input style={styles.input} type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                            </div>
                            <div>
                                <label style={styles.label}>Apellidos</label>
                                <input style={styles.input} type="text" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
                            </div>

                            <div>
                                <label style={styles.label}><Info size={12}/> Alias / Mote</label>
                                <input style={styles.input} type="text" value={formData.mote} onChange={e => setFormData({...formData, mote: e.target.value})} placeholder="Ej: El Rubio" />
                            </div>
                            <div>
                                <label style={styles.label}><Phone size={12}/> Teléfono</label>
                                <input style={styles.input} type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                            </div>

                            <div>
                                <label style={styles.label}><Calendar size={12}/> Fecha Nacimiento</label>
                                <input style={styles.input} type="date" value={formData.fechaNacimiento} onChange={e => setFormData({...formData, fechaNacimiento: e.target.value})} />
                            </div>

                            <div style={styles.fullWidth}>
                                <label style={styles.label}><MapPin size={12}/> Domicilio Completo</label>
                                <textarea 
                                    style={{...styles.input, resize: 'vertical', minHeight: '80px'}}
                                    value={formData.domicilio} 
                                    onChange={e => setFormData({...formData, domicilio: e.target.value})}
                                    placeholder="Calle, número, piso, localidad..."
                                />
                            </div>
                        </div>
                    </div>

                    <div style={styles.footer}>
                        <button type="button" style={styles.btnCancel} onClick={onClose}>Cancelar</button>
                        <button type="submit" style={styles.btnSave} disabled={loading}>
                            {loading ? <Loader className="spin" size={18} /> : <Save size={18} />}
                            Guardar Ficha
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}