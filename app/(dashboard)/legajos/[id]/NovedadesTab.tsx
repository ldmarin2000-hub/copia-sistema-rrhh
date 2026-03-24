"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'

type Props = {
  idLegajo: number
  idEmpresa: number
}

const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function NovedadesTab({ idLegajo, idEmpresa }: Props) {
  const hoy = new Date()
  const [mes, setMes] = useState(String(hoy.getMonth() + 1).padStart(2, '0'))
  const [anio, setAnio] = useState(String(hoy.getFullYear()))
  const [periodo, setPeriodo] = useState(hoy.getDate() <= 15 ? '1' : '2')

  const [novedades, setNovedades] = useState<any[]>([])
  const [novedadesAdicionales, setNovedadesAdicionales] = useState<any[]>([])
  const [adicionales, setAdicionales] = useState<any[]>([])
  const [ausencias, setAusencias] = useState<any[]>([])
  const [vacaciones, setVacaciones] = useState<any[]>([])
  const [feriados, setFeriados] = useState<any[]>([])
  const [plantilla, setPlantilla] = useState<Record<string, number> | null>(null)
  const [cargando, setCargando] = useState(false)

  function getRango() {
    const m = mes.padStart(2, '0')
    const ultimoDia = new Date(parseInt(anio), parseInt(mes), 0).getDate()
    if (periodo === '1') return { desde: `${anio}-${m}-01`, hasta: `${anio}-${m}-15` }
    if (periodo === '2') return { desde: `${anio}-${m}-16`, hasta: `${anio}-${m}-${ultimoDia}` }
    return { desde: `${anio}-${m}-01`, hasta: `${anio}-${m}-${ultimoDia}` }
  }

  function getDias() {
    const { desde, hasta } = getRango()
    const dias: string[] = []
    const d = new Date(desde + 'T00:00:00')
    const fin = new Date(hasta + 'T00:00:00')
    while (d <= fin) {
      dias.push(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
    return dias
  }

  const consultar = useCallback(async () => {
    setCargando(true)
    const supabase = createClient()
    const { desde, hasta } = getRango()

    const [
      { data: adicsData },
      { data: novsData },
      { data: ausData },
      { data: vacData },
      { data: ferData },
      { data: legData },
    ] = await Promise.all([
      supabase.from('adicionales').select('id, codigo, descripcion').eq('id_empresa', idEmpresa).eq('activo', true).order('descripcion'),
      supabase.from('novedades_diarias').select('*').eq('id_legajo', idLegajo).gte('fecha', desde).lte('fecha', hasta).order('fecha'),
      supabase.from('ausencias_periodo').select('*, tipos_ausencia(id, codigo, descripcion, cuenta_dias_corridos)').eq('id_legajo', idLegajo).lte('fecha_desde', hasta).gte('fecha_hasta', desde),
      supabase.from('vacaciones_periodo').select('*').eq('id_legajo', idLegajo).lte('fecha_desde', hasta).gte('fecha_hasta', desde),
      supabase.from('feriados').select('id, fecha, descripcion').eq('activo', true).gte('fecha', desde).lte('fecha', hasta),
      supabase.from('legajos').select('id_plantilla, id_categoria, categorias(id_plantilla)').eq('id', idLegajo).single(),
    ])

    setAdicionales(adicsData || [])
    setNovedades(novsData || [])
    setAusencias(ausData || [])
    setVacaciones(vacData || [])

    // Filtrar feriados donde la empresa tiene excepción "trabaja = true"
    const feriadosBase = ferData || []
    if (feriadosBase.length > 0) {
      const { data: excepciones } = await supabase
        .from('feriados_empresa')
        .select('id_feriado, trabaja')
        .eq('id_empresa', idEmpresa)
        .in('id_feriado', feriadosBase.map((f: any) => f.id))
      const trabajaIds = new Set((excepciones || []).filter((e: any) => e.trabaja).map((e: any) => e.id_feriado))
      setFeriados(feriadosBase.filter((f: any) => !trabajaIds.has(f.id)))
    } else {
      setFeriados([])
    }

    const plantillaId = legData?.id_plantilla || (legData?.categorias as any)?.id_plantilla
    if (plantillaId) {
      const { data: pData } = await supabase
        .from('plantillas_jornada')
        .select('lunes, martes, miercoles, jueves, viernes, sabado, domingo')
        .eq('id', plantillaId)
        .single()
      setPlantilla(pData || null)
    } else {
      setPlantilla(null)
    }

    if (novsData && novsData.length > 0) {
      const ids = novsData.map((n: any) => n.id)
      const { data: adicsNov } = await supabase.from('novedades_adicionales').select('*').in('id_novedad', ids)
      setNovedadesAdicionales(adicsNov || [])
    } else {
      setNovedadesAdicionales([])
    }

    setCargando(false)
  }, [mes, anio, periodo, idLegajo, idEmpresa])

  useEffect(() => { consultar() }, [consultar])

  const dias = getDias()
  const feriadosFechas = new Set(feriados.map((f: any) => f.fecha))
  const novByFecha = new Map(novedades.map((n: any) => [n.fecha, n]))

  function getAusencia(fecha: string) {
    return ausencias.find((a: any) => a.fecha_desde <= fecha && a.fecha_hasta >= fecha)
  }
  function enVacaciones(fecha: string) {
    return vacaciones.some((v: any) => v.fecha_desde <= fecha && v.fecha_hasta >= fecha)
  }

  // Plantilla: días de la semana con horas > 0 son laborales
  function esDiaLaboral(fecha: string): boolean {
    if (!plantilla) return true
    const claves = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const clave = claves[new Date(fecha + 'T00:00:00').getDay()]
    return (plantilla[clave] || 0) > 0
  }

  // Ausencia de un tipo específico para una fecha
  function getAusenciaTipo(fecha: string, idTipo: number) {
    return ausencias.find((a: any) =>
      a.tipos_ausencia?.id === idTipo && a.fecha_desde <= fecha && a.fecha_hasta >= fecha
    )
  }

  // Tipos únicos con ausencia en el período
  const tiposEnPeriodo = Array.from(
    new Map(
      ausencias
        .filter((a: any) => a.tipos_ausencia)
        .map((a: any) => [a.tipos_ausencia.id, a.tipos_ausencia])
    ).values()
  )

  // Total días por tipo (respetando cuenta_dias_corridos)
  function countDiasTipo(idTipo: number, cuentaDiasCorridos: boolean): number {
    return dias.filter(d => {
      if (!getAusenciaTipo(d, idTipo)) return false
      return cuentaDiasCorridos ? true : esDiaLaboral(d)
    }).length
  }

  // Solo mostrar adicionales que tienen al menos un valor en el período
  const adicionalesConDatos = adicionales.filter(a =>
    novedadesAdicionales.some(na => na.id_adicional === a.id)
  )

  const FILAS_HORAS = [
    { key: 'hs_normales',  label: 'Hs. Normales' },
    { key: 'hs_extra_50',  label: 'Hs. Extra 50%' },
    { key: 'hs_extra_100', label: 'Hs. Extra 100%' },
    { key: 'hs_nocturnas', label: 'Hs. Nocturnas' },
  ]

  // Total por fila de horas
  function totalHoras(key: string) {
    return novedades.reduce((sum: number, n: any) => sum + (n[key] || 0), 0)
  }

  const totalVacaciones = dias.filter(d => enVacaciones(d)).length

  // Total por adicional
  function totalAdicional(idAdicional: number) {
    return novedadesAdicionales.filter((na: any) => na.id_adicional === idAdicional).reduce((s: number, na: any) => s + na.cantidad, 0)
  }

  const hayDatos = novedades.length > 0 || ausencias.length > 0 || vacaciones.length > 0 || feriados.length > 0

  // Estilos de celda
  const thDia = (fecha: string) => {
    const dow = new Date(fecha + 'T00:00:00').getDay()
    const esFinSemana = dow === 0 || dow === 6
    const esFeriado = feriadosFechas.has(fecha)
    return {
      padding: '6px 0', textAlign: 'center' as const, fontSize: '11px',
      fontWeight: 500, minWidth: '38px', width: '38px',
      color: esFeriado ? '#d29922' : esFinSemana ? '#484f58' : '#8b949e',
      borderBottom: `2px solid ${esFeriado ? '#d2992240' : esFinSemana ? '#21262d' : '#30363d'}`,
      background: esFinSemana ? '#0a0d12' : 'transparent',
      position: 'sticky' as const, top: 0, zIndex: 1,
    }
  }

  const tdDia = (fecha: string, contenido: any, highlight?: string) => {
    const dow = new Date(fecha + 'T00:00:00').getDay()
    const esFinSemana = dow === 0 || dow === 6
    const esFeriado = feriadosFechas.has(fecha)
    return {
      padding: '5px 2px', textAlign: 'center' as const, fontSize: '12px',
      background: esFeriado ? '#3a2f1a20' : esFinSemana ? '#0a0d12' : 'transparent',
      color: highlight || (esFinSemana ? '#484f58' : '#e6edf3'),
      borderBottom: '0.5px solid #21262d',
    }
  }

  const periodoLabel = `${MESES[parseInt(mes) - 1]} ${anio}${periodo === '1' ? ' — 1ª quincena' : periodo === '2' ? ' — 2ª quincena' : ' — mes completo'}`

  return (
    <div>
      {/* Selector de período */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', background: '#0d1117', border: '0.5px solid #30363d', color: '#e6edf3', fontSize: '13px' }}>
          {MESES.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', background: '#0d1117', border: '0.5px solid #30363d', color: '#e6edf3', fontSize: '13px' }}>
          {[2023, 2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', background: '#0d1117', border: '0.5px solid #30363d', color: '#e6edf3', fontSize: '13px' }}>
          <option value="1">1ª quincena (1–15)</option>
          <option value="2">2ª quincena (16–fin)</option>
          <option value="mes">Mes completo</option>
        </select>
        {cargando && <span style={{ fontSize: '12px', color: '#8b949e' }}>Cargando...</span>}
      </div>

      {!cargando && !hayDatos && (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
          No hay novedades registradas para {periodoLabel}.
        </div>
      )}

      {!cargando && hayDatos && (
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '0.5px solid #30363d' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%', minWidth: `${140 + dias.length * 38 + 55}px` }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                {/* Columna etiqueta */}
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '12px', color: '#8b949e', fontWeight: 500, minWidth: '140px', position: 'sticky', left: 0, background: '#0d1117', zIndex: 2, borderBottom: '2px solid #30363d' }}>
                  {periodoLabel}
                </th>
                {/* Días */}
                {dias.map(fecha => {
                  const dow = new Date(fecha + 'T00:00:00').getDay()
                  const dia = fecha.slice(8)
                  const esFeriado = feriadosFechas.has(fecha)
                  const feriado = feriados.find((f: any) => f.fecha === fecha)
                  return (
                    <th key={fecha} style={thDia(fecha)} title={esFeriado ? feriado?.descripcion : undefined}>
                      <div>{DIAS_SEMANA[dow]}</div>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{parseInt(dia)}</div>
                      {esFeriado && <div style={{ fontSize: '9px', color: '#d29922' }}>F</div>}
                    </th>
                  )
                })}
                {/* Total */}
                <th style={{ padding: '10px 8px', fontSize: '12px', color: '#8b949e', fontWeight: 500, textAlign: 'center', minWidth: '55px', position: 'sticky', right: 0, background: '#0d1117', zIndex: 2, borderBottom: '2px solid #30363d', borderLeft: '0.5px solid #30363d' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Filas de horas */}
              {FILAS_HORAS.map((fila, fi) => {
                const total = totalHoras(fila.key)
                if (total === 0 && fila.key !== 'hs_normales') return null
                return (
                  <tr key={fila.key} style={{ background: fi % 2 === 0 ? 'transparent' : '#0a0d1240' }}>
                    <td style={{ padding: '7px 14px', color: '#8b949e', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: fi % 2 === 0 ? '#161b22' : '#0f131a', zIndex: 1, borderBottom: '0.5px solid #21262d' }}>
                      {fila.label}
                    </td>
                    {dias.map(fecha => {
                      const nov = novByFecha.get(fecha)
                      const val = nov?.[fila.key] || 0
                      const ausencia = getAusencia(fecha)
                      const vac = enVacaciones(fecha)
                      const celda = ausencia ? null : vac ? null : val > 0 ? val : null
                      return (
                        <td key={fecha} style={tdDia(fecha, celda, fila.key !== 'hs_normales' && val > 0 ? '#58a6ff' : undefined)}>
                          {celda !== null ? celda : <span style={{ color: '#21262d' }}>—</span>}
                        </td>
                      )
                    })}
                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: total > 0 ? '#e6edf3' : '#484f58', fontSize: '13px', borderBottom: '0.5px solid #21262d', borderLeft: '0.5px solid #30363d', position: 'sticky', right: 0, background: fi % 2 === 0 ? '#161b22' : '#0f131a' }}>
                      {total > 0 ? total : '—'}
                    </td>
                  </tr>
                )
              })}

              {/* Filas de adicionales */}
              {adicionalesConDatos.map((adic, ai) => {
                const total = totalAdicional(adic.id)
                return (
                  <tr key={adic.id} style={{ background: '#1a2a3a20' }}>
                    <td style={{ padding: '7px 14px', color: '#58a6ff', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: '#0d1420', zIndex: 1, borderBottom: '0.5px solid #21262d' }}>
                      {adic.descripcion}
                    </td>
                    {dias.map(fecha => {
                      const nov = novByFecha.get(fecha)
                      const adicsNov = nov ? novedadesAdicionales.filter((na: any) => na.id_novedad === nov.id && na.id_adicional === adic.id) : []
                      const val = adicsNov.reduce((s: number, na: any) => s + na.cantidad, 0)
                      return (
                        <td key={fecha} style={{ ...tdDia(fecha, val > 0 ? val : null, '#58a6ff'), background: '#0d1420' }}>
                          {val > 0 ? <span style={{ color: '#58a6ff' }}>{val}</span> : <span style={{ color: '#21262d' }}>—</span>}
                        </td>
                      )
                    })}
                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#58a6ff', fontSize: '13px', borderBottom: '0.5px solid #21262d', borderLeft: '0.5px solid #30363d', position: 'sticky', right: 0, background: '#0d1420' }}>
                      {total}
                    </td>
                  </tr>
                )
              })}

              {/* Filas por tipo de ausencia */}
              {tiposEnPeriodo.map(tipo => {
                const cuentaCorridos: boolean = tipo.cuenta_dias_corridos ?? false
                const total = countDiasTipo(tipo.id, cuentaCorridos)
                return (
                  <tr key={`aus-${tipo.id}`}>
                    <td style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: '#1a0a0a', zIndex: 1, borderBottom: '0.5px solid #21262d' }}>
                      <span style={{ color: '#f85149' }}>{tipo.descripcion}</span>
                      <span style={{ color: '#484f58', fontSize: '10px', marginLeft: '5px' }}>
                        {cuentaCorridos ? 'corridos' : 'hábiles'}
                      </span>
                    </td>
                    {dias.map(fecha => {
                      const aus = getAusenciaTipo(fecha, tipo.id)
                      const cuenta = aus ? (cuentaCorridos ? true : esDiaLaboral(fecha)) : false
                      return (
                        <td key={fecha} style={{ padding: '5px 2px', textAlign: 'center', background: aus ? '#3a1a1a40' : '#1a0a0a', borderBottom: '0.5px solid #21262d' }}>
                          {aus ? (
                            <span style={{
                              fontSize: '10px', fontWeight: 600,
                              color: cuenta ? '#f85149' : '#4a2020',
                              background: cuenta ? '#3a1a1a' : '#1f1010',
                              padding: '1px 5px', borderRadius: '3px',
                            }}>
                              {tipo.codigo || 'AUS'}
                            </span>
                          ) : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>}
                        </td>
                      )
                    })}
                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#f85149', fontSize: '13px', borderBottom: '0.5px solid #21262d', borderLeft: '0.5px solid #30363d', position: 'sticky', right: 0, background: '#1a0a0a' }}>
                      {total}d
                    </td>
                  </tr>
                )
              })}

              {/* Fila feriados */}
              {feriados.length > 0 && (
                <tr>
                  <td style={{ padding: '7px 14px', color: '#d29922', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: '#1a1500', zIndex: 1, borderBottom: '0.5px solid #21262d' }}>
                    Feriados
                  </td>
                  {dias.map(fecha => {
                    const feriado = feriados.find((f: any) => f.fecha === fecha)
                    const ausencia = getAusencia(fecha)
                    const vac = enVacaciones(fecha)
                    const cuenta = feriado && !ausencia && !vac
                    return (
                      <td key={fecha} style={{ padding: '5px 2px', textAlign: 'center', background: feriado ? '#2a200040' : '#1a1500', borderBottom: '0.5px solid #21262d' }} title={feriado?.descripcion}>
                        {feriado ? (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: cuenta ? '#d29922' : '#3a2a00', background: cuenta ? '#2a2000' : '#1a1500', padding: '1px 5px', borderRadius: '3px' }}>FER</span>
                        ) : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>}
                      </td>
                    )
                  })}
                  <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#d29922', fontSize: '13px', borderBottom: '0.5px solid #21262d', borderLeft: '0.5px solid #30363d', position: 'sticky', right: 0, background: '#1a1500' }}>
                    {dias.filter(d => feriados.find((f: any) => f.fecha === d) && !getAusencia(d) && !enVacaciones(d)).length}d
                  </td>
                </tr>
              )}

              {/* Fila vacaciones */}
              {totalVacaciones > 0 && (
                <tr>
                  <td style={{ padding: '7px 14px', color: '#3fb950', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: '#0a1a0a', zIndex: 1, borderBottom: '0.5px solid #21262d' }}>
                    Vacaciones
                  </td>
                  {dias.map(fecha => {
                    const vac = enVacaciones(fecha)
                    return (
                      <td key={fecha} style={{ padding: '5px 2px', textAlign: 'center', background: vac ? '#1a3a2a40' : '#0a1a0a', borderBottom: '0.5px solid #21262d' }}>
                        {vac ? (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#3fb950', background: '#1a3a2a', padding: '1px 5px', borderRadius: '3px' }}>VAC</span>
                        ) : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>}
                      </td>
                    )
                  })}
                  <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#3fb950', fontSize: '13px', borderBottom: '0.5px solid #21262d', borderLeft: '0.5px solid #30363d', position: 'sticky', right: 0, background: '#0a1a0a' }}>
                    {totalVacaciones}d
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda */}
      {!cargando && hayDatos && feriados.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
          {feriados.map((f: any) => (
            <span key={f.fecha} style={{ fontSize: '11px', color: '#d29922' }}>
              F {parseInt(f.fecha.slice(8))} — {f.descripcion}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
