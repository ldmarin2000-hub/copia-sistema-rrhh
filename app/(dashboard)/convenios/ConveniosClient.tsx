"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { traducirError } from '@/lib/errores'

type Convenio = {
  id: number
  id_empresa: number
  codigo: string
  descripcion: string
  activo: boolean
  empresas: { razon_social: string }
}

export default function ConveniosClient({ convenios }: { convenios: Convenio[] }) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Convenio | null>(null)
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activo, setActivo] = useState(editando?.activo ?? true)

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  const [busqueda, setBusqueda] = useState('')
  type SortCol = 'codigo' | 'descripcion'
  const [sortCol, setSortCol] = useState<SortCol>('descripcion')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  const sortIcon = (col: SortCol) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp size={12} style={{ marginLeft: '4px' }} /> : <ChevronDown size={12} style={{ marginLeft: '4px' }} />)
    : <ChevronsUpDown size={12} style={{ marginLeft: '4px', opacity: 0.4 }} />

  // Filtrar por empresa activa
  const b = busqueda.toLowerCase()
  const conveniosFiltrados = convenios.filter(c => c.id_empresa === empresaActiva?.id)
    .filter(c => c.codigo.toLowerCase().includes(b) || c.descripcion.toLowerCase().includes(b))
    .sort((a, z) => {
      const va = a[sortCol].toLowerCase()
      const vz = z[sortCol].toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vz) : vz.localeCompare(va)
    })

  function abrirNuevo() {
    setEditando(null)
    setCodigo('')
    setDescripcion('')
    setError('')
    setMostrarForm(true)
    setActivo(true)
  }

  function abrirEditar(convenio: Convenio) {
    setEditando(convenio)
    setCodigo(convenio.codigo)
    setDescripcion(convenio.descripcion)
    setError('')
    setMostrarForm(true)
    setActivo(convenio.activo)
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
        .from('convenios')
        .update({ codigo, descripcion, activo })
        .eq('id', editando.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('convenios')
        .insert({ id_empresa: empresaActiva.id, codigo, descripcion, activo })
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(convenio: Convenio) {
    if (!confirm(`¿Eliminar convenio "${convenio.descripcion}"?`)) return
    const supabase = createClient()
    const { error } = await supabase
      .from('convenios').delete().eq('id', convenio.id)
    if (error) {
      alert('No se puede eliminar: ' + traducirError(error.message))
    } else {
      router.refresh()
    }
  }

  if (!empresaActiva) {
    return (
      <div style={{ color: '#8b949e', fontSize: '14px' }}>
        Seleccioná una empresa en el header para ver los convenios.
      </div>
    )
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
                  {editando ? 'Editar convenio' : 'Nuevo convenio'}
                </h2>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>{empresaActiva.razon_social}</span>
              </div>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Código *</label>
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: UOCRA"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Descripción *</label>
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Unión Obrera de la Construcción"
                  style={inputStyle}
                />
              </div>
              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="activo"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              <label htmlFor="activo" style={{ fontSize: '13px', color: '#8b949e', cursor: 'pointer' }}>
                Convenio activo
              </label>
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
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear convenio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Convenios</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {conveniosFiltrados.length} convenio{conveniosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          + Nuevo convenio
        </button>
      </div>

      {/* Buscar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código o descripción..."
          style={{
            width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
            background: '#161b22', border: '0.5px solid #30363d',
            color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
          }}
        />
      </div>

      {/* Tabla */}
      {conveniosFiltrados.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay convenios para {empresaActiva.razon_social}.
        </div>
      ) : (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {([['Código','codigo'],['Descripción','descripcion']] as [string,SortCol][]).map(([label, col]) => (
                  <th key={col} onClick={() => toggleSort(col)} style={{
                    textAlign: 'left', padding: '10px 16px',
                    color: '#8b949e', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>{label}{sortIcon(col)}</span>
                  </th>
                ))}
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Estado</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {conveniosFiltrados.map((convenio, i) => (
                <tr key={convenio.id} style={{
                  borderBottom: i < conveniosFiltrados.length - 1 ? '0.5px solid #21262d' : 'none',
                }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: '#1a2a3a', color: '#58a6ff',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>{convenio.codigo}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{convenio.descripcion}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: convenio.activo ? '#1a3a2a' : '#3a1a1a',
                      color: convenio.activo ? '#3fb950' : '#f85149',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      {convenio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => abrirEditar(convenio)} style={{
                      background: 'transparent', border: 'none',
                      color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Editar</button>
                    <button onClick={() => eliminar(convenio)} style={{
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