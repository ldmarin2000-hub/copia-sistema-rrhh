"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEmpresa } from '../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'
import { createClient } from '@/lib/supabase-browser'
import { traducirError } from '@/lib/errores'
import { X, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import {
  calcularDiasVacaciones,
  calcularAniosEfectivos,
  formatAntigüedad,
  TramoVacaciones,
} from '@/lib/vacaciones'

type Vacacion = {
  id: number
  id_legajo: number
  fecha_desde: string
  fecha_hasta: string
  año_correspondiente?: number | null
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

type FilaProceso = {
  idLegajo: number
  nroLegajo: number
  apellido: string
  nombre: string
  fechaBase: string
  antiguedad: string
  diasCalculados: number
  diasAcreditar: number
  yaProcessado: boolean
  metodoNombre: string
}

export default function VacacionesGeneralClient({
  vacaciones, legajos
}: {
  vacaciones: Vacacion[]
  legajos: Legajo[]
}) {
  const { empresaActiva, rol, obrasJefe } = useEmpresa()
  const router = useRouter()
  const [filtroLegajo, setFiltroLegajo] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoVac, setEditandoVac] = useState<Vacacion | null>(null)
  const [formIdLegajo, setFormIdLegajo] = useState('')
  const [formDesde, setFormDesde] = useState('')
  const [formHasta, setFormHasta] = useState('')
  const [formAno, setFormAno] = useState(String(new Date().getFullYear()))
  const [formObs, setFormObs] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // --- Proceso masivo anual ---
  const [mostrarProceso, setMostrarProceso] = useState(false)
  const anoActual = new Date().getFullYear()
  const [procesoAno, setProcesoAno] = useState(String(anoActual - 1))
  const [procesoFilas, setProcesoFilas] = useState<FilaProceso[]>([])
  const [procesoCargando, setProcesoCargando] = useState(false)
  const [procesoError, setProcesoError] = useState('')
  const [procesoConfirmando, setProcesoConfirmando] = useState(false)
  const [procesoCalculado, setProcesoCalculado] = useState(false)

  const selectStyle = {
    padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px',
  }

  const inputStyle = {
    padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px',
    width: '100%', boxSizing: 'border-box' as const,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px',
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

  const hoy = new Date().toISOString().split('T')[0]
  const enVacacionesHoy = vacacionesFiltradas.filter(
    v => v.fecha_desde <= hoy && v.fecha_hasta >= hoy
  ).length

  function abrirNuevo() {
    setEditandoVac(null)
    setFormIdLegajo(''); setFormDesde(''); setFormHasta('')
    setFormAno(String(anoActual)); setFormObs(''); setFormError('')
    setMostrarForm(true)
  }

  function abrirEditar(v: Vacacion) {
    setEditandoVac(v)
    setFormIdLegajo(String(v.id_legajo))
    setFormDesde(v.fecha_desde); setFormHasta(v.fecha_hasta)
    setFormAno(String(v.año_correspondiente ?? anoActual))
    setFormObs(v.observacion || ''); setFormError('')
    setMostrarForm(true)
  }

  function cerrarForm() { setMostrarForm(false); setEditandoVac(null) }

  function getDias(): number {
    if (!formDesde || !formHasta) return 0
    const desde = new Date(formDesde + 'T12:00:00')
    const hasta = new Date(formHasta + 'T12:00:00')
    const diff = Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }

  async function guardar() {
    if (!formIdLegajo || !formDesde || !formHasta) { setFormError('Completá todos los campos obligatorios.'); return }
    if (formHasta < formDesde) { setFormError('La fecha hasta no puede ser menor a la fecha desde.'); return }
    if (!formAno) { setFormError('Seleccioná el año al que corresponde.'); return }
    setFormLoading(true); setFormError('')
    const supabase = createClient()
    const legajo = legajosFiltrados.find(l => l.id === parseInt(formIdLegajo))
    if (!legajo) { setFormError('Legajo no encontrado.'); setFormLoading(false); return }

    const ano = parseInt(formAno)
    const datos = { fecha_desde: formDesde, fecha_hasta: formHasta, año_correspondiente: ano, observacion: formObs || null }

    if (editandoVac) {
      const { error } = await supabase.from('vacaciones_periodo').update(datos).eq('id', editandoVac.id)
      if (error) { setFormError(traducirError(error.message)); setFormLoading(false); return }
    } else {
      const { data: periodo, error } = await supabase
        .from('vacaciones_periodo')
        .insert({ ...datos, id_empresa: legajo.id_empresa, id_legajo: legajo.id })
        .select('id').single()
      if (error || !periodo) { setFormError(traducirError(error?.message || 'Error al guardar')); setFormLoading(false); return }

      // Crear movimiento consumo en cuenta corriente
      const dias = getDias()
      await supabase.from('vacaciones_cuenta_corriente').insert({
        legajo_id: legajo.id,
        empresa_id: legajo.id_empresa,
        tipo: 'consumo',
        año_correspondiente: ano,
        fecha_movimiento: formDesde,
        dias: -dias,
        periodo_vacacional_id: periodo.id,
        observacion: formObs || null,
      })
    }

    router.refresh(); cerrarForm(); setFormLoading(false)
  }

  async function eliminar(v: Vacacion) {
    if (!confirm(`¿Eliminar vacación del ${formatFecha(v.fecha_desde)} al ${formatFecha(v.fecha_hasta)}?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('vacaciones_periodo').delete().eq('id', v.id)
    if (error) alert(traducirError(error.message))
    else router.refresh()
  }

  // --- Proceso masivo ---
  async function calcularProceso() {
    if (!empresaActiva) return
    const ano = parseInt(procesoAno)
    const fechaRef = `${ano}-12-31`

    setProcesoCargando(true); setProcesoError(''); setProcesoFilas([]); setProcesoCalculado(false)
    const supabase = createClient()

    const [
      { data: legajosData, error: errLeg },
      { data: metodosData, error: errMet },
      { data: acreditaciones, error: errAcr },
    ] = await Promise.all([
      supabase.from('legajos')
        .select('id, nro_legajo, apellido, nombre, fecha_ingreso, fecha_reconocida, id_metodo_vacaciones, categorias(convenios(id_metodo_vacaciones))')
        .eq('id_empresa', empresaActiva.id)
        .eq('estado', 'Activo')
        .lte('fecha_ingreso', fechaRef)
        .order('apellido'),
      supabase.from('metodos_vacaciones')
        .select('id, nombre, metodos_vacaciones_tramos(anios_desde, anios_hasta, dias)')
        .or(`id_empresa.eq.${empresaActiva.id},id_empresa.is.null`),
      supabase.from('vacaciones_cuenta_corriente')
        .select('legajo_id')
        .eq('empresa_id', empresaActiva.id)
        .eq('tipo', 'acreditacion_anual')
        .eq('año_correspondiente', ano),
    ])

    if (errLeg || errMet || errAcr) {
      setProcesoError('Error al cargar datos. Intentá de nuevo.')
      setProcesoCargando(false); return
    }

    const acreditadosIds = new Set((acreditaciones || []).map((a: any) => a.legajo_id))
    const metodosMap = new Map((metodosData || []).map((m: any) => [m.id, m]))

    const filas: FilaProceso[] = []
    for (const leg of (legajosData || [])) {
      const idMetodo = (leg as any).id_metodo_vacaciones
        ?? (leg as any).categorias?.convenios?.id_metodo_vacaciones
        ?? null
      const metodo = idMetodo ? metodosMap.get(idMetodo) : null
      const tramos: TramoVacaciones[] = metodo?.metodos_vacaciones_tramos || []
      const fechaBase: string = (leg as any).fecha_reconocida ?? leg.fecha_ingreso

      let diasCalculados = 0
      let antiguedad = '—'
      if (tramos.length > 0) {
        diasCalculados = calcularDiasVacaciones(fechaBase, fechaRef, tramos)
        antiguedad = formatAntigüedad(fechaBase, fechaRef)
      }

      filas.push({
        idLegajo: leg.id,
        nroLegajo: leg.nro_legajo,
        apellido: leg.apellido,
        nombre: leg.nombre,
        fechaBase,
        antiguedad,
        diasCalculados,
        diasAcreditar: diasCalculados,
        yaProcessado: acreditadosIds.has(leg.id),
        metodoNombre: metodo?.nombre || '(sin método)',
      })
    }

    setProcesoFilas(filas)
    setProcesoCargando(false)
    setProcesoCalculado(true)
  }

  function actualizarDiasAcreditar(idLegajo: number, valor: string) {
    setProcesoFilas(prev => prev.map(f =>
      f.idLegajo === idLegajo ? { ...f, diasAcreditar: parseFloat(valor) || 0 } : f
    ))
  }

  async function confirmarProceso() {
    if (!empresaActiva) return
    const ano = parseInt(procesoAno)
    const pendientes = procesoFilas.filter(f => !f.yaProcessado && f.diasAcreditar > 0)
    if (pendientes.length === 0) { setProcesoError('No hay legajos pendientes para acreditar.'); return }

    setProcesoConfirmando(true); setProcesoError('')
    const supabase = createClient()

    const rows = pendientes.map(f => ({
      legajo_id: f.idLegajo,
      empresa_id: empresaActiva.id,
      tipo: 'acreditacion_anual',
      año_correspondiente: ano,
      fecha_movimiento: `${ano}-12-31`,
      dias: f.diasAcreditar,
      observacion: `Acreditación anual ${ano}`,
    }))

    const { error } = await supabase.from('vacaciones_cuenta_corriente').insert(rows)
    if (error) { setProcesoError(traducirError(error.message)); setProcesoConfirmando(false); return }

    router.refresh()
    setMostrarProceso(false)
    setProcesoFilas([])
    setProcesoCalculado(false)
    setProcesoConfirmando(false)
  }

  if (!empresaActiva) {
    return <div style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  const pendientesProceso = procesoFilas.filter(f => !f.yaProcessado && f.diasAcreditar > 0).length
  const yaProcessadosProceso = procesoFilas.filter(f => f.yaProcessado).length

  return (
    <div>
      {/* Modal período */}
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                {editandoVac ? 'Editar vacación' : 'Nueva vacación'}
              </h2>
              <button onClick={cerrarForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!editandoVac && (
                <div>
                  <label style={labelStyle}>Empleado *</label>
                  <select value={formIdLegajo} onChange={e => setFormIdLegajo(e.target.value)} style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' as const }}>
                    <option value="">Seleccionar...</option>
                    {legajosFiltrados.map(l => (
                      <option key={l.id} value={l.id}>{l.apellido}, {l.nombre} — Leg. {l.nro_legajo}</option>
                    ))}
                  </select>
                </div>
              )}
              {editandoVac && (
                <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', margin: 0 }}>
                  {editandoVac.legajos.apellido}, {editandoVac.legajos.nombre}
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Desde *</label>
                  <input type="date" value={formDesde} onChange={e => setFormDesde(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hasta *</label>
                  <input type="date" value={formHasta} onChange={e => setFormHasta(e.target.value)} style={inputStyle} />
                </div>
              </div>
              {formDesde && formHasta && getDias() > 0 && (
                <p style={{ fontSize: '12px', color: 'var(--c-blue)', margin: 0 }}>{getDias()} día{getDias() !== 1 ? 's' : ''}</p>
              )}
              <div>
                <label style={labelStyle}>Año al que corresponde *</label>
                <select value={formAno} onChange={e => setFormAno(e.target.value)} style={{ ...inputStyle }}>
                  {[anoActual - 2, anoActual - 1, anoActual, anoActual + 1].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Observación</label>
                <textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
              {formError && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{formError}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrarForm} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} disabled={formLoading} style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: formLoading ? 0.6 : 1 }}>
                {formLoading ? 'Guardando...' : editandoVac ? 'Guardar cambios' : 'Registrar vacación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>Vacaciones</h1>
          <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
            {empresaActiva.razon_social} · {vacacionesFiltradas.length} registro{vacacionesFiltradas.length !== 1 ? 's' : ''}
            {enVacacionesHoy > 0 && <span style={{ marginLeft: '8px', color: 'var(--c-blue)' }}>· {enVacacionesHoy} en vacaciones hoy</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setMostrarProceso(!mostrarProceso); setProcesoCalculado(false); setProcesoFilas([]) }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: mostrarProceso ? 'var(--c-green-bg)' : 'transparent', border: `0.5px solid ${mostrarProceso ? 'var(--c-green)40' : 'var(--c-border)'}`, color: mostrarProceso ? 'var(--c-green)' : 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}
          >
            {mostrarProceso ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Proceso masivo anual
          </button>
          <button onClick={abrirNuevo} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
            <Plus size={14} /> Nueva vacación
          </button>
        </div>
      </div>

      {/* Panel proceso masivo */}
      {mostrarProceso && (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 4px' }}>Acreditación anual de vacaciones</p>
          <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: '0 0 16px' }}>
            Calculá y acreditá los días de vacaciones que corresponden a cada legajo activo para el año seleccionado. Podés editar los días antes de confirmar.
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Año</label>
              <select value={procesoAno} onChange={e => { setProcesoAno(e.target.value); setProcesoCalculado(false); setProcesoFilas([]) }} style={selectStyle}>
                {[anoActual - 2, anoActual - 1, anoActual].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <button
              onClick={calcularProceso}
              disabled={procesoCargando}
              style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 18px', fontSize: '13px', cursor: 'pointer', opacity: procesoCargando ? 0.6 : 1 }}
            >
              {procesoCargando ? 'Calculando...' : 'Calcular'}
            </button>
          </div>

          {procesoError && <p style={{ color: 'var(--c-red)', fontSize: '12px', marginBottom: '12px' }}>{procesoError}</p>}

          {procesoCalculado && procesoFilas.length === 0 && (
            <p style={{ color: 'var(--c-text-secondary)', fontSize: '13px' }}>No hay legajos activos para calcular.</p>
          )}

          {procesoCalculado && procesoFilas.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: '12px', background: 'var(--c-elevated)', borderRadius: '5px', padding: '4px 10px', color: 'var(--c-text-secondary)' }}>
                  {procesoFilas.length} legajos
                </span>
                {pendientesProceso > 0 && (
                  <span style={{ fontSize: '12px', background: 'var(--c-blue-bg)', borderRadius: '5px', padding: '4px 10px', color: 'var(--c-blue)' }}>
                    {pendientesProceso} a acreditar
                  </span>
                )}
                {yaProcessadosProceso > 0 && (
                  <span style={{ fontSize: '12px', background: 'var(--c-green-bg)', borderRadius: '5px', padding: '4px 10px', color: 'var(--c-green)' }}>
                    {yaProcessadosProceso} ya procesados
                  </span>
                )}
              </div>

              <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--c-base)', borderBottom: '0.5px solid var(--c-border)' }}>
                      {['Legajo', 'Empleado', 'Método', 'Antigüedad', 'Días calculados', 'Días a acreditar', 'Estado'].map(col => (
                        <th key={col} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {procesoFilas.map((f, i) => (
                      <tr key={f.idLegajo} style={{ borderBottom: i < procesoFilas.length - 1 ? '0.5px solid var(--c-elevated)' : 'none', opacity: f.yaProcessado ? 0.6 : 1 }}>
                        <td style={{ padding: '8px 12px', color: 'var(--c-text-muted)' }}>#{String(f.nroLegajo).padStart(4, '0')}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--c-text-primary)', fontWeight: 500 }}>{f.apellido}, {f.nombre}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--c-text-secondary)' }}>{f.metodoNombre}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--c-text-secondary)' }}>{f.antiguedad}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--c-blue)', fontWeight: 500 }}>{f.diasCalculados}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {f.yaProcessado ? (
                            <span style={{ color: 'var(--c-text-muted)' }}>—</span>
                          ) : (
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={f.diasAcreditar}
                              onChange={e => actualizarDiasAcreditar(f.idLegajo, e.target.value)}
                              style={{ width: '70px', padding: '4px 8px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', borderRadius: '4px', color: 'var(--c-text-primary)', fontSize: '12px' }}
                            />
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {f.yaProcessado ? (
                            <span style={{ background: 'var(--c-green-bg)', color: 'var(--c-green)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Ya procesado</span>
                          ) : (
                            <span style={{ background: 'var(--c-blue-bg)', color: 'var(--c-blue)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Pendiente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pendientesProceso > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={confirmarProceso}
                    disabled={procesoConfirmando}
                    style={{ background: 'var(--c-green-btn, var(--c-blue-btn))', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 20px', fontSize: '13px', cursor: 'pointer', opacity: procesoConfirmando ? 0.6 : 1 }}
                  >
                    {procesoConfirmando ? 'Acreditando...' : `Confirmar acreditación (${pendientesProceso} legajo${pendientesProceso !== 1 ? 's' : ''})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '16px 20px', display: 'flex', flexWrap: 'wrap' as const, gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Empleado</label>
          <select value={filtroLegajo} onChange={(e) => setFiltroLegajo(e.target.value)} style={selectStyle}>
            <option value="">Todos</option>
            {legajosFiltrados.map(l => (
              <option key={l.id} value={l.id}>{l.apellido}, {l.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Desde</label>
          <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} style={selectStyle} />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Hasta</label>
          <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} style={selectStyle} />
        </div>
        {(filtroLegajo || filtroDesde || filtroHasta) && (
          <button
            onClick={() => { setFiltroLegajo(''); setFiltroDesde(''); setFiltroHasta('') }}
            style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla períodos */}
      {vacacionesFiltradas.length === 0 ? (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          No hay vacaciones para los filtros seleccionados.
        </div>
      ) : (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                {['Empleado', 'Desde', 'Hasta', 'Días', 'Estado', 'Observación', ''].map((col, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>{col}</th>
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
                  <tr key={v.id} style={{ borderBottom: i < vacacionesFiltradas.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: 'var(--c-text-primary)', fontWeight: 500 }}>{v.legajos.apellido}, {v.legajos.nombre}</span>
                      <span style={{ color: 'var(--c-text-muted)', fontSize: '11px', marginLeft: '6px' }}>#{String(v.legajos.nro_legajo).padStart(4, '0')}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{formatFecha(v.fecha_desde)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{formatFecha(v.fecha_hasta)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--c-blue)', fontWeight: 500 }}>{dias}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {activa
                        ? <span style={{ background: 'var(--c-green-bg)', color: 'var(--c-green)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>En curso</span>
                        : futura
                          ? <span style={{ background: 'var(--c-blue-bg)', color: 'var(--c-blue)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Próxima</span>
                          : <span style={{ background: 'var(--c-elevated)', color: 'var(--c-text-secondary)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Finalizada</span>
                      }
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{v.observacion || '—'}</td>
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' as const }}>
                      <button onClick={() => abrirEditar(v)} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginRight: '6px' }}>Editar</button>
                      <button onClick={() => eliminar(v)} style={{ background: 'transparent', border: '0.5px solid var(--c-red)33', color: 'var(--c-red)', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>Eliminar</button>
                    </td>
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
