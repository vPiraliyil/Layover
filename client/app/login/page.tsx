"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/app')
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-[#0A1628] mb-2">Welcome back</h1>
        <p className="text-gray-500 text-sm mb-8">Sign in to your Layover account</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#0A1628] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-[#0A1628] text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#0A1628] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-[#0A1628] text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-red-600 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0066FF] hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#0066FF] hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
