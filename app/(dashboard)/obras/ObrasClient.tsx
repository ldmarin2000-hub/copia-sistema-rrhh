"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, MapPin, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { traducirError } from '@/lib/errores'

const MapaObra = dynamic(() => import('./MapaObra'), { ssr: false })

type Obra = {
  id: number
  id_empresa: number
  codigo: string
  nombre: string
  direccion?: string
  localidad?: string
  provincia?: string
  latitud?: number
  longitud?: number
  estado: string
  fecha_inicio?: string
  fecha_fin?: string
  activo: boolean
  empresas: { razon_social: string }
  cp: string
}

const ESTADOS = ['Activa', 'Pausada', 'Finalizada', 'Cancelada']

const badgeEstado = (estado: string) => {
  const colores: Record<string, { bg: string, color: string }> = {
    Activa:     { bg: 'var(--c-green-bg)', color: 'var(--c-green)' },
    Pausada:    { bg: 'var(--c-orange-bg)', color: 'var(--c-orange)' },
    Finalizada: { bg: 'var(--c-elevated)', color: 'var(--c-text-secondary)' },
    Cancelada:  { bg: 'var(--c-red-bg)', color: 'var(--c-red)' },
  }
  const c = colores[estado] || colores.Activa
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
    }}>{estado}</span>
  )
}

export default function ObrasClient({ obras }: { obras: Obra[] }) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Obra | null>(null)

  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [provincia, setProvincia] = useState('')
  const [estado, setEstado] = useState('Activa')
  const [fechaInicio, setFechaInicio] = useState('')
  const [latitud, setLatitud] = useState<number | null>(null)
  const [longitud, setLongitud] = useState<number | null>(null)
  const [buscandoDireccion, setBuscandoDireccion] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cp, setCp] = useState('')
  const [fechaFin, setFechaFin] = useState(editando?.fecha_fin || '')

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  const selectStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px',
  }

  const [busqueda, setBusqueda] = useState('')
  type SortCol = 'codigo' | 'nombre' | 'localidad' | 'estado'
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
  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaActiva?.id)
    .filter(o =>
      o.codigo.toLowerCase().includes(b) ||
      o.nombre.toLowerCase().includes(b) ||
      (o.localidad || '').toLowerCase().includes(b)
    )
    .sort((a, z) => {
      const va = (a[sortCol] || '').toLowerCase()
      const vz = (z[sortCol] || '').toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vz) : vz.localeCompare(va)
    })

  function abrirNuevo() {
    setEditando(null)
    setCodigo('')
    setNombre('')
    setDireccion('')
    setLocalidad('')
    setProvincia('')
    setEstado('Activa')
    setFechaInicio('')
    setLatitud(null)
    setLongitud(null)
    setError('')
    setMostrarForm(true)
    setCp('')
    setFechaFin('')
  }

  function abrirEditar(obra: Obra) {
    setEditando(obra)
    setCodigo(obra.codigo)
    setNombre(obra.nombre)
    setDireccion(obra.direccion || '')
    setLocalidad(obra.localidad || '')
    setProvincia(obra.provincia || '')
    setEstado(obra.estado)
    setFechaInicio(obra.fecha_inicio || '')
    setLatitud(obra.latitud || null)
    setLongitud(obra.longitud || null)
    setError('')
    setMostrarForm(true)
    setFechaFin(obra.fecha_fin || '')
    setCp(obra.cp || '')
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
  }

