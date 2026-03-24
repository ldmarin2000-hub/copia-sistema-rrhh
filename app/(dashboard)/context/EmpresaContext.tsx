"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

type Empresa = {
  id: number
  razon_social: string
  permite_editar_epp?: boolean
}

type RolCodigo = 'SUPERADMIN' | 'ADMIN' | 'RRHH_ADMIN' | 'JEFE_OBRA'

type EmpresaContextType = {
  empresaActiva: Empresa | null
  setEmpresaActiva: (empresa: Empresa) => void
  rol: RolCodigo | null
  esSuperadmin: boolean
  obrasJefe: number[]
}

const EmpresaContext = createContext<EmpresaContextType>({
  empresaActiva: null,
  setEmpresaActiva: () => {},
  rol: null,
  esSuperadmin: false,
  obrasJefe: [],
})

export function EmpresaProvider({
  children,
  empresas,
  inicial,
  rol,
  esSuperadmin,
  obrasJefe,
}: {
  children: ReactNode
  empresas: Empresa[]
  inicial: Empresa | null
  rol: RolCodigo | null
  esSuperadmin: boolean
  obrasJefe: number[]
}) {
  const [empresaActiva, setEmpresaActiva] = useState<Empresa | null>(inicial)

  return (
    <EmpresaContext.Provider value={{ empresaActiva, setEmpresaActiva, rol, esSuperadmin, obrasJefe }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  return useContext(EmpresaContext)
}
