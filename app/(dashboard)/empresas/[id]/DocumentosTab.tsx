"use client"

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Upload, FileText, Trash2, ExternalLink, X, Plus, Calendar } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type Documento = {
  id: number
  id_empresa: number
  tipo: string
  descripcion?: string
  storage_path: string
  nombre_archivo: string
  fecha_subida: string
  fecha_vencimiento?: string
}

type Presentacion = {
  id: number
  id_empresa: number
  tipo: string
  periodo: string
  storage_path_ddjj?: string
  nombre_archivo_ddjj?: string
  fecha_presentacion?: string
  monto_pago?: number
  fecha_pago?: string
  storage_path_pago?: string
  nombre_archivo_pago?: string
  observaciones?: string
}

const TIPOS_GENERAL = [
  'Constancia de Inscripción',
  'Contrato ART',
  'Seguro de Vida Colectivo',
  'Inscripción IERIC',
  'Inscripción Sindicato',
  'Poder Notarial',
  'Estatuto Social',
]

const TIPOS_MENSUAL = [
  'DDJJ F931',
  'DDJJ Sindicato',
  'DDJJ IERIC',
  'DDJJ Fodeco',
  'Detalle Empleados F931',
]

function getPeriodos() {
  const periodos = []
  const hoy = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    periodos.push({ val, label })
  }
  return periodos
}

