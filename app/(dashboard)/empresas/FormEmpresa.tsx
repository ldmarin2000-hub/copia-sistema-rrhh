"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function FormEmpresa() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [cuit, setCuit] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [provincia, setProvincia] = useState('')
  const [direccion, setDireccion] = useState('')

  async function guardar() {
    setLoading(true)
    setMensaje('')

    const { error } = await supabase
      .from('empresas')
      .insert({ 
        codigo, 
        razon_social: razonSocial, 
        cuit,
        direccion,
        localidad,
        provincia
      })

    if (error) {
      setMensaje('Error: ' + error.message)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="mb-8 p-4 border rounded-lg max-w-md">
      <h2 className="text-lg font-semibold mb-4">Nueva Empresa</h2>
      
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-medium">Código *</label>
          <input
            className="w-full border rounded p-2 mt-1"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej: CONST01"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Razón Social *</label>
          <input
            className="w-full border rounded p-2 mt-1"
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            placeholder="Ej: Constructora SA"
          />
        </div>

        <div>
          <label className="text-sm font-medium">CUIT *</label>
          <input
            className="w-full border rounded p-2 mt-1"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="Ej: 30-12345678-9"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Direccion</label>
          <input
            className="w-full border rounded p-2 mt-1"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="San Martin 3400"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Localidad</label>
          <input
            className="w-full border rounded p-2 mt-1"
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            placeholder="Ej: Santa Fe"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Provincia</label>
          <input
            className="w-full border rounded p-2 mt-1"
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            placeholder="Ej: Santa Fe"
          />

        </div>

        {mensaje && (
          <p className="text-red-500">{mensaje}</p>
        )}

        <button
          onClick={guardar}
          disabled={loading || !codigo || !razonSocial || !cuit}
          className="bg-blue-600 text-white rounded p-2 font-medium 
                     hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Guardar Empresa'}
        </button>
      </div>
    </div>
  )
}