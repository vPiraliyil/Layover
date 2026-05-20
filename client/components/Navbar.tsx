"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <nav className="flex-shrink-0 bg-[#0A0A0A] border-b border-[#2A2A2A] relative z-50">
      <div className="h-14 flex items-center justify-between px-6">
        <Link href="/" className="font-bold text-lg tracking-tight text-white">
          Layover
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5 text-sm">
          {user ? (
            <>
              <Link href="/history" className="nav-link text-[#888888] hover:text-white transition-colors">
                My Itineraries
              </Link>
              <span className="text-[#555555] text-xs">{user.email}</span>
              <button
                onClick={signOut}
                className="text-white border border-[#2A2A2A] hover:bg-[#141414] transition-colors px-3 py-1.5 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link text-[#888888] hover:text-white transition-colors">
                Log in
              </Link>
              <Link
                href="/register"
                className="bg-[#0066FF] hover:bg-[#0052CC] text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="md:hidden p-2 rounded-md text-[#888888] hover:text-white hover:bg-[#141414] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
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
        <div className="md:hidden border-t border-[#2A2A2A] bg-[#0A0A0A] px-6 py-4 flex flex-col gap-4 text-sm">
          {user ? (
            <>
              <Link href="/history" className="text-[#888888] hover:text-white transition-colors">
                My Itineraries
              </Link>
              <span className="text-[#555555] text-xs">{user.email}</span>
              <button
                onClick={signOut}
                className="text-left text-[#888888] hover:text-white transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[#888888] hover:text-white transition-colors">
                Log in
              </Link>
              <Link href="/register" className="text-white font-medium">
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
