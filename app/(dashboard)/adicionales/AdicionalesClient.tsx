"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

type Adicional = {
  id: number
  id_empresa: number
  id_convenio?: number
  codigo: string
  descripcion: string
  porcentaje?: number
  monto_fijo?: number
  aplica_por: string
  activo: boolean
  convenios?: { descripcion: string }
}

type Convenio = {
  id: number
  id_empresa: number
  descripcion: string
}

const APLICA_POR = [
  { value: 'hora',      label: 'Por hora' },
  { value: 'dia',       label: 'Por día' },
  { value: 'quincena',  label: 'Por quincena' },
  { value: 'mes',       label: 'Por mes' },
]

export default function AdicionalesClient({
  adicionales, convenios
}: {
  adicionales: Adicional[]
  convenios: Convenio[]
}) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Adicional | null>(null)

  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [idConvenio, setIdConvenio] = useState('')
  const [porcentaje, setPorcentaje] = useState('')
  const [montoFijo, setMontoFijo] = useState('')
  const [aplicaPor, setAplicaPor] = useState('dia')
  const [activo, setActivo] = useState(true)
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

  const [busqueda, setBusqueda] = useState('')
  type SortCol = 'codigo' | 'descripcion' | 'aplica_por'
  const [sortCol, setSortCol] = useState<SortCol>('descripcion')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  const sortIcon = (col: SortCol) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp size={12} style={{ marginLeft: '4px' }} /> : <ChevronDown size={12} style={{ marginLeft: '4px' }} />)
    : <ChevronsUpDown size={12} style={{ marginLeft: '4px', opacity: 0.4 }} />

  const b = busqueda.toLowerCase()
  const adicionalesFiltrados = adicionales.filter(a => a.id_empresa === empresaActiva?.id)
    .filter(a => a.codigo.toLowerCase().includes(b) || a.descripcion.toLowerCase().includes(b))
    .sort((a, z) => {
      const va = a[sortCol].toLowerCase()
      const vz = z[sortCol].toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vz) : vz.localeCompare(va)
    })
  const conveniosFiltrados = convenios.filter(c => c.id_empresa === empresaActiva?.id)

  function abrirNuevo() {
    setEditando(null)
    setCodigo('')
    setDescripcion('')
    setIdConvenio('')
    setPorcentaje('')
    setMontoFijo('')
    setAplicaPor('dia')
    setActivo(true)
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(a: Adicional) {
    setEditando(a)
    setCodigo(a.codigo)
    setDescripcion(a.descripcion)
    setIdConvenio(a.id_convenio ? String(a.id_convenio) : '')
    setPorcentaje(a.porcentaje ? String(a.porcentaje) : '')
    setMontoFijo(a.monto_fijo ? String(a.monto_fijo) : '')
    setAplicaPor(a.aplica_por)
    setActivo(a.activo)
    setError('')
    setMostrarForm(true)
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
      id_convenio: idConvenio ? parseInt(idConvenio) : null,
      porcentaje: porcentaje ? parseFloat(porcentaje) : null,
      monto_fijo: montoFijo ? parseFloat(montoFijo) : null,
      aplica_por: aplicaPor,
      activo,
    }

    if (editando) {
      const { error } = await supabase
        .from('adicionales').update(datos).eq('id', editando.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('adicionales').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(error.message); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(a: Adicional) {
    if (!confirm(`¿Eliminar adicional "${a.descripcion}"?`)) return
    const supabase = createClient()
    const { error } = await supabase
      .from('adicionales').delete().eq('id', a.id)
    if (error) {
      alert('No se puede eliminar: ' + error.message)
    } else {
      router.refresh()
    }
  }

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <>
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 50, overflowY: 'auto', paddingTop: '20px', paddingBottom: '20px',
        }}>
          <div style={{
            background: '#161b22', border: '0.5px solid #30363d',
            borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
                  {editando ? 'Editar adicional' : 'Nuevo adicional'}
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
                  <label style={labelStyle}>Código *</label>
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ej: VIATICO" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Aplica por</label>
                  <select value={aplicaPor} onChange={(e) => setAplicaPor(e.target.value)} style={selectStyle}>
                    {APLICA_POR.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Descripción *</label>
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Viático por traslado" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Convenio (opcional — si aplica solo a un convenio)</label>
                <select value={idConvenio} onChange={(e) => setIdConvenio(e.target.value)} style={selectStyle}>
                  <option value="">Todos los convenios</option>
                  {conveniosFiltrados.map(c => (
                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Porcentaje %</label>
                  <input
                    type="number"
                    value={porcentaje}
                    onChange={(e) => setPorcentaje(e.target.value)}
                    placeholder="Ej: 10.5"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Monto fijo $</label>
                  <input
                    type="number"
                    value={montoFijo}
                    onChange={(e) => setMontoFijo(e.target.value)}
                    placeholder="Ej: 5000"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="activo"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label htmlFor="activo" style={{ fontSize: '13px', color: '#8b949e', cursor: 'pointer' }}>
                  Adicional activo
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
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear adicional'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Adicionales</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {adicionalesFiltrados.length} adicional{adicionalesFiltrados.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          + Nuevo adicional
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
      {adicionalesFiltrados.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay adicionales para {empresaActiva.razon_social}.
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
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Convenio</th>
                <th onClick={() => toggleSort('aplica_por')} style={{
                  textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Aplica por{sortIcon('aplica_por')}</span>
                </th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Valor</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Estado</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {adicionalesFiltrados.map((a, i) => (
                <tr key={a.id} style={{
                  borderBottom: i < adicionalesFiltrados.length - 1 ? '0.5px solid #21262d' : 'none',
                }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: '#21262d', color: '#e6edf3',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>{a.codigo}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{a.descripcion}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {a.convenios?.descripcion || <span style={{ color: '#484f58' }}>Todos</span>}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {APLICA_POR.find(p => p.value === a.aplica_por)?.label || a.aplica_por}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3' }}>
                    {a.porcentaje ? `${a.porcentaje}%` : a.monto_fijo ? `$${a.monto_fijo.toLocaleString('es-AR')}` : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: a.activo ? '#1a3a2a' : '#3a1a1a',
                      color: a.activo ? '#3fb950' : '#f85149',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      {a.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => abrirEditar(a)} style={{
                      background: 'transparent', border: 'none',
                      color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Editar</button>
                    <button onClick={() => eliminar(a)} style={{
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