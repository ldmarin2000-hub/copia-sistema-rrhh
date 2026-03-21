"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Clock, FileText, Calendar, Pencil, Umbrella } from 'lucide-react'
import Link from 'next/link'
import { formatFecha } from '@/lib/fecha'
import FormLegajo from '../FormLegajo'
import AusenciasTab from './AusenciasTab'
import VacacionesTab from './VacacionesTab'





type Legajo = {
  id: number
  id_empresa: number
  nro_legajo: number
  apellido: string
  nombre: string
  cuil: string
  fecha_nacimiento?: string
  sexo?: string
  nacionalidad?: string
  tipo_documento?: string
  nro_documento?: string
  direccion?: string
  cp?: string
  localidad?: string
  provincia?: string
  telefono?: string
  fecha_ingreso: string
  id_categoria?: number
  id_obra?: number
  estado: string
  cbu?: string
  codigo_externo?: string
  activo: boolean
  categorias?: { descripcion: string }
  obras?: { nombre: string }
  
}

type HistoricoLaboral = {
  id: number
  fecha_ingreso: string
  fecha_egreso?: string
  motivo: string
  observacion?: string
}

type HistoricoCategoria = {
  id: number
  fecha_desde: string
  fecha_hasta?: string
  categorias: { descripcion: string }
}

type HistoricoObra = {
  id: number
  fecha_desde: string
  fecha_hasta?: string
  obras: { nombre: string }
}

type Categoria = {
  id: number
  id_empresa: number
  descripcion: string
}

type Obra = {
  id: number
  id_empresa: number
  nombre: string
}

const badgeEstado = (estado: string) => {
  const colores: Record<string, { bg: string, color: string }> = {
    'Pre-Alta':  { bg: '#1a2a3a', color: '#58a6ff' },
    Activo:      { bg: '#1a3a2a', color: '#3fb950' },
    Baja:        { bg: '#3a1a1a', color: '#f85149' },
    Suspendido:  { bg: '#3a2f1a', color: '#d29922' },
    Inactivo:    { bg: '#21262d', color: '#8b949e' },
  }
  const c = colores[estado] || colores.Inactivo
  
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '12px', padding: '3px 10px', borderRadius: '4px',
    }}>{estado}</span>
  )
}

const tabs = [
  { id: 'datos',     label: 'Datos',      icon: User },
  { id: 'ausencias', label: 'Ausencias',  icon: Calendar },
  { id: 'vacaciones', label: 'Vacaciones', icon: Umbrella },
  { id: 'historial', label: 'Historial',  icon: Clock },
  { id: 'documentos',label: 'Documentos', icon: FileText },
  { id: 'novedades', label: 'Novedades',  icon: Calendar },
]

