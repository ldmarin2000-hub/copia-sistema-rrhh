"use client"

import { useState } from 'react'
import { ArrowLeft, Building2, FileText, Pencil } from 'lucide-react'
import Link from 'next/link'
import { formatFecha } from '@/lib/fecha'
import { traducirError } from '@/lib/errores'
import { createClient } from '@/lib/supabase-browser'
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

type ConfigBH = {
  id: number
  modalidad: 'proporcional' | 'nominal'
  tope_mensual_horas: number
  tope_anual_horas: number
  tope_acumulado_banco: number | null
} | null

export default function FichaEmpresaClient({
  empresa, documentos, presentaciones, configBH: configBHInicial,
}: {
  empresa: Empresa
  documentos: any[]
  presentaciones: any[]
  configBH: ConfigBH
}) {
  const [tabActiva, setTabActiva] = useState('datos')
  const [editando, setEditando] = useState(false)

  const [configBH, setConfigBH] = useState<ConfigBH>(configBHInicial)
  const [editandoBH, setEditandoBH] = useState(false)
  const [bhModalidad, setBhModalidad] = useState<'proporcional' | 'nominal'>(configBHInicial?.modalidad ?? 'nominal')
  const [bhTopeMensual, setBhTopeMensual] = useState(String(configBHInicial?.tope_mensual_horas ?? 30))
  const [bhTopeAnual, setBhTopeAnual] = useState(String(configBHInicial?.tope_anual_horas ?? 200))
  const [bhTopeAcumulado, setBhTopeAcumulado] = useState(String(configBHInicial?.tope_acumulado_banco ?? ''))
  const [bhLoading, setBhLoading] = useState(false)
  const [bhError, setBhError] = useState('')

  async function guardarConfigBH() {
    setBhLoading(true)
    setBhError('')
    const supabase = createClient()
    const datos = {
      empresa_id: empresa.id,
      modalidad: bhModalidad,
      tope_mensual_horas: parseInt(bhTopeMensual) || 30,
      tope_anual_horas: parseInt(bhTopeAnual) || 200,
      tope_acumulado_banco: bhTopeAcumulado ? parseInt(bhTopeAcumulado) : null,
    }
    const { data, error } = await supabase
      .from('banco_horas_config_empresa')
      .upsert(datos, { onConflict: 'empresa_id' })
      .select()
      .single()
    if (error) { setBhError(traducirError(error.message)); setBhLoading(false); return }
    setConfigBH(data as ConfigBH)
    setEditandoBH(false)
    setBhLoading(false)
  }

  return (
    <>
      {editando && (
        <FormEmpresa empresaEditar={empresa} onCerrar={() => setEditando(false)} />
      )}

      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Link href="/empresas" style={{ color: 'var(--c-text-secondary)', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>
              {empresa.razon_social}
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
              {empresa.codigo} · CUIT {empresa.cuit}
            </span>
          </div>
          <span style={{
            background: empresa.activo ? 'var(--c-green-bg)' : 'var(--c-red-bg)',
            color: empresa.activo ? 'var(--c-green)' : 'var(--c-red)',
            fontSize: '12px', padding: '3px 10px', borderRadius: '4px',
          }}>
            {empresa.activo ? 'Activa' : 'Inactiva'}
          </span>
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
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button onClick={() => setEditando(true)} style={{
                background: 'transparent', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '6px 14px',
                fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Pencil size={13} /> Editar
              </button>
            </div>
            <div style={{
              background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
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
                  <span style={{ fontSize: '11px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '3px' }}>{label}</span>
                  <span style={{ fontSize: '14px', color: 'var(--c-text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección Banco de Horas (dentro del tab Datos) */}
        {tabActiva === 'datos' && (
          <div style={{ marginTop: '24px' }}>
            <div style={{
              background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
              borderRadius: '8px', padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                  Configuración Banco de Horas
                </h3>
                {!editandoBH && (
                  <button onClick={() => setEditandoBH(true)} style={{
                    background: 'transparent', border: '0.5px solid var(--c-border)',
                    color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '5px 12px',
                    fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <Pencil size={12} /> {configBH ? 'Editar' : 'Configurar'}
                  </button>
                )}
              </div>

              {!editandoBH ? (
                configBH ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    {[
                      { label: 'Modalidad', value: configBH.modalidad === 'proporcional' ? 'Proporcional (con recargo)' : 'Nominal (sin recargo)' },
                      { label: 'Tope mensual', value: `${configBH.tope_mensual_horas}h` },
                      { label: 'Tope anual', value: `${configBH.tope_anual_horas}h` },
                      { label: 'Tope acumulado banco', value: configBH.tope_acumulado_banco ? `${configBH.tope_acumulado_banco}h` : 'Sin límite' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span style={{ fontSize: '11px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '3px' }}>{label}</span>
                        <span style={{ fontSize: '13px', color: 'var(--c-text-primary)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', margin: 0 }}>
                    Sin configuración. Los acuerdos individuales usarán modalidad <strong>nominal</strong> y topes por defecto (30h/mes · 200h/año).
                  </p>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '6px' }}>Modalidad</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {([['nominal', 'Nominal', '1h extra = 1h banco'], ['proporcional', 'Proporcional', '1h al 50% = 1.5h banco · 1h al 100% = 2h banco']] as [string, string, string][]).map(([val, label, desc]) => (
                        <button key={val} onClick={() => setBhModalidad(val as 'nominal' | 'proporcional')} style={{
                          flex: 1, padding: '10px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', textAlign: 'left' as const,
                          border: bhModalidad === val ? '1.5px solid var(--c-blue)' : '0.5px solid var(--c-border)',
                          background: bhModalidad === val ? 'var(--c-blue-bg)' : 'var(--c-base)',
                          color: bhModalidad === val ? 'var(--c-blue)' : 'var(--c-text-secondary)',
                        }}>
                          <div style={{ fontWeight: 500, marginBottom: '3px' }}>{label}</div>
                          <div style={{ fontSize: '11px', opacity: 0.8 }}>{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Tope mensual (horas)</label>
                      <input type="number" min="1" value={bhTopeMensual} onChange={e => setBhTopeMensual(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Tope anual (horas)</label>
                      <input type="number" min="1" value={bhTopeAnual} onChange={e => setBhTopeAnual(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Tope acumulado banco (opcional)</label>
                      <input type="number" min="1" value={bhTopeAcumulado} onChange={e => setBhTopeAcumulado(e.target.value)} placeholder="Sin límite" style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const }} />
                    </div>
                  </div>

                  {bhError && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{bhError}</p>}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => setEditandoBH(false)} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={guardarConfigBH} disabled={bhLoading} style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: bhLoading ? 0.6 : 1 }}>
                      {bhLoading ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
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
