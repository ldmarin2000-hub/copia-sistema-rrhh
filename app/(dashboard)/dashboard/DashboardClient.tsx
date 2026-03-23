"use client"

import { useEmpresa } from '../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'
import Link from 'next/link'
import { Users, Calendar, AlertTriangle, Umbrella } from 'lucide-react'

type EppVencer = {
  id: number
  fecha_vencimiento: string
  epp_catalogo: { descripcion: string }
  legajos: { apellido: string, nombre: string, id_empresa: number }
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
  eppPorVencer, vacacionesHoy, ultimasNovedades
}: {
  totalActivos: number
  novedadesHoy: number
  ausenciasHoy: number
  eppPorVencer: EppVencer[]
  vacacionesHoy: VacacionHoy[]
  ultimasNovedades: UltimaNovedades[]
}) {
  const { empresaActiva } = useEmpresa()

  const cards = [
    {
      label: 'Empleados activos',
      valor: totalActivos,
      color: '#3fb950',
      bg: '#1a3a2a',
      icon: Users,
    },
    {
      label: 'Novedades cargadas hoy',
      valor: novedadesHoy,
      color: '#58a6ff',
      bg: '#1a2a3a',
      icon: Calendar,
    },
    {
      label: 'Ausencias activas hoy',
      valor: ausenciasHoy,
      color: '#d29922',
      bg: '#3a2f1a',
      icon: AlertTriangle,
    },
    {
      label: 'EPP por vencer (30 días)',
      valor: eppPorVencer.length,
      color: eppPorVencer.length > 0 ? '#f85149' : '#3fb950',
      bg: eppPorVencer.length > 0 ? '#3a1a1a' : '#1a3a2a',
      icon: AlertTriangle,
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
          {empresaActiva?.razon_social || 'Todas las empresas'} · {formatFecha(new Date().toISOString().split('T')[0])}
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {cards.map((card, i) => (
          <div key={i} style={{
            background: '#161b22', border: '0.5px solid #30363d',
            borderRadius: '8px', padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#8b949e' }}>{card.label}</span>
              <div style={{ background: card.bg, borderRadius: '6px', padding: '6px' }}>
                <card.icon size={14} color={card.color} />
              </div>
            </div>
            <span style={{ fontSize: '28px', fontWeight: 500, color: card.color }}>
              {card.valor}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* EPP por vencer */}
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3' }}>EPP por vencer</span>
            <Link href="/epp" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver todos</Link>
          </div>
          {eppPorVencer.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
              Sin vencimientos próximos
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {eppPorVencer.map((e, i) => {
                  const diasRestantes = Math.floor(
                    (new Date(e.fecha_vencimiento + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <tr key={e.id} style={{ borderBottom: i < eppPorVencer.length - 1 ? '0.5px solid #21262d' : 'none' }}>
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
            <Link href="/vacaciones" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver todos</Link>
          </div>
          {vacacionesHoy.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
              Nadie de vacaciones hoy
            </div>
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
          <Link href="/novedades/consulta" style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}>Ver consulta</Link>
        </div>
        {ultimasNovedades.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
            No hay novedades cargadas
          </div>
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
                  <td style={{ padding: '10px 16px', color: '#e6edf3' }}>
                    {n.legajos.apellido}, {n.legajos.nombre}
                  </td>
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