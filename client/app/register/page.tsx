"use client"

import { useState } from 'react'
import Link from 'next/link'
import supabase from '@/lib/supabase'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#0066FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#0A1628] mb-2">Check your email</h1>
          <p className="text-gray-500 text-sm mb-6">
            Account created! We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/login" className="text-[#0066FF] hover:underline text-sm font-medium">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-[#0A1628] mb-2">Create an account</h1>
        <p className="text-gray-500 text-sm mb-8">Plan your next layover with Layover</p>

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
              minLength={6}
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0066FF] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
