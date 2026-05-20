"use client"

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { fetchAPI, APIError } from '@/lib/api'
import type { ItineraryStop } from '@/lib/types'

interface Message {
  id: number
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

let msgCounter = 1

function TypingIndicator() {
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    const dots = dotsRef.current.filter(Boolean) as HTMLDivElement[]
    if (!dots.length) return
    const tl = gsap.timeline({ repeat: -1 })
    tl.to(dots, { scale: 1.4, duration: 0.25, stagger: 0.15, ease: 'power2.out' })
      .to(dots, { scale: 1, duration: 0.25, stagger: 0.15, ease: 'power2.in' })
    return () => { tl.kill() }
  }, [])

  return (
    <div className="flex items-center gap-1 py-0.5 px-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          ref={el => { dotsRef.current[i] = el }}
          className="w-[5px] h-[5px] rounded-full bg-[#0066FF]"
        />
      ))}
    </div>
  )
}

function SendButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)

  function onMouseDown() {
    if (disabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.to(ref.current, { scale: 0.95, duration: 0.1, ease: 'power2.out' })
  }
  function onMouseUp() {
    gsap.to(ref.current, { scale: 1, duration: 0.1, ease: 'power2.out' })
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      aria-label="Send message"
      className="flex-none w-9 h-9 rounded-md bg-[#0066FF] hover:bg-[#0052CC] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414]"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2 8h12M9 3l5 5-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export default function ChatPanel({ itineraryId, onItineraryPatched }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: msgCounter++,
      role: 'assistant',
      content: 'Want to tweak your itinerary? Ask me anything — I can swap stops, adjust timing, or change the vibe.',
    },
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

    const userMsgId = msgCounter++
    const loadingMsgId = msgCounter++

    setInputValue('')
    setIsLoading(true)

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: text },
      { id: loadingMsgId, role: 'assistant', content: '', isLoading: true },
    ])

    try {
      const data = await fetchAPI<PatchResponse>(`/itineraries/${itineraryId}/patch`, {
        method: 'PATCH',
        body: JSON.stringify({ user_message: text }),
      })

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsgId
            ? { ...m, content: "Done! I've updated your itinerary.", isLoading: false }
            : m
        )
      )

      onItineraryPatched({
        stops: data.stops,
        routeGeoJson: data.route_geojson,
        isRealRoute: data.is_real_route,
      })
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Something went wrong. Your itinerary was not changed.'
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsgId
            ? { ...m, content: message, isLoading: false, isError: true }
            : m
        )
      )
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
    <div className="flex flex-col border-t border-[#2A2A2A] h-80">
      {/* Header */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs text-[#555555] uppercase tracking-widest font-medium">
          ✦ Tweak your plan
        </span>
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-[#0A0A0A]">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.role === 'user' ? 16 : -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2 text-sm leading-snug ${
                  msg.role === 'user'
                    ? 'bg-[#0066FF] text-white rounded-chat-user'
                    : msg.isError
                    ? 'bg-[#1C1C1C] border border-[#FF4444]/30 text-[#FF4444] rounded-chat-assistant'
                    : 'bg-[#1C1C1C] border border-[#2A2A2A] text-white rounded-chat-assistant'
                }`}
              >
                {msg.isLoading ? <TypingIndicator /> : msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-[#2A2A2A] bg-[#141414] flex-shrink-0">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Tweak your itinerary…"
          className="flex-1 px-3.5 py-2 rounded-lg border border-[#2A2A2A] text-sm text-white placeholder-[#555555] bg-[#0A0A0A] focus:outline-none focus:border-[#0066FF] disabled:opacity-50 transition-colors duration-150"
        />
        <SendButton onClick={handleSend} disabled={isLoading || !inputValue.trim()} />
      </div>
    </div>
  )
}
