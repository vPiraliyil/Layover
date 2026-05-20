'use client'

import Link from 'next/link'

export default function HeroSection() {
  return (
    <main className="relative flex min-h-full flex-col items-center justify-center px-6 text-center bg-[#0A0A0A]">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] text-[#888888] text-xs font-medium px-3 py-1.5 rounded-md mb-8 tracking-wide">
          ✈ Airport layover planner
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight mb-5 leading-tight">
          Make the most of<br className="hidden sm:block" /> your layover
        </h1>

        <p className="text-lg text-[#888888] mb-10 leading-relaxed max-w-lg mx-auto">
          Enter your airport, terminal, and layover duration. Get a timed itinerary of real stops — food, drinks, shopping — with walking times and a map.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/app"
            className="w-full sm:w-auto bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold px-8 py-3 rounded-lg transition-colors text-center"
          >
            Plan a layover
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto border border-[#2A2A2A] hover:border-[#3A3A3A] hover:text-white text-[#888888] font-medium px-8 py-3 rounded-lg transition-colors text-center"
          >
            Create account
          </Link>
        </div>

        <p className="text-xs text-[#555555] mt-5">
          No account required — works anonymously
        </p>
      </div>
    </main>
  )
}
