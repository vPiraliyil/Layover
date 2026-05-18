"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <nav className="flex-shrink-0 bg-white border-b border-gray-200 relative z-50">
      <div className="h-14 flex items-center justify-between px-6">
        <Link href="/" className="text-[#0A1628] font-bold text-lg tracking-tight">
          Layover
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/history" className="text-[#0A1628] hover:text-[#0066FF] transition-colors">
                My Itineraries
              </Link>
              <span className="text-gray-400">{user.email}</span>
              <button
                onClick={signOut}
                className="text-gray-500 hover:text-[#0A1628] active:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded"
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
                className="bg-[#0066FF] text-white px-4 py-1.5 rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="md:hidden p-2 rounded-md text-[#0A1628] hover:bg-gray-100 active:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile slide-down drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4 text-sm">
          {user ? (
            <>
              <Link href="/history" className="text-[#0A1628] hover:text-[#0066FF] transition-colors">
                My Itineraries
              </Link>
              <span className="text-gray-400 text-xs">{user.email}</span>
              <button
                onClick={signOut}
                className="text-left text-gray-500 hover:text-[#0A1628] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[#0A1628] hover:text-[#0066FF] transition-colors">
                Log in
              </Link>
              <Link href="/register" className="text-[#0066FF] font-medium">
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
