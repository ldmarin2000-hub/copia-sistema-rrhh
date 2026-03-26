"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Plus, ChevronDown, ChevronRight, X, Pencil, Trash2, Search } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type EppCatalogo = {
  id: number
  id_empresa: number
  descripcion: string
  requiere_talle: boolean
  controla_stock: boolean
  activo: boolean
}

type EppTalle = { id: number, id_epp: number, talle: string }

type EppMovimientoItem = {
  id: number
  id_epp: number
  talle?: string
  cantidad: number
  epp_catalogo: { descripcion: string }
}

type EppMovimiento = {
  id: number
  id_empresa: number
  fecha: string
  tipo: string
  nro_comp?: string
  observaciones?: string
  epp_movimientos_items: EppMovimientoItem[]
  legajos?: { apellido: string, nombre: string }
}

type Props = {
  catalogo: EppCatalogo[]
  talles: EppTalle[]
  movimientos: EppMovimiento[]
  idEmpresa: number
  permiteEditar: boolean
}

type Linea = { tempId: number, id_epp: string, talle: string, cantidad: string }

const TIPOS = [
  { value: 'stock_inicial', label: 'Stock inicial' },
  { value: 'compra', label: 'Compra' },
  { value: 'devolucion', label: 'Devolución' },
]

const TIPO_LABEL: Record<string, { label: string, color: string, bg: string }> = {
  stock_inicial: { label: 'Stock inicial', color: 'var(--c-blue)', bg: 'var(--c-blue-bg)' },
  compra:        { label: 'Compra',        color: 'var(--c-green)', bg: 'var(--c-green-bg)' },
  devolucion:    { label: 'Devolución',    color: 'var(--c-orange)', bg: 'var(--c-orange-bg)' },
  entrega:       { label: 'Entrega',       color: 'var(--c-red)', bg: 'var(--c-red-bg)' },
}

