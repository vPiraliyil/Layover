"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AppPage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-[#0A1628] mb-2">Welcome</h1>
        <p className="text-gray-500 text-sm mb-8">{user.email}</p>
        <button
          onClick={handleSignOut}
          className="bg-[#0A1628] hover:bg-gray-800 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}
