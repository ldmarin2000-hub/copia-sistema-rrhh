"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../../context/EmpresaContext'
import { formatFecha } from '@/lib/fecha'

type Obra = {
  id: number
  id_empresa: number
  nombre: string
}

type Adicional = {
  id: number
  id_empresa: number
  descripcion: string
}

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
  legajos: { apellido: string, nombre: string, nro_legajo: number }
  obras: { nombre: string }
}

type NovedadAdicional = {
  id_novedad: number
  id_adicional: number
  cantidad: number
}

const TIPOS_HORA = [
  { value: 'todas',       label: 'Todas las horas' },
  { value: 'hs_normales', label: 'Normales' },
  { value: 'hs_extra_50', label: 'Extra 50%' },
  { value: 'hs_extra_100',label: 'Extra 100%' },
  { value: 'hs_nocturnas',label: 'Nocturnas' },
]

export default function ConsultaClient({
  obras, adicionales
}: {
  obras: Obra[]
  adicionales: Adicional[]
}) {
  const { empresaActiva } = useEmpresa()

  const hoy = new Date()
  const mesActual = hoy.getMonth() + 1
  const anioActual = hoy.getFullYear()
  const quincenaActual = hoy.getDate() <= 15 ? '1' : '2'

  const [idObra, setIdObra] = useState('')
  const [mes, setMes] = useState(String(mesActual).padStart(2, '0'))
  const [anio, setAnio] = useState(String(anioActual))
  const [periodo, setPeriodo] = useState(quincenaActual)
  const [tipoHora, setTipoHora] = useState('todas')
  const [idAdicional, setIdAdicional] = useState('')
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [novedadesAdicionales, setNovedadesAdicionales] = useState<NovedadAdicional[]>([])
  const [cargando, setCargando] = useState(false)
  const [buscado, setBuscado] = useState(false)

  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaActiva?.id)
  const adicionalesFiltrados = adicionales.filter(a => a.id_empresa === empresaActiva?.id)

  const selectStyle = {
    padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

  // Calcular rango de fechas
  function getRango() {
    const m = mes.padStart(2, '0')
    const ultimoDia = new Date(parseInt(anio), parseInt(mes), 0).getDate()
    if (periodo === '1') return { desde: `${anio}-${m}-01`, hasta: `${anio}-${m}-15` }
    if (periodo === '2') return { desde: `${anio}-${m}-16`, hasta: `${anio}-${m}-${ultimoDia}` }
    return { desde: `${anio}-${m}-01`, hasta: `${anio}-${m}-${ultimoDia}` }
  }

  // Generar array de días del período
  function getDias() {
    const { desde, hasta } = getRango()
    const dias: string[] = []
    const actual = new Date(desde + 'T00:00:00')
    const fin = new Date(hasta + 'T00:00:00')
    while (actual <= fin) {
      dias.push(actual.toISOString().split('T')[0])
      actual.setDate(actual.getDate() + 1)
    }
    return dias
  }

  async function consultar() {
    if (!empresaActiva) return
    setCargando(true)
    setBuscado(false)

    const supabase = createClient()
    const { desde, hasta } = getRango()

    let query = supabase
      .from('novedades_diarias')
      .select('*, legajos(apellido, nombre, nro_legajo), obras(nombre)')
      .eq('id_empresa', empresaActiva.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha')

    if (idObra) query = query.eq('id_obra', parseInt(idObra))

    const { data } = await query
    const resultado = data || []

    // Si filtra por adicional, traer solo los que tienen ese adicional
    if (idAdicional) {
      const idsNovedades = resultado.map(n => n.id)
      if (idsNovedades.length > 0) {
        const { data: adics } = await supabase
          .from('novedades_adicionales')
          .select('*')
          .in('id_novedad', idsNovedades)
          .eq('id_adicional', parseInt(idAdicional))
        setNovedadesAdicionales(adics || [])
        const idsConAdicional = new Set((adics || []).map((a: any) => a.id_novedad))
        setNovedades(resultado.filter(n => idsConAdicional.has(n.id)))
      } else {
        setNovedades([])
        setNovedadesAdicionales([])
      }
    } else {
      setNovedades(resultado)
      setNovedadesAdicionales([])
    }

    setCargando(false)
    setBuscado(true)
  }

  // Agrupar novedades por empleado
  const empleados = Array.from(
    new Map(novedades.map(n => [n.id_legajo, n.legajos])).entries()
  ).sort((a, b) => a[1].apellido.localeCompare(b[1].apellido))

  const dias = getDias()

  // Obtener valor de horas para una celda
  function getHoras(idLegajo: number, fecha: string): number {
    const nov = novedades.find(n => n.id_legajo === idLegajo && n.fecha === fecha)
    if (!nov) return 0
    if (nov.ausente) return 0
    if (tipoHora === 'todas') return nov.hs_normales + nov.hs_extra_50 + nov.hs_extra_100 + nov.hs_nocturnas
    return nov[tipoHora as keyof Novedad] as number || 0
  }

  function getTotalEmpleado(idLegajo: number): number {
    return dias.reduce((sum, dia) => sum + getHoras(idLegajo, dia), 0)
  }

  function isAusente(idLegajo: number, fecha: string): boolean {
    return novedades.find(n => n.id_legajo === idLegajo && n.fecha === fecha)?.ausente || false
  }

  function tieneDatos(idLegajo: number, fecha: string): boolean {
    return !!novedades.find(n => n.id_legajo === idLegajo && n.fecha === fecha)
  }

  const meses = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ]

  const anios = ['2024', '2025', '2026', '2027']

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
          Consulta de novedades
        </h1>
        <span style={{ fontSize: '12px', color: '#8b949e' }}>{empresaActiva.razon_social}</span>
      </div>

      {/* Filtros */}
      <div style={{
        background: '#161b22', border: '0.5px solid #30363d',
        borderRadius: '8px', padding: '16px 20px',
        display: 'flex', flexWrap: 'wrap' as const, gap: '12px',
        alignItems: 'flex-end', marginBottom: '20px',
      }}>
        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Obra</label>
          <select value={idObra} onChange={(e) => setIdObra(e.target.value)} style={selectStyle}>
            <option value="">Todas las obras</option>
            {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Mes</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)} style={selectStyle}>
            {meses.map((m, i) => (
              <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Año</label>
          <select value={anio} onChange={(e) => setAnio(e.target.value)} style={selectStyle}>
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Período</label>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={selectStyle}>
            <option value="1">1ra quincena (1-15)</option>
            <option value="2">2da quincena (16-fin)</option>
            <option value="mes">Mes completo</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Tipo de hora</label>
          <select value={tipoHora} onChange={(e) => setTipoHora(e.target.value)} style={selectStyle}>
            {TIPOS_HORA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Adicional</label>
          <select value={idAdicional} onChange={(e) => setIdAdicional(e.target.value)} style={selectStyle}>
            <option value="">Todos</option>
            {adicionalesFiltrados.map(a => <option key={a.id} value={a.id}>{a.descripcion}</option>)}
          </select>
        </div>

        <button
          onClick={consultar}
          disabled={cargando}
          style={{
            background: '#2563eb', color: 'white', border: 'none',
            borderRadius: '6px', padding: '7px 20px',
            fontSize: '13px', cursor: 'pointer',
            opacity: cargando ? 0.6 : 1,
          }}
        >
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {/* Planilla */}
      {buscado && (
        <>
          {empleados.length === 0 ? (
            <div style={{
              background: '#161b22', border: '0.5px solid #30363d',
              borderRadius: '8px', padding: '48px',
              textAlign: 'center', color: '#8b949e', fontSize: '14px',
            }}>
              No hay novedades para el período seleccionado.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                borderCollapse: 'collapse', fontSize: '12px',
                background: '#161b22', border: '0.5px solid #30363d',
                borderRadius: '8px', overflow: 'hidden',
                minWidth: '100%',
              }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                    <th style={{
                      textAlign: 'left', padding: '10px 16px',
                      color: '#8b949e', fontWeight: 500,
                      position: 'sticky', left: 0,
                      background: '#161b22', minWidth: '180px',
                      borderRight: '0.5px solid #30363d',
                    }}>Empleado</th>
                    {dias.map(dia => (
                      <th key={dia} style={{
                        textAlign: 'center', padding: '10px 8px',
                        color: '#8b949e', fontWeight: 500, minWidth: '40px',
                      }}>
                        {new Date(dia + 'T00:00:00').getDate()}
                      </th>
                    ))}
                    <th style={{
                      textAlign: 'center', padding: '10px 12px',
                      color: '#58a6ff', fontWeight: 500,
                      borderLeft: '0.5px solid #30363d',
                    }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {empleados.map(([idLegajo, legajo], i) => (
                    <tr key={idLegajo} style={{
                      borderBottom: i < empleados.length - 1 ? '0.5px solid #21262d' : 'none',
                    }}>
                      <td style={{
                        padding: '8px 16px',
                        position: 'sticky', left: 0,
                        background: '#161b22',
                        borderRight: '0.5px solid #30363d',
                      }}>
                        <span style={{ color: '#e6edf3', fontWeight: 500 }}>
                          {legajo.apellido}, {legajo.nombre}
                        </span>
                        <span style={{ color: '#484f58', fontSize: '10px', marginLeft: '6px' }}>
                          #{String(legajo.nro_legajo).padStart(4, '0')}
                        </span>
                      </td>
                      {dias.map(dia => {
                        const horas = getHoras(idLegajo, dia)
                        const ausente = isAusente(idLegajo, dia)
                        const tieneDato = tieneDatos(idLegajo, dia)
                        return (
                          <td key={dia} style={{
                            padding: '8px 4px', textAlign: 'center',
                            background: ausente
                              ? 'rgba(248,81,73,0.1)'
                              : !tieneDato
                              ? 'transparent'
                              : horas === 0
                              ? 'transparent'
                              : 'transparent',
                          }}>
                            {ausente ? (
                              <span style={{ color: '#f85149', fontSize: '11px' }}>A</span>
                            ) : tieneDato ? (
                              <span style={{ color: horas > 0 ? '#e6edf3' : '#484f58' }}>
                                {horas > 0 ? horas : '—'}
                              </span>
                            ) : (
                              <span style={{ color: '#30363d' }}>·</span>
                            )}
                          </td>
                        )
                      })}
                      <td style={{
                        padding: '8px 12px', textAlign: 'center',
                        color: '#58a6ff', fontWeight: 500,
                        borderLeft: '0.5px solid #30363d',
                      }}>
                        {getTotalEmpleado(idLegajo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}