export default function MovimientosTab({ catalogo, talles, movimientos, idEmpresa, permiteEditar }: Props) {
  const router = useRouter()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoMov, setEditandoMov] = useState<EppMovimiento | null>(null)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState('compra')
  const [nroComp, setNroComp] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([{ tempId: 1, id_epp: '', talle: '', cantidad: '1' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('todos')

  const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const }
  const selectStyle = { width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px' }
  const labelStyle = { fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }

  const catalogoActivo = catalogo.filter(c => c.id_empresa === idEmpresa && c.controla_stock && c.activo)

  const hayFiltros = !!(busqueda || fechaDesde || fechaHasta || tipoFiltro !== 'todos')
  function limpiarFiltros() { setBusqueda(''); setFechaDesde(''); setFechaHasta(''); setTipoFiltro('todos') }

  const movsFiltrados = movimientos
    .filter(m => m.id_empresa === idEmpresa)
    .filter(m => {
      if (busqueda) {
        const b = busqueda.toLowerCase()
        const matchEpp = m.epp_movimientos_items.some(i => i.epp_catalogo.descripcion.toLowerCase().includes(b))
        const matchEmp = m.legajos ? `${m.legajos.apellido} ${m.legajos.nombre}`.toLowerCase().includes(b) : false
        const matchComp = m.nro_comp?.toLowerCase().includes(b) || false
        if (!matchEpp && !matchEmp && !matchComp) return false
      }
      if (fechaDesde && m.fecha < fechaDesde) return false
      if (fechaHasta && m.fecha > fechaHasta) return false
      if (tipoFiltro !== 'todos' && m.tipo !== tipoFiltro) return false
      return true
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  function agregarLinea() {
    setLineas(prev => [...prev, { tempId: Date.now(), id_epp: '', talle: '', cantidad: '1' }])
  }
  function quitarLinea(tempId: number) {
    if (lineas.length > 1) setLineas(prev => prev.filter(l => l.tempId !== tempId))
  }
  function updateLinea(tempId: number, field: keyof Linea, value: string) {
    setLineas(prev => prev.map(l =>
      l.tempId === tempId ? { ...l, [field]: value, ...(field === 'id_epp' ? { talle: '' } : {}) } : l
    ))
  }

  function cerrar() {
    setMostrarForm(false)
    setEditandoMov(null)
    setFecha(new Date().toISOString().split('T')[0])
    setTipo('compra'); setNroComp(''); setObservaciones('')
    setLineas([{ tempId: 1, id_epp: '', talle: '', cantidad: '1' }])
    setError('')
  }

  function editarMovimiento(mov: EppMovimiento) {
    setEditandoMov(mov)
    setFecha(mov.fecha)
    setTipo(mov.tipo)
    setNroComp(mov.nro_comp || '')
    setObservaciones(mov.observaciones || '')
    setLineas(mov.epp_movimientos_items.map((item, i) => ({
      tempId: i + 1,
      id_epp: String(item.id_epp),
      talle: item.talle || '',
      cantidad: String(item.cantidad),
    })))
    setMostrarForm(true)
  }

  async function ajustarStock(supabase: any, id_epp: number, talle: string | null | undefined, delta: number) {
    const eppItem = catalogo.find(c => c.id === id_epp)
    if (!eppItem?.controla_stock) return
    let q = supabase.from('epp_stock').select('id, cantidad_disponible').eq('id_empresa', idEmpresa).eq('id_epp', id_epp)
    q = talle ? q.eq('talle', talle) : q.is('talle', null)
    const { data: stockRow } = await q.maybeSingle()
    if (stockRow) {
      await supabase.from('epp_stock').update({ cantidad_disponible: stockRow.cantidad_disponible + delta, updated_at: new Date().toISOString() }).eq('id', stockRow.id)
    } else if (delta > 0) {
      await supabase.from('epp_stock').insert({
        id_empresa: idEmpresa, id_epp, talle: talle || null,
        cantidad_disponible: delta, cantidad_minima: 0, updated_at: new Date().toISOString(),
      })
    }
  }

  async function guardar() {
    const lineasValidas = lineas.filter(l => l.id_epp)
    if (lineasValidas.length === 0) { setError('Agregá al menos un item.'); return }
    setLoading(true); setError('')
    const supabase = createClient()

    if (editandoMov) {
      // Revertir stock de items anteriores
      for (const item of editandoMov.epp_movimientos_items) {
        await ajustarStock(supabase, item.id_epp, item.talle, -item.cantidad)
      }
      // Borrar items anteriores
      await supabase.from('epp_movimientos_items').delete().eq('id_movimiento', editandoMov.id)
      // Actualizar header
      await supabase.from('epp_movimientos').update({
        fecha, tipo, nro_comp: nroComp || null, observaciones: observaciones || null
      }).eq('id', editandoMov.id)
      // Insertar nuevos items y aplicar stock
      for (const l of lineasValidas) {
        const cantidad = parseInt(l.cantidad) || 1
        await supabase.from('epp_movimientos_items').insert({
          id_movimiento: editandoMov.id, id_epp: parseInt(l.id_epp), talle: l.talle || null, cantidad,
        })
        await ajustarStock(supabase, parseInt(l.id_epp), l.talle || null, cantidad)
      }
    } else {
      const { data: mov, error: errMov } = await supabase
        .from('epp_movimientos')
        .insert({ id_empresa: idEmpresa, fecha, tipo, nro_comp: nroComp || null, observaciones: observaciones || null })
        .select('id').single()

      if (errMov || !mov) { setError(errMov?.message || 'Error al crear movimiento'); setLoading(false); return }

      for (const l of lineasValidas) {
        const cantidad = parseInt(l.cantidad) || 1
        await supabase.from('epp_movimientos_items').insert({
          id_movimiento: mov.id, id_epp: parseInt(l.id_epp), talle: l.talle || null, cantidad,
        })
        await ajustarStock(supabase, parseInt(l.id_epp), l.talle || null, cantidad)
      }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function eliminarMovimiento(mov: EppMovimiento) {
    if (!confirm('¿Eliminar este movimiento? El stock se ajustará automáticamente.')) return
    const supabase = createClient()
    for (const item of mov.epp_movimientos_items) {
      await ajustarStock(supabase, item.id_epp, item.talle, -item.cantidad)
    }
    await supabase.from('epp_movimientos').delete().eq('id', mov.id)
    router.refresh()
  }

  function toggleExpand(id: number) {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  return (
    <>
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, overflowY: 'auto', padding: '20px' }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '580px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                {editandoMov ? 'Editar movimiento' : 'Nuevo movimiento de stock'}
              </h2>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tipo *</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} style={selectStyle}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nro. comprobante</label>
                <input value={nroComp} onChange={e => setNroComp(e.target.value)} placeholder="Ej: FC-0001" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Observaciones</label>
                <input value={observaciones} onChange={e => setObservaciones(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ borderTop: '0.5px solid var(--c-border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>Items</p>
                <button onClick={agregarLinea} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '5px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                  <Plus size={12} /> Agregar línea
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lineas.map(l => {
                  const eppItem = catalogo.find(c => c.id === parseInt(l.id_epp))
                  const tallesItem = eppItem?.requiere_talle ? talles.filter(t => t.id_epp === parseInt(l.id_epp)) : []
                  return (
                    <div key={l.tempId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 28px', gap: '8px', alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>EPP</label>
                        <select value={l.id_epp} onChange={e => updateLinea(l.tempId, 'id_epp', e.target.value)} style={selectStyle}>
                          <option value="">Seleccionar...</option>
                          {catalogoActivo.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Talle</label>
                        {eppItem?.requiere_talle ? (
                          <select value={l.talle} onChange={e => updateLinea(l.tempId, 'talle', e.target.value)} style={selectStyle}>
                            <option value="">—</option>
                            {tallesItem.map(t => <option key={t.id} value={t.talle}>{t.talle}</option>)}
                          </select>
                        ) : (
                          <input value="—" disabled style={{ ...inputStyle, color: 'var(--c-text-muted)' }} />
                        )}
                      </div>
                      <div>
                        <label style={labelStyle}>Cantidad</label>
                        <input type="number" value={l.cantidad} onChange={e => updateLinea(l.tempId, 'cantidad', e.target.value)} min="1" style={inputStyle} />
                      </div>
                      <button onClick={() => quitarLinea(l.tempId)} style={{ background: 'transparent', border: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', padding: '7px 2px', fontSize: '18px', lineHeight: 1 }}>×</button>
                    </div>
                  )
                })}
              </div>
            </div>

            {error && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: '12px 0 0' }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} disabled={loading} style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Guardando...' : editandoMov ? 'Guardar cambios' : 'Guardar movimiento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '10px 14px' }}>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <Search size={13} color="var(--c-text-muted)" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar EPP, empleado, comprobante..." style={{ width: '100%', padding: '6px 10px 6px 30px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const }} />
        </div>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ padding: '6px 10px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: fechaDesde ? 'var(--c-text-primary)' : 'var(--c-text-muted)', fontSize: '12px' }} />
        <span style={{ color: 'var(--c-text-muted)', fontSize: '12px' }}>—</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ padding: '6px 10px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: fechaHasta ? 'var(--c-text-primary)' : 'var(--c-text-muted)', fontSize: '12px' }} />
        <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} style={{ padding: '6px 10px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '12px' }}>
          <option value="todos">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          <option value="entrega">Entrega</option>
        </select>
        {hayFiltros && (
          <>
            <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)', whiteSpace: 'nowrap' }}>{movsFiltrados.length} resultado{movsFiltrados.length !== 1 ? 's' : ''}</span>
            <button onClick={limpiarFiltros} style={{ padding: '6px 10px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>× Limpiar</button>
          </>
        )}
        <button onClick={() => setMostrarForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', marginLeft: 'auto' }}>
          <Plus size={14} /> Nuevo movimiento
        </button>
      </div>

      {movsFiltrados.length === 0 ? (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          No hay movimientos registrados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {movsFiltrados.map(mov => {
            const tipoInfo = TIPO_LABEL[mov.tipo] || { label: mov.tipo, color: 'var(--c-text-secondary)', bg: 'var(--c-elevated)' }
            const esEditable = permiteEditar && mov.tipo !== 'entrega'
            return (
              <div key={mov.id} style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  onClick={() => toggleExpand(mov.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer' }}
                >
                  {expandidos.has(mov.id) ? <ChevronDown size={14} color="var(--c-text-secondary)" /> : <ChevronRight size={14} color="var(--c-text-secondary)" />}
                  <span style={{ fontSize: '13px', color: 'var(--c-text-primary)', fontWeight: 500, minWidth: '80px' }}>{formatFecha(mov.fecha)}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: tipoInfo.bg, color: tipoInfo.color }}>
                    {tipoInfo.label}
                  </span>
                  {mov.nro_comp && <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{mov.nro_comp}</span>}
                  {mov.legajos && <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{mov.legajos.apellido}, {mov.legajos.nombre}</span>}
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>
                    {mov.epp_movimientos_items.length} item{mov.epp_movimientos_items.length !== 1 ? 's' : ''}
                  </span>
                  {esEditable && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); editarMovimiento(mov) }}
                        title="Editar"
                        style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '5px', padding: '3px 8px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); eliminarMovimiento(mov) }}
                        title="Eliminar"
                        style={{ background: 'transparent', border: '0.5px solid var(--c-red-bg)', color: 'var(--c-red)', borderRadius: '5px', padding: '3px 8px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </>
                  )}
                </div>
                {expandidos.has(mov.id) && (
                  <div style={{ borderTop: '0.5px solid var(--c-border)' }}>
                    {mov.observaciones && (
                      <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: 0, padding: '8px 16px 0 16px' }}>{mov.observaciones}</p>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '0.5px solid var(--c-elevated)', background: 'var(--c-base)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 16px 8px 40px', color: 'var(--c-text-secondary)', fontWeight: 400, fontSize: '12px' }}>Item</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--c-text-secondary)', fontWeight: 400, fontSize: '12px' }}>Talle</th>
                          <th style={{ textAlign: 'right', padding: '8px 16px', color: 'var(--c-text-secondary)', fontWeight: 400, fontSize: '12px' }}>Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mov.epp_movimientos_items.map((item, i) => (
                          <tr key={item.id} style={{ borderBottom: i < mov.epp_movimientos_items.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                            <td style={{ padding: '8px 16px 8px 40px', color: 'var(--c-text-primary)' }}>{item.epp_catalogo.descripcion}</td>
                            <td style={{ padding: '8px 16px', color: 'var(--c-text-secondary)' }}>
                              {item.talle ? <span style={{ background: 'var(--c-talle-bg)', color: 'var(--c-talle-color)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{item.talle}</span> : '—'}
                            </td>
                            <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 500, color: item.cantidad >= 0 ? 'var(--c-green)' : 'var(--c-red)' }}>
                              {item.cantidad > 0 ? `+${item.cantidad}` : item.cantidad}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
