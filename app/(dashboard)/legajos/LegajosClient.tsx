"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEmpresa } from '../context/EmpresaContext'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import Link from 'next/link'
import FormLegajo from './FormLegajo'
import { formatFecha } from '@/lib/fecha'
import { createClient } from '@/lib/supabase-browser'

type SortCol = 'nro_legajo' | 'apellido' | 'cuil' | 'categoria' | 'obra' | 'fecha_ingreso' | 'estado'

type Legajo = {
  id: number
  id_empresa: number
  nro_legajo: number
  apellido: string
  nombre: string
  cuil: string
  fecha_nacimiento?: string
  sexo?: string
  nacionalidad?: string
  tipo_documento?: string
  nro_documento?: string
  direccion?: string
  cp?: string
  localidad?: string
  provincia?: string
  telefono?: string
  fecha_ingreso: string
  id_categoria?: number
  id_obra?: number
  estado: string
  cbu?: string
  codigo_externo?: string
  activo: boolean
  categorias?: { descripcion: string }
  obras?: { nombre: string }
}

type Categoria = {
  id: number
  id_empresa: number
  descripcion: string
}

type Obra = {
  id: number
  id_empresa: number
  nombre: string
}

const ESTADOS = ['Activo', 'Baja']

const badgeEstado = (estado: string) => {
  const colores: Record<string, { bg: string, color: string }> = {
    Activo: { bg: '#1a3a2a', color: '#3fb950' },
    Baja:   { bg: '#3a1a1a', color: '#f85149' },
  }
  const c = colores[estado] || { bg: '#21262d', color: '#8b949e' }
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
    }}>{estado}</span>
  )
}

