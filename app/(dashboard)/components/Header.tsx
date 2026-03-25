"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown, X, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useEmpresa } from '../context/EmpresaContext'

type Empresa = {
  id: number
  razon_social: string
}

type Props = {
  nombreUsuario: string
  empresas: Empresa[]
}

export default function Header({ nombreUsuario, empresas }: Props) {
  const router = useRouter()
  const { empresaActiva, setEmpresaActiva } = useEmpresa()

  const [modalClave, setModalClave] = useState(false)
  const [claveActual, setClaveActual] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [claveConfirm, setClaveConfirm] = useState('')
  const [loadingClave, setLoadingClave] = useState(false)
  const [errorClave, setErrorClave] = useState('')
  const [okClave, setOkClave] = useState(false)

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function abrirModal() {
    setClaveActual('')
    setClaveNueva('')
    setClaveConfirm('')
    setErrorClave('')
    setOkClave(false)
    setModalClave(true)
  }

  async function cambiarClave() {
    if (!claveNueva || !claveConfirm) { setErrorClave('Completá todos los campos.'); return }
    if (claveNueva.length < 6) { setErrorClave('La nueva clave debe tener al menos 6 caracteres.'); return }
    if (claveNueva !== claveConfirm) { setErrorClave('Las claves nuevas no coinciden.'); return }

    setLoadingClave(true)
    setErrorClave('')
    const supabase = createClient()

    // Verificar clave actual reautenticando
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setErrorClave('No se pudo obtener el usuario.'); setLoadingClave(false); return }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: claveActual,
    })
    if (signInError) { setErrorClave('La clave actual es incorrecta.'); setLoadingClave(false); return }

    const { error } = await supabase.auth.updateUser({ password: claveNueva })
    if (error) { setErrorClave('Error al cambiar la clave. Intentá de nuevo.'); setLoadingClave(false); return }

    setOkClave(true)
    setLoadingClave(false)
  }

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  return (
    <>
      {modalClave && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--c-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            borderRadius: '10px', width: '100%', maxWidth: '380px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                Cambiar contraseña
              </h2>
              <button onClick={() => setModalClave(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            {okClave ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ color: 'var(--c-green)', fontSize: '14px', margin: '0 0 16px' }}>
                  ✓ Contraseña actualizada correctamente.
                </p>
                <button onClick={() => setModalClave(false)} style={{
                  background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 20px', fontSize: '13px', cursor: 'pointer',
                }}>Cerrar</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Contraseña actual *
                    </label>
                    <input
                      type="password"
                      value={claveActual}
                      onChange={e => setClaveActual(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Nueva contraseña *
                    </label>
                    <input
                      type="password"
                      value={claveNueva}
                      onChange={e => setClaveNueva(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Confirmar nueva contraseña *
                    </label>
                    <input
                      type="password"
                      value={claveConfirm}
                      onChange={e => setClaveConfirm(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && cambiarClave()}
                      style={inputStyle}
                    />
                  </div>
                  {errorClave && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{errorClave}</p>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                  <button onClick={() => setModalClave(false)} style={{
                    background: 'transparent', border: '0.5px solid var(--c-border)',
                    color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px',
                    fontSize: '13px', cursor: 'pointer',
                  }}>Cancelar</button>
                  <button onClick={cambiarClave} disabled={loadingClave} style={{
                    background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                    borderRadius: '6px', padding: '7px 16px',
                    fontSize: '13px', cursor: 'pointer', opacity: loadingClave ? 0.6 : 1,
                  }}>
                    {loadingClave ? 'Guardando...' : 'Cambiar clave'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <header style={{
        height: '52px',
        background: 'var(--c-surface)',
        borderBottom: '0.5px solid var(--c-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '24px', height: '24px',
            background: 'var(--c-blue-btn)', borderRadius: '6px',
          }} />
          <span style={{ color: 'var(--c-text-primary)', fontSize: '14px', fontWeight: 500 }}>
            Sistema RRHH
          </span>
        </div>

        {/* Selector empresa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>Empresa:</span>
          <div style={{ position: 'relative' }}>
            <select
              value={empresaActiva?.id || ''}
              onChange={(e) => {
                const empresa = empresas.find(emp => emp.id === parseInt(e.target.value))
                if (empresa) setEmpresaActiva(empresa)
              }}
              style={{
                background: 'var(--c-elevated)',
                border: '0.5px solid var(--c-border)',
                borderRadius: '6px',
                color: 'var(--c-text-primary)',
                fontSize: '13px',
                padding: '5px 28px 5px 10px',
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.razon_social}</option>
              ))}
            </select>
            <ChevronDown
              size={13}
              color="var(--c-text-secondary)"
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>
        </div>

        {/* Usuario y acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px',
              background: 'var(--c-blue-btn)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '11px', color: 'white', fontWeight: 500 }}>
                {nombreUsuario.charAt(0).toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--c-text-secondary)' }}>{nombreUsuario}</span>
          </div>

          <button
            onClick={abrirModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: '6px 10px', borderRadius: '6px',
              color: 'var(--c-text-secondary)', fontSize: '13px',
            }}
          >
            <KeyRound size={15} />
            Clave
          </button>

          <button
            onClick={cerrarSesion}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: '6px 10px', borderRadius: '6px',
              color: 'var(--c-text-secondary)', fontSize: '13px',
            }}
          >
            <LogOut size={15} />
            Salir
          </button>
        </div>

      </header>
    </>
  )
}
