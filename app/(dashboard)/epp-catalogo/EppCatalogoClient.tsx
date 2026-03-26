"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Tag } from 'lucide-react'
import { traducirError } from '@/lib/errores'

type EppCatalogo = {
  id: number
  id_empresa: number
  codigo: string
  descripcion: string
  tipo: string
  controla_stock: boolean
  tiene_vencimiento: boolean
  meses_renovacion?: number
  requiere_talle: boolean
  activo: boolean
}

type EppTalle = {
  id: number
  id_empresa: number
  id_epp: number
  talle: string
  activo: boolean
}

const TIPOS = [
  { value: 'epp',         label: 'EPP' },
  { value: 'ropa',        label: 'Ropa de trabajo' },
  { value: 'herramienta', label: 'Herramienta' },
  { value: 'otro',        label: 'Otro' },
]

const badgeTipo = (tipo: string) => {
  const colores: Record<string, { bg: string, color: string }> = {
    epp:         { bg: 'var(--c-blue-bg)', color: 'var(--c-blue)' },
    ropa:        { bg: 'var(--c-orange-bg)', color: 'var(--c-orange)' },
    herramienta: { bg: 'var(--c-elevated)', color: 'var(--c-text-secondary)' },
    otro:        { bg: 'var(--c-purple-bg)', color: 'var(--c-purple)' },
  }
  const c = colores[tipo] || colores.otro
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
      {TIPOS.find(t => t.value === tipo)?.label || tipo}
    </span>
  )
}

