import type { ItineraryStop } from '@/lib/types'

interface Props {
  stops: ItineraryStop[]
  tsaBufferMinutes?: number
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-orange-100 text-orange-700',
  drinks: 'bg-purple-100 text-purple-700',
  quiet: 'bg-green-100 text-green-700',
  shopping: 'bg-pink-100 text-pink-700',
  walking: 'bg-blue-100 text-blue-700',
}

export default function ItineraryTimeline({ stops, tsaBufferMinutes = 30 }: Props) {
  const startMs = Date.now()

  const arrivalTimes: Date[] = []
  let cursor = startMs
  for (let i = 0; i < stops.length; i++) {
    arrivalTimes.push(new Date(cursor))
    cursor += stops[i].duration_minutes * 60_000
    if (i < stops.length - 1) {
      cursor += stops[i].walking_minutes_to_next * 60_000
    }
  }
  const tsaTime = new Date(cursor)

  return (
    <div className="p-6 w-full">
      <h2 className="text-base font-semibold text-[#0A1628] mb-5">Your itinerary</h2>

      {stops.map((stop, i) => (
        <div
          key={stop.stop_number}
          className="animate-fade-in"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Stop row */}
          <div className="flex gap-3 items-start">
            <div className="w-14 flex-none text-right pt-3">
              <span className="text-xs text-gray-400 leading-none">{formatTime(arrivalTimes[i])}</span>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-none w-6 h-6 rounded-full bg-[#0066FF] text-white text-xs font-bold flex items-center justify-center">
                    {stop.stop_number}
                  </span>
                  <span className="text-sm font-medium text-[#0A1628] truncate">{stop.name}</span>
                </div>
                <span className="flex-none text-xs text-gray-400 pt-0.5">{stop.duration_minutes} min</span>
              </div>

              <div className="flex items-center gap-2 mt-2 ml-8">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    CATEGORY_COLORS[stop.category] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {stop.category}
                </span>
              </div>

              {stop.description && (
                <p className="text-xs text-gray-500 mt-1.5 ml-8 leading-relaxed">
                  {stop.description}
                </p>
              )}
            </div>
          </div>

          {/* Walking connector */}
          {i < stops.length - 1 && (
            <div className="flex gap-3 items-center py-1">
              <div className="w-14 flex-none" />
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg
                  width="2"
                  height="20"
                  viewBox="0 0 2 20"
                  className="flex-none text-gray-300 ml-3"
                  aria-hidden
                >
                  <line
                    x1="1"
                    y1="0"
                    x2="1"
                    y2="20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                </svg>
                <span aria-label={`${stop.walking_minutes_to_next} minute walk`}>
                  🚶 {stop.walking_minutes_to_next} min walk
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* TSA buffer sentinel — UI-only, never from stops array */}
      {stops.length > 0 && (
        <div
          className="flex gap-3 items-start mt-1 animate-fade-in"
          style={{ animationDelay: `${stops.length * 50}ms` }}
        >
          <div className="w-14 flex-none text-right pt-3">
            <span className="text-xs text-gray-400 leading-none">{formatTime(tsaTime)}</span>
          </div>
          <div className="flex-1 rounded-xl border-2 border-red-200 bg-red-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-700">🛡 Return to Gate</span>
              <span className="text-xs text-red-500">{tsaBufferMinutes} min</span>
            </div>
            <p className="text-xs text-red-400 mt-1">Allow extra time to locate your gate.</p>
          </div>
        </div>
      )}
    </div>
  )
}
