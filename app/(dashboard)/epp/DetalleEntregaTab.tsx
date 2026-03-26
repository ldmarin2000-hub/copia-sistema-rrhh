"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Plus, Printer, CheckCircle, ChevronDown, ChevronRight, X, Pencil, Trash2, Search, FileUp, ExternalLink } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type EppCatalogo = {
  id: number
  id_empresa: number
  descripcion: string
  requiere_talle: boolean
  controla_stock: boolean
  tiene_vencimiento: boolean
  meses_renovacion?: number
  activo: boolean
}

type EppTalle = { id: number, id_epp: number, talle: string }

type DetalleEntregaItem = {
  id: number
  id_epp: number
  talle?: string
  cantidad: number
  fecha_vencimiento?: string
  epp_catalogo: { descripcion: string, tiene_vencimiento: boolean, meses_renovacion?: number }
}

type DetalleEntrega = {
  id: number
  id_empresa: number
  id_legajo: number
  fecha: string
  firmado: boolean
  fecha_firma?: string
  observaciones?: string
  id_movimiento?: number
  storage_path_firmado?: string
  nombre_archivo_firmado?: string
  created_at: string
  epp_detalle_entregas_items: DetalleEntregaItem[]
  legajos: { id: number, apellido: string, nombre: string, nro_legajo: number }
}

type Legajo = { id: number, id_empresa: number, apellido: string, nombre: string, nro_legajo: number }

type Props = {
  catalogo: EppCatalogo[]
  talles: EppTalle[]
  detalleEntregas: DetalleEntrega[]
  legajos: Legajo[]
  idEmpresa: number
  permiteEditar: boolean
}

type Linea = { tempId: number, id_epp: string, talle: string, cantidad: string }

function calcVencimiento(fecha: string, meses: number): string {
  const d = new Date(fecha + 'T00:00:00')
  d.setMonth(d.getMonth() + meses)
  return d.toISOString().split('T')[0]
}

