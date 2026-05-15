"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { fetchAPI } from '@/lib/api'
import type { ItineraryHistoryItem } from '@/lib/types'

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function ItineraryCard({ item }: { item: ItineraryHistoryItem }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4 hover:border-[#0066FF] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-[#0A1628]">{item.airport_iata}</span>
          <span className="text-base text-gray-500">Terminal {item.terminal}</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="bg-[#EEF4FF] text-[#0066FF] text-xs font-medium px-2.5 py-1 rounded-full">
            {item.duration_minutes} min
          </span>
          {item.preferences.map(pref => (
            <span key={pref} className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full capitalize">
              {pref}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-700 truncate mb-1">
          Starting at <span className="font-medium">{item.preview_stop}</span>
        </p>
        <p className="text-xs text-gray-400">{formatRelativeTime(item.created_at)}</p>
      </div>
      <Link
        href={`/app?itinerary=${item.id}`}
        className="flex-shrink-0 bg-[#0066FF] text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        View
      </Link>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="h-8 w-48 bg-gray-200 rounded-md animate-pulse mb-6" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
            <div className="flex items-baseline gap-2 mb-2">
              <div className="h-8 w-16 bg-gray-200 rounded-md" />
              <div className="h-5 w-24 bg-gray-100 rounded-md" />
            </div>
            <div className="flex gap-2 mb-3">
              <div className="h-6 w-16 bg-gray-100 rounded-full" />
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
              <div className="h-6 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="h-4 w-48 bg-gray-100 rounded-md mb-1" />
            <div className="h-3 w-24 bg-gray-100 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<ItineraryHistoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!session) {
      router.replace('/login')
      return
    }
    fetchAPI<ItineraryHistoryItem[]>('/itineraries/my')
      .then(setItems)
      .catch(e => setError(e.message))
  }, [loading, session])

  if (loading || (items === null && !error)) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-[#0A1628] mb-6">My Itineraries</h1>
      {items!.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">No saved itineraries yet.</p>
          <Link
            href="/app"
            className="bg-[#0066FF] text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Plan a layover
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items!.map(item => (
            <ItineraryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
