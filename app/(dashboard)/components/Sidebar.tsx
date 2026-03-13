"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  Umbrella,
  HardHat,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react'

const maestras = [
  { href: '/convenios',        label: 'Convenios' },
  { href: '/categorias',       label: 'Categorías' },
  { href: '/tipos-empleado',   label: 'Tipos de empleado' },
  { href: '/obras',            label: 'Obras' },
  { href: '/adicionales',      label: 'Adicionales' },
  { href: '/plantillas',       label: 'Plantillas jornada' },
  { href: '/epp-catalogo',     label: 'EPP catálogo' },
]

const gestion = [
  { href: '/legajos',    label: 'Legajos',     icon: Users },
  { href: '/novedades',  label: 'Novedades',   icon: Calendar },
  { href: '/vacaciones', label: 'Vacaciones',  icon: Umbrella },
  { href: '/epp',        label: 'EPP y Ropa',  icon: HardHat },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [maestrasAbiertas, setMaestrasAbiertas] = useState(false)

  const activo = (href: string) => pathname.startsWith(href)

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: '#161b22',
      borderRight: '0.5px solid #30363d',
      padding: '12px 0',
      flexShrink: 0,
    }}>

      {/* Dashboard */}
      <div style={{ padding: '0 12px', marginBottom: '4px' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: '6px',
            background: activo('/dashboard') ? '#21262d' : 'transparent',
          }}>
            <LayoutDashboard size={16} color={activo('/dashboard') ? '#58a6ff' : '#8b949e'} />
            <span style={{
              fontSize: '13px',
              color: activo('/dashboard') ? '#e6edf3' : '#8b949e',
              fontWeight: activo('/dashboard') ? 500 : 400,
            }}>Dashboard</span>
          </div>
        </Link>
      </div>

      {/* Empresas */}
      <div style={{ padding: '0 12px', marginBottom: '4px' }}>
        <Link href="/empresas" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: '6px',
            background: activo('/empresas') ? '#1a2a3a' : 'transparent',
          }}>
            <Building2 size={16} color={activo('/empresas') ? '#58a6ff' : '#8b949e'} />
            <span style={{
              fontSize: '13px',
              color: activo('/empresas') ? '#58a6ff' : '#8b949e',
              fontWeight: activo('/empresas') ? 500 : 400,
            }}>Empresas</span>
          </div>
        </Link>
      </div>

      {/* Maestras colapsable */}
      <div style={{ padding: '0 12px', marginBottom: '4px' }}>
        <div
          onClick={() => setMaestrasAbiertas(!maestrasAbiertas)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          <BookOpen size={16} color="#8b949e" />
          <span style={{ fontSize: '13px', color: '#8b949e', flex: 1 }}>Maestras</span>
          {maestrasAbiertas
            ? <ChevronDown size={14} color="#8b949e" />
            : <ChevronRight size={14} color="#8b949e" />
          }
        </div>

        {maestrasAbiertas && (
          <div style={{ paddingLeft: '16px', marginTop: '2px' }}>
            {maestras.map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '6px 10px', borderRadius: '6px', marginBottom: '1px',
                  background: activo(item.href) ? '#1a2a3a' : 'transparent',
                }}>
                  <span style={{
                    fontSize: '13px',
                    color: activo(item.href) ? '#58a6ff' : '#8b949e',
                    fontWeight: activo(item.href) ? 500 : 400,
                  }}>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Gestión */}
      <div style={{ padding: '8px 22px 4px', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Gestión
        </span>
      </div>
      <div style={{ padding: '0 12px' }}>
        {gestion.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 10px', borderRadius: '6px', marginBottom: '2px',
              background: activo(item.href) ? '#1a2a3a' : 'transparent',
            }}>
              <item.icon size={16} color={activo(item.href) ? '#58a6ff' : '#8b949e'} />
              <span style={{
                fontSize: '13px',
                color: activo(item.href) ? '#58a6ff' : '#8b949e',
                fontWeight: activo(item.href) ? 500 : 400,
              }}>{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

    </aside>
  )
}