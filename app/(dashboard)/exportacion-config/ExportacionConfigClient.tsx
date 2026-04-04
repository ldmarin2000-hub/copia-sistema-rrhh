"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'

type ConceptoBejerman = { id: number; codigo: string; descripcion: string }
type TipoAusencia = { id: number; descripcion: string }
type Adicional = { id: number; descripcion: string }

// Claves fijas — deben coincidir exactamente con las usadas en ExportarClient
const CONCEPTOS_FIJOS_HORAS = [
  { key: 'hs_normales',  label: 'Hs. Normales' },
  { key: 'hs_extra_50',  label: 'Hs. Extra 50%' },
  { key: 'hs_extra_100', label: 'Hs. Extra 100%' },
  { key: 'hs_nocturnas', label: 'Hs. Nocturnas' },
  { key: 'hs_bh_50',     label: 'Hs. Banco 50%' },
  { key: 'hs_bh_100',    label: 'Hs. Banco 100%' },
]

const CONCEPTOS_FIJOS_OTROS = [
  { key: 'feriados',   label: 'Feriados' },
  { key: 'vacaciones', label: 'Vacaciones' },
  { key: 'franco_bh',  label: 'Franco banco de horas' },
]

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '8px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--c-text-secondary)',
  flex: 1,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--c-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '10px',
  marginTop: '0',
}

