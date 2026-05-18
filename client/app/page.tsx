import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Layover' }

export default function Home() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 text-center">
      <div className="max-w-lg">
        <div className="inline-flex items-center gap-2 bg-[#EEF4FF] text-[#0066FF] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          ✈ Airport layover planner
        </div>
        <h1 className="text-5xl font-bold text-[#0A1628] tracking-tight mb-4">
          Make the most of your layover
        </h1>
        <p className="text-lg text-gray-500 mb-8 leading-relaxed">
          Enter your airport, terminal, and layover duration. Get a timed itinerary of real stops — food, drinks, shopping — with walking times and a map.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/app"
            className="w-full sm:w-auto bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Plan a layover
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto border border-gray-200 hover:border-[#0066FF] hover:text-[#0066FF] text-gray-600 font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Create account
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">No account required — works anonymously</p>
      </div>
    </main>
  )
}
