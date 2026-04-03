"use client"

import { useState } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'
import Link from 'next/link'
import { Users, AlertTriangle, Umbrella, Calendar, Clock, FileText, ChevronDown, ChevronRight } from 'lucide-react'

type Ausencia = {
  id: number
  id_legajo: number
  id_empresa: number
  fecha_desde: string
  fecha_hasta: string
  tipos_ausencia: { id: number; descripcion: string } | null
  legajos: { apellido: string; nombre: string } | null
}

type Legajo = { id: number; id_empresa: number }

type Novedad = { id_legajo: number; id_empresa: number }

type Documento = {
  id: number
  id_legajo: number
  nombre: string
  fecha_vencimiento: string
  legajos: { apellido: string; nombre: string; id_empresa: number } | null
}

type FeriadoNac = { id: number; fecha: string; descripcion: string }
type FerEmpresa = {
  id_empresa: number
  id_feriado: number | null
  tipo: string
  trabaja: boolean
  fecha: string | null
  descripcion: string | null
  feriados?: { fecha: string; descripcion: string } | null
}
type BancoMov = { id_legajo: number; saldo_resultante: number | null }

const cardStyle: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '0.5px solid var(--c-border)',
  borderRadius: '8px',
  padding: '18px',
}

function Card({
  label, valor, sub, color, bg, icon: Icon, href,
}: {
  label: string
  valor: number | string
  sub?: string
  color: string
  bg: string
  icon: any
  href?: string
}) {
  const inner = (
    <div style={{ ...cardStyle, cursor: href ? 'pointer' : 'default', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{label}</span>
        <div style={{ background: bg, borderRadius: '6px', padding: '6px' }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <span style={{ fontSize: '28px', fontWeight: 500, color }}>{valor}</span>
      <div style={{ height: '18px', marginTop: '4px' }}>
        {sub && <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: 0 }}>{sub}</p>}
      </div>
    </div>
  )
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
  return inner
}

function Panel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', cursor: 'pointer', userSelect: 'none', borderBottom: open ? '0.5px solid var(--c-border)' : 'none' }}
      >
        {open ? <ChevronDown size={14} color="var(--c-text-secondary)" /> : <ChevronRight size={14} color="var(--c-text-secondary)" />}
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', flex: 1 }}>
          {title} <span style={{ color: 'var(--c-text-muted)', fontWeight: 400 }}>({count})</span>
        </span>
      </div>
      <div style={{
        maxHeight: open ? '400px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.2s ease',
      }}>
        {children}
      </div>
    </div>
  )
}

