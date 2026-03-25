"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { X, Plus } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'
import { traducirError } from '@/lib/errores'

type Ausencia = {
  id: number
  id_tipo_ausencia: number
  fecha_desde: string
  fecha_hasta: string
  observacion?: string
  certificado_path?: string
  tipos_ausencia: { descripcion: string, requiere_certificado: boolean }
}

type TipoAusencia = {
  id: number
  descripcion: string
  requiere_certificado: boolean
}

type Props = {
  idLegajo: number
  idEmpresa: number
  ausencias: Ausencia[]
  tiposAusencia: TipoAusencia[]
}

export default function AusenciasTab({ idLegajo, idEmpresa, ausencias, tiposAusencia }: Props) {
  const router = useRouter()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Ausencia | null>(null)
  const [idTipoAusencia, setIdTipoAusencia] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [observacion, setObservacion] = useState('')
  const [formArchivo, setFormArchivo] = useState<File | null>(null)
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

  function abrirNuevo() {
    setEditando(null)
    setIdTipoAusencia('')
    setFechaDesde('')
    setFechaHasta('')
    setObservacion('')
    setFormArchivo(null)
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(a: Ausencia) {
    setEditando(a)
    setIdTipoAusencia(String(a.id_tipo_ausencia))
    setFechaDesde(a.fecha_desde)
    setFechaHasta(a.fecha_hasta)
    setObservacion(a.observacion || '')
    setFormArchivo(null)
    setError('')
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
    setFormArchivo(null)
  }

  function getDias(): number {
    if (!fechaDesde || !fechaHasta) return 0
    const desde = new Date(fechaDesde + 'T00:00:00')
    const hasta = new Date(fechaHasta + 'T00:00:00')
    const diff = Math.floor((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }

  async function guardar() {
    if (!idTipoAusencia || !fechaDesde || !fechaHasta) {
      setError('Completá todos los campos obligatorios.')
      return
    }
    if (fechaHasta < fechaDesde) {
      setError('La fecha hasta no puede ser menor a la fecha desde.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()

    const datos: any = {
      id_tipo_ausencia: parseInt(idTipoAusencia),
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      observacion: observacion || null,
    }

    let savedId: number | null = editando?.id ?? null

    if (editando) {
      const { error } = await supabase.from('ausencias_periodo').update(datos).eq('id', editando.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { data: nueva, error } = await supabase.from('ausencias_periodo').insert({
        ...datos,
        id_empresa: idEmpresa,
        id_legajo: idLegajo,
      }).select('id').single()
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
      savedId = nueva?.id ?? null
    }

    // Subir certificado si hay archivo nuevo
    if (formArchivo && savedId) {
      if (editando?.certificado_path) {
        await supabase.storage.from('documentos').remove([editando.certificado_path])
      }
      const path = `ausencias/${idLegajo}/${Date.now()}_${formArchivo.name}`
      const { error: uploadError } = await supabase.storage.from('documentos').upload(path, formArchivo)
      if (uploadError) {
        setError('Ausencia guardada, pero no se pudo subir el certificado.')
        setLoading(false)
        router.refresh()
        cerrar()
        return
      }
      await supabase.from('ausencias_periodo').update({ certificado_path: path }).eq('id', savedId)
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(a: Ausencia) {
    if (!confirm(`¿Eliminar ausencia del ${formatFecha(a.fecha_desde)} al ${formatFecha(a.fecha_hasta)}?`)) return
    const supabase = createClient()
    if (a.certificado_path) {
      await supabase.storage.from('documentos').remove([a.certificado_path])
    }
    const { error } = await supabase.from('ausencias_periodo').delete().eq('id', a.id)
    if (error) alert('No se puede eliminar: ' + traducirError(error.message))
    else router.refresh()
  }

  async function verCertificado(path: string) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('documentos').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
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
            borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>
                {editando ? 'Editar ausencia' : 'Nueva ausencia'}
              </h2>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tipo de ausencia *</label>
                <select value={idTipoAusencia} onChange={(e) => setIdTipoAusencia(e.target.value)} style={selectStyle}>
                  <option value="">Seleccionar...</option>
                  {tiposAusencia.map(t => (
                    <option key={t.id} value={t.id}>{t.descripcion}</option>
                  ))}
                </select>
              </div>

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
                  {getDias()} día{getDias() !== 1 ? 's' : ''}
                </p>
              )}

              <div>
                <label style={labelStyle}>Observación</label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ej: Certificado médico Dr. García"
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>

              {tiposAusencia.find(t => t.id === parseInt(idTipoAusencia))?.requiere_certificado && (
                <div>
                  <label style={labelStyle}>
                    Certificado {editando?.certificado_path ? '(subir nuevo reemplaza el anterior)' : '*'}
                  </label>
                  {editando?.certificado_path && !formArchivo && (
                    <button
                      type="button"
                      onClick={() => verCertificado(editando.certificado_path!)}
                      style={{ fontSize: '12px', color: '#58a6ff', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px', display: 'block' }}
                    >
                      Ver certificado actual
                    </button>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setFormArchivo(e.target.files?.[0] ?? null)}
                    style={{ ...inputStyle, padding: '5px 8px' }}
                  />
                </div>
              )}

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
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar ausencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: '#8b949e', margin: 0 }}>
          {ausencias.length} ausencia{ausencias.length !== 1 ? 's' : ''} registrada{ausencias.length !== 1 ? 's' : ''}
        </p>
        <button onClick={abrirNuevo} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 14px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          <Plus size={14} />
          Nueva ausencia
        </button>
      </div>

      {ausencias.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay ausencias registradas.
        </div>
      ) : (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {['Tipo', 'Desde', 'Hasta', 'Días', 'Observación'].map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                ))}
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {ausencias.map((a, i) => {
                const desde = new Date(a.fecha_desde + 'T00:00:00')
                const hasta = new Date(a.fecha_hasta + 'T00:00:00')
                const dias = Math.floor((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
                return (
                  <tr key={a.id} style={{ borderBottom: i < ausencias.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>
                      {a.tipos_ausencia.descripcion}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(a.fecha_desde)}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(a.fecha_hasta)}</td>
                    <td style={{ padding: '10px 16px', color: '#58a6ff' }}>{dias}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{a.observacion || '—'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      {a.certificado_path && (
                        <button
                          onClick={() => verCertificado(a.certificado_path!)}
                          style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#58a6ff', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginRight: '6px' }}
                        >
                          Cert.
                        </button>
                      )}
                      <button onClick={() => abrirEditar(a)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
                      <button onClick={() => eliminar(a)} style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Eliminar</button>
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
