"use client"

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { X, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { validarCuit, formatearCuit } from '@/lib/validaciones'
import { useRouter } from 'next/navigation'

type Categoria = { id: number; id_empresa: number; descripcion: string }
type Obra      = { id: number; id_empresa: number; nombre: string }
type Plantilla = { id: number; id_empresa: number; nombre: string }
type LegajoExistente = { nro_legajo: number; cuil: string; id_empresa: number }

type FilaParseada = {
  fila: number
  // campos raw para mostrar
  nro_legajo: string
  apellido: string
  nombre: string
  cuil: string
  fecha_ingreso: string
  fecha_nacimiento: string
  sexo: string
  tipo_documento: string
  nro_documento: string
  nacionalidad: string
  telefono: string
  direccion: string
  cp: string
  localidad: string
  provincia: string
  cbu: string
  codigo_externo: string
  categoria: string
  obra: string
  plantilla: string
  estado: string
  // resueltos para insertar
  id_categoria: number | null
  id_obra: number | null
  id_plantilla: number | null
  // validación
  errores: string[]
}

type Props = {
  empresaId: number
  categorias: Categoria[]
  obras: Obra[]
  plantillas: Plantilla[]
  legajosExistentes: LegajoExistente[]
  onCerrar: () => void
  onImportado: () => void
}

function parseFecha(valor: any): string | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'number') {
    const date = XLSX.SSF.parse_date_code(valor)
    if (!date) return null
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }
  const str = String(valor).trim()
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (ymd) return str
  return null
}

function get(row: Record<string, any>, col: string): string {
  return String(row[col] ?? '').trim()
}

