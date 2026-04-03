"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { traducirError } from '@/lib/errores'

type Concepto = {
  id: number
  codigo: string
  descripcion: string
  activo: boolean
}

const selStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--c-base)',
  border: '0.5px solid var(--c-border)',
  borderRadius: '6px',
  color: 'var(--c-text-primary)',
  fontSize: '13px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: 'var(--c-base)',
  border: '0.5px solid var(--c-border)',
  borderRadius: '6px',
  color: 'var(--c-text-primary)',
  fontSize: '13px',
}

export default function ConceptosBejermanClient() {
  const [conceptos, setConceptos] = useState<Concepto[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Concepto | null>(null)
  const [formCodigo, setFormCodigo] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formActivo, setFormActivo] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    const supabase = createClient()
    const { data } = await supabase
      .from('conceptos_bejerman')
      .select('id, codigo, descripcion, activo')
      .order('codigo')
    setConceptos(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  function abrirNuevo() {
    setEditando(null)
    setFormCodigo('')
    setFormDescripcion('')
    setFormActivo(true)
    setError('')
    setModalOpen(true)
  }

  function abrirEditar(c: Concepto) {
    setEditando(c)
    setFormCodigo(c.codigo)
    setFormDescripcion(c.descripcion)
    setFormActivo(c.activo)
    setError('')
    setModalOpen(true)
  }

  async function guardar() {
    if (!formCodigo.trim() || !formDescripcion.trim()) {
      setError('Código y descripción son obligatorios.')
      return
    }
    setGuardando(true)
    setError('')
    const supabase = createClient()

    const payload = {
      codigo: formCodigo.trim(),
      descripcion: formDescripcion.trim(),
      activo: formActivo,
    }

    let err: string | null = null
    if (editando) {
      const { error: e } = await supabase
        .from('conceptos_bejerman')
        .update(payload)
        .eq('id', editando.id)
      if (e) err = traducirError(e.message)
    } else {
      const { error: e } = await supabase
        .from('conceptos_bejerman')
        .insert(payload)
      if (e) err = traducirError(e.message)
    }

    setGuardando(false)
    if (err) { setError(err); return }
    setModalOpen(false)
    cargar()
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 14px',
    textAlign: 'left',
    fontSize: '11px',
    color: 'var(--c-text-muted)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--c-text-primary)',
    borderTop: '0.5px solid var(--c-border)',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--c-text-primary)', margin: '0 0 2px' }}>Conceptos Bejerman</h1>
          <span style={{ fontSize: '12px', color: 'var(--c-text-secondary)' }}>Catálogo global de códigos del sistema de liquidación</span>
        </div>
        <button
          onClick={abrirNuevo}
          style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer' }}
        >
          + Nuevo concepto
        </button>
      </div>

      <div style={{ background: 'var(--c-surface)', border: '0.5px solid var(--c-border)', borderRadius: '8px', overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '14px' }}>Cargando...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--c-base)' }}>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Estado</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conceptos.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--c-text-secondary)', padding: '48px' }}>
                    No hay conceptos cargados.
                  </td>
                </tr>
              ) : conceptos.map(c => (
                <tr key={c.id} style={{ opacity: c.activo ? 1 : 0.5 }}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{c.codigo}</td>
                  <td style={tdStyle}>{c.descripcion}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: c.activo ? 'var(--c-green-bg)' : 'var(--c-base)',
                      color: c.activo ? 'var(--c-green)' : 'var(--c-text-muted)',
                      border: `0.5px solid ${c.activo ? 'var(--c-green)' : 'var(--c-border)'}40`,
                    }}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button
                      onClick={() => abrirEditar(c)}
                      style={{ background: 'none', border: 'none', color: 'var(--c-blue)', fontSize: '12px', cursor: 'pointer', padding: '2px 8px' }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--c-surface)', borderRadius: '10px', padding: '24px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--c-text-primary)', margin: '0 0 20px' }}>
              {editando ? 'Editar concepto' : 'Nuevo concepto'}
            </h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Código</label>
              <input
                type="text"
                value={formCodigo}
                onChange={e => setFormCodigo(e.target.value)}
                placeholder="ej: 1010"
                maxLength={10}
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Descripción</label>
              <input
                type="text"
                value={formDescripcion}
                onChange={e => setFormDescripcion(e.target.value)}
                placeholder="ej: Horas Normales"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px' }}>Estado</label>
              <select value={formActivo ? 'activo' : 'inactivo'} onChange={e => setFormActivo(e.target.value === 'activo')} style={selStyle}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            {error && <p style={{ fontSize: '12px', color: 'var(--c-red)', marginBottom: '12px' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: '0.5px solid var(--c-border)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', color: 'var(--c-text-secondary)', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{ background: 'var(--c-blue-btn)', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', opacity: guardando ? 0.6 : 1 }}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
