"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import ItineraryForm from '@/components/Itinerary/ItineraryForm'
import ItineraryTimeline from '@/components/Itinerary/ItineraryTimeline'
import ChatPanel from '@/components/Chat/ChatPanel'
import { fetchAPI } from '@/lib/api'
import type { ItineraryStop } from '@/lib/types'

const MapView = dynamic(() => import('@/components/Map/MapView'), { ssr: false })

interface ItineraryState {
  id: string
  stops: ItineraryStop[]
  routeGeoJson: GeoJSON.LineString | null
  isRealRoute: boolean
}

export default function AppPage() {
  const [itinerary, setItinerary] = useState<ItineraryState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const id = searchParams.get('itinerary')
    if (!id) return
    fetchAPI<{ id: string; stops: ItineraryStop[]; route_geojson: GeoJSON.LineString | null }>(
      `/itineraries/${id}`
    ).then(data => {
      setItinerary({
        id: data.id,
        stops: data.stops,
        routeGeoJson: data.route_geojson,
        isRealRoute: !!data.route_geojson,
      })
    }).catch(() => {
      setLoadError('Could not load itinerary. Starting fresh.')
    })
  }, [])

  function handleItineraryGenerated(data: {
    id: string
    stops: ItineraryStop[]
    route_geojson: GeoJSON.LineString | null
    is_real_route: boolean
  }) {
    setItinerary({
      id: data.id,
      stops: data.stops,
      routeGeoJson: data.route_geojson,
      isRealRoute: data.is_real_route,
    })
  }

  function handlePatch(data: { stops: ItineraryStop[]; routeGeoJson: GeoJSON.LineString | null; isRealRoute: boolean }) {
    setItinerary(prev => prev ? { ...prev, ...data } : prev)
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left panel */}
      <div className="w-[40%] h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {itinerary ? (
          <>
            <div className="px-6 pt-5 pb-0 flex-shrink-0">
              <button
                onClick={() => setItinerary(null)}
                className="text-xs text-[#0066FF] hover:underline"
              >
                ← Start Over
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <ItineraryTimeline stops={itinerary.stops} />
            </div>
            <ChatPanel
              itineraryId={itinerary.id}
              onItineraryPatched={handlePatch}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center pt-10">
            {loadError && (
              <p className="text-sm text-red-500 mb-4 px-6">{loadError}</p>
            )}
            <ItineraryForm onItineraryGenerated={handleItineraryGenerated} />
          </div>
        )}
      </div>

      {/* Right panel — map */}
      <div className="flex-1 h-full relative">
        <MapView
          stops={itinerary?.stops ?? []}
          routeGeoJson={itinerary?.routeGeoJson ?? null}
          isRealRoute={itinerary?.isRealRoute ?? false}
        />
      </div>
    </div>
  )
}
