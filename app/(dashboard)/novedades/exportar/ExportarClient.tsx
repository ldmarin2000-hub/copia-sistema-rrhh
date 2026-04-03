"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../../context/EmpresaContext'
import Link from 'next/link'
import { Download, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type Obra = { id: number; id_empresa: number; nombre: string }
type Adicional = { id: number; id_empresa: number; codigo: string; descripcion: string }
type TipoAusencia = { id: number; codigo: string; descripcion: string; cuenta_dias_corridos: boolean }
type Plantilla = { id: number; lunes: number; martes: number; miercoles: number; jueves: number; viernes: number; sabado: number; domingo: number }
type Categoria = { id: number; id_plantilla?: number }

type FilaResumen = {
  idLegajo: number
  nroLegajo: number
  codigoExterno?: string
  apellido: string
  nombre: string
  obra: string
  hs_normales: number
  hs_extra_50: number
  hs_extra_100: number
  hs_nocturnas: number
  hs_bh_50: number
  hs_bh_100: number
  adicionales: Record<number, number>
  ausencias: Record<number, number>
  vacaciones: number
  feriados: number
}

export default function ExportarClient({
  obras, adicionales, tiposAusencia, plantillas, categorias
}: {
  obras: Obra[]
  adicionales: Adicional[]
  tiposAusencia: TipoAusencia[]
  plantillas: Plantilla[]
  categorias: Categoria[]
}) {
  const { empresaActiva } = useEmpresa()

  const hoy = new Date()
  const [mes, setMes] = useState(String(hoy.getMonth() + 1).padStart(2, '0'))
  const [anio, setAnio] = useState(String(hoy.getFullYear()))
  const [periodo, setPeriodo] = useState(hoy.getDate() <= 15 ? '1' : '2')
  const [idObra, setIdObra] = useState('')
  const [filas, setFilas] = useState<FilaResumen[]>([])
  const [tiposEnPeriodo, setTiposEnPeriodo] = useState<TipoAusencia[]>([])
  const [adicionalesEnPeriodo, setAdicionalesEnPeriodo] = useState<Adicional[]>([])
  const [feriadosDelPeriodo, setFeriadosDelPeriodo] = useState<{ fecha: string; descripcion: string }[]>([])
  const [cargando, setCargando] = useState(false)
  const [consultado, setConsultado] = useState(false)

  const [configCodigos, setConfigCodigos] = useState<Record<string, string>>({})

  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaActiva?.id)
  const adicionalesFiltrados = adicionales.filter(a => a.id_empresa === empresaActiva?.id)

  function getRango() {
    const m = mes.padStart(2, '0')
    const ultimoDia = new Date(parseInt(anio), parseInt(mes), 0).getDate()
    if (periodo === '1') return { desde: `${anio}-${m}-01`, hasta: `${anio}-${m}-15` }
    if (periodo === '2') return { desde: `${anio}-${m}-16`, hasta: `${anio}-${m}-${ultimoDia}` }
    return { desde: `${anio}-${m}-01`, hasta: `${anio}-${m}-${ultimoDia}` }
  }

  function getDias(desde: string, hasta: string): string[] {
    const dias: string[] = []
    const d = new Date(desde + 'T00:00:00')
    const fin = new Date(hasta + 'T00:00:00')
    while (d <= fin) { dias.push(d.toISOString().split('T')[0]); d.setDate(d.getDate() + 1) }
    return dias
  }

  function getPlantillaId(idLegajo: number, legajosData: any[]): number | undefined {
    const leg = legajosData.find((l: any) => l.id === idLegajo)
    if (!leg) return undefined
    if (leg.id_plantilla) return leg.id_plantilla
    const cat = categorias.find(c => c.id === leg.id_categoria)
    return cat?.id_plantilla
  }

  function esDiaLaboral(fecha: string, plantillaId: number | undefined): boolean {
    if (!plantillaId) return true
    const p = plantillas.find(p => p.id === plantillaId)
    if (!p) return true
    const claves: (keyof Plantilla)[] = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']
    const clave = claves[new Date(fecha + 'T00:00:00').getDay()]
    return (p[clave] as number || 0) > 0
  }

  useEffect(() => {
    if (!empresaActiva) return
    const supabase = createClient()
    supabase.from('exportacion_config')
      .select('concepto_fijo, tipo_ausencia_id, adicional_id, codigo, conceptos_bejerman(codigo)')
      .eq('id_empresa', empresaActiva.id)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const row of (data || [])) {
          // Preferir código del catálogo Bejerman; fallback al texto libre
          const codigo = (row as any).conceptos_bejerman?.codigo ?? row.codigo ?? ''
          if (row.concepto_fijo) map[row.concepto_fijo] = codigo
          else if (row.tipo_ausencia_id) map[`aus_${row.tipo_ausencia_id}`] = codigo
          else if (row.adicional_id) map[`adic_${row.adicional_id}`] = codigo
        }
        setConfigCodigos(map)
      })
  }, [empresaActiva?.id])

  function exportarLiquidacion(formato: 'txt' | 'excel') {
    if (!filas.length) return
    type Linea = { legajo: string; concepto: string; valor: number; label: string }
    const lineas: Linea[] = []

    for (const fila of filas) {
      const legajoStr = fila.codigoExterno
        ? String(fila.codigoExterno).padStart(4, '0')
        : String(fila.nroLegajo).padStart(4, '0')
      const add = (tipo: string, label: string, valor: number) => {
        const codigo = (configCodigos[tipo] || '').trim()
        if (!codigo || valor <= 0) return
        lineas.push({ legajo: legajoStr, concepto: codigo.padStart(4, '0'), valor, label })
      }
      add('hs_normales',  'Hs. Normales',            fila.hs_normales)
      add('hs_extra_50',  'Hs. Extra 50%',           fila.hs_extra_50)
      add('hs_extra_100', 'Hs. Extra 100%',          fila.hs_extra_100)
      add('hs_nocturnas', 'Hs. Nocturnas',           fila.hs_nocturnas)
      add('hs_bh_50',     'Hs. Banco de Horas 50%',  fila.hs_bh_50)
      add('hs_bh_100',    'Hs. Banco de Horas 100%', fila.hs_bh_100)
      add('feriados',     'Feriados',                 fila.feriados)
      add('vacaciones',   'Vacaciones',               fila.vacaciones)
      for (const t of tiposAusencia) add(`aus_${t.id}`, t.descripcion, fila.ausencias[t.id] || 0)
      for (const a of adicionalesFiltrados) add(`adic_${a.id}`, a.descripcion, fila.adicionales[a.id] || 0)
    }

    const periodoStr = `${anio}${mes}_q${periodo}`
    const obraStr = idObra ? obrasFiltradas.find(o => o.id === parseInt(idObra))?.nombre?.replace(/\s+/g, '_') || idObra : 'todas'

    // Formato cantidad: 000.00 (3 enteros + punto + 2 decimales = 6 chars)
    const fmtCantidad = (v: number) => v.toFixed(2).padStart(6, '0')

    if (formato === 'txt') {
      const contenido = lineas.map(l =>
        `${l.legajo}${l.concepto}${fmtCantidad(l.valor)}`
      ).join('\r\n')
      const blob = new Blob([contenido], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `liquidacion_${obraStr}_${periodoStr}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([
        ['Legajo', 'Concepto', 'Cantidad'],
        ...lineas.map(l => [l.legajo, l.concepto, l.valor]),
      ])
      ws['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 16 }]
      XLSX.utils.book_append_sheet(wb, ws, 'Liquidación')
      XLSX.writeFile(wb, `liquidacion_${obraStr}_${periodoStr}.xlsx`)
    }
  }

  async function consultar() {
    if (!empresaActiva) return
    setCargando(true)
    setConsultado(false)
    const supabase = createClient()
    const { desde, hasta } = getRango()
    const dias = getDias(desde, hasta)

    // Legajos activos para el filtro de obra
    let legQ = supabase
      .from('legajos')
      .select('id, nro_legajo, codigo_externo, apellido, nombre, id_obra, id_plantilla, id_categoria, obras(nombre)')
      .eq('id_empresa', empresaActiva.id)
      .eq('estado', 'Activo')
      .lte('fecha_ingreso', hasta)
    if (idObra) legQ = legQ.eq('id_obra', parseInt(idObra))
    const { data: legajosData } = await legQ

    const idsLegajos = (legajosData || []).map((l: any) => l.id)
    if (idsLegajos.length === 0) { setFilas([]); setCargando(false); setConsultado(true); return }

    // Feriados del período (filtrando por excepción empresa)
    const { data: ferBase } = await supabase
      .from('feriados')
      .select('id, fecha, descripcion')
      .eq('activo', true)
      .gte('fecha', desde)
      .lte('fecha', hasta)

    let feriadosEfectivos: { id: number; fecha: string; descripcion: string }[] = []
    if (ferBase && ferBase.length > 0) {
      const { data: excepciones } = await supabase
        .from('feriados_empresa')
        .select('id_feriado, trabaja')
        .eq('id_empresa', empresaActiva.id)
        .in('id_feriado', ferBase.map((f: any) => f.id))
      const trabajaIds = new Set((excepciones || []).filter((e: any) => e.trabaja).map((e: any) => e.id_feriado))
      feriadosEfectivos = ferBase.filter((f: any) => !trabajaIds.has(f.id))
    }
    const feriadosFechas = new Set(feriadosEfectivos.map(f => f.fecha))
    setFeriadosDelPeriodo(feriadosEfectivos)

    // Novedades del período
    let novQ = supabase
      .from('novedades_diarias')
      .select('id, id_legajo, fecha, hs_normales, hs_extra_50, hs_extra_100, hs_nocturnas')
      .eq('id_empresa', empresaActiva.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .in('id_legajo', idsLegajos)
    if (idObra) novQ = novQ.eq('id_obra', parseInt(idObra))
    const { data: novedades } = await novQ

    const idsNovedades = (novedades || []).map((n: any) => n.id)

    // Novedades adicionales + ausencias + vacaciones + banco de horas en paralelo
    const [
      { data: novsAdics },
      { data: ausencias },
      { data: vacaciones },
      { data: bhMovs },
    ] = await Promise.all([
      idsNovedades.length > 0
        ? supabase.from('novedades_adicionales').select('id_novedad, id_adicional, cantidad').in('id_novedad', idsNovedades)
        : { data: [] },
      supabase.from('ausencias_periodo')
        .select('id_legajo, fecha_desde, fecha_hasta, observacion, tipos_ausencia(id, codigo, descripcion, cuenta_dias_corridos)')
        .eq('id_empresa', empresaActiva.id)
        .in('id_legajo', idsLegajos)
        .lte('fecha_desde', hasta)
        .gte('fecha_hasta', desde),
      supabase.from('vacaciones_periodo')
        .select('id_legajo, fecha_desde, fecha_hasta')
        .eq('id_empresa', empresaActiva.id)
        .in('id_legajo', idsLegajos)
        .lte('fecha_desde', hasta)
        .gte('fecha_hasta', desde),
      idsNovedades.length > 0
        ? supabase.from('banco_horas_movimientos')
            .select('novedad_diaria_id, id_legajo, horas_reales, horas, recargo_tipo')
            .in('novedad_diaria_id', idsNovedades)
            .eq('tipo', 'acreditacion')
        : { data: [] },
    ])

    // Tipos de ausencia que aparecen en el período
    const tiposMap = new Map<number, TipoAusencia>()
    for (const aus of (ausencias || [])) {
      const t = (aus as any).tipos_ausencia
      if (t && !tiposMap.has(t.id)) tiposMap.set(t.id, t)
    }
    const tiposPresentes = Array.from(tiposMap.values())
    setTiposEnPeriodo(tiposPresentes)

    // Adicionales que aparecen en el período
    const adicsIds = new Set((novsAdics || []).map((na: any) => na.id_adicional))
    const adicsPresentes = adicionalesFiltrados.filter(a => adicsIds.has(a.id))
    setAdicionalesEnPeriodo(adicsPresentes)

    // Armar resumen por legajo
    const resumenMap = new Map<number, FilaResumen>()

    for (const leg of (legajosData || [])) {
      resumenMap.set(leg.id, {
        idLegajo: leg.id,
        nroLegajo: leg.nro_legajo,
        codigoExterno: (leg as any).codigo_externo || undefined,
        apellido: leg.apellido,
        nombre: leg.nombre,
        obra: (leg as any).obras?.nombre || '—',
        hs_normales: 0, hs_extra_50: 0, hs_extra_100: 0, hs_nocturnas: 0, hs_bh_50: 0, hs_bh_100: 0,
        adicionales: {}, ausencias: {}, vacaciones: 0,
        feriados: 0,
      })
    }

    // Sets de novedad_diaria_id que tienen BH (para excluir de extra)
    const bhNovsBH50 = new Set<number>()
    const bhNovsBH100 = new Set<number>()
    for (const bh of (bhMovs || [])) {
      if ((bh as any).recargo_tipo === '50%') bhNovsBH50.add((bh as any).novedad_diaria_id)
      if ((bh as any).recargo_tipo === '100%') bhNovsBH100.add((bh as any).novedad_diaria_id)
    }

    // Sumar horas (excluye días banco de horas de hs_extra)
    for (const nov of (novedades || [])) {
      const fila = resumenMap.get(nov.id_legajo)
      if (!fila) continue
      fila.hs_normales += nov.hs_normales || 0
      if (!bhNovsBH50.has(nov.id)) fila.hs_extra_50 += nov.hs_extra_50 || 0
      if (!bhNovsBH100.has(nov.id)) fila.hs_extra_100 += nov.hs_extra_100 || 0
      fila.hs_nocturnas += nov.hs_nocturnas || 0
    }

    // Sumar banco de horas
    for (const bh of (bhMovs || [])) {
      const idLeg = (bh as any).id_legajo
      const fila = resumenMap.get(idLeg)
      if (!fila) continue
      const hs = Number((bh as any).horas_reales) || Number((bh as any).horas) || 0
      if ((bh as any).recargo_tipo === '50%') fila.hs_bh_50 += hs
      if ((bh as any).recargo_tipo === '100%') fila.hs_bh_100 += hs
    }

    // Sumar adicionales
    const novByLegajo = new Map<number, number[]>() // id_legajo -> [id_novedad]
    for (const nov of (novedades || [])) {
      if (!novByLegajo.has(nov.id_legajo)) novByLegajo.set(nov.id_legajo, [])
      novByLegajo.get(nov.id_legajo)!.push(nov.id)
    }
    for (const na of (novsAdics || [])) {
      for (const [idLegajo, ids] of novByLegajo) {
        if (ids.includes((na as any).id_novedad)) {
          const fila = resumenMap.get(idLegajo)
          if (!fila) continue
          fila.adicionales[(na as any).id_adicional] = (fila.adicionales[(na as any).id_adicional] || 0) + (na as any).cantidad
        }
      }
    }

    // Contar ausencias por tipo (respetando cuenta_dias_corridos)
    // FRANCO_BH: acumula horas de observacion en lugar de días
    for (const aus of (ausencias || [])) {
      const tipo = (aus as any).tipos_ausencia
      if (!tipo) continue
      const fila = resumenMap.get(aus.id_legajo)
      if (!fila) continue
      if (tipo.codigo === 'FRANCO_BH') {
        const hs = parseFloat((aus as any).observacion) || 0
        fila.ausencias[tipo.id] = (fila.ausencias[tipo.id] || 0) + hs
      } else {
        const plantillaId = getPlantillaId(aus.id_legajo, legajosData || [])
        const cuentaCorridos: boolean = tipo.cuenta_dias_corridos ?? false
        const diasAus = dias.filter(d =>
          aus.fecha_desde <= d && aus.fecha_hasta >= d &&
          (cuentaCorridos ? true : esDiaLaboral(d, plantillaId))
        ).length
        fila.ausencias[tipo.id] = (fila.ausencias[tipo.id] || 0) + diasAus
      }
    }

    // Contar vacaciones (días corridos)
    for (const vac of (vacaciones || [])) {
      const fila = resumenMap.get(vac.id_legajo)
      if (!fila) continue
      fila.vacaciones += dias.filter(d => vac.fecha_desde <= d && vac.fecha_hasta >= d).length
    }

    // Contar feriados por empleado (excluir días con ausencia o vacaciones)
    for (const [idLegajo, fila] of resumenMap) {
      fila.feriados = dias.filter(d => {
        if (!feriadosFechas.has(d)) return false
        const tieneAus = (ausencias || []).some((a: any) => a.id_legajo === idLegajo && a.fecha_desde <= d && a.fecha_hasta >= d)
        const tieneVac = (vacaciones || []).some((v: any) => v.id_legajo === idLegajo && v.fecha_desde <= d && v.fecha_hasta >= d)
        return !tieneAus && !tieneVac
      }).length
    }

    setFilas(Array.from(resumenMap.values()).sort((a, b) => a.apellido.localeCompare(b.apellido)))
    setCargando(false)
    setConsultado(true)
  }

  function exportarExcel() {
    if (!filas.length) return

    const obraLabel = idObra ? obrasFiltradas.find(o => o.id === parseInt(idObra))?.nombre || '' : 'Todas las obras'
    const periodoLabel = `${MESES[parseInt(mes) - 1]} ${anio}${periodo === '1' ? ' - 1ª quincena' : periodo === '2' ? ' - 2ª quincena' : ' - mes completo'}`

    // Encabezados
    const headers = [
      'Legajo', 'Cód. externo', 'Apellido', 'Nombre', 'Obra',
      'Hs. Normales', 'Hs. Extra 50%', 'Hs. Extra 100%', 'Hs. Nocturnas', 'Hs. Banco 50%', 'Hs. Banco 100%',
      ...adicionalesEnPeriodo.map(a => a.descripcion),
      ...tiposEnPeriodo.map(t => `${t.descripcion} (${t.cuenta_dias_corridos ? 'corridos' : 'hábiles'})`),
      'Vacaciones', 'Feriados',
    ]

    // Filas
    const rows = filas.map(f => [
      String(f.nroLegajo).padStart(4, '0'),
      f.codigoExterno || '',
      f.apellido,
      f.nombre,
      f.obra,
      f.hs_normales,
      f.hs_extra_50,
      f.hs_extra_100,
      f.hs_nocturnas,
      f.hs_bh_50,
      f.hs_bh_100,
      ...adicionalesEnPeriodo.map(a => f.adicionales[a.id] || 0),
      ...tiposEnPeriodo.map(t => f.ausencias[t.id] || 0),
      f.vacaciones,
      f.feriados,
    ])

    // Fila de totales
    const totales = [
      '', '', 'TOTAL', '', '',
      filas.reduce((s, f) => s + f.hs_normales, 0),
      filas.reduce((s, f) => s + f.hs_extra_50, 0),
      filas.reduce((s, f) => s + f.hs_extra_100, 0),
      filas.reduce((s, f) => s + f.hs_nocturnas, 0),
      filas.reduce((s, f) => s + f.hs_bh_50, 0),
      filas.reduce((s, f) => s + f.hs_bh_100, 0),
      ...adicionalesEnPeriodo.map(a => filas.reduce((s, f) => s + (f.adicionales[a.id] || 0), 0)),
      ...tiposEnPeriodo.map(t => filas.reduce((s, f) => s + (f.ausencias[t.id] || 0), 0)),
      filas.reduce((s, f) => s + f.vacaciones, 0),
      filas.reduce((s, f) => s + f.feriados, 0),
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      [`Novedades — ${obraLabel} — ${periodoLabel}`],
      [],
      headers,
      ...rows,
      [],
      totales,
    ])

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 24 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      ...adicionalesEnPeriodo.map(() => ({ wch: 14 })),
      ...tiposEnPeriodo.map(() => ({ wch: 18 })),
      { wch: 12 }, { wch: 10 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Novedades')

    // Hoja feriados si hay
    if (feriadosDelPeriodo.length > 0) {
      const wsFer = XLSX.utils.aoa_to_sheet([
        ['Feriados del período'],
        ['Fecha', 'Descripción'],
        ...feriadosDelPeriodo.map(f => [f.fecha, f.descripcion]),
      ])
      wsFer['!cols'] = [{ wch: 14 }, { wch: 40 }]
      XLSX.utils.book_append_sheet(wb, wsFer, 'Feriados')
    }

    const nombreArchivo = `novedades_${obraLabel.replace(/\s+/g, '_')}_${anio}${mes}_q${periodo}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
  }

  const periodoLabel = `${MESES[parseInt(mes) - 1]} ${anio}${periodo === '1' ? ' — 1ª quincena' : periodo === '2' ? ' — 2ª quincena' : ' — mes completo'}`

  const totalFilas = (key: 'hs_normales' | 'hs_extra_50' | 'hs_extra_100' | 'hs_nocturnas' | 'hs_bh_50' | 'hs_bh_100' | 'vacaciones' | 'feriados') =>
    filas.reduce((s, f) => s + f[key], 0)

  if (!empresaActiva) {
    return <div style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>Exportar novedades</h1>
        <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{empresaActiva.razon_social}</span>
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '16px 20px', display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Mes</label>
          <select value={mes} onChange={e => { setMes(e.target.value); setConsultado(false) }} style={selStyle}>
            {MESES.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Año</label>
          <select value={anio} onChange={e => { setAnio(e.target.value); setConsultado(false) }} style={selStyle}>
            {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Período</label>
          <select value={periodo} onChange={e => { setPeriodo(e.target.value); setConsultado(false) }} style={selStyle}>
            <option value="1">1ª quincena (1–15)</option>
            <option value="2">2ª quincena (16–fin)</option>
            <option value="mes">Mes completo</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Obra</label>
          <select value={idObra} onChange={e => { setIdObra(e.target.value); setConsultado(false) }} style={{ ...selStyle, width: '100%' }}>
            <option value="">Todas las obras</option>
            {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <button
          onClick={consultar}
          disabled={cargando}
          style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 18px', fontSize: '13px', cursor: 'pointer', opacity: cargando ? 0.6 : 1, whiteSpace: 'nowrap' as const }}
        >
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {/* Link configuración */}
      <div style={{ marginBottom: '20px', textAlign: 'right' }}>
        <Link href="/exportacion-config" style={{ fontSize: '12px', color: 'var(--c-blue)', textDecoration: 'none' }}>
          Configurar códigos →
        </Link>
      </div>

      {/* Resumen */}
      {consultado && filas.length === 0 && (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          No hay novedades registradas para {periodoLabel}.
        </div>
      )}

      {consultado && filas.length > 0 && (
        <>
          {/* Header resumen */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--c-text-primary)' }}>{periodoLabel}</span>
              <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)', marginLeft: '12px' }}>{filas.length} empleado{filas.length !== 1 ? 's' : ''}</span>
              {feriadosDelPeriodo.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--c-orange)', marginLeft: '12px' }}>
                  {feriadosDelPeriodo.length} feriado{feriadosDelPeriodo.length !== 1 ? 's' : ''}: {feriadosDelPeriodo.map(f => f.descripcion).join(', ')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
              <button
                onClick={exportarExcel}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--c-green-bg)', border: '0.5px solid var(--c-green)40', color: 'var(--c-green)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                <Download size={14} /> Resumen Excel
              </button>
              <button
                onClick={() => exportarLiquidacion('excel')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--c-blue-bg)', border: '0.5px solid var(--c-blue)40', color: 'var(--c-blue)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                <Download size={14} /> Liquidación Excel
              </button>
              <button
                onClick={() => exportarLiquidacion('txt')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--c-row-orange)', border: '0.5px solid var(--c-orange)40', color: 'var(--c-orange)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                <FileText size={14} /> Liquidación TXT
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div style={{ overflowX: 'auto', background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' as const }}>
              <thead>
                <tr style={{ background: 'var(--c-base)', borderBottom: '0.5px solid var(--c-border)' }}>
                  <th style={thStyle}>Legajo</th>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: '160px' }}>Empleado</th>
                  {!idObra && <th style={{ ...thStyle, textAlign: 'left', minWidth: '140px' }}>Obra</th>}
                  <th style={thStyle}>Hs. Norm.</th>
                  <th style={thStyle}>Hs. 50%</th>
                  <th style={thStyle}>Hs. 100%</th>
                  <th style={thStyle}>Hs. Noct.</th>
                  <th style={{ ...thStyle, color: 'var(--c-purple)' }}>Banco 50%</th>
                  <th style={{ ...thStyle, color: 'var(--c-purple)' }}>Banco 100%</th>
                  {adicionalesEnPeriodo.map(a => (
                    <th key={a.id} style={{ ...thStyle, color: 'var(--c-blue)' }}>{a.descripcion}</th>
                  ))}
                  {tiposEnPeriodo.map(t => (
                    <th key={t.id} style={{ ...thStyle, color: 'var(--c-red)' }}>
                      {t.descripcion}
                      <span style={{ color: 'var(--c-text-muted)', fontWeight: 400, marginLeft: '4px' }}>
                        ({t.cuenta_dias_corridos ? 'corr.' : 'háb.'})
                      </span>
                    </th>
                  ))}
                  <th style={{ ...thStyle, color: 'var(--c-green)' }}>Vacaciones</th>
                  <th style={{ ...thStyle, color: 'var(--c-orange)' }}>Feriados</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, i) => (
                  <tr key={fila.idLegajo} style={{ borderBottom: i < filas.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                    <td style={{ ...tdStyle, color: 'var(--c-text-muted)' }}>
                      {String(fila.nroLegajo).padStart(4, '0')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 500, color: 'var(--c-text-primary)' }}>
                      {fila.apellido}, {fila.nombre}
                    </td>
                    {!idObra && <td style={{ ...tdStyle, textAlign: 'left', color: 'var(--c-text-secondary)' }}>{fila.obra}</td>}
                    <td style={tdStyle}>{fila.hs_normales || <span style={{ color: 'var(--c-text-muted)' }}>—</span>}</td>
                    <td style={{ ...tdStyle, color: fila.hs_extra_50 > 0 ? 'var(--c-blue)' : 'var(--c-text-muted)' }}>{fila.hs_extra_50 || '—'}</td>
                    <td style={{ ...tdStyle, color: fila.hs_extra_100 > 0 ? 'var(--c-blue)' : 'var(--c-text-muted)' }}>{fila.hs_extra_100 || '—'}</td>
                    <td style={{ ...tdStyle, color: fila.hs_nocturnas > 0 ? 'var(--c-blue)' : 'var(--c-text-muted)' }}>{fila.hs_nocturnas || '—'}</td>
                    <td style={{ ...tdStyle, color: fila.hs_bh_50 > 0 ? 'var(--c-purple)' : 'var(--c-text-muted)' }}>{fila.hs_bh_50 || '—'}</td>
                    <td style={{ ...tdStyle, color: fila.hs_bh_100 > 0 ? 'var(--c-purple)' : 'var(--c-text-muted)' }}>{fila.hs_bh_100 || '—'}</td>
                    {adicionalesEnPeriodo.map(a => (
                      <td key={a.id} style={{ ...tdStyle, color: fila.adicionales[a.id] > 0 ? 'var(--c-blue)' : 'var(--c-text-muted)' }}>
                        {fila.adicionales[a.id] || '—'}
                      </td>
                    ))}
                    {tiposEnPeriodo.map(t => (
                      <td key={t.id} style={{ ...tdStyle, color: fila.ausencias[t.id] > 0 ? (t.codigo === 'FRANCO_BH' ? 'var(--c-purple)' : 'var(--c-red)') : 'var(--c-text-muted)' }}>
                        {fila.ausencias[t.id] ? `${fila.ausencias[t.id]}${t.codigo === 'FRANCO_BH' ? 'h' : 'd'}` : '—'}
                      </td>
                    ))}
                    <td style={{ ...tdStyle, color: fila.vacaciones > 0 ? 'var(--c-green)' : 'var(--c-text-muted)' }}>
                      {fila.vacaciones ? `${fila.vacaciones}d` : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: fila.feriados > 0 ? 'var(--c-orange)' : 'var(--c-text-muted)' }}>
                      {fila.feriados ? `${fila.feriados}d` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Fila totales */}
              <tfoot>
                <tr style={{ borderTop: '0.5px solid var(--c-border)', background: 'var(--c-base)' }}>
                  <td colSpan={!idObra ? 3 : 2} style={{ padding: '8px 12px', color: 'var(--c-text-secondary)', fontSize: '12px', fontWeight: 600 }}>TOTAL</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--c-text-primary)' }}>{totalFilas('hs_normales')}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: totalFilas('hs_extra_50') > 0 ? 'var(--c-blue)' : 'var(--c-text-muted)' }}>{totalFilas('hs_extra_50') || '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: totalFilas('hs_extra_100') > 0 ? 'var(--c-blue)' : 'var(--c-text-muted)' }}>{totalFilas('hs_extra_100') || '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: totalFilas('hs_nocturnas') > 0 ? 'var(--c-blue)' : 'var(--c-text-muted)' }}>{totalFilas('hs_nocturnas') || '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: totalFilas('hs_bh_50') > 0 ? 'var(--c-purple)' : 'var(--c-text-muted)' }}>{totalFilas('hs_bh_50') || '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: totalFilas('hs_bh_100') > 0 ? 'var(--c-purple)' : 'var(--c-text-muted)' }}>{totalFilas('hs_bh_100') || '—'}</td>
                  {adicionalesEnPeriodo.map(a => {
                    const t = filas.reduce((s, f) => s + (f.adicionales[a.id] || 0), 0)
                    return <td key={a.id} style={{ ...tdStyle, fontWeight: 700, color: t > 0 ? 'var(--c-blue)' : 'var(--c-text-muted)' }}>{t || '—'}</td>
                  })}
                  {tiposEnPeriodo.map(t => {
                    const tot = filas.reduce((s, f) => s + (f.ausencias[t.id] || 0), 0)
                    const esFranco = t.codigo === 'FRANCO_BH'
                    return <td key={t.id} style={{ ...tdStyle, fontWeight: 700, color: tot > 0 ? (esFranco ? 'var(--c-purple)' : 'var(--c-red)') : 'var(--c-text-muted)' }}>{tot ? `${tot}${esFranco ? 'h' : 'd'}` : '—'}</td>
                  })}
                  <td style={{ ...tdStyle, fontWeight: 700, color: totalFilas('vacaciones') > 0 ? 'var(--c-green)' : 'var(--c-text-muted)' }}>{totalFilas('vacaciones') ? `${totalFilas('vacaciones')}d` : '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: totalFilas('feriados') > 0 ? 'var(--c-orange)' : 'var(--c-text-muted)' }}>{totalFilas('feriados') ? `${totalFilas('feriados')}d` : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const selStyle = {
  padding: '7px 10px', borderRadius: '6px',
  background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
  color: 'var(--c-text-primary)', fontSize: '13px',
}
const thStyle = {
  padding: '8px 12px', color: 'var(--c-text-secondary)', fontWeight: 500,
  textAlign: 'center' as const, fontSize: '12px',
}
const tdStyle = {
  padding: '8px 12px', textAlign: 'center' as const, color: 'var(--c-text-primary)',
}
