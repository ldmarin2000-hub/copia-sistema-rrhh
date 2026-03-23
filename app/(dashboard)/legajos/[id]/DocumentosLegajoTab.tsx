"use client"

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { ExternalLink, Trash2, X, Plus, Upload } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type Documento = {
  id: number
  id_legajo: number
  tipo: string
  descripcion?: string
  storage_path: string
  nombre_archivo: string
  fecha_subida: string
  fecha_vencimiento?: string
}

const TIPOS = [
  'DNI',
  'Alta AFIP',
  'Contrato de trabajo',
  'Certificado de estudios',
  'Carnet de conducir',
  'Certificado IERIC',
  'Certificado médico preocupacional',
  'Certificado ART',
  'Recibo de sueldo',
  'Alta en sindicato',
]

export default function DocumentosLegajoTab({
  idLegajo,
  documentosIniciales,
}: {
  idLegajo: number
  documentosIniciales: Documento[]
}) {
  const supabase = createClient()
  const [documentos, setDocumentos] = useState<Documento[]>(documentosIniciales)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [tipo, setTipo] = useState('')
  const [tipoCustom, setTipoCustom] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }

  function resetForm() {
    setTipo(''); setTipoCustom(''); setDescripcion(''); setVencimiento(''); setArchivo(null)
    if (fileRef.current) fileRef.current.value = ''
    setError('')
  }

  async function verArchivo(path: string) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function guardar() {
    const tipoFinal = tipo === '__custom__' ? tipoCustom.trim() : tipo
    if (!tipoFinal) { setError('Seleccioná o escribí un tipo'); return }
    if (!archivo) { setError('Seleccioná un archivo'); return }
    setLoading(true); setError('')
    try {
      const path = `legajos/${idLegajo}/${Date.now()}_${archivo.name}`
      const { error: uploadError } = await supabase.storage.from('documentos').upload(path, archivo)
      if (uploadError) throw uploadError

      const { data, error: dbError } = await supabase.from('legajo_documentos').insert({
        id_legajo: idLegajo,
        tipo: tipoFinal,
        descripcion: descripcion || null,
        storage_path: path,
        nombre_archivo: archivo.name,
        fecha_subida: new Date().toISOString().split('T')[0],
        fecha_vencimiento: vencimiento || null,
      }).select().single()
      if (dbError) throw dbError

      setDocumentos(prev => [data, ...prev])
      setMostrarForm(false)
      resetForm()
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function eliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre_archivo}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('legajo_documentos').delete().eq('id', doc.id)
    setDocumentos(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={() => setMostrarForm(true)} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Plus size={14} /> Nuevo documento
        </button>
      </div>

      {documentos.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px',
          padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '13px',
        }}>
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
                      <button onClick={() => eliminar(doc)} style={{
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

      {/* Modal */}
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '460px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Nuevo documento</h2>
              <button onClick={() => { setMostrarForm(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tipo *</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Seleccioná un tipo...</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="__custom__">+ Otro tipo...</option>
                </select>
              </div>
              {tipo === '__custom__' && (
                <div>
                  <label style={labelStyle}>Nombre del tipo *</label>
                  <input value={tipoCustom} onChange={e => setTipoCustom(e.target.value)}
                    style={inputStyle} placeholder="Ej: Certificado de Obra" />
                </div>
              )}
              <div>
                <label style={labelStyle}>Descripción (opcional)</label>
                <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  style={inputStyle} placeholder="Ej: Vence marzo 2027" />
              </div>
              <div>
                <label style={labelStyle}>Fecha de vencimiento (opcional)</label>
                <input type="date" value={vencimiento} onChange={e => setVencimiento(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Archivo *</label>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setArchivo(e.target.files?.[0] || null)}
                  style={{ ...inputStyle, padding: '6px 10px', cursor: 'pointer' }} />
              </div>
              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => { setMostrarForm(false); resetForm() }} style={{
                  background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e',
                  borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
                }}>Cancelar</button>
                <button onClick={guardar} disabled={loading} style={{
                  background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px', fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {loading ? 'Subiendo...' : <><Upload size={13} /> Guardar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
