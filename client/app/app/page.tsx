"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { fetchAPI } from '@/lib/api'
import type { Airport } from '@/lib/types'

export default function AppPage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()

  const [airports, setAirports] = useState<Airport[]>([])
  const [airportsLoading, setAirportsLoading] = useState(true)
  const [airportsError, setAirportsError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (loading || !user) return
    fetchAPI<Airport[]>('/airports')
      .then(setAirports)
      .catch(err => setAirportsError(err.message))
      .finally(() => setAirportsLoading(false))
  }, [loading, user])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </main>
    )
  }

  if (!user) {
    return null
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/')
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-[#0A1628] mb-1">Welcome</h1>
        <p className="text-gray-500 text-sm mb-6">{user.email}</p>

        <div className="mb-6">
          <label htmlFor="airport" className="block text-sm font-medium text-[#0A1628] mb-1.5">
            Airport
          </label>
          {airportsError ? (
            <p className="text-red-500 text-sm">{airportsError}</p>
          ) : (
            <select
              id="airport"
              disabled={airportsLoading}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-[#0A1628] text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent disabled:opacity-50"
            >
              {airportsLoading ? (
                <option>Loading airports…</option>
              ) : (
                airports.map(a => (
                  <option key={a.id} value={a.iata_code}>
                    {a.iata_code} — {a.name} ({a.city})
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-[#0A1628] hover:bg-gray-800 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}
