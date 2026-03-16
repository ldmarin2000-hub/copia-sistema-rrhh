"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'

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
    Activa:     { bg: '#1a3a2a', color: '#3fb950' },
    Pausada:    { bg: '#3a2f1a', color: '#d29922' },
    Finalizada: { bg: '#21262d', color: '#8b949e' },
    Cancelada:  { bg: '#3a1a1a', color: '#f85149' },
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
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  const selectStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaActiva?.id)

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
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('obras').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(error.message); setLoading(false); return }
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
      {/* Modal */}
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, overflowY: 'auto', padding: '20px',
        }}>
          <div style={{
            background: '#161b22', border: '0.5px solid #30363d',
            borderRadius: '10px', width: '100%', maxWidth: '560px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
                  {editando ? 'Editar obra' : 'Nueva obra'}
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
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ej: OB001" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Estado</label>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)} style={selectStyle}>
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Nombre *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Edificio Norte" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Fecha inicio</label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Fecha fin</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>CP</label>
                  <input value={cp} onChange={(e) => setCp(e.target.value)} placeholder="Ej: 3000" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Localidad</label>
                  <input value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Ciudad" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Provincia</label>
                  <input value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Provincia" style={inputStyle} />
                </div>
              </div>

              {/* Botón geocodificar */}
              <button
                onClick={buscarDireccion}
                disabled={buscandoDireccion || !direccion}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', border: '0.5px solid #30363d',
                  color: '#58a6ff', borderRadius: '6px', padding: '7px 12px',
                  fontSize: '13px', cursor: 'pointer', width: 'fit-content',
                  opacity: !direccion ? 0.4 : 1,
                }}
              >
                <MapPin size={14} />
                {buscandoDireccion ? 'Buscando...' : 'Buscar en el mapa'}
              </button>

              {/* Mapa */}
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>
                  Ubicación en el mapa — clickeá para ubicar
                </label>
                <MapaObra
                  latitud={latitud}
                  longitud={longitud}
                  onChange={(lat, lng) => { setLatitud(lat); setLongitud(lng) }}
                />
                {latitud && longitud && (
                  <span style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px', display: 'block' }}>
                    {latitud.toFixed(6)}, {longitud.toFixed(6)}
                  </span>
                )}
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
                disabled={loading || !codigo || !nombre}
                style={{
                  background: '#2563eb', color: 'white', border: 'none',
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
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Obras</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {obrasFiltradas.length} obra{obrasFiltradas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          + Nueva obra
        </button>
      </div>

      {/* Tabla */}
      {obrasFiltradas.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay obras para {empresaActiva.razon_social}.
        </div>
      ) : (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {['Código', 'Nombre', 'Localidad', 'Inicio', 'GPS', 'Estado'].map(col => (
                  <th key={col} style={{
                    textAlign: 'left', padding: '10px 16px',
                    color: '#8b949e', fontWeight: 500,
                  }}>{col}</th>
                ))}
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {obrasFiltradas.map((obra, i) => (
                <tr key={obra.id} style={{
                  borderBottom: i < obrasFiltradas.length - 1 ? '0.5px solid #21262d' : 'none',
                }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: '#21262d', color: '#e6edf3',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>{obra.codigo}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{obra.nombre}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{obra.localidad || '—'}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {obra.fecha_inicio ? new Date(obra.fecha_inicio).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {obra.latitud ? (
                      <MapPin size={14} color="#3fb950" />
                    ) : (
                      <MapPin size={14} color="#484f58" />
                    )}
                  </td>
                  <td style={{ padding: '10px 16px' }}>{badgeEstado(obra.estado)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => abrirEditar(obra)} style={{
                      background: 'transparent', border: 'none',
                      color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Editar</button>
                    <button onClick={() => eliminar(obra)} style={{
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