"use client"

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../../context/EmpresaContext'
import { ChevronRight, ChevronDown } from 'lucide-react'

type Obra = { id: number; id_empresa: number; nombre: string }
type Adicional = { id: number; id_empresa: number; descripcion: string }

type Novedad = {
  id: number
  id_legajo: number
  id_obra: number
  fecha: string
  hs_normales: number
  hs_extra_50: number
  hs_extra_100: number
  hs_nocturnas: number
  ausente: boolean
  legajos: { apellido: string; nombre: string; nro_legajo: number }
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function ConsultaClient({ obras, adicionales }: { obras: Obra[]; adicionales: Adicional[] }) {
  const { empresaActiva, rol, obrasJefe } = useEmpresa()

  const hoy = new Date()
  const [idObra, setIdObra] = useState('')
  const [mes, setMes] = useState(String(hoy.getMonth() + 1).padStart(2, '0'))
  const [anio, setAnio] = useState(String(hoy.getFullYear()))
  const [periodo, setPeriodo] = useState(hoy.getDate() <= 15 ? '1' : '2')

  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [novedadesAdics, setNovedadesAdics] = useState<any[]>([])
  const [ausenciasPeriodo, setAusenciasPeriodo] = useState<any[]>([])
  const [vacacionesPeriodo, setVacacionesPeriodo] = useState<any[]>([])
  const [feriadosPeriodo, setFeriadosPeriodo] = useState<any[]>([])
  const [legajosPeriodo, setLegajosPeriodo] = useState<any[]>([])
  const [plantillasPeriodo, setPlantillasPeriodo] = useState<any[]>([])
  const [categoriasPeriodo, setCategoriasPeriodo] = useState<any[]>([])
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())
  const [cargando, setCargando] = useState(false)
  const [buscado, setBuscado] = useState(false)

  const obrasFiltradas = obras.filter(o =>
    o.id_empresa === empresaActiva?.id &&
    (rol !== 'JEFE_OBRA' || obrasJefe.includes(o.id))
  )
  const adicionalesFiltrados = adicionales.filter(a => a.id_empresa === empresaActiva?.id)

  const selStyle = {
    padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

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
    while (d <= fin) { dias.push(d.toISOString().split('T')[0]); d.setDate(d.getDate() + 1) }
    return dias
  }

  async function consultar() {
    if (!empresaActiva) return
    setCargando(true)
    setBuscado(false)
    setExpandidos(new Set())

    const supabase = createClient()
    const { desde, hasta } = getRango()

    let q = supabase
      .from('novedades_diarias')
      .select('id, id_legajo, id_obra, fecha, hs_normales, hs_extra_50, hs_extra_100, hs_nocturnas, ausente, legajos(apellido, nombre, nro_legajo)')
      .eq('id_empresa', empresaActiva.id)
      .gte('fecha', desde).lte('fecha', hasta).order('fecha')
    if (idObra) q = q.eq('id_obra', parseInt(idObra))
    const { data: novsData } = await q

    const novs = novsData || []
    const idsNovs = novs.map(n => n.id)
    const idsLegajos = Array.from(new Set(novs.map(n => n.id_legajo)))

    const [
      { data: adicsData },
      { data: ausData },
      { data: vacData },
      { data: ferBase },
      { data: legData },
    ] = await Promise.all([
      idsNovs.length > 0
        ? supabase.from('novedades_adicionales').select('id_novedad, id_adicional, cantidad').in('id_novedad', idsNovs)
        : { data: [] },
      supabase.from('ausencias_periodo')
        .select('id_legajo, fecha_desde, fecha_hasta, tipos_ausencia(id, codigo, descripcion, pierde_presentismo, cuenta_dias_corridos)')
        .eq('id_empresa', empresaActiva.id)
        .lte('fecha_desde', hasta).gte('fecha_hasta', desde),
      supabase.from('vacaciones_periodo')
        .select('id_legajo, fecha_desde, fecha_hasta')
        .eq('id_empresa', empresaActiva.id)
        .lte('fecha_desde', hasta).gte('fecha_hasta', desde),
      supabase.from('feriados')
        .select('id, fecha, descripcion')
        .eq('activo', true)
        .gte('fecha', desde).lte('fecha', hasta),
      idsLegajos.length > 0
        ? supabase.from('legajos').select('id, id_plantilla, id_categoria').in('id', idsLegajos)
        : { data: [] },
    ])

    // Filtrar feriados por excepción empresa
    let ferEfectivos: any[] = []
    if (ferBase && ferBase.length > 0) {
      const { data: excepciones } = await supabase
        .from('feriados_empresa').select('id_feriado, trabaja')
        .eq('id_empresa', empresaActiva.id)
        .in('id_feriado', ferBase.map((f: any) => f.id))
      const trabajaIds = new Set((excepciones || []).filter((e: any) => e.trabaja).map((e: any) => e.id_feriado))
      ferEfectivos = ferBase.filter((f: any) => !trabajaIds.has(f.id))
    }

    // Fetch plantillas y categorias para calcular días hábiles en ausencias
    const legajosArr = legData || []
    const catIds = Array.from(new Set(legajosArr.filter((l: any) => l.id_categoria).map((l: any) => l.id_categoria)))
    const plantillaIds = Array.from(new Set(legajosArr.filter((l: any) => l.id_plantilla).map((l: any) => l.id_plantilla)))
    const [{ data: catsData }, { data: plantData }] = await Promise.all([
      catIds.length > 0
        ? supabase.from('categorias').select('id, id_plantilla').in('id', catIds)
        : { data: [] },
      plantillaIds.length > 0
        ? supabase.from('plantillas_jornada').select('id, lunes, martes, miercoles, jueves, viernes, sabado, domingo').in('id', plantillaIds)
        : { data: [] },
    ])
    // Add plantillas from categorias if not yet included
    const catPlantillaIds = (catsData || []).filter((c: any) => c.id_plantilla && !plantillaIds.includes(c.id_plantilla)).map((c: any) => c.id_plantilla)
    let extraPlantData: any[] = []
    if (catPlantillaIds.length > 0) {
      const { data: ep } = await supabase.from('plantillas_jornada').select('id, lunes, martes, miercoles, jueves, viernes, sabado, domingo').in('id', catPlantillaIds)
      extraPlantData = ep || []
    }

    setNovedades(novs as unknown as Novedad[])
    setNovedadesAdics(adicsData || [])
    setAusenciasPeriodo(ausData || [])
    setVacacionesPeriodo(vacData || [])
    setFeriadosPeriodo(ferEfectivos)
    setLegajosPeriodo(legajosArr)
    setCategoriasPeriodo(catsData || [])
    setPlantillasPeriodo([...(plantData || []), ...extraPlantData])
    setCargando(false)
    setBuscado(true)
  }

  function toggleExpand(idLegajo: number) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(idLegajo) ? next.delete(idLegajo) : next.add(idLegajo)
      return next
    })
  }

  // ── Helpers ──────────────────────────────────────────────
  const feriadosFechas = new Map(feriadosPeriodo.map(f => [f.fecha, f]))

  function getNov(idLegajo: number, fecha: string) {
    return novedades.find(n => n.id_legajo === idLegajo && n.fecha === fecha)
  }

  function getAusencia(idLegajo: number, fecha: string) {
    return ausenciasPeriodo.find(a =>
      a.id_legajo === idLegajo && a.fecha_desde <= fecha && a.fecha_hasta >= fecha
    )
  }

  function enVacaciones(idLegajo: number, fecha: string) {
    return vacacionesPeriodo.some(v =>
      v.id_legajo === idLegajo && v.fecha_desde <= fecha && v.fecha_hasta >= fecha
    )
  }

  function getAdicsNov(idNovedad: number) {
    return novedadesAdics.filter(na => na.id_novedad === idNovedad)
  }

  function getAdicsEmpleado(idLegajo: number) {
    const idsNovs = new Set(novedades.filter(n => n.id_legajo === idLegajo).map(n => n.id))
    const idsAdics = new Set(novedadesAdics.filter(na => idsNovs.has(na.id_novedad)).map(na => na.id_adicional))
    return adicionalesFiltrados.filter(a => idsAdics.has(a.id))
  }

  function getPlantillaId(idLegajo: number): number | undefined {
    const leg = legajosPeriodo.find((l: any) => l.id === idLegajo)
    if (!leg) return undefined
    if (leg.id_plantilla) return leg.id_plantilla
    const cat = categoriasPeriodo.find((c: any) => c.id === leg.id_categoria)
    return cat?.id_plantilla
  }

  function getPlantilla(idLegajo: number): any | undefined {
    const pid = getPlantillaId(idLegajo)
    if (!pid) return undefined
    return plantillasPeriodo.find((p: any) => p.id === pid)
  }

  function esDiaLaboral(fecha: string, plantilla: any): boolean {
    if (!plantilla) return true
    const claves = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']
    const clave = claves[new Date(fecha + 'T00:00:00').getDay()]
    return (plantilla[clave] || 0) > 0
  }

  function getTiposAusenciaEmpleado(idLegajo: number) {
    const ausEmp = ausenciasPeriodo.filter(a => a.id_legajo === idLegajo)
    return Array.from(new Map(ausEmp.filter(a => a.tipos_ausencia).map((a: any) => [a.tipos_ausencia.id, a.tipos_ausencia])).values())
  }

  // ── Empleados (agrupados y ordenados) ──────────────────
  const empleados = Array.from(
    new Map(novedades.map(n => [n.id_legajo, n.legajos])).entries()
  ).sort((a, b) => a[1].apellido.localeCompare(b[1].apellido))

  const dias = getDias()

  const periodoLabel = `${MESES[parseInt(mes) - 1]} ${anio}${periodo === '1' ? ' — 1ª quincena' : periodo === '2' ? ' — 2ª quincena' : ' — mes completo'}`

  if (!empresaActiva) return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>

  // ── Estilos celda día ───────────────────────────────────
  function thDiaStyle(fecha: string) {
    const dow = new Date(fecha + 'T00:00:00').getDay()
    const fds = dow === 0 || dow === 6
    const fer = feriadosFechas.has(fecha)
    return {
      textAlign: 'center' as const, padding: '6px 2px', minWidth: '38px', width: '38px',
      color: fer ? '#d29922' : fds ? '#484f58' : '#8b949e',
      background: fds ? '#0a0d12' : 'transparent',
      borderBottom: `2px solid ${fer ? '#d2992240' : fds ? '#21262d' : '#30363d'}`,
      position: 'sticky' as const, top: 0, zIndex: 1,
    }
  }

  function tdBg(fecha: string) {
    const dow = new Date(fecha + 'T00:00:00').getDay()
    const fds = dow === 0 || dow === 6
    return fds ? '#0a0d12' : 'transparent'
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Consulta de novedades</h1>
        <span style={{ fontSize: '12px', color: '#8b949e' }}>{empresaActiva.razon_social}</span>
      </div>

      {/* Filtros */}
      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '16px 20px', display: 'flex', flexWrap: 'wrap' as const, gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Obra</label>
          <select value={idObra} onChange={e => setIdObra(e.target.value)} style={{ ...selStyle, width: '100%' }}>
            <option value="">Todas las obras</option>
            {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)} style={selStyle}>
            {MESES.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Año</label>
          <select value={anio} onChange={e => setAnio(e.target.value)} style={selStyle}>
            {['2024','2025','2026','2027'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Período</label>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={selStyle}>
            <option value="1">1ª quincena (1–15)</option>
            <option value="2">2ª quincena (16–fin)</option>
            <option value="mes">Mes completo</option>
          </select>
        </div>
        <button onClick={consultar} disabled={cargando} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 20px', fontSize: '13px', cursor: 'pointer', opacity: cargando ? 0.6 : 1 }}>
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {/* Resultados */}
      {buscado && empleados.length === 0 && (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
          No hay novedades para {periodoLabel}.
        </div>
      )}

      {buscado && empleados.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '0.5px solid #30363d' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '100%', minWidth: `${200 + dias.length * 38 + 55}px` }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '12px', color: '#8b949e', fontWeight: 500, minWidth: '200px', position: 'sticky', left: 0, background: '#0d1117', zIndex: 2, borderBottom: '2px solid #30363d' }}>
                  {periodoLabel}
                </th>
                {dias.map(fecha => {
                  const dow = new Date(fecha + 'T00:00:00').getDay()
                  const fer = feriadosFechas.get(fecha)
                  return (
                    <th key={fecha} style={thDiaStyle(fecha)} title={fer?.descripcion}>
                      <div>{DIAS_SEMANA[dow]}</div>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{parseInt(fecha.slice(8))}</div>
                      {fer && <div style={{ fontSize: '9px', color: '#d29922' }}>F</div>}
                    </th>
                  )
                })}
                <th style={{ padding: '10px 8px', fontSize: '12px', color: '#8b949e', fontWeight: 500, textAlign: 'center', minWidth: '55px', position: 'sticky', right: 0, background: '#0d1117', zIndex: 2, borderBottom: '2px solid #30363d', borderLeft: '0.5px solid #30363d' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {empleados.map(([idLegajo, legajo], empIdx) => {
                const expanded = expandidos.has(idLegajo)
                const adicsEmp = getAdicsEmpleado(idLegajo)
                const tiposAusEmp = getTiposAusenciaEmpleado(idLegajo) as any[]
                const tieneVac = vacacionesPeriodo.some(v => v.id_legajo === idLegajo)
                const totalNorm = novedades.filter(n => n.id_legajo === idLegajo).reduce((s, n) => s + (n.hs_normales || 0), 0)
                const totalExtra50 = novedades.filter(n => n.id_legajo === idLegajo).reduce((s, n) => s + (n.hs_extra_50 || 0), 0)
                const totalExtra100 = novedades.filter(n => n.id_legajo === idLegajo).reduce((s, n) => s + (n.hs_extra_100 || 0), 0)
                const totalNoct = novedades.filter(n => n.id_legajo === idLegajo).reduce((s, n) => s + (n.hs_nocturnas || 0), 0)
                const totalHoras = totalNorm + totalExtra50 + totalExtra100 + totalNoct

                return (
                  <React.Fragment key={idLegajo}>
                    {/* ── Fila resumen del empleado ── */}
                    <tr
                      onClick={() => toggleExpand(idLegajo)}
                      style={{
                        borderBottom: expanded ? 'none' : empIdx < empleados.length - 1 ? '0.5px solid #21262d' : 'none',
                        cursor: 'pointer',
                        background: expanded ? '#0d1117' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '9px 14px', position: 'sticky', left: 0, background: expanded ? '#0d1117' : '#161b22', zIndex: 1, borderBottom: expanded ? 'none' : '0.5px solid #21262d' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {expanded
                            ? <ChevronDown size={13} color="#58a6ff" />
                            : <ChevronRight size={13} color="#484f58" />}
                          <span style={{ color: '#e6edf3', fontWeight: 500, fontSize: '13px' }}>
                            {legajo.apellido}, {legajo.nombre}
                          </span>
                          <span style={{ color: '#484f58', fontSize: '11px' }}>
                            #{String(legajo.nro_legajo).padStart(4, '0')}
                          </span>
                          {totalExtra50 > 0 && <span style={{ fontSize: '10px', color: '#58a6ff', background: '#1a2a3a', padding: '1px 6px', borderRadius: '3px' }}>+{totalExtra50}h 50%</span>}
                          {totalExtra100 > 0 && <span style={{ fontSize: '10px', color: '#58a6ff', background: '#1a2a3a', padding: '1px 6px', borderRadius: '3px' }}>+{totalExtra100}h 100%</span>}
                        </div>
                      </td>
                      {dias.map(fecha => {
                        const nov = getNov(idLegajo, fecha)
                        const aus = getAusencia(idLegajo, fecha)
                        const vac = enVacaciones(idLegajo, fecha)
                        const fer = feriadosFechas.has(fecha)
                        const bg = vac ? 'rgba(88,166,255,0.07)' : aus ? 'rgba(248,81,73,0.07)' : fer ? 'rgba(210,153,34,0.07)' : tdBg(fecha)
                        return (
                          <td key={fecha} style={{ padding: '6px 2px', textAlign: 'center', background: bg }}>
                            {vac ? (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#58a6ff' }}>VAC</span>
                            ) : aus ? (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: (aus as any).tipos_ausencia?.pierde_presentismo === false ? '#3fb950' : '#f85149' }}>
                                {(aus as any).tipos_ausencia?.codigo || 'AUS'}
                              </span>
                            ) : fer ? (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#d29922' }}>FER</span>
                            ) : nov?.ausente ? (
                              <span style={{ fontSize: '10px', color: '#f85149' }}>A</span>
                            ) : nov ? (
                              <span style={{ color: nov.hs_normales > 0 ? '#e6edf3' : '#484f58', fontSize: '12px' }}>
                                {nov.hs_normales || '—'}
                              </span>
                            ) : (
                              <span style={{ color: '#21262d', fontSize: '12px' }}>·</span>
                            )}
                          </td>
                        )
                      })}
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: totalHoras > 0 ? '#e6edf3' : '#484f58', fontSize: '13px', borderLeft: '0.5px solid #30363d', position: 'sticky', right: 0, background: expanded ? '#0d1117' : '#161b22' }}>
                        {totalHoras || '—'}
                      </td>
                    </tr>

                    {/* ── Filas de detalle (expandido) ── */}
                    {expanded && (() => {
                      const isLast = empIdx === empleados.length - 1
                      const sepStyle = { borderBottom: '0.5px solid #21262d' }

                      const filaConcepto = (
                        label: string,
                        color: string,
                        bg: string,
                        getCelda: (fecha: string) => React.ReactNode,
                        total: React.ReactNode,
                        isLastFila: boolean
                      ) => (
                        <tr key={`${idLegajo}-${label}`} style={isLastFila && isLast ? {} : sepStyle}>
                          <td style={{ padding: '6px 14px 6px 34px', fontSize: '11px', fontWeight: 500, color, position: 'sticky', left: 0, background: bg, zIndex: 1, borderBottom: isLastFila && isLast ? 'none' : '0.5px solid #21262d' }}>
                            {label}
                          </td>
                          {dias.map(fecha => (
                            <td key={fecha} style={{ padding: '5px 2px', textAlign: 'center', background: bg, borderBottom: isLastFila && isLast ? 'none' : '0.5px solid #21262d' }}>
                              {getCelda(fecha)}
                            </td>
                          ))}
                          <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color, fontSize: '12px', borderLeft: '0.5px solid #30363d', position: 'sticky', right: 0, background: bg, borderBottom: isLastFila && isLast ? 'none' : '0.5px solid #21262d' }}>
                            {total}
                          </td>
                        </tr>
                      )

                      const conceptos: React.ReactNode[] = []

                      // Hs. Normales
                      conceptos.push(filaConcepto(
                        'Hs. Normales', '#8b949e', '#0a0d12',
                        fecha => {
                          const nov = getNov(idLegajo, fecha)
                          const val = nov?.hs_normales || 0
                          return val > 0 ? <span style={{ color: '#e6edf3', fontSize: '12px' }}>{val}</span> : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>
                        },
                        totalNorm > 0 ? totalNorm : <span style={{ color: '#484f58' }}>—</span>,
                        false
                      ))

                      // Hs. Extra 50%
                      if (totalExtra50 > 0) conceptos.push(filaConcepto(
                        'Hs. Extra 50%', '#58a6ff', '#0a0d12',
                        fecha => {
                          const nov = getNov(idLegajo, fecha)
                          const val = nov?.hs_extra_50 || 0
                          return val > 0 ? <span style={{ color: '#58a6ff', fontSize: '12px' }}>{val}</span> : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>
                        },
                        <span style={{ color: '#58a6ff' }}>{totalExtra50}</span>,
                        false
                      ))

                      // Hs. Extra 100%
                      if (totalExtra100 > 0) conceptos.push(filaConcepto(
                        'Hs. Extra 100%', '#58a6ff', '#0a0d12',
                        fecha => {
                          const nov = getNov(idLegajo, fecha)
                          const val = nov?.hs_extra_100 || 0
                          return val > 0 ? <span style={{ color: '#58a6ff', fontSize: '12px' }}>{val}</span> : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>
                        },
                        <span style={{ color: '#58a6ff' }}>{totalExtra100}</span>,
                        false
                      ))

                      // Hs. Nocturnas
                      if (totalNoct > 0) conceptos.push(filaConcepto(
                        'Hs. Nocturnas', '#58a6ff', '#0a0d12',
                        fecha => {
                          const nov = getNov(idLegajo, fecha)
                          const val = nov?.hs_nocturnas || 0
                          return val > 0 ? <span style={{ color: '#58a6ff', fontSize: '12px' }}>{val}</span> : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>
                        },
                        <span style={{ color: '#58a6ff' }}>{totalNoct}</span>,
                        false
                      ))

                      // Adicionales
                      adicsEmp.forEach(adic => {
                        const total = novedadesAdics.filter(na => {
                          const nov = novedades.find(n => n.id === na.id_novedad && n.id_legajo === idLegajo)
                          return nov && na.id_adicional === adic.id
                        }).reduce((s, na) => s + na.cantidad, 0)
                        conceptos.push(filaConcepto(
                          adic.descripcion, '#58a6ff', '#0d1420',
                          fecha => {
                            const nov = getNov(idLegajo, fecha)
                            if (!nov) return <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>
                            const adicsNov = getAdicsNov(nov.id)
                            const val = adicsNov.filter(na => na.id_adicional === adic.id).reduce((s, na) => s + na.cantidad, 0)
                            return val > 0 ? <span style={{ color: '#58a6ff', fontSize: '12px' }}>{val}</span> : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>
                          },
                          <span style={{ color: '#58a6ff' }}>{total}</span>,
                          false
                        ))
                      })

                      // Ausencias por tipo
                      tiposAusEmp.forEach(tipo => {
                        const plantilla = getPlantilla(idLegajo)
                        const cuentaCorridos: boolean = tipo.cuenta_dias_corridos ?? false
                        const totalDias = dias.filter(d => {
                          const aus = ausenciasPeriodo.find(a => a.id_legajo === idLegajo && a.tipos_ausencia?.id === tipo.id && a.fecha_desde <= d && a.fecha_hasta >= d)
                          if (!aus) return false
                          return cuentaCorridos ? true : esDiaLaboral(d, plantilla)
                        }).length
                        conceptos.push(filaConcepto(
                          tipo.descripcion, '#f85149', '#1a0a0a',
                          fecha => {
                            const aus = ausenciasPeriodo.find(a => a.id_legajo === idLegajo && a.tipos_ausencia?.id === tipo.id && a.fecha_desde <= fecha && a.fecha_hasta >= fecha)
                            return aus
                              ? <span style={{ fontSize: '10px', fontWeight: 600, color: '#f85149', background: '#3a1a1a', padding: '1px 5px', borderRadius: '3px' }}>{tipo.codigo || 'AUS'}</span>
                              : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>
                          },
                          <span style={{ color: '#f85149' }}>{totalDias}d</span>,
                          false
                        ))
                      })

                      // Vacaciones
                      if (tieneVac) {
                        const totalVac = dias.filter(d => enVacaciones(idLegajo, d)).length
                        conceptos.push(filaConcepto(
                          'Vacaciones', '#3fb950', '#0a1a0a',
                          fecha => enVacaciones(idLegajo, fecha)
                            ? <span style={{ fontSize: '10px', fontWeight: 600, color: '#3fb950', background: '#1a3a2a', padding: '1px 5px', borderRadius: '3px' }}>VAC</span>
                            : <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>,
                          <span style={{ color: '#3fb950' }}>{totalVac}d</span>,
                          false
                        ))
                      }

                      // Feriados (solo los que no caen en ausencia ni vacaciones)
                      if (feriadosPeriodo.length > 0) {
                        const totalFerPagados = dias.filter(d =>
                          feriadosFechas.has(d) &&
                          !getAusencia(idLegajo, d) &&
                          !enVacaciones(idLegajo, d)
                        ).length
                        conceptos.push(filaConcepto(
                          'Feriados', '#d29922', '#1a1500',
                          fecha => {
                            const fer = feriadosFechas.has(fecha)
                            if (!fer) return <span style={{ color: '#21262d', fontSize: '12px' }}>—</span>
                            const aus = getAusencia(idLegajo, fecha)
                            const vac = enVacaciones(idLegajo, fecha)
                            const cuenta = !aus && !vac
                            return <span style={{ fontSize: '10px', fontWeight: 600, color: cuenta ? '#d29922' : '#3a2a00', background: cuenta ? '#2a2000' : '#1a1500', padding: '1px 5px', borderRadius: '3px' }}>FER</span>
                          },
                          <span style={{ color: '#d29922' }}>{totalFerPagados}d</span>,
                          true
                        ))
                      }

                      return conceptos
                    })()}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda feriados */}
      {buscado && feriadosPeriodo.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' as const }}>
          {feriadosPeriodo.map(f => (
            <span key={f.fecha} style={{ fontSize: '11px', color: '#d29922' }}>
              F {parseInt(f.fecha.slice(8))} — {f.descripcion}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
