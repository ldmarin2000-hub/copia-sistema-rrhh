"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { X, Plus, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'
import { traducirError } from '@/lib/errores'

type Movimiento = {
  id: number
  fecha: string
  tipo: 'acreditacion' | 'descuento' | 'pago_egreso' | 'ajuste_manual'
  origen: 'novedad_diaria' | 'manual' | 'egreso' | null
  horas: number | null
  horas_reales: number | null
  horas_banco: number | null
  concepto: string | null
  iniciativa_descuento: 'empleado' | 'empresa' | 'acuerdo' | null
  saldo_resultante: number | null
}

type AcuerdoBH = {
  id: number
  fecha_inicio: string
  fecha_fin: string | null
  activo: boolean
  modalidad: 'proporcional' | 'nominal' | 'hereda_empresa'
  observacion: string | null
}

type ConfigEmpresa = {
  modalidad: 'proporcional' | 'nominal'
  tope_mensual_horas: number
  tope_anual_horas: number
  tope_acumulado_banco: number | null
} | null

type Props = {
  idLegajo: number
  idEmpresa: number
  movimientos: Movimiento[]
  acuerdo: AcuerdoBH | null
  configEmpresa: ConfigEmpresa
}

const TIPO_LABELS: Record<string, string> = {
  acreditacion: 'Acreditación',
  descuento: 'Descuento',
  pago_egreso: 'Pago egreso',
  ajuste_manual: 'Ajuste manual',
}

const TIPO_COLORS: Record<string, string> = {
  acreditacion: 'var(--c-green)',
  descuento: 'var(--c-text-secondary)',
  pago_egreso: 'var(--c-orange)',
  ajuste_manual: 'var(--c-blue)',
}

