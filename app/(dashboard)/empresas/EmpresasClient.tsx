"use client"

import { useState } from 'react'
import FormEmpresa from './FormEmpresa'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

type Empresa = {
  id: number
  codigo: string
  razon_social: string
  cuit: string
  direccion?: string
  nro?: string
  cp?: string
  localidad?: string
  provincia?: string
  cbu?: string
  activo: boolean
}

export default function EmpresasClient({ empresas }: { empresas: Empresa[] }) {
  const router = useRouter()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [empresaEditar, setEmpresaEditar] = useState<Empresa | null>(null)
  const [busqueda, setBusqueda] = useState('')
  type SortCol = 'codigo' | 'razon_social' | 'cuit' | 'localidad' | 'provincia'
  const [sortCol, setSortCol] = useState<SortCol>('razon_social')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  const sortIcon = (col: SortCol) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp size={12} style={{ marginLeft: '4px' }} /> : <ChevronDown size={12} style={{ marginLeft: '4px' }} />)
    : <ChevronsUpDown size={12} style={{ marginLeft: '4px', opacity: 0.4 }} />
  const b = busqueda.toLowerCase()
  const empresasFiltradas = empresas.filter(e =>
    e.codigo.toLowerCase().includes(b) ||
    e.razon_social.toLowerCase().includes(b) ||
    e.cuit.toLowerCase().includes(b) ||
    (e.localidad || '').toLowerCase().includes(b) ||
    (e.provincia || '').toLowerCase().includes(b)
  ).sort((a, z) => {
    const va = (a[sortCol] || '').toString().toLowerCase()
    const vz = (z[sortCol] || '').toString().toLowerCase()
    return sortDir === 'asc' ? va.localeCompare(vz) : vz.localeCompare(va)
  })

  function abrirEditar(empresa: Empresa) {
    setEmpresaEditar(empresa)
  }

function cerrarModal() {
    setMostrarForm(false)
    setEmpresaEditar(null)
  }

  async function eliminar(empresa: Empresa) {
    if (!confirm(`¿Seguro que querés eliminar "${empresa.razon_social}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', empresa.id)

    if (error) {
      alert('No se puede eliminar: ' + error.message)
    } else {
      router.refresh()
    }
  }

  return (

    <>
      {/* Modal nueva empresa */}
      {mostrarForm && (
        <FormEmpresa onCerrar={cerrarModal} />
      )}

      {/* Modal editar empresa */}
      {empresaEditar && (
        <FormEmpresa empresaEditar={empresaEditar} onCerrar={cerrarModal} />
      )}

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>
            Empresas
          </h1>
          <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>
            {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} registrada{empresas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          style={{
            background: 'var(--c-blue-btn)', color: 'white', border: 'none',
            borderRadius: '6px', padding: '7px 16px',
            fontSize: '13px', cursor: 'pointer',
          }}
        >
          + Nueva empresa
        </button>
      </div>

      {/* Buscar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-secondary)' }} />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código, razón social, CUIT..."
          style={{
            width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
          }}
        />
      </div>

      {/* Tabla */}
      {empresasFiltradas.length === 0 ? (
        <div style={{
          background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px',
        }}>
          {busqueda ? 'Sin resultados para la búsqueda.' : 'No hay empresas registradas todavía.'}
        </div>
      ) : (
        <div style={{
          background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                {([['Código','codigo'],['Razón Social','razon_social'],['CUIT','cuit'],['Localidad','localidad'],['Provincia','provincia']] as [string,SortCol][]).map(([label, col]) => (
                  <th key={col} onClick={() => toggleSort(col)} style={{
                    textAlign: 'left', padding: '10px 16px',
                    color: 'var(--c-text-secondary)', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>{label}{sortIcon(col)}</span>
                  </th>
                ))}
                <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Estado</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {empresasFiltradas.map((empresa, i) => (
                <tr key={empresa.id} style={{
                  borderBottom: i < empresasFiltradas.length - 1 ? '0.5px solid var(--c-elevated)' : 'none',
                }}>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{empresa.codigo}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)', fontWeight: 500 }}>{empresa.razon_social}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{empresa.cuit}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{empresa.localidad || '—'}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-secondary)' }}>{empresa.provincia || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: empresa.activo ? 'var(--c-green-bg)' : 'var(--c-red-bg)',
                      color: empresa.activo ? 'var(--c-green)' : 'var(--c-red)',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      {empresa.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <Link href={`/empresas/${empresa.id}`} style={{
                      background: 'transparent', border: '0.5px solid var(--c-border)',
                      color: 'var(--c-text-secondary)', cursor: 'pointer', fontSize: '12px',
                      padding: '4px 10px', borderRadius: '4px', textDecoration: 'none',
                      marginRight: '6px', display: 'inline-block',
                    }}>
                      Ver ficha
                    </Link>
                    <button
                      onClick={() => abrirEditar(empresa)}
                      style={{
                        background: 'transparent', border: 'none',
                        color: 'var(--c-text-secondary)', cursor: 'pointer', fontSize: '12px',
                        padding: '4px 8px', borderRadius: '4px',
                      }}
                    >
                      Editar
                    </button>
                    <button
                        onClick={() => eliminar(empresa)}
                        style={{
                        background: 'transparent', border: 'none',
                        color: 'var(--c-red)', cursor: 'pointer', fontSize: '12px',
                        padding: '4px 8px', borderRadius: '4px',
                        }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
