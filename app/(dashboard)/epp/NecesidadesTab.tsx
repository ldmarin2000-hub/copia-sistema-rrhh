"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type HabitualItem = {
  id: number
  id_empresa: number
  id_legajo: number
  id_epp: number
  talle?: string
  epp_catalogo: { id: number, descripcion: string, tiene_vencimiento: boolean, meses_renovacion?: number }
  legajos: { id: number, apellido: string, nombre: string, nro_legajo: number, id_empresa: number } | null
}

type EppEntrega = {
  id: number
  id_empresa: number
  id_legajo: number
  id_epp: number
  talle?: string
  fecha_vencimiento?: string
  devuelto: boolean
}

type Props = {
  habitualTodos: HabitualItem[]
  entregas: EppEntrega[]
  idEmpresa: number
}

type TipoNecesidad = 'sin_entrega' | 'vencido' | 'por_vencer' | 'vigente'

type Necesidad = {
  idLegajo: number
  nroLegajo: number
  apellido: string
  nombre: string
  idEpp: number
  descEpp: string
  talle?: string
  tipo: TipoNecesidad
  fechaVencimiento?: string
}

type Vista = 'epp' | 'empleado' | 'vencimiento'

const TIPO_INFO: Record<TipoNecesidad, { label: string, color: string, bg: string, orden: number }> = {
  sin_entrega: { label: 'Sin entrega', color: '#f85149', bg: '#3a1a1a', orden: 1 },
  vencido:     { label: 'Vencido',     color: '#f85149', bg: '#3a1a1a', orden: 2 },
  por_vencer:  { label: 'Por vencer',  color: '#d29922', bg: '#3a2f1a', orden: 3 },
  vigente:     { label: 'Vigente',     color: '#3fb950', bg: '#1a3a2a', orden: 4 },
}