export default function BancoHorasTab({ idLegajo, idEmpresa, movimientos: movimientosIniciales, acuerdo: acuerdoInicial, configEmpresa }: Props) {
  const supabase = createClient()

  const [movimientos, setMovimientos] = useState<Movimiento[]>(movimientosIniciales)
  const [acuerdo, setAcuerdo] = useState<AcuerdoBH | null>(acuerdoInicial)
  const [modal, setModal] = useState<'franco' | 'acuerdo' | null>(null)
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form franco
  const [francoFecha, setFrancoFecha] = useState('')
  const [francoHoras, setFrancoHoras] = useState('')
  const [francoIniciativa, setFrancoIniciativa] = useState<'empleado' | 'empresa' | 'acuerdo'>('empleado')
  const [francoObservacion, setFrancoObservacion] = useState('')

  // Form acuerdo
  const [acuerdoFechaInicio, setAcuerdoFechaInicio] = useState('')
  const [acuerdoFechaFin, setAcuerdoFechaFin] = useState('')
  const [acuerdoModalidad, setAcuerdoModalidad] = useState<'proporcional' | 'nominal' | 'hereda_empresa'>('hereda_empresa')
  const [acuerdoObservacion, setAcuerdoObservacion] = useState('')

  const getHorasBanco = (m: Movimiento) => m.horas_banco ?? m.horas ?? 0

  const saldo = movimientos.reduce((acc, m) => {
    const hs = getHorasBanco(m)
    return (m.tipo === 'acreditacion' || m.tipo === 'ajuste_manual') ? acc + hs : acc - hs
  }, 0)

  const modalidadEfectiva: string =
    !acuerdo || acuerdo.modalidad === 'hereda_empresa'
      ? (configEmpresa?.modalidad ?? 'nominal')
      : acuerdo.modalidad

  const movimientosFiltrados = movimientos.filter(m => {
    if (filtroDesde && m.fecha < filtroDesde) return false
    if (filtroHasta && m.fecha > filtroHasta) return false
    return true
  })

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }

  function abrirFranco() {
    setFrancoFecha('')
    setFrancoHoras('')
    setFrancoIniciativa('empleado')
    setFrancoObservacion('')
    setError('')
    setModal('franco')
  }

  function abrirAcuerdo() {
    setAcuerdoFechaInicio(acuerdo?.fecha_inicio ?? new Date().toISOString().split('T')[0])
    setAcuerdoFechaFin(acuerdo?.fecha_fin ?? '')
    setAcuerdoModalidad(acuerdo?.modalidad ?? 'hereda_empresa')
    setAcuerdoObservacion(acuerdo?.observacion ?? '')
    setError('')
    setModal('acuerdo')
  }

  async function guardarFranco() {
    if (!francoFecha || !francoHoras) { setError('Completá fecha y horas'); return }
    const hsNum = parseFloat(francoHoras)
    if (isNaN(hsNum) || hsNum <= 0) { setError('Las horas deben ser un número positivo'); return }
    if (hsNum > saldo) { setError(`Saldo insuficiente. Disponible: ${saldo.toFixed(1)}h`); return }

    setLoading(true)
    setError('')
    const nuevoSaldo = saldo - hsNum

    // Buscar tipo de ausencia FRANCO_BH
    const { data: tipoFranco } = await supabase
      .from('tipos_ausencia')
      .select('id')
      .eq('codigo', 'FRANCO_BH')
      .maybeSingle()

    // Eliminar ausencia FRANCO_BH previa para ese día (evita duplicados)
    if (tipoFranco) {
      await supabase.from('ausencias_periodo')
        .delete()
        .eq('id_legajo', idLegajo)
        .eq('id_tipo_ausencia', tipoFranco.id)
        .eq('fecha_desde', francoFecha)
    }

    const [{ data, error: err }] = await Promise.all([
      supabase
        .from('banco_horas_movimientos')
        .insert({
          id_legajo: idLegajo,
          id_empresa: idEmpresa,
          fecha: francoFecha,
          tipo: 'descuento',
          origen: 'manual',
          horas: hsNum,
          horas_reales: hsNum,
          horas_banco: hsNum,
          concepto: `Franco banco de horas${francoObservacion ? ' — ' + francoObservacion : ''}`,
          iniciativa_descuento: francoIniciativa,
          saldo_resultante: nuevoSaldo,
        })
        .select()
        .single(),
      // Crear ausencia FRANCO_BH
      tipoFranco
        ? supabase.from('ausencias_periodo').insert({
            id_legajo: idLegajo,
            id_empresa: idEmpresa,
            id_tipo_ausencia: tipoFranco.id,
            fecha_desde: francoFecha,
            fecha_hasta: francoFecha,
            observacion: francoObservacion ? `${hsNum} — ${francoObservacion}` : String(hsNum),
          })
        : Promise.resolve({ error: null }),
    ])

    if (err) { setError(traducirError(err.message)); setLoading(false); return }
    setMovimientos(prev => [data as Movimiento, ...prev])
    setModal(null)
    setLoading(false)
  }

  async function guardarAcuerdo() {
    if (!acuerdoFechaInicio) { setError('La fecha de inicio es obligatoria'); return }
    setLoading(true)
    setError('')

    if (acuerdo) {
      await supabase.from('banco_horas_acuerdos').update({ activo: false }).eq('id', acuerdo.id)
    }

    const { data, error: err } = await supabase
      .from('banco_horas_acuerdos')
      .insert({
        legajo_id: idLegajo,
        empresa_id: idEmpresa,
        fecha_inicio: acuerdoFechaInicio,
        fecha_fin: acuerdoFechaFin || null,
        activo: true,
        modalidad: acuerdoModalidad,
        observacion: acuerdoObservacion || null,
      })
      .select()
      .single()

    if (err) { setError(traducirError(err.message)); setLoading(false); return }
    setAcuerdo(data as AcuerdoBH)
    setModal(null)
    setLoading(false)
  }

  async function desactivarAcuerdo() {
    if (!acuerdo || !confirm('¿Desactivar el acuerdo de banco de horas?')) return
    setLoading(true)
    const { error: err } = await supabase
      .from('banco_horas_acuerdos')
      .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
      .eq('id', acuerdo.id)
    if (err) { alert(traducirError(err.message)); setLoading(false); return }
    setAcuerdo(null)
    setLoading(false)
  }

  async function eliminarMovimiento(id: number) {
    if (!confirm('¿Eliminar este movimiento?')) return
    const mov = movimientos.find(m => m.id === id)
    const { error: err } = await supabase.from('banco_horas_movimientos').delete().eq('id', id)
    if (err) { alert(traducirError(err.message)); return }

    // Si era un descuento manual, eliminar también la ausencia FRANCO_BH del día
    if (mov?.tipo === 'descuento' && mov?.origen === 'manual') {
      const { data: tipoFranco } = await supabase
        .from('tipos_ausencia').select('id').eq('codigo', 'FRANCO_BH').maybeSingle()
      if (tipoFranco) {
        await supabase.from('ausencias_periodo')
          .delete()
          .eq('id_legajo', idLegajo)
          .eq('id_tipo_ausencia', tipoFranco.id)
          .eq('fecha_desde', mov.fecha)
      }
    }

    setMovimientos(prev => prev.filter(m => m.id !== id))
  }

  return (
    <>
      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                {modal === 'franco' ? 'Registrar franco' : acuerdo ? 'Editar acuerdo' : 'Activar acuerdo'}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            {modal === 'franco' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Fecha *</label>
                    <input type="date" value={francoFecha} onChange={e => setFrancoFecha(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Horas a descontar *</label>
                    <input type="number" min="0.5" step="0.5" value={francoHoras} onChange={e => setFrancoHoras(e.target.value)} placeholder={`Máx ${saldo.toFixed(1)}h`} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Iniciativa</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['empleado', 'empresa', 'acuerdo'] as const).map(op => (
                      <button key={op} onClick={() => setFrancoIniciativa(op)} style={{
                        flex: 1, padding: '7px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                        border: francoIniciativa === op ? '1.5px solid var(--c-blue)' : '0.5px solid var(--c-border)',
                        background: francoIniciativa === op ? 'var(--c-blue-bg)' : 'var(--c-base)',
                        color: francoIniciativa === op ? 'var(--c-blue)' : 'var(--c-text-secondary)',
                        fontWeight: francoIniciativa === op ? 500 : 400,
                      }}>
                        {op.charAt(0).toUpperCase() + op.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Observación</label>
                  <input value={francoObservacion} onChange={e => setFrancoObservacion(e.target.value)} placeholder="Opcional..." style={inputStyle} />
                </div>
                {error && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{error}</p>}
              </div>
            )}

            {modal === 'acuerdo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Fecha inicio *</label>
                    <input type="date" value={acuerdoFechaInicio} onChange={e => setAcuerdoFechaInicio(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fecha fin (opcional)</label>
                    <input type="date" value={acuerdoFechaFin} onChange={e => setAcuerdoFechaFin(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Modalidad</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {([['hereda_empresa', 'Config. empresa'], ['nominal', 'Nominal'], ['proporcional', 'Proporcional']] as [string, string][]).map(([val, label]) => (
                      <button key={val} onClick={() => setAcuerdoModalidad(val as typeof acuerdoModalidad)} style={{
                        flex: 1, padding: '7px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
                        border: acuerdoModalidad === val ? '1.5px solid var(--c-blue)' : '0.5px solid var(--c-border)',
                        background: acuerdoModalidad === val ? 'var(--c-blue-bg)' : 'var(--c-base)',
                        color: acuerdoModalidad === val ? 'var(--c-blue)' : 'var(--c-text-secondary)',
                        fontWeight: acuerdoModalidad === val ? 500 : 400,
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {acuerdoModalidad === 'hereda_empresa' && (
                    <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginTop: '6px' }}>
                      Modalidad empresa: <strong>{configEmpresa?.modalidad ?? 'nominal (default)'}</strong>
                    </p>
                  )}
                  {acuerdoModalidad === 'proporcional' && (
                    <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginTop: '6px' }}>
                      1h al 50% acredita 1.5h · 1h al 100% acredita 2h
                    </p>
                  )}
                  {acuerdoModalidad === 'nominal' && (
                    <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginTop: '6px' }}>
                      Las horas se acreditan sin recargo (1h al 50% = 1h en banco)
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Observación</label>
                  <input value={acuerdoObservacion} onChange={e => setAcuerdoObservacion(e.target.value)} placeholder="Opcional..." style={inputStyle} />
                </div>
                {error && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{error}</p>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setModal(null)} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={modal === 'franco' ? guardarFranco : guardarAcuerdo} disabled={loading} style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabecera: saldo + estado acuerdo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Saldo */}
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '20px' }}>
          <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Saldo actual</p>
          <span style={{ fontSize: '32px', fontWeight: 600, color: saldo >= 0 ? 'var(--c-green)' : 'var(--c-red)' }}>
            {saldo >= 0 ? '+' : ''}{saldo.toFixed(1)}h
          </span>
          <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 2px' }}>Acreditadas</p>
              <span style={{ fontSize: '13px', color: 'var(--c-green)', fontWeight: 500 }}>
                +{movimientos.filter(m => m.tipo === 'acreditacion').reduce((a, m) => a + getHorasBanco(m), 0).toFixed(1)}h
              </span>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 2px' }}>Descontadas</p>
              <span style={{ fontSize: '13px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>
                -{movimientos.filter(m => m.tipo === 'descuento').reduce((a, m) => a + getHorasBanco(m), 0).toFixed(1)}h
              </span>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 2px' }}>Modalidad</p>
              <span style={{ fontSize: '13px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>
                {modalidadEfectiva}
              </span>
            </div>
          </div>
        </div>

        {/* Estado acuerdo */}
        <div style={{ background: 'var(--c-surface)', border: `0.5px solid ${acuerdo ? 'var(--c-green)' : 'var(--c-border)'}`, borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Acuerdo</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {acuerdo && (
                <button onClick={desactivarAcuerdo} disabled={loading} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}>
                  Desactivar
                </button>
              )}
              <button onClick={abrirAcuerdo} style={{ background: 'var(--c-blue-bg)', border: '0.5px solid var(--c-blue)', color: 'var(--c-blue)', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', cursor: 'pointer' }}>
                {acuerdo ? 'Editar' : 'Activar'}
              </button>
            </div>
          </div>
          {acuerdo ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <CheckCircle size={14} color="var(--c-green)" />
                <span style={{ fontSize: '13px', color: 'var(--c-green)', fontWeight: 500 }}>Activo</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: '0 0 2px' }}>
                Desde {formatFecha(acuerdo.fecha_inicio)}
                {acuerdo.fecha_fin ? ` hasta ${formatFecha(acuerdo.fecha_fin)}` : ' (sin vencimiento)'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: 0 }}>
                Modalidad: {acuerdo.modalidad === 'hereda_empresa' ? `empresa (${modalidadEfectiva})` : acuerdo.modalidad}
              </p>
            </>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', margin: 0 }}>Sin acuerdo activo</p>
          )}
          {configEmpresa && (
            <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '10px 0 0', paddingTop: '8px', borderTop: '0.5px solid var(--c-elevated)' }}>
              Topes empresa: {configEmpresa.tope_mensual_horas}h/mes · {configEmpresa.tope_anual_horas}h/año
              {configEmpresa.tope_acumulado_banco ? ` · máx acum. ${configEmpresa.tope_acumulado_banco}h` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Historial */}
      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' as const }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>Movimientos</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '12px' }} title="Desde" />
            <span style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>—</span>
            <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '12px' }} title="Hasta" />
            {saldo > 0 && (
              <button onClick={abrirFranco} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(224,123,57,0.12)', color: '#e07b39', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                <Plus size={13} />
                Registrar franco
              </button>
            )}
          </div>
        </div>

        {movimientosFiltrados.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>
            Sin movimientos{filtroDesde || filtroHasta ? ' en el período seleccionado' : ''}.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 20px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Concepto</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Hs reales</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Hs banco</th>
                <th style={{ textAlign: 'right', padding: '10px 20px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Saldo</th>
                <th style={{ padding: '10px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.map((m, i) => {
                const hsReal = m.horas_reales ?? m.horas ?? 0
                const hsBanco = m.horas_banco ?? m.horas ?? 0
                const esPositivo = m.tipo === 'acreditacion' || m.tipo === 'ajuste_manual'
                return (
                  <tr key={m.id} style={{ borderBottom: i < movimientosFiltrados.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                    <td style={{ padding: '10px 20px', color: 'var(--c-text-secondary)' }}>{formatFecha(m.fecha)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: TIPO_COLORS[m.tipo] ?? 'var(--c-text-secondary)' }}>
                        {esPositivo ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {TIPO_LABELS[m.tipo] ?? m.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--c-text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {m.concepto || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--c-text-secondary)' }}>
                      {hsReal.toFixed(1)}h
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500, color: TIPO_COLORS[m.tipo] ?? 'var(--c-text-secondary)' }}>
                      {esPositivo ? '+' : '−'}{hsBanco.toFixed(1)}h
                    </td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', color: 'var(--c-text-muted)' }}>
                      {m.saldo_resultante != null ? `${m.saldo_resultante.toFixed(1)}h` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {m.origen !== 'novedad_diaria' && (
                        <button onClick={() => eliminarMovimiento(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-red)', padding: '2px 6px' }}>
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
