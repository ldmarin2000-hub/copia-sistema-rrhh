"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { X, Plus, Pencil } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'
import { traducirError } from '@/lib/errores'
import {
  calcularAniosEfectivos,
  calcularGanadoDesdeCorte,
  calcularTomadosDesdeCorte,
  formatAntigüedad,
  TramoVacaciones,
} from '@/lib/vacaciones'

type Vacacion = {
  id: number
  fecha_desde: string
  fecha_hasta: string
  observacion?: string
}

type SaldoInicial = {
  fecha_corte: string
  saldo_dias: number
  observacion?: string
}

type Props = {
  idLegajo: number
  idEmpresa: number
  fechaIngreso: string
  fechaReconocida?: string
  fechaBaja?: string
  vacaciones: Vacacion[]
  tramosVacaciones: TramoVacaciones[]
  metodoNombre: string
  saldoInicial: SaldoInicial | null
  feriados: string[]
}

export default function VacacionesTab({
  idLegajo, idEmpresa, fechaIngreso, fechaReconocida, fechaBaja,
  vacaciones, tramosVacaciones, metodoNombre, saldoInicial, feriados,
}: Props) {
  // La fecha base para antigüedad y vacaciones es la reconocida si existe, sino la de ingreso
  const fechaBase = fechaReconocida ?? fechaIngreso
  const router = useRouter()

  // --- Periodos ---
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Vacacion | null>(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [observacion, setObservacion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // --- Saldo inicial ---
  const [mostrarFormSaldo, setMostrarFormTramo] = useState(false)
  const [saldoFechaCorte, setSaldoFechaCorte] = useState(saldoInicial?.fecha_corte || '')
  const [saldoDias, setSaldoDias] = useState(saldoInicial ? String(saldoInicial.saldo_dias) : '')
  const [saldoObs, setSaldoObs] = useState(saldoInicial?.observacion || '')
  const [loadingSaldo, setLoadingSaldo] = useState(false)
  const [errorSaldo, setErrorSaldo] = useState('')

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px'
  }

  function getDias(): number {
    if (!fechaDesde || !fechaHasta) return 0
    const desde = new Date(fechaDesde + 'T00:00:00')
    const hasta = new Date(fechaHasta + 'T00:00:00')
    const diff = Math.floor((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }

  function abrirNuevo() {
    setEditando(null)
    setFechaDesde('')
    setFechaHasta('')
    setObservacion('')
    setError('')
    setMostrarForm(true)
  }

  function abrirEditar(v: Vacacion) {
    setEditando(v)
    setFechaDesde(v.fecha_desde)
    setFechaHasta(v.fecha_hasta)
    setObservacion(v.observacion || '')
    setError('')
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
  }

  async function guardar() {
    if (!fechaDesde || !fechaHasta) { setError('Completá las fechas.'); return }
    if (fechaHasta < fechaDesde) { setError('La fecha hasta no puede ser menor a la fecha desde.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const datos = { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, observacion: observacion || null }

    if (editando) {
      const { error } = await supabase.from('vacaciones_periodo').update(datos).eq('id', editando.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { error } = await supabase.from('vacaciones_periodo').insert({ ...datos, id_empresa: idEmpresa, id_legajo: idLegajo })
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(v: Vacacion) {
    if (!confirm(`¿Eliminar vacaciones del ${formatFecha(v.fecha_desde)} al ${formatFecha(v.fecha_hasta)}?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('vacaciones_periodo').delete().eq('id', v.id)
    if (error) alert('No se puede eliminar: ' + traducirError(error.message))
    else router.refresh()
  }

  async function guardarSaldo() {
    if (!saldoFechaCorte || saldoDias === '') { setErrorSaldo('Completá fecha de corte y saldo.'); return }
    setLoadingSaldo(true)
    setErrorSaldo('')
    const supabase = createClient()
    const datos = {
      id_legajo: idLegajo,
      id_empresa: idEmpresa,
      fecha_corte: saldoFechaCorte,
      saldo_dias: parseFloat(saldoDias),
      observacion: saldoObs || null,
    }
    const { error } = await supabase
      .from('vacaciones_saldo_inicial')
      .upsert(datos, { onConflict: 'id_legajo' })
    if (error) { setErrorSaldo(traducirError(error.message)); setLoadingSaldo(false); return }
    router.refresh()
    setMostrarFormTramo(false)
    setLoadingSaldo(false)
  }

  // --- Cuenta corriente ---
  const hoy = new Date().toISOString().split('T')[0]
  const fechaRef = fechaBaja || hoy
  const tieneMetodo = tramosVacaciones.length > 0

  // Si no hay saldo inicial definido, defaulteamos a 0 desde fecha de ingreso
  const corteEfectivo = saldoInicial ?? { fecha_corte: fechaIngreso, saldo_dias: 0 }

  let cuentaCorriente: { ganado: number; tomado: number; saldo: number } | null = null
  let antiguedad = ''
  let aniosEfectivos = 0

  if (tieneMetodo) {
    const ganado = calcularGanadoDesdeCorte(fechaBase, corteEfectivo.fecha_corte, tramosVacaciones, fechaBaja, feriados)
    const tomado = calcularTomadosDesdeCorte(vacaciones, corteEfectivo.fecha_corte)
    const saldo = Math.round((corteEfectivo.saldo_dias + ganado - tomado) * 10) / 10
    cuentaCorriente = { ganado, tomado, saldo }
    antiguedad = formatAntigüedad(fechaBase, fechaRef)
    aniosEfectivos = calcularAniosEfectivos(fechaBase, fechaRef)
  }

  return (
    <>
      {/* Modal periodo */}
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--c-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            borderRadius: '10px', width: '100%', maxWidth: '420px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                {editando ? 'Editar vacaciones' : 'Registrar vacaciones'}
              </h2>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Desde *</label>
                  <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hasta *</label>
                  <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {fechaDesde && fechaHasta && getDias() > 0 && (
                <p style={{ fontSize: '12px', color: 'var(--c-blue)', margin: 0 }}>
                  {getDias()} día{getDias() !== 1 ? 's' : ''} de vacaciones
                </p>
              )}

              <div>
                <label style={labelStyle}>Observación</label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Opcional..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>

              {error && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{
                background: 'transparent', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={guardar} disabled={loading} style={{
                background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal saldo inicial */}
      {mostrarFormSaldo && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--c-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            borderRadius: '10px', width: '100%', maxWidth: '400px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                Saldo inicial de vacaciones
              </h2>
              <button onClick={() => setMostrarFormTramo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', marginTop: 0, marginBottom: '16px' }}>
              Usá esto para migrar desde otro sistema. El saldo inicial es la cantidad de días al momento de la fecha de corte.
              A partir de esa fecha el sistema calcula automáticamente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Fecha de corte *</label>
                  <input type="date" value={saldoFechaCorte} onChange={e => setSaldoFechaCorte(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Saldo en días *</label>
                  <input type="number" step="0.5" value={saldoDias} onChange={e => setSaldoDias(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Observación</label>
                <input value={saldoObs} onChange={e => setSaldoObs(e.target.value)} placeholder="Opcional..." style={inputStyle} />
              </div>
              {errorSaldo && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{errorSaldo}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setMostrarFormTramo(false)} style={{
                background: 'transparent', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={guardarSaldo} disabled={loadingSaldo} style={{
                background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer', opacity: loadingSaldo ? 0.6 : 1,
              }}>
                {loadingSaldo ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cuenta corriente */}
      {tieneMetodo && (
        <div style={{
          background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
          borderRadius: '8px', padding: '16px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>
                Cuenta corriente de vacaciones
              </p>
              <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: 0 }}>
                {metodoNombre} · {antiguedad || formatAntigüedad(fechaBase, fechaRef)}
                {aniosEfectivos > 0 && ` (${aniosEfectivos} año${aniosEfectivos !== 1 ? 's' : ''} efectivo${aniosEfectivos !== 1 ? 's' : ''})`}
                {fechaReconocida && <span style={{ color: 'var(--c-blue)', marginLeft: '6px' }}>· fecha reconocida: {formatFecha(fechaReconocida)}</span>}
              </p>
            </div>
            <button
              onClick={() => {
                setSaldoFechaCorte(saldoInicial?.fecha_corte || '')
                setSaldoDias(saldoInicial ? String(saldoInicial.saldo_dias) : '')
                setSaldoObs(saldoInicial?.observacion || '')
                setMostrarFormTramo(true)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-secondary)', borderRadius: '6px',
                padding: '5px 10px', fontSize: '12px', cursor: 'pointer',
              }}
            >
              <Pencil size={12} />
              {saldoInicial ? 'Editar saldo' : 'Definir saldo inicial'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ background: 'var(--c-elevated)', borderRadius: '6px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo inicial</p>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--c-text-primary)', margin: 0 }}>{corteEfectivo.saldo_dias}</p>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-secondary)', margin: '2px 0 0' }}>
                    {saldoInicial ? `al ${formatFecha(saldoInicial.fecha_corte)}` : 'desde ingreso (por defecto)'}
                  </p>
                </div>
                <div style={{ background: 'var(--c-elevated)', borderRadius: '6px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ganado</p>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--c-green)', margin: 0 }}>+{cuentaCorriente?.ganado ?? 0}</p>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-secondary)', margin: '2px 0 0' }}>desde el corte</p>
                </div>
                <div style={{ background: 'var(--c-elevated)', borderRadius: '6px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tomado</p>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--c-red)', margin: 0 }}>-{cuentaCorriente?.tomado ?? 0}</p>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-secondary)', margin: '2px 0 0' }}>desde el corte</p>
                </div>
                <div style={{
                  background: (cuentaCorriente?.saldo ?? 0) >= 0 ? 'var(--c-green-bg)' : 'var(--c-red-bg)',
                  borderRadius: '6px', padding: '10px 14px',
                }}>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo actual</p>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: (cuentaCorriente?.saldo ?? 0) >= 0 ? 'var(--c-green)' : 'var(--c-red)', margin: 0 }}>
                    {cuentaCorriente?.saldo ?? 0}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--c-text-secondary)', margin: '2px 0 0' }}>días disponibles</p>
                </div>
              </div>
        </div>
      )}

      {/* Lista periodos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', margin: 0 }}>
          {vacaciones.length} período{vacaciones.length !== 1 ? 's' : ''} registrado{vacaciones.length !== 1 ? 's' : ''}
        </p>
        <button onClick={abrirNuevo} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--c-blue-btn)', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 14px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          <Plus size={14} />
          Registrar vacaciones
        </button>
      </div>

      {vacaciones.length === 0 ? (
        <div style={{
          background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px',
        }}>
          No hay vacaciones registradas.
        </div>
      ) : (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                {['Desde', 'Hasta', 'Días', 'Observación'].map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>{col}</th>
                ))}
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {vacaciones.map((v, i) => {
                const desde = new Date(v.fecha_desde + 'T00:00:00')
                const hasta = new Date(v.fecha_hasta + 'T00:00:00')
                const dias = Math.floor((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
                return (
                  <tr key={v.id} style={{ borderBottom: i < vacaciones.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)', fontWeight: 500 }}>{formatFecha(v.fecha_desde)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{formatFecha(v.fecha_hasta)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--c-blue)', fontWeight: 500 }}>{dias}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{v.observacion || '—'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button onClick={() => abrirEditar(v)} style={{ background: 'transparent', border: 'none', color: 'var(--c-text-secondary)', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
                      <button onClick={() => eliminar(v)} style={{ background: 'transparent', border: 'none', color: 'var(--c-red)', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Eliminar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
