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
      color: '#3fb950',
      bg: '#1a3a2a',
      icon: Users,
      href: '/legajos',
    },
    {
      label: 'Novedades cargadas hoy',
      valor: novedadesHoy,
      color: '#58a6ff',
      bg: '#1a2a3a',
      icon: Calendar,
      href: '/novedades/consulta',
    },
    {
      label: 'Ausencias activas hoy',
      valor: ausenciasHoy,
      color: ausenciasHoy > 0 ? '#d29922' : '#3fb950',
      bg: ausenciasHoy > 0 ? '#3a2f1a' : '#1a3a2a',
      icon: AlertTriangle,
      href: '/ausencias',
    },
    {
      label: 'EPP por vencer (30 días)',
      valor: porVencerFiltrados.length,
      color: porVencerFiltrados.length > 0 ? '#d29922' : '#3fb950',
      bg: porVencerFiltrados.length > 0 ? '#3a2f1a' : '#1a3a2a',
      icon: ShieldAlert,
      href: '/epp',
    },
    {
      label: 'EPP vencidos',
      valor: vencidosFiltrados.length,
      color: vencidosFiltrados.length > 0 ? '#f85149' : '#3fb950',
      bg: vencidosFiltrados.length > 0 ? '#3a1a1a' : '#1a3a2a',
      icon: FileWarning,
      href: '/epp',
    },
    {
      label: 'Stock bajo mínimo',
      valor: stockBajo.length,
      color: stockBajo.length > 0 ? '#f85149' : '#3fb950',
      bg: stockBajo.length > 0 ? '#3a1a1a' : '#1a3a2a',
      icon: Package,
      href: '/epp',
    },
    {
      label: 'Remitos sin firmar',
      valor: remitosSinFirmar,
      color: remitosSinFirmar > 0 ? '#d29922' : '#3fb950',
      bg: remitosSinFirmar > 0 ? '#3a2f1a' : '#1a3a2a',
      icon: Umbrella,
      href: '/epp',
    },
  ]

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
          Dashboard
        </h1>
        <span style={{ fontSize: '12px', color: '#8b949e' }}>
          {empresaActiva?.razon_social || 'Todas las empresas'} · {formatFecha(hoy)}
        </span>
      </div>

      {/* Cards — fila 1: RRHH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
        {cards.slice(0, 3).map((card, i) => (
          <Link key={i} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '18px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>{card.label}</span>
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
        <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldAlert size={12} /> EPP y Ropa de trabajo
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {cards.slice(3).map((card, i) => (
          <Link key={i} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#161b22', border: `0.5px solid ${card.valor > 0 && card.color !== '#3fb950' ? card.color + '30' : '#30363d'}`, borderRadius: '8px', padding: '18px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>{card.label}</span>
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
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3' }}>EPP vencidos</span>
            <Link href="/epp" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver necesidades ↗</Link>
          </div>
          {vencidosFiltrados.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>Sin EPP vencido</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {vencidosFiltrados.map((e, i) => {
                  const diasVencido = Math.floor((Date.now() - new Date(e.fecha_vencimiento + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <tr key={e.id} style={{ borderBottom: i < vencidosFiltrados.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: '#e6edf3' }}>
                        {e.legajos.apellido}, {e.legajos.nombre}
                        <span style={{ display: 'block', fontSize: '11px', color: '#8b949e' }}>
                          {e.epp_catalogo.descripcion}{e.talle ? ` · ${e.talle}` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ background: '#3a1a1a', color: '#f85149', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
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
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3' }}>Stock bajo mínimo</span>
            <Link href="/epp" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver stock ↗</Link>
          </div>
          {stockBajo.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>Todo el stock en nivel correcto</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {stockBajo.slice(0, 6).map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < Math.min(stockBajo.length, 6) - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#e6edf3' }}>
                      {s.epp_catalogo.descripcion}
                      {s.talle && <span style={{ marginLeft: '6px', background: '#1f2937', color: '#93c5fd', fontSize: '11px', padding: '1px 6px', borderRadius: '4px' }}>{s.talle}</span>}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: '#f85149', fontSize: '14px' }}>{s.cantidad_disponible}</span>
                      <span style={{ color: '#484f58', fontSize: '12px' }}> / mín {s.cantidad_minima}</span>
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
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3' }}>EPP por vencer (30 días)</span>
            <Link href="/epp" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver todos ↗</Link>
          </div>
          {porVencerFiltrados.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>Sin vencimientos próximos</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {porVencerFiltrados.map((e, i) => {
                  const diasRestantes = Math.floor(
                    (new Date(e.fecha_vencimiento + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <tr key={e.id} style={{ borderBottom: i < porVencerFiltrados.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: '#e6edf3' }}>
                        {e.legajos.apellido}, {e.legajos.nombre}
                        <span style={{ display: 'block', fontSize: '11px', color: '#8b949e' }}>{e.epp_catalogo.descripcion}</span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <span style={{
                          background: diasRestantes <= 7 ? '#3a1a1a' : '#3a2f1a',
                          color: diasRestantes <= 7 ? '#f85149' : '#d29922',
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
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3' }}>En vacaciones hoy</span>
            <Link href="/vacaciones" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver todos ↗</Link>
          </div>
          {vacacionesHoy.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>Nadie de vacaciones hoy</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {vacacionesHoy.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom: i < vacacionesHoy.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#e6edf3' }}>
                      {v.legajos.apellido}, {v.legajos.nombre}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#8b949e', fontSize: '12px' }}>
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
      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3' }}>Últimas novedades cargadas</span>
          <Link href="/novedades/consulta" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver consulta ↗</Link>
        </div>
        {ultimasNovedades.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>No hay novedades cargadas</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {['Empleado', 'Obra', 'Fecha'].map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ultimasNovedades.map((n, i) => (
                <tr key={n.id} style={{ borderBottom: i < ultimasNovedades.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                  <td style={{ padding: '10px 16px', color: '#e6edf3' }}>{n.legajos.apellido}, {n.legajos.nombre}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{n.obras.nombre}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(n.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
