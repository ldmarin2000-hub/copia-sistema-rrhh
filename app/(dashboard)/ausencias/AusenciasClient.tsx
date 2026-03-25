"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEmpresa } from '../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'
import { createClient } from '@/lib/supabase-browser'
import { traducirError } from '@/lib/errores'
import Link from 'next/link'
import { X, Plus } from 'lucide-react'

type Ausencia = {
  id: number
  id_legajo: number
  id_tipo_ausencia: number
  fecha_desde: string
  fecha_hasta: string
  observacion?: string
  tipos_ausencia: { descripcion: string }
  legajos: { apellido: string, nombre: string, nro_legajo: number, id_empresa: number, id_obra?: number }
}

type TipoAusencia = {
  id: number
  descripcion: string
}

type Legajo = {
  id: number
  id_empresa: number
  apellido: string
  nombre: string
  nro_legajo: number
  id_obra?: number
}

export default function AusenciasClient({
  ausencias, tiposAusencia, legajos
}: {
  ausencias: Ausencia[]
  tiposAusencia: TipoAusencia[]
  legajos: Legajo[]
}) {
  const { empresaActiva, rol, obrasJefe } = useEmpresa()
  const router = useRouter()
  const [filtroLegajo, setFiltroLegajo] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoAus, setEditandoAus] = useState<Ausencia | null>(null)
  const [formIdLegajo, setFormIdLegajo] = useState('')
  const [formIdTipo, setFormIdTipo] = useState('')
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

  const ausenciasFiltradas = ausencias
    .filter(a => a.legajos.id_empresa === empresaActiva?.id)
    .filter(a => rol !== 'JEFE_OBRA' || (a.legajos.id_obra != null && obrasJefe.includes(a.legajos.id_obra)))
    .filter(a => filtroLegajo ? a.id_legajo === parseInt(filtroLegajo) : true)
    .filter(a => filtroTipo ? a.tipos_ausencia.descripcion === tiposAusencia.find(t => t.id === parseInt(filtroTipo))?.descripcion : true)
    .filter(a => filtroDesde ? a.fecha_hasta >= filtroDesde : true)
    .filter(a => filtroHasta ? a.fecha_desde <= filtroHasta : true)

  function abrirNuevo() {
    setEditandoAus(null)
    setFormIdLegajo('')
    setFormIdTipo('')
    setFormDesde('')
    setFormHasta('')
    setFormObs('')
    setFormError('')
    setMostrarForm(true)
  }

  function abrirEditar(a: Ausencia) {
    setEditandoAus(a)
    setFormIdLegajo(String(a.id_legajo))
    setFormIdTipo(String(a.id_tipo_ausencia))
    setFormDesde(a.fecha_desde)
    setFormHasta(a.fecha_hasta)
    setFormObs(a.observacion || '')
    setFormError('')
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoAus(null)
  }

  function getDias(): number {
    if (!formDesde || !formHasta) return 0
    const desde = new Date(formDesde + 'T12:00:00')
    const hasta = new Date(formHasta + 'T12:00:00')
    const diff = Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }

  async function guardar() {
    if (!formIdLegajo || !formIdTipo || !formDesde || !formHasta) {
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
      id_tipo_ausencia: parseInt(formIdTipo),
      fecha_desde: formDesde,
      fecha_hasta: formHasta,
      observacion: formObs || null,
    }

    if (editandoAus) {
      const { error } = await supabase.from('ausencias_periodo').update(datos).eq('id', editandoAus.id)
      if (error) { setFormError(traducirError(error.message)); setFormLoading(false); return }
    } else {
      const { error } = await supabase.from('ausencias_periodo').insert({
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

  async function eliminar(a: Ausencia) {
    if (!confirm(`¿Eliminar ausencia del ${formatFecha(a.fecha_desde)} al ${formatFecha(a.fecha_hasta)}?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('ausencias_periodo').delete().eq('id', a.id)
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
                {editandoAus ? 'Editar ausencia' : 'Nueva ausencia'}
              </h2>
              <button onClick={cerrarForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!editandoAus && (
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
              {editandoAus && (
                <p style={{ fontSize: '13px', color: '#8b949e', margin: 0 }}>
                  {editandoAus.legajos.apellido}, {editandoAus.legajos.nombre}
                </p>
              )}

              <div>
                <label style={labelStyle}>Tipo de ausencia *</label>
                <select value={formIdTipo} onChange={e => setFormIdTipo(e.target.value)} style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' as const }}>
                  <option value="">Seleccionar...</option>
                  {tiposAusencia.map(t => (
                    <option key={t.id} value={t.id}>{t.descripcion}</option>
                  ))}
                </select>
              </div>

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
                {formLoading ? 'Guardando...' : editandoAus ? 'Guardar cambios' : 'Registrar ausencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Ausencias</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {ausenciasFiltradas.length} registro{ausenciasFiltradas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
          <Plus size={14} />
          Nueva ausencia
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
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Tipo</label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={selectStyle}>
            <option value="">Todos</option>
            {tiposAusencia.map(t => (
              <option key={t.id} value={t.id}>{t.descripcion}</option>
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

        {(filtroLegajo || filtroTipo || filtroDesde || filtroHasta) && (
          <button
            onClick={() => { setFiltroLegajo(''); setFiltroTipo(''); setFiltroDesde(''); setFiltroHasta('') }}
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
      {ausenciasFiltradas.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay ausencias para los filtros seleccionados.
        </div>
      ) : (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {['Empleado', 'Tipo', 'Desde', 'Hasta', 'Días', 'Observación', ''].map((col, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ausenciasFiltradas.map((a, i) => {
                const desde = new Date(a.fecha_desde + 'T12:00:00')
                const hasta = new Date(a.fecha_hasta + 'T12:00:00')
                const dias = Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
                return (
                  <tr key={a.id} style={{ borderBottom: i < ausenciasFiltradas.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <Link href={`/legajos/${a.id_legajo}`} style={{ textDecoration: 'none' }}>
                        <span style={{ color: '#e6edf3', fontWeight: 500 }}>
                          {a.legajos.apellido}, {a.legajos.nombre}
                        </span>
                        <span style={{ color: '#484f58', fontSize: '11px', marginLeft: '6px' }}>
                          #{String(a.legajos.nro_legajo).padStart(4, '0')}
                        </span>
                      </Link>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{a.tipos_ausencia.descripcion}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(a.fecha_desde)}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(a.fecha_hasta)}</td>
                    <td style={{ padding: '10px 16px', color: '#58a6ff', fontWeight: 500 }}>{dias}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{a.observacion || '—'}</td>
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => abrirEditar(a)}
                        style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginRight: '6px' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(a)}
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
