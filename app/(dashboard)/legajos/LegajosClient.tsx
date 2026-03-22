"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEmpresa } from '../context/EmpresaContext'
import { Search } from 'lucide-react'
import Link from 'next/link'
import FormLegajo from './FormLegajo'
import { formatFecha } from '@/lib/fecha'
import { createClient } from '@/lib/supabase-browser'

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

const ESTADOS = ['Pre-Alta', 'Activo', 'Baja', 'Suspendido', 'Inactivo']

const badgeEstado = (estado: string) => {
  const colores: Record<string, { bg: string, color: string }> = {
    'Pre-Alta':  { bg: '#1a2a3a', color: '#58a6ff' },
    Activo:      { bg: '#1a3a2a', color: '#3fb950' },
    Baja:        { bg: '#3a1a1a', color: '#f85149' },
    Suspendido:  { bg: '#3a2f1a', color: '#d29922' },
    Inactivo:    { bg: '#21262d', color: '#8b949e' },
  }
  const c = colores[estado] || colores.Inactivo
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
  const { empresaActiva } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [legajoEditar, setLegajoEditar] = useState<Legajo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const router = useRouter()

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

    const { error } = await supabase
      .from('legajos')
      .delete()
      .eq('id', legajo.id)

    if (error) {
      alert(traducirErrorEliminar(error.message))
    } else {
      router.refresh()
    }
  }

  function traducirErrorEliminar(mensaje: string): string {
    if (mensaje.includes('foreign key'))
      return 'No se puede eliminar: el empleado tiene novedades, vacaciones u otros registros asociados.'
    return 'No se puede eliminar. Intentá de nuevo.'
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
        <button onClick={abrirNuevo} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px',
          fontSize: '13px', cursor: 'pointer',
        }}>
          + Nuevo legajo
        </button>
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
                {['Legajo', 'Apellido y Nombre', 'CUIL', 'Categoría', 'Obra', 'Ingreso', 'Estado'].map(col => (
                  <th key={col} style={{
                    textAlign: 'left', padding: '10px 16px',
                    color: '#8b949e', fontWeight: 500,
                  }}>{col}</th>
                ))}
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {legajosFiltrados.map((legajo, i) => (
                <tr key={legajo.id} style={{
                  borderBottom: i < legajosFiltrados.length - 1 ? '0.5px solid #21262d' : 'none',
                }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: '#21262d', color: '#e6edf3',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>{String(legajo.nro_legajo).padStart(4, '0')}</span>
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