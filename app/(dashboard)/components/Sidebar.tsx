"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, Users, Calendar, Umbrella,
  HardHat, ChevronDown, ChevronRight, BookOpen, ShieldCheck,
  UserCog, BarChart2, BriefcaseMedical, Download,
} from 'lucide-react'
import { useEmpresa } from '../context/EmpresaContext'
import ThemeToggle from './ThemeToggle'

const administracion = [
  { href: '/empresas',   label: 'Empresas',  icon: Building2 },
  { href: '/usuarios',   label: 'Usuarios',  icon: UserCog },
  { href: '/auditoria',  label: 'Auditoría', icon: ShieldCheck },
]

const maestras = [
  { href: '/convenios',          label: 'Convenios' },
  { href: '/tipos-empleado',     label: 'Tipos de empleado' },
  { href: '/categorias',         label: 'Categorías' },
  { href: '/obras',              label: 'Obras' },
  { href: '/adicionales',        label: 'Adicionales' },
  { href: '/plantillas-jornada', label: 'Plantillas jornada' },
  { href: '/tipos-ausencia',     label: 'Tipos de ausencia' },
  { href: '/feriados',           label: 'Feriados' },
  { href: '/epp-catalogo',       label: 'EPP catálogo' },
  { href: '/metodos-vacaciones',  label: 'Métodos de vacaciones' },
  { href: '/conceptos-bejerman', label: 'Conceptos Bejerman' },
  { href: '/exportacion-config', label: 'Config. exportación' },
]

const novedadesSubmenu = [
  { href: '/novedades/consulta', label: 'Consulta',  icon: BarChart2 },
  { href: '/novedades/exportar', label: 'Exportar',  icon: Download },
]



const gestion = [
  { href: '/legajos',    label: 'Legajos',    icon: Users },
  { href: '/ausencias',  label: 'Ausencias',  icon: BriefcaseMedical },
  { href: '/vacaciones', label: 'Vacaciones', icon: Umbrella },
  { href: '/epp',        label: 'EPP y Ropa', icon: HardHat },
]

const novedadesSubmenuJefe = [
  { href: '/novedades/consulta', label: 'Consulta',  icon: BarChart2 },
]


