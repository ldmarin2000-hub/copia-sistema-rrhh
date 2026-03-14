"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import ModalPermisos from './ModalPermisos'

type Usuario = {
  id: string
  nombre: string
  mail: string
  activo: boolean
  es_superadmin: boolean
  created_at: string
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
  id_usuario: string
  id_empresa: number
  id_rol: number
  empresas: { razon_social: string }
  roles: { descripcion: string }
}



export default function UsuariosClient({
  usuarios, empresas, roles, permisos
}: {
  usuarios: Usuario[]
  empresas: Empresa[]
  roles: Rol[]
  permisos: Permiso[]
}) {
  const router = useRouter()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [esSuperadmin, setEsSuperadmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usuarioPermisos, setUsuarioPermisos] = useState<Usuario | null>(null)

  async function crearUsuario() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, password, es_superadmin: esSuperadmin })
    })

    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }

    setEmail('')
    setNombre('')
    setPassword('')
    setEsSuperadmin(false)
    setMostrarForm(false)
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      {/* Modal nuevo usuario */}
      {usuarioPermisos && (
        <ModalPermisos
          usuario={usuarioPermisos}
          empresas={empresas}
          roles={roles}
          permisos={permisos.filter(p => p.id_usuario === usuarioPermisos.id)}
          onCerrar={() => setUsuarioPermisos(null)}
        />
      )}
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: '#161b22', border: '0.5px solid #30363d',
            borderRadius: '10px', width: '100%', maxWidth: '420px', padding: '24px',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#e6edf3', margin: '0 0 20px' }}>
              Nuevo usuario
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Nombre *</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre completo"
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: '6px',
                    background: '#0d1117', border: '0.5px solid #30363d',
                    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: '6px',
                    background: '#0d1117', border: '0.5px solid #30363d',
                    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Contraseña *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: '6px',
                    background: '#0d1117', border: '0.5px solid #30363d',
                    color: '#e6edf3', fontSize: '13px', boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="superadmin"
                  checked={esSuperadmin}
                  onChange={(e) => setEsSuperadmin(e.target.checked)}
                />
                <label htmlFor="superadmin" style={{ fontSize: '13px', color: '#8b949e', cursor: 'pointer' }}>
                  Es Superadmin
                </label>
              </div>

              {error && (
                <p style={{ color: '#f85149', fontSize: '12px', margin: 0 }}>{error}</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => { setMostrarForm(false); setError('') }}
                style={{
                  background: 'transparent', border: '0.5px solid #30363d',
                  color: '#8b949e', borderRadius: '6px', padding: '7px 16px',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={crearUsuario}
                disabled={loading || !email || !nombre || !password}
                style={{
                  background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px',
                  fontSize: '13px', cursor: 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
            Usuarios
          </h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          style={{
            background: '#2563eb', color: 'white', border: 'none',
            borderRadius: '6px', padding: '7px 16px',
            fontSize: '13px', cursor: 'pointer',
          }}
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Tabla */}
      <div style={{
        background: '#161b22', border: '0.5px solid #30363d',
        borderRadius: '8px', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #30363d' }}>
              {['Nombre', 'Email', 'Rol', 'Estado'].map((col) => (
                <th key={col} style={{
                  textAlign: 'left', padding: '10px 16px',
                  color: '#8b949e', fontWeight: 500,
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario, i) => (
              <tr key={usuario.id} style={{
                borderBottom: i < usuarios.length - 1 ? '0.5px solid #21262d' : 'none',
              }}>
                <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{usuario.nombre}</td>
                <td style={{ padding: '10px 16px', color: '#8b949e' }}>{usuario.mail}</td>
                <td style={{ padding: '10px 16px' }}>
                  {usuario.es_superadmin ? (
                    <span style={{
                      background: '#2a1a3a', color: '#bc8cff',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      Superadmin
                    </span>
                  ) : (
                    <span style={{ color: '#8b949e', fontSize: '12px' }}>Ver permisos</span>
                  )}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {usuario.es_superadmin ? (
                    <span style={{
                      background: '#2a1a3a', color: '#bc8cff',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      Superadmin
                    </span>
                  ) : (
                    <button
                      onClick={() => setUsuarioPermisos(usuario)}
                      style={{
                        background: 'transparent', border: '0.5px solid #30363d',
                        color: '#58a6ff', cursor: 'pointer', fontSize: '12px',
                        padding: '4px 10px', borderRadius: '4px',
                      }}
    >
                      Ver permisos
                    </button>
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