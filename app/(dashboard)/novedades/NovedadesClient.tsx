"use client"

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type Legajo = {
  id: number
  id_empresa: number
  nro_legajo: number
  apellido: string
  nombre: string
  id_obra?: number
  id_categoria?: number
  id_plantilla?: number
  fecha_ingreso?: string
}

type Obra = {
  id: number
  id_empresa: number
  nombre: string
}

type Adicional = {
  id: number
  id_empresa: number
  codigo: string
  descripcion: string
  aplica_por: string
}

type AdicionalFila = {
  id_adicional: number
  descripcion: string
  cantidad: string
}

type FilaNovedad = {
  id_legajo: number
  apellido: string
  nombre: string
  nro_legajo: number
  hs_normales: string
  hs_extra_50: string
  hs_extra_100: string
  hs_nocturnas: string
  ausente: boolean
  id_tipo_ausencia: number | null
  observaciones: string
  adicionales: AdicionalFila[]
  mostrarAdicionales: boolean
  ausenciaActiva?: { codigo: string, descripcion: string } | null
  enVacaciones?: boolean
}

type Plantilla = {
  id: number
  lunes: number
  martes: number
  miercoles: number
  jueves: number
  viernes: number
  sabado: number
  domingo: number
}

type Categoria = {
  id: number
  id_plantilla?: number
}



