"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEmpresa } from '../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'
import { createClient } from '@/lib/supabase-browser'
import { traducirError } from '@/lib/errores'
import Link from 'next/link'
import { X, Plus } from 'lucide-react'

type Vacacion = {
  id: number
  id_legajo: number
  fecha_desde: string
  fecha_hasta: string
  observacion?: string
  legajos: { apellido: string, nombre: string, nro_legajo: number, id_empresa: number, id_obra?: number }
}

type Legajo = {
  id: number
  id_empresa: number
  apellido: string
  nombre: string
  nro_legajo: number
  id_obra?: number
}

export default function VacacionesGeneralClient({
  vacaciones, legajos
}: {
  vacaciones: Vacacion[]
  legajos: Legajo[]
}) {
  const { empresaActiva, rol, obrasJefe } = useEmpresa()
  const router = useRouter()
  const [filtroLegajo, setFiltroLegajo] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoVac, setEditandoVac] = useState<Vacacion | null>(null)
  const [formIdLegajo, setFormIdLegajo] = useState('')
  const [formDesde, setFormDesde] = useState('')
  const [formHasta, setFormHasta] = useState('')
  const [formObs, setFormObs] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const selectStyle = {
    padding: '7px 10px', borderRadius: '6px',
    background: '#161b22', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

  const inputStyle = {
    padding: '7px 10px', borderRadius: '6px',
    background: '#161b22', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
    width: '100%', boxSizing: 'border-box' as const,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px',
  }

  const legajosFiltrados = legajos
    .filter(l => l.id_empresa === empresaActiva?.id)
    .filter(l => rol !== 'JEFE_OBRA' || (l.id_obra != null && obrasJefe.includes(l.id_obra)))

  const vacacionesFiltradas = vacaciones
    .filter(v => v.legajos.id_empresa === empresaActiva?.id)
    .filter(v => rol !== 'JEFE_OBRA' || (v.legajos.id_obra != null && obrasJefe.includes(v.legajos.id_obra)))
    .filter(v => filtroLegajo ? v.id_legajo === parseInt(filtroLegajo) : true)
    .filter(v => filtroDesde ? v.fecha_hasta >= filtroDesde : true)
    .filter(v => filtroHasta ? v.fecha_desde <= filtroHasta : true)

  // Calcular días activos hoy
  const hoy = new Date().toISOString().split('T')[0]
  const enVacacionesHoy = vacacionesFiltradas.filter(
    v => v.fecha_desde <= hoy && v.fecha_hasta >= hoy
  ).length

  function abrirNuevo() {
    setEditandoVac(null)
    setFormIdLegajo('')
    setFormDesde('')
    setFormHasta('')
    setFormObs('')
    setFormError('')
    setMostrarForm(true)
  }

  function abrirEditar(v: Vacacion) {
    setEditandoVac(v)
    setFormIdLegajo(String(v.id_legajo))
    setFormDesde(v.fecha_desde)
    setFormHasta(v.fecha_hasta)
    setFormObs(v.observacion || '')
    setFormError('')
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoVac(null)
  }

  function getDias(): number {
    if (!formDesde || !formHasta) return 0
    const desde = new Date(formDesde + 'T12:00:00')
    const hasta = new Date(formHasta + 'T12:00:00')
    const diff = Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }

  async function guardar() {
    if (!formIdLegajo || !formDesde || !formHasta) {
      setFormError('Completá todos los campos obligatorios.')
      return
    }
    if (formHasta < formDesde) {
      setFormError('La fecha hasta no puede ser menor a la fecha desde.')
      return
    }
    setFormLoading(true)
    setFormError('')
    const supabase = createClient()
    const legajo = legajosFiltrados.find(l => l.id === parseInt(formIdLegajo))
    if (!legajo) { setFormError('Legajo no encontrado.'); setFormLoading(false); return }

    const datos = {
      fecha_desde: formDesde,
      fecha_hasta: formHasta,
      observacion: formObs || null,
    }

    if (editandoVac) {
      const { error } = await supabase.from('vacaciones_periodo').update(datos).eq('id', editandoVac.id)
      if (error) { setFormError(traducirError(error.message)); setFormLoading(false); return }
    } else {
      const { error } = await supabase.from('vacaciones_periodo').insert({
        ...datos,
        id_empresa: legajo.id_empresa,
        id_legajo: legajo.id,
      })
      if (error) { setFormError(traducirError(error.message)); setFormLoading(false); return }
    }

    router.refresh()
    cerrarForm()
    setFormLoading(false)
  }

  async function eliminar(v: Vacacion) {
    if (!confirm(`¿Eliminar vacación del ${formatFecha(v.fecha_desde)} al ${formatFecha(v.fecha_hasta)}?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('vacaciones_periodo').delete().eq('id', v.id)
    if (error) alert(traducirError(error.message))
    else router.refresh()
  }

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <div>
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>
                {editandoVac ? 'Editar vacación' : 'Nueva vacación'}
              </h2>
              <button onClick={cerrarForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!editandoVac && (
                <div>
                  <label style={labelStyle}>Empleado *</label>
                  <select value={formIdLegajo} onChange={e => setFormIdLegajo(e.target.value)} style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' as const }}>
                    <option value="">Seleccionar...</option>
                    {legajosFiltrados.map(l => (
                      <option key={l.id} value={l.id}>{l.apellido}, {l.nombre} — Leg. {l.nro_legajo}</option>
                    ))}
                  </select>
                </div>
              )}
              {editandoVac && (
                <p style={{ fontSize: '13px', color: '#8b949e', margin: 0 }}>
                  {editandoVac.legajos.apellido}, {editandoVac.legajos.nombre}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Desde *</label>
                  <input type="date" value={formDesde} onChange={e => setFormDesde(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hasta *</label>
                  <input type="date" value={formHasta} onChange={e => setFormHasta(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {formDesde && formHasta && getDias() > 0 && (
                <p style={{ fontSize: '12px', color: '#58a6ff', margin: 0 }}>{getDias()} día{getDias() !== 1 ? 's' : ''}</p>
              )}

              <div>
                <label style={labelStyle}>Observación</label>
                <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>

              {formError && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{formError}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrarForm} style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} disabled={formLoading} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: formLoading ? 0.6 : 1 }}>
                {formLoading ? 'Guardando...' : editandoVac ? 'Guardar cambios' : 'Registrar vacación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Vacaciones</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {vacacionesFiltradas.length} registro{vacacionesFiltradas.length !== 1 ? 's' : ''}
            {enVacacionesHoy > 0 && (
              <span style={{ marginLeft: '8px', color: '#58a6ff' }}>
                · {enVacacionesHoy} en vacaciones hoy
              </span>
            )}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
          <Plus size={14} />
          Nueva vacación
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        background: '#161b22', border: '0.5px solid #30363d',
        borderRadius: '8px', padding: '16px 20px',
        display: 'flex', flexWrap: 'wrap' as const, gap: '12px',
        alignItems: 'flex-end', marginBottom: '20px',
      }}>
        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Empleado</label>
          <select value={filtroLegajo} onChange={(e) => setFiltroLegajo(e.target.value)} style={selectStyle}>
            <option value="">Todos</option>
            {legajosFiltrados.map(l => (
              <option key={l.id} value={l.id}>{l.apellido}, {l.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Desde</label>
          <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} style={selectStyle} />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Hasta</label>
          <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} style={selectStyle} />
        </div>

        {(filtroLegajo || filtroDesde || filtroHasta) && (
          <button
            onClick={() => { setFiltroLegajo(''); setFiltroDesde(''); setFiltroHasta('') }}
            style={{
              background: 'transparent', border: '0.5px solid #30363d',
              color: '#8b949e', borderRadius: '6px', padding: '7px 14px',
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      {vacacionesFiltradas.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay vacaciones para los filtros seleccionados.
        </div>
      ) : (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {['Empleado', 'Desde', 'Hasta', 'Días', 'Estado', 'Observación', ''].map((col, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vacacionesFiltradas.map((v, i) => {
                const desde = new Date(v.fecha_desde + 'T12:00:00')
                const hasta = new Date(v.fecha_hasta + 'T12:00:00')
                const dias = Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
                const activa = v.fecha_desde <= hoy && v.fecha_hasta >= hoy
                const futura = v.fecha_desde > hoy
                return (
                  <tr key={v.id} style={{ borderBottom: i < vacacionesFiltradas.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <Link href={`/legajos/${v.id_legajo}`} style={{ textDecoration: 'none' }}>
                        <span style={{ color: '#e6edf3', fontWeight: 500 }}>
                          {v.legajos.apellido}, {v.legajos.nombre}
                        </span>
                        <span style={{ color: '#484f58', fontSize: '11px', marginLeft: '6px' }}>
                          #{String(v.legajos.nro_legajo).padStart(4, '0')}
                        </span>
                      </Link>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(v.fecha_desde)}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(v.fecha_hasta)}</td>
                    <td style={{ padding: '10px 16px', color: '#58a6ff', fontWeight: 500 }}>{dias}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {activa ? (
                        <span style={{ background: '#1a3a2a', color: '#3fb950', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>En curso</span>
                      ) : futura ? (
                        <span style={{ background: '#1a2a3a', color: '#58a6ff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Próxima</span>
                      ) : (
                        <span style={{ background: '#21262d', color: '#8b949e', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Finalizada</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{v.observacion || '—'}</td>
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => abrirEditar(v)}
                        style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginRight: '6px' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(v)}
                        style={{ background: 'transparent', border: '0.5px solid #f8514933', color: '#f85149', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
