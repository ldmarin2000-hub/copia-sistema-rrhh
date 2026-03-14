"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

type Empresa = {
  id: number
  razon_social: string
}

type EmpresaContextType = {
  empresaActiva: Empresa | null
  setEmpresaActiva: (empresa: Empresa) => void
}

const EmpresaContext = createContext<EmpresaContextType>({
  empresaActiva: null,
  setEmpresaActiva: () => {},
})

export function EmpresaProvider({
  children,
  empresas,
  inicial,
}: {
  children: ReactNode
  empresas: Empresa[]
  inicial: Empresa | null
}) {
  const [empresaActiva, setEmpresaActiva] = useState<Empresa | null>(inicial)

  return (
    <EmpresaContext.Provider value={{ empresaActiva, setEmpresaActiva }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  return useContext(EmpresaContext)
}