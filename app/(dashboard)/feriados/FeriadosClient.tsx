"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type Feriado = {
  id: number
  fecha: string
  descripcion: string
  tipo: string
  provincia?: string
  id_convenio?: number
  activo: boolean
  convenios?: { descripcion: string }
}

type FeriadoEmpresa = {
  id: number
  id_empresa: number
  id_feriado: number
  trabaja: boolean
}

type Convenio = {
  id: number
  id_empresa: number
  descripcion: string
}

const TIPOS = [
  { value: 'nacional',             label: 'Nacional' },
  { value: 'no_laborable',         label: 'No laborable' },
  { value: 'provincial_municipal', label: 'Provincial / Municipal' },
  { value: 'sindical',             label: 'Sindical' },
]

const badgeTipo = (tipo: string) => {
  const colores: Record<string, { bg: string, color: string }> = {
    nacional:             { bg: '#1a2a3a', color: '#58a6ff' },
    no_laborable:         { bg: '#21262d', color: '#8b949e' },
    provincial_municipal: { bg: '#2a1a3a', color: '#bc8cff' },
    sindical:             { bg: '#3a2f1a', color: '#d29922' },
  }
  const c = colores[tipo] || colores.nacional
  const label = TIPOS.find(t => t.value === tipo)?.label || tipo
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
    }}>{label}</span>
  )
}

