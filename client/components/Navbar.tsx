"use client"

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()

  return (
    <nav className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <Link href="/" className="text-[#0A1628] font-bold text-lg tracking-tight">
        Layover
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/history" className="text-[#0A1628] hover:text-[#0066FF] transition-colors">
              My Itineraries
            </Link>
            <span className="text-gray-400">{user.email}</span>
            <button
              onClick={signOut}
              className="text-gray-500 hover:text-[#0A1628] transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-[#0A1628] hover:text-[#0066FF] transition-colors">
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-[#0066FF] text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