export default function NovedadesClient({
  legajos, obras, adicionales, plantillas, categorias, tiposAusencia
}: {
  legajos: Legajo[]
  obras: Obra[]
  adicionales: Adicional[]
  plantillas: Plantilla[]
  categorias: Categoria[]
  tiposAusencia: { id: number, codigo: string, descripcion: string }[]
}) {
  const router = useRouter()
  const { empresaActiva, rol, obrasJefe } = useEmpresa()

  const [idObra, setIdObra] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [filas, setFilas] = useState<FilaNovedad[]>([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [feriadoDelDia, setFeriadoDelDia] = useState<{ descripcion: string, tipo: string } | null>(null)

  const obrasFiltradas = obras.filter(o =>
    o.id_empresa === empresaActiva?.id &&
    (rol !== 'JEFE_OBRA' || obrasJefe.includes(o.id))
  )
  const adicionalesFiltrados = adicionales.filter(a => a.id_empresa === empresaActiva?.id)
  

  const inputStyle = {
    padding: '6px 8px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px', width: '70px',
    textAlign: 'center' as const,
  }

  function getHorasPlantilla(emp: Legajo, diaSemana: number): string {
    // Buscar plantilla del legajo o de su categoría
    let plantillaId = emp.id_plantilla
    if (!plantillaId && emp.id_categoria) {
      const cat = categorias.find(c => c.id === emp.id_categoria)
      plantillaId = cat?.id_plantilla
    }

    if (!plantillaId) return '8' // default

    const plantilla = plantillas.find(p => p.id === plantillaId)
    if (!plantilla) return '8'

    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    return String(plantilla[dias[diaSemana] as keyof Plantilla] || 0)
  }


  async function cargarEmpleados() {
    if (!idObra || !fecha || !empresaActiva) return
    setCargando(true)
    setError('')
    setMensaje('')

    const supabase = createClient()

    // Buscar empleados en esta obra en la fecha indicada vía historico
    const legajosEmpresa = legajos.filter(l => l.id_empresa === empresaActiva.id)

    const [{ data: historico }, { data: historicoAlguno }] = await Promise.all([
      supabase
        .from('legajos_historico_obras')
        .select('id_legajo')
        .eq('id_obra', parseInt(idObra))
        .lte('fecha_desde', fecha)
        .or(`fecha_hasta.is.null,fecha_hasta.gte.${fecha}`),
      supabase
        .from('legajos_historico_obras')
        .select('id_legajo')
        .in('id_legajo', legajosEmpresa.map(l => l.id)),
    ])

    const idsHistorico = new Set((historico || []).map((h: any) => h.id_legajo))
    // Legajos que tienen algún registro en historico → se gobiernan por historico (fechas exactas)
    // Legajos sin ningún historico → datos legacy, se usa id_obra directamente
    const idsConHistorico = new Set((historicoAlguno || []).map((h: any) => h.id_legajo))

    const empleadosObra = legajosEmpresa.filter(
      l => (!l.fecha_ingreso || l.fecha_ingreso <= fecha) &&
           (
             idsHistorico.has(l.id) ||
             (!idsConHistorico.has(l.id) && l.id_obra === parseInt(idObra))
           )
    )

    if (empleadosObra.length === 0) {
      setError('No hay empleados activos asignados a esta obra.')
      setCargando(false)
      return
    }

    // Verificar si el día es feriado para esta empresa
    const { data: feriadoData } = await supabase
      .from('feriados')
      .select('id, descripcion, tipo')
      .eq('fecha', fecha)
      .eq('activo', true)
      .maybeSingle()

    let esFeriado = false
    if (feriadoData) {
      const { data: excepcion } = await supabase
        .from('feriados_empresa')
        .select('trabaja')
        .eq('id_empresa', empresaActiva.id)
        .eq('id_feriado', feriadoData.id)
        .maybeSingle()
      esFeriado = !excepcion?.trabaja
      setFeriadoDelDia(esFeriado ? { descripcion: feriadoData.descripcion, tipo: feriadoData.tipo } : null)
    } else {
      setFeriadoDelDia(null)
    }

    const idsLegajos = empleadosObra.map(e => e.id)

    const { data: ausenciasActivas } = await supabase
      .from('ausencias_periodo')
      .select('*, tipos_ausencia(codigo, descripcion)')
      .eq('id_empresa', empresaActiva.id)
      .in('id_legajo', idsLegajos)
      .lte('fecha_desde', fecha)
      .gte('fecha_hasta', fecha)

    const { data: vacacionesActivas } = await supabase
      .from('vacaciones_periodo')
      .select('*')
      .eq('id_empresa', empresaActiva.id)
      .in('id_legajo', idsLegajos)
      .lte('fecha_desde', fecha)
      .gte('fecha_hasta', fecha)

    const { data: existentes } = await supabase
      .from('novedades_diarias')
      .select('*, id_tipo_ausencia')
      .eq('id_empresa', empresaActiva.id)
      .eq('id_obra', parseInt(idObra))
      .eq('fecha', fecha)

    const idsNovedades = existentes?.map(n => n.id) || []
    const { data: adicionalesExistentes } = idsNovedades.length > 0
      ? await supabase
          .from('novedades_adicionales')
          .select('*, adicionales(descripcion)')
          .in('id_novedad', idsNovedades)
      : { data: [] }

    const diaSemana = new Date(fecha + 'T00:00:00').getDay()

    const nuevasFilas: FilaNovedad[] = empleadosObra.map(emp => {
      const existente = existentes?.find(n => n.id_legajo === emp.id)
      const ausenciaDelDia = ausenciasActivas?.find(a => a.id_legajo === emp.id)
      const vacacionDelDia = vacacionesActivas?.find(v => v.id_legajo === emp.id)
      const tieneAusenciaOVacacion = !existente && (!!ausenciaDelDia || !!vacacionDelDia)
      const aplicaFeriado = !existente && esFeriado && !ausenciaDelDia && !vacacionDelDia
      const tieneAusenciaAutomatica = tieneAusenciaOVacacion || aplicaFeriado

      const adicionalesDelEmpleado: AdicionalFila[] = existente
        ? (adicionalesExistentes || [])
            .filter((a: any) => a.id_novedad === existente.id)
            .map((a: any) => ({
              id_adicional: a.id_adicional,
              descripcion: a.adicionales?.descripcion || '',
              cantidad: String(a.cantidad),
            }))
        : []

      return {
        id_legajo: emp.id,
        apellido: emp.apellido,
        nombre: emp.nombre,
        nro_legajo: emp.nro_legajo,
        hs_normales: existente ? String(existente.hs_normales) : tieneAusenciaAutomatica ? '0' : getHorasPlantilla(emp, diaSemana),
        hs_extra_50: existente ? String(existente.hs_extra_50) : '0',
        hs_extra_100: existente ? String(existente.hs_extra_100) : '0',
        hs_nocturnas: existente ? String(existente.hs_nocturnas) : '0',
        ausente: existente ? existente.ausente : tieneAusenciaAutomatica,
        id_tipo_ausencia: existente ? (existente.id_tipo_ausencia || null) : null,
        observaciones: existente ? (existente.observaciones || '') : '',
        adicionales: adicionalesDelEmpleado,
        mostrarAdicionales: false,
        ausenciaActiva: ausenciaDelDia
          ? { codigo: ausenciaDelDia.tipos_ausencia.codigo, descripcion: ausenciaDelDia.tipos_ausencia.descripcion }
          : null,
        enVacaciones: !!vacacionDelDia,
      }
    })

    setFilas(nuevasFilas)
    setCargando(false)
  }

  function agregarAdicional(indexFila: number, idAdicional: string) {
  if (!idAdicional) return
  const adicional = adicionalesFiltrados.find(a => a.id === parseInt(idAdicional))
  if (!adicional) return

  const nuevasFilas = [...filas]
  const yaExiste = nuevasFilas[indexFila].adicionales.find(a => a.id_adicional === adicional.id)
  if (yaExiste) return

  nuevasFilas[indexFila].adicionales.push({
    id_adicional: adicional.id,
    descripcion: adicional.descripcion,
    cantidad: '1',
  })
  setFilas(nuevasFilas)
}

  function quitarAdicional(indexFila: number, idAdicional: number) {
    const nuevasFilas = [...filas]
    nuevasFilas[indexFila].adicionales = nuevasFilas[indexFila].adicionales.filter(
      a => a.id_adicional !== idAdicional
    )
    setFilas(nuevasFilas)
  }

  function actualizarCantidadAdicional(indexFila: number, idAdicional: number, cantidad: string) {
    const nuevasFilas = [...filas]
    const adicional = nuevasFilas[indexFila].adicionales.find(a => a.id_adicional === idAdicional)
    if (adicional) adicional.cantidad = cantidad
    setFilas(nuevasFilas)
  }
  
  function actualizarFila(index: number, campo: keyof FilaNovedad, valor: string | boolean) {
    const nuevasFilas = [...filas]
    nuevasFilas[index] = { ...nuevasFilas[index], [campo]: valor }

    // Si marca ausente, poner todas las horas en 0
    if (campo === 'ausente' && valor === true) {
      nuevasFilas[index].hs_normales = '0'
      nuevasFilas[index].hs_extra_50 = '0'
      nuevasFilas[index].hs_extra_100 = '0'
      nuevasFilas[index].hs_nocturnas = '0'
    }
    // Si desmarca ausente, limpiar tipo de ausencia
    if (campo === 'ausente' && valor === false) {
      nuevasFilas[index].id_tipo_ausencia = null
    }

    setFilas(nuevasFilas)
  }

  async function guardar() {
    if (!empresaActiva || !idObra || filas.length === 0) return
    setGuardando(true)
    setError('')
    setMensaje('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let errores = 0

    for (const fila of filas) {
      const datos = {
        id_empresa: empresaActiva.id,
        id_legajo: fila.id_legajo,
        id_obra: parseInt(idObra),
        fecha,
        hs_normales: parseFloat(fila.hs_normales) || 0,
        hs_extra_50: parseFloat(fila.hs_extra_50) || 0,
        hs_extra_100: parseFloat(fila.hs_extra_100) || 0,
        hs_nocturnas: parseFloat(fila.hs_nocturnas) || 0,
        ausente: fila.ausente,
        id_tipo_ausencia: fila.ausente ? (fila.id_tipo_ausencia || null) : null,
        observaciones: fila.observaciones || null,
        id_usuario_carga: user?.id || null,
        updated_at: new Date().toISOString(),
      }

      const { data: novedad, error } = await supabase
        .from('novedades_diarias')
        .upsert(datos, { onConflict: 'id_empresa,id_legajo,id_obra,fecha' })
        .select()
        .single()

      if (error) { errores++; continue }

      // Guardar adicionales: siempre borrar los anteriores y reinsertar
      if (novedad) {
        await supabase
          .from('novedades_adicionales')
          .delete()
          .eq('id_novedad', novedad.id)

        for (const adicional of fila.adicionales) {
          const { error: errAdic } = await supabase
            .from('novedades_adicionales')
            .insert({
              id_novedad: novedad.id,
              id_adicional: adicional.id_adicional,
              cantidad: parseFloat(adicional.cantidad) || 1,
            })
          if (errAdic) errores++
        }
      }
    }

    setGuardando(false)

    if (errores > 0) {
      setError(`Hubo ${errores} error(es) al guardar.`)
    } else {
      setMensaje(`Novedades del ${formatFecha(fecha)} guardadas correctamente.`)
    }
  }

  if (!empresaActiva) {
    return <div style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  function getDiaSemana(fecha: string): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const d = new Date(fecha + 'T00:00:00')
    return dias[d.getDay()]
  }

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>Novedades</h1>
        <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{empresaActiva.razon_social}</span>
      </div>

      {/* Selector de obra y fecha */}
      <div style={{
        background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
        borderRadius: '8px', padding: '16px 20px',
        display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '20px',
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Obra *</label>
          <select
            value={idObra}
            onChange={(e) => { setIdObra(e.target.value); setFilas([]) }}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: '6px',
              background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
              color: 'var(--c-text-primary)', fontSize: '13px',
            }}
          >
            <option value="">Seleccionar obra...</option>
            {obrasFiltradas.map(o => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Fecha *</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="date"
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); setFilas([]) }}
              style={{
                padding: '7px 10px', borderRadius: '6px',
                background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-primary)', fontSize: '13px',
              }}
            />
            {fecha && (
              <span style={{
                fontSize: '13px', fontWeight: 500,
                color: feriadoDelDia ? 'var(--c-orange-alt)' : ['Sábado', 'Domingo'].includes(getDiaSemana(fecha)) ? 'var(--c-orange)' : 'var(--c-text-secondary)',
              }}>
                {getDiaSemana(fecha)}
                {feriadoDelDia && (
                  <span style={{
                    marginLeft: '8px', fontSize: '12px', fontWeight: 400,
                    background: 'rgba(224,123,57,0.15)', color: 'var(--c-orange-alt)',
                    padding: '2px 8px', borderRadius: '4px',
                  }}>
                    Feriado: {feriadoDelDia.descripcion}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        

        <button
          onClick={cargarEmpleados}
          disabled={!idObra || !fecha || cargando}
          style={{
            background: 'var(--c-blue-btn)', color: 'white', border: 'none',
            borderRadius: '6px', padding: '7px 16px',
            fontSize: '13px', cursor: 'pointer',
            opacity: (!idObra || !fecha) ? 0.4 : 1,
          }}
        >
          {cargando ? 'Cargando...' : 'Cargar empleados'}
        </button>
      </div>

      {/* Tabla de novedades */}
      {filas.length > 0 && (
        <>
          <div style={{
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            borderRadius: '8px', overflow: 'hidden', marginBottom: '16px',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500, width: '25%' }}>Empleado</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Normales</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Extra 50%</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Extra 100%</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Nocturnas</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Ausente</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Tipo ausencia</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Observaciones</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Adicionales</th>
                </tr>
              </thead>
              <tbody>
  {filas.map((fila, i) => (
    <Fragment key={fila.id_legajo}>
      <tr style={{
        borderBottom: fila.mostrarAdicionales ? 'none' : (i < filas.length - 1 ? '0.5px solid var(--c-elevated)' : 'none'),
        background: fila.enVacaciones
          ? 'rgba(88,166,255,0.05)'
          : fila.ausenciaActiva || fila.ausente
          ? 'rgba(248,81,73,0.05)'
          : feriadoDelDia
          ? 'rgba(224,123,57,0.05)'
          : 'transparent',
      }}>
        {/* Empleado */}
        <td style={{ padding: '8px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div>
              <span style={{ color: 'var(--c-text-primary)', fontWeight: 500 }}>
                {fila.apellido}, {fila.nombre}
              </span>
              <span style={{ color: 'var(--c-text-muted)', fontSize: '11px', marginLeft: '6px' }}>
                #{String(fila.nro_legajo).padStart(4, '0')}
              </span>
            </div>
            {fila.enVacaciones ? (
              <span style={{ background: 'var(--c-blue-bg)', color: 'var(--c-blue)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>VAC</span>
            ) : fila.ausenciaActiva ? (
              <span style={{ background: 'var(--c-red-bg)', color: 'var(--c-red)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}
                title={fila.ausenciaActiva.descripcion}>
                {fila.ausenciaActiva.codigo}
              </span>
            ) : feriadoDelDia ? (
              <span style={{ background: 'rgba(224,123,57,0.15)', color: 'var(--c-orange-alt)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>FER</span>
            ) : null}
          </div>
        </td>

        {/* Horas */}
        <td style={{ padding: '8px', textAlign: 'center' }}>
          <input type="number" value={fila.hs_normales}
            onChange={(e) => actualizarFila(i, 'hs_normales', e.target.value)}
            disabled={fila.ausente} min="0" max="24" step="0.5"
            style={{ ...inputStyle, opacity: fila.ausente ? 0.3 : 1 }} />
        </td>
        <td style={{ padding: '8px', textAlign: 'center' }}>
          <input type="number" value={fila.hs_extra_50}
            onChange={(e) => actualizarFila(i, 'hs_extra_50', e.target.value)}
            disabled={fila.ausente} min="0" max="24" step="0.5"
            style={{ ...inputStyle, opacity: fila.ausente ? 0.3 : 1 }} />
        </td>
        <td style={{ padding: '8px', textAlign: 'center' }}>
          <input type="number" value={fila.hs_extra_100}
            onChange={(e) => actualizarFila(i, 'hs_extra_100', e.target.value)}
            disabled={fila.ausente} min="0" max="24" step="0.5"
            style={{ ...inputStyle, opacity: fila.ausente ? 0.3 : 1 }} />
        </td>
        <td style={{ padding: '8px', textAlign: 'center' }}>
          <input type="number" value={fila.hs_nocturnas}
            onChange={(e) => actualizarFila(i, 'hs_nocturnas', e.target.value)}
            disabled={fila.ausente} min="0" max="24" step="0.5"
            style={{ ...inputStyle, opacity: fila.ausente ? 0.3 : 1 }} />
        </td>
        <td style={{ padding: '8px', textAlign: 'center' }}>
          <input type="checkbox" checked={fila.ausente}
            onChange={(e) => actualizarFila(i, 'ausente', e.target.checked)} />
        </td>
        <td style={{ padding: '8px' }}>
          {fila.ausente && !fila.ausenciaActiva && !fila.enVacaciones ? (
            <select
              value={fila.id_tipo_ausencia ?? ''}
              onChange={(e) => {
                const nuevasFilas = [...filas]
                nuevasFilas[i].id_tipo_ausencia = e.target.value ? parseInt(e.target.value) : null
                setFilas(nuevasFilas)
              }}
              style={{
                padding: '5px 8px', borderRadius: '6px', fontSize: '12px',
                background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-primary)', width: '100%',
              }}
            >
              <option value="">— opcional —</option>
              {tiposAusencia.map(t => (
                <option key={t.id} value={t.id}>{t.codigo} - {t.descripcion}</option>
              ))}
            </select>
          ) : fila.ausenciaActiva ? (
            <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
              {fila.ausenciaActiva.codigo} - {fila.ausenciaActiva.descripcion}
            </span>
          ) : fila.enVacaciones ? (
            <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>Vacaciones</span>
          ) : (
            <span style={{ color: 'var(--c-text-muted)', fontSize: '12px' }}>—</span>
          )}
        </td>
        <td style={{ padding: '8px' }}>
          <input value={fila.observaciones}
            onChange={(e) => actualizarFila(i, 'observaciones', e.target.value)}
            placeholder="Opcional..."
            style={{ ...inputStyle, width: '100%', textAlign: 'left' }} />
        </td>
        <td style={{ padding: '8px', textAlign: 'center' }}>
          <button
            onClick={() => actualizarFila(i, 'mostrarAdicionales', !fila.mostrarAdicionales)}
            style={{
              background: fila.adicionales.length > 0 ? 'var(--c-blue-bg)' : 'transparent',
              border: '0.5px solid var(--c-border)',
              color: fila.adicionales.length > 0 ? 'var(--c-blue)' : 'var(--c-text-secondary)',
              borderRadius: '4px', padding: '3px 8px',
              fontSize: '11px', cursor: 'pointer',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {fila.adicionales.length > 0 ? `${fila.adicionales.length} adic.` : '+ Adic.'}
          </button>
        </td>
      </tr>

      {/* Fila adicionales */}
      {fila.mostrarAdicionales && (
        <tr style={{
          borderBottom: i < filas.length - 1 ? '0.5px solid var(--c-elevated)' : 'none',
          background: 'var(--c-base)',
        }}>
          <td colSpan={9} style={{ padding: '8px 16px 12px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fila.adicionales.map(adic => (
                <div key={adic.id_adicional} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--c-text-primary)', flex: 1 }}>{adic.descripcion}</span>
                  <input
                    type="number" value={adic.cantidad}
                    onChange={(e) => actualizarCantidadAdicional(i, adic.id_adicional, e.target.value)}
                    min="0" step="0.5"
                    style={{ ...inputStyle, width: '60px' }}
                  />
                  <button onClick={() => quitarAdicional(i, adic.id_adicional)} style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--c-red)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px',
                  }}>×</button>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  defaultValue=""
                  onChange={(e) => { agregarAdicional(i, e.target.value); e.target.value = '' }}
                  style={{
                    padding: '5px 8px', borderRadius: '6px',
                    background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
                    color: 'var(--c-text-secondary)', fontSize: '12px',
                  }}
                >
                  <option value="">+ Agregar adicional...</option>
                  {adicionalesFiltrados
                    .filter(a => !fila.adicionales.find(fa => fa.id_adicional === a.id))
                    .map(a => <option key={a.id} value={a.id}>{a.descripcion}</option>)
                  }
                </select>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  ))}
</tbody>
            </table>
          </div>

          {error && <p style={{ color: 'var(--c-red)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
          {mensaje && <p style={{ color: 'var(--c-green)', fontSize: '13px', marginBottom: '12px' }}>{mensaje}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={guardar}
              disabled={guardando}
              style={{
                background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                borderRadius: '6px', padding: '8px 20px',
                fontSize: '13px', cursor: 'pointer',
                opacity: guardando ? 0.6 : 1,
              }}
            >
              {guardando ? 'Guardando...' : `Guardar novedades del ${formatFecha(fecha)}`}
            </button>
          </div>
        </>
      )}
      {filas.length === 0 && idObra && fecha && !cargando && (
        <div style={{
          background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px',
        }}>
          Seleccioná una obra y fecha, luego clickeá "Cargar empleados".
        </div>
      )}
    </div>
  )
}