export default function LegajosClient({
  legajos, categorias, obras, plantillas
}: {
  legajos: Legajo[]
  categorias: Categoria[]
  obras: Obra[]
  plantillas: { id: number, id_empresa: number, nombre: string }[]
}) {
  const { empresaActiva, rol } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [legajoEditar, setLegajoEditar] = useState<Legajo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Activo')
  const [sortCol, setSortCol] = useState<SortCol>('nro_legajo')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const router = useRouter()

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const legajosFiltrados = legajos
    .filter(l => l.id_empresa === empresaActiva?.id)
    .filter(l => filtroEstado ? l.estado === filtroEstado : true)
    .filter(l => {
      if (!busqueda) return true
      const b = busqueda.toLowerCase()
      return (
        l.apellido.toLowerCase().includes(b) ||
        l.nombre.toLowerCase().includes(b) ||
        l.cuil.includes(b) ||
        String(l.nro_legajo).includes(b)
      )
    })
    .sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''
      switch (sortCol) {
        case 'nro_legajo':    valA = a.nro_legajo;                          valB = b.nro_legajo; break
        case 'apellido':      valA = `${a.apellido} ${a.nombre}`.toLowerCase(); valB = `${b.apellido} ${b.nombre}`.toLowerCase(); break
        case 'cuil':          valA = a.cuil;                                valB = b.cuil; break
        case 'categoria':     valA = a.categorias?.descripcion?.toLowerCase() || ''; valB = b.categorias?.descripcion?.toLowerCase() || ''; break
        case 'obra':          valA = a.obras?.nombre?.toLowerCase() || '';  valB = b.obras?.nombre?.toLowerCase() || ''; break
        case 'fecha_ingreso': valA = a.fecha_ingreso;                       valB = b.fecha_ingreso; break
        case 'estado':        valA = a.estado;                              valB = b.estado; break
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  function abrirNuevo() {
    setLegajoEditar(null)
    setMostrarForm(true)
  }

  function abrirEditar(legajo: Legajo) {
    setLegajoEditar(legajo)
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setLegajoEditar(null)
  }

  async function eliminar(legajo: Legajo) {
    if (!confirm(`¿Eliminar el legajo de ${legajo.apellido}, ${legajo.nombre}?\nEsta acción no se puede deshacer.`)) return

    const supabase = createClient()

    const [
      { count: cNovedades },
      { count: cAusencias },
      { count: cVacaciones },
      { count: cEpp },
    ] = await Promise.all([
      supabase.from('novedades_diarias').select('*', { count: 'exact', head: true }).eq('id_legajo', legajo.id),
      supabase.from('ausencias_periodo').select('*', { count: 'exact', head: true }).eq('id_legajo', legajo.id),
      supabase.from('vacaciones_periodo').select('*', { count: 'exact', head: true }).eq('id_legajo', legajo.id),
      supabase.from('epp_entregas').select('*', { count: 'exact', head: true }).eq('id_legajo', legajo.id),
    ])

    const bloqueantes: string[] = []
    if (cNovedades) bloqueantes.push(`${cNovedades} novedad${cNovedades !== 1 ? 'es' : ''}`)
    if (cAusencias) bloqueantes.push(`${cAusencias} ausencia${cAusencias !== 1 ? 's' : ''}`)
    if (cVacaciones) bloqueantes.push(`${cVacaciones} registro${cVacaciones !== 1 ? 's' : ''} de vacaciones`)
    if (cEpp) bloqueantes.push(`${cEpp} entrega${cEpp !== 1 ? 's' : ''} de EPP/ropa`)

    if (bloqueantes.length > 0) {
      alert(`No se puede eliminar el legajo de ${legajo.apellido}, ${legajo.nombre}.\n\nTiene registros asociados:\n• ${bloqueantes.join('\n• ')}`)
      return
    }

    const { error } = await supabase
      .from('legajos')
      .delete()
      .eq('id', legajo.id)

    if (error) {
      alert('No se puede eliminar. Intentá de nuevo.')
    } else {
      router.refresh()
    }
  }

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <>
      {mostrarForm && (
        <FormLegajo
          legajoEditar={legajoEditar}
          categorias={categorias}
          obras={obras}
          plantillas={plantillas}
          onCerrar={cerrar}
        />
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Legajos</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social} · {legajosFiltrados.length} empleado{legajosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>
        {rol !== 'JEFE_OBRA' && (
          <button onClick={abrirNuevo} style={{
            background: '#2563eb', color: 'white', border: 'none',
            borderRadius: '6px', padding: '7px 16px',
            fontSize: '13px', cursor: 'pointer',
          }}>
            + Nuevo legajo
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color="#8b949e" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, apellido, CUIL o legajo..."
            style={{
              width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
              background: '#161b22', border: '0.5px solid #30363d',
              color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
            }}
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: '6px',
            background: '#161b22', border: '0.5px solid #30363d',
            color: filtroEstado ? '#e6edf3' : '#8b949e', fontSize: '13px',
          }}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {legajosFiltrados.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          {legajos.filter(l => l.id_empresa === empresaActiva.id).length === 0
            ? `No hay legajos para ${empresaActiva.razon_social}.`
            : 'No se encontraron resultados para la búsqueda.'
          }
        </div>
      ) : (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {([
                  { label: 'Legajo',          col: 'nro_legajo' },
                  { label: 'Apellido y Nombre', col: 'apellido' },
                  { label: 'CUIL',            col: 'cuil' },
                  { label: 'Categoría',       col: 'categoria' },
                  { label: 'Obra',            col: 'obra' },
                  { label: 'Ingreso',         col: 'fecha_ingreso' },
                  { label: 'Estado',          col: 'estado' },
                ] as { label: string, col: SortCol }[]).map(({ label, col }) => {
                  const activo = sortCol === col
                  const Icono = activo ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
                  return (
                    <th key={col} onClick={() => toggleSort(col)} style={{
                      textAlign: 'left', padding: '10px 16px',
                      color: activo ? '#e6edf3' : '#8b949e', fontWeight: 500,
                      cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {label} <Icono size={12} />
                      </span>
                    </th>
                  )
                })}
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {legajosFiltrados.map((legajo, i) => (
                <tr key={legajo.id} style={{
                  borderBottom: i < legajosFiltrados.length - 1 ? '0.5px solid #21262d' : 'none',
                }}>
                  <td style={{ padding: '10px 16px' }}>
                    <Link href={`/legajos/${legajo.id}`} style={{ textDecoration: 'none' }}>
                      <span style={{
                        background: '#21262d', color: '#e6edf3',
                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer',
                      }}>{String(legajo.nro_legajo).padStart(4, '0')}</span>
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <Link href={`/legajos/${legajo.id}`} style={{ textDecoration: 'none' }}>
                      <span style={{ color: '#e6edf3', fontWeight: 500, cursor: 'pointer' }}>
                        {legajo.apellido}, {legajo.nombre}
                      </span>
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{legajo.cuil}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {legajo.categorias?.descripcion || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {legajo.obras?.nombre || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {formatFecha(legajo.fecha_ingreso)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>{badgeEstado(legajo.estado)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <Link href={`/legajos/${legajo.id}`} style={{
                      background: 'transparent', border: '0.5px solid #30363d',
                      color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                      padding: '3px 10px', borderRadius: '4px', textDecoration: 'none',
                      marginRight: '4px', display: 'inline-block',
                    }}>Ver ficha</Link>
                    <button onClick={() => abrirEditar(legajo)} style={{
                      background: 'transparent', border: 'none',
                      color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Editar</button>
                    <button onClick={() => eliminar(legajo)} style={{
                      background: 'transparent', border: 'none',
                      color: '#f85149', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Eliminar</button>
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