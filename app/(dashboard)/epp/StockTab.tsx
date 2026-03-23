"use client"

import { useState } from 'react'
import { ChevronDown, ChevronRight, BarChart2, Search } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

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

type EppMovimientoItem = {
  id: number
  id_movimiento: number
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
  legajos?: { apellido: string, nombre: string, nro_legajo: number }
}

type Props = {
  stock: EppStock[]
  movimientos: EppMovimiento[]
  idEmpresa: number
}

const TIPO_LABEL: Record<string, string> = {
  stock_inicial: 'Stock inicial',
  compra: 'Compra',
  devolucion: 'Devolución',
  entrega: 'Entrega',
}

const inputFiltro = {
  padding: '6px 10px', borderRadius: '5px',
  background: '#0d1117', border: '0.5px solid #30363d',
  color: '#e6edf3', fontSize: '12px',
}

export default function StockTab({ stock, movimientos, idEmpresa }: Props) {
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())
  const [movModal, setMovModal] = useState<{ idEpp: number, talle: string | null, desc: string } | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [soloAlerta, setSoloAlerta] = useState(false)

  const stockEmpresa = stock.filter(s => s.id_empresa === idEmpresa)

  // Agrupar por id_epp
  const grupos = new Map<number, EppStock[]>()
  for (const s of stockEmpresa) {
    if (!grupos.has(s.id_epp)) grupos.set(s.id_epp, [])
    grupos.get(s.id_epp)!.push(s)
  }

  // Aplicar filtros
  const gruposFiltrados = Array.from(grupos.entries()).filter(([, rows]) => {
    const desc = rows[0].epp_catalogo.descripcion.toLowerCase()
    if (busqueda && !desc.includes(busqueda.toLowerCase())) return false
    if (soloAlerta && !rows.some(r => r.cantidad_disponible <= r.cantidad_minima)) return false
    return true
  })

  const hayFiltros = !!(busqueda || soloAlerta)

  function limpiarFiltros() {
    setBusqueda('')
    setSoloAlerta(false)
  }

  function toggleExpand(idEpp: number) {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(idEpp)) { next.delete(idEpp) } else { next.add(idEpp) }
      return next
    })
  }

  const movsFiltradosModal = movModal
    ? movimientos
        .filter(m => m.id_empresa === idEmpresa)
        .flatMap(m =>
          m.epp_movimientos_items
            .filter(item =>
              item.id_epp === movModal.idEpp &&
              (movModal.talle ? item.talle === movModal.talle : !item.talle)
            )
            .map(item => ({ ...item, mov: m }))
        )
        .sort((a, b) => b.mov.fecha.localeCompare(a.mov.fecha))
    : []

  return (
    <>
      {/* Modal movimientos de talle */}
      {movModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '0.5px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Movimientos</p>
                <p style={{ fontSize: '12px', color: '#8b949e', margin: '2px 0 0' }}>
                  {movModal.desc}{movModal.talle ? ` — Talle ${movModal.talle}` : ''}
                </p>
              </div>
              <button onClick={() => setMovModal(null)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {movsFiltradosModal.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#484f58', fontSize: '13px' }}>Sin movimientos registrados</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                      {['Fecha', 'Tipo', 'Comprobante', 'Empleado', 'Cantidad'].map(col => (
                        <th key={col} style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movsFiltradosModal.map((item, i) => (
                      <tr key={`${item.id}-${i}`} style={{ borderBottom: i < movsFiltradosModal.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                        <td style={{ padding: '10px 16px', color: '#8b949e' }}>{formatFecha(item.mov.fecha)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                            background: item.mov.tipo === 'entrega' ? '#3a1a1a' : '#1a2a1a',
                            color: item.mov.tipo === 'entrega' ? '#f85149' : '#3fb950',
                          }}>
                            {TIPO_LABEL[item.mov.tipo] || item.mov.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#8b949e' }}>{item.mov.nro_comp || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                          {item.mov.legajos ? `${item.mov.legajos.apellido}, ${item.mov.legajos.nombre}` : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 500, color: item.cantidad < 0 ? '#f85149' : '#3fb950' }}>
                          {item.cantidad > 0 ? `+${item.cantidad}` : item.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '10px 14px' }}>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <Search size={13} color="#484f58" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por EPP..."
            style={{ width: '100%', padding: '6px 10px 6px 30px', borderRadius: '5px', background: '#0d1117', border: '0.5px solid #30363d', color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={soloAlerta} onChange={e => setSoloAlerta(e.target.checked)} />
          Solo stock bajo
        </label>
        {hayFiltros && (
          <>
            <span style={{ fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap' }}>
              {gruposFiltrados.length} resultado{gruposFiltrados.length !== 1 ? 's' : ''}
            </span>
            <button onClick={limpiarFiltros} style={{ ...inputFiltro, cursor: 'pointer', whiteSpace: 'nowrap' }}>× Limpiar</button>
          </>
        )}
      </div>

      {grupos.size === 0 ? (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
          No hay stock registrado. Cargá un movimiento de tipo "Stock inicial" para comenzar.
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
          No hay resultados para los filtros aplicados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {gruposFiltrados.map(([idEpp, rows]) => {
            const descripcion = rows[0].epp_catalogo.descripcion
            const totalDisponible = rows.reduce((s, r) => s + r.cantidad_disponible, 0)
            const totalMinimo = rows.reduce((s, r) => s + r.cantidad_minima, 0)
            const isExpanded = expandidos.has(idEpp)
            const hayAlerta = rows.some(r => r.cantidad_disponible <= r.cantidad_minima)

            return (
              <div key={idEpp} style={{ background: '#161b22', border: `0.5px solid ${hayAlerta ? '#5a1a1a' : '#30363d'}`, borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  onClick={() => toggleExpand(idEpp)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer' }}
                >
                  {isExpanded ? <ChevronDown size={14} color="#8b949e" /> : <ChevronRight size={14} color="#8b949e" />}
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#e6edf3' }}>{descripcion}</span>
                  <span style={{ fontSize: '12px', color: '#8b949e' }}>
                    {rows.length} talle{rows.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: totalDisponible <= totalMinimo ? '#f85149' : '#3fb950', minWidth: '70px', textAlign: 'right' }}>
                    {totalDisponible} uds
                  </span>
                  {hayAlerta && (
                    <span style={{ background: '#3a1a1a', color: '#f85149', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      Stock bajo
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '0.5px solid #30363d' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '0.5px solid #21262d', background: '#0d1117' }}>
                          <th style={{ textAlign: 'left', padding: '8px 16px 8px 42px', color: '#8b949e', fontWeight: 400, fontSize: '12px' }}>Talle</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: '#8b949e', fontWeight: 400, fontSize: '12px' }}>Disponible</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: '#8b949e', fontWeight: 400, fontSize: '12px' }}>Mínimo</th>
                          <th style={{ textAlign: 'left', padding: '8px 16px', color: '#8b949e', fontWeight: 400, fontSize: '12px' }}>Ubicación</th>
                          <th style={{ padding: '8px 16px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={row.id} style={{ borderBottom: i < rows.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                            <td style={{ padding: '8px 16px 8px 42px', color: '#e6edf3' }}>
                              {row.talle
                                ? <span style={{ background: '#1f2937', color: '#93c5fd', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{row.talle}</span>
                                : <span style={{ color: '#484f58' }}>Sin talle</span>}
                            </td>
                            <td style={{ padding: '8px 16px', fontWeight: 600, color: row.cantidad_disponible <= row.cantidad_minima ? '#f85149' : '#e6edf3' }}>
                              {row.cantidad_disponible}
                            </td>
                            <td style={{ padding: '8px 16px', color: '#8b949e' }}>{row.cantidad_minima}</td>
                            <td style={{ padding: '8px 16px', color: '#8b949e' }}>{row.obras?.nombre || 'Depósito central'}</td>
                            <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                              <button
                                onClick={e => { e.stopPropagation(); setMovModal({ idEpp, talle: row.talle || null, desc: descripcion }) }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '3px 10px', fontSize: '12px', cursor: 'pointer' }}
                              >
                                <BarChart2 size={11} /> Movimientos
                              </button>
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
