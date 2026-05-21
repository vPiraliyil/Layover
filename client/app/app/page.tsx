"use client"

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
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
  airportIata?: string
  terminal?: string
  durationMinutes?: number
}

function LeftPanelSkeleton() {
  return (
    <div className="p-6 w-full animate-pulse">
      <div className="h-5 w-32 bg-[#1C1C1C] rounded-md mb-6" />
      {[0, 1, 2].map(i => (
        <div key={i}>
          <div className="flex gap-3 items-start">
            <div className="w-14 flex-none">
              <div className="h-3 w-10 bg-[#1C1C1C] rounded-md ml-auto mt-3" />
            </div>
            <div className="flex-1 bg-[#141414] rounded-xl border border-[#2A2A2A] p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#1C1C1C]" />
                <div className="h-4 w-32 bg-[#1C1C1C] rounded-md" />
              </div>
              <div className="ml-8 h-3 w-20 bg-[#1C1C1C] rounded-full" />
            </div>
          </div>
          {i < 2 && (
            <div className="flex gap-3 items-center py-1">
              <div className="w-14 flex-none" />
              <div className="flex items-center gap-2 ml-3">
                <div className="w-0.5 h-5 bg-[#1C1C1C] rounded" />
                <div className="h-3 w-20 bg-[#1C1C1C] rounded-md" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const panelInitial = { opacity: 0, y: 10 }
const panelAnimate = { opacity: 1, y: 0 }
const panelExit    = { opacity: 0, y: -6 }
const panelTransition = { duration: 0.3, ease: 'easeOut' as const }

function AppPageContent() {
  const [itinerary, setItinerary] = useState<ItineraryState | null>(null)
  const [loadingParam, setLoadingParam] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const id = searchParams.get('itinerary')
    if (!id) return
    setLoadingParam(true)
    fetchAPI<{
      id: string
      airport_iata: string
      terminal: string
      duration_minutes: number
      stops: ItineraryStop[]
      route_geojson: GeoJSON.LineString | null
    }>(`/itineraries/${id}`)
      .then(data => {
        setItinerary({
          id: data.id,
          stops: data.stops,
          routeGeoJson: data.route_geojson,
          isRealRoute: !!data.route_geojson,
          airportIata: data.airport_iata,
          terminal: data.terminal,
          durationMinutes: data.duration_minutes,
        })
      })
      .catch(() => {
        setLoadError('Could not load itinerary. Starting fresh.')
      })
      .finally(() => setLoadingParam(false))
  }, [])

  useEffect(() => {
    if (!itinerary) {
      document.title = 'Plan your layover | Layover'
    } else if (itinerary.airportIata && itinerary.terminal && itinerary.durationMinutes) {
      const label = `${itinerary.durationMinutes / 60}h`
      document.title = `Layover — ${itinerary.airportIata} ${itinerary.terminal} · ${label}`
    } else {
      document.title = 'Your itinerary | Layover'
    }
  }, [itinerary])

  function handleItineraryGenerated(data: {
    id: string
    airport_iata: string
    terminal: string
    duration_minutes: number
    stops: ItineraryStop[]
    route_geojson: GeoJSON.LineString | null
    is_real_route: boolean
  }) {
    setItinerary({
      id: data.id,
      stops: data.stops,
      routeGeoJson: data.route_geojson,
      isRealRoute: data.is_real_route,
      airportIata: data.airport_iata,
      terminal: data.terminal,
      durationMinutes: data.duration_minutes,
    })
  }

  function handlePatch(data: { stops: ItineraryStop[]; routeGeoJson: GeoJSON.LineString | null; isRealRoute: boolean }) {
    setItinerary(prev => prev ? { ...prev, ...data } : prev)
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden">
      {/* Left panel */}
      <div className="order-last md:order-first flex-none w-full md:w-[40%] h-[60vh] md:h-full bg-[#0D0D0D] border-t md:border-t-0 md:border-r border-[#2A2A2A] flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {loadingParam ? (
            <motion.div key="skeleton" initial={panelInitial} animate={panelAnimate} exit={panelExit} transition={panelTransition} className="w-full h-full">
              <LeftPanelSkeleton />
            </motion.div>
          ) : itinerary ? (
            <motion.div key="timeline" initial={panelInitial} animate={panelAnimate} exit={panelExit} transition={panelTransition} className="w-full h-full flex flex-col overflow-hidden">
              <div className="px-6 pt-5 pb-0 flex-shrink-0">
                <button
                  onClick={() => { setItinerary(null); setLoadError(null) }}
                  className="text-xs text-[#888888] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded"
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
            </motion.div>
          ) : (
            <motion.div key="form" initial={panelInitial} animate={panelAnimate} exit={panelExit} transition={panelTransition} className="flex-1 flex flex-col items-center pt-10 overflow-y-auto w-full">
              {loadError && (
                <p className="text-sm text-[#FF4444] mb-4 px-6">{loadError}</p>
              )}
              <ItineraryForm onItineraryGenerated={handleItineraryGenerated} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right panel — map */}
      <div className="order-first md:order-last flex-none w-full h-[40vh] md:flex-1 md:h-full relative">
        <MapView
          stops={itinerary?.stops ?? []}
          routeGeoJson={itinerary?.routeGeoJson ?? null}
          isRealRoute={itinerary?.isRealRoute ?? false}
        />
      </div>
    </div>
  )
}

export default function AppPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white">Loading...</div>}>
      <AppPageContent />
    </Suspense>
  )
}
