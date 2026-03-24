"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'
import { useRouter } from 'next/navigation'
import { Search, X, ExternalLink } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'

type Categoria = { id: number; id_empresa: number; descripcion: string }
type Obra = { id: number; id_empresa: number; nombre: string }
type Legajo = {
  id: number; nro_legajo: number; apellido: string; nombre: string
  cuil?: string; nro_documento?: string; tipo_documento?: string
  fecha_ingreso: string; estado: string
  id_obra?: number; id_categoria?: number
  categorias?: { descripcion: string }; obras?: { nombre: string }
}

const inputStyle = {
  width: '100%', padding: '7px 10px', borderRadius: '6px',
  background: '#0d1117', border: '0.5px solid #30363d',
  color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
}
const selStyle = {
  width: '100%', padding: '7px 10px', borderRadius: '6px',
  background: '#0d1117', border: '0.5px solid #30363d',
  color: '#e6edf3', fontSize: '13px',
}

const estadoColor: Record<string, { bg: string; color: string }> = {
  'Activo': { bg: '#1a3a2a', color: '#3fb950' },
  'Baja':   { bg: '#3a1a1a', color: '#f85149' },
}

export default function PersonalObraClient({ categorias, obras }: { categorias: Categoria[]; obras: Obra[] }) {
  const { empresaActiva, obrasJefe } = useEmpresa()
  const router = useRouter()
  const supabase = createClient()

  const [personal, setPersonal] = useState<Legajo[]>([])
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  // Modales
  const [modalPreAlta, setModalPreAlta] = useState(false)
  const [modalObra, setModalObra] = useState<Legajo | null>(null)
  const [modalCategoria, setModalCategoria] = useState<Legajo | null>(null)
  const [modalPreBaja, setModalPreBaja] = useState<Legajo | null>(null)

  const obrasFiltradas = obras.filter(o => o.id_empresa === empresaActiva?.id && obrasJefe.includes(o.id))
  const todasObrasEmpresa = obras.filter(o => o.id_empresa === empresaActiva?.id)
  const categoriasFiltradas = categorias.filter(c => c.id_empresa === empresaActiva?.id)

  useEffect(() => {
    if (!empresaActiva || obrasJefe.length === 0) return
    cargar()
  }, [empresaActiva?.id, obrasJefe.join(',')])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('legajos')
      .select('id, nro_legajo, apellido, nombre, cuil, nro_documento, tipo_documento, fecha_ingreso, estado, id_obra, id_categoria, categorias(descripcion), obras(nombre)')
      .eq('id_empresa', empresaActiva!.id)
      .in('id_obra', obrasJefe)
      .eq('estado', 'Activo')
      .order('apellido')
    setPersonal(data || [])
    setCargando(false)
  }

  const personalFiltrado = personal.filter(p => {
    const b = busqueda.toLowerCase()
    return !b || p.apellido.toLowerCase().includes(b) || p.nombre.toLowerCase().includes(b) || (p.nro_documento || '').includes(b)
  })

  if (!empresaActiva) return <div style={{ color: '#8b949e', fontSize: '14px' }}>Seleccioná una empresa en el header.</div>
  if (obrasJefe.length === 0) return <div style={{ color: '#8b949e', fontSize: '14px' }}>No tenés obras asignadas. Contactá al administrador.</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>Personal de Obra</h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {obrasFiltradas.map(o => o.nombre).join(', ')}
          </span>
        </div>
        <button
          onClick={() => setModalPreAlta(true)}
          style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}
        >
          + Alta empleado
        </button>
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
        <input
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por apellido, nombre o documento..."
          style={{ ...inputStyle, paddingLeft: '32px' }}
        />
      </div>

      {/* Tabla */}
      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>Cargando...</div>
        ) : personalFiltrado.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
            {busqueda ? 'Sin resultados.' : 'No hay personal en tus obras.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d', background: '#0d1117' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Empleado</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Obra</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Categoría</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Ingreso</th>
                <th style={{ padding: '10px 16px', color: '#8b949e', fontWeight: 500 }}>Estado</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {personalFiltrado.map((p, i) => {
                const ec = estadoColor[p.estado] || { bg: '#21262d', color: '#8b949e' }
                return (
                  <tr key={p.id} style={{ borderBottom: i < personalFiltrado.length - 1 ? '0.5px solid #21262d' : 'none' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ color: '#e6edf3', fontWeight: 500 }}>{p.apellido}, {p.nombre}</div>
                      <div style={{ color: '#484f58', fontSize: '11px' }}>
                        Leg. {String(p.nro_legajo).padStart(4, '0')}
                        {p.nro_documento ? ` · DNI ${p.nro_documento}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{p.obras?.nombre || '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{p.categorias?.descripcion || '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>{p.fecha_ingreso ? formatFecha(p.fecha_ingreso) : '—'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span style={{ background: ec.bg, color: ec.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>{p.estado}</span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setModalObra(p)} style={btnSecStyle}>Cambiar obra</button>
                        <button onClick={() => setModalCategoria(p)} style={btnSecStyle}>Categoría</button>
                        {p.estado !== 'Baja' && (
                          <button onClick={() => setModalPreBaja(p)} style={{ ...btnSecStyle, color: '#f85149', borderColor: '#f8514940' }}>Dar de baja</button>
                        )}
                        <a href={`/legajos/${p.id}?tab=documentos`} target="_blank" rel="noreferrer" style={{ ...btnSecStyle, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                          <ExternalLink size={12} /> Docs
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Pre-Alta */}
      {modalPreAlta && (
        <ModalPreAlta
          empresaActiva={empresaActiva}
          obrasFiltradas={obrasFiltradas}
          categoriasFiltradas={categoriasFiltradas}
          onCerrar={() => setModalPreAlta(false)}
          onGuardado={() => { setModalPreAlta(false); cargar() }}
        />
      )}

      {/* Modal Cambiar Obra */}
      {modalObra && (
        <ModalCambiarObra
          legajo={modalObra}
          todasObras={todasObrasEmpresa}
          onCerrar={() => setModalObra(null)}
          onGuardado={() => { setModalObra(null); cargar() }}
        />
      )}

      {/* Modal Cambiar Categoría */}
      {modalCategoria && (
        <ModalCambiarCategoria
          legajo={modalCategoria}
          categoriasFiltradas={categoriasFiltradas}
          onCerrar={() => setModalCategoria(null)}
          onGuardado={() => { setModalCategoria(null); cargar() }}
        />
      )}

      {/* Modal Pre-Baja */}
      {modalPreBaja && (
        <ModalPreBaja
          legajo={modalPreBaja}
          empresaId={empresaActiva.id}
          onCerrar={() => setModalPreBaja(null)}
          onGuardado={() => { setModalPreBaja(null); cargar() }}
        />
      )}
    </div>
  )
}

const btnSecStyle: React.CSSProperties = {
  background: 'transparent', border: '0.5px solid #30363d',
  color: '#8b949e', cursor: 'pointer', fontSize: '11px',
  padding: '3px 8px', borderRadius: '4px',
}

// ── Modal Pre-Alta ─────────────────────────────────────────────────────────────
function ModalPreAlta({ empresaActiva, obrasFiltradas, categoriasFiltradas, onCerrar, onGuardado }: {
  empresaActiva: any; obrasFiltradas: Obra[]; categoriasFiltradas: Categoria[]
  onCerrar: () => void; onGuardado: () => void
}) {
  const supabase = createClient()
  const [dniBusqueda, setDniBusqueda] = useState('')
  const [legajoExistente, setLegajoExistente] = useState<Legajo | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [apellido, setApellido] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipoDoc, setTipoDoc] = useState('DNI')
  const [nroDoc, setNroDoc] = useState('')
  const [cuil, setCuil] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0])
  const [idObra, setIdObra] = useState(obrasFiltradas[0]?.id?.toString() || '')
  const [idCategoria, setIdCategoria] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function buscarPorDni() {
    if (!dniBusqueda.trim()) return
    setBuscando(true)
    setLegajoExistente(null)
    const { data } = await supabase
      .from('legajos')
      .select('id, nro_legajo, apellido, nombre, cuil, nro_documento, tipo_documento, fecha_ingreso, estado, id_obra, id_categoria, categorias(descripcion), obras(nombre)')
      .eq('id_empresa', empresaActiva.id)
      .eq('nro_documento', dniBusqueda.trim())
      .maybeSingle()
    if (data) {
      setLegajoExistente(data as any)
      setApellido(data.apellido)
      setNombre(data.nombre)
      setTipoDoc(data.tipo_documento || 'DNI')
      setNroDoc(data.nro_documento || '')
      setCuil(data.cuil || '')
      setIdObra(obrasFiltradas[0]?.id?.toString() || '')
      setIdCategoria(data.id_categoria?.toString() || '')
    } else {
      setNroDoc(dniBusqueda.trim())
    }
    setBuscando(false)
  }

  async function guardar() {
    if (!apellido || !nombre || !fechaIngreso || !idObra) { setError('Apellido, nombre, fecha de ingreso y obra son obligatorios.'); return }
    setGuardando(true)
    setError('')

    if (legajoExistente) {
      // Reingreso: actualizar legajo existente
      const { error: err } = await supabase.from('legajos').update({
        estado: 'Activo',
        fecha_ingreso: fechaIngreso,
        id_obra: parseInt(idObra),
        id_categoria: idCategoria ? parseInt(idCategoria) : legajoExistente.id_categoria,
      }).eq('id', legajoExistente.id)
      if (err) { setError(err.message); setGuardando(false); return }
    } else {
      // Nuevo legajo: calcular nro_legajo automático
      const { data: maxData } = await supabase
        .from('legajos')
        .select('nro_legajo')
        .eq('id_empresa', empresaActiva.id)
        .order('nro_legajo', { ascending: false })
        .limit(1)
        .maybeSingle()
      const nroLegajo = ((maxData as any)?.nro_legajo || 0) + 1

      const { error: err } = await supabase.from('legajos').insert({
        id_empresa: empresaActiva.id,
        nro_legajo: nroLegajo,
        apellido, nombre,
        tipo_documento: tipoDoc,
        nro_documento: nroDoc || null,
        cuil: cuil || null,
        fecha_ingreso: fechaIngreso,
        id_obra: parseInt(idObra),
        id_categoria: idCategoria ? parseInt(idCategoria) : null,
        estado: 'Activo',
        activo: true,
      })
      if (err) { setError(err.message); setGuardando(false); return }
    }
    onGuardado()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Alta de empleado</h2>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
        </div>

        {/* Buscar por DNI */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Buscar por DNI (si ya existe en el sistema)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={dniBusqueda} onChange={e => setDniBusqueda(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarPorDni()} placeholder="Número de documento..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={buscarPorDni} disabled={buscando} style={{ background: '#21262d', border: '0.5px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {buscando ? '...' : 'Buscar'}
            </button>
          </div>
          {legajoExistente && (
            <div style={{ marginTop: '8px', padding: '8px 12px', background: '#1a2a3a', borderRadius: '6px', fontSize: '12px', color: '#58a6ff' }}>
              ✓ Empleado encontrado: <strong>{legajoExistente.apellido}, {legajoExistente.nombre}</strong> — Legajo {String(legajoExistente.nro_legajo).padStart(4,'0')} (estado actual: {legajoExistente.estado})
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Apellido *</label>
              <input value={apellido} onChange={e => setApellido(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Tipo doc.</label>
              <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)} style={selStyle}>
                <option>DNI</option><option>PASAPORTE</option><option>CI</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Nro. documento</label>
              <input value={nroDoc} onChange={e => setNroDoc(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>CUIL</label>
            <input value={cuil} onChange={e => setCuil(e.target.value)} placeholder="20-12345678-9" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Fecha de ingreso *</label>
              <input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Obra *</label>
              <select value={idObra} onChange={e => setIdObra(e.target.value)} style={selStyle}>
                <option value="">Seleccionar...</option>
                {obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Categoría</label>
            <select value={idCategoria} onChange={e => setIdCategoria(e.target.value)} style={selStyle}>
              <option value="">Sin categoría</option>
              {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
            </select>
          </div>
        </div>

        {error && <p style={{ color: '#f85149', fontSize: '12px', margin: '12px 0 0' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button onClick={onCerrar} style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: guardando ? 0.6 : 1 }}>
            {guardando ? 'Guardando...' : legajoExistente ? 'Confirmar reingreso' : 'Crear alta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Cambiar Obra ─────────────────────────────────────────────────────────
function ModalCambiarObra({ legajo, todasObras, onCerrar, onGuardado }: {
  legajo: Legajo; todasObras: Obra[]; onCerrar: () => void; onGuardado: () => void
}) {
  const supabase = createClient()
  const [idObra, setIdObra] = useState('')
  const hoyLocal = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  const [fechaDesde, setFechaDesde] = useState(hoyLocal)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Excluir la obra actual del listado
  const obrasDisponibles = todasObras.filter(o => o.id !== legajo.id_obra)

  async function guardar() {
    if (!idObra || !fechaDesde) { setError('Seleccioná la nueva obra y la fecha de traslado.'); return }
    setGuardando(true)
    const { error: err } = await supabase.from('legajos').update({ id_obra: parseInt(idObra) }).eq('id', legajo.id)
    if (err) { setError(err.message); setGuardando(false); return }
    // Corregir fechas: el trigger crea el nuevo registro con NOW() (UTC)
    // nuevo registro → fecha_desde = fechaDesde; registro anterior → fecha_hasta = fechaDesde - 1 día
    const { data: ultimos } = await supabase
      .from('legajos_historico_obras')
      .select('id')
      .eq('id_legajo', legajo.id)
      .order('id', { ascending: false })
      .limit(2)
    if (ultimos && ultimos.length >= 1) {
      await supabase.from('legajos_historico_obras').update({ fecha_desde: fechaDesde }).eq('id', ultimos[0].id)
    }
    if (ultimos && ultimos.length >= 2) {
      const d = new Date(fechaDesde + 'T00:00:00')
      d.setDate(d.getDate() - 1)
      const fechaHasta = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      await supabase.from('legajos_historico_obras').update({ fecha_hasta: fechaHasta }).eq('id', ultimos[1].id)
    }
    onGuardado()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '400px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Cambiar obra</h2>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '13px', color: '#8b949e', marginBottom: '4px' }}>{legajo.apellido}, {legajo.nombre}</p>
        <p style={{ fontSize: '11px', color: '#484f58', marginBottom: '16px' }}>
          Obra actual: <span style={{ color: '#8b949e' }}>{legajo.obras?.nombre || '—'}</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Nueva obra</label>
            <select value={idObra} onChange={e => setIdObra(e.target.value)} style={selStyle}>
              <option value="">Seleccionar...</option>
              {obrasDisponibles.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Fecha de traslado</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={inputStyle} />
          </div>
        </div>
        {error && <p style={{ color: '#f85149', fontSize: '12px', marginBottom: '8px' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onCerrar} style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando || !idObra} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: guardando ? 0.6 : 1 }}>
            {guardando ? 'Guardando...' : 'Trasladar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Cambiar Categoría ────────────────────────────────────────────────────
function ModalCambiarCategoria({ legajo, categoriasFiltradas, onCerrar, onGuardado }: {
  legajo: Legajo; categoriasFiltradas: Categoria[]; onCerrar: () => void; onGuardado: () => void
}) {
  const supabase = createClient()
  const [idCategoria, setIdCategoria] = useState('')
  const hoyLocal = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  const [fechaDesde, setFechaDesde] = useState(hoyLocal)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Excluir la categoría actual
  const categoriasDisponibles = categoriasFiltradas.filter(c => c.id !== legajo.id_categoria)

  async function guardar() {
    if (!fechaDesde) { setError('Ingresá la fecha de cambio.'); return }
    setGuardando(true)
    const { error: err } = await supabase.from('legajos').update({ id_categoria: idCategoria ? parseInt(idCategoria) : null }).eq('id', legajo.id)
    if (err) { setError(err.message); setGuardando(false); return }
    // Corregir fechas: el trigger crea el nuevo registro con NOW() (UTC)
    // nuevo registro → fecha_desde = fechaDesde; registro anterior → fecha_hasta = fechaDesde - 1 día
    const { data: ultimos } = await supabase
      .from('legajos_historico_categorias')
      .select('id')
      .eq('id_legajo', legajo.id)
      .order('id', { ascending: false })
      .limit(2)
    if (ultimos && ultimos.length >= 1) {
      await supabase.from('legajos_historico_categorias').update({ fecha_desde: fechaDesde }).eq('id', ultimos[0].id)
    }
    if (ultimos && ultimos.length >= 2) {
      const d = new Date(fechaDesde + 'T00:00:00')
      d.setDate(d.getDate() - 1)
      const fechaHasta = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      await supabase.from('legajos_historico_categorias').update({ fecha_hasta: fechaHasta }).eq('id', ultimos[1].id)
    }
    onGuardado()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '400px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#e6edf3', margin: 0 }}>Cambiar categoría</h2>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '13px', color: '#8b949e', marginBottom: '4px' }}>{legajo.apellido}, {legajo.nombre}</p>
        <p style={{ fontSize: '11px', color: '#484f58', marginBottom: '16px' }}>
          Categoría actual: <span style={{ color: '#8b949e' }}>{legajo.categorias?.descripcion || '—'}</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Nueva categoría</label>
            <select value={idCategoria} onChange={e => setIdCategoria(e.target.value)} style={selStyle}>
              <option value="">Sin categoría</option>
              {categoriasDisponibles.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Fecha de cambio</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={inputStyle} />
          </div>
        </div>
        {error && <p style={{ color: '#f85149', fontSize: '12px', marginBottom: '8px' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onCerrar} style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: guardando ? 0.6 : 1 }}>
            {guardando ? 'Guardando...' : 'Cambiar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Pre-Baja ─────────────────────────────────────────────────────────────
function ModalPreBaja({ legajo, empresaId, onCerrar, onGuardado }: {
  legajo: Legajo; empresaId: number; onCerrar: () => void; onGuardado: () => void
}) {
  const supabase = createClient()
  const [fechaTentativa, setFechaTentativa] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const motivos = ['Renuncia', 'Fin de obra', 'Despido', 'Mutuo acuerdo', 'Otro']

  async function guardar() {
    if (!motivo) { setError('Seleccioná un motivo.'); return }
    setGuardando(true)
    const { error: err } = await supabase.from('legajos').update({
      estado: 'Baja',
    }).eq('id', legajo.id)
    if (err) { setError(err.message); setGuardando(false); return }

    // Registrar en historial laboral
    await supabase.from('legajos_historial_laboral').insert({
      id_legajo: legajo.id,
      id_empresa: empresaId,
      fecha_ingreso: legajo.fecha_ingreso,
      motivo: 'Baja',
      observacion: `${motivo}${fechaTentativa ? ` — fecha tentativa: ${fechaTentativa}` : ''}`,
    })

    onGuardado()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#161b22', border: '0.5px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '400px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: '#f85149', margin: 0 }}>Dar de baja</h2>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '13px', color: '#8b949e', marginBottom: '16px' }}>{legajo.apellido}, {legajo.nombre}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Motivo *</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value)} style={selStyle}>
              <option value="">Seleccionar...</option>
              {motivos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Fecha tentativa de egreso</label>
            <input type="date" value={fechaTentativa} onChange={e => setFechaTentativa(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ padding: '10px 12px', background: '#3a1a1a', borderRadius: '6px', fontSize: '12px', color: '#f85149' }}>
            El empleado quedará en estado <strong>Baja</strong>.
          </div>
        </div>
        {error && <p style={{ color: '#f85149', fontSize: '12px', margin: '10px 0 0' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button onClick={onCerrar} style={{ background: 'transparent', border: '0.5px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ background: '#3a1a1a', border: '0.5px solid #f8514940', color: '#f85149', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: guardando ? 0.6 : 1 }}>
            {guardando ? 'Guardando...' : 'Confirmar baja'}
          </button>
        </div>
      </div>
    </div>
  )
}
