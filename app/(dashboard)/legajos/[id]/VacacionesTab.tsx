"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { X, Plus, Trash2 } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'
import { traducirError } from '@/lib/errores'
import { calcularDiasCorridos, calcularDiasHabiles } from '@/lib/vacaciones'

type TipoDias = 'corridos' | 'habiles'

type Movimiento = {
  id: number
  tipo: 'acreditacion_anual' | 'consumo' | 'saldo_inicial' | 'vacaciones_no_gozadas' | 'ajuste'
  año_correspondiente: number
  fecha_movimiento: string
  dias: number
  observacion?: string | null
  periodo_vacacional_id?: number | null
  vacaciones_periodo?: { fecha_desde: string; fecha_hasta: string } | null
}

type Props = {
  idLegajo: number
  idEmpresa: number
  movimientos: Movimiento[]
  metodoNombre: string
  tipoDias: TipoDias
  feriados: string[]
}

function labelMovimiento(m: Movimiento): string {
  switch (m.tipo) {
    case 'acreditacion_anual':    return `Acreditación ${m.año_correspondiente}`
    case 'consumo':
      if (m.vacaciones_periodo) {
        return `Período ${formatFecha(m.vacaciones_periodo.fecha_desde)} al ${formatFecha(m.vacaciones_periodo.fecha_hasta)}`
      }
      return 'Consumo'
    case 'saldo_inicial':         return 'Saldo inicial'
    case 'vacaciones_no_gozadas': return 'Vacaciones no gozadas (egreso)'
    case 'ajuste':                return 'Ajuste manual'
  }
}

function colorTipo(tipo: Movimiento['tipo'], dias: number): string {
  if (tipo === 'consumo' || tipo === 'vacaciones_no_gozadas') return 'var(--c-red)'
  if (dias > 0) return 'var(--c-green)'
  if (dias < 0) return 'var(--c-red)'
  return 'var(--c-text-muted)'
}