export default function DocumentosTab({
  idEmpresa,
  documentosIniciales,
  presentacionesIniciales,
}: {
  idEmpresa: number
  documentosIniciales: Documento[]
  presentacionesIniciales: Presentacion[]
}) {
  const supabase = createClient()

  const [seccion, setSeccion] = useState<'generales' | 'mensuales'>('generales')
  const [documentos, setDocumentos] = useState<Documento[]>(documentosIniciales)
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>(presentacionesIniciales)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estados form documento general
  const [mostrarFormDoc, setMostrarFormDoc] = useState(false)
  const [tipoDoc, setTipoDoc] = useState('')
  const [tipoDocCustom, setTipoDocCustom] = useState('')
  const [descripcionDoc, setDescripcionDoc] = useState('')
  const [vencimientoDoc, setVencimientoDoc] = useState('')
  const [archivoDoc, setArchivoDoc] = useState<File | null>(null)
  const fileDocRef = useRef<HTMLInputElement>(null)

  // Estados form presentación mensual
  const [mostrarFormPres, setMostrarFormPres] = useState(false)
  const [editandoPres, setEditandoPres] = useState<Presentacion | null>(null)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  })
  const [tipoPres, setTipoPres] = useState('')
  const [tipoPresCustom, setTipoPresCustom] = useState('')
  const [fechaPresentacion, setFechaPresentacion] = useState('')
  const [montoPago, setMontoPago] = useState('')
  const [fechaPago, setFechaPago] = useState('')
  const [observacionesPres, setObservacionesPres] = useState('')
  const [archivoDDJJ, setArchivoDDJJ] = useState<File | null>(null)
  const [archivoPago, setArchivoPago] = useState<File | null>(null)
  const fileDDJJRef = useRef<HTMLInputElement>(null)
  const filePagoRef = useRef<HTMLInputElement>(null)

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }

  async function uploadFile(file: File, path: string) {
    const { error } = await supabase.storage.from('documentos').upload(path, file)
    if (error) throw error
    return path
  }

  async function verArchivo(path: string) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  // ── Documentos generales ──────────────────────────────────────

  function resetFormDoc() {
    setTipoDoc(''); setTipoDocCustom(''); setDescripcionDoc('')
    setVencimientoDoc(''); setArchivoDoc(null)
    if (fileDocRef.current) fileDocRef.current.value = ''
    setError('')
  }

  async function guardarDocumento() {
    const tipo = tipoDoc === '__custom__' ? tipoDocCustom.trim() : tipoDoc
    if (!tipo) { setError('Seleccioná o escribí un tipo'); return }
    if (!archivoDoc) { setError('Seleccioná un archivo'); return }
    setLoading(true); setError('')
    try {
      const path = `empresas/${idEmpresa}/generales/${Date.now()}_${archivoDoc.name}`
      await uploadFile(archivoDoc, path)
      const { data, error: dbError } = await supabase.from('empresa_documentos').insert({
        id_empresa: idEmpresa,
        tipo,
        descripcion: descripcionDoc || null,
        storage_path: path,
        nombre_archivo: archivoDoc.name,
        fecha_subida: new Date().toISOString().split('T')[0],
        fecha_vencimiento: vencimientoDoc || null,
      }).select().single()
      if (dbError) throw dbError
      setDocumentos(prev => [data, ...prev])
      setMostrarFormDoc(false)
      resetFormDoc()
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function eliminarDocumento(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre_archivo}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('empresa_documentos').delete().eq('id', doc.id)
    setDocumentos(prev => prev.filter(d => d.id !== doc.id))
  }

  // ── Presentaciones mensuales ──────────────────────────────────

  const presPeriodo = presentaciones.filter(p => p.periodo === periodoSeleccionado)

  function abrirNuevaPres() {
    setEditandoPres(null)
    setTipoPres(''); setTipoPresCustom(''); setFechaPresentacion('')
    setMontoPago(''); setFechaPago(''); setObservacionesPres('')
    setArchivoDDJJ(null); setArchivoPago(null)
    if (fileDDJJRef.current) fileDDJJRef.current.value = ''
    if (filePagoRef.current) filePagoRef.current.value = ''
    setError('')
    setMostrarFormPres(true)
  }

  function abrirEditarPres(pres: Presentacion) {
    setEditandoPres(pres)
    setTipoPres(TIPOS_MENSUAL.includes(pres.tipo) ? pres.tipo : '__custom__')
    setTipoPresCustom(TIPOS_MENSUAL.includes(pres.tipo) ? '' : pres.tipo)
    setFechaPresentacion(pres.fecha_presentacion || '')
    setMontoPago(pres.monto_pago ? String(pres.monto_pago) : '')
    setFechaPago(pres.fecha_pago || '')
    setObservacionesPres(pres.observaciones || '')
    setArchivoDDJJ(null); setArchivoPago(null)
    if (fileDDJJRef.current) fileDDJJRef.current.value = ''
    if (filePagoRef.current) filePagoRef.current.value = ''
    setError('')
    setMostrarFormPres(true)
  }

  async function guardarPresentacion() {
    const tipo = tipoPres === '__custom__' ? tipoPresCustom.trim() : tipoPres
    if (!tipo) { setError('Seleccioná o escribí un tipo'); return }
    setLoading(true); setError('')
    try {
      let pathDDJJ = editandoPres?.storage_path_ddjj
      let nombreDDJJ = editandoPres?.nombre_archivo_ddjj
      let pathPago = editandoPres?.storage_path_pago
      let nombrePago = editandoPres?.nombre_archivo_pago

      if (archivoDDJJ) {
        pathDDJJ = `empresas/${idEmpresa}/mensuales/${periodoSeleccionado}/${Date.now()}_ddjj_${archivoDDJJ.name}`
        await uploadFile(archivoDDJJ, pathDDJJ)
        nombreDDJJ = archivoDDJJ.name
      }
      if (archivoPago) {
        pathPago = `empresas/${idEmpresa}/mensuales/${periodoSeleccionado}/${Date.now()}_pago_${archivoPago.name}`
        await uploadFile(archivoPago, pathPago)
        nombrePago = archivoPago.name
      }

      const datos = {
        id_empresa: idEmpresa,
        tipo,
        periodo: periodoSeleccionado,
        storage_path_ddjj: pathDDJJ || null,
        nombre_archivo_ddjj: nombreDDJJ || null,
        fecha_presentacion: fechaPresentacion || null,
        monto_pago: montoPago ? parseFloat(montoPago) : null,
        fecha_pago: fechaPago || null,
        storage_path_pago: pathPago || null,
        nombre_archivo_pago: nombrePago || null,
        observaciones: observacionesPres || null,
      }

      if (editandoPres) {
        const { data, error: dbError } = await supabase.from('empresa_presentaciones')
          .update(datos).eq('id', editandoPres.id).select().single()
        if (dbError) throw dbError
        setPresentaciones(prev => prev.map(p => p.id === editandoPres.id ? data : p))
      } else {
        const { data, error: dbError } = await supabase.from('empresa_presentaciones')
          .insert(datos).select().single()
        if (dbError) throw dbError
        setPresentaciones(prev => [data, ...prev])
      }

      setMostrarFormPres(false)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function eliminarPresentacion(pres: Presentacion) {
    if (!confirm(`¿Eliminar ${pres.tipo} de ${pres.periodo}?`)) return
    const paths = [pres.storage_path_ddjj, pres.storage_path_pago].filter(Boolean) as string[]
    if (paths.length) await supabase.storage.from('documentos').remove(paths)
    await supabase.from('empresa_presentaciones').delete().eq('id', pres.id)
    setPresentaciones(prev => prev.filter(p => p.id !== pres.id))
  }

  const btnPrimary = {
    background: '#2563eb', color: 'white', border: 'none',
    borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
  }

  return (
    <div>
      {/* Sub-tabs generales / mensuales */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['generales', 'mensuales'] as const).map(s => (
          <button key={s} onClick={() => setSeccion(s)} style={{
            padding: '6px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
            border: seccion === s ? '1px solid #2563eb' : '0.5px solid #30363d',
            background: seccion === s ? '#1e3a5f' : 'transparent',
            color: seccion === s ? '#58a6ff' : '#8b949e',
          }}>
            {s === 'generales' ? 'Documentos Generales' : 'Presentaciones Mensuales'}
          </button>
        ))}
      </div>

      {/* ═══ GENERALES ═══ */}
      {seccion === 'generales' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setMostrarFormDoc(true)} style={btnPrimary}>
              <Plus size={14} /> Nuevo documento
            </button>
          </div>

          {documentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#8b949e', fontSize: '13px',
              background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px' }}>
              No hay documentos cargados todavía.
            </div>
          ) : (
            <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                    {['Tipo', 'Descripción', 'Archivo', 'Fecha subida', 'Vencimiento', ''].map(col => (
                      <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc, i) => {
                    const vencido = doc.fecha_vencimiento && new Date(doc.fecha_vencimiento + 'T00:00:00') < new Date()
                    return (
                      <tr key={doc.id} style={{ borderBottom: i < documentos.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                        <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{doc.tipo}</td>
                        <td style={{ padding: '10px 16px', color: '#8b949e' }}>{doc.descripcion || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#58a6ff', fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.nombre_archivo}
                        </td>
                        <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(doc.fecha_subida)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          {doc.fecha_vencimiento
                            ? <span style={{ color: vencido ? '#f85149' : '#8b949e' }}>{formatFecha(doc.fecha_vencimiento)}</span>
                            : <span style={{ color: '#8b949e' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button onClick={() => verArchivo(doc.storage_path)} style={{
                            background: 'transparent', border: '0.5px solid #30363d',
                            color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                            padding: '3px 10px', borderRadius: '4px', marginRight: '6px',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                          }}>
                            <ExternalLink size={12} /> Ver
                          </button>
                          <button onClick={() => eliminarDocumento(doc)} style={{
                            background: 'transparent', border: 'none',
                            color: '#f85149', cursor: 'pointer', padding: '3px 6px',
                          }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ MENSUALES ═══ */}
      {seccion === 'mensuales' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={14} color="#8b949e" />
              <select value={periodoSeleccionado} onChange={e => setPeriodoSeleccionado(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}>
                {getPeriodos().map(p => (
                  <option key={p.val} value={p.val}>{p.label}</option>
                ))}
              </select>
            </div>
            <button onClick={abrirNuevaPres} style={btnPrimary}>
              <Plus size={14} /> Nueva presentación
            </button>
          </div>

          {presPeriodo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#8b949e', fontSize: '13px',
              background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px' }}>
              No hay presentaciones para este período.
            </div>
          ) : (
            <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                    {['Tipo', 'DDJJ', 'Fecha Pres.', 'Monto', 'Fecha Pago', 'Comprobante', ''].map(col => (
                      <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {presPeriodo.map((pres, i) => (
                    <tr key={pres.id} style={{ borderBottom: i < presPeriodo.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{pres.tipo}</td>
                      <td style={{ padding: '10px 16px' }}>
                        {pres.storage_path_ddjj ? (
                          <button onClick={() => verArchivo(pres.storage_path_ddjj!)} style={{
                            background: 'transparent', border: '0.5px solid #30363d',
                            color: '#58a6ff', cursor: 'pointer', fontSize: '12px',
                            padding: '2px 8px', borderRadius: '4px',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                          }}>
                            <FileText size={12} /> {pres.nombre_archivo_ddjj}
                          </button>
                        ) : <span style={{ color: '#8b949e' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                        {pres.fecha_presentacion ? formatFecha(pres.fecha_presentacion) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                        {pres.monto_pago ? `$${Number(pres.monto_pago).toLocaleString('es-AR')}` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                        {pres.fecha_pago ? formatFecha(pres.fecha_pago) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {pres.storage_path_pago ? (
                          <button onClick={() => verArchivo(pres.storage_path_pago!)} style={{
                            background: 'transparent', border: '0.5px solid #30363d',
                            color: '#58a6ff', cursor: 'pointer', fontSize: '12px',
                            padding: '2px 8px', borderRadius: '4px',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                          }}>
                            <FileText size={12} /> {pres.nombre_archivo_pago}
                          </button>
                        ) : <span style={{ color: '#8b949e' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => abrirEditarPres(pres)} style={{
                          background: 'transparent', border: 'none',
                          color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '3px 8px',
                        }}>Editar</button>
                        <button onClick={() => eliminarPresentacion(pres)} style={{
                          background: 'transparent', border: 'none',
                          color: '#f85149', cursor: 'pointer', fontSize: '12px', padding: '3px 8px',
                        }}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL: Documento General ═══ */}
      {mostrarFormDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '460px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Nuevo documento</h2>
              <button onClick={() => { setMostrarFormDoc(false); resetFormDoc() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tipo *</label>
                <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Seleccioná un tipo...</option>
                  {TIPOS_GENERAL.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="__custom__">+ Otro tipo...</option>
                </select>
              </div>
              {tipoDoc === '__custom__' && (
                <div>
                  <label style={labelStyle}>Nombre del tipo *</label>
                  <input value={tipoDocCustom} onChange={e => setTipoDocCustom(e.target.value)}
                    style={inputStyle} placeholder="Ej: Certificado AFIP" />
                </div>
              )}
              <div>
                <label style={labelStyle}>Descripción (opcional)</label>
                <input value={descripcionDoc} onChange={e => setDescripcionDoc(e.target.value)}
                  style={inputStyle} placeholder="Ej: Vigente 2026" />
              </div>
              <div>
                <label style={labelStyle}>Fecha de vencimiento (opcional)</label>
                <input type="date" value={vencimientoDoc} onChange={e => setVencimientoDoc(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Archivo *</label>
                <input ref={fileDocRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={e => setArchivoDoc(e.target.files?.[0] || null)}
                  style={{ ...inputStyle, padding: '6px 10px', cursor: 'pointer' }} />
              </div>
              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => { setMostrarFormDoc(false); resetFormDoc() }} style={{
                  background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e',
                  borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
                }}>Cancelar</button>
                <button onClick={guardarDocumento} disabled={loading} style={{
                  background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {loading ? 'Subiendo...' : <><Upload size={13} /> Guardar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Presentación Mensual ═══ */}
      {mostrarFormPres && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '500px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>
                {editandoPres ? 'Editar presentación' : 'Nueva presentación'}
              </h2>
              <button onClick={() => setMostrarFormPres(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tipo *</label>
                <select value={tipoPres} onChange={e => setTipoPres(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Seleccioná un tipo...</option>
                  {TIPOS_MENSUAL.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="__custom__">+ Otro tipo...</option>
                </select>
              </div>
              {tipoPres === '__custom__' && (
                <div>
                  <label style={labelStyle}>Nombre del tipo *</label>
                  <input value={tipoPresCustom} onChange={e => setTipoPresCustom(e.target.value)}
                    style={inputStyle} placeholder="Ej: DDJJ Obra Social" />
                </div>
              )}

              {/* DDJJ */}
              <div style={{ borderTop: '0.5px solid #21262d', paddingTop: '14px', marginTop: '4px' }}>
                <p style={{ fontSize: '12px', color: '#8b949e', margin: '0 0 10px', fontWeight: 500 }}>DDJJ / Declaración</p>
                <div>
                  <label style={labelStyle}>Archivo DDJJ</label>
                  {editandoPres?.nombre_archivo_ddjj && !archivoDDJJ && (
                    <p style={{ fontSize: '12px', color: '#58a6ff', margin: '0 0 6px' }}>
                      Actual: {editandoPres.nombre_archivo_ddjj}
                    </p>
                  )}
                  <input ref={fileDDJJRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                    onChange={e => setArchivoDDJJ(e.target.files?.[0] || null)}
                    style={{ ...inputStyle, padding: '6px 10px', cursor: 'pointer' }} />
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label style={labelStyle}>Fecha de presentación</label>
                  <input type="date" value={fechaPresentacion} onChange={e => setFechaPresentacion(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Pago */}
              <div style={{ borderTop: '0.5px solid #21262d', paddingTop: '14px', marginTop: '4px' }}>
                <p style={{ fontSize: '12px', color: '#8b949e', margin: '0 0 10px', fontWeight: 500 }}>Pago</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Monto</label>
                    <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                      style={inputStyle} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={labelStyle}>Fecha de pago</label>
                    <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label style={labelStyle}>Comprobante de pago</label>
                  {editandoPres?.nombre_archivo_pago && !archivoPago && (
                    <p style={{ fontSize: '12px', color: '#58a6ff', margin: '0 0 6px' }}>
                      Actual: {editandoPres.nombre_archivo_pago}
                    </p>
                  )}
                  <input ref={filePagoRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setArchivoPago(e.target.files?.[0] || null)}
                    style={{ ...inputStyle, padding: '6px 10px', cursor: 'pointer' }} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Observaciones</label>
                <input value={observacionesPres} onChange={e => setObservacionesPres(e.target.value)} style={inputStyle} />
              </div>

              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setMostrarFormPres(false)} style={{
                  background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e',
                  borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
                }}>Cancelar</button>
                <button onClick={guardarPresentacion} disabled={loading} style={{
                  background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}>{loading ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
