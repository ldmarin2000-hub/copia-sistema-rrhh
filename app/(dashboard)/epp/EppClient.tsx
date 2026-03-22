"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { X, Package, Archive, Truck } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type EppCatalogo = {
  id: number
  id_empresa: number
  codigo: string
  descripcion: string
  tipo: string
  tiene_vencimiento: boolean
  meses_renovacion?: number
  requiere_talle: boolean
  activo: boolean
}

type EppStock = {
  id: number
  id_empresa: number
  id_epp: number
  id_obra?: number
  talle?: string
  cantidad_disponible: number
  cantidad_minima: number
  epp_catalogo: { descripcion: string }
  obras?: { nombre: string }
}

type EppEntrega = {
  id: number
  id_empresa: number
  id_legajo: number
  id_epp: number
  id_obra?: number
  fecha_entrega: string
  cantidad: number
  talle?: string
  fecha_vencimiento?: string
  firmado: boolean
  devuelto: boolean
  observaciones?: string
  epp_catalogo: { descripcion: string }
  legajos: { apellido: string, nombre: string, nro_legajo: number }
  obras?: { nombre: string }
}

type Obra = { id: number, id_empresa: number, nombre: string }
type Legajo = { id: number, id_empresa: number, apellido: string, nombre: string, nro_legajo: number }

const TIPOS = [
  { value: 'ropa',        label: 'Ropa de trabajo' },
  { value: 'epp',         label: 'EPP' },
  { value: 'herramienta', label: 'Herramienta' },
  { value: 'otro',        label: 'Otro' },
]

const TABS = [
  { id: 'catalogo',  label: 'Catálogo',  icon: Package },
  { id: 'stock',     label: 'Stock',     icon: Archive },
  { id: 'entregas',  label: 'Entregas',  icon: Truck },
]

