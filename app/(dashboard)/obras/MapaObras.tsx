"use client"

import { useEffect, useRef } from 'react'

type Obra = {
  id: number
  codigo: string
  nombre: string
  localidad?: string
  estado: string
  latitud?: number
  longitud?: number
}

type Props = {
  obras: Obra[]
}

const COLORES: Record<string, string> = {
  Activa:     '#22c55e',
  Pausada:    '#f97316',
  Finalizada: '#6b7280',
  Cancelada:  '#ef4444',
}

export default function MapaObras({ obras }: Props) {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapRef.current) return

    const obrasConCoordenadas = obras.filter(o => o.latitud && o.longitud)

    import('leaflet').then((L) => {
      const map = L.map(containerRef.current!).setView([-38.4161, -63.6167], 4)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      const bounds: [number, number][] = []

      obrasConCoordenadas.forEach((obra) => {
        const lat = obra.latitud!
        const lng = obra.longitud!
        const color = COLORES[obra.estado] || COLORES.Activa

        const icono = L.divIcon({
          className: '',
          html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          popupAnchor: [0, -10],
        })

        const popup = `
          <div style="font-family:system-ui;font-size:13px;min-width:160px">
            <div style="font-weight:600;margin-bottom:4px">${obra.nombre}</div>
            <div style="color:#6b7280;margin-bottom:2px">${obra.codigo}</div>
            ${obra.localidad ? `<div style="color:#6b7280;margin-bottom:6px">${obra.localidad}</div>` : ''}
            <div style="margin-bottom:8px">
              <span style="
                background:${color}22;color:${color};
                font-size:11px;padding:1px 7px;border-radius:4px;
              ">${obra.estado}</span>
            </div>
            <a href="/obras/${obra.id}" style="
              color:#3b82f6;font-size:12px;text-decoration:none;
            ">Ver ficha →</a>
          </div>
        `

        L.marker([lat, lng], { icon: icono })
          .addTo(map)
          .bindPopup(popup)

        bounds.push([lat, lng])
      })

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
      }

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  const sinCoordenadas = obras.filter(o => !o.latitud || !o.longitud)

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height: '500px', borderRadius: '8px', border: '0.5px solid var(--c-border)' }}
      />
      {sinCoordenadas.length > 0 && (
        <div style={{
          marginTop: '12px', padding: '10px 14px',
          background: 'var(--c-elevated)', borderRadius: '6px',
          fontSize: '12px', color: 'var(--c-text-secondary)',
        }}>
          {sinCoordenadas.length} obra{sinCoordenadas.length !== 1 ? 's' : ''} sin coordenadas:{' '}
          {sinCoordenadas.map(o => o.nombre).join(', ')}
        </div>
      )}
    </div>
  )
}
