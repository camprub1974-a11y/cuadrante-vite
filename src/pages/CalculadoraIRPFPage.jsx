// Archivo: /src/pages/CalculadoraIRPFPage.jsx

import React, { useState, useEffect } from 'react';
// 💡 CORRECCIÓN: Quitamos 'Calculator' y añadimos 'Hash'
import { ArrowLeft, DollarSign, Plus, Trash2, AlertTriangle, TrendingUp, Info, Hash, ChevronDown, ChevronUp } from 'react-feather';
import { useNavigate } from 'react-router-dom';
import { calcularSituacionIRPF } from '../js/utils/irpfAndalucia';

// TABLAS SALARIALES FUNCIONARIOS 2024/25 (Aprox. Estado)
// Base Mensual y Valor Trienio
const TABLAS_SALARIALES = {
    'A1': { base: 1294.60, trienio: 49.83 },
    'A2': { base: 1119.42, trienio: 40.63 },
    'B':  { base: 978.86,  trienio: 35.65 },
    'C1': { base: 840.49,  trienio: 30.76 },
    'C2': { base: 699.52,  trienio: 20.94 },
    'E':  { base: 640.25,  trienio: 15.76 }
};

export default function CalculadoraIRPFPage() {
  const navigate = useNavigate();
  
  // --- ESTADO DEL DESGLOSE DE NÓMINA ---
  const [showDesglose, setShowDesglose] = useState(true);
  const [grupo, setGrupo] = useState('C1');
  const [numTrienios, setNumTrienios] = useState(0);
  
  // Conceptos Mensuales
  const [sueldoBaseMensual, setSueldoBaseMensual] = useState(TABLAS_SALARIALES['C1'].base);
  const [trieniosMensual, setTrieniosMensual] = useState(0);
  const [cDestinoMensual, setCDestinoMensual] = useState('');
  const [cEspecificoMensual, setCEspecificoMensual] = useState('');
  const [otrosFijosMensual, setOtrosFijosMensual] = useState('');

  // Estado General
  const [sueldoFijoAnual, setSueldoFijoAnual] = useState(0);
  const [extras, setExtras] = useState([]);
  const [nuevoExtraConcepto, setNuevoExtraConcepto] = useState('');
  const [nuevoExtraMonto, setNuevoExtraMonto] = useState('');
  const [resultado, setResultado] = useState(null);

  // 1. EFECTO: Actualizar valores base al cambiar de Grupo
  useEffect(() => {
      if (TABLAS_SALARIALES[grupo]) {
          setSueldoBaseMensual(TABLAS_SALARIALES[grupo].base);
          setTrieniosMensual((TABLAS_SALARIALES[grupo].trienio * numTrienios).toFixed(2));
      }
  }, [grupo, numTrienios]);

  // 2. EFECTO: Calcular Bruto Anual Fijo (x14 Pagas)
  useEffect(() => {
      const base = parseFloat(sueldoBaseMensual) || 0;
      const trienios = parseFloat(trieniosMensual) || 0;
      const destino = parseFloat(cDestinoMensual) || 0;
      const especifico = parseFloat(cEspecificoMensual) || 0;
      const otros = parseFloat(otrosFijosMensual) || 0;

      // Nómina Mensual
      const mensual = base + trienios + destino + especifico + otros;
      
      // Cálculo Anual (12 mensualidades + 2 Extras completas)
      // Nota: En muchos ayuntamientos la paga extra incluye: Base + Trienios + Destino + Específico (o parte)
      // Asumimos 14 pagas iguales para el fijo, que es lo estándar para simplificar.
      const anual = mensual * 14;

      setSueldoFijoAnual(anual);

  }, [sueldoBaseMensual, trieniosMensual, cDestinoMensual, cEspecificoMensual, otrosFijosMensual]);

  // 3. EFECTO PRINCIPAL: Calcular IRPF
  useEffect(() => {
    const calculo = calcularSituacionIRPF({ sueldoFijo: sueldoFijoAnual, extras });
    setResultado(calculo);
  }, [sueldoFijoAnual, extras]);

  const handleAddExtra = (e) => {
    e.preventDefault();
    if (!nuevoExtraConcepto || !nuevoExtraMonto) return;
    setExtras([...extras, { id: Date.now(), concept: nuevoExtraConcepto, amount: parseFloat(nuevoExtraMonto) }]);
    setNuevoExtraConcepto('');
    setNuevoExtraMonto('');
  };

  const removeExtra = (id) => {
    setExtras(extras.filter(e => e.id !== id));
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="view-container" style={{ padding: '1.5rem', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
      
      {/* HEADER */}
      <div className="view-header" style={{marginBottom: '2rem', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div className="view-title" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px'}}>
              <TrendingUp size={28} className="text-accent" style={{color: '#fbbf24'}} />
          </div>
          <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: 'white' }}>Simulador Retención IRPF</h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Estimación 2025 (Estado + Andalucía)</p>
          </div>
        </div>
        <button className="button button-secondary" onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> Volver
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
          
          {/* COLUMNA IZQUIERDA: DATOS */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              
              {/* 1. CALCULADORA DE SUELDO FIJO */}
              <div className="card">
                  <div className="card-header" style={{display:'flex', justifyContent:'space-between', cursor:'pointer'}} onClick={() => setShowDesglose(!showDesglose)}>
                      <h3 style={{display:'flex', alignItems:'center', gap:'10px'}}>
                          {/* 💡 Icono sustituido */}
                          <Hash size={18} /> Configurar Nómina Fija
                      </h3>
                      {showDesglose ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                  </div>
                  
                  {showDesglose && (
                    <div className="card-body" style={{background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem'}}>
                            <div className="form-group">
                                <label className="form-label">Grupo</label>
                                <select className="selector w-100" value={grupo} onChange={e => setGrupo(e.target.value)}>
                                    {Object.keys(TABLAS_SALARIALES).map(g => <option key={g} value={g} style={{color:'black'}}>{g}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nº Trienios</label>
                                <input type="number" className="input w-100" value={numTrienios} onChange={e => setNumTrienios(e.target.value)} min="0" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Conceptos Mensuales (Brutos)</label>
                            <div style={{display:'grid', gap:'10px'}}>
                                <div className="input-group" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontSize:'0.9rem', opacity:0.7}}>Sueldo Base:</span>
                                    <input type="number" className="input" style={{width:'120px', textAlign:'right'}} value={sueldoBaseMensual} onChange={e => setSueldoBaseMensual(e.target.value)} />
                                </div>
                                <div className="input-group" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontSize:'0.9rem', opacity:0.7}}>Antigüedad (Trienios):</span>
                                    <input type="number" className="input" style={{width:'120px', textAlign:'right'}} value={trieniosMensual} readOnly />
                                </div>
                                <div className="input-group" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontSize:'0.9rem', opacity:0.7}}>Complem. Destino:</span>
                                    <input type="number" className="input" style={{width:'120px', textAlign:'right'}} value={cDestinoMensual} onChange={e => setCDestinoMensual(e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="input-group" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontSize:'0.9rem', opacity:0.7}}>Complem. Específico:</span>
                                    <input type="number" className="input" style={{width:'120px', textAlign:'right'}} value={cEspecificoMensual} onChange={e => setCEspecificoMensual(e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="input-group" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontSize:'0.9rem', opacity:0.7}}>Otros Fijos:</span>
                                    <input type="number" className="input" style={{width:'120px', textAlign:'right'}} value={otrosFijosMensual} onChange={e => setOtrosFijosMensual(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                        </div>
                        
                        <div style={{marginTop:'1rem', padding:'0.5rem', background:'rgba(16, 185, 129, 0.1)', borderRadius:'8px', fontSize:'0.9rem', display:'flex', justifyContent:'space-between'}}>
                            <span>Bruto Mensual:</span>
                            <strong>{formatCurrency((parseFloat(sueldoBaseMensual)||0) + (parseFloat(trieniosMensual)||0) + (parseFloat(cDestinoMensual)||0) + (parseFloat(cEspecificoMensual)||0) + (parseFloat(otrosFijosMensual)||0))}</strong>
                        </div>
                    </div>
                  )}

                  {/* Resumen Total Fijo */}
                  <div className="card-body">
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div>
                            <h4 style={{margin:0, color:'white'}}>Total Bruto Fijo Anual</h4>
                            <span style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.5)'}}>
                                Calculado en base a 14 pagas
                            </span>
                          </div>
                          <div style={{fontSize:'1.5rem', fontWeight:'bold', color:'var(--color-accent-neon)'}}>
                              {formatCurrency(sueldoFijoAnual)}
                          </div>
                      </div>
                  </div>
              </div>

              {/* 2. EXTRAS Y PRODUCTIVIDAD */}
              <div className="card">
                  <div className="card-header">
                      <h3>Variables y Productividad (Previstas)</h3>
                  </div>
                  <div className="card-body">
                      {/* Lista de Extras */}
                      <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem'}}>
                          {extras.map(extra => (
                              <div key={extra.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.05)', padding:'10px', borderRadius:'8px'}}>
                                  <span>{extra.concept}</span>
                                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                      <strong style={{color: '#fbbf24'}}>{formatCurrency(extra.amount)}</strong>
                                      <button className="icon-button button-danger" onClick={() => removeExtra(extra.id)} style={{padding: '4px'}}><Trash2 size={14}/></button>
                                  </div>
                              </div>
                          ))}
                          {extras.length === 0 && <p style={{opacity:0.5, fontStyle:'italic', textAlign:'center', padding:'1rem'}}>No hay extras añadidos.</p>}
                      </div>

                      {/* Formulario Añadir */}
                      <form onSubmit={handleAddExtra} style={{display: 'flex', gap: '10px', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'1rem'}}>
                          <input 
                            type="text" className="input" placeholder="Concepto (ej. Elecciones)" style={{flex: 2}}
                            value={nuevoExtraConcepto} onChange={e => setNuevoExtraConcepto(e.target.value)}
                          />
                          <input 
                            type="number" className="input" placeholder="€" style={{flex: 1}}
                            value={nuevoExtraMonto} onChange={e => setNuevoExtraMonto(e.target.value)}
                          />
                          <button type="submit" className="button btn-gradient-success ripple-effect"><Plus size={18}/></button>
                      </form>
                  </div>
                </div>
              </div>

          {/* COLUMNA DERECHA: RESULTADOS */}
          <div>
             {resultado && (
                 <div className="card" style={{height: '100%', border: resultado.alertaSalto ? '2px solid #ef4444' : '1px solid var(--glass-dark-border)'}}>
                     <div className="card-header">
                         <h3>Análisis de Tramo (Marginal)</h3>
                     </div>
                     <div className="card-body" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                         
                         <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                             <div style={{background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px'}}>
                                 <span style={{display:'block', fontSize:'0.8rem', opacity:0.7}}>Bruto Anual Total</span>
                                 <strong style={{fontSize:'1.5rem', color:'white'}}>{formatCurrency(resultado.brutoAnual)}</strong>
                             </div>
                             <div style={{background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px'}}>
                                 <span style={{display:'block', fontSize:'0.8rem', opacity:0.7}}>Base Liquidable (Est.)</span>
                                 <strong style={{fontSize:'1.5rem', color:'white'}}>{formatCurrency(resultado.baseImponible)}</strong>
                             </div>
                         </div>

                         {/* Termómetro Visual */}
                         <div style={{background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', position: 'relative'}}>
                             <h4 style={{margin: '0 0 1rem 0', color: 'var(--color-accent-neon)'}}>Tramo Actual: {resultado.tramoActual.tipo}%</h4>
                             
                             {resultado.tramoSiguiente && (
                                 <div>
                                     <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.8rem', marginBottom:'5px', opacity:0.8}}>
                                         <span>{formatCurrency(resultado.tramoActual.limite)}</span>
                                         <span>{formatCurrency(resultado.tramoActual.hasta)}</span>
                                     </div>
                                     
                                     <div style={{height: '20px', background: '#334155', borderRadius: '10px', overflow: 'hidden', position: 'relative'}}>
                                         <div style={{
                                             height: '100%', 
                                             width: `${Math.min(100, ((resultado.baseImponible - resultado.tramoActual.limite) / (resultado.tramoActual.hasta - resultado.tramoActual.limite)) * 100)}%`,
                                             background: resultado.alertaSalto ? '#ef4444' : 'linear-gradient(90deg, #34d399, #60a5fa)',
                                             transition: 'width 0.5s ease'
                                         }}></div>
                                     </div>

                                     <div style={{marginTop: '1rem', textAlign: 'center'}}>
                                         {resultado.alertaSalto ? (
                                             <div style={{color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                                                 <AlertTriangle/> ¡CUIDADO! A solo {formatCurrency(resultado.distanciaSiguiente)} del salto al {resultado.tramoSiguiente.tipo}%
                                             </div>
                                         ) : (
                                             <div style={{color: '#94a3b8', fontSize: '0.9rem'}}>
                                                 Tienes margen de <strong>{formatCurrency(resultado.distanciaSiguiente)}</strong> antes de subir al {resultado.tramoSiguiente.tipo}%
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             )}
                         </div>

                         <div style={{fontSize: '0.8rem', opacity: 0.6, marginTop: 'auto', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'10px'}}>
                             <Info size={12} style={{marginRight:5}}/>
                             Cálculo aproximado sobre 14 pagas iguales. Si tus pagas extras son diferentes (ej. solo sueldo base + trienios), ajusta el "Otros Fijos" para compensar el total anual.
                         </div>

                     </div>
                 </div>
             )}
          </div>

      </div>
    </div>
  );
}