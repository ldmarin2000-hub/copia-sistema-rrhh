"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { traducirError } from '@/lib/errores'

type TipoAusencia = {
  id: number
  id_empresa?: number
  codigo?: string
  descripcion: string
  pierde_presentismo: boolean
  requiere_certificado: boolean
  remunerada: boolean
  cuenta_dias_corridos: boolean
  activo: boolean
}

export default function TiposAusenciaClient({ tipos }: { tipos: TipoAusencia[] }) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<TipoAusencia | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [pierdePresentismo, setPierdePresentismo] = useState(true)
  const [requiereCertificado, setRequiereCertificado] = useState(false)
  const [remunerada, setRemunerada] = useState(true)
  const [activo, setActivo] = useState(true)
  const [cuentaDiasCorridos, setCuentaDiasCorridos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState('')

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px'
  }

  const checkRow = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <label style={{ fontSize: '13px', color: '#8b949e', cursor: 'pointer' }}>{label}</label>
    </div>
  )

  const [busqueda, setBusqueda] = useState('')
  type SortCol = 'codigo' | 'descripcion'
  const [sortCol, setSortCol] = useState<SortCol>('descripcion')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  const sortIcon = (col: SortCol) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp size={12} style={{ marginLeft: '4px' }} /> : <ChevronDown size={12} style={{ marginLeft: '4px' }} />)
    : <ChevronsUpDown size={12} style={{ marginLeft: '4px', opacity: 0.4 }} />

  // Mostrar globales + los de la empresa activa
  const b = busqueda.toLowerCase()
  const tiposFiltrados = tipos.filter(t =>
    t.id_empresa === null || t.id_empresa === undefined || t.id_empresa === empresaActiva?.id
  ).filter(t =>
    (t.codigo || '').toLowerCase().includes(b) ||
    t.descripcion.toLowerCase().includes(b)
  ).sort((a, z) => {
    const va = (sortCol === 'codigo' ? (a.codigo || '') : a.descripcion).toLowerCase()
    const vz = (sortCol === 'codigo' ? (z.codigo || '') : z.descripcion).toLowerCase()
    return sortDir === 'asc' ? va.localeCompare(vz) : vz.localeCompare(va)
  })

  function abrirNuevo() {
    setEditando(null)
    setDescripcion('')
    setPierdePresentismo(true)
    setRequiereCertificado(false)
    setRemunerada(true)
    setCuentaDiasCorridos(false)
    setActivo(true)
    setError('')
    setMostrarForm(true)
    setCodigo('')
  }

  function abrirEditar(t: TipoAusencia) {
    // No editar los globales
    if (!t.id_empresa) return
    setEditando(t)
    setDescripcion(t.descripcion)
    setPierdePresentismo(t.pierde_presentismo)
    setRequiereCertificado(t.requiere_certificado)
    setRemunerada(t.remunerada)
    setCuentaDiasCorridos(t.cuenta_dias_corridos)
    setActivo(t.activo)
    setError('')
    setMostrarForm(true)
    setCodigo(t.codigo || '')
  }

  function cerrar() {
    setMostrarForm(false)
    setEditando(null)
  }

  async function guardar() {
    if (!empresaActiva) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    const datos = {
      codigo,
      descripcion,
      pierde_presentismo: pierdePresentismo,
      requiere_certificado: requiereCertificado,
      remunerada,
      cuenta_dias_corridos: cuentaDiasCorridos,
      activo,
    }

    if (editando) {
      const { error } = await supabase
        .from('tipos_ausencia').update(datos).eq('id', editando.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { error } = await supabase
        .from('tipos_ausencia').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminar(t: TipoAusencia) {
    if (!t.id_empresa) return // No eliminar globales
    if (!confirm(`¿Eliminar "${t.descripcion}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('tipos_ausencia').delete().eq('id', t.id)
    if (error) alert('No se puede eliminar: ' + traducirError(error.message))
    else router.refresh()
  }

  const badge = (valor: boolean, si: string, no: string) => (
    <span style={{
      background: valor ? '#1a3a2a' : '#3a1a1a',
      color: valor ? '#3fb950' : '#f85149',
      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
    }}>{valor ? si : no}</span>
  )

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <>
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#161b22', border: '0.5px solid #30363d',
            borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
                  {editando ? 'Editar tipo de ausencia' : 'Nuevo tipo de ausencia'}
                </h2>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>{empresaActiva.razon_social}</span>
              </div>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={labelStyle}>Código *</label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: EC"
                maxLength={10}
                style={inputStyle}
              />
            </div>


            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Descripción *</label>
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={inputStyle} />
              </div>
              {checkRow('Pierde presentismo', pierdePresentismo, setPierdePresentismo)}
              {checkRow('Requiere certificado', requiereCertificado, setRequiereCertificado)}
              {checkRow('Remunerada', remunerada, setRemunerada)}
              {checkRow('Cuenta días corridos (incluye fines de semana)', cuentaDiasCorridos, setCuentaDiasCorridos)}
              {checkRow('Activo', activo, setActivo)}
              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{
                background: 'transparent', border: '0.5px solid #30363d',
                color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={guardar} disabled={loading || !descripcion} style={{
                background: '#2563eb', color: 'white', border: 'none',
                borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear tipo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buscar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código o descripción..."
          style={{
            width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
            background: '#161b22', border: '0.5px solid #30363d',
            color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Tipos de ausencia</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            Globales + {empresaActiva.razon_social}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
        }}>+ Nuevo tipo</button>
      </div>

      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #30363d' }}>
              {([['Código','codigo'],['Descripción','descripcion']] as [string,SortCol][]).map(([label, col]) => (
                <th key={col} onClick={() => toggleSort(col)} style={{
                  textAlign: 'left', padding: '10px 16px',
                  color: '#8b949e', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>{label}{sortIcon(col)}</span>
                </th>
              ))}
              {['Presentismo','Certificado','Remunerada','Días','Origen','Estado'].map(col => (
                <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
              ))}
              <th style={{ padding: '10px 16px' }}></th>
            </tr>
          </thead>
          <tbody>
            {tiposFiltrados.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: i < tiposFiltrados.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    background: '#21262d', color: '#e6edf3',
                    fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                  }}>{t.codigo || '—'}</span>
                </td>
                <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{t.descripcion}</td>
                <td style={{ padding: '10px 16px' }}>{badge(t.pierde_presentismo, 'Pierde', 'No pierde')}</td>
                <td style={{ padding: '10px 16px' }}>{badge(t.requiere_certificado, 'Sí', 'No')}</td>
                <td style={{ padding: '10px 16px' }}>{badge(t.remunerada, 'Sí', 'No')}</td>
                <td style={{ padding: '10px 16px' }}>{badge(t.cuenta_dias_corridos, 'Corridos', 'Hábiles')}</td>
                <td style={{ padding: '10px 16px' }}>
                  {!t.id_empresa ? (
                    <span style={{ background: '#2a1a3a', color: '#bc8cff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Global</span>
                  ) : (
                    <span style={{ background: '#1a2a3a', color: '#58a6ff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Empresa</span>
                  )}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    background: t.activo ? '#1a3a2a' : '#3a1a1a',
                    color: t.activo ? '#3fb950' : '#f85149',
                    fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                  }}>{t.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  {t.id_empresa && (
                    <>
                      <button onClick={() => abrirEditar(t)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
                      <button onClick={() => eliminar(t)} style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Eliminar</button>
                    </>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}