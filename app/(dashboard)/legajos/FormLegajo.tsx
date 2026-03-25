"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X } from 'lucide-react'
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
  id_plantilla?: number
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

type Plantilla = {
  id: number
  id_empresa: number
  nombre: string
}

type Props = {
  legajoEditar?: Legajo | null
  categorias: Categoria[]
  obras: Obra[]
  plantillas: { id: number, id_empresa: number, nombre: string }[]
  onCerrar: () => void
  onGuardado?: () => void
}


const ESTADOS = ['Activo', 'Baja']
const SEXOS = ['Masculino', 'Femenino', 'Otro']
const TIPOS_DOC = ['DNI', 'Pasaporte']



export default function FormLegajo({ legajoEditar, categorias, obras, plantillas, onCerrar, onGuardado }: Props) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const editando = !!legajoEditar

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cuilValido, setCuilValido] = useState<boolean | null>(editando ? true : null)
  const [mostrarModalBaja, setMostrarModalBaja] = useState(false)
  const [fechaEgreso, setFechaEgreso] = useState(new Date().toISOString().split('T')[0])
  const [motivoBaja, setMotivoBaja] = useState('Renuncia')
  const [observacionBaja, setObservacionBaja] = useState('')

  const [nroLegajo, setNroLegajo] = useState(legajoEditar ? String(legajoEditar.nro_legajo) : '')
  const [apellido, setApellido] = useState(legajoEditar?.apellido || '')
  const [nombre, setNombre] = useState(legajoEditar?.nombre || '')
  const [cuil, setCuil] = useState(legajoEditar?.cuil || '')
  const [fechaNacimiento, setFechaNacimiento] = useState(legajoEditar?.fecha_nacimiento || '')
  const [sexo, setSexo] = useState(legajoEditar?.sexo || 'Masculino')
  const [nacionalidad, setNacionalidad] = useState(legajoEditar?.nacionalidad || 'Argentina')
  const [tipoDocumento, setTipoDocumento] = useState(legajoEditar?.tipo_documento || 'DNI')
  const [nroDocumento, setNroDocumento] = useState(legajoEditar?.nro_documento || '')
  const [direccion, setDireccion] = useState(legajoEditar?.direccion || '')
  const [cp, setCp] = useState(legajoEditar?.cp || '')
  const [localidad, setLocalidad] = useState(legajoEditar?.localidad || '')
  const [provincia, setProvincia] = useState(legajoEditar?.provincia || '')
  const [telefono, setTelefono] = useState(legajoEditar?.telefono || '')
  
  
 
  const [fechaIngreso, setFechaIngreso] = useState(
    legajoEditar?.fecha_ingreso || new Date().toISOString().split('T')[0]
  )
  const [idCategoria, setIdCategoria] = useState(
    legajoEditar?.id_categoria ? String(legajoEditar.id_categoria) : ''
  )
  const [idObra, setIdObra] = useState(
    legajoEditar?.id_obra ? String(legajoEditar.id_obra) : ''
  )
  const [estado, setEstado] = useState(legajoEditar?.estado || 'Activo')
  const [cbu, setCbu] = useState(legajoEditar?.cbu || '')
  const [codigoExterno, setCodigoExterno] = useState(legajoEditar?.codigo_externo || '')
  const [idPlantilla, setIdPlantilla] = useState(legajoEditar?.id_plantilla ? String(legajoEditar.id_plantilla) : '')
  

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

  const categoriasFiltradas = categorias.filter(c => c.id_empresa === empresaActiva?.id)
  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaActiva?.id)
  
  function traducirError(mensaje: string): string {
    if (mensaje.includes('legajos_id_empresa_nro_legajo_key'))
      return 'Ya existe un legajo con ese número en esta empresa.'
    if (mensaje.includes('legajos_id_empresa_cuil_key'))
      return 'Ya existe un empleado con ese CUIL en esta empresa.'
    if (mensaje.includes('unique'))
      return 'Ya existe un registro con esos datos.'
    return 'Ocurrió un error al guardar. Intentá de nuevo.'
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
      sexo, nacionalidad,
      tipo_documento: tipoDocumento,
      nro_documento: nroDocumento || null,
      direccion, cp, localidad, provincia,
      telefono: telefono || null,
      cbu: cbu || null,
      codigo_externo: codigoExterno || null,
      id_plantilla: idPlantilla ? parseInt(idPlantilla) : null,
      ...(!editando && {
        fecha_ingreso: fechaIngreso,
        id_categoria: idCategoria ? parseInt(idCategoria) : null,
        id_obra: idObra ? parseInt(idObra) : null,
        estado,
      }),
    }

    if (editando) {
      const { error } = await supabase
        .from('legajos').update(datos).eq('id', legajoEditar.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { data: nuevo, error } = await supabase
        .from('legajos').insert({ ...datos, id_empresa: empresaActiva.id }).select('id').single()
      if (error) { setError(traducirError(error.message)); setLoading(false); return }

      if (estado === 'Baja' && nuevo?.id) {
        await supabase
          .from('legajos_historial_laboral')
          .update({
            fecha_egreso: fechaEgreso,
            motivo: motivoBaja,
            observacion: observacionBaja || null,
          })
          .eq('id_legajo', nuevo.id)
          .is('fecha_egreso', null)
      }
    }




    router.refresh()
    if (onGuardado) onGuardado()
    onCerrar()
    setLoading(false)
  }

  return (
    <>
      {/* Modal baja */}
      {mostrarModalBaja && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: '#161b22', border: '0.5px solid #f85149',
            borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#f85149', margin: '0 0 4px' }}>
              Registrar baja
            </h2>
            <p style={{ fontSize: '13px', color: '#8b949e', margin: '0 0 20px' }}>
              Completá los datos del egreso del empleado.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Fecha egreso *</label>
                  <input
                    type="date"
                    value={fechaEgreso}
                    onChange={(e) => setFechaEgreso(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Motivo *</label>
                  <select
                    value={motivoBaja}
                    onChange={(e) => setMotivoBaja(e.target.value)}
                    style={selectStyle}
                  >
                    {['Renuncia', 'Despido', 'Fin de Obra', 'Suspension', 'Otro'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Observación</label>
                <textarea
                  value={observacionBaja}
                  onChange={(e) => setObservacionBaja(e.target.value)}
                  placeholder="Detalle adicional..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setMostrarModalBaja(false)
                  setEstado(editando ? legajoEditar!.estado : 'Activo')
                }}
                style={{
                  background: 'transparent', border: '0.5px solid #30363d',
                  color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => setMostrarModalBaja(false)}
                disabled={!fechaEgreso || !motivoBaja}
                style={{
                  background: '#f85149', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                Confirmar baja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario principal */}
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
                {editando ? `Editar — ${legajoEditar.apellido}, ${legajoEditar.nombre}` : 'Nuevo legajo'}
              </h2>
              <span style={{ fontSize: '12px', color: '#8b949e' }}>{empresaActiva?.razon_social}</span>
            </div>
            <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Identificación */}
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
                {!editando && (
                  <div>
                    <label style={labelStyle}>Estado</label>
                    <select
                      value={estado}
                      onChange={(e) => {
                        const nuevoEstado = e.target.value
                        if (nuevoEstado === 'Baja' && estado !== 'Baja') {
                          setMostrarModalBaja(true)
                        }
                        setEstado(nuevoEstado)
                      }}
                      style={selectStyle}
                    >
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Datos personales */}
            <div>
              <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Datos personales</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Apellido *</label>
                    <input value={apellido} onChange={(e) => setApellido(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nombre *</label>
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
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
                    <input value={nroDocumento} onChange={(e) => setNroDocumento(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Nacionalidad</label>
                    <input value={nacionalidad} onChange={(e) => setNacionalidad(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {/* Domicilio */}
            <div>
              <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Domicilio</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Dirección</label>
                    <input value={direccion} onChange={(e) => setDireccion(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>CP</label>
                    <input value={cp} onChange={(e) => setCp(e.target.value)} style={inputStyle} />
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

            {/* Datos laborales */}
            <div>
              <p style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Datos laborales</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {!editando && (
                    <div>
                      <label style={labelStyle}>Fecha ingreso *</label>
                      <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} style={inputStyle} />
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>CBU</label>
                    <input value={cbu} onChange={(e) => setCbu(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Plantilla de jornada</label>
                  <select value={idPlantilla} onChange={(e) => setIdPlantilla(e.target.value)} style={selectStyle}>
                    <option value="">Usar la de la categoría</option>
                    {plantillas
                      .filter(p => p.id_empresa === empresaActiva?.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))
                    }
                  </select>
                </div>

                
                {!editando && (
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
                )}
              </div>
            </div>

            {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button onClick={onCerrar} style={{
              background: 'transparent', border: '0.5px solid #30363d',
              color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
              fontSize: '13px', cursor: 'pointer',
            }}>Cancelar</button>
            <button
              onClick={guardar}
              disabled={loading || !nroLegajo || !apellido || !nombre || !cuil || cuilValido === false || (!editando && !fechaIngreso)}
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
    </>
  )
}