"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'

type TipoAusencia = { id: number; descripcion: string }
type Adicional = { id: number; descripcion: string }

const CONCEPTOS_FIJOS_HORAS = [
  { key: 'hs_normales',  label: 'Hs. Normales' },
  { key: 'hs_extra_50',  label: 'Hs. Extra 50%' },
  { key: 'hs_extra_100', label: 'Hs. Extra 100%' },
  { key: 'hs_nocturnas', label: 'Hs. Nocturnas' },
  { key: 'hs_banco_50',  label: 'Hs. Banco 50%' },
  { key: 'hs_banco_100', label: 'Hs. Banco 100%' },
]

const CONCEPTOS_FIJOS_OTROS = [
  { key: 'feriados',   label: 'Feriados' },
  { key: 'vacaciones', label: 'Vacaciones' },
  { key: 'franco_bh',  label: 'Franco banco de horas' },
]

const inputStyle: React.CSSProperties = {
  width: '64px',
  padding: '4px 8px',
  background: 'var(--c-base)',
  border: '0.5px solid var(--c-border)',
  borderRadius: '4px',
  color: 'var(--c-text-primary)',
  fontSize: '12px',
  textAlign: 'center',
  fontFamily: 'monospace',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '6px',
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
  const [codigos, setCodigos] = useState<Record<string, string>>({})
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
      supabase.from('exportacion_config')
        .select('concepto_fijo, tipo_ausencia_id, adicional_id, codigo')
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
    ]).then(([{ data: config }, { data: tipos }, { data: adics }]) => {
      const map: Record<string, string> = {}
      for (const row of (config || [])) {
        if (row.concepto_fijo) map[row.concepto_fijo] = row.codigo || ''
        else if (row.tipo_ausencia_id) map[`aus_${row.tipo_ausencia_id}`] = row.codigo || ''
        else if (row.adicional_id) map[`adic_${row.adicional_id}`] = row.codigo || ''
      }
      setCodigos(map)
      setTiposAusencia(tipos || [])
      setAdicionales(adics || [])
      setCargando(false)
    })
  }, [empresaActiva?.id])

  function setCode(key: string, value: string) {
    setCodigos(prev => ({ ...prev, [key]: value }))
  }

  async function guardar() {
    if (!empresaActiva) return
    setGuardando(true)
    const supabase = createClient()

    const rows: { id_empresa: number; concepto_fijo?: string; tipo_ausencia_id?: number; adicional_id?: number; codigo: string }[] = []

    for (const c of CONCEPTOS_FIJOS_HORAS) {
      const codigo = (codigos[c.key] || '').trim()
      if (codigo) rows.push({ id_empresa: empresaActiva.id, concepto_fijo: c.key, codigo })
    }
    for (const c of CONCEPTOS_FIJOS_OTROS) {
      const codigo = (codigos[c.key] || '').trim()
      if (codigo) rows.push({ id_empresa: empresaActiva.id, concepto_fijo: c.key, codigo })
    }
    for (const t of tiposAusencia) {
      const codigo = (codigos[`aus_${t.id}`] || '').trim()
      if (codigo) rows.push({ id_empresa: empresaActiva.id, tipo_ausencia_id: t.id, codigo })
    }
    for (const a of adicionales) {
      const codigo = (codigos[`adic_${a.id}`] || '').trim()
      if (codigo) rows.push({ id_empresa: empresaActiva.id, adicional_id: a.id, codigo })
    }

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

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>Configuración de exportación</h1>
        <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
          Códigos de conceptos para liquidación — {empresaActiva.razon_social}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>

        {/* Horas */}
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '16px 20px' }}>
          <p style={sectionTitleStyle}>Horas</p>
          {CONCEPTOS_FIJOS_HORAS.map(c => (
            <div key={c.key} style={rowStyle}>
              <span style={labelStyle}>{c.label}</span>
              <input
                type="text"
                maxLength={4}
                value={codigos[c.key] || ''}
                onChange={e => setCode(c.key, e.target.value)}
                placeholder="0000"
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {/* Otros */}
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '16px 20px' }}>
          <p style={sectionTitleStyle}>Otros</p>
          {CONCEPTOS_FIJOS_OTROS.map(c => (
            <div key={c.key} style={rowStyle}>
              <span style={labelStyle}>{c.label}</span>
              <input
                type="text"
                maxLength={4}
                value={codigos[c.key] || ''}
                onChange={e => setCode(c.key, e.target.value)}
                placeholder="0000"
                style={inputStyle}
              />
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
                <input
                  type="text"
                  maxLength={4}
                  value={codigos[`aus_${t.id}`] || ''}
                  onChange={e => setCode(`aus_${t.id}`, e.target.value)}
                  placeholder="0000"
                  style={inputStyle}
                />
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
                <input
                  type="text"
                  maxLength={4}
                  value={codigos[`adic_${a.id}`] || ''}
                  onChange={e => setCode(`adic_${a.id}`, e.target.value)}
                  placeholder="0000"
                  style={inputStyle}
                />
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
