"use client"

import { useState } from 'react'
import { ArrowLeft, MapPin, FileText, HardHat } from 'lucide-react'
import Link from 'next/link'
import { formatFecha } from '@/lib/fecha'
import DocumentosObraTab from './DocumentosObraTab'

type Obra = {
  id: number
  id_empresa: number
  codigo: string
  nombre: string
  direccion?: string
  localidad?: string
  provincia?: string
  cp?: string
  estado: string
  fecha_inicio?: string
  fecha_fin?: string
  latitud?: number
  longitud?: number
  activo: boolean
}

const badgeEstado = (estado: string) => {
  const colores: Record<string, { bg: string, color: string }> = {
    Activa:     { bg: '#1a3a2a', color: '#3fb950' },
    Pausada:    { bg: '#3a2f1a', color: '#d29922' },
    Finalizada: { bg: '#21262d', color: '#8b949e' },
    Cancelada:  { bg: '#3a1a1a', color: '#f85149' },
  }
  const c = colores[estado] || colores.Activa
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: '12px', padding: '3px 10px', borderRadius: '4px' }}>
      {estado}
    </span>
  )
}

const TABS = [
  { id: 'datos',      label: 'Datos',       icon: HardHat },
  { id: 'documentos', label: 'Documentos',  icon: FileText },
]

export default function FichaObraClient({
  obra, documentos,
}: {
  obra: Obra
  documentos: any[]
}) {
  const [tabActiva, setTabActiva] = useState('datos')

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href="/obras" style={{ color: '#8b949e', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
            {obra.nombre}
          </h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {obra.codigo}
            {obra.localidad ? ` · ${obra.localidad}` : ''}
            {obra.provincia ? `, ${obra.provincia}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {obra.latitud && <MapPin size={14} color="#3fb950" />}
          {badgeEstado(obra.estado)}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid #30363d', marginBottom: '24px' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', fontSize: '13px', cursor: 'pointer',
              background: 'transparent', border: 'none',
              borderBottom: tabActiva === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              color: tabActiva === tab.id ? '#e6edf3' : '#8b949e',
              marginBottom: '-0.5px',
            }}>
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab: Datos */}
      {tabActiva === 'datos' && (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '20px',
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px',
        }}>
          {[
            { label: 'Nombre',        value: obra.nombre },
            { label: 'Código',        value: obra.codigo },
            { label: 'Estado',        value: obra.estado },
            { label: 'Dirección',     value: obra.direccion || '—' },
            { label: 'Código Postal', value: obra.cp || '—' },
            { label: 'Localidad',     value: obra.localidad || '—' },
            { label: 'Provincia',     value: obra.provincia || '—' },
            { label: 'Fecha inicio',  value: obra.fecha_inicio ? formatFecha(obra.fecha_inicio) : '—' },
            { label: 'Fecha fin',     value: obra.fecha_fin ? formatFecha(obra.fecha_fin) : '—' },
            { label: 'GPS',           value: obra.latitud ? `${obra.latitud}, ${obra.longitud}` : 'Sin coordenadas' },
          ].map(({ label, value }) => (
            <div key={label}>
              <span style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '3px' }}>{label}</span>
              <span style={{ fontSize: '14px', color: '#e6edf3' }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Documentos */}
      {tabActiva === 'documentos' && (
        <DocumentosObraTab
          idObra={obra.id}
          documentosIniciales={documentos}
        />
      )}
    </div>
  )
}
