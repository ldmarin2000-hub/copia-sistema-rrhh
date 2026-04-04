"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'
import { X } from 'lucide-react'

type Empresa = { id: number; razon_social: string }
type Usuario = { id: string; nombre: string; email: string }

type RegistroAuditoria = {
  id: number
  created_at: string
  empresa_id: number | null
  usuario_id: string | null
  tabla: string
  registro_id: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  datos_ant: Record<string, any> | null
  datos_nuevo: Record<string, any> | null
  empresas?: { razon_social: string } | null
}

const TABLAS = [
  'legajos',
  'legajos_historial_laboral',
  'novedades_diarias',
  'ausencias_periodo',
  'banco_horas_movimientos',
  'banco_horas_acuerdos',
  'exportacion_config',
  'usuarios',
  'permisos_empresas',
]

const ACCION_COLOR: Record<string, { color: string; bg: string }> = {
  INSERT: { color: 'var(--c-green)',  bg: 'var(--c-green-bg)' },
  UPDATE: { color: 'var(--c-blue)',   bg: 'var(--c-blue-bg)' },
  DELETE: { color: 'var(--c-red)',    bg: 'var(--c-red-bg)' },
}

const selStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--c-base)',
  border: '0.5px solid var(--c-border)',
  borderRadius: '6px',
  color: 'var(--c-text-primary)',
  fontSize: '13px',
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--c-base)',
  border: '0.5px solid var(--c-border)',
  borderRadius: '6px',
  color: 'var(--c-text-primary)',
  fontSize: '13px',
}

const thStyle: React.CSSProperties = {
  padding: '8px 14px',
  textAlign: 'left',
  fontSize: '11px',
  color: 'var(--c-text-muted)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '13px',
  color: 'var(--c-text-primary)',
  borderTop: '0.5px solid var(--c-border)',
  whiteSpace: 'nowrap',
}