export default function ExportacionConfigClient() {
  const { empresaActiva } = useEmpresa()
  // key → concepto_bejerman_id (null = sin asignar)
  const [selecciones, setSelecciones] = useState<Record<string, number | null>>({})
  const [conceptosBejerman, setConceptosBejerman] = useState<ConceptoBejerman[]>([])
  const [tiposAusencia, setTiposAusencia] = useState<TipoAusencia[]>([])
  const [adicionales, setAdicionales] = useState<Adicional[]>([])
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!empresaActiva) return
    const supabase = createClient()
    setCargando(true)

    Promise.all([
      supabase.from('conceptos_bejerman')
        .select('id, codigo, descripcion')
        .eq('id_empresa', empresaActiva.id)
        .eq('activo', true)
        .order('codigo'),
      supabase.from('exportacion_config')
        .select('concepto_fijo, tipo_ausencia_id, adicional_id, concepto_bejerman_id')
        .eq('id_empresa', empresaActiva.id),
      supabase.from('tipos_ausencia')
        .select('id, descripcion')
        .eq('activo', true)
        .order('descripcion'),
      supabase.from('adicionales')
        .select('id, descripcion')
        .eq('id_empresa', empresaActiva.id)
        .eq('activo', true)
        .order('descripcion'),
    ]).then(([{ data: bej }, { data: config }, { data: tipos }, { data: adics }]) => {
      setConceptosBejerman(bej || [])
      setTiposAusencia(tipos || [])
      setAdicionales(adics || [])

      const map: Record<string, number | null> = {}
      for (const row of (config || [])) {
        const val = row.concepto_bejerman_id ?? null
        if (row.concepto_fijo) map[row.concepto_fijo] = val
        else if (row.tipo_ausencia_id) map[`aus_${row.tipo_ausencia_id}`] = val
        else if (row.adicional_id) map[`adic_${row.adicional_id}`] = val
      }
      setSelecciones(map)
      setCargando(false)
    })
  }, [empresaActiva?.id])

  function setSel(key: string, value: number | null) {
    setSelecciones(prev => ({ ...prev, [key]: value }))
  }

  async function guardar() {
    if (!empresaActiva) return
    setGuardando(true)
    const supabase = createClient()

    // Construir todas las filas a insertar
    type Row = {
      id_empresa: number
      concepto_bejerman_id: number
      codigo: string
      concepto_fijo?: string
      tipo_ausencia_id?: number
      adicional_id?: number
    }
    const rows: Row[] = []

    const addFijo = (key: string, extra: Partial<Row>) => {
      const id = selecciones[key]
      if (!id) return
      const cb = conceptosBejerman.find(c => c.id === id)
      if (!cb) return
      rows.push({ id_empresa: empresaActiva.id, concepto_bejerman_id: id, codigo: cb.codigo, ...extra })
    }

    for (const c of CONCEPTOS_FIJOS_HORAS) addFijo(c.key, { concepto_fijo: c.key })
    for (const c of CONCEPTOS_FIJOS_OTROS) addFijo(c.key, { concepto_fijo: c.key })
    for (const t of tiposAusencia) addFijo(`aus_${t.id}`, { tipo_ausencia_id: t.id })
    for (const a of adicionales) addFijo(`adic_${a.id}`, { adicional_id: a.id })

    await supabase.from('exportacion_config').delete().eq('id_empresa', empresaActiva.id)
    if (rows.length > 0) await supabase.from('exportacion_config').insert(rows)

    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  if (!empresaActiva) {
    return <div style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  if (cargando) {
    return <div style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}>Cargando...</div>
  }

  const ConceptoSelect = ({ keyName }: { keyName: string }) => (
    <select
      value={selecciones[keyName] ?? ''}
      onChange={e => setSel(keyName, e.target.value ? Number(e.target.value) : null)}
      style={{
        padding: '4px 8px',
        background: 'var(--c-base)',
        border: '0.5px solid var(--c-border)',
        borderRadius: '4px',
        color: selecciones[keyName] ? 'var(--c-text-primary)' : 'var(--c-text-muted)',
        fontSize: '12px',
        minWidth: '220px',
      }}
    >
      <option value="">Seleccionar...</option>
      {conceptosBejerman.map(cb => (
        <option key={cb.id} value={cb.id}>{cb.codigo} — {cb.descripcion}</option>
      ))}
    </select>
  )

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>Configuración de exportación</h1>
        <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
          Conceptos Bejerman por tipo — {empresaActiva.razon_social}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '16px' }}>

        {/* Horas */}
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '16px 20px' }}>
          <p style={sectionTitleStyle}>Horas</p>
          {CONCEPTOS_FIJOS_HORAS.map(c => (
            <div key={c.key} style={rowStyle}>
              <span style={labelStyle}>{c.label}</span>
              <ConceptoSelect keyName={c.key} />
            </div>
          ))}
        </div>

        {/* Otros */}
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '16px 20px' }}>
          <p style={sectionTitleStyle}>Otros</p>
          {CONCEPTOS_FIJOS_OTROS.map(c => (
            <div key={c.key} style={rowStyle}>
              <span style={labelStyle}>{c.label}</span>
              <ConceptoSelect keyName={c.key} />
            </div>
          ))}
        </div>

        {/* Ausencias */}
        {tiposAusencia.length > 0 && (
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '16px 20px' }}>
            <p style={sectionTitleStyle}>Ausencias</p>
            {tiposAusencia.map(t => (
              <div key={t.id} style={rowStyle}>
                <span style={labelStyle}>{t.descripcion}</span>
                <ConceptoSelect keyName={`aus_${t.id}`} />
              </div>
            ))}
          </div>
        )}

        {/* Adicionales */}
        {adicionales.length > 0 && (
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '16px 20px' }}>
            <p style={sectionTitleStyle}>Adicionales</p>
            {adicionales.map(a => (
              <div key={a.id} style={rowStyle}>
                <span style={labelStyle}>{a.descripcion}</span>
                <ConceptoSelect keyName={`adic_${a.id}`} />
              </div>
            ))}
          </div>
        )}

      </div>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={guardar}
          disabled={guardando}
          style={{
            background: guardado ? 'var(--c-green-bg)' : 'var(--c-blue-bg)',
            border: `0.5px solid ${guardado ? 'var(--c-green)' : 'var(--c-blue)'}40`,
            color: guardado ? 'var(--c-green)' : 'var(--c-blue)',
            borderRadius: '6px',
            padding: '8px 20px',
            fontSize: '13px',
            cursor: 'pointer',
            opacity: guardando ? 0.6 : 1,
          }}
        >
          {guardado ? '✓ Guardado' : guardando ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