function parsearFilas(
  rows: Record<string, any>[],
  empresaId: number,
  categorias: Categoria[],
  obras: Obra[],
  plantillas: Plantilla[],
  legajosExistentes: LegajoExistente[]
): FilaParseada[] {
  const cuils = new Set<string>()
  const nros = new Set<string>()

  const catsFiltradas = categorias.filter(c => c.id_empresa === empresaId)
  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaId)
  const plantFiltradas = plantillas.filter(p => p.id_empresa === empresaId)

  return rows.map((row, i) => {
    const errores: string[] = []
    const fila = i + 2 // fila 1 = header

    // Campos raw
    const nro_legajo      = get(row, 'nro_legajo')
    const apellido        = get(row, 'apellido')
    const nombre          = get(row, 'nombre')
    const cuilRaw         = get(row, 'cuil')
    const sexo            = get(row, 'sexo')
    const tipo_documento  = get(row, 'tipo_documento')
    const nro_documento   = get(row, 'nro_documento')
    const nacionalidad    = get(row, 'nacionalidad')
    const telefono        = get(row, 'telefono')
    const direccion       = get(row, 'direccion')
    const cp              = get(row, 'cp')
    const localidad       = get(row, 'localidad')
    const provincia       = get(row, 'provincia')
    const cbu             = get(row, 'cbu')
    const codigo_externo  = get(row, 'codigo_externo')
    const categoriaNombre = get(row, 'categoria')
    const obraNombre      = get(row, 'obra')
    const plantNombre     = get(row, 'plantilla')
    const estadoRaw       = get(row, 'estado') || 'Activo'

    // Validar nro_legajo
    if (!nro_legajo) {
      errores.push('nro_legajo es obligatorio')
    } else if (isNaN(Number(nro_legajo))) {
      errores.push('nro_legajo debe ser numérico')
    } else {
      if (nros.has(nro_legajo)) {
        errores.push(`nro_legajo ${nro_legajo} duplicado en el archivo`)
      } else {
        nros.add(nro_legajo)
        if (legajosExistentes.some(l => l.id_empresa === empresaId && l.nro_legajo === Number(nro_legajo))) {
          errores.push(`nro_legajo ${nro_legajo} ya existe en la empresa`)
        }
      }
    }

    // Validar nombre/apellido
    if (!apellido) errores.push('apellido es obligatorio')
    if (!nombre)   errores.push('nombre es obligatorio')

    // Validar CUIL
    let cuil = cuilRaw
    if (!cuilRaw) {
      errores.push('cuil es obligatorio')
    } else if (!validarCuit(cuilRaw)) {
      errores.push('cuil inválido (dígito verificador)')
    } else {
      cuil = formatearCuit(cuilRaw)
      if (cuils.has(cuil)) {
        errores.push(`cuil ${cuil} duplicado en el archivo`)
      } else {
        cuils.add(cuil)
        if (legajosExistentes.some(l => l.id_empresa === empresaId && l.cuil === cuil)) {
          errores.push(`cuil ${cuil} ya existe en la empresa`)
        }
      }
    }

    // Validar fechas
    const fecha_ingreso_raw = row['fecha_ingreso']
    const fecha_ingreso = parseFecha(fecha_ingreso_raw)
    if (!fecha_ingreso_raw && fecha_ingreso_raw !== 0) {
      errores.push('fecha_ingreso es obligatoria')
    } else if (!fecha_ingreso) {
      errores.push('fecha_ingreso inválida — usar DD/MM/AAAA')
    }

    const fecha_nacimiento_raw = row['fecha_nacimiento']
    const fecha_nacimiento = parseFecha(fecha_nacimiento_raw)
    if (fecha_nacimiento_raw && !fecha_nacimiento) {
      errores.push('fecha_nacimiento inválida — usar DD/MM/AAAA')
    }

    // Validar enums
    if (sexo && !['Masculino', 'Femenino', 'Otro'].includes(sexo)) {
      errores.push('sexo debe ser Masculino, Femenino u Otro')
    }
    if (tipo_documento && !['DNI', 'Pasaporte'].includes(tipo_documento)) {
      errores.push('tipo_documento debe ser DNI o Pasaporte')
    }
    const estado = ['Activo', 'Baja'].includes(estadoRaw) ? estadoRaw : null
    if (!estado) errores.push('estado debe ser Activo o Baja')

    // Resolver relaciones
    let id_categoria: number | null = null
    if (categoriaNombre) {
      const found = catsFiltradas.find(c => c.descripcion.toLowerCase() === categoriaNombre.toLowerCase())
      if (!found) errores.push(`categoría "${categoriaNombre}" no existe en esta empresa`)
      else id_categoria = found.id
    }

    let id_obra: number | null = null
    if (obraNombre) {
      const found = obrasFiltradas.find(o => o.nombre.toLowerCase() === obraNombre.toLowerCase())
      if (!found) errores.push(`obra "${obraNombre}" no existe en esta empresa`)
      else id_obra = found.id
    }

    let id_plantilla: number | null = null
    if (plantNombre) {
      const found = plantFiltradas.find(p => p.nombre.toLowerCase() === plantNombre.toLowerCase())
      if (!found) errores.push(`plantilla "${plantNombre}" no existe en esta empresa`)
      else id_plantilla = found.id
    }

    return {
      fila,
      nro_legajo,
      apellido,
      nombre,
      cuil,
      fecha_ingreso: fecha_ingreso || get(row, 'fecha_ingreso'),
      fecha_nacimiento: fecha_nacimiento || '',
      sexo,
      tipo_documento,
      nro_documento,
      nacionalidad,
      telefono,
      direccion,
      cp,
      localidad,
      provincia,
      cbu,
      codigo_externo,
      categoria: categoriaNombre,
      obra: obraNombre,
      plantilla: plantNombre,
      estado: estado || estadoRaw,
      id_categoria,
      id_obra,
      id_plantilla,
      errores,
    }
  })
}

