"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

type Usuario = { id: string; nombre: string; mail: string }
type Empresa = { id: number; razon_social: string }
type Rol = { id: number; codigo: string; descripcion: string }
type Permiso = { id: number; id_empresa: number; id_rol: number; empresas: { razon_social: string }; roles: { descripcion: string } }
type Obra = { id: number; id_empresa: number; nombre: string }
type UsuarioObra = { id: number; id_usuario: string; id_obra: number; obras: { nombre: string } }

type Props = {
  usuario: Usuario
  empresas: Empresa[]
  roles: Rol[]
  permisos: Permiso[]
  obras: Obra[]
  usuarioObras: UsuarioObra[]
  onCerrar: () => void
}

export default function ModalPermisos({ usuario, empresas, roles, permisos: permisosIniciales, obras, usuarioObras: uObrasIniciales, onCerrar }: Props) {
  const router = useRouter()
  const [permisos, setPermisos] = useState(permisosIniciales)
  const [uObras, setUObras] = useState(uObrasIniciales)
  const [idEmpresa, setIdEmpresa] = useState('')
  const [idRol, setIdRol] = useState('')
  const [idObraAdd, setIdObraAdd] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingObra, setLoadingObra] = useState(false)
  const [error, setError] = useState('')

  const selectStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px',
  }

  // Determina si el usuario tiene rol JEFE_OBRA
  const esJefeObra = permisos.some(p => (p as any).roles?.codigo === 'JEFE_OBRA' || p.id_rol === roles.find(r => r.codigo === 'JEFE_OBRA')?.id)

  // Obras filtradas por empresas que tiene el usuario
  const empresasIds = new Set(permisos.map(p => p.id_empresa))
  const obrasFiltradas = obras.filter(o => empresasIds.has(o.id_empresa))
  const obrasDisponibles = obrasFiltradas.filter(o => !uObras.some(uo => uo.id_obra === o.id))

  async function agregar() {
    if (!idEmpresa || !idRol) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/permisos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario: usuario.id, id_empresa: parseInt(idEmpresa), id_rol: parseInt(idRol) })
    })
    const data = await res.json()
    if (data.error) { setError(data.error) } else { router.refresh(); onCerrar() }
    setLoading(false)
  }

  async function quitar(id: number) {
    if (!confirm('¿Quitar este permiso?')) return
    const res = await fetch('/api/permisos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const data = await res.json()
    if (data.error) { setError(data.error) } else { setPermisos(permisos.filter(p => p.id !== id)); router.refresh() }
  }

  async function agregarObra() {
    if (!idObraAdd) return
    setLoadingObra(true)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('usuario_obras')
      .insert({ id_usuario: usuario.id, id_obra: parseInt(idObraAdd) })
      .select('id, id_usuario, id_obra, obras(nombre)')
      .single()
    if (!err && data) {
      setUObras([...uObras, data as any])
      setIdObraAdd('')
    }
    setLoadingObra(false)
  }

  async function quitarObra(id: number) {
    if (!confirm('¿Quitar esta obra?')) return
    const supabase = createClient()
    await supabase.from('usuario_obras').delete().eq('id', id)
    setUObras(uObras.filter(uo => uo.id !== id))
  }

  const rolesFiltrados = roles.filter(r => r.codigo !== 'SUPERADMIN')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '10px', width: '100%', maxWidth: '520px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>Permisos de {usuario.nombre}</h2>
            <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>{usuario.mail}</span>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}><X size={18} /></button>
        </div>

        {/* Permisos actuales */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', marginBottom: '8px' }}>Accesos actuales</p>
          {permisos.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--c-text-muted)' }}>Sin permisos asignados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {permisos.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', borderRadius: '6px', padding: '8px 12px' }}>
                  <div>
                    <span style={{ fontSize: '13px', color: 'var(--c-text-primary)' }}>{p.empresas.razon_social}</span>
                    <span style={{ marginLeft: '8px', background: 'var(--c-blue-bg)', color: 'var(--c-blue)', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>{p.roles.descripcion}</span>
                  </div>
                  <button onClick={() => quitar(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-red)' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agregar permiso */}
        <div style={{ borderTop: '0.5px solid var(--c-border)', paddingTop: '16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', marginBottom: '10px' }}>Agregar acceso</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Empresa</label>
              <select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} style={selectStyle}>
                <option value="">Seleccionar...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Rol</label>
              <select value={idRol} onChange={(e) => setIdRol(e.target.value)} style={selectStyle}>
                <option value="">Seleccionar...</option>
                {rolesFiltrados.map(r => <option key={r.id} value={r.id}>{r.descripcion}</option>)}
              </select>
            </div>
          </div>
          {error && <p style={{ color: 'var(--c-red)', fontSize: '12px', marginBottom: '8px' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={onCerrar} style={{ background: 'transparent', border: '0.5px solid var(--c-border)', color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}>Cerrar</button>
            <button onClick={agregar} disabled={loading || !idEmpresa || !idRol} style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>

        {/* Obras asignadas — solo si tiene rol JEFE_OBRA */}
        {(esJefeObra || uObras.length > 0) && (
          <div style={{ borderTop: '0.5px solid var(--c-border)', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--c-text-secondary)', marginBottom: '10px' }}>Obras asignadas (Jefe de Obra)</p>

            {uObras.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '10px' }}>Sin obras asignadas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {uObras.map(uo => (
                  <div key={uo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--c-base)', border: '0.5px solid var(--c-border)', borderRadius: '6px', padding: '7px 12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--c-text-primary)' }}>{(uo as any).obras?.nombre || `Obra #${uo.id_obra}`}</span>
                    <button onClick={() => quitarObra(uo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-red)' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {obrasDisponibles.length > 0 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={idObraAdd} onChange={e => setIdObraAdd(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                  <option value="">Agregar obra...</option>
                  {obrasDisponibles.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
                <button onClick={agregarObra} disabled={loadingObra || !idObraAdd} style={{ background: 'var(--c-blue-bg)', border: '0.5px solid var(--c-blue)40', color: 'var(--c-blue)', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: loadingObra ? 0.6 : 1 }}>
                  + Agregar
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