function formatTimestamp(ts: string) {
  const d = new Date(ts)
  const fecha = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${fecha} ${hora}`
}

function JsonDiff({
  ant,
  nuevo,
  accion,
}: {
  ant: Record<string, any> | null
  nuevo: Record<string, any> | null
  accion: string
}) {
  // Calcular claves que cambiaron en UPDATE
  const changedKeys = new Set<string>()
  if (accion === 'UPDATE' && ant && nuevo) {
    for (const k of new Set([...Object.keys(ant), ...Object.keys(nuevo)])) {
      if (JSON.stringify(ant[k]) !== JSON.stringify(nuevo[k])) changedKeys.add(k)
    }
  }

  const renderJson = (obj: Record<string, any> | null, highlight: boolean) => {
    if (!obj) return <span style={{ color: 'var(--c-text-muted)', fontSize: '12px' }}>—</span>
    return (
      <pre style={{
        margin: 0, padding: '12px', background: 'var(--c-base)', borderRadius: '6px',
        fontSize: '12px', color: 'var(--c-text-secondary)', overflowX: 'auto',
        maxHeight: '320px', overflowY: 'auto', fontFamily: 'monospace', lineHeight: 1.5,
      }}>
        {'{'}
        {Object.entries(obj).map(([k, v]) => {
          const isChanged = highlight && changedKeys.has(k)
          return (
            <div
              key={k}
              style={{
                background: isChanged ? 'var(--c-blue-bg)' : 'transparent',
                borderLeft: isChanged ? '2px solid var(--c-blue)' : '2px solid transparent',
                paddingLeft: isChanged ? '6px' : '6px',
                marginLeft: '-2px',
              }}
            >
              <span style={{ color: 'var(--c-blue)', opacity: 0.8 }}>"{k}"</span>
              <span style={{ color: 'var(--c-text-muted)' }}>: </span>
              <span style={{ color: isChanged ? 'var(--c-text-primary)' : 'var(--c-text-secondary)' }}>
                {JSON.stringify(v, null, 2)}
              </span>
              <span style={{ color: 'var(--c-text-muted)' }}>,</span>
            </div>
          )
        })}
        {'}'}
      </pre>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: accion === 'UPDATE' ? '1fr 1fr' : '1fr', gap: '16px' }}>
      {(accion === 'UPDATE' || accion === 'DELETE') && (
        <div>
          <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>
            {accion === 'UPDATE' ? 'Antes' : 'Datos eliminados'}
          </p>
          {renderJson(ant, false)}
        </div>
      )}
      {(accion === 'UPDATE' || accion === 'INSERT') && (
        <div>
          <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>
            {accion === 'UPDATE' ? 'Después' : 'Datos insertados'}
          </p>
          {renderJson(nuevo, accion === 'UPDATE')}
        </div>
      )}
    </div>
  )
}

export default function AuditoriaClient({
  esSuperadmin,
  empresas,
  usuarios,
}: {
  esSuperadmin: boolean
  empresas: Empresa[]
  usuarios: Usuario[]
}) {
  const { empresaActiva } = useEmpresa()

  const [filtroEmpresa, setFiltroEmpresa] = useState(
    esSuperadmin ? '' : String(empresaActiva?.id || '')
  )
  const [filtroTabla, setFiltroTabla] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [cargando, setCargando] = useState(false)
  const [consultado, setConsultado] = useState(false)
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null)

  async function consultar() {
    setCargando(true)
    setConsultado(false)
    const supabase = createClient()

    let q = supabase
      .from('auditoria')
      .select('*, empresas(razon_social)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filtroEmpresa) q = q.eq('empresa_id', parseInt(filtroEmpresa))
    else if (!esSuperadmin && empresaActiva) q = q.eq('empresa_id', empresaActiva.id)

    if (filtroTabla) q = q.eq('tabla', filtroTabla)
    if (filtroAccion) q = q.eq('accion', filtroAccion)
    if (filtroUsuario) q = q.eq('usuario_id', filtroUsuario)
    if (filtroDesde) q = q.gte('created_at', filtroDesde + 'T00:00:00')
    if (filtroHasta) q = q.lte('created_at', filtroHasta + 'T23:59:59')

    const { data } = await q
    setRegistros((data || []) as RegistroAuditoria[])
    setCargando(false)
    setConsultado(true)
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>Auditoría del sistema</h1>
        <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>Registro de cambios en tablas críticas</span>
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          {esSuperadmin && (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Empresa</label>
              <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} style={selStyle}>
                <option value="">Todas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Tabla</label>
            <select value={filtroTabla} onChange={e => setFiltroTabla(e.target.value)} style={selStyle}>
              <option value="">Todas</option>
              {TABLAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Acción</label>
            <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)} style={selStyle}>
              <option value="">Todas</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Usuario</label>
            <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} style={{ ...selStyle, maxWidth: '180px' }}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre || u.email}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Desde</label>
            <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Hasta</label>
            <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} style={inputStyle} />
          </div>
          <button
            onClick={consultar}
            disabled={cargando}
            style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 18px', fontSize: '13px', cursor: 'pointer', opacity: cargando ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            {cargando ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {!consultado ? (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          Seleccioná filtros y presioná Consultar
        </div>
      ) : registros.length === 0 ? (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          Sin registros para los filtros seleccionados
        </div>
      ) : (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--c-border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{registros.length} registro{registros.length !== 1 ? 's' : ''} (máx. 200)</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--c-base)' }}>
                  <th style={thStyle}>Fecha / Hora</th>
                  <th style={thStyle}>Usuario</th>
                  {esSuperadmin && <th style={thStyle}>Empresa</th>}
                  <th style={thStyle}>Tabla</th>
                  <th style={thStyle}>Acción</th>
                  <th style={thStyle}>ID</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => {
                  const ac = ACCION_COLOR[r.accion] || ACCION_COLOR.INSERT
                  return (
                    <tr key={r.id}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', color: 'var(--c-text-secondary)' }}>
                        {formatTimestamp(r.created_at)}
                      </td>
                      <td style={tdStyle}>
                        {(() => { const u = usuarios.find(u => u.id === r.usuario_id); return u?.nombre || u?.email || <span style={{ color: 'var(--c-text-muted)', fontStyle: 'italic' }}>sistema</span> })()}
                      </td>
                      {esSuperadmin && (
                        <td style={{ ...tdStyle, color: 'var(--c-text-secondary)' }}>
                          {(r.empresas as any)?.razon_social || '—'}
                        </td>
                      )}
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px' }}>{r.tabla}</td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                          background: ac.bg, color: ac.color,
                          fontWeight: 500, letterSpacing: '0.3px',
                        }}>
                          {r.accion}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', color: 'var(--c-text-secondary)' }}>
                        {r.registro_id}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={() => setDetalle(r)}
                          style={{ background: 'none', border: 'none', color: 'var(--c-blue)', fontSize: '12px', cursor: 'pointer', padding: '2px 8px' }}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) setDetalle(null) }}
        >
          <div style={{ background: 'var(--c-surface)', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--c-text-primary)', margin: '0 0 4px' }}>
                  Detalle — {detalle.tabla} #{detalle.registro_id}
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    background: ACCION_COLOR[detalle.accion]?.bg,
                    color: ACCION_COLOR[detalle.accion]?.color,
                    fontWeight: 500,
                  }}>{detalle.accion}</span>
                  <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
                    {formatTimestamp(detalle.created_at)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
                    {(() => { const u = usuarios.find(u => u.id === detalle.usuario_id); return u?.nombre || u?.email || 'sistema' })()}
                  </span>
                </div>
              </div>
              <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <JsonDiff ant={detalle.datos_ant} nuevo={detalle.datos_nuevo} accion={detalle.accion} />
          </div>
        </div>
      )}
    </div>
  )
}