export default function DashboardClient({
  hoy,
  totalActivos,
  ausenciasHoyList,
  vacacionesHoyCount,
  legajosActivosList,
  novedadesHoyList,
  documentosPorVencer,
  feriadosNacHoy,
  ferEmpresaHoy,
  feriadosNacProx,
  ferEmpresaProx,
  bancoHorasMovs,
}: {
  hoy: string
  totalActivos: number
  ausenciasHoyList: Ausencia[]
  vacacionesHoyCount: number
  legajosActivosList: Legajo[]
  novedadesHoyList: Novedad[]
  documentosPorVencer: Documento[]
  feriadosNacHoy: FeriadoNac[]
  ferEmpresaHoy: FerEmpresa[]
  feriadosNacProx: FeriadoNac[]
  ferEmpresaProx: FerEmpresa[]
  bancoHorasMovs: BancoMov[]
}) {
  const { empresaActiva } = useEmpresa()
  const idEmpresa = empresaActiva?.id

  // ── Filtrar por empresa activa ───────────────────────────────
  const ausenciasEmpresa = idEmpresa
    ? ausenciasHoyList.filter(a => a.id_empresa === idEmpresa)
    : ausenciasHoyList

  const legajosEmpresa = idEmpresa
    ? legajosActivosList.filter(l => l.id_empresa === idEmpresa)
    : legajosActivosList

  const novedadesEmpresa = idEmpresa
    ? novedadesHoyList.filter(n => n.id_empresa === idEmpresa)
    : novedadesHoyList

  const docsEmpresa = idEmpresa
    ? documentosPorVencer.filter(d => (d.legajos as any)?.id_empresa === idEmpresa)
    : documentosPorVencer

  // ── Desglose ausencias ───────────────────────────────────────
  let enfermos = 0, art = 0, otrosAus = 0
  for (const a of ausenciasEmpresa) {
    const desc = (a.tipos_ausencia?.descripcion || '').toLowerCase()
    if (desc.includes('enferm')) enfermos++
    else if (desc.includes('art') || desc.includes('accidente') || desc.includes('donac')) art++
    else otrosAus++
  }
  const subAusencias = ausenciasEmpresa.length === 0
    ? undefined
    : [enfermos > 0 && `${enfermos} enfermos`, art > 0 && `${art} ART`, otrosAus > 0 && `${otrosAus} otros`]
        .filter(Boolean).join(' · ')

  // ── Es día hábil ─────────────────────────────────────────────
  const diaSemana = new Date(hoy + 'T00:00:00').getDay()
  const esFinDeSemana = diaSemana === 0 || diaSemana === 6

  const trabaja_hoy_empresa = (() => {
    if (!idEmpresa) return false
    // Nacional sin excepción trabaja=true
    const trabajaIds = new Set(
      ferEmpresaHoy
        .filter(e => e.id_empresa === idEmpresa && e.trabaja === true && e.id_feriado)
        .map(e => e.id_feriado)
    )
    const hayNacional = feriadosNacHoy.some(f => !trabajaIds.has(f.id))
    // Propio con trabaja=false
    const hayPropio = ferEmpresaHoy.some(
      e => e.id_empresa === idEmpresa && e.tipo === 'propio' && e.trabaja === false
    )
    return hayNacional || hayPropio
  })()

  const esDiaHabil = !esFinDeSemana && !trabaja_hoy_empresa

  // ── Sin novedad hoy ──────────────────────────────────────────
  const idsConNovedad = new Set(novedadesEmpresa.map(n => n.id_legajo))
  const sinNovedadHoy = legajosEmpresa.filter(l => !idsConNovedad.has(l.id)).length

  // ── Banco de horas alto (≥30h) ───────────────────────────────
  const legajosEmpresaIds = new Set(legajosEmpresa.map(l => l.id))
  const latestBanco = new Map<number, number>()
  for (const m of bancoHorasMovs) {
    if (!legajosEmpresaIds.has(m.id_legajo)) continue
    if (!latestBanco.has(m.id_legajo)) {
      latestBanco.set(m.id_legajo, m.saldo_resultante ?? 0)
    }
  }
  const bancoHorasAlto = Array.from(latestBanco.values()).filter(s => s >= 30).length

  // ── Documentos por vencer ────────────────────────────────────
  const en7dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const docsCriticos = docsEmpresa.filter(d => d.fecha_vencimiento <= en7dias).length

  // ── Próximos feriados ────────────────────────────────────────
  type FeriadoProx = { fecha: string; descripcion: string; trabajan: boolean }
  const feriadosProximos: FeriadoProx[] = []
  if (idEmpresa) {
    const trabajaIds = new Set(
      ferEmpresaProx
        .filter(e => e.id_empresa === idEmpresa && e.trabaja === true && e.id_feriado)
        .map(e => e.id_feriado)
    )
    // Nacionales
    for (const f of feriadosNacProx) {
      const trabajan = trabajaIds.has(f.id)
      feriadosProximos.push({ fecha: f.fecha, descripcion: f.descripcion, trabajan })
    }
    // Propios de empresa
    for (const e of ferEmpresaProx) {
      if (e.id_empresa !== idEmpresa || e.tipo !== 'propio' || !e.fecha) continue
      feriadosProximos.push({ fecha: e.fecha, descripcion: e.descripcion || '', trabajan: e.trabaja })
    }
    feriadosProximos.sort((a, b) => a.fecha.localeCompare(b.fecha))
  }

  // ── Colores alertas ──────────────────────────────────────────
  const sinNovedadColor = sinNovedadHoy === 0
    ? 'var(--c-green)'
    : sinNovedadHoy > 5 ? 'var(--c-red)' : 'var(--c-orange)'
  const sinNovedadBg = sinNovedadHoy === 0
    ? 'var(--c-green-bg)'
    : sinNovedadHoy > 5 ? 'var(--c-red-bg)' : 'var(--c-orange-bg)'

  const bancoColor = bancoHorasAlto === 0 ? 'var(--c-green)' : 'var(--c-orange)'
  const bancoBg = bancoHorasAlto === 0 ? 'var(--c-green-bg)' : 'var(--c-orange-bg)'

  const docsColor = docsCriticos > 0
    ? 'var(--c-red)'
    : docsEmpresa.length > 0 ? 'var(--c-orange)' : 'var(--c-green)'
  const docsBg = docsCriticos > 0
    ? 'var(--c-red-bg)'
    : docsEmpresa.length > 0 ? 'var(--c-orange-bg)' : 'var(--c-green-bg)'

  const tdStyle: React.CSSProperties = {
    padding: '9px 14px',
    fontSize: '13px',
    color: 'var(--c-text-primary)',
    borderTop: '0.5px solid var(--c-border)',
  }

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>
          Dashboard
        </h1>
        <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
          {empresaActiva?.razon_social || 'Todas las empresas'} · {formatFecha(hoy)}
        </span>
      </div>

      {/* Fila 1 — Números clave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <Card
          label="Empleados activos"
          valor={totalActivos}
          color="var(--c-green)"
          bg="var(--c-green-bg)"
          icon={Users}
          href="/legajos"
        />
        <Card
          label="Ausencias activas hoy"
          valor={ausenciasEmpresa.length}
          sub={subAusencias}
          color={ausenciasEmpresa.length > 0 ? 'var(--c-orange)' : 'var(--c-green)'}
          bg={ausenciasEmpresa.length > 0 ? 'var(--c-orange-bg)' : 'var(--c-green-bg)'}
          icon={AlertTriangle}
          href="/ausencias"
        />
        <Card
          label="En vacaciones hoy"
          valor={vacacionesHoyCount}
          color={vacacionesHoyCount > 0 ? 'var(--c-blue)' : 'var(--c-green)'}
          bg={vacacionesHoyCount > 0 ? 'var(--c-blue-bg)' : 'var(--c-green-bg)'}
          icon={Umbrella}
          href="/vacaciones"
        />
      </div>

      {/* Fila 2 — Alertas operativas */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${esDiaHabil ? 3 : 2}, 1fr)`, gap: '12px', marginBottom: '24px' }}>
        {esDiaHabil && (
          <Card
            label="Novedades sin cargar hoy"
            valor={sinNovedadHoy}
            color={sinNovedadColor}
            bg={sinNovedadBg}
            icon={Calendar}
            href="/novedades"
          />
        )}
        <Card
          label="Banco de horas alto (≥30h)"
          valor={bancoHorasAlto}
          color={bancoColor}
          bg={bancoBg}
          icon={Clock}
        />
        <Card
          label="Documentos por vencer (30 días)"
          valor={docsEmpresa.length}
          sub={docsCriticos > 0 ? `${docsCriticos} vencen en menos de 7 días` : undefined}
          color={docsColor}
          bg={docsBg}
          icon={FileText}
          href="/legajos"
        />
      </div>

      {/* Fila 3 — Paneles colapsables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Panel: Ausencias de hoy */}
        <Panel title="Ausencias de hoy" count={ausenciasEmpresa.length}>
          {ausenciasEmpresa.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>
              Sin ausencias para hoy
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--c-base)' }}>
                    {['Legajo', 'Tipo', 'Desde', 'Hasta'].map(col => (
                      <th key={col} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', color: 'var(--c-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px', borderTop: '0.5px solid var(--c-border)' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ausenciasEmpresa.map(a => (
                    <tr key={a.id}>
                      <td style={tdStyle}>{a.legajos ? `${a.legajos.apellido}, ${a.legajos.nombre}` : a.id_legajo}</td>
                      <td style={{ ...tdStyle, color: 'var(--c-text-secondary)' }}>{a.tipos_ausencia?.descripcion || '—'}</td>
                      <td style={{ ...tdStyle, color: 'var(--c-text-secondary)' }}>{formatFecha(a.fecha_desde)}</td>
                      <td style={{ ...tdStyle, color: 'var(--c-text-secondary)' }}>{formatFecha(a.fecha_hasta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '10px 14px', borderTop: '0.5px solid var(--c-border)', textAlign: 'right' }}>
                <Link href="/ausencias" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>Ver todos →</Link>
              </div>
            </>
          )}
        </Panel>

        {/* Panel: Próximos feriados */}
        <Panel title="Próximos feriados (30 días)" count={feriadosProximos.length}>
          {feriadosProximos.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>
              Sin feriados en los próximos 30 días
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--c-base)' }}>
                  {['Fecha', 'Descripción', '¿Trabajan?'].map(col => (
                    <th key={col} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', color: 'var(--c-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px', borderTop: '0.5px solid var(--c-border)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feriadosProximos.map((f, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatFecha(f.fecha)}</td>
                    <td style={{ ...tdStyle, color: 'var(--c-text-secondary)' }}>{f.descripcion}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                        background: f.trabajan ? 'var(--c-orange-bg)' : 'var(--c-green-bg)',
                        color: f.trabajan ? 'var(--c-orange)' : 'var(--c-green)',
                      }}>
                        {f.trabajan ? 'Sí' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

      </div>
    </div>
  )
}