const jefeObra = [
  { href: '/personal-obra', label: 'Personal de Obra', icon: Users },
  { href: '/ausencias',     label: 'Ausencias',         icon: BriefcaseMedical },
  { href: '/vacaciones',    label: 'Vacaciones',         icon: Umbrella },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { rol, esSuperadmin } = useEmpresa()

  const enNovedades = pathname.startsWith('/novedades')
  const adminAbierta = administracion.some(i => pathname.startsWith(i.href))
  const maestrasAbiertas = maestras.some(i => pathname.startsWith(i.href))

  const [adminOpen, setAdminOpen] = useState(adminAbierta)
  const [maestrasOpen, setMaestrasOpen] = useState(maestrasAbiertas)
  const [novedadesOpen, setNovedadesOpen] = useState(enNovedades)

  const activo = (href: string) => pathname === href

  const itemStyle = (href: string) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '7px 10px', borderRadius: '6px', marginBottom: '2px',
    background: activo(href) ? 'var(--c-blue-bg)' : 'transparent',
    textDecoration: 'none', cursor: 'pointer',
  })

  const labelStyle = (href: string) => ({
    fontSize: '13px',
    color: activo(href) ? 'var(--c-blue)' : 'var(--c-text-secondary)',
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
      <span style={{ fontSize: '13px', color: 'var(--c-text-secondary)', flex: 1 }}>{label}</span>
      {open ? <ChevronDown size={14} color="var(--c-text-secondary)" /> : <ChevronRight size={14} color="var(--c-text-secondary)" />}
    </div>
  )

  const esJefe = rol === 'JEFE_OBRA'
  const gestionFiltrada = esJefe
    ? jefeObra
    : gestion.filter(() => esSuperadmin || rol === 'ADMIN' || rol === 'RRHH_ADMIN')

  const submenuNovedades = esJefe ? novedadesSubmenuJefe : novedadesSubmenu

  const mostrarAdmin = esSuperadmin || rol === 'ADMIN'
  const mostrarMaestras = esSuperadmin || rol === 'ADMIN' || rol === 'RRHH_ADMIN'

  return (
    <aside style={{
      width: '220px', minHeight: '100vh',
      background: 'var(--c-surface)', borderRight: '0.5px solid var(--c-border)',
      padding: '12px 0', flexShrink: 0,
    }}>

      {/* Dashboard */}
      <div style={{ padding: '0 12px', marginBottom: '8px' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={itemStyle('/dashboard')}>
            <LayoutDashboard size={16} color={activo('/dashboard') ? 'var(--c-blue)' : 'var(--c-text-secondary)'} />
            <span style={labelStyle('/dashboard')}>Dashboard</span>
          </div>
        </Link>
      </div>

      {/* Administración */}
      {mostrarAdmin && (
        <div style={{ padding: '0 12px', marginBottom: '4px' }}>
          {seccionHeader(
            'Administración',
            <ShieldCheck size={16} color="var(--c-text-secondary)" />,
            adminOpen,
            () => setAdminOpen(!adminOpen)
          )}
          {adminOpen && (
            <div style={{ paddingLeft: '16px' }}>
              {administracion.map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={itemStyle(item.href)}>
                    <item.icon size={15} color={activo(item.href) ? 'var(--c-blue)' : 'var(--c-text-secondary)'} />
                    <span style={labelStyle(item.href)}>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Maestras */}
      {mostrarMaestras && (
        <div style={{ padding: '0 12px', marginBottom: '4px' }}>
          {seccionHeader(
            'Maestras',
            <BookOpen size={16} color="var(--c-text-secondary)" />,
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
        <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
          Gestión
        </span>
      </div>
      <div style={{ padding: '0 12px' }}>

        {/* Primer ítem (Legajos / Personal de Obra) */}
        {gestionFiltrada.slice(0, 1).map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={itemStyle(item.href)}>
              <item.icon size={16} color={activo(item.href) ? 'var(--c-blue)' : 'var(--c-text-secondary)'} />
              <span style={labelStyle(item.href)}>{item.label}</span>
            </div>
          </Link>
        ))}

        {/* Novedades con submenu */}
        <div style={{ marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', borderRadius: '6px', background: activo('/novedades') ? 'var(--c-blue-bg)' : 'transparent' }}>
            <Link href="/novedades" style={{ textDecoration: 'none', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px' }}>
                <Calendar size={16} color={activo('/novedades') ? 'var(--c-blue)' : 'var(--c-text-secondary)'} />
                <span style={labelStyle('/novedades')}>Novedades</span>
              </div>
            </Link>
            <div onClick={() => setNovedadesOpen(!novedadesOpen)} style={{ padding: '7px 8px', cursor: 'pointer' }}>
              {novedadesOpen
                ? <ChevronDown size={14} color="var(--c-text-secondary)" />
                : <ChevronRight size={14} color="var(--c-text-secondary)" />}
            </div>
          </div>
          {novedadesOpen && (
            <div style={{ paddingLeft: '16px', marginTop: '2px' }}>
              {submenuNovedades.map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={itemStyle(item.href)}>
                    <item.icon size={14} color={activo(item.href) ? 'var(--c-blue)' : 'var(--c-text-secondary)'} />
                    <span style={labelStyle(item.href)}>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Resto de gestión */}
        {gestionFiltrada.slice(1).map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={itemStyle(item.href)}>
              <item.icon size={16} color={activo(item.href) ? 'var(--c-blue)' : 'var(--c-text-secondary)'} />
              <span style={labelStyle(item.href)}>{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Toggle tema */}
      <div style={{ padding: '12px', marginTop: '8px', borderTop: '0.5px solid var(--c-border)' }}>
        <ThemeToggle />
      </div>

    </aside>
  )
}
