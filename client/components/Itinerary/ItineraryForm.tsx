'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { fetchAPI } from '@/lib/api'
import type { Airport, ItineraryStop } from '@/lib/types'

const DURATION_OPTIONS = [
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
  { value: 150, label: '2.5h' },
  { value: 180, label: '3h' },
  { value: 210, label: '3.5h' },
  { value: 240, label: '4h' },
]

const PREF_OPTIONS = ['food', 'quiet', 'drinks', 'shopping', 'walking'] as const

const LOADING_MESSAGES = [
  'Scanning the terminal…',
  'Finding the best spots…',
  'Calculating walking times…',
  'Almost ready…',
]

interface GenerateResponse {
  id: string
  airport_iata: string
  terminal: string
  duration_minutes: number
  stops: ItineraryStop[]
  route_geojson: GeoJSON.LineString | null
  is_real_route: boolean
}

interface Props {
  onItineraryGenerated: (result: GenerateResponse) => void
}

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function DotsLoader() {
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    const dots = dotsRef.current.filter(Boolean) as HTMLDivElement[]
    if (!dots.length) return
    const tl = gsap.timeline({ repeat: -1 })
    tl.to(dots, { y: -4, duration: 0.25, stagger: 0.1, ease: 'power2.out' })
      .to(dots, { y: 0, duration: 0.25, stagger: 0.1, ease: 'power2.in' })
    return () => { tl.kill() }
  }, [])

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          ref={el => { dotsRef.current[i] = el }}
          className="w-1.5 h-1.5 rounded-full bg-white"
        />
      ))}
    </div>
  )
}

function LoadingOverlay() {
  const planeRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [msgIdx, setMsgIdx] = useState(0)
  const msgIdxRef = useRef(0)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced || !planeRef.current) return
    const tween = gsap.to(planeRef.current, {
      y: -10,
      duration: 1.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
    return () => { tween.kill() }
  }, [])

  useEffect(() => {
    const el = textRef.current
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const interval = setInterval(() => {
      const nextIdx = (msgIdxRef.current + 1) % LOADING_MESSAGES.length
      if (prefersReduced || !el) {
        msgIdxRef.current = nextIdx
        setMsgIdx(nextIdx)
        return
      }
      gsap.to(el, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          msgIdxRef.current = nextIdx
          setMsgIdx(nextIdx)
          gsap.to(el, { opacity: 1, duration: 0.2 })
        },
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5"
      style={{ background: 'rgba(10, 10, 10, 0.85)' }}
    >
      <div ref={planeRef} className="text-4xl select-none">✈</div>
      <p ref={textRef} className="text-sm text-white font-medium">
        {LOADING_MESSAGES[msgIdx]}
      </p>
    </motion.div>
  )
}

export default function ItineraryForm({ onItineraryGenerated }: Props) {
  const [airports, setAirports] = useState<Airport[]>([])
  const [airportsError, setAirportsError] = useState<string | null>(null)
  const [airport, setAirport] = useState('')
  const [terminal, setTerminal] = useState('')
  const [gate, setGate] = useState('')
  const [duration, setDuration] = useState(120)
  const [prefs, setPrefs] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAPI<Airport[]>('/airports')
      .then(setAirports)
      .catch((err: unknown) => {
        console.error('[ItineraryForm] airports fetch failed:', err)
        setAirportsError('Could not load airports — is the server running?')
      })
  }, [])

  function togglePref(p: string) {
    setPrefs(prev =>
      prev.includes(p)
        ? prev.filter(x => x !== p)
        : prev.length < 3
        ? [...prev, p]
        : prev
    )
  }

  const formFilled = airport !== '' && terminal.trim() !== '' && prefs.length >= 1
  const canSubmit = formFilled && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await fetchAPI<GenerateResponse>('/itineraries', {
        method: 'POST',
        body: JSON.stringify({
          airport,
          terminal,
          gate: gate.trim() || null,
          duration_minutes: duration,
          preferences: prefs,
        }),
      })
      onItineraryGenerated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const labelClass = 'block text-xs font-medium text-[#888888] uppercase tracking-wider mb-1.5'
  const inputBase =
    'w-full px-3 py-2.5 rounded-lg border border-[#2A2A2A] text-sm text-white bg-[#141414] ' +
    'placeholder-[#555555] focus:outline-none focus:border-[#0066FF] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150'

  return (
    <div className="relative w-full">
      <AnimatePresence>{submitting && <LoadingOverlay />}</AnimatePresence>

      <form onSubmit={handleSubmit} className="p-6 w-full space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Plan your layover</h1>
          <p className="text-sm text-[#555555] mt-1">Get a timed itinerary for your stop</p>
        </div>

        {/* Airport */}
        <div>
          <label className={labelClass}>Airport</label>
          {airportsError ? (
            <p className="text-sm text-[#FF4444]">{airportsError}</p>
          ) : (
            <div className="relative">
              <select
                value={airport}
                onChange={e => setAirport(e.target.value)}
                disabled={submitting}
                className={inputBase + ' appearance-none pr-9 cursor-pointer'}
                style={{ colorScheme: 'dark' }}
              >
                <option value="" className="bg-[#141414] text-[#555555]">Select airport…</option>
                {airports.map(a => (
                  <option key={a.id} value={a.iata_code} className="bg-[#141414] text-white">
                    {a.iata_code} — {a.name} ({a.city})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#555555]">
                <ChevronIcon />
              </div>
            </div>
          )}
        </div>

        {/* Terminal */}
        <div>
          <label className={labelClass}>Terminal</label>
          <input
            type="text"
            value={terminal}
            onChange={e => setTerminal(e.target.value)}
            disabled={submitting}
            placeholder="e.g. Terminal 1"
            className={inputBase}
          />
        </div>

        {/* Gate */}
        <div>
          <label className={labelClass}>Gate or arrival area</label>
          <input
            type="text"
            value={gate}
            onChange={e => setGate(e.target.value)}
            disabled={submitting}
            placeholder="e.g. Gate B12 (optional)"
            className={inputBase}
          />
        </div>

        {/* Duration */}
        <div>
          <label className={labelClass}>Layover duration</label>
          <div className="relative">
            <select
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              disabled={submitting}
              className={inputBase + ' appearance-none pr-9 cursor-pointer'}
              style={{ colorScheme: 'dark' }}
            >
              {DURATION_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-[#141414] text-white">
                  {o.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#555555]">
              <ChevronIcon />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <label className={labelClass}>
            Preferences{' '}
            <span className="normal-case text-[#555555] tracking-normal font-normal">(pick 1–3)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PREF_OPTIONS.map(p => {
              const selected = prefs.includes(p)
              return (
                <motion.button
                  key={p}
                  type="button"
                  onClick={() => togglePref(p)}
                  disabled={submitting}
                  whileTap={{ scale: 0.97 }}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D0D] disabled:opacity-50 disabled:cursor-not-allowed ${
                    selected
                      ? 'bg-[#0066FF] border-[#0066FF] text-white'
                      : 'bg-[#141414] border-[#2A2A2A] text-[#888888] hover:border-[#3A3A3A] hover:text-white'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-[#FF4444]"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 flex items-center justify-center ${
            submitting
              ? 'bg-[#0066FF]/70 cursor-not-allowed text-white'
              : formFilled
              ? 'bg-[#0066FF] hover:bg-[#0052CC] text-white'
              : 'bg-[#1C1C1C] text-[#555555] border border-[#2A2A2A] cursor-not-allowed'
          }`}
        >
          {submitting ? <DotsLoader /> : 'Generate Itinerary'}
        </button>
      </form>
    </div>
  )
}
