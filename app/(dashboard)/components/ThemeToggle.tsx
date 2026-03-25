"use client"

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [tema, setTema] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem('tema') as 'dark' | 'light') || 'dark'
    setTema(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  function toggle() {
    const nuevo = tema === 'dark' ? 'light' : 'dark'
    setTema(nuevo)
    document.documentElement.setAttribute('data-theme', nuevo)
    localStorage.setItem('tema', nuevo)
  }

  return (
    <button
      onClick={toggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--c-text-secondary)', fontSize: '13px', padding: '6px 8px',
        borderRadius: '6px',
      }}
    >
      {tema === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      {tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    </button>
  )
}
