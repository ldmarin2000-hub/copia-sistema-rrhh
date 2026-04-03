"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'
import { traducirError } from '@/lib/errores'
import { X, Plus } from 'lucide-react'

type FeriadoNacional = {
  id: number
  fecha: string
  descripcion: string
  tipo: string
}

type FeriadoPropio = {
  id: number
  fecha: string
  descripcion: string
  trabaja: boolean
}

export default function FeriadosEmpresaClient() {
  const { empresaActiva } = useEmpresa()
  const anoActual = new Date().getFullYear()
  const [ano, setAno] = useState(anoActual)
  const [nacionales, setNacionales] = useState<FeriadoNacional[]>([])
  const [trabajaMap, setTrabajaMap] = useState<Record<number, boolean>>({})
  const [propios, setPropios] = useState<FeriadoPropio[]>([])
  const [cargando, setCargando] = useState(false)

  // Modal feriado propio
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<FeriadoPropio | null>(null)
  const [formFecha, setFormFecha] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formTrabaja, setFormTrabaja] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (empresaActiva) cargar()
  }, [empresaActiva?.id, ano])

  async function cargar() {
    if (!empresaActiva) return
    setCargando(true)
    const supabase = createClient()
    const desde = `${ano}-01-01`
    const hasta = `${ano}-12-31`

    const [{ data: nacsData }, { data: heredadosData }, { data: propiosData }] = await Promise.all([
      supabase
        .from('feriados')
        .select('id, fecha, descripcion, tipo')
        .eq('activo', true)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha'),
      supabase
        .from('feriados_empresa')
        .select('id_feriado, trabaja')
        .eq('id_empresa', empresaActiva.id)
        .eq('tipo', 'heredado'),
      supabase
        .from('feriados_empresa')
        .select('id, fecha, descripcion, trabaja')
        .eq('id_empresa', empresaActiva.id)
        .eq('tipo', 'propio')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha'),
    ])

    setNacionales(nacsData || [])

    const map: Record<number, boolean> = {}
    ;(heredadosData || []).forEach((h: any) => { map[h.id_feriado] = h.trabaja })
    setTrabajaMap(map)

    setPropios(propiosData || [])
    setCargando(false)
  }

  async function toggleTrabaja(idFeriado: number) {
    if (!empresaActiva) return
    const supabase = createClient()
    const nuevo = !(trabajaMap[idFeriado] || false)

    const { error } = await supabase
      .from('feriados_empresa')
      .upsert({
        id_empresa: empresaActiva.id,
        id_feriado: idFeriado,
        tipo: 'heredado',
        trabaja: nuevo,
      }, { onConflict: 'id_empresa,id_feriado' })

    if (!error) setTrabajaMap(prev => ({ ...prev, [idFeriado]: nuevo }))
  }

  function abrirNuevo() {
    setEditando(null)
    setFormFecha(''); setFormDesc(''); setFormTrabaja(false); setFormError('')
    setModalAbierto(true)
  }

  function abrirEditar(p: FeriadoPropio) {
    setEditando(p)
    setFormFecha(p.fecha); setFormDesc(p.descripcion); setFormTrabaja(p.trabaja); setFormError('')
    setModalAbierto(true)
  }

  async function guardarPropio() {
    if (!formFecha || !formDesc.trim()) { setFormError('Completá todos los campos.'); return }
    if (!empresaActiva) return

    const duplicado = propios.find(p => p.fecha === formFecha && (!editando || p.id !== editando.id))
    if (duplicado) { setFormError('Ya existe un feriado propio para esa fecha.'); return }

    setFormLoading(true); setFormError('')
    const supabase = createClient()

    const datos = {
      id_empresa: empresaActiva.id,
      tipo: 'propio',
      fecha: formFecha,
      descripcion: formDesc.trim(),
      trabaja: formTrabaja,
    }

    if (editando) {
      const { error } = await supabase.from('feriados_empresa').update(datos).eq('id', editando.id)
      if (error) { setFormError(traducirError(error.message)); setFormLoading(false); return }
    } else {
      const { error } = await supabase.from('feriados_empresa').insert(datos)
      if (error) { setFormError(traducirError(error.message)); setFormLoading(false); return }
    }

    const coincidenacional = !editando && nacionales.find(n => n.fecha === formFecha)
    await cargar()
    setModalAbierto(false)
    setFormLoading(false)

    if (coincidenacional) {
      alert(`Nota: la fecha ${formatFecha(formFecha)} coincide con el feriado nacional "${coincidenacional.descripcion}".`)
    }
  }

  async function eliminarPropio(p: FeriadoPropio) {
    if (!confirm(`¿Eliminar feriado "${p.descripcion}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('feriados_empresa').delete().eq('id', p.id)
    if (error) alert(traducirError(error.message))
    else cargar()
  }

  function badgeTipo(tipo: string) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      nacional:             { label: 'Nacional',    bg: 'var(--c-blue-bg)',   color: 'var(--c-blue)' },
      no_laborable:         { label: 'No laborable', bg: 'var(--c-elevated)', color: 'var(--c-text-secondary)' },
      provincial_municipal: { label: 'Provincial',   bg: 'var(--c-purple-bg)', color: 'var(--c-purple)' },
      sindical:             { label: 'Sindical',     bg: 'var(--c-orange-bg)', color: 'var(--c-orange)' },
      propio:               { label: 'Propio',       bg: 'var(--c-green-bg)', color: 'var(--c-green)' },
    }
    const c = map[tipo] || map.nacional
    return <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: c.bg, color: c.color }}>{c.label}</span>
  }

  if (!empresaActiva) {
    return <div style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  const anos = [anoActual - 1, anoActual, anoActual + 1, anoActual + 2]

  return (
    <div style={{ padding: '24px 32px', maxWidth: '900px' }}>

      {/* Modal feriado propio */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                {editando ? 'Editar feriado propio' : 'Nuevo feriado propio'}
              </h2>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descripción *</label>
                <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Ej: Día del gremio UOCRA" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="formTrabaja" checked={formTrabaja} onChange={e => setFormTrabaja(e.target.checked)} />
                <label htmlFor="formTrabaja" style={{ fontSize: '13px', color: 'var(--c-text-secondary)', cursor: 'pointer' }}>
                  La empresa trabaja ese día
                </label>
              </div>
              {formError && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{formError}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setModalAbierto(false)} style={btnSecundario}>Cancelar</button>
              <button onClick={guardarPropio} disabled={formLoading} style={{ ...btnPrimario, opacity: formLoading ? 0.6 : 1 }}>
                {formLoading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--c-text-primary)', margin: '0 0 4px' }}>Feriados de la empresa</h1>
          <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', margin: 0 }}>
            {empresaActiva.razon_social} · Configurá qué días son feriados y si la empresa trabaja.
          </p>
        </div>
        <select value={ano} onChange={e => setAno(parseInt(e.target.value))} style={{ padding: '7px 10px', borderRadius: '6px', background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {cargando ? (
        <div style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}>Cargando...</div>
      ) : (
        <>
          {/* Sección 1: Nacionales */}
          <div style={{ marginBottom: '32px' }}>
            <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', margin: '0 0 8px' }}>
              Feriados nacionales
            </p>
            <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: '0 0 12px' }}>
              Marcá "Trabaja" si la empresa trabaja ese día (generará recargo del 100% en novedades).
            </p>
            {nacionales.length === 0 ? (
              <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '32px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>
                No hay feriados nacionales cargados para {ano}.
              </div>
            ) : (
              <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--c-base)', borderBottom: '0.5px solid var(--c-border)' }}>
                      {['Fecha', 'Descripción', 'Tipo', 'Trabaja ese día'].map(col => (
                        <th key={col} style={{ textAlign: col === 'Trabaja ese día' ? 'center' : 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500, fontSize: '12px' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nacionales.map((f, i) => {
                      const trabaja = trabajaMap[f.id] || false
                      return (
                        <tr key={f.id} style={{ borderBottom: i < nacionales.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)', fontWeight: 500, whiteSpace: 'nowrap' as const }}>{formatFecha(f.fecha)}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)' }}>{f.descripcion}</td>
                          <td style={{ padding: '10px 16px' }}>{badgeTipo(f.tipo)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={trabaja}
                              onChange={() => toggleTrabaja(f.id)}
                              title={trabaja ? 'La empresa trabaja (clic para desactivar)' : 'La empresa no trabaja (clic para activar)'}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sección 2: Propios */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                Feriados propios de la empresa
              </p>
              <button onClick={abrirNuevo} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>
                <Plus size={13} /> Agregar feriado propio
              </button>
            </div>
            {propios.length === 0 ? (
              <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '32px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>
                No hay feriados propios para {ano}.
              </div>
            ) : (
              <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--c-base)', borderBottom: '0.5px solid var(--c-border)' }}>
                      {['Fecha', 'Descripción', 'Trabaja ese día', ''].map(col => (
                        <th key={col} style={{ textAlign: col === 'Trabaja ese día' ? 'center' : 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500, fontSize: '12px' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {propios.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < propios.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)', fontWeight: 500, whiteSpace: 'nowrap' as const }}>{formatFecha(p.fecha)}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)' }}>{p.descripcion}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                            background: p.trabaja ? 'var(--c-orange-bg)' : 'var(--c-green-bg)',
                            color: p.trabaja ? 'var(--c-orange)' : 'var(--c-green)',
                          }}>
                            {p.trabaja ? 'Sí (con recargo)' : 'No (feriado)'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' as const }}>
                          <button onClick={() => abrirEditar(p)} style={{ background: 'transparent', border: 'none', color: 'var(--c-text-secondary)', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
                          <button onClick={() => eliminarPropio(p)} style={{ background: 'transparent', border: 'none', color: 'var(--c-red)', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '7px 10px', borderRadius: '6px',
  background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
  color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
}
const labelStyle = {
  fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px',
}
const btnPrimario = {
  background: 'var(--c-blue-btn)', color: 'white', border: 'none',
  borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
}
const btnSecundario = {
  background: 'transparent', border: '0.5px solid var(--c-border)',
  color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px',
  fontSize: '13px', cursor: 'pointer',
}
