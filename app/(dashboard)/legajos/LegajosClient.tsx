"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Search } from 'lucide-react'
import { validarCuit, formatearCuit } from '@/lib/validaciones'

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
const SEXOS = ['Masculino', 'Femenino', 'Otro']
const TIPOS_DOC = ['DNI', 'Pasaporte']

const badgeEstado = (estado: string) => {
  const colores: Record<string, { bg: string, color: string }> = {
    Activo:     { bg: '#1a3a2a', color: '#3fb950' },
    Baja:       { bg: '#3a1a1a', color: '#f85149' },
    Suspendido: { bg: '#3a2f1a', color: '#d29922' },
    Inactivo:   { bg: '#21262d', color: '#8b949e' },
    'Pre-Alta': { bg: '#1a2a3a', color: '#58a6ff' },
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
  legajos, categorias, obras
}: {
  legajos: Legajo[]
  categorias: Categoria[]
  obras: Obra[]
}) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Legajo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cuilValido, setCuilValido] = useState<boolean | null>(null)

  // Campos del formulario
  const [nroLegajo, setNroLegajo] = useState('')
  const [apellido, setApellido] = useState('')
  const [nombre, setNombre] = useState('')
  const [cuil, setCuil] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [sexo, setSexo] = useState('Masculino')
  const [nacionalidad, setNacionalidad] = useState('Argentina')
  const [tipoDocumento, setTipoDocumento] = useState('DNI')
  const [nroDocumento, setNroDocumento] = useState('')
  const [direccion, setDireccion] = useState('')
  const [cp, setCp] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [provincia, setProvincia] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [idCategoria, setIdCategoria] = useState('')
  const [idObra, setIdObra] = useState('')
  const [estado, setEstado] = useState('Activo')
  const [cbu, setCbu] = useState('')
  const [codigoExterno, setCodigoExterno] = useState('')

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  const selectStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

  const labelStyle = {
    fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px'
  }

  // Filtrar por empresa activa
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

  const categoriasFiltradas = categorias.filter(c => c.id_empresa === empresaActiva?.id)
  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaActiva?.id)

  function limpiarForm() {
    setNroLegajo('')
    setApellido('')
    setNombre('')
    setCuil('')
    setCuilValido(null)
    setFechaNacimiento('')
    setSexo('Masculino')
    setNacionalidad('Argentina')
    setTipoDocumento('DNI')
    setNroDocumento('')
    setDireccion('')
    setCp('')
    setLocalidad('')
    setProvincia('')
    setTelefono('')
    setFechaIngreso(new Date().toISOString().split('T')[0])
    setIdCategoria('')
    setIdObra('')
    setEstado('Activo')
    setCbu('')
    setCodigoExterno('')
    setError('')
  }

  function abrirNuevo() {
    setEditando(null)
    limpiarForm()
    setMostrarForm(true)
  }

  function abrirEditar(legajo: Legajo) {
    setEditando(legajo)
    setNroLegajo(String(legajo.nro_legajo))
    setApellido(legajo.apellido)
    setNombre(legajo.nombre)
    setCuil(legajo.cuil)
    setCuilValido(true)
    setFechaNacimiento(legajo.fecha_nacimiento || '')
    setSexo(legajo.sexo || 'Masculino')
    setNacionalidad(legajo.nacionalidad || 'Argentina')
    setTipoDocumento(legajo.tipo_documento || 'DNI')
    setNroDocumento(legajo.nro_documento || '')
    setDireccion(legajo.direccion || '')
    setCp(legajo.cp || '')
    setLocalidad(legajo.localidad || '')
    setProvincia(legajo.provincia || '')
    setTelefono(legajo.telefono || '')
    setFechaIngreso(legajo.fecha_ingreso || '')
    setIdCategoria(legajo.id_categoria ? String(legajo.id_categoria) : '')
    setIdObra(legajo.id_obra ? String(legajo.id_obra) : '')
    setEstado(legajo.estado)
    setCbu(legajo.cbu || '')
    setCodigoExterno(legajo.codigo_externo || '')
    setError('')
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
  }

  async function guardar() {
    if (!empresaActiva) return
    if (!validarCuit(cuil)) {
      setError('El CUIL ingresado no es válido')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()

    const datos = {
      nro_legajo: parseInt(nroLegajo),
      apellido, nombre, cuil,
      fecha_nacimiento: fechaNacimiento || null,
      sexo, nacionalidad, tipo_documento: tipoDocumento,
      nro_documento: nroDocumento || null,
      direccion, cp, localidad, provincia,
      telefono: telefono || null,
      fecha_ingreso: fechaIngreso,
      id_categoria: idCategoria ? parseInt(idCategoria) : null,
      id_obra: idObra ? parseInt(idObra) : null,
      estado, cbu: cbu || null,
      codigo_externo: codigoExterno || null,
    }

    if (editando) {
      const { error } = await supabase
        .from('legajos').update(datos).eq('id', editando.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('legajos').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  function traducirError(mensaje: string): string {
    if (mensaje.includes('legajos_id_empresa_nro_legajo_key'))
      return 'Ya existe un legajo con ese número en esta empresa.'
    if (mensaje.includes('legajos_id_empresa_cuil_key'))
      return 'Ya existe un empleado con ese CUIL en esta empresa.'
    if (mensaje.includes('unique'))
      return 'Ya existe un registro con esos datos.'
    return 'Ocurrió un error al guardar. Intentá de nuevo.'
  }

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <>
      {/* Modal */}
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 50, overflowY: 'auto', paddingTop: '20px', paddingBottom: '20px',
        }}>
          <div style={{
            background: '#161b22', border: '0.5px solid #30363d',
            borderRadius: '10px', width: '100%', maxWidth: '620px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
                  {editando ? `Editar legajo — ${editando.apellido}, ${editando.nombre}` : 'Nuevo legajo'}
                </h2>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>{empresaActiva.razon_social}</span>
              </div>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Sección: Identificación */}
              <div>
                <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Identificación</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Nro Legajo *</label>
                    <input value={nroLegajo} onChange={(e) => setNroLegajo(e.target.value)} placeholder="Ej: 1" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Código externo</label>
                    <input value={codigoExterno} onChange={(e) => setCodigoExterno(e.target.value)} placeholder="Sistema sueldos" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Estado</label>
                    <select value={estado} onChange={(e) => setEstado(e.target.value)} style={selectStyle}>
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección: Datos personales */}
              <div>
                <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Datos personales</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Apellido *</label>
                      <input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Nombre *</label>
                      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>CUIL *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          value={cuil}
                          onChange={(e) => {
                            const valor = e.target.value
                            setCuil(valor)
                            const limpio = valor.replace(/[^0-9]/g, '')
                            if (limpio.length === 11) {
                              const valido = validarCuit(valor)
                              setCuilValido(valido)
                              if (valido) setCuil(formatearCuit(valor))
                            } else {
                              setCuilValido(null)
                            }
                          }}
                          placeholder="Ej: 20-12345678-9"
                          style={{
                            ...inputStyle,
                            border: `0.5px solid ${cuilValido === false ? '#f85149' : cuilValido === true ? '#3fb950' : '#30363d'}`,
                          }}
                        />
                        {cuilValido !== null && (
                          <span style={{
                            position: 'absolute', right: '10px', top: '50%',
                            transform: 'translateY(-50%)',
                            color: cuilValido ? '#3fb950' : '#f85149',
                          }}>
                            {cuilValido ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Fecha nacimiento</label>
                      <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Sexo</label>
                      <select value={sexo} onChange={(e) => setSexo(e.target.value)} style={selectStyle}>
                        {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Tipo documento</label>
                      <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} style={selectStyle}>
                        {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Nro documento</label>
                      <input value={nroDocumento} onChange={(e) => setNroDocumento(e.target.value)} placeholder="12345678" style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Nacionalidad</label>
                      <input value={nacionalidad} onChange={(e) => setNacionalidad(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Teléfono</label>
                      <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 341 123456" style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Domicilio */}
              <div>
                <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Domicilio</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Dirección</label>
                      <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle y número" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>CP</label>
                      <input value={cp} onChange={(e) => setCp(e.target.value)} placeholder="Ej: 3000" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Localidad</label>
                      <input value={localidad} onChange={(e) => setLocalidad(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Provincia</label>
                      <input value={provincia} onChange={(e) => setProvincia(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Datos laborales */}
              <div>
                <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Datos laborales</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Fecha ingreso *</label>
                      <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>CBU</label>
                      <input value={cbu} onChange={(e) => setCbu(e.target.value)} placeholder="22 dígitos" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Categoría</label>
                      <select value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)} style={selectStyle}>
                        <option value="">Sin categoría</option>
                        {categoriasFiltradas.map(c => (
                          <option key={c.id} value={c.id}>{c.descripcion}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Obra actual</label>
                      <select value={idObra} onChange={(e) => setIdObra(e.target.value)} style={selectStyle}>
                        <option value="">Sin obra</option>
                        {obrasFiltradas.map(o => (
                          <option key={o.id} value={o.id}>{o.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{
                background: 'transparent', border: '0.5px solid #30363d',
                color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button
                onClick={guardar}
                disabled={loading || !nroLegajo || !apellido || !nombre || !cuil || !fechaIngreso}
                style={{
                  background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px',
                  fontSize: '13px', cursor: 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear legajo'}
              </button>
            </div>
          </div>
        </div>
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
                  <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>
                    {legajo.apellido}, {legajo.nombre}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{legajo.cuil}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {legajo.categorias?.descripcion || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {legajo.obras?.nombre || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                    {new Date(legajo.fecha_ingreso).toLocaleDateString('es-AR')}
                  </td>
                  <td style={{ padding: '10px 16px' }}>{badgeEstado(legajo.estado)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => abrirEditar(legajo)} style={{
                      background: 'transparent', border: 'none',
                      color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 8px', borderRadius: '4px',
                    }}>Editar</button>
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