function imprimirRemito(remito: DetalleEntrega) {
  const rows = remito.epp_detalle_entregas_items.map(item => `
    <tr>
      <td>${item.epp_catalogo.descripcion}</td>
      <td>${item.talle || '—'}</td>
      <td style="text-align:center">${item.cantidad}</td>
      <td>${item.fecha_vencimiento ? formatFecha(item.fecha_vencimiento) : '—'}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Remito EPP</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #000; font-size: 13px; }
    h1 { font-size: 20px; margin: 0 0 6px; }
    .sub { font-size: 13px; color: #444; margin: 0 0 20px; }
    .info { display: flex; gap: 40px; margin-bottom: 20px; }
    .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .5px; margin: 0 0 2px; }
    .val { font-size: 14px; font-weight: bold; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f0f0f0; font-weight: bold; padding: 8px 12px; text-align: left; border: 1px solid #ccc; font-size: 12px; }
    td { padding: 8px 12px; border: 1px solid #ddd; }
    .firmas { margin-top: 60px; display: flex; justify-content: space-between; }
    .firma { text-align: center; width: 200px; }
    .firma-linea { border-top: 1px solid #000; padding-top: 8px; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Remito de Entrega EPP</h1>
  <p class="sub">Sistema RRHH</p>
  <div class="info">
    <div><p class="label">Empleado</p><p class="val">${remito.legajos.nro_legajo} — ${remito.legajos.apellido}, ${remito.legajos.nombre}</p></div>
    <div><p class="label">Fecha</p><p class="val">${formatFecha(remito.fecha)}</p></div>
    ${remito.observaciones ? `<div><p class="label">Observaciones</p><p class="val">${remito.observaciones}</p></div>` : ''}
  </div>
  <table>
    <thead>
      <tr><th>Artículo</th><th>Talle</th><th style="text-align:center">Cant.</th><th>Vencimiento</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="firmas">
    <div class="firma"><div class="firma-linea">Entregado por</div></div>
    <div class="firma"><div class="firma-linea">Recibido conforme — ${remito.legajos.apellido}, ${remito.legajos.nombre}</div></div>
  </div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function DetalleEntregaTab({ catalogo, talles, detalleEntregas, legajos, idEmpresa, permiteEditar }: Props) {
  const router = useRouter()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoRemito, setEditandoRemito] = useState<DetalleEntrega | null>(null)
  const [idLegajo, setIdLegajo] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([{ tempId: 1, id_epp: '', talle: '', cantidad: '1' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())
  const [modalFirma, setModalFirma] = useState<DetalleEntrega | null>(null)
  const [archivoFirma, setArchivoFirma] = useState<File | null>(null)
  const [loadingFirma, setLoadingFirma] = useState(false)
  const [errorFirma, setErrorFirma] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')

  const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const }
  const selectStyle = { width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px' }
  const labelStyle = { fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }

  const catalogoActivo = catalogo.filter(c => c.id_empresa === idEmpresa && c.activo)
  const legajosFiltrados = legajos.filter(l => l.id_empresa === idEmpresa)

  const hayFiltros = !!(busqueda || fechaDesde || fechaHasta || estadoFiltro !== 'todos')
  function limpiarFiltros() { setBusqueda(''); setFechaDesde(''); setFechaHasta(''); setEstadoFiltro('todos') }

  const remitos = detalleEntregas
    .filter(d => d.id_empresa === idEmpresa)
    .filter(d => {
      if (busqueda) {
        const b = busqueda.toLowerCase()
        const matchEmp = `${d.legajos.apellido} ${d.legajos.nombre}`.toLowerCase().includes(b)
        const matchEpp = d.epp_detalle_entregas_items.some(i => i.epp_catalogo.descripcion.toLowerCase().includes(b))
        if (!matchEmp && !matchEpp) return false
      }
      if (fechaDesde && d.fecha < fechaDesde) return false
      if (fechaHasta && d.fecha > fechaHasta) return false
      if (estadoFiltro === 'pendiente' && d.firmado) return false
      if (estadoFiltro === 'firmado' && !d.firmado) return false
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
    setEditandoRemito(null)
    setIdLegajo(''); setFecha(new Date().toISOString().split('T')[0]); setObservaciones('')
    setLineas([{ tempId: 1, id_epp: '', talle: '', cantidad: '1' }]); setError('')
  }

  function editarRemito(r: DetalleEntrega) {
    setEditandoRemito(r)
    setIdLegajo(String(r.id_legajo))
    setFecha(r.fecha)
    setObservaciones(r.observaciones || '')
    setLineas(r.epp_detalle_entregas_items.map((item, i) => ({
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
    } else {
      await supabase.from('epp_stock').insert({
        id_empresa: idEmpresa, id_epp, talle: talle || null,
        cantidad_disponible: delta, cantidad_minima: 0, updated_at: new Date().toISOString(),
      })
    }
  }

  async function guardar() {
    if (!idLegajo) { setError('Seleccioná un empleado.'); return }
    const lineasValidas = lineas.filter(l => l.id_epp)
    if (lineasValidas.length === 0) { setError('Agregá al menos un item.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (editandoRemito) {
      const r = editandoRemito
      // 1. Revertir stock de items anteriores (suma de vuelta)
      for (const item of r.epp_detalle_entregas_items) {
        await ajustarStock(supabase, item.id_epp, item.talle, item.cantidad)
      }
      // 2. Borrar epp_entregas anteriores vinculadas
      await supabase.from('epp_entregas')
        .delete()
        .eq('id_legajo', r.id_legajo)
        .eq('id_empresa', idEmpresa)
        .eq('fecha_entrega', r.fecha)
        .eq('firmado', false)
      // 3. Borrar items del movimiento anterior
      if (r.id_movimiento) {
        await supabase.from('epp_movimientos_items').delete().eq('id_movimiento', r.id_movimiento)
        await supabase.from('epp_movimientos').update({ fecha, id_legajo: parseInt(idLegajo) }).eq('id', r.id_movimiento)
      }
      // 4. Borrar items del remito anterior
      await supabase.from('epp_detalle_entregas_items').delete().eq('id_detalle_entrega', r.id)
      // 5. Actualizar header del remito
      await supabase.from('epp_detalle_entregas').update({
        id_legajo: parseInt(idLegajo), fecha, observaciones: observaciones || null
      }).eq('id', r.id)
      // 6. Insertar nuevos items
      for (const l of lineasValidas) {
        const eppItem = catalogo.find(c => c.id === parseInt(l.id_epp))
        const cantidad = parseInt(l.cantidad) || 1
        let fechaVencimiento: string | null = null
        if (eppItem?.tiene_vencimiento && eppItem.meses_renovacion) {
          fechaVencimiento = calcVencimiento(fecha, eppItem.meses_renovacion)
        }
        await supabase.from('epp_detalle_entregas_items').insert({
          id_detalle_entrega: r.id, id_epp: parseInt(l.id_epp), talle: l.talle || null, cantidad, fecha_vencimiento: fechaVencimiento,
        })
        await supabase.from('epp_entregas').insert({
          id_empresa: idEmpresa, id_legajo: parseInt(idLegajo), id_epp: parseInt(l.id_epp),
          fecha_entrega: fecha, cantidad, talle: l.talle || null, fecha_vencimiento: fechaVencimiento,
          firmado: false, observaciones: observaciones || null, id_entregado_por: user?.id || null,
        })
        if (r.id_movimiento) {
          await supabase.from('epp_movimientos_items').insert({
            id_movimiento: r.id_movimiento, id_epp: parseInt(l.id_epp), talle: l.talle || null, cantidad: -cantidad,
          })
        }
        await ajustarStock(supabase, parseInt(l.id_epp), l.talle || null, -cantidad)
      }
    } else {
      // Crear remito header
      const { data: remito, error: errRemito } = await supabase
        .from('epp_detalle_entregas')
        .insert({ id_empresa: idEmpresa, id_legajo: parseInt(idLegajo), fecha, observaciones: observaciones || null })
        .select('id').single()

      if (errRemito || !remito) { setError(errRemito?.message || 'Error'); setLoading(false); return }

      // Crear movimiento de entrega
      const { data: mov } = await supabase
        .from('epp_movimientos')
        .insert({ id_empresa: idEmpresa, fecha, tipo: 'entrega', id_legajo: parseInt(idLegajo) })
        .select('id').single()

      if (mov) {
        await supabase.from('epp_detalle_entregas').update({ id_movimiento: mov.id }).eq('id', remito.id)
      }

      for (const l of lineasValidas) {
        const eppItem = catalogo.find(c => c.id === parseInt(l.id_epp))
        const cantidad = parseInt(l.cantidad) || 1
        let fechaVencimiento: string | null = null
        if (eppItem?.tiene_vencimiento && eppItem.meses_renovacion) {
          fechaVencimiento = calcVencimiento(fecha, eppItem.meses_renovacion)
        }

        await supabase.from('epp_detalle_entregas_items').insert({
          id_detalle_entrega: remito.id, id_epp: parseInt(l.id_epp), talle: l.talle || null, cantidad, fecha_vencimiento: fechaVencimiento,
        })
        await supabase.from('epp_entregas').insert({
          id_empresa: idEmpresa, id_legajo: parseInt(idLegajo), id_epp: parseInt(l.id_epp),
          fecha_entrega: fecha, cantidad, talle: l.talle || null, fecha_vencimiento: fechaVencimiento,
          firmado: false, observaciones: observaciones || null, id_entregado_por: user?.id || null,
        })
        if (mov) {
          await supabase.from('epp_movimientos_items').insert({
            id_movimiento: mov.id, id_epp: parseInt(l.id_epp), talle: l.talle || null, cantidad: -cantidad,
          })
        }
        await ajustarStock(supabase, parseInt(l.id_epp), l.talle || null, -cantidad)
      }
    }

    router.refresh()
    cerrar()
    setLoading(false)
  }

  async function confirmarFirma() {
    if (!modalFirma) return
    setLoadingFirma(true); setErrorFirma('')
    const supabase = createClient()
    let storagePath: string | null = null
    let nombreArchivo: string | null = null

    if (archivoFirma) {
      const path = `epp-entregas/${modalFirma.id_empresa}/${modalFirma.id}/${Date.now()}_${archivoFirma.name}`
      const { error: uploadError } = await supabase.storage.from('documentos').upload(path, archivoFirma)
      if (uploadError) { setErrorFirma(uploadError.message); setLoadingFirma(false); return }
      storagePath = path
      nombreArchivo = archivoFirma.name
    }

    await supabase.from('epp_detalle_entregas').update({
      firmado: true,
      fecha_firma: new Date().toISOString().split('T')[0],
      ...(storagePath ? { storage_path_firmado: storagePath, nombre_archivo_firmado: nombreArchivo } : {}),
    }).eq('id', modalFirma.id)

    for (const item of modalFirma.epp_detalle_entregas_items) {
      await supabase.from('epp_entregas')
        .update({ firmado: true })
        .eq('id_legajo', modalFirma.id_legajo)
        .eq('id_epp', item.id_epp)
        .eq('fecha_entrega', modalFirma.fecha)
        .eq('firmado', false)
    }

    setModalFirma(null)
    setArchivoFirma(null)
    if (fileRef.current) fileRef.current.value = ''
    setLoadingFirma(false)
    router.refresh()
  }

  async function verComprobante(path: string) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('documentos').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminarRemito(r: DetalleEntrega) {
    if (!confirm('¿Eliminar este remito? El stock se ajustará automáticamente.')) return
    const supabase = createClient()
    // Revertir stock (suma de vuelta)
    for (const item of r.epp_detalle_entregas_items) {
      await ajustarStock(supabase, item.id_epp, item.talle, item.cantidad)
    }
    // Borrar epp_entregas vinculadas
    await supabase.from('epp_entregas')
      .delete()
      .eq('id_legajo', r.id_legajo)
      .eq('id_empresa', idEmpresa)
      .eq('fecha_entrega', r.fecha)
      .eq('firmado', false)
    // Borrar remito primero (libera la FK a epp_movimientos), cascade borra items
    await supabase.from('epp_detalle_entregas').delete().eq('id', r.id)
    // Recién ahora borrar el movimiento (cascade borra sus items)
    if (r.id_movimiento) {
      await supabase.from('epp_movimientos').delete().eq('id', r.id_movimiento)
    }
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
      {/* Modal firma */}
      {modalFirma && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>Marcar como firmado</h2>
              <button onClick={() => { setModalFirma(null); setArchivoFirma(null); setErrorFirma('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', margin: '0 0 16px' }}>
              {modalFirma.legajos.apellido}, {modalFirma.legajos.nombre} · {formatFecha(modalFirma.fecha)}
            </p>
            <div style={{ border: '0.5px dashed var(--c-border)', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: '0 0 10px' }}>
                Adjuntar comprobante firmado <span style={{ color: 'var(--c-text-muted)' }}>(opcional)</span>
              </p>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>
                <FileUp size={13} />
                {archivoFirma ? archivoFirma.name : 'Seleccionar archivo'}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={e => setArchivoFirma(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </label>
              {archivoFirma && (
                <button onClick={() => { setArchivoFirma(null); if (fileRef.current) fileRef.current.value = '' }} style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', fontSize: '13px' }}>× quitar</button>
              )}
            </div>
            {errorFirma && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: '0 0 12px' }}>{errorFirma}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => { setModalFirma(null); setArchivoFirma(null); setErrorFirma('') }} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmarFirma} disabled={loadingFirma} style={{ background: 'var(--c-green-bg)', border: '0.5px solid var(--c-green)40', color: 'var(--c-green)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loadingFirma ? 0.6 : 1 }}>
                {loadingFirma ? 'Guardando...' : 'Confirmar firma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, overflowY: 'auto', padding: '20px' }}>
          <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '600px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                {editandoRemito ? 'Editar remito' : 'Nuevo remito de entrega'}
              </h2>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Empleado *</label>
                <select value={idLegajo} onChange={e => setIdLegajo(e.target.value)} style={selectStyle}>
                  <option value="">Seleccionar...</option>
                  {legajosFiltrados.map(l => (
                    <option key={l.id} value={l.id}>{l.apellido}, {l.nombre} ({l.nro_legajo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Observaciones</label>
                <input value={observaciones} onChange={e => setObservaciones(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ borderTop: '0.5px solid var(--c-border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>Items a entregar</p>
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
                {loading ? 'Guardando...' : editandoRemito ? 'Guardar cambios' : 'Generar remito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '10px 14px' }}>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <Search size={13} color="var(--c-text-muted)" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar empleado o EPP..." style={{ width: '100%', padding: '6px 10px 6px 30px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const }} />
        </div>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ padding: '6px 10px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: fechaDesde ? 'var(--c-text-primary)' : 'var(--c-text-muted)', fontSize: '12px' }} />
        <span style={{ color: 'var(--c-text-muted)', fontSize: '12px' }}>—</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ padding: '6px 10px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: fechaHasta ? 'var(--c-text-primary)' : 'var(--c-text-muted)', fontSize: '12px' }} />
        <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={{ padding: '6px 10px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-primary)', fontSize: '12px' }}>
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente firma</option>
          <option value="firmado">Firmados</option>
        </select>
        {hayFiltros && (
          <>
            <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)', whiteSpace: 'nowrap' }}>{remitos.length} resultado{remitos.length !== 1 ? 's' : ''}</span>
            <button onClick={limpiarFiltros} style={{ padding: '6px 10px', borderRadius: '5px', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>× Limpiar</button>
          </>
        )}
        <button onClick={() => setMostrarForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', marginLeft: 'auto' }}>
          <Plus size={14} /> Nuevo remito
        </button>
      </div>

      {remitos.length === 0 ? (
        <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>
          No hay remitos registrados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {remitos.map(r => {
            const esEditable = permiteEditar && !r.firmado
            return (
              <div key={r.id} style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  onClick={() => toggleExpand(r.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer' }}
                >
                  {expandidos.has(r.id) ? <ChevronDown size={14} color="var(--c-text-secondary)" /> : <ChevronRight size={14} color="var(--c-text-secondary)" />}
                  <span style={{ fontSize: '13px', color: 'var(--c-text-primary)', fontWeight: 500, minWidth: '80px' }}>{formatFecha(r.fecha)}</span>
                  <span style={{ fontSize: '13px', color: 'var(--c-text-primary)' }}>{r.legajos.apellido}, {r.legajos.nombre}</span>
                  <span style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>Leg. {r.legajos.nro_legajo}</span>
                  <span style={{ flex: 1 }} />
                  {r.firmado ? (
                    <span style={{ background: 'var(--c-green-bg)', color: 'var(--c-green)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Firmado</span>
                  ) : (
                    <span style={{ background: 'var(--c-orange-bg)', color: 'var(--c-orange)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>Pendiente firma</span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>
                    {r.epp_detalle_entregas_items.length} item{r.epp_detalle_entregas_items.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); imprimirRemito(r) }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '5px', padding: '3px 10px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    <Printer size={11} /> Imprimir
                  </button>
                  {!r.firmado && (
                    <button
                      onClick={e => { e.stopPropagation(); setModalFirma(r) }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-green)', borderRadius: '5px', padding: '3px 10px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      <CheckCircle size={11} /> Firmado
                    </button>
                  )}
                  {r.firmado && r.storage_path_firmado && (
                    <button
                      onClick={e => { e.stopPropagation(); verComprobante(r.storage_path_firmado!) }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-blue)', borderRadius: '5px', padding: '3px 10px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      <ExternalLink size={11} /> Comprobante
                    </button>
                  )}
                  {esEditable && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); editarRemito(r) }}
                        title="Editar"
                        style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '5px', padding: '3px 8px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); eliminarRemito(r) }}
                        title="Eliminar"
                        style={{ background: 'transparent', border: '0.5px solid var(--c-red-bg)', color: 'var(--c-red)', borderRadius: '5px', padding: '3px 8px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </>
                  )}
                </div>
                {expandidos.has(r.id) && (
                  <div style={{ borderTop: '0.5px solid var(--c-border)' }}>
                    {r.observaciones && (
                      <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', margin: 0, padding: '8px 16px 0' }}>{r.observaciones}</p>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '0.5px solid var(--c-elevated)', background: 'var(--c-base)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 16px 8px 40px', color: 'var(--c-text-secondary)', fontWeight: 400, fontSize: '12px' }}>Item</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--c-text-secondary)', fontWeight: 400, fontSize: '12px' }}>Talle</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--c-text-secondary)', fontWeight: 400, fontSize: '12px' }}>Cant.</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: 'var(--c-text-secondary)', fontWeight: 400, fontSize: '12px' }}>Vencimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.epp_detalle_entregas_items.map((item, i) => (
                          <tr key={item.id} style={{ borderBottom: i < r.epp_detalle_entregas_items.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                            <td style={{ padding: '8px 16px 8px 40px', color: 'var(--c-text-primary)' }}>{item.epp_catalogo.descripcion}</td>
                            <td style={{ padding: '8px 16px', color: 'var(--c-text-secondary)' }}>
                              {item.talle ? <span style={{ background: 'var(--c-talle-bg)', color: 'var(--c-talle-color)', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{item.talle}</span> : '—'}
                            </td>
                            <td style={{ padding: '8px 16px', color: 'var(--c-text-secondary)' }}>{item.cantidad}</td>
                            <td style={{ padding: '8px 16px', color: 'var(--c-text-secondary)' }}>{item.fecha_vencimiento ? formatFecha(item.fecha_vencimiento) : '—'}</td>
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