export default function NecesidadesTab({ habitualTodos, entregas, idEmpresa }: Props) {
  const [vista, setVista] = useState<Vista>('epp')
  const [mostrarVigentes, setMostrarVigentes] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const hoy = new Date().toISOString().split('T')[0]
  const en30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Calcular necesidades
  const todasLasNecesidades: Necesidad[] = []
  const habitualFiltrado = habitualTodos.filter(h => h.legajos?.id_empresa === idEmpresa && h.legajos !== null)

  for (const h of habitualFiltrado) {
    if (!h.legajos) continue

    const entregaActiva = entregas.find(
      e => e.id_legajo === h.id_legajo && e.id_epp === h.id_epp && !e.devuelto && e.id_empresa === idEmpresa
    )

    let tipo: TipoNecesidad

    if (!entregaActiva) {
      tipo = 'sin_entrega'
    } else if (entregaActiva.fecha_vencimiento) {
      if (entregaActiva.fecha_vencimiento < hoy) {
        tipo = 'vencido'
      } else if (entregaActiva.fecha_vencimiento <= en30) {
        tipo = 'por_vencer'
      } else {
        tipo = 'vigente'
      }
    } else {
      continue // activo sin vencimiento → no aparece
    }

    todasLasNecesidades.push({
      idLegajo: h.legajos.id,
      nroLegajo: h.legajos.nro_legajo,
      apellido: h.legajos.apellido,
      nombre: h.legajos.nombre,
      idEpp: h.id_epp,
      descEpp: h.epp_catalogo.descripcion,
      talle: h.talle,
      tipo,
      fechaVencimiento: entregaActiva?.fecha_vencimiento,
    })
  }

  const necesidadesBase = mostrarVigentes
    ? todasLasNecesidades
    : todasLasNecesidades.filter(n => n.tipo !== 'vigente')

  const necesidades = busqueda
    ? necesidadesBase.filter(n => {
        const b = busqueda.toLowerCase()
        return n.descEpp.toLowerCase().includes(b) || `${n.apellido} ${n.nombre}`.toLowerCase().includes(b)
      })
    : necesidadesBase

  const urgentes = todasLasNecesidades.filter(n => n.tipo !== 'vigente').length
  const vigentes = todasLasNecesidades.filter(n => n.tipo === 'vigente').length
  const resultadosBusqueda = necesidades.length

  if (todasLasNecesidades.length === 0) {
    return (
      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
        No hay necesidades de entrega. Todo el EPP habitual está al día.
      </div>
    )
  }

  const filaEmpleado = (n: Necesidad, i: number, total: number) => {
    const info = TIPO_INFO[n.tipo]
    return (
      <tr key={`${n.idLegajo}-${n.idEpp}`} style={{ borderBottom: i < total - 1 ? '0.5px solid #21262d' : 'none' }}>
        <td style={{ padding: '8px 16px', color: '#e6edf3' }}>
          <span style={{ color: '#484f58', fontSize: '11px', marginRight: '8px' }}>{n.nroLegajo}</span>
          {n.apellido}, {n.nombre}
        </td>
        <td style={{ padding: '8px 16px' }}>
          {n.talle
            ? <span style={{ background: '#1f2937', color: '#93c5fd', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{n.talle}</span>
            : <span style={{ color: '#484f58' }}>—</span>}
        </td>
        <td style={{ padding: '8px 16px' }}>
          <span style={{ background: info.bg, color: info.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{info.label}</span>
        </td>
        <td style={{ padding: '8px 16px', color: n.tipo === 'vencido' ? '#f85149' : '#8b949e' }}>
          {n.fechaVencimiento ? formatFecha(n.fechaVencimiento) : '—'}
        </td>
        <td style={{ padding: '8px 16px', textAlign: 'right' }}>
          <Link href={`/legajos/${n.idLegajo}`} target="_blank" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>
            Ver ficha ↗
          </Link>
        </td>
      </tr>
    )
  }

  // — Vista por EPP —
  const renderPorEpp = () => {
    const grupos = new Map<number, { descEpp: string, items: Necesidad[] }>()
    for (const n of necesidades) {
      if (!grupos.has(n.idEpp)) grupos.set(n.idEpp, { descEpp: n.descEpp, items: [] })
      grupos.get(n.idEpp)!.items.push(n)
    }

    return Array.from(grupos.entries()).map(([idEpp, { descEpp, items }]) => (
      <div key={idEpp} style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>{descEpp}</p>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>{items.length} empleado{items.length !== 1 ? 's' : ''}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #21262d', background: '#0d1117' }}>
              {['Empleado', 'Talle', 'Estado', 'Vencimiento', ''].map(col => (
                <th key={col} style={{ textAlign: 'left', padding: '8px 16px', color: '#8b949e', fontWeight: 400, fontSize: '12px' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((n, i) => filaEmpleado(n, i, items.length))}
          </tbody>
        </table>
      </div>
    ))
  }

  // — Vista por Empleado —
  const renderPorEmpleado = () => {
    const grupos = new Map<number, { apellido: string, nombre: string, nroLegajo: number, idLegajo: number, items: Necesidad[] }>()
    for (const n of necesidades) {
      if (!grupos.has(n.idLegajo)) grupos.set(n.idLegajo, { apellido: n.apellido, nombre: n.nombre, nroLegajo: n.nroLegajo, idLegajo: n.idLegajo, items: [] })
      grupos.get(n.idLegajo)!.items.push(n)
    }
    const sorted = Array.from(grupos.values()).sort((a, b) => a.apellido.localeCompare(b.apellido))

    return sorted.map(({ idLegajo, apellido, nombre, nroLegajo, items }) => (
      <div key={idLegajo} style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#484f58' }}>{nroLegajo}</span>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>{apellido}, {nombre}</p>
          </div>
          <Link href={`/legajos/${idLegajo}`} target="_blank" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver ficha ↗</Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #21262d', background: '#0d1117' }}>
              {['EPP', 'Talle', 'Estado', 'Vencimiento'].map(col => (
                <th key={col} style={{ textAlign: 'left', padding: '8px 16px', color: '#8b949e', fontWeight: 400, fontSize: '12px' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((n, i) => {
              const info = TIPO_INFO[n.tipo]
              return (
                <tr key={`${n.idLegajo}-${n.idEpp}`} style={{ borderBottom: i < items.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                  <td style={{ padding: '8px 16px', color: '#e6edf3' }}>{n.descEpp}</td>
                  <td style={{ padding: '8px 16px' }}>
                    {n.talle
                      ? <span style={{ background: '#1f2937', color: '#93c5fd', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{n.talle}</span>
                      : <span style={{ color: '#484f58' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <span style={{ background: info.bg, color: info.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{info.label}</span>
                  </td>
                  <td style={{ padding: '8px 16px', color: n.tipo === 'vencido' ? '#f85149' : '#8b949e' }}>
                    {n.fechaVencimiento ? formatFecha(n.fechaVencimiento) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    ))
  }

  // — Vista por Vencimiento —
  const renderPorVencimiento = () => {
    const sorted = [...necesidades].sort((a, b) => {
      const oa = TIPO_INFO[a.tipo].orden
      const ob = TIPO_INFO[b.tipo].orden
      if (oa !== ob) return oa - ob
      if (a.fechaVencimiento && b.fechaVencimiento) return a.fechaVencimiento.localeCompare(b.fechaVencimiento)
      return a.apellido.localeCompare(b.apellido)
    })

    return (
      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #30363d' }}>
              {['Estado', 'Vencimiento', 'Empleado', 'EPP', 'Talle', ''].map(col => (
                <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((n, i) => {
              const info = TIPO_INFO[n.tipo]
              return (
                <tr key={`${n.idLegajo}-${n.idEpp}`} style={{ borderBottom: i < sorted.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: info.bg, color: info.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{info.label}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: n.tipo === 'vencido' ? '#f85149' : '#8b949e' }}>
                    {n.fechaVencimiento ? formatFecha(n.fechaVencimiento) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3' }}>
                    <span style={{ color: '#484f58', fontSize: '11px', marginRight: '8px' }}>{n.nroLegajo}</span>
                    {n.apellido}, {n.nombre}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{n.descEpp}</td>
                  <td style={{ padding: '10px 16px' }}>
                    {n.talle
                      ? <span style={{ background: '#1f2937', color: '#93c5fd', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{n.talle}</span>
                      : <span style={{ color: '#484f58' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <Link href={`/legajos/${n.idLegajo}`} target="_blank" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver ficha ↗</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      {/* Contadores */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['sin_entrega', 'vencido', 'por_vencer'] as TipoNecesidad[]).map(tipo => {
          const count = todasLasNecesidades.filter(n => n.tipo === tipo).length
          if (count === 0) return null
          const info = TIPO_INFO[tipo]
          return (
            <div key={tipo} style={{ background: info.bg, border: `0.5px solid ${info.color}40`, borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 600, color: info.color }}>{count}</span>
              <span style={{ fontSize: '12px', color: info.color }}>{info.label}</span>
            </div>
          )
        })}
        {vigentes > 0 && (
          <button
            onClick={() => setMostrarVigentes(v => !v)}
            style={{
              background: mostrarVigentes ? '#1a3a2a' : 'transparent',
              border: `0.5px solid ${mostrarVigentes ? '#3fb95040' : '#30363d'}`,
              borderRadius: '8px', padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#3fb950' }}>{vigentes}</span>
            <span style={{ fontSize: '12px', color: '#3fb950' }}>Vigente{vigentes !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: '11px', color: '#484f58', marginLeft: '2px' }}>{mostrarVigentes ? '▲ ocultar' : '▼ mostrar'}</span>
          </button>
        )}
      </div>

      {necesidades.length === 0 ? (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
          {urgentes === 0 ? 'No hay entregas urgentes pendientes.' : ''}
          {vigentes > 0 && urgentes === 0 ? ' Mostrá los vigentes para ver el calendario de vencimientos.' : ''}
        </div>
      ) : (
        <>
          {/* Búsqueda */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={13} color="#484f58" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Filtrar por EPP o empleado..."
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: '6px', background: '#161b22', border: '0.5px solid #30363d', color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
            )}
          </div>

          {/* Toggle vista */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', alignItems: 'center' }}>
            {busqueda && <span style={{ fontSize: '12px', color: '#8b949e', marginRight: '4px' }}>{resultadosBusqueda} resultado{resultadosBusqueda !== 1 ? 's' : ''}</span>}
            {([['epp', 'Por EPP'], ['empleado', 'Por empleado'], ['vencimiento', 'Por vencimiento']] as [Vista, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setVista(v)} style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                background: vista === v ? '#2563eb' : 'transparent',
                color: vista === v ? 'white' : '#8b949e',
                border: vista === v ? 'none' : '0.5px solid #30363d',
              }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {vista === 'epp' && renderPorEpp()}
            {vista === 'empleado' && renderPorEmpleado()}
            {vista === 'vencimiento' && renderPorVencimiento()}
          </div>
        </>
      )}
    </>
  )
}
