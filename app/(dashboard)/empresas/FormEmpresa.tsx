"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { X, MapPin } from 'lucide-react'
import { validarCuit, formatearCuit } from '@/lib/validaciones'
import dynamic from 'next/dynamic'

const MapaObra = dynamic(() => import('../obras/MapaObra'), { ssr: false })

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
  const [cbu, setCbu] = useState(empresaEditar?.cbu || '')
  const [direccion, setDireccion] = useState(empresaEditar?.direccion || '')
  const [cp, setCp] = useState(empresaEditar?.cp || '')
  const [localidad, setLocalidad] = useState(empresaEditar?.localidad || '')
  const [provincia, setProvincia] = useState(empresaEditar?.provincia || '')
  const [fechaInicio, setFechaInicio] = useState(empresaEditar?.fecha_inicio || '')
  const [latitud, setLatitud] = useState<number | null>(empresaEditar?.latitud || null)
  const [longitud, setLongitud] = useState<number | null>(empresaEditar?.longitud || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cuitValido, setCuitValido] = useState<boolean | null>(null)
  const [buscandoDireccion, setBuscandoDireccion] = useState(false)
  const [activo, setActivo] = useState(empresaEditar?.activo ?? true)

  const input = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '7px 10px', borderRadius: '6px',
        background: '#0d1117', border: '0.5px solid #30363d',
        color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
      }}
    />
  )

  async function buscarDireccion() {
    if (!direccion) return
    setBuscandoDireccion(true)

    const partes = [direccion]
    if (cp) partes.push(cp)
    if (localidad) partes.push(localidad)
    if (provincia) partes.push(provincia)
    partes.push('Argentina')

    const query = partes.join(', ')
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ar`
    )
    const data = await res.json()

    if (data.length === 0) {
      alert('No se encontró la dirección. Ubicala en el mapa.')
      setBuscandoDireccion(false)
      return
    }

    const localidadLower = localidad.toLowerCase()
    const mejorResultado = data.find((r: any) =>
      r.display_name.toLowerCase().includes(localidadLower)
    ) || data[0]

    setLatitud(parseFloat(mejorResultado.lat))
    setLongitud(parseFloat(mejorResultado.lon))
    setBuscandoDireccion(false)
  }

  function traducirError(mensaje: string): string {
    if (mensaje.includes('empresas_cuit_key') || mensaje.includes('unique') && mensaje.includes('cuit'))
      return 'Ya existe una empresa con ese CUIT.'
    if (mensaje.includes('empresas_codigo_key') || mensaje.includes('unique') && mensaje.includes('codigo'))
      return 'Ya existe una empresa con ese código.'
    if (mensaje.includes('unique'))
      return 'Ya existe un registro con esos datos.'
    if (mensaje.includes('foreign key'))
      return 'No se puede guardar: hay datos relacionados que no existen.'
    if (mensaje.includes('not-null'))
      return 'Hay campos obligatorios sin completar.'
    return 'Ocurrió un error al guardar. Intentá de nuevo.'
  }

  async function guardar() {
    setLoading(true)
    setError('')

    if (!validarCuit(cuit)) {
      setError('El CUIT ingresado no es válido')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const datos = {
      codigo, razon_social: razonSocial, cuit, cbu: cbu || null,
      direccion, cp, localidad, provincia,
      fecha_inicio: fechaInicio || null,
      latitud, longitud,
      activo,
    }

    if (editando) {
      const { error } = await supabase
        .from('empresas').update(datos).eq('id', empresaEditar.id)
      if (error) {
        setError(traducirError(error.message))
        setLoading(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('empresas').insert(datos)
      if (error) {
        setError(traducirError(error.message))
        setLoading(false)
        return
      }
    }

    router.refresh()
    if (onCerrar) onCerrar()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 50, overflowY: 'auto', paddingTop: '20px', paddingBottom: '20px',
    }}>
      <div style={{
        background: '#161b22', border: '0.5px solid #30363d',
        borderRadius: '10px', width: '100%', maxWidth: '520px', padding: '24px',
      }}>

        {/* Header */}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Código y CUIT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Código *</label>
              {input(codigo, setCodigo, 'Ej: CONST01')}
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>CUIT *</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={cuit}
                  onChange={(e) => {
                    const valor = e.target.value
                    setCuit(valor)
                    const limpio = valor.replace(/[^0-9]/g, '')
                    if (limpio.length === 11) {
                      const valido = validarCuit(valor)
                      setCuitValido(valido)
                      if (valido) setCuit(formatearCuit(valor))
                    } else {
                      setCuitValido(null)
                    }
                  }}
                  placeholder="Ej: 30-12345678-9"
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: '6px',
                    background: '#0d1117',
                    border: `0.5px solid ${cuitValido === false ? '#f85149' : cuitValido === true ? '#3fb950' : '#30363d'}`,
                    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
                  }}
                />
                {cuitValido !== null && (
                  <span style={{
                    position: 'absolute', right: '10px', top: '50%',
                    transform: 'translateY(-50%)',
                    color: cuitValido ? '#3fb950' : '#f85149',
                    fontSize: '14px',
                  }}>
                    {cuitValido ? '✓' : '✗'}
                  </span>
                )}
              </div>
              {cuitValido === false && (
                <span style={{ fontSize: '11px', color: '#f85149', marginTop: '3px', display: 'block' }}>
                  CUIT inválido
                </span>
              )}
            </div>
          </div>

          {/* Razón social */}
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Razón Social *</label>
            {input(razonSocial, setRazonSocial, 'Ej: Constructora SA')}
          </div>

          {/* CBU y Fecha inicio */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>CBU</label>
              {input(cbu, setCbu, '22 dígitos')}
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: '6px',
                  background: '#0d1117', border: '0.5px solid #30363d',
                  color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
                }}
              />
            </div>
          </div>

          {/* Dirección y CP */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Dirección</label>
              {input(direccion, setDireccion, 'Calle y número')}
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>CP</label>
              {input(cp, setCp, 'Ej: 3000')}
            </div>
          </div>

          {/* Localidad y Provincia */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Localidad</label>
              {input(localidad, setLocalidad, 'Ciudad')}
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Provincia</label>
              {input(provincia, setProvincia, 'Provincia')}
            </div>
          </div>

          {/* Botón buscar */}
          <button
            onClick={buscarDireccion}
            disabled={buscandoDireccion || !direccion}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: '0.5px solid #30363d',
              color: '#58a6ff', borderRadius: '6px', padding: '7px 12px',
              fontSize: '13px', cursor: 'pointer', width: 'fit-content',
              opacity: !direccion ? 0.4 : 1,
            }}
          >
            <MapPin size={14} />
            {buscandoDireccion ? 'Buscando...' : 'Buscar en el mapa'}
          </button>

          {/* Mapa */}
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>
              Ubicación — clickeá para ubicar en el mapa
            </label>
            <MapaObra
              latitud={latitud}
              longitud={longitud}
              onChange={(lat, lng) => { setLatitud(lat); setLongitud(lng) }}
            />
            {latitud && longitud && (
              <span style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px', display: 'block' }}>
                {latitud.toFixed(6)}, {longitud.toFixed(6)}
              </span>
            )}
          </div>

          {error && (
            <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="activo"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          <label htmlFor="activo" style={{ fontSize: '13px', color: '#8b949e', cursor: 'pointer' }}>
            Empresa activa
          </label>
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