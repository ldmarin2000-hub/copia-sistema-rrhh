"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { X, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { formatFecha } from '@/lib/fecha'
import { traducirError } from '@/lib/errores'

type Movimiento = {
  id: number
  fecha: string
  tipo: 'acreditacion' | 'compensacion'
  horas: number
  concepto: string
}

type Props = {
  idLegajo: number
  idEmpresa: number
  movimientos: Movimiento[]
}

export default function BancoHorasTab({ idLegajo, idEmpresa, movimientos: movimientosIniciales }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [movimientos, setMovimientos] = useState<Movimiento[]>(movimientosIniciales)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [tipo, setTipo] = useState<'acreditacion' | 'compensacion'>('acreditacion')
  const [fecha, setFecha] = useState('')
  const [horas, setHoras] = useState('')
  const [concepto, setConcepto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const saldo = movimientos.reduce((acc, m) => {
    return m.tipo === 'acreditacion' ? acc + m.horas : acc - m.horas
  }, 0)

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    background: 'var(--c-base)', border: '0.5px solid var(--c-border)',
    color: 'var(--c-text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '4px'
  }

  function abrirForm() {
    setTipo('acreditacion')
    setFecha('')
    setHoras('')
    setConcepto('')
    setError('')
    setMostrarForm(true)
  }

  function cerrar() {
    setMostrarForm(false)
  }

  async function guardar() {
    if (!fecha || !horas || !concepto) { setError('Completá todos los campos'); return }
    const hsNum = parseFloat(horas)
    if (isNaN(hsNum) || hsNum <= 0) { setError('Las horas deben ser un número positivo'); return }

    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('banco_horas_movimientos')
      .insert({ id_legajo: idLegajo, id_empresa: idEmpresa, fecha, tipo, horas: hsNum, concepto })
      .select()
      .single()

    if (err) { setError(traducirError(err.message)); setLoading(false); return }

    setMovimientos(prev => [data as Movimiento, ...prev])
    cerrar()
    setLoading(false)
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este movimiento?')) return
    const { error: err } = await supabase.from('banco_horas_movimientos').delete().eq('id', id)
    if (err) { alert(traducirError(err.message)); return }
    setMovimientos(prev => prev.filter(m => m.id !== id))
  }

  const formatHoras = (h: number) => {
    const signo = h >= 0 ? '+' : ''
    return `${signo}${h.toFixed(1)}h`
  }

  return (
    <>
      {/* Modal */}
      {mostrarForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--c-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '20px',
        }}>
          <div style={{
            background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
            borderRadius: '10px', width: '100%', maxWidth: '440px', padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>
                Nuevo movimiento
              </h2>
              <button onClick={cerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Tipo */}
              <div>
                <label style={labelStyle}>Tipo</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['acreditacion', 'compensacion'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                        border: tipo === t ? '1.5px solid var(--c-blue)' : '0.5px solid var(--c-border)',
                        background: tipo === t ? 'var(--c-blue-bg)' : 'var(--c-base)',
                        color: tipo === t ? 'var(--c-blue)' : 'var(--c-text-secondary)',
                        fontWeight: tipo === t ? 500 : 400,
                      }}
                    >
                      {t === 'acreditacion' ? '+ Acreditación' : '− Compensación'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Horas *</label>
                  <input
                    type="number" min="0.5" step="0.5"
                    value={horas} onChange={e => setHoras(e.target.value)}
                    placeholder="Ej: 2.5"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Concepto *</label>
                <input
                  value={concepto} onChange={e => setConcepto(e.target.value)}
                  placeholder="Ej: Horas extra jornada 28/03"
                  style={inputStyle}
                />
              </div>

              {error && <p style={{ color: 'var(--c-red)', fontSize: '12px', margin: 0 }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={cerrar} style={{
                background: 'transparent', border: '0.5px solid var(--c-border)',
                color: 'var(--c-text-secondary)', borderRadius: '6px', padding: '7px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}>Cancelar</button>
              <button
                onClick={guardar}
                disabled={loading}
                style={{
                  background: 'var(--c-blue-btn)', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '7px 16px',
                  fontSize: '13px', cursor: 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saldo */}
      <div style={{
        background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
        borderRadius: '8px', padding: '20px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Saldo actual</p>
          <span style={{
            fontSize: '28px', fontWeight: 600,
            color: saldo >= 0 ? 'var(--c-green)' : 'var(--c-red)',
          }}>
            {saldo >= 0 ? '+' : ''}{saldo.toFixed(1)}h
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px', textAlign: 'right' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 4px' }}>Acreditadas</p>
            <span style={{ fontSize: '15px', color: 'var(--c-green)', fontWeight: 500 }}>
              +{movimientos.filter(m => m.tipo === 'acreditacion').reduce((a, m) => a + m.horas, 0).toFixed(1)}h
            </span>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', margin: '0 0 4px' }}>Compensadas</p>
            <span style={{ fontSize: '15px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>
              −{movimientos.filter(m => m.tipo === 'compensacion').reduce((a, m) => a + m.horas, 0).toFixed(1)}h
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div style={{
        background: 'var(--c-surface)', border: '0.5px solid var(--c-border)',
        borderRadius: '8px', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)', margin: 0 }}>Movimientos</p>
          <button onClick={abrirForm} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'var(--c-blue-btn)', color: 'white', border: 'none',
            borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
          }}>
            <Plus size={13} />
            Agregar
          </button>
        </div>

        {movimientos.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--c-text-secondary)', fontSize: '13px' }}>
            Sin movimientos registrados.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--c-border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 20px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Concepto</th>
                <th style={{ textAlign: 'right', padding: '10px 20px', color: 'var(--c-text-secondary)', fontWeight: 500 }}>Horas</th>
                <th style={{ padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < movimientos.length - 1 ? '0.5px solid var(--c-elevated)' : 'none' }}>
                  <td style={{ padding: '10px 20px', color: 'var(--c-text-secondary)' }}>
                    {formatFecha(m.fecha)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px',
                      color: m.tipo === 'acreditacion' ? 'var(--c-green)' : 'var(--c-text-secondary)',
                    }}>
                      {m.tipo === 'acreditacion'
                        ? <TrendingUp size={13} />
                        : <TrendingDown size={13} />}
                      {m.tipo === 'acreditacion' ? 'Acreditación' : 'Compensación'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--c-text-primary)' }}>{m.concepto}</td>
                  <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 500,
                    color: m.tipo === 'acreditacion' ? 'var(--c-green)' : 'var(--c-text-secondary)',
                  }}>
                    {m.tipo === 'acreditacion' ? '+' : '−'}{m.horas.toFixed(1)}h
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => eliminar(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-red)', padding: '2px 6px' }}
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