export default function EppCatalogoClient({
  catalogo, talles,
}: {
  catalogo: EppCatalogo[]
  talles: EppTalle[]
}) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()

  // Modal catálogo
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<EppCatalogo | null>(null)
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState('epp')
  const [controlaStock, setControlaStock] = useState(true)
  const [tieneVencimiento, setTieneVencimiento] = useState(false)
  const [mesesRenovacion, setMesesRenovacion] = useState('')
  const [requiereTalle, setRequiereTalle] = useState(false)
  const [activo, setActivo] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modal talles
  const [itemTalles, setItemTalles] = useState<EppCatalogo | null>(null)
  const [tallesLocales, setTallesLocales] = useState<EppTalle[]>([])
  const [nuevoTalle, setNuevoTalle] = useState('')
  const [loadingTalle, setLoadingTalle] = useState(false)

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
  }
  const selectStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px',
  }
  const labelStyle = { fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }

  const catalogoFiltrado = catalogo.filter(c => c.id_empresa === empresaActiva?.id)

  // --- CRUD Catálogo ---
  function abrirNuevo() {
    setEditando(null)
    setCodigo(''); setDescripcion(''); setTipo('epp')
    setControlaStock(true); setTieneVencimiento(false)
    setMesesRenovacion(''); setRequiereTalle(false); setActivo(true)
    setError(''); setMostrarForm(true)
  }

  function abrirEditar(item: EppCatalogo) {
    setEditando(item)
    setCodigo(item.codigo); setDescripcion(item.descripcion); setTipo(item.tipo)
    setControlaStock(item.controla_stock); setTieneVencimiento(item.tiene_vencimiento)
    setMesesRenovacion(item.meses_renovacion ? String(item.meses_renovacion) : '')
    setRequiereTalle(item.requiere_talle); setActivo(item.activo)
    setError(''); setMostrarForm(true)
  }

  async function guardar() {
    if (!empresaActiva) return
    setLoading(true); setError('')
    const supabase = createClient()
    const datos = {
      codigo, descripcion, tipo,
      controla_stock: controlaStock,
      tiene_vencimiento: tieneVencimiento,
      meses_renovacion: tieneVencimiento && mesesRenovacion ? parseInt(mesesRenovacion) : null,
      requiere_talle: requiereTalle,
      activo,
    }
    if (editando) {
      const { error } = await supabase.from('epp_catalogo').update(datos).eq('id', editando.id)
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    } else {
      const { error } = await supabase.from('epp_catalogo').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(traducirError(error.message)); setLoading(false); return }
    }
    router.refresh(); setMostrarForm(false); setEditando(null); setLoading(false)
  }

  // --- Talles ---
  function abrirTalles(item: EppCatalogo) {
    setItemTalles(item)
    setTallesLocales(talles.filter(t => t.id_epp === item.id))
    setNuevoTalle('')
  }

  async function agregarTalle() {
    if (!empresaActiva || !itemTalles || !nuevoTalle.trim()) return
    setLoadingTalle(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('epp_talles')
      .insert({ id_empresa: empresaActiva.id, id_epp: itemTalles.id, talle: nuevoTalle.trim().toUpperCase(), activo: true })
      .select()
      .single()
    if (!error && data) {
      setTallesLocales(prev => [...prev, data])
      setNuevoTalle('')
    }
    setLoadingTalle(false)
  }

  async function toggleActivoTalle(talle: EppTalle) {
    const supabase = createClient()
    const nuevoActivo = !talle.activo
    const { error } = await supabase.from('epp_talles').update({ activo: nuevoActivo }).eq('id', talle.id)
    if (!error) {
      setTallesLocales(prev => prev.map(t => t.id === talle.id ? { ...t, activo: nuevoActivo } : t))
    }
  }

  async function eliminarTalle(talle: EppTalle) {
    if (!confirm(`¿Eliminar talle "${talle.talle}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('epp_talles').delete().eq('id', talle.id)
    if (!error) {
      setTallesLocales(prev => prev.filter(t => t.id !== talle.id))
    }
  }

  function cerrarTalles() {
    setItemTalles(null)
    router.refresh()
  }

  if (!empresaActiva) {
    return <div style={{ color: 'var(--c-text-secondary)', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <>
      {/* Modal catálogo */}
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                {editando ? 'Editar item' : 'Nuevo item'}
              </h2>
              <button onClick={() => setMostrarForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Código *</label>
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ej: CASCO" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={selectStyle}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Descripción *</label>
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Casco de seguridad" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="controla_stock" checked={controlaStock} onChange={(e) => setControlaStock(e.target.checked)} />
                  <label htmlFor="controla_stock" style={{ fontSize: '13px', color: 'var(--c-text-primary)', cursor: 'pointer' }}>
                    Controla stock
                    <span style={{ fontSize: '11px', color: 'var(--c-text-secondary)', marginLeft: '6px' }}>— aparece en el módulo de stock</span>
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="tiene_vencimiento" checked={tieneVencimiento} onChange={(e) => setTieneVencimiento(e.target.checked)} />
                  <label htmlFor="tiene_vencimiento" style={{ fontSize: '13px', color: 'var(--c-text-secondary)', cursor: 'pointer' }}>Tiene vencimiento</label>
                </div>
                {tieneVencimiento && (
                  <div style={{ paddingLeft: '24px' }}>
                    <label style={labelStyle}>Renovar cada (meses)</label>
                    <input type="number" value={mesesRenovacion} onChange={(e) => setMesesRenovacion(e.target.value)} placeholder="Ej: 12" style={{ ...inputStyle, width: '120px' }} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="requiere_talle" checked={requiereTalle} onChange={(e) => setRequiereTalle(e.target.checked)} />
                  <label htmlFor="requiere_talle" style={{ fontSize: '13px', color: 'var(--c-text-secondary)', cursor: 'pointer' }}>Requiere talle</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="activo" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                  <label htmlFor="activo" style={{ fontSize: '13px', color: 'var(--c-text-secondary)', cursor: 'pointer' }}>Activo</label>
                </div>
              </div>

              {error && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setMostrarForm(false)} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} disabled={loading || !codigo || !descripcion} style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal talles */}
      {itemTalles && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>Talles</h2>
              <button onClick={cerrarTalles} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: '0 0 20px' }}>{itemTalles.descripcion}</p>

            {/* Lista de talles */}
            {tallesLocales.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '16px' }}>Sin talles definidos todavía.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {tallesLocales.map(t => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: t.activo ? 'var(--c-blue-bg)' : 'var(--c-elevated)',
                    border: `0.5px solid ${t.activo ? 'var(--c-blue-btn)' : 'var(--c-border)'}`,
                    borderRadius: '6px', padding: '5px 10px',
                  }}>
                    <span style={{ fontSize: '13px', color: t.activo ? 'var(--c-text-primary)' : 'var(--c-text-muted)', fontWeight: 500 }}>
                      {t.talle}
                    </span>
                    <button
                      onClick={() => toggleActivoTalle(t)}
                      title={t.activo ? 'Desactivar' : 'Activar'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.activo ? 'var(--c-green)' : 'var(--c-text-muted)', padding: '0 2px', fontSize: '11px' }}
                    >
                      {t.activo ? '●' : '○'}
                    </button>
                    <button
                      onClick={() => eliminarTalle(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-muted)', padding: '0 2px' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar talle */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={nuevoTalle}
                onChange={(e) => setNuevoTalle(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && agregarTalle()}
                placeholder="Ej: XL"
                maxLength={10}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: '6px',
                  background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
                  color: 'var(--c-text-primary)', fontSize: '13px',
                }}
              />
              <button
                onClick={agregarTalle}
                disabled={loadingTalle || !nuevoTalle.trim()}
                style={{
                  background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 14px',
                  fontSize: '13px', cursor: 'pointer', opacity: !nuevoTalle.trim() ? 0.5 : 1,
                }}
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>EPP y Ropa — Catálogo</h1>
          <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
            {empresaActiva.razon_social} · {catalogoFiltrado.length} item{catalogoFiltrado.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={abrirNuevo} style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>
          + Nuevo item
        </button>
      </div>

      {/* Tabla */}
      {catalogoFiltrado.length === 0 ? (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          No hay items en el catálogo. Agregá EPPs, ropa y herramientas.
        </div>
      ) : (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                {['Código', 'Descripción', 'Tipo', 'Stock', 'Vencimiento', 'Talles', 'Estado'].map(col => (
                  <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>{col}</th>
                ))}
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {catalogoFiltrado.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: i < catalogoFiltrado.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: 'var(--c-elevated)', color: 'var(--c-text-primary)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{item.codigo}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)', fontWeight: 500 }}>{item.descripcion}</td>
                  <td style={{ padding: '10px 16px' }}>{badgeTipo(item.tipo)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    {item.controla_stock ? (
                      <span style={{ background: 'var(--c-green-bg)', color: 'var(--c-green)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Sí</span>
                    ) : (
                      <span style={{ background: 'var(--c-elevated)', color: 'var(--c-text-muted)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>No</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>
                    {item.tiene_vencimiento ? `${item.meses_renovacion} meses` : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {item.requiere_talle ? (
                      <button
                        onClick={() => abrirTalles(item)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: 'transparent', border: '0.5px solid var(--c-border)',
                          color: 'var(--c-blue)', cursor: 'pointer', fontSize: '11px',
                          padding: '3px 8px', borderRadius: '4px',
                        }}
                      >
                        <Tag size={10} />
                        {talles.filter(t => t.id_epp === item.id && t.activo).length} talles
                      </button>
                    ) : (
                      <span style={{ color: 'var(--c-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: item.activo ? 'var(--c-green-bg)' : 'var(--c-red-bg)',
                      color: item.activo ? 'var(--c-green)' : 'var(--c-red)',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button onClick={() => abrirEditar(item)} style={{ background: 'transparent', border: 'none', color: 'var(--c-text-secondary)', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
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
