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
  const [historicoObras, setHistoricoObras] = useState<any[]>([])
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
      { data: histObrasData },
    ] = await Promise.all([
      supabase.from('adicionales').select('id, codigo, descripcion').eq('id_empresa', idEmpresa).eq('activo', true).order('descripcion'),
      supabase.from('novedades_diarias').select('*, obras(nombre)').eq('id_legajo', idLegajo).gte('fecha', desde).lte('fecha', hasta).order('fecha'),
      supabase.from('ausencias_periodo').select('*, tipos_ausencia(id, codigo, descripcion, cuenta_dias_corridos)').eq('id_legajo', idLegajo).lte('fecha_desde', hasta).gte('fecha_hasta', desde),
      supabase.from('vacaciones_periodo').select('*').eq('id_legajo', idLegajo).lte('fecha_desde', hasta).gte('fecha_hasta', desde),
      supabase.from('feriados').select('id, fecha, descripcion').eq('activo', true).gte('fecha', desde).lte('fecha', hasta),
      supabase.from('legajos').select('id_plantilla, id_categoria, categorias(id_plantilla)').eq('id', idLegajo).single(),
      supabase.from('legajos_historico_obras').select('id_obra, fecha_desde, fecha_hasta').eq('id_legajo', idLegajo).lte('fecha_desde', hasta).or(`fecha_hasta.is.null,fecha_hasta.gte.${desde}`).order('fecha_desde'),
    ])

    setAdicionales(adicsData || [])
    setNovedades(novsData || [])
    setAusencias(ausData || [])
    setVacaciones(vacData || [])
    setHistoricoObras(histObrasData || [])

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

  // Agrupar novedades por obra
  const obraIds: number[] = [...new Set(novedades.map((n: any) => n.id_obra).filter(Boolean))]
  const obraNombres = new Map<number, string>(
    novedades.filter((n: any) => n.id_obra && n.obras?.nombre).map((n: any) => [n.id_obra, n.obras.nombre])
  )

  // Devuelve el id_obra donde estaba el legajo en una fecha (por novedad o por historico)
  function getObraIdParaFecha(fecha: string): number | null {
    const nov = novedades.find((n: any) => n.fecha === fecha)
    if (nov?.id_obra) return nov.id_obra
    const hist = historicoObras.find((h: any) =>
      h.fecha_desde <= fecha && (h.fecha_hasta === null || h.fecha_hasta >= fecha)
    )
    return hist?.id_obra ?? null
  }

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

  const FILAS_HORAS = [
    { key: 'hs_normales',  label: 'Hs. Normales' },
    { key: 'hs_extra_50',  label: 'Hs. Extra 50%' },
    { key: 'hs_extra_100', label: 'Hs. Extra 100%' },
    { key: 'hs_nocturnas', label: 'Hs. Nocturnas' },
  ]

  // Total por fila de horas (filtrado por obra)
  function totalHoras(key: string, novsObra: any[]) {
    return novsObra.reduce((sum: number, n: any) => sum + (n[key] || 0), 0)
  }

  // Total por adicional (filtrado por obra)
  function totalAdicional(idAdicional: number, idsNovObra: Set<number>) {
    return novedadesAdicionales
      .filter((na: any) => na.id_adicional === idAdicional && idsNovObra.has(na.id_novedad))
      .reduce((s: number, na: any) => s + na.cantidad, 0)
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
      color: esFeriado ? 'var(--c-orange)' : esFinSemana ? 'var(--c-text-muted)' : 'var(--c-text-secondary)',
      borderBottom: `2px solid ${esFeriado ? 'var(--c-orange)40' : esFinSemana ? 'var(--c-elevated)' : 'var(--c-border)'}`,
      background: esFinSemana ? 'var(--c-weekend-bg)' : 'transparent',
      position: 'sticky' as const, top: 0, zIndex: 1,
    }
  }

  const tdDia = (fecha: string, contenido: any, highlight?: string) => {
    const dow = new Date(fecha + 'T00:00:00').getDay()
    const esFinSemana = dow === 0 || dow === 6
    const esFeriado = feriadosFechas.has(fecha)
    return {
      padding: '5px 2px', textAlign: 'center' as const, fontSize: '12px',
      background: esFeriado ? 'var(--c-orange-bg)20' : esFinSemana ? 'var(--c-weekend-bg)' : 'transparent',
      color: highlight || (esFinSemana ? 'var(--c-text-muted)' : 'var(--c-text-primary)'),
      borderBottom: '0.5px solid var(--c-elevated)',
    }
  }

  const periodoLabel = `${MESES[parseInt(mes) - 1]} ${anio}${periodo === '1' ? ' — 1ª quincena' : periodo === '2' ? ' — 2ª quincena' : ' — mes completo'}`

  return (
    <div>
      {/* Selector de período */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px' }}>
          {MESES.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px' }}>
          {[2023, 2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px' }}>
          <option value="1">1ª quincena (1–15)</option>
          <option value="2">2ª quincena (16–fin)</option>
          <option value="mes">Mes completo</option>
        </select>
        {cargando && <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>Cargando...</span>}
      </div>

      {!cargando && !hayDatos && (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          No hay novedades registradas para {periodoLabel}.
        </div>
      )}

      {!cargando && hayDatos && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {(obraIds.length > 0 ? obraIds : [null]).map(idObra => {
            const novsObra = idObra !== null
              ? novedades.filter((n: any) => n.id_obra === idObra)
              : novedades
            const idsNovObra = new Set<number>(novsObra.map((n: any) => n.id))
            const novByFecha = new Map(novsObra.map((n: any) => [n.fecha, n]))
            const obraNombre = idObra !== null ? (obraNombres.get(idObra) || `Obra #${idObra}`) : null
            const adicionalesConDatosObra = adicionales.filter(a =>
              novedadesAdicionales.some(na => na.id_adicional === a.id && idsNovObra.has(na.id_novedad))
            )

            return (
              <div key={idObra ?? 'sin-obra'}>
                {obraNombre && (
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-blue)', marginBottom: '8px', paddingLeft: '2px' }}>
                    {obraNombre}
                  </div>
                )}
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '0.5px solid var(--c-border)' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%', minWidth: `${140 + dias.length * 38 + 55}px` }}>
                    <thead>
                      <tr style={{ background: 'var(--c-base)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '12px', color: 'var(--c-text-secondary)', fontWeight: 500, minWidth: '140px', position: 'sticky', left: 0, background: 'var(--c-base)', zIndex: 2, borderBottom: '2px solid var(--c-border)' }}>
                          {periodoLabel}
                        </th>
                        {dias.map(fecha => {
                          const dow = new Date(fecha + 'T00:00:00').getDay()
                          const dia = fecha.slice(8)
                          const esFeriado = feriadosFechas.has(fecha)
                          const feriado = feriados.find((f: any) => f.fecha === fecha)
                          return (
                            <th key={fecha} style={thDia(fecha)} title={esFeriado ? feriado?.descripcion : undefined}>
                              <div>{DIAS_SEMANA[dow]}</div>
                              <div style={{ fontWeight: 600, fontSize: '12px' }}>{parseInt(dia)}</div>
                              {esFeriado && <div style={{ fontSize: '9px', color: 'var(--c-orange)' }}>F</div>}
                            </th>
                          )
                        })}
                        <th style={{ padding: '10px 8px', fontSize: '12px', color: 'var(--c-text-secondary)', fontWeight: 500, textAlign: 'center', minWidth: '55px', position: 'sticky', right: 0, background: 'var(--c-base)', zIndex: 2, borderBottom: '2px solid var(--c-border)', borderLeft: '0.5px solid var(--c-border)' }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Filas de horas */}
                      {FILAS_HORAS.map((fila, fi) => {
                        const total = totalHoras(fila.key, novsObra)
                        if (total === 0 && fila.key !== 'hs_normales') return null
                        return (
                          <tr key={fila.key} style={{ background: fi % 2 === 0 ? 'transparent' : 'var(--c-weekend-bg)40' }}>
                            <td style={{ padding: '7px 14px', color: 'var(--c-text-secondary)', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: fi % 2 === 0 ? 'var(--c-surface)' : 'var(--c-row-stripe)', zIndex: 1, borderBottom: '0.5px solid var(--c-elevated)' }}>
                              {fila.label}
                            </td>
                            {dias.map(fecha => {
                              const nov = novByFecha.get(fecha)
                              const val = nov?.[fila.key] || 0
                              const ausencia = getAusencia(fecha)
                              const vac = enVacaciones(fecha)
                              const celda = ausencia ? null : vac ? null : val > 0 ? val : null
                              return (
                                <td key={fecha} style={tdDia(fecha, celda, fila.key !== 'hs_normales' && val > 0 ? 'var(--c-blue)' : undefined)}>
                                  {celda !== null ? celda : <span style={{ color: 'var(--c-elevated)' }}>—</span>}
                                </td>
                              )
                            })}
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: total > 0 ? 'var(--c-text-primary)' : 'var(--c-text-muted)', fontSize: '13px', borderBottom: '0.5px solid var(--c-elevated)', borderLeft: '0.5px solid var(--c-border)', position: 'sticky', right: 0, background: fi % 2 === 0 ? 'var(--c-surface)' : 'var(--c-row-stripe)' }}>
                              {total > 0 ? total : '—'}
                            </td>
                          </tr>
                        )
                      })}

                      {/* Filas de adicionales */}
                      {adicionalesConDatosObra.map((adic) => {
                        const total = totalAdicional(adic.id, idsNovObra)
                        return (
                          <tr key={adic.id} style={{ background: 'var(--c-blue-bg)20' }}>
                            <td style={{ padding: '7px 14px', color: 'var(--c-blue)', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--c-row-blue)', zIndex: 1, borderBottom: '0.5px solid var(--c-elevated)' }}>
                              {adic.descripcion}
                            </td>
                            {dias.map(fecha => {
                              const nov = novByFecha.get(fecha)
                              const adicsNov = nov ? novedadesAdicionales.filter((na: any) => na.id_novedad === nov.id && na.id_adicional === adic.id) : []
                              const val = adicsNov.reduce((s: number, na: any) => s + na.cantidad, 0)
                              return (
                                <td key={fecha} style={{ ...tdDia(fecha, val > 0 ? val : null, 'var(--c-blue)'), background: 'var(--c-row-blue)' }}>
                                  {val > 0 ? <span style={{ color: 'var(--c-blue)' }}>{val}</span> : <span style={{ color: 'var(--c-elevated)' }}>—</span>}
                                </td>
                              )
                            })}
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--c-blue)', fontSize: '13px', borderBottom: '0.5px solid var(--c-elevated)', borderLeft: '0.5px solid var(--c-border)', position: 'sticky', right: 0, background: 'var(--c-row-blue)' }}>
                              {total}
                            </td>
                          </tr>
                        )
                      })}

                      {/* Filas por tipo de ausencia — solo días que corresponden a esta obra */}
                      {tiposEnPeriodo.map(tipo => {
                        const cuentaCorridos: boolean = tipo.cuenta_dias_corridos ?? false
                        const diasTipoObra = dias.filter(d => {
                          if (!getAusenciaTipo(d, tipo.id)) return false
                          return getObraIdParaFecha(d) === idObra
                        })
                        if (diasTipoObra.length === 0) return null
                        const totalAus = diasTipoObra.filter(d => cuentaCorridos ? true : esDiaLaboral(d)).length
                        return (
                          <tr key={`aus-${tipo.id}`}>
                            <td style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--c-red-bg)', zIndex: 1, borderBottom: '0.5px solid var(--c-elevated)' }}>
                              <span style={{ color: 'var(--c-red)' }}>{tipo.descripcion}</span>
                              <span style={{ color: 'var(--c-text-muted)', fontSize: '10px', marginLeft: '5px' }}>
                                {cuentaCorridos ? 'corridos' : 'hábiles'}
                              </span>
                            </td>
                            {dias.map(fecha => {
                              const aus = getAusenciaTipo(fecha, tipo.id)
                              const esEstaObra = getObraIdParaFecha(fecha) === idObra
                              const cuenta = aus && esEstaObra ? (cuentaCorridos ? true : esDiaLaboral(fecha)) : false
                              return (
                                <td key={fecha} style={{ padding: '5px 2px', textAlign: 'center', background: aus && esEstaObra ? 'var(--c-red-bg)40' : 'var(--c-red-bg)', borderBottom: '0.5px solid var(--c-elevated)' }}>
                                  {aus && esEstaObra ? (
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: cuenta ? 'var(--c-red)' : 'var(--c-red-dim)', background: cuenta ? 'var(--c-red-bg)' : 'var(--c-red-dim-bg)', padding: '1px 5px', borderRadius: '3px' }}>
                                      {tipo.codigo || 'AUS'}
                                    </span>
                                  ) : <span style={{ color: 'var(--c-elevated)', fontSize: '12px' }}>—</span>}
                                </td>
                              )
                            })}
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--c-red)', fontSize: '13px', borderBottom: '0.5px solid var(--c-elevated)', borderLeft: '0.5px solid var(--c-border)', position: 'sticky', right: 0, background: 'var(--c-red-bg)' }}>
                              {totalAus}d
                            </td>
                          </tr>
                        )
                      })}

                      {/* Fila feriados — solo días que corresponden a esta obra */}
                      {(() => {
                        const feriadosObra = feriados.filter(f => getObraIdParaFecha(f.fecha) === idObra)
                        if (feriadosObra.length === 0) return null
                        return (
                          <tr>
                            <td style={{ padding: '7px 14px', color: 'var(--c-orange)', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--c-row-orange)', zIndex: 1, borderBottom: '0.5px solid var(--c-elevated)' }}>
                              Feriados
                            </td>
                            {dias.map(fecha => {
                              const feriado = feriados.find((f: any) => f.fecha === fecha)
                              const esEstaObra = getObraIdParaFecha(fecha) === idObra
                              const ausencia = getAusencia(fecha)
                              const vac = enVacaciones(fecha)
                              const cuenta = feriado && esEstaObra && !ausencia && !vac
                              return (
                                <td key={fecha} style={{ padding: '5px 2px', textAlign: 'center', background: feriado && esEstaObra ? 'var(--c-orange-active-bg)40' : 'var(--c-row-orange)', borderBottom: '0.5px solid var(--c-elevated)' }} title={feriado?.descripcion}>
                                  {feriado && esEstaObra ? (
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: cuenta ? 'var(--c-orange)' : 'var(--c-orange-dim)', background: cuenta ? 'var(--c-orange-active-bg)' : 'var(--c-row-orange)', padding: '1px 5px', borderRadius: '3px' }}>FER</span>
                                  ) : <span style={{ color: 'var(--c-elevated)', fontSize: '12px' }}>—</span>}
                                </td>
                              )
                            })}
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--c-orange)', fontSize: '13px', borderBottom: '0.5px solid var(--c-elevated)', borderLeft: '0.5px solid var(--c-border)', position: 'sticky', right: 0, background: 'var(--c-row-orange)' }}>
                              {feriadosObra.filter(f => !getAusencia(f.fecha) && !enVacaciones(f.fecha)).length}d
                            </td>
                          </tr>
                        )
                      })()}

                      {/* Fila vacaciones — solo días que corresponden a esta obra */}
                      {(() => {
                        const vacObra = dias.filter(d => enVacaciones(d) && getObraIdParaFecha(d) === idObra)
                        if (vacObra.length === 0) return null
                        return (
                          <tr>
                            <td style={{ padding: '7px 14px', color: 'var(--c-green)', fontSize: '12px', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--c-row-green)', zIndex: 1, borderBottom: '0.5px solid var(--c-elevated)' }}>
                              Vacaciones
                            </td>
                            {dias.map(fecha => {
                              const vac = enVacaciones(fecha) && getObraIdParaFecha(fecha) === idObra
                              return (
                                <td key={fecha} style={{ padding: '5px 2px', textAlign: 'center', background: vac ? 'var(--c-green-bg)40' : 'var(--c-row-green)', borderBottom: '0.5px solid var(--c-elevated)' }}>
                                  {vac ? (
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--c-green)', background: 'var(--c-green-bg)', padding: '1px 5px', borderRadius: '3px' }}>VAC</span>
                                  ) : <span style={{ color: 'var(--c-elevated)', fontSize: '12px' }}>—</span>}
                                </td>
                              )
                            })}
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--c-green)', fontSize: '13px', borderBottom: '0.5px solid var(--c-elevated)', borderLeft: '0.5px solid var(--c-border)', position: 'sticky', right: 0, background: 'var(--c-row-green)' }}>
                              {vacObra.length}d
                            </td>
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Leyenda */}
      {!cargando && hayDatos && feriados.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
          {feriados.map((f: any) => (
            <span key={f.fecha} style={{ fontSize: '11px', color: 'var(--c-orange)' }}>
              F {parseInt(f.fecha.slice(8))} — {f.descripcion}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