export default function FichaClient({
  legajo, historico_laboral, historico_categorias,
  historico_obras, categorias, obras, ausencias, tiposAusencia, vacaciones
}: {
  legajo: Legajo
  historico_laboral: HistoricoLaboral[]
  historico_categorias: HistoricoCategoria[]
  historico_obras: HistoricoObra[]
  categorias: Categoria[]
  obras: Obra[]
  ausencias: any[]
  tiposAusencia: any[]
   vacaciones: any[]
}) {
  const [tabActiva, setTabActiva] = useState('datos')
  const [mostrarForm, setMostrarForm] = useState(false)

  const dato = (label: string, valor?: string | null) => (
    <div>
      <p style={{ fontSize: '11px', color: '#484f58', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ fontSize: '13px', color: valor ? '#e6edf3' : '#484f58', margin: 0 }}>
        {valor || '—'}
      </p>
    </div>
  )

  return (
    <div>
      {/* Header ficha */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/legajos" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#8b949e', fontSize: '13px', marginBottom: '16px' }}>
          <ArrowLeft size={14} />
          Volver a legajos
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: '#1a2a3a', border: '0.5px solid #30363d',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '18px', color: '#58a6ff', fontWeight: 500 }}>
                {legajo.apellido.charAt(0)}
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#e6edf3', margin: '0 0 4px' }}>
                {legajo.apellido}, {legajo.nombre}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>
                  Legajo {String(legajo.nro_legajo).padStart(4, '0')}
                </span>
                {legajo.codigo_externo && (
                  <span style={{ fontSize: '12px', color: '#8b949e' }}>
                    · Ext: {legajo.codigo_externo}
                  </span>
                )}
                <span style={{ fontSize: '12px', color: '#8b949e' }}>· {legajo.cuil}</span>
                {badgeEstado(legajo.estado)}
              </div>
            </div>
          </div>
        </div>
        {/* Botón editar */}
        <button
          onClick={() => setMostrarForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#21262d', border: '0.5px solid #30363d',
            color: '#e6edf3', borderRadius: '6px', padding: '7px 14px',
            fontSize: '13px', cursor: 'pointer',
          }}
        >
          <Pencil size={14} />
          Editar legajo
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '0.5px solid #30363d', paddingBottom: '0' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', background: 'transparent', border: 'none',
              borderBottom: tabActiva === tab.id ? '2px solid #58a6ff' : '2px solid transparent',
              color: tabActiva === tab.id ? '#58a6ff' : '#8b949e',
              fontSize: '13px', cursor: 'pointer', marginBottom: '-1px',
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Datos */}
      {tabActiva === 'datos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Datos laborales */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '20px' }}>
            <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Datos laborales</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {dato('Fecha ingreso', legajo.fecha_ingreso ? formatFecha(legajo.fecha_ingreso): null)}
              {dato('Categoría', legajo.categorias?.descripcion)}
              {dato('Obra actual', legajo.obras?.nombre)}
              {dato('CBU', legajo.cbu)}
            </div>
          </div>

          {/* Datos personales */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '20px' }}>
            <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Datos personales</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {dato('Fecha nacimiento', legajo.fecha_nacimiento ? formatFecha(legajo.fecha_nacimiento) : null)}


              {dato('Sexo', legajo.sexo)}
              {dato('Nacionalidad', legajo.nacionalidad)}
              {dato('Tipo documento', legajo.tipo_documento)}
              {dato('Nro documento', legajo.nro_documento)}
              {dato('Teléfono', legajo.telefono)}
            </div>
          </div>

          {/* Domicilio */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '20px' }}>
            <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Domicilio</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {dato('Dirección', legajo.direccion)}
              {dato('CP', legajo.cp)}
              {dato('Localidad', legajo.localidad)}
              {dato('Provincia', legajo.provincia)}
            </div>
          </div>
        </div>
      )}

      {tabActiva === 'ausencias' && (
        <AusenciasTab
          idLegajo={legajo.id}
          idEmpresa={legajo.id_empresa}
          ausencias={ausencias}
          tiposAusencia={tiposAusencia}
        />
      )}
      
      {tabActiva === 'vacaciones' && (
        <VacacionesTab
          idLegajo={legajo.id}
          idEmpresa={legajo.id_empresa}
          vacaciones={vacaciones}
        />
      )}

      {/* Tab: Historial */}
      {tabActiva === 'historial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Historial laboral */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #30363d' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Historial laboral</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '20%' }}>Ingreso</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '20%' }}>Egreso</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '15%' }}>Motivo</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '45%' }}>Observación</th>
                </tr>
              </thead>
              <tbody>
                {historico_laboral.map((h, i) => (
                  <tr key={h.id} style={{ borderBottom: i < historico_laboral.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#e6edf3' }}>
                      {formatFecha(h.fecha_ingreso)}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                      {h.fecha_egreso ? formatFecha(h.fecha_egreso) : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        background: h.motivo === 'Alta' ? '#1a3a2a' : '#3a1a1a',
                        color: h.motivo === 'Alta' ? '#3fb950' : '#f85149',
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                      }}>{h.motivo}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{h.observacion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Histórico categorías */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #30363d' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Histórico de categorías</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '50%' }}>Categoría</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '25%' }}>Desde</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '25%' }}>Hasta</th>
                </tr>
              </thead>
              <tbody>
                {historico_categorias.map((h, i) => (
                  <tr key={h.id} style={{ borderBottom: i < historico_categorias.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{h.categorias.descripcion}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                      {formatFecha(h.fecha_desde)}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                      {h.fecha_hasta ? formatFecha(h.fecha_hasta) : <span style={{ color: '#3fb950', fontSize: '11px' }}>Actual</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Histórico obras */}
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #30363d' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Histórico de obras</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '50%' }}>Obra</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '25%' }}>Desde</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '25%' }}>Hasta</th>
                </tr>
              </thead>
              <tbody>
                {historico_obras.map((h, i) => (
                  <tr key={h.id} style={{ borderBottom: i < historico_obras.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{h.obras.nombre}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                      {formatFecha(h.fecha_desde)}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                      {h.fecha_hasta ? formatFecha(h.fecha_hasta) : <span style={{ color: '#3fb950', fontSize: '11px' }}>Actual</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Documentos */}
      {tabActiva === 'documentos' && (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          Módulo de documentos — próximamente
        </div>
      )}

      {/* Tab: Novedades */}
      {tabActiva === 'novedades' && (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          Módulo de novedades — próximamente
        </div>
      )}
      {mostrarForm && (
        <FormLegajo
          legajoEditar={legajo}
          categorias={categorias}
          obras={obras}
          onCerrar={() => setMostrarForm(false)}
        />
      )}
    </div>
  )
}