async function buscarDireccion() {
  if (!direccion) return
  setBuscandoDireccion(true)

  const partes = [direccion]
  if (cp) partes.push(cp)
  if (localidad) partes.push(localidad)
  if (provincia) partes.push(provincia)
  partes.push('Argentina')

  const query = partes.join(', ')

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ar`
  )
  const data = await res.json()

  if (data.length === 0) {
    alert('No se encontró la dirección. Ubicala en el mapa.')
    setBuscandoDireccion(false)
    return
  }

  const localidadLower = localidad.toLowerCase()
  const mejorResultado = data.find((r: any) =>
    r.display_name.toLowerCase().includes(localidadLower)
  ) || data[0]

  setLatitud(parseFloat(mejorResultado.lat))
  setLongitud(parseFloat(mejorResultado.lon))
  setBuscandoDireccion(false)
}

  async function guardar() {
    if (!empresaActiva) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    const datos = {
      codigo, nombre, direccion, cp, localidad, provincia,
      estado, fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      latitud, longitud,
    }
    if (editando) {
      const { error } = await supabase
        .from('obras').update(datos).eq('id', editando.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('obras').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(obra: Obra) {
    if (!confirm(`¿Eliminar obra "${obra.nombre}"?`)) return
    const supabase = createClient()
    const { error } = await supabase
      .from('obras').delete().eq('id', obra.id)
    if (error) {
      alert('No se puede eliminar: ' + traducirError(error.message))
    } else {
      router.refresh()
    }
  }

  if (!empresaActiva) {
    return <div style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <>
      {/* Modal */}
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--c-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, overflowY: 'auto', padding: '20px',
        }}>
          <div style={{
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            borderRadius: '10px', width: '100%', maxWidth: '560px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>
                  {editando ? 'Editar obra' : 'Nueva obra'}
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{empresaActiva.razon_social}</span>
              </div>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Código *</label>
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ej: OB001" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Estado</label>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)} style={selectStyle}>
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Nombre *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Edificio Norte" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Fecha inicio</label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Fecha fin</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => {
                      const valor = e.target.value
                      setFechaFin(valor)
                      if (valor) {
                        setEstado('Finalizada')
                      } else {
                        setEstado('Activa')
                      }
                    }}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Dirección</label>
                <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Av. Corrientes 1234" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>CP</label>
                  <input value={cp} onChange={(e) => setCp(e.target.value)} placeholder="Ej: 3000" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Localidad</label>
                  <input value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Ciudad" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Provincia</label>
                  <input value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Provincia" style={inputStyle} />
                </div>
              </div>

              {/* Botón geocodificar */}
              <button
                onClick={buscarDireccion}
                disabled={buscandoDireccion || !direccion}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', border: '0.5px solid var(--c-border)',
                  color: 'var(--c-blue)', borderRadius: '6px', padding: '7px 12px',
                  fontSize: '13px', cursor: 'pointer', width: 'fit-content',
                  opacity: !direccion ? 0.4 : 1,
                }}
              >
                <MapPin size={14} />
                {buscandoDireccion ? 'Buscando...' : 'Buscar en el mapa'}
              </button>

              {/* Mapa */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Ubicación en el mapa — clickeá para ubicar
                </label>
                <MapaObra
                  latitud={latitud}
                  longitud={longitud}
                  onChange={(lat, lng) => { setLatitud(lat); setLongitud(lng) }}
                />
                {latitud && longitud && (
                  <span style={{ fontSize: '11px', color: 'var(--c-text-secondary)', marginTop: '4px', display: 'block' }}>
                    {latitud.toFixed(6)}, {longitud.toFixed(6)}
                  </span>
                )}
              </div>

              {error && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{
                background: 'transparent', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button
                onClick={guardar}
                disabled={loading || !codigo || !nombre}
                style={{
                  background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px',
                  fontSize: '13px', cursor: 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear obra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>Obras</h1>
          <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
            {empresaActiva.razon_social} · {obrasFiltradas.length} obra{obrasFiltradas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{
          background: 'var(--c-blue-btn)', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          + Nueva obra
        </button>
      </div>

      {/* Buscar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-secondary)' }} />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código, nombre o localidad..."
          style={{
            width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
          }}
        />
      </div>

      {/* Tabla */}
      {obrasFiltradas.length === 0 ? (
        <div style={{
          background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px',
        }}>
          No hay obras para {empresaActiva.razon_social}.
        </div>
      ) : (
        <div style={{
          background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                {([['Código','codigo'],['Nombre','nombre'],['Localidad','localidad']] as [string,SortCol][]).map(([label, col]) => (
                  <th key={col} onClick={() => toggleSort(col)} style={{
                    textAlign: 'left', padding: '10px 16px',
                    color: 'var(--c-text-secondary)', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>{label}{sortIcon(col)}</span>
                  </th>
                ))}
                <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Inicio</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>GPS</th>
                <th onClick={() => toggleSort('estado')} style={{
                  textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Estado{sortIcon('estado')}</span>
                </th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {obrasFiltradas.map((obra, i) => (
                <tr key={obra.id} style={{
                  borderBottom: i < obrasFiltradas.length - 1 ? '0.5px solid var(--c-elevated)' : 'none',
                }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: 'var(--c-elevated)', color: 'var(--c-text-primary)',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>{obra.codigo}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)', fontWeight: 500 }}>{obra.nombre}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{obra.localidad || '—'}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>
                    {obra.fecha_inicio ? new Date(obra.fecha_inicio).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {obra.latitud ? (
                      <MapPin size={14} color="var(--c-green)" />
                    ) : (
                      <MapPin size={14} color="var(--c-text-muted)" />
                    )}
                  </td>
                  <td style={{ padding: '10px 16px' }}>{badgeEstado(obra.estado)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <Link href={`/obras/${obra.id}`} style={{
                      background: 'transparent', border: '0.5px solid var(--c-border)',
                      color: 'var(--c-text-secondary)', cursor: 'pointer', fontSize: '12px',
                      padding: '3px 10px', borderRadius: '4px', textDecoration: 'none',
                      marginRight: '4px', display: 'inline-block',
                    }}>Ver ficha</Link>
                    <button onClick={() => abrirEditar(obra)} style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--c-text-secondary)', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Editar</button>
                    <button onClick={() => eliminar(obra)} style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--c-red)', cursor: 'pointer', fontSize: '12px',
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