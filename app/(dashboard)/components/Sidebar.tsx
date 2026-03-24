"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, Users, Calendar, Umbrella,
  HardHat, ChevronDown, ChevronRight, BookOpen, ShieldCheck,
  UserCog, BarChart2, BriefcaseMedical,
} from 'lucide-react'
import { useEmpresa } from '../context/EmpresaContext'

const administracion = [
  { href: '/empresas',  label: 'Empresas', icon: Building2 },
  { href: '/usuarios',  label: 'Usuarios',  icon: UserCog },
]

const maestras = [
  { href: '/convenios',       label: 'Convenios' },
  { href: '/tipos-empleado',  label: 'Tipos de empleado' },
  { href: '/categorias',      label: 'Categorías' },
  { href: '/obras',           label: 'Obras' },
  { href: '/adicionales',     label: 'Adicionales' },
  { href: '/plantillas-jornada', label: 'Plantillas jornada' },
  { href: '/tipos-ausencia',  label: 'Tipos de ausencia' },
  { href: '/feriados',        label: 'Feriados' },
  { href: '/epp-catalogo',    label: 'EPP catálogo' },
]

const gestion = [
  { href: '/legajos',    label: 'Legajos',     icon: Users },
  { href: '/novedades',  label: 'Novedades',   icon: Calendar },
  { href: '/novedades/consulta', label: 'Consulta novedades', icon: BarChart2 },
  { href: '/novedades/exportar', label: 'Exportar novedades', icon: BarChart2 },
  { href: '/ausencias',  label: 'Ausencias',   icon: BriefcaseMedical },
  { href: '/vacaciones', label: 'Vacaciones',  icon: Umbrella },
  { href: '/epp',        label: 'EPP y Ropa',  icon: HardHat },
]

const jefeObra = [
  { href: '/personal-obra',       label: 'Personal de Obra',    icon: Users },
  { href: '/novedades',           label: 'Novedades',            icon: Calendar },
  { href: '/novedades/consulta',  label: 'Consulta novedades',  icon: BarChart2 },
  { href: '/ausencias',           label: 'Ausencias',            icon: BriefcaseMedical },
  { href: '/vacaciones',          label: 'Vacaciones',           icon: Umbrella },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { rol, esSuperadmin } = useEmpresa()

  const adminAbierta = administracion.some(i => pathname.startsWith(i.href))
  const maestrasAbiertas = maestras.some(i => pathname.startsWith(i.href))

  const [adminOpen, setAdminOpen] = useState(adminAbierta)
  const [maestrasOpen, setMaestrasOpen] = useState(maestrasAbiertas)

  const activo = (href: string) => pathname.startsWith(href)

  const itemStyle = (href: string) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '7px 10px', borderRadius: '6px', marginBottom: '2px',
    background: activo(href) ? '#1a2a3a' : 'transparent',
    textDecoration: 'none', cursor: 'pointer',
  })

  const labelStyle = (href: string) => ({
    fontSize: '13px',
    color: activo(href) ? '#58a6ff' : '#8b949e',
    fontWeight: activo(href) ? 500 : 400,
  })

  const seccionHeader = (
    label: string,
    icon: React.ReactNode,
    open: boolean,
    toggle: () => void
  ) => (
    <div onClick={toggle} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '7px 10px', borderRadius: '6px',
      cursor: 'pointer', marginBottom: '2px',
    }}>
      {icon}
      <span style={{ fontSize: '13px', color: '#8b949e', flex: 1 }}>{label}</span>
      {open ? <ChevronDown size={14} color="#8b949e" /> : <ChevronRight size={14} color="#8b949e" />}
    </div>
  )

  // Filtrar ítems de gestión según rol
  const gestionFiltrada = rol === 'JEFE_OBRA'
    ? jefeObra
    : gestion.filter(() => esSuperadmin || rol === 'ADMIN' || rol === 'RRHH_ADMIN')

  // Mostrar administración solo a SUPERADMIN y ADMIN
  const mostrarAdmin = esSuperadmin || rol === 'ADMIN'

  // Mostrar maestras solo a SUPERADMIN, ADMIN y RRHH_ADMIN
  const mostrarMaestras = esSuperadmin || rol === 'ADMIN' || rol === 'RRHH_ADMIN'

  return (
    <aside style={{
      width: '220px', minHeight: '100vh',
      background: '#161b22', borderRight: '0.5px solid #30363d',
      padding: '12px 0', flexShrink: 0,
    }}>

      {/* Dashboard */}
      <div style={{ padding: '0 12px', marginBottom: '8px' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={itemStyle('/dashboard')}>
            <LayoutDashboard size={16} color={activo('/dashboard') ? '#58a6ff' : '#8b949e'} />
            <span style={labelStyle('/dashboard')}>Dashboard</span>
          </div>
        </Link>
      </div>

      {/* Administración — solo SUPERADMIN y ADMIN */}
      {mostrarAdmin && (
        <div style={{ padding: '0 12px', marginBottom: '4px' }}>
          {seccionHeader(
            'Administración',
            <ShieldCheck size={16} color="#8b949e" />,
            adminOpen,
            () => setAdminOpen(!adminOpen)
          )}
          {adminOpen && (
            <div style={{ paddingLeft: '16px' }}>
              {administracion.map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={itemStyle(item.href)}>
                    <item.icon size={15} color={activo(item.href) ? '#58a6ff' : '#8b949e'} />
                    <span style={labelStyle(item.href)}>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Maestras — solo SUPERADMIN, ADMIN y RRHH_ADMIN */}
      {mostrarMaestras && (
        <div style={{ padding: '0 12px', marginBottom: '4px' }}>
          {seccionHeader(
            'Maestras',
            <BookOpen size={16} color="#8b949e" />,
            maestrasOpen,
            () => setMaestrasOpen(!maestrasOpen)
          )}
          {maestrasOpen && (
            <div style={{ paddingLeft: '16px' }}>
              {maestras.map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={itemStyle(item.href)}>
                    <span style={labelStyle(item.href)}>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gestión */}
      <div style={{ padding: '8px 22px 4px' }}>
        <span style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
          Gestión
        </span>
      </div>
      <div style={{ padding: '0 12px' }}>
        {gestionFiltrada.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={itemStyle(item.href)}>
              <item.icon size={16} color={activo(item.href) ? '#58a6ff' : '#8b949e'} />
              <span style={labelStyle(item.href)}>{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

    </aside>
  )
}