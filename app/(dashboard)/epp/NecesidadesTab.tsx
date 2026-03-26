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
  sin_entrega: { label: 'Sin entrega', color: 'var(--c-red)', bg: 'var(--c-red-bg)', orden: 1 },
  vencido:     { label: 'Vencido',     color: 'var(--c-red)', bg: 'var(--c-red-bg)', orden: 2 },
  por_vencer:  { label: 'Por vencer',  color: 'var(--c-orange)', bg: 'var(--c-orange-bg)', orden: 3 },
  vigente:     { label: 'Vigente',     color: 'var(--c-green)', bg: 'var(--c-green-bg)', orden: 4 },
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
      tipo = 'vigente' // activo sin fecha de vencimiento
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
      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
        No hay necesidades de entrega. Todo el EPP habitual está al día.
      </div>
    )
  }

  const filaEmpleado = (n: Necesidad, i: number, total: number) => {
    const info = TIPO_INFO[n.tipo]
    return (
      <tr key={`${n.idLegajo}-${n.idEpp}`} style={{ borderBottom: i < total - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
        <td style={{ padding: '8px 16px', color: 'var(--c-text-primary)' }}>
          <span style={{ color: 'var(--c-text-muted)', fontSize: '11px', marginRight: '8px' }}>{n.nroLegajo}</span>
          {n.apellido}, {n.nombre}
        </td>
        <td style={{ padding: '8px 16px' }}>
          {n.talle
            ? <span style={{ background: 'var(--c-talle-bg)', color: 'var(--c-talle-color)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{n.talle}</span>
            : <span style={{ color: 'var(--c-text-muted)' }}>—</span>}
        </td>
        <td style={{ padding: '8px 16px' }}>
          <span style={{ background: info.bg, color: info.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{info.label}</span>
        </td>
        <td style={{ padding: '8px 16px', color: n.tipo === 'vencido' ? 'var(--c-red)' : 'var(--c-text-secondary)' }}>
          {n.fechaVencimiento ? formatFecha(n.fechaVencimiento) : '—'}
        </td>
        <td style={{ padding: '8px 16px', textAlign: 'right' }}>
          <Link href={`/legajos/${n.idLegajo}`} target="_blank" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>
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
      <div key={idEpp} style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>{descEpp}</p>
          <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{items.length} empleado{items.length !== 1 ? 's' : ''}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--c-elevated)', background: 'var(--c-base)' }}>
              {['Empleado', 'Talle', 'Estado', 'Vencimiento', ''].map(col => (
                <th key={col} style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--c-text-secondary)', fontWeight: 400, fontSize: '12px' }}>{col}</th>
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
      <div key={idLegajo} style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>{nroLegajo}</span>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>{apellido}, {nombre}</p>
          </div>
          <Link href={`/legajos/${idLegajo}`} target="_blank" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>Ver ficha ↗</Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--c-elevated)', background: 'var(--c-base)' }}>
              {['EPP', 'Talle', 'Estado', 'Vencimiento'].map(col => (
                <th key={col} style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--c-text-secondary)', fontWeight: 400, fontSize: '12px' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((n, i) => {
              const info = TIPO_INFO[n.tipo]
              return (
                <tr key={`${n.idLegajo}-${n.idEpp}`} style={{ borderBottom: i < items.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                  <td style={{ padding: '8px 16px', color: 'var(--c-text-primary)' }}>{n.descEpp}</td>
                  <td style={{ padding: '8px 16px' }}>
                    {n.talle
                      ? <span style={{ background: 'var(--c-talle-bg)', color: 'var(--c-talle-color)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{n.talle}</span>
                      : <span style={{ color: 'var(--c-text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <span style={{ background: info.bg, color: info.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{info.label}</span>
                  </td>
                  <td style={{ padding: '8px 16px', color: n.tipo === 'vencido' ? 'var(--c-red)' : 'var(--c-text-secondary)' }}>
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
      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
              {['Estado', 'Vencimiento', 'Empleado', 'EPP', 'Talle', ''].map(col => (
                <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((n, i) => {
              const info = TIPO_INFO[n.tipo]
              return (
                <tr key={`${n.idLegajo}-${n.idEpp}`} style={{ borderBottom: i < sorted.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: info.bg, color: info.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{info.label}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: n.tipo === 'vencido' ? 'var(--c-red)' : 'var(--c-text-secondary)' }}>
                    {n.fechaVencimiento ? formatFecha(n.fechaVencimiento) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)' }}>
                    <span style={{ color: 'var(--c-text-muted)', fontSize: '11px', marginRight: '8px' }}>{n.nroLegajo}</span>
                    {n.apellido}, {n.nombre}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{n.descEpp}</td>
                  <td style={{ padding: '10px 16px' }}>
                    {n.talle
                      ? <span style={{ background: 'var(--c-talle-bg)', color: 'var(--c-talle-color)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{n.talle}</span>
                      : <span style={{ color: 'var(--c-text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <Link href={`/legajos/${n.idLegajo}`} target="_blank" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>Ver ficha ↗</Link>
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
              background: mostrarVigentes ? 'var(--c-green-bg)' : 'transparent',
              border: `0.5px solid ${mostrarVigentes ? 'var(--c-green)40' : 'var(--c-border)'}`,
              borderRadius: '8px', padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--c-green)' }}>{vigentes}</span>
            <span style={{ fontSize: '12px', color: 'var(--c-green)' }}>Vigente{vigentes !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginLeft: '2px' }}>{mostrarVigentes ? '▲ ocultar' : '▼ mostrar'}</span>
          </button>
        )}
      </div>

      {necesidades.length === 0 ? (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '32px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          {urgentes === 0 ? 'No hay entregas urgentes pendientes.' : ''}
          {vigentes > 0 && urgentes === 0 ? ' Mostrá los vigentes para ver el calendario de vencimientos.' : ''}
        </div>
      ) : (
        <>
          {/* Búsqueda */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={13} color="var(--c-text-muted)" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Filtrar por EPP o empleado..."
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: '6px', background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
            )}
          </div>

          {/* Toggle vista */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', alignItems: 'center' }}>
            {busqueda && <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)', marginRight: '4px' }}>{resultadosBusqueda} resultado{resultadosBusqueda !== 1 ? 's' : ''}</span>}
            {([['epp', 'Por EPP'], ['empleado', 'Por empleado'], ['vencimiento', 'Por vencimiento']] as [Vista, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setVista(v)} style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                background: vista === v ? 'var(--c-blue-btn)' : 'transparent',
                color: vista === v ? 'white' : 'var(--c-text-secondary)',
                border: vista === v ? 'none' : '0.5px solid var(--c-border)',
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
