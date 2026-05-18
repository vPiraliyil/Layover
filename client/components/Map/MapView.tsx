'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import type { ItineraryStop } from '@/lib/types'

interface MapViewProps {
  stops: ItineraryStop[]
  routeGeoJson: GeoJSON.LineString | null
  isRealRoute: boolean
}

const EMPTY_LINE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] },
}

const EMPTY_FC: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: [],
}

function stopsToFeatureCollection(
  stops: ItineraryStop[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: stops.map((s, idx) => ({
      type: 'Feature',
      id: idx,
      properties: {
        stop_number: s.stop_number,
        name: s.name,
        category: s.category,
        duration_minutes: s.duration_minutes,
      },
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
    })),
  }
}

export default function MapView({ stops, routeGeoJson, isRealRoute }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const hoveredIdRef = useRef<number | null>(null)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    let map: mapboxgl.Map
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 20],
        zoom: 1.5,
        scrollZoom: false,
      })
    } catch {
      setMapError(true)
      return
    }

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('error', () => setMapError(true))

    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: EMPTY_LINE })
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#0066FF', 'line-width': 4 },
      })

      map.addSource('stops', { type: 'geojson', data: EMPTY_FC, generateId: true })
      map.addLayer({
        id: 'stops-circle',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            17,
            14,
          ],
          'circle-color': '#ffffff',
          'circle-stroke-color': '#0066FF',
          'circle-stroke-width': 2,
          'circle-radius-transition': { duration: 150 },
        },
      })
      map.addLayer({
        id: 'stops-label',
        type: 'symbol',
        source: 'stops',
        layout: {
          'text-field': ['to-string', ['get', 'stop_number']],
          'text-size': 12,
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#0A1628' },
      })

      map.on('click', 'stops-circle', (e) => {
        const feature = e.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') return
        const { name, category, duration_minutes } = feature.properties as {
          name: string
          category: string
          duration_minutes: number
        }
        new mapboxgl.Popup({ offset: 20 })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(
            `<div style="font-family:sans-serif;padding:4px 2px">
              <p style="font-weight:700;margin:0 0 4px">${name}</p>
              <span style="background:#EEF4FF;color:#0066FF;border-radius:4px;padding:2px 8px;font-size:12px">${category}</span>
              <p style="margin:6px 0 0;font-size:12px;color:#555">${duration_minutes} min</p>
            </div>`
          )
          .addTo(map)
      })

      map.on('mouseenter', 'stops-circle', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const id = e.features?.[0]?.id
        if (typeof id === 'number') {
          if (hoveredIdRef.current !== null) {
            map.setFeatureState({ source: 'stops', id: hoveredIdRef.current }, { hover: false })
          }
          hoveredIdRef.current = id
          map.setFeatureState({ source: 'stops', id }, { hover: true })
        }
      })
      map.on('mouseleave', 'stops-circle', () => {
        map.getCanvas().style.cursor = ''
        if (hoveredIdRef.current !== null) {
          map.setFeatureState({ source: 'stops', id: hoveredIdRef.current }, { hover: false })
          hoveredIdRef.current = null
        }
      })
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const routeSource = map.getSource('route') as mapboxgl.GeoJSONSource | undefined
    const stopsSource = map.getSource('stops') as mapboxgl.GeoJSONSource | undefined
    if (!routeSource || !stopsSource) return

    if (isRealRoute && routeGeoJson) {
      routeSource.setData({ type: 'Feature', properties: {}, geometry: routeGeoJson })
      map.setLayoutProperty('route', 'visibility', 'visible')
    } else {
      routeSource.setData(EMPTY_LINE)
      map.setLayoutProperty('route', 'visibility', 'none')
    }

    stopsSource.setData(stopsToFeatureCollection(stops))

    if (stops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      stops.forEach((s) => bounds.extend([s.lng, s.lat]))
      map.fitBounds(bounds, { padding: 80, maxZoom: 17 })
    } else {
      map.flyTo({ center: [0, 20], zoom: 1.5, duration: 1000 })
    }
  }, [stops, routeGeoJson, isRealRoute])

  if (mapError) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">Map unavailable</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {stops.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-gray-500 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
            Your route will appear here
          </p>
        </div>
      )}
    </div>
  )
}
