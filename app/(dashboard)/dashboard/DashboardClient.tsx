"use client"

import { useEmpresa } from '../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'
import Link from 'next/link'
import { Users, Calendar, AlertTriangle, Umbrella, Package, FileWarning, ShieldAlert } from 'lucide-react'

type EppVencer = {
  id: number
  fecha_vencimiento: string
  epp_catalogo: { descripcion: string }
  legajos: { apellido: string, nombre: string, id_empresa: number }
}

type EppVencido = {
  id: number
  fecha_vencimiento: string
  talle?: string
  epp_catalogo: { descripcion: string }
  legajos: { apellido: string, nombre: string, nro_legajo: number, id_empresa: number }
}

type EppStock = {
  id: number
  id_empresa: number
  id_epp: number
  talle?: string
  cantidad_disponible: number
  cantidad_minima: number
  epp_catalogo: { descripcion: string }
}

type VacacionHoy = {
  id: number
  fecha_desde: string
  fecha_hasta: string
  id_legajo: number
  legajos: { apellido: string, nombre: string, id_empresa: number }
}

type UltimaNovedades = {
  id: number
  fecha: string
  id_empresa: number
  legajos: { apellido: string, nombre: string }
  obras: { nombre: string }
}

export default function DashboardClient({
  totalActivos, novedadesHoy, ausenciasHoy,
  eppPorVencer, eppVencidos, stockTodos, remitosSinFirmar,
  vacacionesHoy, ultimasNovedades
}: {
  totalActivos: number
  novedadesHoy: number
  ausenciasHoy: number
  eppPorVencer: EppVencer[]
  eppVencidos: EppVencido[]
  stockTodos: EppStock[]
  remitosSinFirmar: number
  vacacionesHoy: VacacionHoy[]
  ultimasNovedades: UltimaNovedades[]
}) {
  const { empresaActiva } = useEmpresa()
  const hoy = new Date().toISOString().split('T')[0]

  // Filtrar por empresa activa si hay una seleccionada
  const vencidosFiltrados = empresaActiva
    ? eppVencidos.filter(e => e.legajos.id_empresa === empresaActiva.id)
    : eppVencidos
  const porVencerFiltrados = empresaActiva
    ? eppPorVencer.filter(e => e.legajos.id_empresa === empresaActiva.id)
    : eppPorVencer
  const stockFiltrado = empresaActiva
    ? stockTodos.filter(s => s.id_empresa === empresaActiva.id)
    : stockTodos
  const stockBajo = stockFiltrado.filter(s => s.cantidad_disponible <= s.cantidad_minima)

  const cards = [
    {
      label: 'Empleados activos',
      valor: totalActivos,
      color: 'var(--c-green)',
      bg: 'var(--c-green-bg)',
      icon: Users,
      href: '/legajos',
    },
    {
      label: 'Novedades cargadas hoy',
      valor: novedadesHoy,
      color: 'var(--c-blue)',
      bg: 'var(--c-blue-bg)',
      icon: Calendar,
      href: '/novedades/consulta',
    },
    {
      label: 'Ausencias activas hoy',
      valor: ausenciasHoy,
      color: ausenciasHoy > 0 ? 'var(--c-orange)' : 'var(--c-green)',
      bg: ausenciasHoy > 0 ? 'var(--c-orange-bg)' : 'var(--c-green-bg)',
      icon: AlertTriangle,
      href: '/ausencias',
    },
    {
      label: 'EPP por vencer (30 días)',
      valor: porVencerFiltrados.length,
      color: porVencerFiltrados.length > 0 ? 'var(--c-orange)' : 'var(--c-green)',
      bg: porVencerFiltrados.length > 0 ? 'var(--c-orange-bg)' : 'var(--c-green-bg)',
      icon: ShieldAlert,
      href: '/epp',
    },
    {
      label: 'EPP vencidos',
      valor: vencidosFiltrados.length,
      color: vencidosFiltrados.length > 0 ? 'var(--c-red)' : 'var(--c-green)',
      bg: vencidosFiltrados.length > 0 ? 'var(--c-red-bg)' : 'var(--c-green-bg)',
      icon: FileWarning,
      href: '/epp',
    },
    {
      label: 'Stock bajo mínimo',
      valor: stockBajo.length,
      color: stockBajo.length > 0 ? 'var(--c-red)' : 'var(--c-green)',
      bg: stockBajo.length > 0 ? 'var(--c-red-bg)' : 'var(--c-green-bg)',
      icon: Package,
      href: '/epp',
    },
    {
      label: 'Remitos sin firmar',
      valor: remitosSinFirmar,
      color: remitosSinFirmar > 0 ? 'var(--c-orange)' : 'var(--c-green)',
      bg: remitosSinFirmar > 0 ? 'var(--c-orange-bg)' : 'var(--c-green-bg)',
      icon: Umbrella,
      href: '/epp',
    },
  ]

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

      {/* Cards — fila 1: RRHH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
        {cards.slice(0, 3).map((card, i) => (
          <Link key={i} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '18px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{card.label}</span>
                <div style={{ background: card.bg, borderRadius: '6px', padding: '6px' }}>
                  <card.icon size={14} color={card.color} />
                </div>
              </div>
              <span style={{ fontSize: '28px', fontWeight: 500, color: card.color }}>{card.valor}</span>
            </div>
          </Link>
        ))}
        {/* Placeholder para mantener la grilla */}
        <div />
      </div>

      {/* Cards — fila 2: EPP */}
      <div style={{ marginBottom: '6px' }}>
        <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldAlert size={12} /> EPP y Ropa de trabajo
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {cards.slice(3).map((card, i) => (
          <Link key={i} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--c-surface)', border: `0.5px solid ${card.valor > 0 && card.color !== 'var(--c-green)' ? card.color + '30' : 'var(--c-border)'}`, borderRadius: '8px', padding: '18px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{card.label}</span>
                <div style={{ background: card.bg, borderRadius: '6px', padding: '6px' }}>
                  <card.icon size={14} color={card.color} />
                </div>
              </div>
              <span style={{ fontSize: '28px', fontWeight: 500, color: card.color }}>{card.valor}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Paneles EPP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* EPP vencidos */}
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)' }}>EPP vencidos</span>
            <Link href="/epp" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>Ver necesidades ↗</Link>
          </div>
          {vencidosFiltrados.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>Sin EPP vencido</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {vencidosFiltrados.map((e, i) => {
                  const diasVencido = Math.floor((Date.now() - new Date(e.fecha_vencimiento + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <tr key={e.id} style={{ borderBottom: i < vencidosFiltrados.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)' }}>
                        {e.legajos.apellido}, {e.legajos.nombre}
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--c-text-secondary)' }}>
                          {e.epp_catalogo.descripcion}{e.talle ? ` · ${e.talle}` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ background: 'var(--c-red-bg)', color: 'var(--c-red)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                          hace {diasVencido}d
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Stock bajo */}
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)' }}>Stock bajo mínimo</span>
            <Link href="/epp" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>Ver stock ↗</Link>
          </div>
          {stockBajo.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>Todo el stock en nivel correcto</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {stockBajo.slice(0, 6).map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < Math.min(stockBajo.length, 6) - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)' }}>
                      {s.epp_catalogo.descripcion}
                      {s.talle && <span style={{ marginLeft: '6px', background: 'var(--c-talle-bg)', color: 'var(--c-talle-color)', fontSize: '11px', padding: '1px 6px', borderRadius: '4px' }}>{s.talle}</span>}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--c-red)', fontSize: '14px' }}>{s.cantidad_disponible}</span>
                      <span style={{ color: 'var(--c-text-muted)', fontSize: '12px' }}> / mín {s.cantidad_minima}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Paneles RRHH */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* EPP por vencer */}
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)' }}>EPP por vencer (30 días)</span>
            <Link href="/epp" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>Ver todos ↗</Link>
          </div>
          {porVencerFiltrados.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>Sin vencimientos próximos</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {porVencerFiltrados.map((e, i) => {
                  const diasRestantes = Math.floor(
                    (new Date(e.fecha_vencimiento + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <tr key={e.id} style={{ borderBottom: i < porVencerFiltrados.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)' }}>
                        {e.legajos.apellido}, {e.legajos.nombre}
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--c-text-secondary)' }}>{e.epp_catalogo.descripcion}</span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <span style={{
                          background: diasRestantes <= 7 ? 'var(--c-red-bg)' : 'var(--c-orange-bg)',
                          color: diasRestantes <= 7 ? 'var(--c-red)' : 'var(--c-orange)',
                          fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                        }}>
                          {diasRestantes}d
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Vacaciones hoy */}
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)' }}>En vacaciones hoy</span>
            <Link href="/vacaciones" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>Ver todos ↗</Link>
          </div>
          {vacacionesHoy.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>Nadie de vacaciones hoy</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {vacacionesHoy.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom: i < vacacionesHoy.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)' }}>
                      {v.legajos.apellido}, {v.legajos.nombre}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--c-text-secondary)', fontSize: '12px' }}>
                      hasta {formatFecha(v.fecha_hasta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Últimas novedades */}
      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)' }}>Últimas novedades cargadas</span>
          <Link href="/novedades/consulta" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>Ver consulta ↗</Link>
        </div>
        {ultimasNovedades.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>No hay novedades cargadas</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                {['Empleado', 'Obra', 'Fecha'].map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ultimasNovedades.map((n, i) => (
                <tr key={n.id} style={{ borderBottom: i < ultimasNovedades.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)' }}>{n.legajos.apellido}, {n.legajos.nombre}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{n.obras.nombre}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{formatFecha(n.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
