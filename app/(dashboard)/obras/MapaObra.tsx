"use client"

import { useEffect, useRef } from 'react'

type Props = {
  latitud: number | null
  longitud: number | null
  onChange: (lat: number, lng: number) => void
}

export default function MapaObra({ latitud, longitud, onChange }: Props) {
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Inicializar mapa
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapRef.current) return

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const lat = latitud || -38.4161
      const lng = longitud || -63.6167

      const map = L.map(containerRef.current!).setView([lat, lng], latitud ? 15 : 4)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      if (latitud && longitud) {
        markerRef.current = L.marker([latitud, longitud], { draggable: true }).addTo(map)
        markerRef.current.on('dragend', (e: any) => {
          const pos = e.target.getLatLng()
          onChangeRef.current(pos.lat, pos.lng)
        })
      }

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
          markerRef.current.on('dragend', (ev: any) => {
            const pos = ev.target.getLatLng()
            onChangeRef.current(pos.lat, pos.lng)
          })
        }
        onChangeRef.current(lat, lng)
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [])

  // Actualizar mapa cuando cambian las coordenadas
  useEffect(() => {
    if (!mapRef.current || !latitud || !longitud) return

    import('leaflet').then((L) => {
      mapRef.current.setView([latitud, longitud], 15)

      if (markerRef.current) {
        markerRef.current.setLatLng([latitud, longitud])
      } else {
        markerRef.current = L.marker([latitud, longitud], { draggable: true }).addTo(mapRef.current)
        markerRef.current.on('dragend', (e: any) => {
          const pos = e.target.getLatLng()
          onChangeRef.current(pos.lat, pos.lng)
        })
      }
    })
  }, [latitud, longitud])

  return (
    <div
      ref={containerRef}
      style={{ height: '300px', borderRadius: '6px', border: '0.5px solid var(--c-border)' }}
    />
  )
}