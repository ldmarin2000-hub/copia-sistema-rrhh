"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Plus, Trash2, Printer } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'
import { traducirError } from '@/lib/errores'

type EppEntrega = {
  id: number
  id_epp: number
  fecha_entrega: string
  cantidad: number
  talle?: string
  fecha_vencimiento?: string
  firmado: boolean
  devuelto: boolean
  fecha_devolucion?: string
  observaciones?: string
  epp_catalogo: { descripcion: string, tiene_vencimiento: boolean }
  obras?: { nombre: string }
}

type EppCatalogo = {
  id: number
  descripcion: string
  tiene_vencimiento: boolean
  meses_renovacion?: number
  requiere_talle: boolean
  controla_stock: boolean
}

type EppTalle = {
  id: number
  id_epp: number
  talle: string
  activo: boolean
}

type EppHabitual = {
  id: number
  id_epp: number
  talle?: string
  epp_catalogo: { descripcion: string, requiere_talle: boolean }
}

type Obra = { id: number, nombre: string }

type Props = {
  idLegajo: number
  idEmpresa: number
  entregas: EppEntrega[]
  catalogo: EppCatalogo[]
  talles: EppTalle[]
  habitual: EppHabitual[]
  obras: Obra[]
  apellidoNombre?: string
  nroLegajo?: number
}

type Linea = { tempId: number, id_epp: string, talle: string, cantidad: string }

function calcVencimiento(fecha: string, meses: number): string {
  const d = new Date(fecha + 'T00:00:00')
  d.setMonth(d.getMonth() + meses)
  return d.toISOString().split('T')[0]
}