export default function VacacionesTab({
  idLegajo, idEmpresa, movimientos, metodoNombre, tipoDias, feriados,
}: Props) {
  const router = useRouter()

  // Filtro por año
  const anosDisponibles = Array.from(new Set(movimientos.map(m => m.año_correspondiente))).sort((a, b) => b - a)
  const [anoFiltro, setAnoFiltro] = useState<number | 'todos'>('todos')

  const movimientosFiltrados = anoFiltro === 'todos'
    ? movimientos
    : movimientos.filter(m => m.año_correspondiente === anoFiltro)

  // Tarjetas (acreditado/consumido por filtro, saldo siempre global)
  const acreditado = movimientosFiltrados.filter(m => m.dias > 0).reduce((s, m) => s + m.dias, 0)
  const consumido   = movimientosFiltrados.filter(m => m.dias < 0).reduce((s, m) => s + Math.abs(m.dias), 0)
  const saldoGlobal = movimientos.reduce((s, m) => s + m.dias, 0)

  // --- Modal: Registrar período ---
  const [modalPeriodo, setModalPeriodo] = useState(false)
  const [pDesde, setPDesde] = useState('')
  const [pHasta, setPHasta] = useState('')
  const [pAno, setPAno] = useState<string>('')
  const [pObs, setPObs] = useState('')
  const [pLoading, setPLoading] = useState(false)
  const [pError, setPError] = useState('')

  function diasPeriodo(): number {
    if (!pDesde || !pHasta || pHasta < pDesde) return 0
    if (tipoDias === 'habiles') return calcularDiasHabiles(pDesde, pHasta, feriados)
    return calcularDiasCorridos(pDesde, pHasta)
  }

  function abrirModalPeriodo() {
    setPDesde(''); setPHasta(''); setPAno(''); setPObs(''); setPError('')
    setModalPeriodo(true)
  }

  async function guardarPeriodo() {
    if (!pDesde || !pHasta) { setPError('Completá las fechas.'); return }
    if (pHasta < pDesde) { setPError('La fecha hasta no puede ser anterior a la desde.'); return }
    if (!pAno) { setPError('Seleccioná el año al que corresponde.'); return }
    const dias = diasPeriodo()
    if (dias <= 0) { setPError('El período no tiene días válidos.'); return }

    setPLoading(true); setPError('')
    const supabase = createClient()

    // 1. Insertar en vacaciones_periodo
    const { data: periodo, error: err1 } = await supabase
      .from('vacaciones_periodo')
      .insert({ id_legajo: idLegajo, id_empresa: idEmpresa, fecha_desde: pDesde, fecha_hasta: pHasta, año_correspondiente: parseInt(pAno), observacion: pObs || null })
      .select('id')
      .single()

    if (err1 || !periodo) { setPError(traducirError(err1?.message || 'Error al guardar período')); setPLoading(false); return }

    // 2. Crear movimiento consumo
    const { error: err2 } = await supabase
      .from('vacaciones_cuenta_corriente')
      .insert({
        legajo_id: idLegajo,
        empresa_id: idEmpresa,
        tipo: 'consumo',
        año_correspondiente: parseInt(pAno),
        fecha_movimiento: pDesde,
        dias: -dias,
        periodo_vacacional_id: periodo.id,
        observacion: pObs || null,
      })

    if (err2) { setPError(traducirError(err2.message)); setPLoading(false); return }

    router.refresh()
    setModalPeriodo(false)
    setPLoading(false)
  }

  // --- Modal: Ajuste manual ---
  const [modalAjuste, setModalAjuste] = useState(false)
  const [aAno, setAAno] = useState<string>('')
  const [aDias, setADias] = useState('')
  const [aObs, setAObs] = useState('')
  const [aLoading, setALoading] = useState(false)
  const [aError, setAError] = useState('')

  function abrirModalAjuste() {
    setAAno(''); setADias(''); setAObs(''); setAError('')
    setModalAjuste(true)
  }

  async function guardarAjuste() {
    if (!aAno) { setAError('Seleccioná el año.'); return }
    if (aDias === '' || isNaN(parseFloat(aDias))) { setAError('Ingresá los días (puede ser negativo).'); return }
    if (!aObs.trim()) { setAError('La observación es obligatoria para ajustes.'); return }

    setALoading(true); setAError('')
    const supabase = createClient()

    const { error } = await supabase
      .from('vacaciones_cuenta_corriente')
      .insert({
        legajo_id: idLegajo,
        empresa_id: idEmpresa,
        tipo: 'ajuste',
        año_correspondiente: parseInt(aAno),
        fecha_movimiento: new Date().toISOString().split('T')[0],
        dias: parseFloat(aDias),
        observacion: aObs.trim(),
      })

    if (error) { setAError(traducirError(error.message)); setALoading(false); return }

    router.refresh()
    setModalAjuste(false)
    setALoading(false)
  }

  // --- Eliminar movimiento ---
  async function eliminarMovimiento(m: Movimiento) {
    if (!confirm(`¿Eliminar este movimiento (${labelMovimiento(m)}, ${m.dias > 0 ? '+' : ''}${m.dias} días)?`)) return
    const supabase = createClient()

    const { error } = await supabase.from('vacaciones_cuenta_corriente').delete().eq('id', m.id)
    if (error) { alert(traducirError(error.message)); return }

    if (m.tipo === 'consumo' && m.periodo_vacacional_id) {
      await supabase.from('vacaciones_periodo').delete().eq('id', m.periodo_vacacional_id)
    }

    router.refresh()
  }

  // Años para los selects: unión de años con movimientos + rango actual
  const anoActual = new Date().getFullYear()
  const anosSelect = Array.from(new Set([
    ...anosDisponibles,
    anoActual - 1, anoActual, anoActual + 1,
  ])).sort((a, b) => b - a)

  return (
    <>
      {/* Modal: Registrar período */}
      {modalPeriodo && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>Registrar período vacacional</h2>
              <button onClick={() => setModalPeriodo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Desde *</label>
                  <input type="date" value={pDesde} onChange={e => setPDesde(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hasta *</label>
                  <input type="date" value={pHasta} onChange={e => setPHasta(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {pDesde && pHasta && pHasta >= pDesde && (
                <p style={{ fontSize: '12px', color: 'var(--c-blue)', margin: 0 }}>
                  {diasPeriodo()} día{diasPeriodo() !== 1 ? 's' : ''} {tipoDias === 'habiles' ? 'hábiles' : 'corridos'}
                </p>
              )}

              <div>
                <label style={labelStyle}>Año al que corresponde *</label>
                <select value={pAno} onChange={e => setPAno(e.target.value)} style={inputStyle}>
                  <option value="">Seleccioná un año</option>
                  {anosSelect.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Observación</label>
                <textarea value={pObs} onChange={e => setPObs(e.target.value)} placeholder="Opcional..." rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>

              {pError && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{pError}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setModalPeriodo(false)} style={btnSecundario}>Cancelar</button>
              <button onClick={guardarPeriodo} disabled={pLoading} style={{ ...btnPrimario, opacity: pLoading ? 0.6 : 1 }}>
                {pLoading ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajuste manual */}
      {modalAjuste && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>Ajuste manual</h2>
              <button onClick={() => setModalAjuste(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Año correspondiente *</label>
                  <select value={aAno} onChange={e => setAAno(e.target.value)} style={inputStyle}>
                    <option value="">Seleccioná</option>
                    {anosSelect.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Días *</label>
                  <input type="number" step="0.5" value={aDias} onChange={e => setADias(e.target.value)} placeholder="+ o −" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Observación *</label>
                <textarea value={aObs} onChange={e => setAObs(e.target.value)} placeholder="Requerida para auditoría..." rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
              {aError && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{aError}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setModalAjuste(false)} style={btnSecundario}>Cancelar</button>
              <button onClick={guardarAjuste} disabled={aLoading} style={{ ...btnPrimario, opacity: aLoading ? 0.6 : 1 }}>
                {aLoading ? 'Guardando...' : 'Guardar ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>
              Cuenta corriente de vacaciones
            </p>
            <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: 0 }}>
              {metodoNombre} — días {tipoDias === 'habiles' ? 'hábiles' : 'corridos'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Filtro año */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setAnoFiltro('todos')}
                style={{ ...btnFiltro, background: anoFiltro === 'todos' ? 'var(--c-blue-bg)' : 'transparent', color: anoFiltro === 'todos' ? 'var(--c-blue)' : 'var(--c-text-secondary)', border: `0.5px solid ${anoFiltro === 'todos' ? 'var(--c-blue)40' : 'var(--c-border)'}` }}
              >Todos</button>
              {anosDisponibles.map(a => (
                <button
                  key={a}
                  onClick={() => setAnoFiltro(a)}
                  style={{ ...btnFiltro, background: anoFiltro === a ? 'var(--c-blue-bg)' : 'transparent', color: anoFiltro === a ? 'var(--c-blue)' : 'var(--c-text-secondary)', border: `0.5px solid ${anoFiltro === a ? 'var(--c-blue)40' : 'var(--c-border)'}` }}
                >{a}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '14px 16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Acreditado{anoFiltro !== 'todos' ? ` ${anoFiltro}` : ''}
          </p>
          <p style={{ fontSize: '22px', fontWeight: 600, color: 'var(--c-green)', margin: 0 }}>+{acreditado}</p>
          <p style={{ fontSize: '11px', color: 'var(--c-text-secondary)', margin: '2px 0 0' }}>días</p>
        </div>
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '14px 16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Consumido{anoFiltro !== 'todos' ? ` ${anoFiltro}` : ''}
          </p>
          <p style={{ fontSize: '22px', fontWeight: 600, color: 'var(--c-red)', margin: 0 }}>−{consumido}</p>
          <p style={{ fontSize: '11px', color: 'var(--c-text-secondary)', margin: '2px 0 0' }}>días</p>
        </div>
        <div style={{ background: saldoGlobal >= 0 ? 'var(--c-green-bg)' : 'var(--c-red-bg)', border: `0.5px solid ${saldoGlobal >= 0 ? 'var(--c-green)40' : 'var(--c-red)40'}`, borderRadius: '8px', padding: '14px 16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo actual</p>
          <p style={{ fontSize: '22px', fontWeight: 600, color: saldoGlobal >= 0 ? 'var(--c-green)' : 'var(--c-red)', margin: 0 }}>{saldoGlobal}</p>
          <p style={{ fontSize: '11px', color: 'var(--c-text-secondary)', margin: '2px 0 0' }}>días disponibles</p>
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
        <button onClick={abrirModalAjuste} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
          <Plus size={14} /> Ajuste manual
        </button>
        <button onClick={abrirModalPeriodo} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
          <Plus size={14} /> Registrar período vacacional
        </button>
      </div>

      {/* Tabla de movimientos */}
      {movimientosFiltrados.length === 0 ? (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          No hay movimientos{anoFiltro !== 'todos' ? ` para ${anoFiltro}` : ''}.
        </div>
      ) : (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--c-base)', borderBottom: '0.5px solid var(--c-border)' }}>
                {['Fecha', 'Tipo', 'Año', 'Días', 'Observación', ''].map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500, fontSize: '12px' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < movimientosFiltrados.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)', whiteSpace: 'nowrap' as const }}>{formatFecha(m.fecha_movimiento)}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)', fontWeight: 500 }}>{labelMovimiento(m)}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{m.año_correspondiente}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: colorTipo(m.tipo, m.dias) }}>
                    {m.dias > 0 ? `+${m.dias}` : m.dias}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)', fontSize: '12px' }}>{m.observacion || '—'}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => eliminarMovimiento(m)} title="Eliminar movimiento" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-muted)', padding: '2px 4px', lineHeight: 1 }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const inputStyle = {
  width: '100%', padding: '7px 10px', borderRadius: '6px',
  background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
  color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
}
const labelStyle = {
  fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px',
}
const btnPrimario = {
  background: 'var(--c-blue-btn)', color: 'white', border: 'none',
  borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
}
const btnSecundario = {
  background: 'transparent', border: '0.5px solid var(--c-border)',
  color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px',
  fontSize: '13px', cursor: 'pointer',
}
const btnFiltro = {
  borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
}
