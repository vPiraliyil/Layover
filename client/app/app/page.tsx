"use client"

import dynamic from 'next/dynamic'
import type { ItineraryStop } from '@/lib/types'

const MapView = dynamic(() => import('@/components/Map/MapView'), { ssr: false })

const emptyStops: ItineraryStop[] = []

export default function AppPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="w-[40%] h-full bg-white overflow-y-auto border-r border-gray-200 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Enter your layover details to get started</p>
      </div>
      <div className="flex-1 h-full relative">
        <MapView stops={emptyStops} routeGeoJson={null} />
      </div>
    </div>
  )
}
