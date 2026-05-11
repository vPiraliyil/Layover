"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import ItineraryForm from '@/components/Itinerary/ItineraryForm'
import ItineraryTimeline from '@/components/Itinerary/ItineraryTimeline'
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

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left panel */}
      <div className="w-[40%] h-full bg-white overflow-y-auto border-r border-gray-200 flex flex-col">
        {itinerary ? (
          <>
            <div className="px-6 pt-5 pb-0">
              <button
                onClick={() => setItinerary(null)}
                className="text-xs text-[#0066FF] hover:underline"
              >
                ← Start Over
              </button>
            </div>
            <ItineraryTimeline stops={itinerary.stops} />
          </>
        ) : (
          <div className="flex-1 flex items-start justify-center pt-10">
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
