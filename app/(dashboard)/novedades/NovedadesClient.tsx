"use client"

import { useState } from 'react'
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
  observaciones: string
  adicionales: AdicionalFila[]
  mostrarAdicionales: boolean
}

export default function NovedadesClient({
  legajos, obras, adicionales
}: {
  legajos: Legajo[]
  obras: Obra[]
  adicionales: Adicional[]
}) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()

  const [idObra, setIdObra] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [filas, setFilas] = useState<FilaNovedad[]>([])
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaActiva?.id)
  const adicionalesFiltrados = adicionales.filter(a => a.id_empresa === empresaActiva?.id)

  const inputStyle = {
    padding: '6px 8px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', width: '70px',
    textAlign: 'center' as const,
  }

  async function cargarEmpleados() {
    if (!idObra || !fecha || !empresaActiva) return
    setCargando(true)
    setError('')
    setMensaje('')

    const supabase = createClient()

    const empleadosObra = legajos.filter(
      l => l.id_empresa === empresaActiva.id && l.id_obra === parseInt(idObra)
    )

    if (empleadosObra.length === 0) {
      setError('No hay empleados activos asignados a esta obra.')
      setCargando(false)
      return
    }

    // Traer novedades existentes
    const { data: existentes } = await supabase
      .from('novedades_diarias')
      .select('*')
      .eq('id_empresa', empresaActiva.id)
      .eq('id_obra', parseInt(idObra))
      .eq('fecha', fecha)

    // Traer adicionales de esas novedades
    const idsNovedades = existentes?.map(n => n.id) || []
    const { data: adicionalesExistentes } = idsNovedades.length > 0
      ? await supabase
          .from('novedades_adicionales')
          .select('*, adicionales(descripcion)')
          .in('id_novedad', idsNovedades)
      : { data: [] }

    const nuevasFilas: FilaNovedad[] = empleadosObra.map(emp => {
      const existente = existentes?.find(n => n.id_legajo === emp.id)

      // Traer adicionales de esta novedad específica
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
        hs_normales: existente ? String(existente.hs_normales) : '8',
        hs_extra_50: existente ? String(existente.hs_extra_50) : '0',
        hs_extra_100: existente ? String(existente.hs_extra_100) : '0',
        hs_nocturnas: existente ? String(existente.hs_nocturnas) : '0',
        ausente: existente ? existente.ausente : false,
        observaciones: existente ? (existente.observaciones || '') : '',
        adicionales: adicionalesDelEmpleado,
        mostrarAdicionales: false,
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

      // Guardar adicionales si hay
      if (fila.adicionales.length > 0 && novedad) {
        // Borrar adicionales anteriores y recargar
        await supabase
          .from('novedades_adicionales')
          .delete()
          .eq('id_novedad', novedad.id)

        for (const adicional of fila.adicionales) {
          await supabase
            .from('novedades_adicionales')
            .insert({
              id_novedad: novedad.id,
              id_adicional: adicional.id_adicional,
              cantidad: parseFloat(adicional.cantidad) || 1,
            })
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
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
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
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Novedades</h1>
        <span style={{ fontSize: '12px', color: '#8b949e' }}>{empresaActiva.razon_social}</span>
      </div>

      {/* Selector de obra y fecha */}
      <div style={{
        background: '#161b22', border: '0.5px solid #30363d',
        borderRadius: '8px', padding: '16px 20px',
        display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '20px',
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Obra *</label>
          <select
            value={idObra}
            onChange={(e) => { setIdObra(e.target.value); setFilas([]) }}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: '6px',
              background: '#0d1117', border: '0.5px solid #30363d',
              color: '#e6edf3', fontSize: '13px',
            }}
          >
            <option value="">Seleccionar obra...</option>
            {obrasFiltradas.map(o => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Fecha *</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="date"
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); setFilas([]) }}
              style={{
                padding: '7px 10px', borderRadius: '6px',
                background: '#0d1117', border: '0.5px solid #30363d',
                color: '#e6edf3', fontSize: '13px',
              }}
            />
            {fecha && (
              <span style={{
                fontSize: '13px', fontWeight: 500,
                color: ['Sábado', 'Domingo'].includes(getDiaSemana(fecha)) ? '#d29922' : '#8b949e',
              }}>
                {getDiaSemana(fecha)}
              </span>
            )}
          </div>
        </div>
        

        <button
          onClick={cargarEmpleados}
          disabled={!idObra || !fecha || cargando}
          style={{
            background: '#2563eb', color: 'white', border: 'none',
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
            background: '#161b22', border: '0.5px solid #30363d',
            borderRadius: '8px', overflow: 'hidden', marginBottom: '16px',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500, width: '25%' }}>Empleado</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: '#8b949e', fontWeight: 500 }}>Normales</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: '#8b949e', fontWeight: 500 }}>Extra 50%</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: '#8b949e', fontWeight: 500 }}>Extra 100%</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: '#8b949e', fontWeight: 500 }}>Nocturnas</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: '#8b949e', fontWeight: 500 }}>Ausente</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#8b949e', fontWeight: 500 }}>Observaciones</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', color: '#8b949e', fontWeight: 500 }}>Adicionales</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, i) => (
                  <>
                    <tr key={fila.id_legajo} style={{
                      borderBottom: fila.mostrarAdicionales ? 'none' : (i < filas.length - 1 ? '0.5px solid #21262d' : 'none'),
                      background: fila.ausente ? 'rgba(248, 81, 73, 0.05)' : 'transparent',
                    }}>
                      <td style={{ padding: '8px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#e6edf3', fontWeight: 500 }}>
                            {fila.apellido}, {fila.nombre}
                          </span>
                          <span style={{ color: '#484f58', fontSize: '11px' }}>
                            #{String(fila.nro_legajo).padStart(4, '0')}
                          </span>
                        </div>
                      </td>
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
                        <input value={fila.observaciones}
                          onChange={(e) => actualizarFila(i, 'observaciones', e.target.value)}
                          placeholder="Opcional..."
                          style={{ ...inputStyle, width: '100%', textAlign: 'left' }} />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          onClick={() => actualizarFila(i, 'mostrarAdicionales', !fila.mostrarAdicionales)}
                          style={{
                            background: fila.adicionales.length > 0 ? '#1a2a3a' : 'transparent',
                            border: '0.5px solid #30363d',
                            color: fila.adicionales.length > 0 ? '#58a6ff' : '#8b949e',
                            borderRadius: '4px', padding: '3px 8px',
                            fontSize: '11px', cursor: 'pointer',
                            whiteSpace: 'nowrap' as const,
                          }}
                        >
                          {fila.adicionales.length > 0 ? `${fila.adicionales.length} adic.` : '+ Adic.'}
                        </button>
                      </td>
                    </tr>

                    {/* Fila de adicionales expandible */}
                    {fila.mostrarAdicionales && (
                      <tr key={`adicionales-${fila.id_legajo}`} style={{
                        borderBottom: i < filas.length - 1 ? '0.5px solid #21262d' : 'none',
                        background: '#0d1117',
                      }}>
                        <td colSpan={8} style={{ padding: '8px 16px 12px 32px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                            {/* Adicionales ya agregados */}
                            {fila.adicionales.map(adic => (
                              <div key={adic.id_adicional} style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                              }}>
                                <span style={{ fontSize: '12px', color: '#e6edf3', flex: 1 }}>{adic.descripcion}</span>
                                <input
                                  type="number"
                                  value={adic.cantidad}
                                  onChange={(e) => actualizarCantidadAdicional(i, adic.id_adicional, e.target.value)}
                                  min="0" step="0.5"
                                  style={{ ...inputStyle, width: '60px' }}
                                />
                                <button
                                  onClick={() => quitarAdicional(i, adic.id_adicional)}
                                  style={{
                                    background: 'transparent', border: 'none',
                                    color: '#f85149', cursor: 'pointer', fontSize: '14px',
                                    padding: '2px 6px',
                                  }}
                                >×</button>
                              </div>
                            ))}

                            {/* Selector para agregar nuevo adicional */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  agregarAdicional(i, e.target.value)
                                  e.target.value = ''
                                }}
                                style={{
                                  padding: '5px 8px', borderRadius: '6px',
                                  background: '#161b22', border: '0.5px solid #30363d',
                                  color: '#8b949e', fontSize: '12px',
                                }}
                              >
                                <option value="">+ Agregar adicional...</option>
                                {adicionalesFiltrados
                                  .filter(a => !fila.adicionales.find(fa => fa.id_adicional === a.id))
                                  .map(a => (
                                    <option key={a.id} value={a.id}>{a.descripcion}</option>
                                  ))
                                }
                              </select>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p style={{ color: '#f85149', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
          {mensaje && <p style={{ color: '#3fb950', fontSize: '13px', marginBottom: '12px' }}>{mensaje}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={guardar}
              disabled={guardando}
              style={{
                background: '#2563eb', color: 'white', border: 'none',
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
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          Seleccioná una obra y fecha, luego clickeá "Cargar empleados".
        </div>
      )}
    </div>
  )
}