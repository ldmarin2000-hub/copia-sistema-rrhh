"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { X } from 'lucide-react'

type Empresa = {
  id: number
  codigo: string
  razon_social: string
  cuit: string
  direccion?: string
  nro?: string
  cp?: string
  localidad?: string
  provincia?: string
  cbu?: string
  activo: boolean
}

type Props = {
  empresaEditar?: Empresa | null
  onCerrar?: () => void
}

export default function FormEmpresa({ empresaEditar, onCerrar }: Props) {
  const router = useRouter()
  const editando = !!empresaEditar

  const [codigo, setCodigo] = useState(empresaEditar?.codigo || '')
  const [razonSocial, setRazonSocial] = useState(empresaEditar?.razon_social || '')
  const [cuit, setCuit] = useState(empresaEditar?.cuit || '')
  const [direccion, setDireccion] = useState(empresaEditar?.direccion || '')
  const [localidad, setLocalidad] = useState(empresaEditar?.localidad || '')
  const [provincia, setProvincia] = useState(empresaEditar?.provincia || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const input = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '7px 10px', borderRadius: '6px',
        background: '#0d1117', border: '0.5px solid #30363d',
        color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box',
      }}
    />
  )

  async function guardar() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    if (editando) {
      const { error } = await supabase
        .from('empresas')
        .update({ codigo, razon_social: razonSocial, cuit, direccion, localidad, provincia })
        .eq('id', empresaEditar.id)

      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('empresas')
        .insert({ codigo, razon_social: razonSocial, cuit, direccion, localidad, provincia })

      if (error) { setError(error.message); setLoading(false); return }
    }

    router.refresh()
    if (onCerrar) onCerrar()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div style={{
        background: '#161b22', border: '0.5px solid #30363d',
        borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px',
      }}>

        {/* Header modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>
            {editando ? 'Editar empresa' : 'Nueva empresa'}
          </h2>
          {onCerrar && (
            <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Código *</label>
              {input(codigo, setCodigo, 'Ej: CONST01')}
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>CUIT *</label>
              {input(cuit, setCuit, 'Ej: 30-12345678-9')}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Razón Social *</label>
            {input(razonSocial, setRazonSocial, 'Ej: Constructora SA')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Dirección</label>
              {input(direccion, setDireccion, 'Calle')}
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Localidad</label>
              {input(localidad, setLocalidad, 'Ciudad')}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Provincia</label>
            {input(provincia, setProvincia, 'Ej: Buenos Aires')}
          </div>

          {error && (
            <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          {onCerrar && (
            <button onClick={onCerrar} style={{
              background: 'transparent', border: '0.5px solid #30363d',
              color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
              fontSize: '13px', cursor: 'pointer',
            }}>
              Cancelar
            </button>
          )}
          <button
            onClick={guardar}
            disabled={loading || !codigo || !razonSocial || !cuit}
            style={{
              background: '#2563eb', color: 'white', border: 'none',
              borderRadius: '6px', padding: '7px 16px',
              fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear empresa'}
          </button>
        </div>
      </div>
    </div>
  )
}