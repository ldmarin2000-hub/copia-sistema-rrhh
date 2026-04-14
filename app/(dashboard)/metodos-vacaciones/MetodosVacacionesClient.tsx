"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Plus, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { traducirError } from '@/lib/errores'

type Metodo = {
  id: number
  id_empresa: number | null
  nombre: string
  activo: boolean
  tipo_dias: 'corridos' | 'habiles'
}

type Tramo = {
  id: number
  id_metodo: number
  anios_desde: number
  anios_hasta: number | null
  dias: number
}

type Props = {
  metodos: Metodo[]
  tramos: Tramo[]
}

export default function MetodosVacacionesClient({ metodos, tramos }: Props) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()

  // expandir tramos por método
  const [expandidos, setExpandidos] = useState<Record<number, boolean>>({})

  // form nuevo/editar método
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoMetodo, setEditandoMetodo] = useState<Metodo | null>(null)
  const [nombre, setNombre] = useState('')
  const [activo, setActivo] = useState(true)
  const [tipoDias, setTipoDias] = useState<'corridos' | 'habiles'>('corridos')
  const [loadingMetodo, setLoadingMetodo] = useState(false)
  const [errorMetodo, setErrorMetodo] = useState('')

  // form tramo
  const [mostrarFormTramo, setMostrarFormTramo] = useState(false)
  const [editandoTramo, setEditandoTramo] = useState<Tramo | null>(null)
  const [tramoMetodoId, setTramoMetodoId] = useState<number | null>(null)
  const [aniosDesde, setAniosDesde] = useState('')
  const [aniosHasta, setAniosHasta] = useState('')
  const [dias, setDias] = useState('')
  const [loadingTramo, setLoadingTramo] = useState(false)
  const [errorTramo, setErrorTramo] = useState('')

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px'
  }

  const tramosDeMetodo = (id: number) => tramos.filter(t => t.id_metodo === id)

  function toggleExpandir(id: number) {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // --- Métodos ---
  function abrirNuevoMetodo() {
    setEditandoMetodo(null)
    setNombre('')
    setActivo(true)
    setTipoDias('corridos')
    setErrorMetodo('')
    setMostrarForm(true)
  }

  function abrirEditarMetodo(m: Metodo) {
    setEditandoMetodo(m)
    setNombre(m.nombre)
    setActivo(m.activo)
    setTipoDias(m.tipo_dias ?? 'corridos')
    setErrorMetodo('')
    setMostrarForm(true)
  }

  async function guardarMetodo() {
    if (!nombre.trim()) { setErrorMetodo('Ingresá un nombre.'); return }
    setLoadingMetodo(true)
    setErrorMetodo('')
    const supabase = createClient()

    if (editandoMetodo) {
      const { error } = await supabase
        .from('metodos_vacaciones')
        .update({ nombre: nombre.trim(), activo, tipo_dias: tipoDias })
        .eq('id', editandoMetodo.id)
      if (error) { setErrorMetodo(traducirError(error.message)); setLoadingMetodo(false); return }
    } else {
      const { error } = await supabase
        .from('metodos_vacaciones')
        .insert({ nombre: nombre.trim(), activo, tipo_dias: tipoDias, id_empresa: empresaActiva?.id ?? null })
      if (error) { setErrorMetodo(traducirError(error.message)); setLoadingMetodo(false); return }
    }

    router.refresh()
    setMostrarForm(false)
    setLoadingMetodo(false)
  }

  async function eliminarMetodo(m: Metodo) {
    if (!confirm(`¿Eliminar el método "${m.nombre}"? Se eliminarán también sus tramos.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('metodos_vacaciones').delete().eq('id', m.id)
    if (error) alert('No se puede eliminar: ' + traducirError(error.message))
    else router.refresh()
  }

  // --- Tramos ---
  function abrirNuevoTramo(idMetodo: number) {
    setEditandoTramo(null)
    setTramoMetodoId(idMetodo)
    setAniosDesde('')
    setAniosHasta('')
    setDias('')
    setErrorTramo('')
    setMostrarFormTramo(true)
  }

  function abrirEditarTramo(t: Tramo) {
    setEditandoTramo(t)
    setTramoMetodoId(t.id_metodo)
    setAniosDesde(String(t.anios_desde))
    setAniosHasta(t.anios_hasta !== null ? String(t.anios_hasta) : '')
    setDias(String(t.dias))
    setErrorTramo('')
    setMostrarFormTramo(true)
  }

  async function guardarTramo() {
    if (aniosDesde === '' || dias === '') { setErrorTramo('Completá los campos obligatorios.'); return }
    setLoadingTramo(true)
    setErrorTramo('')
    const supabase = createClient()
    const datos = {
      id_metodo: tramoMetodoId,
      anios_desde: parseInt(aniosDesde),
      anios_hasta: aniosHasta !== '' ? parseInt(aniosHasta) : null,
      dias: parseInt(dias),
    }

    if (editandoTramo) {
      const { error } = await supabase.from('metodos_vacaciones_tramos').update(datos).eq('id', editandoTramo.id)
      if (error) { setErrorTramo(traducirError(error.message)); setLoadingTramo(false); return }
    } else {
      const { error } = await supabase.from('metodos_vacaciones_tramos').insert(datos)
      if (error) { setErrorTramo(traducirError(error.message)); setLoadingTramo(false); return }
    }

    router.refresh()
    setMostrarFormTramo(false)
    setLoadingTramo(false)
  }

  async function eliminarTramo(t: Tramo) {
    if (!confirm('¿Eliminar este tramo?')) return
    const supabase = createClient()
    const { error } = await supabase.from('metodos_vacaciones_tramos').delete().eq('id', t.id)
    if (error) alert('No se puede eliminar: ' + traducirError(error.message))
    else router.refresh()
  }

  // Separar métodos del sistema vs de empresa
  const sistemicos = metodos.filter(m => m.id_empresa === null)
  const propios = metodos.filter(m => m.id_empresa !== null)

  return (
    <div style={{ padding: '24px 32px', maxWidth: '800px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--c-text-primary)', margin: 0 }}>Métodos de vacaciones</h1>
          <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', marginTop: '4px', marginBottom: 0 }}>
            Configurá los tramos de días según antigüedad para cada convenio o método propio.
          </p>
        </div>
        <button onClick={abrirNuevoMetodo} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--c-blue-btn)', color: 'white', border: 'none',
          borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer',
        }}>
          <Plus size={14} />
          Nuevo método
        </button>
      </div>

      {/* Métodos del sistema */}
      {sistemicos.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Métodos del sistema (solo lectura)
          </p>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
            {sistemicos.map((m, i) => (
              <div key={m.id} style={{ borderBottom: i < sistemicos.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                <div
                  onClick={() => toggleExpandir(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px 16px', cursor: 'pointer',
                  }}
                >
                  {expandidos[m.id]
                    ? <ChevronDown size={14} color="var(--c-text-secondary)" />
                    : <ChevronRight size={14} color="var(--c-text-secondary)" />}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--c-text-primary)', flex: 1 }}>{m.nombre}</span>
                  <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', background: 'var(--c-elevated)', borderRadius: '4px', padding: '2px 8px' }}>
                    Sistema
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', background: 'var(--c-elevated)', borderRadius: '4px', padding: '2px 8px' }}>
                    {m.tipo_dias === 'habiles' ? 'Hábiles' : 'Corridos'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
                    {tramosDeMetodo(m.id).length} tramo{tramosDeMetodo(m.id).length !== 1 ? 's' : ''}
                  </span>
                </div>

                {expandidos[m.id] && (
                  <div style={{ padding: '0 16px 12px 40px' }}>
                    <TramosList tramos={tramosDeMetodo(m.id)} readonly />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métodos propios */}
      <div>
        <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Métodos propios
        </p>
        {propios.length === 0 ? (
          <div style={{
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            borderRadius: '8px', padding: '40px', textAlign: 'center',
            color: 'var(--c-text-secondary)', fontSize: '14px',
          }}>
            No hay métodos propios. Creá uno con el botón de arriba.
          </div>
        ) : (
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
            {propios.map((m, i) => (
              <div key={m.id} style={{ borderBottom: i < propios.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px' }}>
                  <div onClick={() => toggleExpandir(m.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    {expandidos[m.id]
                      ? <ChevronDown size={14} color="var(--c-text-secondary)" />
                      : <ChevronRight size={14} color="var(--c-text-secondary)" />}
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--c-text-primary)' }}>{m.nombre}</span>
                    <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', background: 'var(--c-elevated)', borderRadius: '4px', padding: '2px 8px' }}>
                      {m.tipo_dias === 'habiles' ? 'Hábiles' : 'Corridos'}
                    </span>
                    {!m.activo && (
                      <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', background: 'var(--c-elevated)', borderRadius: '4px', padding: '2px 8px' }}>
                        Inactivo
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)', marginRight: '8px' }}>
                    {tramosDeMetodo(m.id).length} tramo{tramosDeMetodo(m.id).length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => abrirEditarMetodo(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)', padding: '4px' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => eliminarMetodo(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-red)', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {expandidos[m.id] && (
                  <div style={{ padding: '0 16px 12px 40px' }}>
                    <TramosList
                      tramos={tramosDeMetodo(m.id)}
                      onEditar={abrirEditarTramo}
                      onEliminar={eliminarTramo}
                    />
                    <button onClick={() => abrirNuevoTramo(m.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'none', border: '0.5px dashed var(--c-border)',
                      color: 'var(--c-text-secondary)', borderRadius: '6px',
                      padding: '6px 12px', fontSize: '12px', cursor: 'pointer', marginTop: '8px',
                    }}>
                      <Plus size={12} /> Agregar tramo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal método */}
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--c-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            borderRadius: '10px', width: '100%', maxWidth: '400px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                {editandoMetodo ? 'Editar método' : 'Nuevo método'}
              </h2>
              <button onClick={() => setMostrarForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: UOCRA Propio" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tipo de días</label>
                <select value={tipoDias} onChange={e => setTipoDias(e.target.value as 'corridos' | 'habiles')} style={inputStyle}>
                  <option value="corridos">Corridos</option>
                  <option value="habiles">Hábiles</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="metodoActivo" checked={activo} onChange={e => setActivo(e.target.checked)} />
                <label htmlFor="metodoActivo" style={{ fontSize: '13px', color: 'var(--c-text-secondary)', cursor: 'pointer' }}>Activo</label>
              </div>
              {errorMetodo && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{errorMetodo}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setMostrarForm(false)} style={{
                background: 'transparent', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={guardarMetodo} disabled={loadingMetodo} style={{
                background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loadingMetodo ? 0.6 : 1,
              }}>
                {loadingMetodo ? 'Guardando...' : editandoMetodo ? 'Guardar cambios' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tramo */}
      {mostrarFormTramo && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--c-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            borderRadius: '10px', width: '100%', maxWidth: '380px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                {editandoTramo ? 'Editar tramo' : 'Nuevo tramo'}
              </h2>
              <button onClick={() => setMostrarFormTramo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Años desde *</label>
                  <input type="number" min={0} value={aniosDesde} onChange={e => setAniosDesde(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Años hasta</label>
                  <input type="number" min={0} value={aniosHasta} onChange={e => setAniosHasta(e.target.value)} placeholder="(sin tope)" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Días *</label>
                  <input type="number" min={1} value={dias} onChange={e => setDias(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: 0 }}>
                Dejá "Años hasta" vacío si no hay tope superior (ej: 20+ años).
              </p>
              {errorTramo && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{errorTramo}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setMostrarFormTramo(false)} style={{
                background: 'transparent', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={guardarTramo} disabled={loadingTramo} style={{
                background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loadingTramo ? 0.6 : 1,
              }}>
                {loadingTramo ? 'Guardando...' : editandoTramo ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TramosList({
  tramos,
  readonly = false,
  onEditar,
  onEliminar,
}: {
  tramos: Tramo[]
  readonly?: boolean
  onEditar?: (t: Tramo) => void
  onEliminar?: (t: Tramo) => void
}) {
  if (tramos.length === 0) {
    return <p style={{ fontSize: '12px', color: 'var(--c-text-muted)', margin: '4px 0' }}>Sin tramos definidos.</p>
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
      <thead>
        <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
          <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Años desde</th>
          <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Años hasta</th>
          <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Días</th>
          {!readonly && <th style={{ padding: '6px 10px' }}></th>}
        </tr>
      </thead>
      <tbody>
        {tramos.map(t => (
          <tr key={t.id} style={{ borderBottom: '0.5px solid var(--c-elevated)' }}>
            <td style={{ padding: '6px 10px', color: 'var(--c-text-primary)' }}>{t.anios_desde}</td>
            <td style={{ padding: '6px 10px', color: 'var(--c-text-secondary)' }}>{t.anios_hasta ?? '∞'}</td>
            <td style={{ padding: '6px 10px', color: 'var(--c-blue)', fontWeight: 500 }}>{t.dias}</td>
            {!readonly && (
              <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                <button onClick={() => onEditar?.(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)', padding: '2px 6px', fontSize: '11px' }}>Editar</button>
                <button onClick={() => onEliminar?.(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-red)', padding: '2px 6px', fontSize: '11px' }}>Eliminar</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
