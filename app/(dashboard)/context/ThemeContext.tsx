"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Tema = 'dark' | 'light'
type ThemeContextType = { tema: Tema; toggleTema: () => void }

const ThemeContext = createContext<ThemeContextType>({ tema: 'dark', toggleTema: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('tema') as Tema | null
    const inicial = saved || 'dark'
    setTema(inicial)
    document.documentElement.setAttribute('data-theme', inicial)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    localStorage.setItem('tema', tema)
  }, [tema])

  function toggleTema() {
    setTema(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ tema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTema() {
  return useContext(ThemeContext)
}
