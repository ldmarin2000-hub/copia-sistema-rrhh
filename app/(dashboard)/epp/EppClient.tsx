"use client"

import { useState } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { Archive, TrendingUp, FileText, AlertTriangle } from 'lucide-react'
import StockTab from './StockTab'
import MovimientosTab from './MovimientosTab'
import DetalleEntregaTab from './DetalleEntregaTab'
import NecesidadesTab from './NecesidadesTab'

const TABS = [
  { id: 'stock',      label: 'Stock',               icon: Archive },
  { id: 'movimientos',label: 'Movimientos de stock', icon: TrendingUp },
  { id: 'entregas',   label: 'Detalle de entrega',   icon: FileText },
  { id: 'necesidades',label: 'Necesidades',          icon: AlertTriangle },
]

export default function EppClient({
  catalogo, talles, stock, entregas, obras, legajos,
  movimientos, detalleEntregas, habitualTodos,
}: {
  catalogo: any[]
  talles: any[]
  stock: any[]
  entregas: any[]
  obras: any[]
  legajos: any[]
  movimientos: any[]
  detalleEntregas: any[]
  habitualTodos: any[]
}) {
  const { empresaActiva } = useEmpresa()
  const [tabActiva, setTabActiva] = useState('stock')

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  const idEmpresa = empresaActiva.id

  // Alertas para el header
  const hoy = new Date().toISOString().split('T')[0]
  const en30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const porVencer = entregas.filter(e =>
    e.id_empresa === idEmpresa && !e.devuelto &&
    e.fecha_vencimiento && e.fecha_vencimiento <= en30
  )
  const stockBajo = stock.filter(s =>
    s.id_empresa === idEmpresa && s.cantidad_disponible <= s.cantidad_minima
  )

  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 4px' }}>EPP y Ropa de trabajo</h1>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>{empresaActiva.razon_social}</span>
          {porVencer.length > 0 && (
            <span style={{ fontSize: '12px', color: '#d29922' }}>⚠ {porVencer.length} EPP por vencer en 30 días</span>
          )}
          {stockBajo.length > 0 && (
            <span style={{ fontSize: '12px', color: '#f85149' }}>⚠ {stockBajo.length} item{stockBajo.length !== 1 ? 's' : ''} con stock bajo</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '0.5px solid #30363d' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setTabActiva(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: 'transparent', border: 'none',
            borderBottom: tabActiva === tab.id ? '2px solid #58a6ff' : '2px solid transparent',
            color: tabActiva === tab.id ? '#58a6ff' : '#8b949e',
            fontSize: '13px', cursor: 'pointer', marginBottom: '-1px', whiteSpace: 'nowrap',
          }}>
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {tabActiva === 'stock' && (
        <StockTab
          stock={stock}
          movimientos={movimientos}
          idEmpresa={idEmpresa}
        />
      )}

      {tabActiva === 'movimientos' && (
        <MovimientosTab
          catalogo={catalogo}
          talles={talles}
          movimientos={movimientos}
          idEmpresa={idEmpresa}
          permiteEditar={empresaActiva.permite_editar_epp || false}
        />
      )}

      {tabActiva === 'entregas' && (
        <DetalleEntregaTab
          catalogo={catalogo}
          talles={talles}
          detalleEntregas={detalleEntregas}
          legajos={legajos}
          idEmpresa={idEmpresa}
          permiteEditar={empresaActiva.permite_editar_epp || false}
        />
      )}

      {tabActiva === 'necesidades' && (
        <NecesidadesTab
          habitualTodos={habitualTodos}
          entregas={entregas}
          idEmpresa={idEmpresa}
        />
      )}
    </>
  )
}