export default function EppTab({
  idLegajo, idEmpresa, entregas, catalogo, talles, habitual, obras,
  apellidoNombre = '', nroLegajo = 0,
}: Props) {
  const router = useRouter()

  // — Remito form —
  const [mostrarForm, setMostrarForm] = useState(false)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [idObra, setIdObra] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([{ tempId: 1, id_epp: '', talle: '', cantidad: '1' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // — Habitual form —
  const [mostrarFormHabitual, setMostrarFormHabitual] = useState(false)
  const [habIdEpp, setHabIdEpp] = useState('')
  const [habTalle, setHabTalle] = useState('')
  const [habLoading, setHabLoading] = useState(false)
  const [habError, setHabError] = useState('')

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

  const hoy = new Date().toISOString().split('T')[0]
  const catalogoDisponibleHabitual = catalogo.filter(c => !habitual.some(h => h.id_epp === c.id))
  const habEppSeleccionado = catalogo.find(c => c.id === parseInt(habIdEpp))
  const habTallesDelEpp = talles.filter(t => t.id_epp === parseInt(habIdEpp))

  // — Líneas helpers —
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
    setFecha(new Date().toISOString().split('T')[0])
    setIdObra(''); setObservaciones('')
    setLineas([{ tempId: 1, id_epp: '', talle: '', cantidad: '1' }])
    setError('')
  }

  function cerrarHabitual() {
    setMostrarFormHabitual(false)
    setHabIdEpp(''); setHabTalle(''); setHabError('')
  }

  async function guardar() {
    const lineasValidas = lineas.filter(l => l.id_epp)
    if (lineasValidas.length === 0) { setError('Agregá al menos un item.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Crear remito header
    const { data: remito, error: errRemito } = await supabase
      .from('epp_detalle_entregas')
      .insert({ id_empresa: idEmpresa, id_legajo: idLegajo, fecha, observaciones: observaciones || null })
      .select('id').single()
    if (errRemito || !remito) { setError(traducirError(errRemito?.message || 'Error')); setLoading(false); return }

    // 2. Crear movimiento
    const { data: mov } = await supabase
      .from('epp_movimientos')
      .insert({ id_empresa: idEmpresa, fecha, tipo: 'entrega', id_legajo: idLegajo })
      .select('id').single()
    if (mov) {
      await supabase.from('epp_detalle_entregas').update({ id_movimiento: mov.id }).eq('id', remito.id)
    }

    // 3. Procesar líneas
    for (const l of lineasValidas) {
      const eppItem = catalogo.find(c => c.id === parseInt(l.id_epp))
      const cantidad = parseInt(l.cantidad) || 1
      let fechaVencimiento: string | null = null
      if (eppItem?.tiene_vencimiento && eppItem.meses_renovacion) {
        fechaVencimiento = calcVencimiento(fecha, eppItem.meses_renovacion)
      }

      await supabase.from('epp_detalle_entregas_items').insert({
        id_detalle_entrega: remito.id,
        id_epp: parseInt(l.id_epp),
        talle: l.talle || null,
        cantidad,
        fecha_vencimiento: fechaVencimiento,
      })

      await supabase.from('epp_entregas').insert({
        id_empresa: idEmpresa,
        id_legajo: idLegajo,
        id_epp: parseInt(l.id_epp),
        id_obra: idObra ? parseInt(idObra) : null,
        fecha_entrega: fecha,
        cantidad,
        talle: l.talle || null,
        fecha_vencimiento: fechaVencimiento,
        firmado: false,
        observaciones: observaciones || null,
        id_entregado_por: user?.id || null,
      })

      if (mov) {
        await supabase.from('epp_movimientos_items').insert({
          id_movimiento: mov.id,
          id_epp: parseInt(l.id_epp),
          talle: l.talle || null,
          cantidad: -cantidad,
        })
      }

      if (eppItem?.controla_stock) {
        let q = supabase.from('epp_stock')
          .select('id, cantidad_disponible')
          .eq('id_empresa', idEmpresa)
          .eq('id_epp', parseInt(l.id_epp))
        q = l.talle ? q.eq('talle', l.talle) : q.is('talle', null)
        const { data: stockRow } = await q.maybeSingle()
        if (stockRow) {
          await supabase.from('epp_stock')
            .update({ cantidad_disponible: stockRow.cantidad_disponible - cantidad, updated_at: new Date().toISOString() })
            .eq('id', stockRow.id)
        } else {
          await supabase.from('epp_stock').insert({
            id_empresa: idEmpresa,
            id_epp: parseInt(l.id_epp),
            talle: l.talle || null,
            cantidad_disponible: -cantidad,
            cantidad_minima: 0,
            updated_at: new Date().toISOString(),
          })
        }
      }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function marcarDevuelto(entrega: EppEntrega) {
    if (!confirm(`¿Marcar como devuelto "${entrega.epp_catalogo.descripcion}"?`)) return
    const supabase = createClient()
    await supabase.from('epp_entregas').update({
      devuelto: true,
      fecha_devolucion: hoy,
    }).eq('id', entrega.id)

    const { data: movDev } = await supabase.from('epp_movimientos')
      .insert({ id_empresa: idEmpresa, fecha: hoy, tipo: 'devolucion', id_legajo: idLegajo })
      .select('id').single()
    if (movDev) {
      await supabase.from('epp_movimientos_items').insert({
        id_movimiento: movDev.id,
        id_epp: entrega.id_epp,
        talle: entrega.talle || null,
        cantidad: entrega.cantidad,
      })
    }

    const eppItem = catalogo.find(c => c.id === entrega.id_epp)
    if (eppItem?.controla_stock) {
      let q = supabase.from('epp_stock')
        .select('id, cantidad_disponible')
        .eq('id_empresa', idEmpresa)
        .eq('id_epp', entrega.id_epp)
      q = entrega.talle ? q.eq('talle', entrega.talle) : q.is('talle', null)
      const { data: stockRow } = await q.maybeSingle()
      if (stockRow) {
        await supabase.from('epp_stock')
          .update({ cantidad_disponible: stockRow.cantidad_disponible + entrega.cantidad })
          .eq('id', stockRow.id)
      }
    }

    router.refresh()
  }

  async function guardarHabitual() {
    if (!habIdEpp) return
    if (habEppSeleccionado?.requiere_talle && !habTalle) {
      setHabError('Seleccioná un talle para este item.')
      return
    }
    setHabLoading(true); setHabError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('legajo_epp_habitual').insert({
      id_empresa: idEmpresa, id_legajo: idLegajo,
      id_epp: parseInt(habIdEpp), talle: habTalle || null,
    })
    if (err) { setHabError(traducirError(err.message)); setHabLoading(false); return }
    router.refresh()
    cerrarHabitual()
    setHabLoading(false)
  }

  async function eliminarHabitual(item: EppHabitual) {
    if (!confirm(`¿Quitar "${item.epp_catalogo.descripcion}" del EPP habitual?`)) return
    const supabase = createClient()
    await supabase.from('legajo_epp_habitual').delete().eq('id', item.id)
    router.refresh()
  }

  const activas = entregas.filter(e => !e.devuelto)
  const devueltas = entregas.filter(e => e.devuelto)

  return (
    <>
      {/* Modal nueva entrega — formato remito */}
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, overflowY: 'auto', padding: '20px' }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '560px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 4px' }}>Nueva entrega EPP</h2>
            <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: '0 0 20px' }}>{apellidoNombre || 'Empleado'}</p>

            {/* Header remito */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Obra</label>
                <select value={idObra} onChange={e => setIdObra(e.target.value)} style={selectStyle}>
                  <option value="">Sin obra</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Observaciones</label>
                <input value={observaciones} onChange={e => setObservaciones(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Líneas */}
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
                    <div key={l.tempId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 72px 28px', gap: '8px', alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>EPP</label>
                        <select value={l.id_epp} onChange={e => updateLinea(l.tempId, 'id_epp', e.target.value)} style={selectStyle}>
                          <option value="">Seleccionar...</option>
                          {catalogo.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
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
                        <label style={labelStyle}>Cant.</label>
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
                {loading ? 'Guardando...' : 'Generar remito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar EPP habitual */}
      {mostrarFormHabitual && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '380px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 20px' }}>Agregar EPP habitual</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Item EPP *</label>
                <select value={habIdEpp} onChange={e => { setHabIdEpp(e.target.value); setHabTalle('') }} style={selectStyle}>
                  <option value="">Seleccionar...</option>
                  {catalogoDisponibleHabitual.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                </select>
              </div>
              {habEppSeleccionado?.requiere_talle && (
                <div>
                  <label style={labelStyle}>Talle *</label>
                  {habTallesDelEpp.length > 0 ? (
                    <select value={habTalle} onChange={e => setHabTalle(e.target.value)} style={selectStyle}>
                      <option value="">Seleccionar talle...</option>
                      {habTallesDelEpp.map(t => <option key={t.id} value={t.talle}>{t.talle}</option>)}
                    </select>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#d29922', margin: 0 }}>No hay talles definidos. Configurarlos en EPP-Catálogo.</p>
                  )}
                </div>
              )}
              {habError && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{habError}</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrarHabitual} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarHabitual} disabled={habLoading || !habIdEpp} style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: habLoading ? 0.6 : 1 }}>
                {habLoading ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EPP Habitual */}
      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', marginBottom: '20px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>EPP habitual</p>
            <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: '2px 0 0' }}>Items y talles asignados a este empleado</p>
          </div>
          <button onClick={() => setMostrarFormHabitual(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}>
            <Plus size={12} /> Agregar
          </button>
        </div>
        {habitual.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: '13px' }}>
            No hay EPP habitual configurado para este empleado.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Item</th>
                <th style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Talle</th>
                <th style={{ padding: '8px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {habitual.map((h, i) => (
                <tr key={h.id} style={{ borderBottom: i < habitual.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                  <td style={{ padding: '8px 16px', color: 'var(--c-text-primary)' }}>{h.epp_catalogo.descripcion}</td>
                  <td style={{ padding: '8px 16px' }}>
                    {h.talle
                      ? <span style={{ background: '#1f2937', color: '#93c5fd', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{h.talle}</span>
                      : <span style={{ color: 'var(--c-text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                    <button onClick={() => eliminarHabitual(h)} style={{ background: 'transparent', border: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Entregas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', margin: 0 }}>
          {activas.length} item{activas.length !== 1 ? 's' : ''} activo{activas.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setMostrarForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
          <Plus size={14} /> Nueva entrega
        </button>
      </div>

      {entregas.length === 0 ? (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          No hay entregas registradas.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activas.length > 0 && (
            <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--c-border)' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>EPP activo</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                    {['Item', 'Entrega', 'Vence', 'Cant.', 'Talle', 'Firmado'].map(col => (
                      <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>{col}</th>
                    ))}
                    <th style={{ padding: '10px 16px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {activas.map((e, i) => {
                    const vencido = e.fecha_vencimiento && e.fecha_vencimiento < hoy
                    const porVencer = e.fecha_vencimiento && !vencido &&
                      e.fecha_vencimiento <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    return (
                      <tr key={e.id} style={{ borderBottom: i < activas.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)', fontWeight: 500 }}>{e.epp_catalogo.descripcion}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{formatFecha(e.fecha_entrega)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          {e.fecha_vencimiento ? (
                            <span style={{ color: vencido ? 'var(--c-red)' : porVencer ? '#d29922' : 'var(--c-text-secondary)' }}>
                              {formatFecha(e.fecha_vencimiento)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{e.cantidad}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>
                          {e.talle
                            ? <span style={{ background: '#1f2937', color: '#93c5fd', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>{e.talle}</span>
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {e.firmado
                            ? <span style={{ background: 'var(--c-green-bg)', color: 'var(--c-green)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Sí</span>
                            : <span style={{ background: '#3a2f1a', color: '#d29922', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Pendiente</span>}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <button onClick={() => marcarDevuelto(e)} style={{ background: 'transparent', border: 'none', color: 'var(--c-text-secondary)', cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>Devuelto</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {devueltas.length > 0 && (
            <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--c-border)' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-secondary)', margin: 0 }}>Historial de devoluciones</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                    {['Item', 'Entrega', 'Devolución', 'Cant.'].map(col => (
                      <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devueltas.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: i < devueltas.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{e.epp_catalogo.descripcion}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{formatFecha(e.fecha_entrega)}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{formatFecha(e.fecha_devolucion || '')}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{e.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
