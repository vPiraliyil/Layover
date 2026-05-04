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
  stops: ItineraryStop[]
  route_geojson: GeoJSON.LineString | null
}

interface Props {
  onItineraryGenerated: (result: GenerateResponse) => void
}

export default function ItineraryForm({ onItineraryGenerated }: Props) {
  const [airports, setAirports] = useState<Airport[]>([])
  const [airport, setAirport] = useState('')
  const [terminal, setTerminal] = useState('')
  const [gate, setGate] = useState('')
  const [duration, setDuration] = useState(120)
  const [prefs, setPrefs] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAPI<Airport[]>('/airports').then(setAirports).catch(() => {})
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

  return (
    <form onSubmit={handleSubmit} className="p-6 w-full space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0A1628]">Plan your layover</h1>
        <p className="text-sm text-gray-400 mt-0.5">Get a timed itinerary for your stop</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#0A1628]">Airport</label>
        <select
          value={airport}
          onChange={e => setAirport(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-[#0A1628] bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
        >
          <option value="">Select airport…</option>
          {airports.map(a => (
            <option key={a.id} value={a.iata_code}>
              {a.iata_code} — {a.name} ({a.city})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#0A1628]">Terminal</label>
        <input
          type="text"
          value={terminal}
          onChange={e => setTerminal(e.target.value)}
          placeholder="e.g. Terminal 1"
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-[#0A1628] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#0A1628]">Gate or arrival area</label>
        <input
          type="text"
          value={gate}
          onChange={e => setGate(e.target.value)}
          placeholder="e.g. Gate B12 (optional)"
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-[#0A1628] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#0A1628]">Layover duration</label>
        <select
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-[#0A1628] bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
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
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-[#0066FF] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
      >
        {submitting ? 'Generating…' : 'Generate Itinerary'}
      </button>
    </form>
  )
}
