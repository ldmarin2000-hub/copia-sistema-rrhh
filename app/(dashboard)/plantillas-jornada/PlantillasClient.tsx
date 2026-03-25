"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { traducirError } from '@/lib/errores'

type Plantilla = {
  id: number
  id_empresa: number
  id_convenio?: number
  nombre: string
  lunes: number
  martes: number
  miercoles: number
  jueves: number
  viernes: number
  sabado: number
  domingo: number
  lunes_entrada?: string
  lunes_salida?: string
  martes_entrada?: string
  martes_salida?: string
  miercoles_entrada?: string
  miercoles_salida?: string
  jueves_entrada?: string
  jueves_salida?: string
  viernes_entrada?: string
  viernes_salida?: string
  sabado_entrada?: string
  sabado_salida?: string
  domingo_entrada?: string
  domingo_salida?: string
  activo: boolean
  convenios?: { descripcion: string }
}

type Convenio = {
  id: number
  id_empresa: number
  descripcion: string
}

const DIAS = [
  { key: 'lunes',     label: 'Lunes' },
  { key: 'martes',    label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves',    label: 'Jueves' },
  { key: 'viernes',   label: 'Viernes' },
  { key: 'sabado',    label: 'Sábado' },
  { key: 'domingo',   label: 'Domingo' },
]

export default function PlantillasClient({
  plantillas, convenios
}: {
  plantillas: Plantilla[]
  convenios: Convenio[]
}) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Plantilla | null>(null)

  const [nombre, setNombre] = useState('')
  const [idConvenio, setIdConvenio] = useState('')
  const [horas, setHoras] = useState({
    lunes: '9', martes: '9', miercoles: '9',
    jueves: '9', viernes: '8', sabado: '0', domingo: '0'
  })
  const [entradas, setEntradas] = useState({
    lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '', domingo: ''
  })
  const [salidas, setSalidas] = useState({
    lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '', domingo: ''
  })
  const [activo, setActivo] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  const horaInputStyle = {
    width: '60px', padding: '6px 8px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', textAlign: 'center' as const,
  }

  const selectStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

  const [busqueda, setBusqueda] = useState('')
  type SortCol = 'nombre' | 'convenio' | 'total'
  const [sortCol, setSortCol] = useState<SortCol>('nombre')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  const sortIcon = (col: SortCol) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp size={12} style={{ marginLeft: '4px' }} /> : <ChevronDown size={12} style={{ marginLeft: '4px' }} />)
    : <ChevronsUpDown size={12} style={{ marginLeft: '4px', opacity: 0.4 }} />

  const b = busqueda.toLowerCase()
  const plantillasFiltradas = plantillas.filter(p => p.id_empresa === empresaActiva?.id)
    .filter(p =>
      p.nombre.toLowerCase().includes(b) ||
      (p.convenios?.descripcion || '').toLowerCase().includes(b)
    )
    .sort((a, z) => {
      const getVal = (x: typeof a) => {
        if (sortCol === 'convenio') return (x.convenios?.descripcion || '').toLowerCase()
        if (sortCol === 'total') {
          const t = x.lunes + x.martes + x.miercoles + x.jueves + x.viernes + x.sabado + x.domingo
          return String(t).padStart(6, '0')
        }
        return x.nombre.toLowerCase()
      }
      const va = getVal(a), vz = getVal(z)
      return sortDir === 'asc' ? va.localeCompare(vz) : vz.localeCompare(va)
    })
  const conveniosFiltrados = convenios.filter(c => c.id_empresa === empresaActiva?.id)

  const totalHoras = Object.values(horas).reduce((sum, h) => sum + (parseFloat(h) || 0), 0)

  function abrirNuevo() {
    setEditando(null)
    setNombre('')
    setIdConvenio('')
    setHoras({ lunes: '9', martes: '9', miercoles: '9', jueves: '9', viernes: '8', sabado: '0', domingo: '0' })
    setEntradas({ lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '', domingo: '' })
    setSalidas({ lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '', domingo: '' })
    setActivo(true)
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(p: Plantilla) {
    setEditando(p)
    setNombre(p.nombre)
    setIdConvenio(p.id_convenio ? String(p.id_convenio) : '')
    setHoras({
      lunes: String(p.lunes),
      martes: String(p.martes),
      miercoles: String(p.miercoles),
      jueves: String(p.jueves),
      viernes: String(p.viernes),
      sabado: String(p.sabado),
      domingo: String(p.domingo),
    })
    setEntradas({
      lunes: p.lunes_entrada?.substring(0, 5) || '',
      martes: p.martes_entrada?.substring(0, 5) || '',
      miercoles: p.miercoles_entrada?.substring(0, 5) || '',
      jueves: p.jueves_entrada?.substring(0, 5) || '',
      viernes: p.viernes_entrada?.substring(0, 5) || '',
      sabado: p.sabado_entrada?.substring(0, 5) || '',
      domingo: p.domingo_entrada?.substring(0, 5) || '',
    })
    setSalidas({
      lunes: p.lunes_salida?.substring(0, 5) || '',
      martes: p.martes_salida?.substring(0, 5) || '',
      miercoles: p.miercoles_salida?.substring(0, 5) || '',
      jueves: p.jueves_salida?.substring(0, 5) || '',
      viernes: p.viernes_salida?.substring(0, 5) || '',
      sabado: p.sabado_salida?.substring(0, 5) || '',
      domingo: p.domingo_salida?.substring(0, 5) || '',
    })
    setActivo(p.activo)
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
      nombre,
      id_convenio: idConvenio ? parseInt(idConvenio) : null,
      lunes: parseFloat(horas.lunes) || 0,
      martes: parseFloat(horas.martes) || 0,
      miercoles: parseFloat(horas.miercoles) || 0,
      jueves: parseFloat(horas.jueves) || 0,
      viernes: parseFloat(horas.viernes) || 0,
      sabado: parseFloat(horas.sabado) || 0,
      domingo: parseFloat(horas.domingo) || 0,
      activo,
      lunes_entrada: entradas.lunes || null,
      lunes_salida: salidas.lunes || null,
      martes_entrada: entradas.martes || null,
      martes_salida: salidas.martes || null,
      miercoles_entrada: entradas.miercoles || null,
      miercoles_salida: salidas.miercoles || null,
      jueves_entrada: entradas.jueves || null,
      jueves_salida: salidas.jueves || null,
      viernes_entrada: entradas.viernes || null,
      viernes_salida: salidas.viernes || null,
      sabado_entrada: entradas.sabado || null,
      sabado_salida: salidas.sabado || null,
      domingo_entrada: entradas.domingo || null,
      domingo_salida: salidas.domingo || null,
    }

    if (editando) {
      const { error } = await supabase
        .from('plantillas_jornada').update(datos).eq('id', editando.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('plantillas_jornada').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(p: Plantilla) {
    if (!confirm(`¿Eliminar plantilla "${p.nombre}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('plantillas_jornada').delete().eq('id', p.id)
    if (error) alert('No se puede eliminar: ' + traducirError(error.message))
    else router.refresh()
  }

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
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
            borderRadius: '10px', width: '100%', maxWidth: '680px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
                  {editando ? 'Editar plantilla' : 'Nueva plantilla'}
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
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Nombre *</label>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: UOCRA Standard" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Convenio</label>
                  <select value={idConvenio} onChange={(e) => setIdConvenio(e.target.value)} style={selectStyle}>
                    <option value="">Sin convenio específico</option>
                    {conveniosFiltrados.map(c => (
                      <option key={c.id} value={c.id}>{c.descripcion}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Horas por día */}
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '8px' }}>
                  Horas por día — Total semana: <span style={{ color: '#58a6ff' }}>{totalHoras}hs</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {DIAS.map(dia => (
                    <div key={dia.key} style={{ textAlign: 'center' }}>
                      <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>
                        {dia.label.substring(0, 3)}
                      </label>
                      <input
                        type="number"
                        value={horas[dia.key as keyof typeof horas]}
                        onChange={(e) => setHoras({ ...horas, [dia.key]: e.target.value })}
                        min="0" max="24" step="0.5"
                        style={horaInputStyle}
                      />
                      <input
                        type="time"
                        value={entradas[dia.key as keyof typeof entradas]}
                        onChange={(e) => setEntradas({ ...entradas, [dia.key]: e.target.value })}
                        placeholder="Entrada"
                        style={{ ...horaInputStyle, width: '100%', marginTop: '4px', fontSize: '11px' }}
                      />
                      <input
                        type="time"
                        value={salidas[dia.key as keyof typeof salidas]}
                        onChange={(e) => setSalidas({ ...salidas, [dia.key]: e.target.value })}
                        placeholder="Salida"
                        style={{ ...horaInputStyle, width: '100%', marginTop: '4px', fontSize: '11px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="activo" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                <label htmlFor="activo" style={{ fontSize: '13px', color: '#8b949e', cursor: 'pointer' }}>Activa</label>
              </div>

              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{
                background: 'transparent', border: '0.5px solid #30363d',
                color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={guardar} disabled={loading || !nombre} style={{
                background: '#2563eb', color: 'white', border: 'none',
                borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Plantillas de jornada</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {plantillasFiltradas.length} plantilla{plantillasFiltradas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
        }}>+ Nueva plantilla</button>
      </div>

      {/* Buscar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o convenio..."
          style={{
            width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
            background: '#161b22', border: '0.5px solid #30363d',
            color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
          }}
        />
      </div>

      {/* Tabla */}
      {plantillasFiltradas.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay plantillas para {empresaActiva.razon_social}.
        </div>
      ) : (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                <th onClick={() => toggleSort('nombre')} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Nombre{sortIcon('nombre')}</span>
                </th>
                <th onClick={() => toggleSort('convenio')} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Convenio{sortIcon('convenio')}</span>
                </th>
                {DIAS.map(d => (
                  <th key={d.key} style={{ textAlign: 'center', padding: '10px 8px', color: '#8b949e', fontWeight: 500 }}>
                    {d.label.substring(0, 3)}
                  </th>
                ))}
                <th onClick={() => toggleSort('total')} style={{ textAlign: 'center', padding: '10px 8px', color: '#58a6ff', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Total{sortIcon('total')}</span>
                </th>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: '#8b949e', fontWeight: 500 }}>Estado</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {plantillasFiltradas.map((p, i) => {
                const total = p.lunes + p.martes + p.miercoles + p.jueves + p.viernes + p.sabado + p.domingo
                return (
                  <tr key={p.id} style={{ borderBottom: i < plantillasFiltradas.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{p.convenios?.descripcion || '—'}</td>
                    {DIAS.map(d => (
                      <td key={d.key} style={{
                        padding: '10px 8px', textAlign: 'center',
                        color: (p[d.key as keyof Plantilla] as number) > 0 ? '#e6edf3' : '#484f58',
                      }}>
                        <div>{p[d.key as keyof Plantilla] as number || '—'}</div>
                        {(p[`${d.key}_entrada` as keyof Plantilla] as string) && (
                          <div style={{ fontSize: '10px', color: '#8b949e', lineHeight: '1.4' }}>
                            {(p[`${d.key}_entrada` as keyof Plantilla] as string)?.substring(0,5)}
                            <br/>
                            {(p[`${d.key}_salida` as keyof Plantilla] as string)?.substring(0,5)}
                          </div>
                        )}
                      </td>
                    ))}
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: '#58a6ff', fontWeight: 500 }}>{total}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{
                        background: p.activo ? '#1a3a2a' : '#3a1a1a',
                        color: p.activo ? '#3fb950' : '#f85149',
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                      }}>{p.activo ? 'Activa' : 'Inactiva'}</span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button onClick={() => abrirEditar(p)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
                      <button onClick={() => eliminar(p)} style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Eliminar</button>
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