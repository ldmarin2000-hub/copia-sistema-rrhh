"use client"

import { useState } from 'react'
import { ArrowLeft, Building2, FileText, Pencil } from 'lucide-react'
import Link from 'next/link'
import { formatFecha } from '@/lib/fecha'
import FormEmpresa from '../FormEmpresa'
import DocumentosTab from './DocumentosTab'

type Empresa = {
  id: number
  codigo: string
  razon_social: string
  cuit: string
  direccion?: string
  cp?: string
  localidad?: string
  provincia?: string
  cbu?: string
  fecha_inicio?: string
  latitud?: number
  longitud?: number
  activo: boolean
}

const TABS = [
  { id: 'datos',      label: 'Datos',       icon: Building2 },
  { id: 'documentos', label: 'Documentos',  icon: FileText },
]

export default function FichaEmpresaClient({
  empresa, documentos, presentaciones,
}: {
  empresa: Empresa
  documentos: any[]
  presentaciones: any[]
}) {
  const [tabActiva, setTabActiva] = useState('datos')
  const [editando, setEditando] = useState(false)

  return (
    <>
      {editando && (
        <FormEmpresa empresaEditar={empresa} onCerrar={() => setEditando(false)} />
      )}

      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Link href="/empresas" style={{ color: '#8b949e', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
              {empresa.razon_social}
            </h1>
            <span style={{ fontSize: '12px', color: '#8b949e' }}>
              {empresa.codigo} · CUIT {empresa.cuit}
            </span>
          </div>
          <span style={{
            background: empresa.activo ? '#1a3a2a' : '#3a1a1a',
            color: empresa.activo ? '#3fb950' : '#f85149',
            fontSize: '12px', padding: '3px 10px', borderRadius: '4px',
          }}>
            {empresa.activo ? 'Activa' : 'Inactiva'}
          </span>
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
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button onClick={() => setEditando(true)} style={{
                background: 'transparent', border: '0.5px solid #30363d',
                color: '#8b949e', borderRadius: '6px', padding: '6px 14px',
                fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Pencil size={13} /> Editar
              </button>
            </div>
            <div style={{
              background: '#161b22', border: '0.5px solid #30363d',
              borderRadius: '8px', padding: '20px',
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px',
            }}>
              {[
                { label: 'Razón Social',   value: empresa.razon_social },
                { label: 'Código',         value: empresa.codigo },
                { label: 'CUIT',           value: empresa.cuit },
                { label: 'CBU',            value: empresa.cbu || '—' },
                { label: 'Dirección',      value: empresa.direccion || '—' },
                { label: 'Código Postal',  value: empresa.cp || '—' },
                { label: 'Localidad',      value: empresa.localidad || '—' },
                { label: 'Provincia',      value: empresa.provincia || '—' },
                { label: 'Fecha de inicio', value: empresa.fecha_inicio ? formatFecha(empresa.fecha_inicio) : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '3px' }}>{label}</span>
                  <span style={{ fontSize: '14px', color: '#e6edf3' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Documentos */}
        {tabActiva === 'documentos' && (
          <DocumentosTab
            idEmpresa={empresa.id}
            documentosIniciales={documentos}
            presentacionesIniciales={presentaciones}
          />
        )}
      </div>
    </>
  )
}
