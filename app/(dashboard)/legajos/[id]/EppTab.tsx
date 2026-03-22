"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Plus } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type EppEntrega = {
  id: number
  id_epp: number
  fecha_entrega: string
  cantidad: number
  talle?: string
  fecha_vencimiento?: string
  firmado: boolean
  devuelto: boolean
  fecha_devolucion?: string
  observaciones?: string
  epp_catalogo: { descripcion: string, tiene_vencimiento: boolean }
  obras?: { nombre: string }
}

type EppCatalogo = {
  id: number
  descripcion: string
  tiene_vencimiento: boolean
  meses_renovacion?: number
  requiere_talle: boolean
}

type Obra = {
  id: number
  nombre: string
}

type Props = {
  idLegajo: number
  idEmpresa: number
  entregas: EppEntrega[]
  catalogo: EppCatalogo[]
  obras: Obra[]
}

export default function EppTab({ idLegajo, idEmpresa, entregas, catalogo, obras }: Props) {
  const router = useRouter()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [idEpp, setIdEpp] = useState('')
  const [idObra, setIdObra] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().split('T')[0])
  const [cantidad, setCantidad] = useState('1')
  const [talle, setTalle] = useState('')
  const [firmado, setFirmado] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  const selectStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

  const labelStyle = {
    fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px'
  }

  const hoy = new Date().toISOString().split('T')[0]
  const eppSeleccionado = catalogo.find(c => c.id === parseInt(idEpp))

  function cerrar() {
    setMostrarForm(false)
    setIdEpp(''); setIdObra(''); setTalle('')
    setFechaEntrega(new Date().toISOString().split('T')[0])
    setCantidad('1'); setFirmado(false); setObservaciones('')
    setError('')
  }

  async function guardar() {
    if (!idEpp) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let fechaVencimiento = null
    if (eppSeleccionado?.tiene_vencimiento && eppSeleccionado.meses_renovacion) {
      const d = new Date(fechaEntrega + 'T00:00:00')
      d.setMonth(d.getMonth() + eppSeleccionado.meses_renovacion)
      fechaVencimiento = d.toISOString().split('T')[0]
    }

    const { error } = await supabase.from('epp_entregas').insert({
      id_empresa: idEmpresa,
      id_legajo: idLegajo,
      id_epp: parseInt(idEpp),
      id_obra: idObra ? parseInt(idObra) : null,
      fecha_entrega: fechaEntrega,
      cantidad: parseInt(cantidad) || 1,
      talle: talle || null,
      fecha_vencimiento: fechaVencimiento,
      firmado,
      observaciones: observaciones || null,
      id_entregado_por: user?.id || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function marcarDevuelto(entrega: EppEntrega) {
    if (!confirm(`¿Marcar como devuelto "${entrega.epp_catalogo.descripcion}"?`)) return
    const supabase = createClient()
    await supabase.from('epp_entregas').update({
      devuelto: true,
      fecha_devolucion: new Date().toISOString().split('T')[0],
    }).eq('id', entrega.id)
    router.refresh()
  }

  const activas = entregas.filter(e => !e.devuelto)
  const devueltas = entregas.filter(e => e.devuelto)

  return (
    <>
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 20px' }}>Nueva entrega EPP</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Item EPP *</label>
                <select value={idEpp} onChange={(e) => setIdEpp(e.target.value)} style={selectStyle}>
                  <option value="">Seleccionar...</option>
                  {catalogo.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Fecha entrega</label>
                  <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cantidad</label>
                  <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} min="1" style={inputStyle} />
                </div>
              </div>
              {eppSeleccionado?.requiere_talle && (
                <div>
                  <label style={labelStyle}>Talle</label>
                  <input value={talle} onChange={(e) => setTalle(e.target.value)} placeholder="Ej: XL" style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Obra</label>
                <select value={idObra} onChange={(e) => setIdObra(e.target.value)} style={selectStyle}>
                  <option value="">Sin obra</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              {eppSeleccionado?.tiene_vencimiento && eppSeleccionado.meses_renovacion && (
                <p style={{ fontSize: '12px', color: '#58a6ff', margin: 0 }}>
                  Vence en {eppSeleccionado.meses_renovacion} meses desde la entrega
                </p>
              )}
              <div>
                <label style={labelStyle}>Observaciones</label>
                <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={firmado} onChange={(e) => setFirmado(e.target.checked)} />
                <label style={{ fontSize: '13px', color: '#8b949e' }}>Firmado por el empleado</label>
              </div>
              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} disabled={loading || !idEpp} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Guardando...' : 'Registrar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: '#8b949e', margin: 0 }}>
          {activas.length} item{activas.length !== 1 ? 's' : ''} activo{activas.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setMostrarForm(true)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer',
        }}>
          <Plus size={14} />
          Nueva entrega
        </button>
      </div>

      {entregas.length === 0 ? (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
          No hay entregas registradas.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activas.length > 0 && (
            <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #30363d' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>EPP activo</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                    {['Item', 'Entrega', 'Vence', 'Cant.', 'Talle', 'Firmado'].map(col => (
                      <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                    ))}
                    <th style={{ padding: '10px 16px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {activas.map((e, i) => {
                    const vencido = e.fecha_vencimiento && e.fecha_vencimiento < hoy
                    const porVencer = e.fecha_vencimiento && !vencido &&
                      e.fecha_vencimiento <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    return (
                      <tr key={e.id} style={{ borderBottom: i < activas.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                        <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{e.epp_catalogo.descripcion}</td>
                        <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(e.fecha_entrega)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          {e.fecha_vencimiento ? (
                            <span style={{ color: vencido ? '#f85149' : porVencer ? '#d29922' : '#8b949e' }}>
                              {formatFecha(e.fecha_vencimiento)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', color: '#8b949e' }}>{e.cantidad}</td>
                        <td style={{ padding: '10px 16px', color: '#8b949e' }}>{e.talle || '—'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          {e.firmado ? (
                            <span style={{ background: '#1a3a2a', color: '#3fb950', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Sí</span>
                          ) : (
                            <span style={{ background: '#3a2f1a', color: '#d29922', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Pendiente</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <button onClick={() => marcarDevuelto(e)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Devuelto</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}


          {devueltas.length > 0 && (
            <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #30363d' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#8b949e', margin: 0 }}>Historial de devoluciones</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                    {['Item', 'Entrega', 'Devolución', 'Cant.'].map(col => (
                      <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devueltas.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: i < devueltas.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>{e.epp_catalogo.descripcion}</td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(e.fecha_entrega)}</td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(e.fecha_devolucion || '')}</td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>{e.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}