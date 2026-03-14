"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2 } from 'lucide-react'

type Usuario = {
  id: string
  nombre: string
  mail: string
}

type Empresa = {
  id: number
  razon_social: string
}

type Rol = {
  id: number
  codigo: string
  descripcion: string
}

type Permiso = {
  id: number
  id_empresa: number
  id_rol: number
  empresas: { razon_social: string }
  roles: { descripcion: string }
}

type Props = {
  usuario: Usuario
  empresas: Empresa[]
  roles: Rol[]
  permisos: Permiso[]
  onCerrar: () => void
}

export default function ModalPermisos({ usuario, empresas, roles, permisos: permisosIniciales, onCerrar }: Props) {
  const router = useRouter()
  const [permisos, setPermisos] = useState(permisosIniciales)
  const [idEmpresa, setIdEmpresa] = useState('')
  const [idRol, setIdRol] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: '#0d1117', border: '0.5px solid #30363d',
    color: '#e6edf3', fontSize: '13px',
  }

  async function agregar() {
    if (!idEmpresa || !idRol) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/permisos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario: usuario.id,
        id_empresa: parseInt(idEmpresa),
        id_rol: parseInt(idRol)
      })
    })

    const data = await res.json()
    if (data.error) {
      setError(data.error)
    } else {
      router.refresh()
      onCerrar()
    }
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
    if (data.error) {
      setError(data.error)
    } else {
      setPermisos(permisos.filter(p => p.id !== id))
      router.refresh()
    }
  }

  // Roles disponibles — excluir SUPERADMIN para asignación por empresa
  const rolesFiltrados = roles.filter(r => r.codigo !== 'SUPERADMIN')

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div style={{
        background: '#161b22', border: '0.5px solid #30363d',
        borderRadius: '10px', width: '100%', maxWidth: '500px', padding: '24px',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
              Permisos de {usuario.nombre}
            </h2>
            <span style={{ fontSize: '12px', color: '#8b949e' }}>{usuario.mail}</span>
          </div>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
            <X size={18} />
          </button>
        </div>

        {/* Permisos actuales */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>Accesos actuales</p>
          {permisos.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#484f58' }}>Sin permisos asignados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {permisos.map((p) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#0d1117', border: '0.5px solid #30363d',
                  borderRadius: '6px', padding: '8px 12px',
                }}>
                  <div>
                    <span style={{ fontSize: '13px', color: '#e6edf3' }}>{p.empresas.razon_social}</span>
                    <span style={{
                      marginLeft: '8px', background: '#1a2a3a', color: '#58a6ff',
                      fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                    }}>{p.roles.descripcion}</span>
                  </div>
                  <button
                    onClick={() => quitar(p.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f85149' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agregar permiso */}
        <div style={{ borderTop: '0.5px solid #30363d', paddingTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '10px' }}>Agregar acceso</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Empresa</label>
              <select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} style={selectStyle}>
                <option value="">Seleccionar...</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.razon_social}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Rol</label>
              <select value={idRol} onChange={(e) => setIdRol(e.target.value)} style={selectStyle}>
                <option value="">Seleccionar...</option>
                {rolesFiltrados.map(r => (
                  <option key={r.id} value={r.id}>{r.descripcion}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p style={{ color: '#f85149', fontSize: '12px', marginBottom: '8px' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={onCerrar} style={{
              background: 'transparent', border: '0.5px solid #30363d',
              color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
              fontSize: '13px', cursor: 'pointer',
            }}>
              Cerrar
            </button>
            <button
              onClick={agregar}
              disabled={loading || !idEmpresa || !idRol}
              style={{
                background: '#2563eb', color: 'white', border: 'none',
                borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}