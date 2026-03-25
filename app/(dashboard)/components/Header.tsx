"use client"

import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown } from 'lucide-react'
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

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
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

      {/* Usuario y logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
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
  )
}