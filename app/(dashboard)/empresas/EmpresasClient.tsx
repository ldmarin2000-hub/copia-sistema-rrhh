"use client"

import { useState } from 'react'
import FormEmpresa from './FormEmpresa'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

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
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#e6edf3', margin: '0 0 2px' }}>
            Empresas
          </h1>
          <span style={{ fontSize: '12px', color: '#8b949e' }}>
            {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} registrada{empresas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          style={{
            background: '#2563eb', color: 'white', border: 'none',
            borderRadius: '6px', padding: '7px 16px',
            fontSize: '13px', cursor: 'pointer',
          }}
        >
          + Nueva empresa
        </button>
      </div>

      {/* Tabla */}
      {empresas.length === 0 ? (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', padding: '48px',
          textAlign: 'center', color: '#8b949e', fontSize: '14px',
        }}>
          No hay empresas registradas todavía.
        </div>
      ) : (
        <div style={{
          background: '#161b22', border: '0.5px solid #30363d',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #30363d' }}>
                {['Código', 'Razón Social', 'CUIT', 'Localidad', 'Provincia', 'Estado'].map((col) => (
                  <th key={col} style={{
                    textAlign: 'left', padding: '10px 16px',
                    color: '#8b949e', fontWeight: 500,
                  }}>{col}</th>
                ))}
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa, i) => (
                <tr key={empresa.id} style={{
                  borderBottom: i < empresas.length - 1 ? '0.5px solid #21262d' : 'none',
                }}>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{empresa.codigo}</td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3', fontWeight: 500 }}>{empresa.razon_social}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{empresa.cuit}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{empresa.localidad || '—'}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{empresa.provincia || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      background: empresa.activo ? '#1a3a2a' : '#3a1a1a',
                      color: empresa.activo ? '#3fb950' : '#f85149',
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      {empresa.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => abrirEditar(empresa)}
                      style={{
                        background: 'transparent', border: 'none',
                        color: '#8b949e', cursor: 'pointer', fontSize: '12px',
                        padding: '4px 8px', borderRadius: '4px',
                      }}
                    >
                      Editar
                    </button>
                    <button
                        onClick={() => eliminar(empresa)}
                        style={{
                        background: 'transparent', border: 'none',
                        color: '#f85149', cursor: 'pointer', fontSize: '12px',
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
