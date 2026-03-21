"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { X, Plus } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type Vacacion = {
  id: number
  fecha_desde: string
  fecha_hasta: string
  observacion?: string
}

type Props = {
  idLegajo: number
  idEmpresa: number
  vacaciones: Vacacion[]
}

export default function VacacionesTab({ idLegajo, idEmpresa, vacaciones }: Props) {
  const router = useRouter()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Vacacion | null>(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [observacion, setObservacion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px'
  }

  function getDias(): number {
    if (!fechaDesde || !fechaHasta) return 0
    const desde = new Date(fechaDesde + 'T00:00:00')
    const hasta = new Date(fechaHasta + 'T00:00:00')
    const diff = Math.floor((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }

  function abrirNuevo() {
    setEditando(null)
    setFechaDesde('')
    setFechaHasta('')
    setObservacion('')
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(v: Vacacion) {
    setEditando(v)
    setFechaDesde(v.fecha_desde)
    setFechaHasta(v.fecha_hasta)
    setObservacion(v.observacion || '')
    setError('')
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
  }

  async function guardar() {
    if (!fechaDesde || !fechaHasta) {
      setError('Completá las fechas.')
      return
    }
    if (fechaHasta < fechaDesde) {
      setError('La fecha hasta no puede ser menor a la fecha desde.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()

    const datos = {
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      observacion: observacion || null,
    }

    if (editando) {
      const { error } = await supabase
        .from('vacaciones_periodo').update(datos).eq('id', editando.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('vacaciones_periodo').insert({
          ...datos,
          id_empresa: idEmpresa,
          id_legajo: idLegajo,
        })
      if (error) { setError(error.message); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(v: Vacacion) {
    if (!confirm(`¿Eliminar vacaciones del ${formatFecha(v.fecha_desde)} al ${formatFecha(v.fecha_hasta)}?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('vacaciones_periodo').delete().eq('id', v.id)
    if (error) alert('No se puede eliminar: ' + error.message)
    else router.refresh()
  }

  return (
    <>
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#161b22', border: '0.5px solid #30363d',
            borderRadius: '10px', width: '100%', maxWidth: '420px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>
                {editando ? 'Editar vacaciones' : 'Registrar vacaciones'}
              </h2>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Desde *</label>
                  <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hasta *</label>
                  <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {fechaDesde && fechaHasta && getDias() > 0 && (
                <p style={{ fontSize: '12px', color: '#58a6ff', margin: 0 }}>
                  {getDias()} día{getDias() !== 1 ? 's' : ''} de vacaciones
                </p>
              )}

              <div>
                <label style={labelStyle}>Observación</label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Opcional..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>

              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{
                background: 'transparent', border: '0.5px solid #30363d',
                color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={guardar} disabled={loading} style={{
                background: '#2563eb', color: 'white', border: 'none',
                borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: '#8b949e', margin: 0 }}>
          {vacaciones.length} período{vacaciones.length !== 1 ? 's' : ''} registrado{vacaciones.length !== 1 ? 's' : ''}
        </p>
        <button onClick={abrirNuevo} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 14px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          <Plus size={14} />
          Registrar vacaciones
        </button>
      </div>

      {vacaciones.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay vacaciones registradas.
        </div>
      ) : (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {['Desde', 'Hasta', 'Días', 'Observación'].map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                ))}
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {vacaciones.map((v, i) => {
                const desde = new Date(v.fecha_desde + 'T00:00:00')
                const hasta = new Date(v.fecha_hasta + 'T00:00:00')
                const dias = Math.floor((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
                return (
                  <tr key={v.id} style={{ borderBottom: i < vacaciones.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{formatFecha(v.fecha_desde)}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(v.fecha_hasta)}</td>
                    <td style={{ padding: '10px 16px', color: '#58a6ff', fontWeight: 500 }}>{dias}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{v.observacion || '—'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button onClick={() => abrirEditar(v)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
                      <button onClick={() => eliminar(v)} style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Eliminar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}