export default function FeriadosClient({
  feriados, convenios, feriadosEmpresa
}: {
  feriados: Feriado[]
  convenios: Convenio[]
  feriadosEmpresa: FeriadoEmpresa[]
}) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Feriado | null>(null)
  const [fecha, setFecha] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState('nacional')
  const [provincia, setProvincia] = useState('')
  const [idConvenio, setIdConvenio] = useState('')
  const [activo, setActivo] = useState(true)
  const [filtroAnio, setFiltroAnio] = useState(String(new Date().getFullYear()))
  const [filtroTipo, setFiltroTipo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trabajaMap, setTrabajaMap] = useState<Record<number, boolean>>(() => {
  const map: Record<number, boolean> = {}
    feriadosEmpresa.forEach(fe => { map[fe.id_feriado] = fe.trabaja })
    return map
  })

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

  const conveniosFiltrados = convenios.filter(c => c.id_empresa === empresaActiva?.id)

  const [busqueda, setBusqueda] = useState('')
  type SortCol = 'fecha' | 'descripcion' | 'tipo'
  const [sortCol, setSortCol] = useState<SortCol>('fecha')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  const sortIcon = (col: SortCol) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp size={12} style={{ marginLeft: '4px' }} /> : <ChevronDown size={12} style={{ marginLeft: '4px' }} />)
    : <ChevronsUpDown size={12} style={{ marginLeft: '4px', opacity: 0.4 }} />

  const busq = busqueda.toLowerCase()
  const feriadosFiltrados = feriados
    .filter(f => filtroAnio ? f.fecha.startsWith(filtroAnio) : true)
    .filter(f => filtroTipo ? f.tipo === filtroTipo : true)
    .filter(f =>
      !busq ||
      f.descripcion.toLowerCase().includes(busq) ||
      (f.provincia || '').toLowerCase().includes(busq) ||
      (f.convenios?.descripcion || '').toLowerCase().includes(busq)
    )
    .sort((a, z) => {
      const va = a[sortCol].toLowerCase()
      const vz = z[sortCol].toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vz) : vz.localeCompare(va)
    })

  const anios = ['2024', '2025', '2026', '2027']

  async function toggleTrabaja(idFeriado: number) {
    if (!empresaActiva) return
    const supabase = createClient()
    const trabajaActual = trabajaMap[idFeriado] || false
    const nuevoValor = !trabajaActual

    const { error } = await supabase
      .from('feriados_empresa')
      .upsert({
        id_empresa: empresaActiva.id,
        id_feriado: idFeriado,
        trabaja: nuevoValor,
      }, { onConflict: 'id_empresa,id_feriado' })

    if (!error) {
      setTrabajaMap(prev => ({ ...prev, [idFeriado]: nuevoValor }))
    }
  }
  function abrirNuevo() {
    setEditando(null)
    setFecha('')
    setDescripcion('')
    setTipo('nacional')
    setProvincia('')
    setIdConvenio('')
    setActivo(true)
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(f: Feriado) {
    setEditando(f)
    setFecha(f.fecha)
    setDescripcion(f.descripcion)
    setTipo(f.tipo)
    setProvincia(f.provincia || '')
    setIdConvenio(f.id_convenio ? String(f.id_convenio) : '')
    setActivo(f.activo)
    setError('')
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
  }

  async function guardar() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const datos = {
      fecha,
      descripcion,
      tipo,
      provincia: tipo === 'provincial_municipal' ? provincia : null,
      id_convenio: tipo === 'sindical' && idConvenio ? parseInt(idConvenio) : null,
      activo,
    }

    if (editando) {
      const { error } = await supabase
        .from('feriados').update(datos).eq('id', editando.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('feriados').insert(datos)
      if (error) { setError(error.message); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(f: Feriado) {
    if (!confirm(`¿Eliminar feriado "${f.descripcion}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('feriados').delete().eq('id', f.id)
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
            borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>
                {editando ? 'Editar feriado' : 'Nuevo feriado'}
              </h2>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={selectStyle}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Descripción *</label>
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Día de la Independencia" style={inputStyle} />
              </div>

              {tipo === 'provincial_municipal' && (
                <div>
                  <label style={labelStyle}>Provincia / Municipio</label>
                  <input value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Ej: Santa Fe" style={inputStyle} />
                </div>
              )}

              {tipo === 'sindical' && (
                <div>
                  <label style={labelStyle}>Convenio</label>
                  <select value={idConvenio} onChange={(e) => setIdConvenio(e.target.value)} style={selectStyle}>
                    <option value="">Seleccionar...</option>
                    {conveniosFiltrados.map(c => (
                      <option key={c.id} value={c.id}>{c.descripcion}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="activo" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                <label htmlFor="activo" style={{ fontSize: '13px', color: '#8b949e', cursor: 'pointer' }}>Activo</label>
              </div>

              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{
                background: 'transparent', border: '0.5px solid #30363d',
                color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={guardar} disabled={loading || !fecha || !descripcion} style={{
                background: '#2563eb', color: 'white', border: 'none',
                borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear feriado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título y filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Feriados</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>{feriadosFiltrados.length} feriados</span>
        </div>
        <button onClick={abrirNuevo} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
        }}>+ Nuevo feriado</button>
      </div>

      {/* Buscar */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por descripción o provincia..."
          style={{
            width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
            background: '#161b22', border: '0.5px solid #30363d',
            color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
          }}
        />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} style={{
          padding: '7px 10px', borderRadius: '6px',
          background: '#161b22', border: '0.5px solid #30363d',
          color: '#e6edf3', fontSize: '13px',
        }}>
          <option value="">Todos los años</option>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{
          padding: '7px 10px', borderRadius: '6px',
          background: '#161b22', border: '0.5px solid #30363d',
          color: filtroTipo ? '#e6edf3' : '#8b949e', fontSize: '13px',
        }}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {feriadosFiltrados.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay feriados cargados para el período seleccionado.
        </div>
      ) : (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {([['Fecha','fecha'],['Descripción','descripcion'],['Tipo','tipo']] as [string,SortCol][]).map(([label, col]) => (
                  <th key={col} onClick={() => toggleSort(col)} style={{
                    textAlign: 'left', padding: '10px 16px',
                    color: '#8b949e', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>{label}{sortIcon(col)}</span>
                  </th>
                ))}
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Provincia / Convenio</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Estado</th>
                <th style={{ padding: '10px 16px' }}></th>
                <th style={{ textAlign: 'center', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Trabaja</th>
              </tr>
            </thead>
            <tbody>
              {feriadosFiltrados.map((f, i) => (
                <tr key={f.id} style={{ borderBottom: i < feriadosFiltrados.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                  <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{formatFecha(f.fecha)}</td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3' }}>{f.descripcion}</td>
                  <td style={{ padding: '10px 16px' }}>{badgeTipo(f.tipo)}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {f.provincia || f.convenios?.descripcion || '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: f.activo ? '#1a3a2a' : '#3a1a1a',
                      color: f.activo ? '#3fb950' : '#f85149',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>{f.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => abrirEditar(f)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
                    <button onClick={() => eliminar(f)} style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Eliminar</button>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={trabajaMap[f.id] || false}
                    onChange={() => toggleTrabaja(f.id)}
                    title="¿La empresa trabaja este día?"
                  />
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