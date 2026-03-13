"use client"

import { useRouter } from 'next/navigation'
import { Moon, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

export default function Header() {
  const router = useRouter()

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header style={{
      height: '52px',
      background: '#161b22',
      borderBottom: '0.5px solid #30363d',
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
          background: '#2563eb', borderRadius: '6px',
        }} />
        <span style={{ color: '#e6edf3', fontSize: '14px', fontWeight: 500 }}>
          Sistema RRHH
        </span>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={cerrarSesion}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: 'none',
            cursor: 'pointer', padding: '6px 10px', borderRadius: '6px',
            color: '#8b949e', fontSize: '13px',
          }}
        >
          <LogOut size={15} />
          Salir
        </button>
      </div>

    </header>
  )
}