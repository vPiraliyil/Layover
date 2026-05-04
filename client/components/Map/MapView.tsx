'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { ItineraryStop } from '@/lib/types'

interface MapViewProps {
  stops: ItineraryStop[]
  routeGeoJson: GeoJSON.LineString | null
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
    features: stops.map((s) => ({
      type: 'Feature',
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

export default function MapView({ stops, routeGeoJson }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const initialFitDoneRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    console.log('[MapView] token prefix:', process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.slice(0, 8))
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-73.7781, 40.6413],
      zoom: 13,
      scrollZoom: false,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: EMPTY_LINE })
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#0066FF', 'line-width': 4 },
      })

      map.addSource('stops', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({
        id: 'stops-circle',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': 14,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#0066FF',
          'circle-stroke-width': 2,
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

      map.on('mouseenter', 'stops-circle', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'stops-circle', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      initialFitDoneRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const routeSource = map.getSource('route') as mapboxgl.GeoJSONSource | undefined
    const stopsSource = map.getSource('stops') as mapboxgl.GeoJSONSource | undefined
    if (!routeSource || !stopsSource) return

    routeSource.setData(
      routeGeoJson
        ? { type: 'Feature', properties: {}, geometry: routeGeoJson }
        : EMPTY_LINE
    )
    stopsSource.setData(stopsToFeatureCollection(stops))

    if (stops.length > 0 && !initialFitDoneRef.current) {
      const bounds = new mapboxgl.LngLatBounds()
      stops.forEach((s) => bounds.extend([s.lng, s.lat]))
      map.fitBounds(bounds, { padding: 60, maxZoom: 17 })
      initialFitDoneRef.current = true
    }
  }, [stops, routeGeoJson])

  return <div ref={containerRef} className="w-full h-full" />
}
