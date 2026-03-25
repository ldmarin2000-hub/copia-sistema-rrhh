"use client"

import { useState } from 'react'
import { useEmpresa } from '../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'
import Link from 'next/link'

type Vacacion = {
  id: number
  id_legajo: number
  fecha_desde: string
  fecha_hasta: string
  observacion?: string
  legajos: { apellido: string, nombre: string, nro_legajo: number, id_empresa: number, id_obra?: number }
}

type Legajo = {
  id: number
  id_empresa: number
  apellido: string
  nombre: string
  nro_legajo: number
  id_obra?: number
}

export default function VacacionesGeneralClient({
  vacaciones, legajos
}: {
  vacaciones: Vacacion[]
  legajos: Legajo[]
}) {
  const { empresaActiva, rol, obrasJefe } = useEmpresa()
  const [filtroLegajo, setFiltroLegajo] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const selectStyle = {
    padding: '7px 10px', borderRadius: '6px',
    background: '#161b22', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

  const inputStyle = {
    padding: '7px 10px', borderRadius: '6px',
    background: '#161b22', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

  const legajosFiltrados = legajos
    .filter(l => l.id_empresa === empresaActiva?.id)
    .filter(l => rol !== 'JEFE_OBRA' || (l.id_obra != null && obrasJefe.includes(l.id_obra)))

  const vacacionesFiltradas = vacaciones
    .filter(v => v.legajos.id_empresa === empresaActiva?.id)
    .filter(v => rol !== 'JEFE_OBRA' || (v.legajos.id_obra != null && obrasJefe.includes(v.legajos.id_obra)))
    .filter(v => filtroLegajo ? v.id_legajo === parseInt(filtroLegajo) : true)
    .filter(v => filtroDesde ? v.fecha_hasta >= filtroDesde : true)
    .filter(v => filtroHasta ? v.fecha_desde <= filtroHasta : true)

  // Calcular días activos hoy
  const hoy = new Date().toISOString().split('T')[0]
  const enVacacionesHoy = vacacionesFiltradas.filter(
    v => v.fecha_desde <= hoy && v.fecha_hasta >= hoy
  ).length

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <div>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Vacaciones</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {vacacionesFiltradas.length} registro{vacacionesFiltradas.length !== 1 ? 's' : ''}
            {enVacacionesHoy > 0 && (
              <span style={{ marginLeft: '8px', color: '#58a6ff' }}>
                · {enVacacionesHoy} en vacaciones hoy
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        background: '#161b22', border: '0.5px solid #30363d',
        borderRadius: '8px', padding: '16px 20px',
        display: 'flex', flexWrap: 'wrap' as const, gap: '12px',
        alignItems: 'flex-end', marginBottom: '20px',
      }}>
        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Empleado</label>
          <select value={filtroLegajo} onChange={(e) => setFiltroLegajo(e.target.value)} style={selectStyle}>
            <option value="">Todos</option>
            {legajosFiltrados.map(l => (
              <option key={l.id} value={l.id}>{l.apellido}, {l.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Desde</label>
          <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Hasta</label>
          <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} style={inputStyle} />
        </div>

        {(filtroLegajo || filtroDesde || filtroHasta) && (
          <button
            onClick={() => { setFiltroLegajo(''); setFiltroDesde(''); setFiltroHasta('') }}
            style={{
              background: 'transparent', border: '0.5px solid #30363d',
              color: '#8b949e', borderRadius: '6px', padding: '7px 14px',
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      {vacacionesFiltradas.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay vacaciones para los filtros seleccionados.
        </div>
      ) : (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {['Empleado', 'Desde', 'Hasta', 'Días', 'Estado', 'Observación'].map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vacacionesFiltradas.map((v, i) => {
                const desde = new Date(v.fecha_desde + 'T12:00:00')
                const hasta = new Date(v.fecha_hasta + 'T12:00:00')
                const dias = Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
                const activa = v.fecha_desde <= hoy && v.fecha_hasta >= hoy
                const futura = v.fecha_desde > hoy
                return (
                  <tr key={v.id} style={{ borderBottom: i < vacacionesFiltradas.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <Link href={`/legajos/${v.id_legajo}`} style={{ textDecoration: 'none' }}>
                        <span style={{ color: '#e6edf3', fontWeight: 500 }}>
                          {v.legajos.apellido}, {v.legajos.nombre}
                        </span>
                        <span style={{ color: '#484f58', fontSize: '11px', marginLeft: '6px' }}>
                          #{String(v.legajos.nro_legajo).padStart(4, '0')}
                        </span>
                      </Link>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(v.fecha_desde)}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(v.fecha_hasta)}</td>
                    <td style={{ padding: '10px 16px', color: '#58a6ff', fontWeight: 500 }}>{dias}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {activa ? (
                        <span style={{ background: '#1a3a2a', color: '#3fb950', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>En curso</span>
                      ) : futura ? (
                        <span style={{ background: '#1a2a3a', color: '#58a6ff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Próxima</span>
                      ) : (
                        <span style={{ background: '#21262d', color: '#8b949e', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Finalizada</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{v.observacion || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}