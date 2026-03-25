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
    Activa:     { bg: 'var(--c-green-bg)', color: 'var(--c-green)' },
    Pausada:    { bg: '#3a2f1a', color: '#d29922' },
    Finalizada: { bg: 'var(--c-elevated)', color: 'var(--c-text-secondary)' },
    Cancelada:  { bg: 'var(--c-red-bg)', color: 'var(--c-red)' },
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
        <Link href="/obras" style={{ color: 'var(--c-text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>
            {obra.nombre}
          </h1>
          <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
            {obra.codigo}
            {obra.localidad ? ` · ${obra.localidad}` : ''}
            {obra.provincia ? `, ${obra.provincia}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {obra.latitud && <MapPin size={14} color="var(--c-green)" />}
          {badgeEstado(obra.estado)}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--c-border)', marginBottom: '24px' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', fontSize: '13px', cursor: 'pointer',
              background: 'transparent', border: 'none',
              borderBottom: tabActiva === tab.id ? '2px solid var(--c-blue-btn)' : '2px solid transparent',
              color: tabActiva === tab.id ? 'var(--c-text-primary)' : 'var(--c-text-secondary)',
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
          background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
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
              <span style={{ fontSize: '11px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '3px' }}>{label}</span>
              <span style={{ fontSize: '14px', color: 'var(--c-text-primary)' }}>{value}</span>
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
