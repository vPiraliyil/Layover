'use client'

import { useState, useEffect } from 'react'
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

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
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

  const canSubmit = airport !== '' && terminal.trim() !== '' && prefs.length >= 1 && !submitting

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

  const inputBase = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-[#0A1628] bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-opacity'

  return (
    <form onSubmit={handleSubmit} className="p-6 w-full space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0A1628]">Plan your layover</h1>
        <p className="text-sm text-gray-400 mt-0.5">Get a timed itinerary for your stop</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#0A1628]">Airport</label>
        {airportsError ? (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {airportsError}
          </p>
        ) : (
          <select
            value={airport}
            onChange={e => setAirport(e.target.value)}
            disabled={submitting}
            className={inputBase}
          >
            <option value="">Select airport…</option>
            {airports.map(a => (
              <option key={a.id} value={a.iata_code}>
                {a.iata_code} — {a.name} ({a.city})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#0A1628]">Terminal</label>
        <input
          type="text"
          value={terminal}
          onChange={e => setTerminal(e.target.value)}
          disabled={submitting}
          placeholder="e.g. Terminal 1"
          className={`${inputBase} placeholder-gray-300`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#0A1628]">Gate or arrival area</label>
        <input
          type="text"
          value={gate}
          onChange={e => setGate(e.target.value)}
          disabled={submitting}
          placeholder="e.g. Gate B12 (optional)"
          className={`${inputBase} placeholder-gray-300`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#0A1628]">Layover duration</label>
        <select
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          disabled={submitting}
          className={inputBase}
        >
          {DURATION_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#0A1628]">
          Preferences{' '}
          <span className="text-gray-400 font-normal">(pick 1–3)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {PREF_OPTIONS.map(p => {
            const selected = prefs.includes(p)
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePref(p)}
                disabled={submitting}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selected
                    ? 'bg-[#0066FF] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700 font-medium">We couldn&apos;t generate your itinerary.</p>
          <p className="text-sm text-red-500 mt-1">Check your inputs and try again.</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 flex items-center justify-center gap-2 ${submitting ? 'animate-pulse' : ''}`}
      >
        {submitting ? (
          <>
            <Spinner />
            Generating your itinerary…
          </>
        ) : (
          'Generate Itinerary'
        )}
      </button>
    </form>
  )
}