function descargarPlantilla() {
  const wb = XLSX.utils.book_new()

  const columnas = [
    'nro_legajo', 'apellido', 'nombre', 'cuil', 'fecha_ingreso',
    'fecha_nacimiento', 'sexo', 'tipo_documento', 'nro_documento',
    'nacionalidad', 'telefono', 'direccion', 'cp', 'localidad',
    'provincia', 'cbu', 'codigo_externo', 'categoria', 'obra',
    'plantilla', 'estado',
  ]

  const ejemplo = [
    1, 'PEREZ', 'JUAN CARLOS', '20-12345678-9', '01/03/2025',
    '15/06/1985', 'Masculino', 'DNI', '12345678',
    'Argentina', '1154321234', 'Av. Corrientes 1234', '1043', 'Buenos Aires',
    'Buenos Aires', '0110123456789012345678', 'EXT-001', 'OFICIAL ALBAÑIL', 'OBRA CENTRO',
    '', 'Activo',
  ]

  const wsData = [columnas, ejemplo]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Anchos de columna
  ws['!cols'] = columnas.map(c => ({ wch: Math.max(c.length + 2, 15) }))

  // Hoja de notas
  const notas = [
    ['Campo', 'Obligatorio', 'Formato / Valores válidos'],
    ['nro_legajo', 'Sí', 'Número entero'],
    ['apellido', 'Sí', 'Texto'],
    ['nombre', 'Sí', 'Texto'],
    ['cuil', 'Sí', 'XX-XXXXXXXX-X (con o sin guiones)'],
    ['fecha_ingreso', 'Sí', 'DD/MM/AAAA o AAAA-MM-DD'],
    ['fecha_nacimiento', 'No', 'DD/MM/AAAA o AAAA-MM-DD'],
    ['sexo', 'No', 'Masculino · Femenino · Otro'],
    ['tipo_documento', 'No', 'DNI · Pasaporte'],
    ['nro_documento', 'No', 'Texto'],
    ['nacionalidad', 'No', 'Texto (ej: Argentina)'],
    ['telefono', 'No', 'Texto'],
    ['direccion', 'No', 'Texto'],
    ['cp', 'No', 'Texto'],
    ['localidad', 'No', 'Texto'],
    ['provincia', 'No', 'Texto'],
    ['cbu', 'No', '22 dígitos'],
    ['codigo_externo', 'No', 'Código del sistema de sueldos'],
    ['categoria', 'No', 'Nombre exacto de la categoría en la empresa'],
    ['obra', 'No', 'Nombre exacto de la obra activa en la empresa'],
    ['plantilla', 'No', 'Nombre exacto de la plantilla de jornada'],
    ['estado', 'No', 'Activo (default) · Baja'],
  ]
  const wsNotas = XLSX.utils.aoa_to_sheet(notas)
  wsNotas['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 45 }]

  XLSX.utils.book_append_sheet(wb, ws, 'Legajos')
  XLSX.utils.book_append_sheet(wb, wsNotas, 'Instrucciones')

  XLSX.writeFile(wb, 'plantilla_importacion_legajos.xlsx')
}

const labelStyle = { fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }

export default function ImportarLegajosModal({
  empresaId, categorias, obras, plantillas, legajosExistentes, onCerrar, onImportado
}: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [paso, setPaso] = useState<'upload' | 'preview' | 'resultado'>('upload')
  const [filas, setFilas] = useState<FilaParseada[]>([])
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: number; errores: number } | null>(null)
  const [archivoNombre, setArchivoNombre] = useState('')

  const filasValidas   = filas.filter(f => f.errores.length === 0)
  const filasInvalidas = filas.filter(f => f.errores.length > 0)

  function procesarArchivo(archivo: File) {
    setArchivoNombre(archivo.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      const wb = XLSX.read(data, { type: 'array', cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (rows.length === 0) return

      const parsed = parsearFilas(rows, empresaId, categorias, obras, plantillas, legajosExistentes)
      setFilas(parsed)
      setPaso('preview')
    }
    reader.readAsArrayBuffer(archivo)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (archivo) procesarArchivo(archivo)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const archivo = e.dataTransfer.files?.[0]
    if (archivo) procesarArchivo(archivo)
  }

  async function importar() {
    if (filasValidas.length === 0) return
    setCargando(true)
    const supabase = createClient()

    const datos = filasValidas.map(f => ({
      id_empresa:       empresaId,
      nro_legajo:       parseInt(f.nro_legajo),
      apellido:         f.apellido,
      nombre:           f.nombre,
      cuil:             f.cuil,
      fecha_ingreso:    f.fecha_ingreso,
      fecha_nacimiento: f.fecha_nacimiento || null,
      sexo:             f.sexo || 'Masculino',
      tipo_documento:   f.tipo_documento || 'DNI',
      nro_documento:    f.nro_documento || null,
      nacionalidad:     f.nacionalidad || 'Argentina',
      telefono:         f.telefono || null,
      direccion:        f.direccion || null,
      cp:               f.cp || null,
      localidad:        f.localidad || null,
      provincia:        f.provincia || null,
      cbu:              f.cbu || null,
      codigo_externo:   f.codigo_externo || null,
      id_categoria:     f.id_categoria,
      id_obra:          f.id_obra,
      id_plantilla:     f.id_plantilla,
      estado:           f.estado,
      activo:           true,
    }))

    const { error } = await supabase.from('legajos').insert(datos)

    if (error) {
      alert(`Error al importar: ${error.message}`)
      setCargando(false)
      return
    }

    setResultado({ ok: filasValidas.length, errores: filasInvalidas.length })
    setPaso('resultado')
    setCargando(false)
    router.refresh()
    onImportado()
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'var(--c-overlay)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    zIndex: 50, overflowY: 'auto', paddingTop: '40px', paddingBottom: '40px',
  }
  const panelStyle: React.CSSProperties = {
    background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
    borderRadius: '10px', width: '100%',
    maxWidth: paso === 'preview' ? '900px' : '520px',
    padding: '24px',
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>
              Importar legajos desde Excel
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
              {paso === 'upload' && 'Subí un archivo .xlsx con el formato indicado'}
              {paso === 'preview' && `${archivoNombre} · ${filas.length} fila${filas.length !== 1 ? 's' : ''} encontradas`}
              {paso === 'resultado' && 'Importación completada'}
            </span>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* PASO 1: Upload */}
        {paso === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', margin: '0 0 12px' }}>
                Descargá la plantilla, completala y subila para importar múltiples legajos de una vez.
                Las columnas obligatorias son: <strong>nro_legajo, apellido, nombre, cuil, fecha_ingreso</strong>.
              </p>
              <button
                onClick={descargarPlantilla}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'var(--c-elevated)', border: '0.5px solid var(--c-border)',
                  color: 'var(--c-text-primary)', borderRadius: '6px',
                  padding: '7px 14px', fontSize: '13px', cursor: 'pointer',
                }}
              >
                <Download size={14} />
                Descargar plantilla
              </button>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              style={{
                border: '1.5px dashed var(--c-border)', borderRadius: '8px',
                padding: '36px', textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <Upload size={28} color="var(--c-text-secondary)" style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', margin: 0 }}>
                Arrastrá tu archivo acá o <span style={{ color: 'var(--c-blue-btn)' }}>buscalo</span>
              </p>
              <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '4px 0 0' }}>.xlsx</p>
            </div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
          </div>
        )}

        {/* PASO 2: Preview */}
        {paso === 'preview' && (
          <div>
            {/* Resumen */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                flex: 1, padding: '12px', borderRadius: '6px',
                background: 'var(--c-green-bg)', border: '0.5px solid var(--c-green)',
              }}>
                <p style={{ fontSize: '20px', fontWeight: 600, color: 'var(--c-green)', margin: '0 0 2px' }}>{filasValidas.length}</p>
                <p style={{ fontSize: '12px', color: 'var(--c-green)', margin: 0 }}>filas válidas para importar</p>
              </div>
              {filasInvalidas.length > 0 && (
                <div style={{
                  flex: 1, padding: '12px', borderRadius: '6px',
                  background: 'var(--c-red-bg)', border: '0.5px solid var(--c-red)',
                }}>
                  <p style={{ fontSize: '20px', fontWeight: 600, color: 'var(--c-red)', margin: '0 0 2px' }}>{filasInvalidas.length}</p>
                  <p style={{ fontSize: '12px', color: 'var(--c-red)', margin: 0 }}>filas con errores (se omitirán)</p>
                </div>
              )}
            </div>

            {/* Tabla */}
            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    {['Fila', 'Nro', 'Apellido', 'Nombre', 'CUIL', 'Ingreso', 'Categoría', 'Obra', 'Estado', 'Estado validación'].map(h => (
                      <th key={h} style={{
                        padding: '6px 10px', textAlign: 'left', position: 'sticky', top: 0,
                        background: 'var(--c-surface)', color: 'var(--c-text-secondary)',
                        borderBottom: '0.5px solid var(--c-border)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map(f => (
                    <tr key={f.fila} style={{
                      background: f.errores.length > 0 ? 'var(--c-red-bg)' : undefined,
                    }}>
                      <td style={{ padding: '6px 10px', color: 'var(--c-text-muted)' }}>{f.fila}</td>
                      <td style={{ padding: '6px 10px' }}>{f.nro_legajo}</td>
                      <td style={{ padding: '6px 10px' }}>{f.apellido}</td>
                      <td style={{ padding: '6px 10px' }}>{f.nombre}</td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{f.cuil}</td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{f.fecha_ingreso}</td>
                      <td style={{ padding: '6px 10px' }}>{f.categoria || '—'}</td>
                      <td style={{ padding: '6px 10px' }}>{f.obra || '—'}</td>
                      <td style={{ padding: '6px 10px' }}>{f.estado}</td>
                      <td style={{ padding: '6px 10px', minWidth: '200px' }}>
                        {f.errores.length === 0 ? (
                          <span style={{ color: 'var(--c-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={12} /> OK
                          </span>
                        ) : (
                          <span style={{ color: 'var(--c-red)' }}>
                            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span>{f.errores.join(' · ')}</span>
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filasValidas.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--c-red)', margin: '0 0 16px' }}>
                No hay filas válidas para importar. Corregí el archivo y volvé a subirlo.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => { setPaso('upload'); setFilas([]) }}
                style={{
                  background: 'transparent', border: '0.5px solid var(--c-border)',
                  color: 'var(--c-text-secondary)', borderRadius: '6px',
                  padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
                }}
              >
                ← Cambiar archivo
              </button>
              <button
                onClick={importar}
                disabled={filasValidas.length === 0 || cargando}
                style={{
                  background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px', fontSize: '13px',
                  cursor: filasValidas.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: filasValidas.length === 0 || cargando ? 0.6 : 1,
                }}
              >
                {cargando ? 'Importando...' : `Importar ${filasValidas.length} legajo${filasValidas.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Resultado */}
        {paso === 'resultado' && resultado && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} color="var(--c-green)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: '22px', fontWeight: 600, color: 'var(--c-text-primary)', margin: '0 0 6px' }}>
              {resultado.ok} legajo{resultado.ok !== 1 ? 's' : ''} importado{resultado.ok !== 1 ? 's' : ''}
            </p>
            {resultado.errores > 0 && (
              <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', margin: '0 0 20px' }}>
                {resultado.errores} fila{resultado.errores !== 1 ? 's' : ''} omitida{resultado.errores !== 1 ? 's' : ''} por errores
              </p>
            )}
            <button
              onClick={onCerrar}
              style={{
                background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                borderRadius: '6px', padding: '8px 24px', fontSize: '13px', cursor: 'pointer',
                marginTop: resultado.errores > 0 ? 0 : '20px',
              }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