export default function EppClient({
  catalogo, stock, entregas, obras, legajos
}: {
  catalogo: EppCatalogo[]
  stock: EppStock[]
  entregas: EppEntrega[]
  obras: Obra[]
  legajos: Legajo[]
}) {
  const router = useRouter()
  const { empresaActiva } = useEmpresa()
  const [tabActiva, setTabActiva] = useState('catalogo')

  // Estados catálogo
  const [mostrarFormCatalogo, setMostrarFormCatalogo] = useState(false)
  const [editandoCatalogo, setEditandoCatalogo] = useState<EppCatalogo | null>(null)
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState('epp')
  const [tieneVencimiento, setTieneVencimiento] = useState(false)
  const [mesesRenovacion, setMesesRenovacion] = useState('')
  const [requiereTalle, setRequiereTalle] = useState(false)
  const [activo, setActivo] = useState(true)

  // Estados stock
  const [mostrarFormStock, setMostrarFormStock] = useState(false)
  const [editandoStock, setEditandoStock] = useState<EppStock | null>(null)
  const [idEppStock, setIdEppStock] = useState('')
  const [idObraStock, setIdObraStock] = useState('')
  const [talleStock, setTalleStock] = useState('')
  const [cantidadDisponible, setCantidadDisponible] = useState('0')
  const [cantidadMinima, setCantidadMinima] = useState('0')

  // Estados entregas
  const [mostrarFormEntrega, setMostrarFormEntrega] = useState(false)
  const [idLegajoEntrega, setIdLegajoEntrega] = useState('')
  const [idEppEntrega, setIdEppEntrega] = useState('')
  const [idObraEntrega, setIdObraEntrega] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().split('T')[0])
  const [cantidadEntrega, setCantidadEntrega] = useState('1')
  const [talleEntrega, setTalleEntrega] = useState('')
  const [firmado, setFirmado] = useState(false)
  const [observacionesEntrega, setObservacionesEntrega] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const catalogoFiltrado = catalogo.filter(c => c.id_empresa === empresaActiva?.id)
  const stockFiltrado = stock.filter(s => s.id_empresa === empresaActiva?.id)
  const entregasFiltradas = entregas.filter(e => e.id_empresa === empresaActiva?.id)
  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaActiva?.id)
  const legajosFiltrados = legajos.filter(l => l.id_empresa === empresaActiva?.id)

  const hoy = new Date().toISOString().split('T')[0]
  const porVencer = entregasFiltradas.filter(e =>
    !e.devuelto && e.fecha_vencimiento &&
    e.fecha_vencimiento <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )

  // CRUD Catálogo
  function abrirNuevoCatalogo() {
    setEditandoCatalogo(null)
    setCodigo(''); setDescripcion(''); setTipo('epp')
    setTieneVencimiento(false); setMesesRenovacion('')
    setRequiereTalle(false); setActivo(true); setError('')
    setMostrarFormCatalogo(true)
  }

  function abrirEditarCatalogo(item: EppCatalogo) {
    setEditandoCatalogo(item)
    setCodigo(item.codigo); setDescripcion(item.descripcion); setTipo(item.tipo)
    setTieneVencimiento(item.tiene_vencimiento)
    setMesesRenovacion(item.meses_renovacion ? String(item.meses_renovacion) : '')
    setRequiereTalle(item.requiere_talle); setActivo(item.activo); setError('')
    setMostrarFormCatalogo(true)
  }

  async function guardarCatalogo() {
    if (!empresaActiva) return
    setLoading(true); setError('')
    const supabase = createClient()
    const datos = {
      codigo, descripcion, tipo,
      tiene_vencimiento: tieneVencimiento,
      meses_renovacion: tieneVencimiento && mesesRenovacion ? parseInt(mesesRenovacion) : null,
      requiere_talle: requiereTalle, activo,
    }
    if (editandoCatalogo) {
      const { error } = await supabase.from('epp_catalogo').update(datos).eq('id', editandoCatalogo.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.from('epp_catalogo').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(error.message); setLoading(false); return }
    }
    router.refresh(); setMostrarFormCatalogo(false); setEditandoCatalogo(null); setLoading(false)
  }

  // CRUD Stock
  function abrirNuevoStock() {
    setEditandoStock(null)
    setIdEppStock(''); setIdObraStock(''); setTalleStock('')
    setCantidadDisponible('0'); setCantidadMinima('0'); setError('')
    setMostrarFormStock(true)
  }

  function abrirEditarStock(item: EppStock) {
    setEditandoStock(item)
    setIdEppStock(String(item.id_epp))
    setIdObraStock(item.id_obra ? String(item.id_obra) : '')
    setTalleStock(item.talle || '')
    setCantidadDisponible(String(item.cantidad_disponible))
    setCantidadMinima(String(item.cantidad_minima))
    setError(''); setMostrarFormStock(true)
  }

  async function guardarStock() {
    if (!empresaActiva || !idEppStock) return
    setLoading(true); setError('')
    const supabase = createClient()
    const datos = {
      id_epp: parseInt(idEppStock),
      id_obra: idObraStock ? parseInt(idObraStock) : null,
      talle: talleStock || null,
      cantidad_disponible: parseInt(cantidadDisponible) || 0,
      cantidad_minima: parseInt(cantidadMinima) || 0,
      updated_at: new Date().toISOString(),
    }
    if (editandoStock) {
      const { error } = await supabase.from('epp_stock').update(datos).eq('id', editandoStock.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.from('epp_stock').insert({ ...datos, id_empresa: empresaActiva.id })
      if (error) { setError(error.message); setLoading(false); return }
    }
    router.refresh(); setMostrarFormStock(false); setEditandoStock(null); setLoading(false)
  }

  // Entregas
  async function guardarEntrega() {
    if (!empresaActiva || !idLegajoEntrega || !idEppEntrega) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const eppItem = catalogo.find(c => c.id === parseInt(idEppEntrega))
    let fechaVencimiento = null
    if (eppItem?.tiene_vencimiento && eppItem.meses_renovacion) {
      const d = new Date(fechaEntrega + 'T00:00:00')
      d.setMonth(d.getMonth() + eppItem.meses_renovacion)
      fechaVencimiento = d.toISOString().split('T')[0]
    }

    const { error } = await supabase.from('epp_entregas').insert({
      id_empresa: empresaActiva.id,
      id_legajo: parseInt(idLegajoEntrega),
      id_epp: parseInt(idEppEntrega),
      id_obra: idObraEntrega ? parseInt(idObraEntrega) : null,
      fecha_entrega: fechaEntrega,
      cantidad: parseInt(cantidadEntrega) || 1,
      talle: talleEntrega || null,
      fecha_vencimiento: fechaVencimiento,
      firmado,
      observaciones: observacionesEntrega || null,
      id_entregado_por: user?.id || null,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.refresh()
    setMostrarFormEntrega(false)
    setIdLegajoEntrega(''); setIdEppEntrega(''); setIdObraEntrega('')
    setFechaEntrega(new Date().toISOString().split('T')[0])
    setCantidadEntrega('1'); setTalleEntrega(''); setFirmado(false)
    setObservacionesEntrega(''); setLoading(false)
  }

  async function marcarDevuelto(entrega: EppEntrega) {
    if (!confirm(`¿Marcar como devuelto el EPP de ${entrega.legajos.apellido}?`)) return
    const supabase = createClient()
    await supabase.from('epp_entregas').update({
      devuelto: true,
      fecha_devolucion: new Date().toISOString().split('T')[0],
    }).eq('id', entrega.id)
    router.refresh()
  }

  if (!empresaActiva) {
    return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  }

  return (
    <>
      {/* Modal Catálogo */}
      {mostrarFormCatalogo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>
                {editandoCatalogo ? 'Editar item' : 'Nuevo item EPP'}
              </h2>
              <button onClick={() => setMostrarFormCatalogo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Código *</label>
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} style={inputStyle} />
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
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={tieneVencimiento} onChange={(e) => setTieneVencimiento(e.target.checked)} />
                  <label style={{ fontSize: '13px', color: '#8b949e' }}>Tiene vencimiento</label>
                </div>
                {tieneVencimiento && (
                  <div>
                    <label style={labelStyle}>Renovar cada (meses)</label>
                    <input type="number" value={mesesRenovacion} onChange={(e) => setMesesRenovacion(e.target.value)} style={{ ...inputStyle, width: '120px' }} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={requiereTalle} onChange={(e) => setRequiereTalle(e.target.checked)} />
                  <label style={{ fontSize: '13px', color: '#8b949e' }}>Requiere talle</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                  <label style={{ fontSize: '13px', color: '#8b949e' }}>Activo</label>
                </div>
              </div>
              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setMostrarFormCatalogo(false)} style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarCatalogo} disabled={loading || !codigo || !descripcion} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Guardando...' : editandoCatalogo ? 'Guardar cambios' : 'Crear item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Stock */}
      {mostrarFormStock && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>
                {editandoStock ? 'Editar stock' : 'Nuevo stock'}
              </h2>
              <button onClick={() => setMostrarFormStock(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Item EPP *</label>
                <select value={idEppStock} onChange={(e) => setIdEppStock(e.target.value)} style={selectStyle}>
                  <option value="">Seleccionar...</option>
                  {catalogoFiltrado.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Obra (vacío = depósito central)</label>
                <select value={idObraStock} onChange={(e) => setIdObraStock(e.target.value)} style={selectStyle}>
                  <option value="">Depósito central</option>
                  {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Talle</label>
                  <input value={talleStock} onChange={(e) => setTalleStock(e.target.value)} placeholder="Ej: XL" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Disponible</label>
                  <input type="number" value={cantidadDisponible} onChange={(e) => setCantidadDisponible(e.target.value)} min="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mínimo</label>
                  <input type="number" value={cantidadMinima} onChange={(e) => setCantidadMinima(e.target.value)} min="0" style={inputStyle} />
                </div>
              </div>
              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setMostrarFormStock(false)} style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarStock} disabled={loading || !idEppStock} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Guardando...' : editandoStock ? 'Guardar cambios' : 'Crear stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entrega */}
      {mostrarFormEntrega && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, overflowY: 'auto', paddingTop: '20px', paddingBottom: '20px' }}>
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Nueva entrega</h2>
              <button onClick={() => setMostrarFormEntrega(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Empleado *</label>
                <select value={idLegajoEntrega} onChange={(e) => setIdLegajoEntrega(e.target.value)} style={selectStyle}>
                  <option value="">Seleccionar...</option>
                  {legajosFiltrados.map(l => <option key={l.id} value={l.id}>{l.apellido}, {l.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Item EPP *</label>
                <select value={idEppEntrega} onChange={(e) => setIdEppEntrega(e.target.value)} style={selectStyle}>
                  <option value="">Seleccionar...</option>
                  {catalogoFiltrado.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Obra</label>
                  <select value={idObraEntrega} onChange={(e) => setIdObraEntrega(e.target.value)} style={selectStyle}>
                    <option value="">Sin obra</option>
                    {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha entrega</label>
                  <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Cantidad</label>
                  <input type="number" value={cantidadEntrega} onChange={(e) => setCantidadEntrega(e.target.value)} min="1" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Talle</label>
                  <input value={talleEntrega} onChange={(e) => setTalleEntrega(e.target.value)} placeholder="Ej: XL" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Observaciones</label>
                <input value={observacionesEntrega} onChange={(e) => setObservacionesEntrega(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={firmado} onChange={(e) => setFirmado(e.target.checked)} />
                <label style={{ fontSize: '13px', color: '#8b949e' }}>Firmado por el empleado</label>
              </div>
              {error && <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setMostrarFormEntrega(false)} style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarEntrega} disabled={loading || !idLegajoEntrega || !idEppEntrega} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Guardando...' : 'Registrar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>EPP y Ropa de trabajo</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresaActiva.razon_social}
            {porVencer.length > 0 && (
              <span style={{ marginLeft: '8px', color: '#d29922' }}>· ⚠ {porVencer.length} EPP por vencer en 30 días</span>
            )}
          </span>
        </div>
        {tabActiva === 'catalogo' && (
          <button onClick={abrirNuevoCatalogo} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>+ Nuevo item</button>
        )}
        {tabActiva === 'stock' && (
          <button onClick={abrirNuevoStock} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>+ Nuevo stock</button>
        )}
        {tabActiva === 'entregas' && (
          <button onClick={() => setMostrarFormEntrega(true)} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>+ Nueva entrega</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '0.5px solid #30363d' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setTabActiva(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: 'transparent', border: 'none',
            borderBottom: tabActiva === tab.id ? '2px solid #58a6ff' : '2px solid transparent',
            color: tabActiva === tab.id ? '#58a6ff' : '#8b949e',
            fontSize: '13px', cursor: 'pointer', marginBottom: '-1px',
          }}>
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Catálogo */}
      {tabActiva === 'catalogo' && (
        catalogoFiltrado.length === 0 ? (
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
            No hay items en el catálogo.
          </div>
        ) : (
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  {['Código', 'Descripción', 'Tipo', 'Vencimiento', 'Talle', 'Estado'].map(col => (
                    <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                  ))}
                  <th style={{ padding: '10px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {catalogoFiltrado.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: i < catalogoFiltrado.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: '#21262d', color: '#e6edf3', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{item.codigo}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{item.descripcion}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{TIPOS.find(t => t.value === item.tipo)?.label}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                      {item.tiene_vencimiento ? `${item.meses_renovacion} meses` : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {item.requiere_talle ? (
                        <span style={{ background: '#1a2a3a', color: '#58a6ff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Sí</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: item.activo ? '#1a3a2a' : '#3a1a1a', color: item.activo ? '#3fb950' : '#f85149', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button onClick={() => abrirEditarCatalogo(item)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab Stock */}
      {tabActiva === 'stock' && (
        stockFiltrado.length === 0 ? (
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
            No hay stock registrado.
          </div>
        ) : (
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  {['Item', 'Ubicación', 'Talle', 'Disponible', 'Mínimo', 'Alerta'].map(col => (
                    <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                  ))}
                  <th style={{ padding: '10px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {stockFiltrado.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < stockFiltrado.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{s.epp_catalogo.descripcion}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{s.obras?.nombre || 'Depósito central'}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{s.talle || '—'}</td>
                    <td style={{ padding: '10px 16px', color: s.cantidad_disponible <= s.cantidad_minima ? '#f85149' : '#e6edf3', fontWeight: 500 }}>
                      {s.cantidad_disponible}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{s.cantidad_minima}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {s.cantidad_disponible <= s.cantidad_minima && (
                        <span style={{ background: '#3a1a1a', color: '#f85149', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Stock bajo</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button onClick={() => abrirEditarStock(s)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Tab Entregas */}
      {tabActiva === 'entregas' && (
        entregasFiltradas.length === 0 ? (
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
            No hay entregas registradas.
          </div>
        ) : (
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                  {['Empleado', 'Item', 'Fecha', 'Vence', 'Cant.', 'Firmado', 'Estado'].map(col => (
                    <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                  ))}
                  <th style={{ padding: '10px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {entregasFiltradas.map((e, i) => {
                  const vencido = e.fecha_vencimiento && e.fecha_vencimiento < hoy && !e.devuelto
                  const porVencerItem = e.fecha_vencimiento && !e.devuelto &&
                    e.fecha_vencimiento >= hoy &&
                    e.fecha_vencimiento <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  return (
                    <tr key={e.id} style={{ borderBottom: i < entregasFiltradas.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>
                        {e.legajos.apellido}, {e.legajos.nombre}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>{e.epp_catalogo.descripcion}</td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(e.fecha_entrega)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        {e.fecha_vencimiento ? (
                          <span style={{ color: vencido ? '#f85149' : porVencerItem ? '#d29922' : '#8b949e' }}>
                            {formatFecha(e.fecha_vencimiento)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#8b949e' }}>{e.cantidad}</td>
                      <td style={{ padding: '10px 16px' }}>
                        {e.firmado ? (
                          <span style={{ background: '#1a3a2a', color: '#3fb950', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Sí</span>
                        ) : (
                          <span style={{ background: '#3a2f1a', color: '#d29922', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Pendiente</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {e.devuelto ? (
                          <span style={{ background: '#21262d', color: '#8b949e', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Devuelto</span>
                        ) : vencido ? (
                          <span style={{ background: '#3a1a1a', color: '#f85149', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Vencido</span>
                        ) : (
                          <span style={{ background: '#1a3a2a', color: '#3fb950', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Activo</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {!e.devuelto && (
                          <button onClick={() => marcarDevuelto(e)} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Devuelto</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  )
}