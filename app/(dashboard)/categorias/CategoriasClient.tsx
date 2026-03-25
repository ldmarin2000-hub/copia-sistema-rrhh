"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { traducirError } from '@/lib/errores'

type Categoria = {
  id: number
  id_empresa: number
  id_convenio: number
  id_tipo_empleado: number
  codigo: string
  descripcion: string
  sueldo_basico: number
  activo: boolean
  convenios: { descripcion: string }
  tipos_empleado: { descripcion: string }
  id_plantilla?: number
}

type Convenio = {
  id: number
  id_empresa: number
  descripcion: string
}

type TipoEmpleado = {
  id: number
  id_empresa: number
  descripcion: string
}

type Plantilla = {
  id: number
  id_empresa: number
  nombre: string
}


export default function CategoriasClient({
  categorias, convenios, tipos, plantillas
}: {
  categorias: Categoria[]
  convenios: Convenio[]
  tipos: TipoEmpleado[]
  plantillas: Plantilla[]
}) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [idConvenio, setIdConvenio] = useState('')
  const [idTipo, setIdTipo] = useState('')
  const [sueldoBasico, setSueldoBasico] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activo, setActivo] = useState(true)
  const [idPlantilla, setIdPlantilla] = useState('')

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

  const [busqueda, setBusqueda] = useState('')
  type SortCol = 'codigo' | 'descripcion' | 'convenio' | 'tipo' | 'sueldo_basico'
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
  const categoriasFiltradas = categorias.filter(c => c.id_empresa === empresaActiva?.id)
    .filter(c =>
      c.codigo.toLowerCase().includes(b) ||
      c.descripcion.toLowerCase().includes(b) ||
      c.convenios.descripcion.toLowerCase().includes(b) ||
      c.tipos_empleado.descripcion.toLowerCase().includes(b)
    )
    .sort((a, z) => {
      const getVal = (x: typeof a) => {
        if (sortCol === 'convenio') return x.convenios.descripcion.toLowerCase()
        if (sortCol === 'tipo') return x.tipos_empleado.descripcion.toLowerCase()
        if (sortCol === 'sueldo_basico') return String(x.sueldo_basico).padStart(12, '0')
        return (x[sortCol as 'codigo' | 'descripcion'] || '').toLowerCase()
      }
      const va = getVal(a), vz = getVal(z)
      return sortDir === 'asc' ? va.localeCompare(vz) : vz.localeCompare(va)
    })
  const conveniosFiltrados = convenios.filter(c => c.id_empresa === empresaActiva?.id)
  const tiposFiltrados = tipos.filter(t => t.id_empresa === empresaActiva?.id)

  function abrirNuevo() {
    setEditando(null)
    setCodigo('')
    setDescripcion('')
    setIdConvenio('')
    setIdTipo('')
    setSueldoBasico('0')
    setError('')
    setMostrarForm(true)
    setActivo(true)
    const [idPlantilla, setIdPlantilla] = useState('')
  }

  function abrirEditar(cat: Categoria) {
    setEditando(cat)
    setCodigo(cat.codigo)
    setDescripcion(cat.descripcion)
    setIdConvenio(String(cat.id_convenio))
    setIdTipo(String(cat.id_tipo_empleado))
    setSueldoBasico(String(cat.sueldo_basico))
    setError('')
    setMostrarForm(true)
    setActivo(cat.activo)
    setIdPlantilla(cat.id_plantilla ? String(cat.id_plantilla) : '')
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

    const datos = {
      codigo,
      descripcion,
      id_convenio: parseInt(idConvenio),
      id_tipo_empleado: parseInt(idTipo),
      sueldo_basico: parseFloat(sueldoBasico) || 0,
      activo,
      id_plantilla: idPlantilla ? parseInt(idPlantilla) : null,
    }

    if (editando) {
      const { error } = await supabase
        .from('categorias').update(datos).eq('id', editando.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('categorias').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(cat: Categoria) {
    if (!confirm(`¿Eliminar categoría "${cat.descripcion}"?`)) return
    const supabase = createClient()
    const { error } = await supabase
      .from('categorias').delete().eq('id', cat.id)
    if (error) {
      alert('No se puede eliminar: ' + traducirError(error.message))
    } else {
      router.refresh()
    }
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
            borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
                  {editando ? 'Editar categoría' : 'Nueva categoría'}
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
                    placeholder="Ej: OF1"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Sueldo básico</label>
                  <input
                    type="number"
                    value={sueldoBasico}
                    onChange={(e) => setSueldoBasico(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Descripción *</label>
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Oficial 1ra"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Convenio *</label>
                <select value={idConvenio} onChange={(e) => setIdConvenio(e.target.value)} style={selectStyle}>
                  <option value="">Seleccionar...</option>
                  {conveniosFiltrados.map(c => (
                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Tipo de empleado *</label>
                <select value={idTipo} onChange={(e) => setIdTipo(e.target.value)} style={selectStyle}>
                  <option value="">Seleccionar...</option>
                  {tiposFiltrados.map(t => (
                    <option key={t.id} value={t.id}>{t.descripcion}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Plantilla de jornada</label>
                <select value={idPlantilla} onChange={(e) => setIdPlantilla(e.target.value)} style={selectStyle}>
                  <option value="">Sin plantilla</option>
                  {plantillas.filter(p => p.id_empresa === empresaActiva?.id).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="activo"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label htmlFor="activo" style={{ fontSize: '13px', color: '#8b949e', cursor: 'pointer' }}>
                  Categoría activa
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
                disabled={loading || !codigo || !descripcion || !idConvenio || !idTipo}
                style={{
                  background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px',
                  fontSize: '13px', cursor: 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Categorías</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {categoriasFiltradas.length} categoría{categoriasFiltradas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          + Nueva categoría
        </button>
      </div>

      {/* Buscar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código, descripción, convenio..."
          style={{
            width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
            background: '#161b22', border: '0.5px solid #30363d',
            color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
          }}
        />
      </div>

      {/* Tabla */}
      {categoriasFiltradas.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay categorías para {empresaActiva.razon_social}.
        </div>
      ) : (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {([['Código','codigo'],['Descripción','descripcion'],['Convenio','convenio'],['Tipo','tipo'],['Básico','sueldo_basico']] as [string,SortCol][]).map(([label, col]) => (
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
              {categoriasFiltradas.map((cat, i) => (
                <tr key={cat.id} style={{
                  borderBottom: i < categoriasFiltradas.length - 1 ? '0.5px solid #21262d' : 'none',
                }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: '#21262d', color: '#e6edf3',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>{cat.codigo}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{cat.descripcion}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{cat.convenios.descripcion}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{cat.tipos_empleado.descripcion}</td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3' }}>
                    ${cat.sueldo_basico.toLocaleString('es-AR')}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: cat.activo ? '#1a3a2a' : '#3a1a1a',
                      color: cat.activo ? '#3fb950' : '#f85149',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      {cat.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => abrirEditar(cat)} style={{
                      background: 'transparent', border: 'none',
                      color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Editar</button>
                    <button onClick={() => eliminar(cat)} style={{
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