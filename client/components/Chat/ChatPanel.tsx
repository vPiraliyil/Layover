"use client"

import { useEffect, useRef, useState } from 'react'
import { fetchAPI, APIError } from '@/lib/api'
import type { ItineraryStop } from '@/lib/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
  isError?: boolean
}

interface PatchResponse {
  stops: ItineraryStop[]
  route_geojson: GeoJSON.LineString | null
  is_real_route: boolean
}

interface ChatPanelProps {
  itineraryId: string
  onItineraryPatched: (data: { stops: ItineraryStop[]; routeGeoJson: GeoJSON.LineString | null; isRealRoute: boolean }) => void
}

export default function ChatPanel({ itineraryId, onItineraryPatched }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Want to tweak your itinerary? Ask me anything — I can swap stops, adjust timing, or change the vibe.' },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = inputValue.trim()
    if (!text || isLoading) return

    setInputValue('')
    setIsLoading(true)

    setMessages(prev => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', isLoading: true },
    ])

    try {
      const data = await fetchAPI<PatchResponse>(`/itineraries/${itineraryId}/patch`, {
        method: 'PATCH',
        body: JSON.stringify({ user_message: text }),
      })

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: "Done! I've updated your itinerary." }
        return updated
      })

      onItineraryPatched({
        stops: data.stops,
        routeGeoJson: data.route_geojson,
        isRealRoute: data.is_real_route,
      })
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Something went wrong. Your itinerary was not changed.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: message, isError: true }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col border-t border-gray-200 bg-white h-80">
      {/* Message history */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`
                max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-snug
                ${msg.role === 'user'
                  ? 'bg-[#0A1628] text-white'
                  : msg.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-gray-100 text-[#0A1628]'
                }
              `}
            >
              {msg.isLoading ? (
                <div
                  className="h-3 w-28 rounded-full animate-shimmer"
                  style={{
                    background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                    backgroundSize: '800px 100%',
                  }}
                />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row — sticky on mobile so it stays visible while scrolling the timeline */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white sticky bottom-0">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Tweak your itinerary…"
          className="flex-1 px-4 py-2 rounded-full border border-gray-200 text-sm text-[#0A1628] placeholder-gray-400 focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          className="px-4 py-2 rounded-full bg-[#0066FF] text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2"
        >
          Send
        </button>
      </div>
    </div>
  )
}
