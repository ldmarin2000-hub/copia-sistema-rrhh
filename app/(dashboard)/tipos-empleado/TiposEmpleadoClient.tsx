"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X } from 'lucide-react'

type TipoEmpleado = {
  id: number
  id_empresa: number
  codigo: string
  descripcion: string
  tipo_liquidacion: string
  activo: boolean
  empresas: { razon_social: string }
}

const TIPOS_LIQUIDACION = [
  { value: 'jornal',        label: 'Jornal' },
  { value: 'mensualizado',  label: 'Mensualizado' },
  { value: 'destajo',       label: 'A destajo' },
]

export default function TiposEmpleadoClient({ tipos }: { tipos: TipoEmpleado[] }) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<TipoEmpleado | null>(null)
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipoLiquidacion, setTipoLiquidacion] = useState('jornal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activo, setActivo] = useState(true)

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

  const tiposFiltrados = tipos.filter(t => t.id_empresa === empresaActiva?.id)

  function abrirNuevo() {
    setEditando(null)
    setCodigo('')
    setDescripcion('')
    setTipoLiquidacion('jornal')
    setError('')
    setMostrarForm(true)
    setActivo(true)
  }

  function abrirEditar(tipo: TipoEmpleado) {
    setEditando(tipo)
    setCodigo(tipo.codigo)
    setDescripcion(tipo.descripcion)
    setTipoLiquidacion(tipo.tipo_liquidacion)
    setError('')
    setMostrarForm(true)
    setActivo(tipo.activo)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
  }

  async function guardar() {
    if (!empresaActiva) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    if (editando) {
      const { error } = await supabase
        .from('tipos_empleado')
        .update({ codigo, descripcion, tipo_liquidacion: tipoLiquidacion, activo })
        .eq('id', editando.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('tipos_empleado')
        .insert({ id_empresa: empresaActiva.id, codigo, descripcion, tipo_liquidacion: tipoLiquidacion, activo })
      if (error) { setError(error.message); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(tipo: TipoEmpleado) {
    if (!confirm(`¿Eliminar "${tipo.descripcion}"?`)) return
    const supabase = createClient()
    const { error } = await supabase
      .from('tipos_empleado').delete().eq('id', tipo.id)
    if (error) {
      alert('No se puede eliminar: ' + error.message)
    } else {
      router.refresh()
    }
  }

  const badgeLiquidacion = (tipo: string) => {
    const colores: Record<string, { bg: string, color: string }> = {
      jornal:       { bg: '#1a2a3a', color: '#58a6ff' },
      mensualizado: { bg: '#1a3a2a', color: '#3fb950' },
      destajo:      { bg: '#3a2f1a', color: '#d29922' },
    }
    const c = colores[tipo] || colores.jornal
    return (
      <span style={{
        background: c.bg, color: c.color,
        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
      }}>
        {TIPOS_LIQUIDACION.find(t => t.value === tipo)?.label || tipo}
      </span>
    )
  }

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <>
      {/* Modal */}
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
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
                  {editando ? 'Editar tipo de empleado' : 'Nuevo tipo de empleado'}
                </h2>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>{empresaActiva.razon_social}</span>
              </div>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Código *</label>
                  <input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej: JORN"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Tipo liquidación *</label>
                  <select value={tipoLiquidacion} onChange={(e) => setTipoLiquidacion(e.target.value)} style={selectStyle}>
                    {TIPOS_LIQUIDACION.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Descripción *</label>
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Obrero Jornalizado"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="activo"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label htmlFor="activo" style={{ fontSize: '13px', color: '#8b949e', cursor: 'pointer' }}>
                  Tipo activo
                </label>
              </div>


              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{
                background: 'transparent', border: '0.5px solid #30363d',
                color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button
                onClick={guardar}
                disabled={loading || !codigo || !descripcion}
                style={{
                  background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px',
                  fontSize: '13px', cursor: 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear tipo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Tipos de Empleado</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {tiposFiltrados.length} tipo{tiposFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          + Nuevo tipo
        </button>
      </div>

      {/* Tabla */}
      {tiposFiltrados.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay tipos de empleado para {empresaActiva.razon_social}.
        </div>
      ) : (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {['Código', 'Descripción', 'Liquidación', 'Estado'].map(col => (
                  <th key={col} style={{
                    textAlign: 'left', padding: '10px 16px',
                    color: '#8b949e', fontWeight: 500,
                  }}>{col}</th>
                ))}
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {tiposFiltrados.map((tipo, i) => (
                <tr key={tipo.id} style={{
                  borderBottom: i < tiposFiltrados.length - 1 ? '0.5px solid #21262d' : 'none',
                }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: '#21262d', color: '#e6edf3',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>{tipo.codigo}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{tipo.descripcion}</td>
                  <td style={{ padding: '10px 16px' }}>{badgeLiquidacion(tipo.tipo_liquidacion)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: tipo.activo ? '#1a3a2a' : '#3a1a1a',
                      color: tipo.activo ? '#3fb950' : '#f85149',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      {tipo.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => abrirEditar(tipo)} style={{
                      background: 'transparent', border: 'none',
                      color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Editar</button>
                    <button onClick={() => eliminar(tipo)} style={{
                      background: 'transparent', border: 'none',
                      color: '#f85149', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}